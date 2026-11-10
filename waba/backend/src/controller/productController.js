import * as productService from '../service/productService.js';

export const getMainProductList = async (req, res, next) => {
    try {
        const rows = await productService.getMainProductList();
        return res.status(200).json(rows);
    } catch (e) {
        next(e);
    }
};

export const searchProducts = async (req, res, next) => {
    try {
        const keyword = req.query.q || '';
        const rows = await productService.searchProducts(keyword);
        return res.status(200).json({ success: true, products: rows });
    } catch (e) {
        next(e);
    }
};
