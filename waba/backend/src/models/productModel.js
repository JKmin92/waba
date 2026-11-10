import db from '../../config/db.js';

export const getMainProductList = async () => {
    const sql = `SELECT * FROM products LIMIT 4`;
    const [rows] = await db.query(sql);
    return rows;
};

export const searchProducts = async (keyword = '') => {
    const term = `%${keyword.trim()}%`;
    const sql = `
        SELECT id, name, summary, thumbnail_url, original_price, sale_price, reward_rate, pin_count
        FROM products 
        WHERE status = 'ON_SALE' 
          AND (name LIKE ? OR summary LIKE ? OR target_species LIKE ?)
        ORDER BY pin_count DESC, id ASC
        LIMIT 20
    `;
    const [rows] = await db.query(sql, [term, term, term]);
    return rows;
};
