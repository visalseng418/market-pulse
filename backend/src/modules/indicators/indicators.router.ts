import { Router } from 'express';
import * as indicatorsController from './indicators.controller';

const router = Router();

router.get('/:symbol/history', indicatorsController.getIndicatorHistory);
router.get('/:symbol', indicatorsController.getIndicators);

export default router;
