import * as productModel from '../models/productModel.js';

export const getMainProductList = async () => {
    return await productModel.getMainProductList();
};

export const searchProducts = async (keyword) => {
    return await productModel.searchProducts(keyword);
};
