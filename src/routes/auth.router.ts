import { Router } from 'express';

import { me, requestCode, verifyCode } from '../controllers/auth.controller';
import { requireAuth } from '../middleware/auth';

export const authRouter = Router();

authRouter.post('/request-code', requestCode);
authRouter.post('/verify-code', verifyCode);
authRouter.get('/me', requireAuth, me);
