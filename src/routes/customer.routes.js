import { Router } from 'express';
import { generalLimiter, authLimiter } from '../middleware/rateLimiter.js';
import { requireCustomer } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { registerCustomerSchema } from '../validators/index.js';
import { z } from 'zod';
import * as customerCtrl from '../controllers/customer.controller.js';

const router = Router();

router.post('/:businessSlug/register', authLimiter, validate(registerCustomerSchema), customerCtrl.registerCustomer);
router.post('/:businessSlug/login',    authLimiter, validate(z.object({ cardCode: z.string().regex(/^LC-\d{4}-\d{5}$/) })), customerCtrl.loginCustomer);
router.get ('/card',    generalLimiter, requireCustomer, customerCtrl.getCard);
router.patch('/wallet', generalLimiter, requireCustomer, validate(z.object({ walletType: z.enum(['apple','google','android','wa']) })), customerCtrl.updateWallet);

export default router;
