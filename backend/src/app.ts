import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import authRouter from '@modules/auth/auth.router';
import marketRouter from '@modules/market/market.router';
import alertRouter from '@modules/alerts/alert.router';
import { errorHandler } from '@middlewares/errorHandler';

const app: Application = express();

// Security
app.use(helmet());
app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
  }),
);

// Logging
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

app.use('/api/auth', authRouter);
app.use('/api/market', marketRouter);
app.use('/api/alerts', alertRouter);

//This must always be last.
app.use(errorHandler);

export default app;
