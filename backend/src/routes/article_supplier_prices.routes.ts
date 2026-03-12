import { Router } from 'express';
import * as ctrl from '../controllers/article_supplier_prices.controller';

const router = Router();
router.get('/:supplierId/article-prices', ctrl.getBySupplier);
router.put('/:supplierId/article-prices', ctrl.setPricesBulk);
export default router;
