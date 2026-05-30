import { Router } from 'express';
import { getMe, postLogin } from '../controllers/auth_controller.js';

const router = Router();

router.post('/login', postLogin);
router.get('/me', getMe);

export default router;
