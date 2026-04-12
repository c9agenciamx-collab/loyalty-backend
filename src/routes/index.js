import { Router } from 'express';
import { authLimiter, generalLimiter } from '../middleware/rateLimiter.js';
import { requireAdmin } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { registerAdminSchema, loginSchema } from '../validators/index.js';
import * as authCtrl from '../controllers/auth.controller.js';
import * as dashCtrl from '../controllers/dashboard.controller.js';
import customerRoutes from './customer.routes.js';
import adminRoutes from './admin.routes.js';

const router = Router();

router.post('/auth/register', authLimiter, validate(registerAdminSchema), authCtrl.register);
router.post('/auth/login',    authLimiter, validate(loginSchema),          authCtrl.login);
router.post('/auth/logout',   generalLimiter, requireAdmin,                authCtrl.logout);
router.get ('/auth/me',       generalLimiter, requireAdmin,                authCtrl.me);

router.get('/dashboard', dashCtrl.serveDashboard);

router.use('/customer', customerRoutes);
router.use('/admin', adminRoutes);

export default router;