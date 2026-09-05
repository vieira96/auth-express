import express from 'express';

import { errorHandler } from '@/middlewares/errorHandler.js';
import { authRoutes } from '@/routes/auth/auth.routes.js';

const app = express();

app.use(express.json());
app.use('/auth', authRoutes);
app.use(errorHandler);

export { app };
