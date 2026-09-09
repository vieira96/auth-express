import { Router } from 'express';

import { UserController } from '@/controllers/user/UserController.js';
import { authenticate } from '@/middlewares/authenticate.js';
import { authorizeRoles } from '@/middlewares/authorizeRoles.js';

const userRoutes = Router();
const userController = new UserController();

userRoutes.get('/', authenticate, authorizeRoles('admin'), userController.list);

export { userRoutes };
