import { Router } from 'express';
import * as stockController from '../controllers/stock.controller';

const router = Router();

router.get('/', stockController.getAll);
router.post('/', stockController.create);
router.put('/:id', stockController.update);
router.delete('/:id', stockController.remove);

export default router;
