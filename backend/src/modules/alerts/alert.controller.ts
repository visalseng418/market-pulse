import type { Request, Response, NextFunction } from 'express';
import * as alertService from './alert.service';
import { createAlertSchema } from './alert.validator';
import { ValidationError } from '@utils/errors';

export const createAlert = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const validated = createAlertSchema.safeParse(req.body);
    if (!validated.success) {
      throw new ValidationError(
        JSON.stringify(validated.error.flatten().fieldErrors),
      );
    }

    const alert = await alertService.createAlert(
      req.user!.userId,
      validated.data,
    );
    res.status(201).json({ success: true, data: alert });
  } catch (error) {
    next(error);
  }
};

export const getAlerts = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const alerts = await alertService.getUserAlerts(req.user!.userId);
    res.status(200).json({ success: true, data: alerts });
  } catch (error) {
    next(error);
  }
};

export const deleteAlert = async (
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    await alertService.deleteAlert(req.params.id, req.user!.userId);
    res.status(200).json({ success: true, message: 'Alert deleted' });
  } catch (error) {
    next(error);
  }
};
