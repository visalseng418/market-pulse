import type { Request, Response, NextFunction } from 'express';
import * as authService from './auth.service';
import { registerSchema, loginSchema } from './auth.validator';
import { ValidationError } from '@utils/errors';

export const register = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const validated = registerSchema.safeParse(req.body);

    if (!validated.success) {
      throw new ValidationError(
        JSON.stringify(validated.error.flatten().fieldErrors),
      );
    }

    const result = await authService.register(validated.data);
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

export const login = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const validated = loginSchema.safeParse(req.body);

    if (!validated.success) {
      throw new ValidationError(
        JSON.stringify(validated.error.flatten().fieldErrors),
      );
    }

    const result = await authService.login(validated.data);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const user = await authService.getUserById(req.user!.userId);
    res.status(200).json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

export const logout = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const token = req.headers.authorization?.split(' ')[1] || '';
    await authService.logout(token);
    res.status(200).json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
};
