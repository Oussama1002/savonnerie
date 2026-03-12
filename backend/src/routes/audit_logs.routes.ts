import { Router } from 'express';
import { getAll, create } from '../controllers/audit_logs.controller';

const router = Router();

router.get('/', getAll);
router.post('/', create);

export default router;
