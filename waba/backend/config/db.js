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

export default pool;
