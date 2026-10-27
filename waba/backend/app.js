import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';

import postRoutes from './src/routes/postRoutes.js';
import productRoutes from './src/routes/productRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.set('trust proxy', 1);
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(
    cors({
        origin: [process.env.CLIENT_URL || 'http://localhost:3000', 'http://localhost:3000'],
        credentials: true,
    })
);
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

app.use('/api/post', postRoutes);
app.use('/api/product', productRoutes);

app.use((err, req, res, next) => {
    console.error('🔥 Server Error:', err);

    res.status(500).json({
        success: false,
        message: '서버 내부 오류가 발생했습니다.',
        error: err.message,
    });
});

export default app;
