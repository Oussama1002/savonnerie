import { Router } from 'express';
import { getAll } from '../controllers/transactions.controller';
const router = Router();
router.get('/', getAll);
export default router;
