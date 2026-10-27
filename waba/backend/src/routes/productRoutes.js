import express from 'express';
import * as productController from '../controller/productController.js';

const router = express.Router();

router.get('/main', productController.getMainProductList);

export default router;