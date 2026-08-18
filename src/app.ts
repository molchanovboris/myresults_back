import cors from 'cors';
import express from 'express';

import { errorHandler } from './middleware/error';
import { authRouter } from './routes/auth.router';
import { carsRouter } from './routes/cars.router';
import { catalogRouter } from './routes/catalog.router';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.use('/auth', authRouter);
app.use('/cars', carsRouter);
app.use('/catalog', catalogRouter);

app.use(errorHandler);

export default app;
