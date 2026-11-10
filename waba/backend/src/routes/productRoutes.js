import express from 'express';
import * as productController from '../controller/productController.js';

const router = express.Router();

router.get('/main', productController.getMainProductList);
router.get('/search', productController.searchProducts);
router.get('/', productController.searchProducts);

export default router;
