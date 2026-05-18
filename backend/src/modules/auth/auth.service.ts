import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import { eq } from 'drizzle-orm';
import axios from 'axios';
import { db } from '@config/database';
import { users } from '@config/schema';
import { logger } from '@utils/logger';
import { ConflictError, UnauthorizedError, NotFoundError, AppError } from '@utils/errors';
import type {
  JwtPayload,
  RegisterBody,
  LoginBody,
  AuthResponse,
} from '@shared/types/auth.types';
import { setCache, CACHE_KEYS } from '@utils/cache';

const SALT_ROUNDS = 12;

interface GoogleTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  id_token?: string;
}

interface GoogleUserProfile {
  sub: string;
  email: string;
  name: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
}

const generateToken = (payload: Omit<JwtPayload, 'jti'>): string => {
  const options: SignOptions = { expiresIn: '7d' };
  return jwt.sign({ ...payload, jti: randomUUID() }, process.env.JWT_SECRET!, options);
};

export const register = async (body: RegisterBody): Promise<AuthResponse> => {
  const { name, email, password } = body;

  const existing = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existing.length > 0) {
    throw new ConflictError('Email already in use');
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const [newUser] = await db
    .insert(users)
    .values({ name, email, passwordHash })
    .returning({
      id: users.id,
      name: users.name,
      email: users.email,
    });

  logger.info(`New user registered: ${email}`);

  const token = generateToken({ userId: newUser.id, email: newUser.email });

  return { user: newUser, token };
};

export const login = async (body: LoginBody): Promise<AuthResponse> => {
  const { email, password } = body;

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (!user) {
    throw new UnauthorizedError('Invalid email or password');
  }

  if (!user.passwordHash) {
    throw new UnauthorizedError('This account uses Google Sign-In. Please use the "Login with Google" button.');
  }

  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

  if (!isPasswordValid) {
    throw new UnauthorizedError('Invalid email or password');
  }

  logger.info(`User logged in: ${email}`);

  const token = generateToken({ userId: user.id, email: user.email });

  return {
    user: { id: user.id, name: user.name, email: user.email },
    token,
  };
};

export const getUserById = async (userId: string) => {
  const [user] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    throw new NotFoundError('User not found');
  }

  return user;
};

export const logout = async (token: string): Promise<void> => {
  try {
    const decoded = jwt.decode(token) as { exp?: number } | null;

    if (decoded?.exp) {
      const expiresIn = decoded.exp - Math.floor(Date.now() / 1000);

      // Only blacklist if token hasn't expired yet
      if (expiresIn > 0) {
        await setCache(
          CACHE_KEYS.BLACKLISTED_TOKEN(token),
          true,
          expiresIn, // auto expires from Redis when JWT expires
        );
      }
    }

    logger.info('User logged out, token blacklisted');
  } catch (error) {
    // Logout should never fail — even if blacklisting fails
    // the frontend will delete the token anyway
    logger.error('Logout error:', error);
  }
};

const getGoogleRedirectUri = (): string =>
  process.env.NODE_ENV === 'production'
    ? process.env.GOOGLE_REDIRECT_URI!
    : 'http://localhost:5000/api/auth/google/callback';

export const googleRedirect = (): string => {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: getGoogleRedirectUri(),
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'select_account',
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
};

export const googleCallback = async (code: string): Promise<AuthResponse> => {
  // Exchange authorization code for access token
  const tokenRes = await axios.post<GoogleTokenResponse>(
    'https://oauth2.googleapis.com/token',
    new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: getGoogleRedirectUri(),
      grant_type: 'authorization_code',
    }),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
  ).catch((err) => {
    logger.error('Google token exchange failed:', err.response?.data ?? err.message);
    throw new AppError('Google authentication failed', 502, 'OAUTH_ERROR');
  });

  const { access_token } = tokenRes.data;

  // Fetch the authenticated user's profile from Google
  const profileRes = await axios.get<GoogleUserProfile>(
    'https://www.googleapis.com/oauth2/v3/userinfo',
    { headers: { Authorization: `Bearer ${access_token}` } },
  ).catch((err) => {
    logger.error('Google profile fetch failed:', err.response?.data ?? err.message);
    throw new AppError('Google authentication failed', 502, 'OAUTH_ERROR');
  });

  const { sub: googleId, email, name } = profileRes.data;

  // 1. Find by google_id (returning user)
  const [byGoogleId] = await db
    .select({ id: users.id, name: users.name, email: users.email })
    .from(users)
    .where(eq(users.googleId, googleId))
    .limit(1);

  if (byGoogleId) {
    const token = generateToken({ userId: byGoogleId.id, email: byGoogleId.email });
    return { user: byGoogleId, token };
  }

  // 2. Find by email — existing email/password account; link google_id
  const [byEmail] = await db
    .select({ id: users.id, name: users.name, email: users.email })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (byEmail) {
    const [linked] = await db
      .update(users)
      .set({ googleId })
      .where(eq(users.id, byEmail.id))
      .returning({ id: users.id, name: users.name, email: users.email });

    logger.info(`Linked Google account to existing user: ${email}`);
    const token = generateToken({ userId: linked.id, email: linked.email });
    return { user: linked, token };
  }

  // 3. New user — create from Google profile
  const safeName = (name || email.split('@')[0]).slice(0, 20);
  const [newUser] = await db
    .insert(users)
    .values({ email, name: safeName, googleId })
    .returning({ id: users.id, name: users.name, email: users.email });

  logger.info(`New user registered via Google OAuth: ${email}`);
  const token = generateToken({ userId: newUser.id, email: newUser.email });
  return { user: newUser, token };
};
