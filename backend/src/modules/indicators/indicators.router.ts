import { Router } from 'express';
import * as indicatorsController from './indicators.controller';
import { authenticate } from '@middlewares/authenticate';

const router = Router();

router.use(authenticate);

router.get('/:symbol/history', indicatorsController.getIndicatorHistory);
router.get('/:symbol', indicatorsController.getIndicators);

export default router;
