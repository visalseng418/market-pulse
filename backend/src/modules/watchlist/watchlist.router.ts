import { Router } from 'express';
import * as watchlistController from './watchlist.controller';
import { authenticate } from '@middlewares/authenticate';

const router = Router();

router.get('/', authenticate, watchlistController.getWatchlist);
router.get('/prices', authenticate, watchlistController.getWatchlistPrices);
router.post('/', authenticate, watchlistController.addToWatchlist);
router.delete('/:id', authenticate, watchlistController.removeFromWatchlist);

export default router;
