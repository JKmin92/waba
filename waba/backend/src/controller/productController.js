import * as productService from '../service/productService.js';

export const getMainProductList = async (req, res, next) => {
    try {
        const rows = await productService.getMainProductList();
        return res.status(200).json(rows);
    } catch (e) {
        next(e);
    }
}   