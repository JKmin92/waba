import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env'), override: true });

const isLinux = process.platform === 'linux';

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    socketPath: (!process.env.DB_PASSWORD && isLinux) ? '/var/run/mysqld/mysqld.sock' : undefined,
    waitForConnections: true,
    connectionLimit: 10,
    typeCast: function (field, next) {
        if (field.type === 'BIT' && field.length === 1) {
            const bytes = field.buffer();
            return bytes ? bytes[0] : 0;
        }
        if (field.type === 'JSON') {
            const val = field.string('utf8');
            return val ? JSON.parse(val) : null;
        }
        return next();
    }
});

// pets 테이블 custom_species 컬럼 존재 여부 확인 및 자동 추가
(async () => {
    try {
        const [columns] = await pool.query("SHOW COLUMNS FROM `pets` LIKE 'custom_species'");
        if (columns.length === 0) {
            await pool.query("ALTER TABLE `pets` ADD COLUMN `custom_species` VARCHAR(50) NULL DEFAULT NULL AFTER `species`");
            console.log("✅ [DB Migration] pets.custom_species 컬럼이 추가되었습니다.");
        }
    } catch (err) {
        if (err.code !== 'ER_NO_SUCH_TABLE') {
            console.error("⚠️ [DB Migration] pets.custom_species 컬럼 검사/추가 실패:", err.message);
        }
    }
})();

export default pool;
