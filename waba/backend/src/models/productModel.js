import db from '../../config/db.js';

export const getMainProductList = async () => {
    const sql = `SELECT * FROM products LIMIT 4`;
    const [rows] = await db.query(sql);
    return rows;
}