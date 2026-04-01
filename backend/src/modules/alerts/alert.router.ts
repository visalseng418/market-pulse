import { Router } from 'express';
import * as alertController from './alert.controller';
import { authenticate } from '@middlewares/authenticate';

const router = Router();

// All alert routes require authentication
router.use(authenticate);

router.get('/', alertController.getAlerts);
router.post('/', alertController.createAlert);
router.delete('/:id', alertController.deleteAlert);

export default router;
