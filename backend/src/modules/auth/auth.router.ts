import { Router } from 'express';
import * as authController from './auth.controller';
import { authenticate } from '@middlewares/authenticate';

const router = Router();

router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/me', authenticate, authController.getMe);
router.post('/logout', authenticate, authController.logout);

export default router;
