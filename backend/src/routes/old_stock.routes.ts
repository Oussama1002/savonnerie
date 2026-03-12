import { Router } from 'express';
import { getAll, create, remove, updateStatus } from '../controllers/old_stock.controller';

const router = Router();
router.get('/', getAll);
router.post('/', create);
router.patch('/:id/status', updateStatus);
router.delete('/:id', remove);
export default router;
