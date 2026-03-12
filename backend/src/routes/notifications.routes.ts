import { Router } from 'express';
import { getForUser, markRead, markAllRead, create } from '../controllers/notifications.controller';

const router = Router();

router.get('/', getForUser);
router.post('/', create);
router.post('/:id/read', markRead);
router.post('/read-all', markAllRead);

export default router;

