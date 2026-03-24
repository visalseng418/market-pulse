import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import { eq } from 'drizzle-orm';
import { db } from '@config/database';
import { users } from '@config/schema';
import { logger } from '@utils/logger';
import { ConflictError, UnauthorizedError, NotFoundError } from '@utils/errors';
import type {
  JwtPayload,
  RegisterBody,
  LoginBody,
  AuthResponse,
} from '@shared/types/auth.types';
import { setCache, hasCache, CACHE_KEYS, CACHE_TTL } from '@utils/cache';

const SALT_ROUNDS = 12;

const generateToken = (payload: JwtPayload): string => {
  const options: SignOptions = {
    expiresIn: '7d',
  };
  return jwt.sign(payload, process.env.JWT_SECRET!, options);
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
