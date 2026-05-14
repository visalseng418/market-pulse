import { Router } from 'express';
import * as marketController from './market.controller';
import { authenticate } from '@middlewares/authenticate';

const router = Router();

// Public — live prices are visible to everyone
router.get('/prices', marketController.getPrices);

export default router;
