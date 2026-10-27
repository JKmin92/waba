import * as productModel from '../models/productModel.js';

export const getMainProductList = async () => {
    return await productModel.getMainProductList();
}