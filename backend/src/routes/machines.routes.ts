import { Router } from 'express';
import { getAll, create, deleteMachine, updateStatus } from '../controllers/machines.controller';

const router = Router();

router.get('/', getAll);
router.post('/', create);
router.delete('/:id', deleteMachine);
router.put('/:id/status', updateStatus);

export default router;
