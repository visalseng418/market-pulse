import { Router } from 'express';
import * as marketController from './market.controller';
import { authenticate } from '@middlewares/authenticate';

const router = Router();

// Protected — only logged in users can see market data
router.get('/prices', authenticate, marketController.getPrices);

export default router;
