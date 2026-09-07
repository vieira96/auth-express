import { Router } from 'express';

import { UserController } from '@/controllers/user/UserController.js';
import { authenticate } from '@/middlewares/authenticate.js';

const userRoutes = Router();
const userController = new UserController();

userRoutes.get('/', authenticate, userController.list);

export { userRoutes };
