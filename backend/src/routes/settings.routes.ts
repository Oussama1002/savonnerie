import { Router } from 'express';
import * as ctrl from '../controllers/settings.controller';

const router = Router();
router.get('/', ctrl.get);
router.put('/', ctrl.set);
router.get('/admin-whatsapp', ctrl.getAdminWhatsApp);
router.put('/admin-whatsapp', ctrl.setAdminWhatsApp);
export default router;
