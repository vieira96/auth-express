import express from 'express';

import { errorHandler } from '@/middlewares/errorHandler.js';
import { authRoutes } from '@/routes/auth/auth.routes.js';
import { userRoutes } from '@/routes/user/user.routes.js';

const app = express();

app.use(express.json());
app.use('/auth', authRoutes);
app.use('/users', userRoutes);
app.use(errorHandler);

export { app };
