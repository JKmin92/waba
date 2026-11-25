import app from './app.js';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { cleanupExpiredAnalyticsData } from './src/models/analyticsModel.js';
import { cleanupExpiredPostsAndDrafts } from './src/models/postModel.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, 'config/.env'), override: true });

const PORT = process.env.PORT || 5000;

const runScheduledCleanups = async () => {
    try {
        const { deletedVisits, deletedPageStats } = await cleanupExpiredAnalyticsData();
        if (deletedVisits > 0 || deletedPageStats > 0) {
            console.log(
                `🧹 [Analytics Retention] 3년 경과 데이터 정리 완료 (site_visits: ${deletedVisits}건, daily_page_stats: ${deletedPageStats}건)`
            );
        }
    } catch (err) {
        console.error('⚠️ [Analytics Retention] 3년 경과 데이터 정리 실패:', err.message);
    }

    try {
        const { purgedDrafts, purgedDeletedPosts } = await cleanupExpiredPostsAndDrafts();
        if (purgedDrafts > 0 || purgedDeletedPosts > 0) {
            console.log(
                `🧹 [Post Retention] 만료 임시저장/삭제글 영구 정리 완료 (drafts: ${purgedDrafts}건, deleted: ${purgedDeletedPosts}건)`
            );
        }
    } catch (err) {
        console.error('⚠️ [Post Retention] 만료 게시글 정리 실패:', err.message);
    }
};

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    setTimeout(runScheduledCleanups, 15000).unref();
    setInterval(runScheduledCleanups, 24 * 60 * 60 * 1000).unref();
});