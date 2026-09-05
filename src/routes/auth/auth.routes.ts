import { Router } from 'express';

import { AuthController } from '@/controllers/auth/AuthController.js';

const authRoutes = Router();
const authController = new AuthController();

authRoutes.post('/register', authController.register);
authRoutes.post('/login', authController.login);

export { authRoutes };
