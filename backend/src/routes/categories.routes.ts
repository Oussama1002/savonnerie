import { Router } from 'express';
import * as categoriesController from '../controllers/categories.controller';
const router = Router();
router.get('/', categoriesController.getAll);
router.post('/', categoriesController.create);
router.delete('/:id', categoriesController.remove);
export default router;
