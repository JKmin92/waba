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

// pets 테이블 is_birth_estimated 컬럼 존재 여부 확인 및 자동 추가
(async () => {
    try {
        const [columns] = await pool.query("SHOW COLUMNS FROM `pets` LIKE 'is_birth_estimated'");
        if (columns.length === 0) {
            await pool.query("ALTER TABLE `pets` ADD COLUMN `is_birth_estimated` TINYINT(1) NOT NULL DEFAULT 0 AFTER `birth_date`");
            console.log("✅ [DB Migration] pets.is_birth_estimated 컬럼이 추가되었습니다.");
        }
    } catch (err) {
        if (err.code !== 'ER_NO_SUCH_TABLE') {
            console.error("⚠️ [DB Migration] pets.is_birth_estimated 컬럼 검사/추가 실패:", err.message);
        }
    }
})();

// pet_histories 테이블 자동 생성
(async () => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS \`pet_histories\` (
              \`id\` BIGINT AUTO_INCREMENT PRIMARY KEY,
              \`pet_id\` VARCHAR(20) NOT NULL,
              \`user_id\` VARCHAR(30) NOT NULL,
              \`event_date\` DATE NOT NULL,
              \`category\` ENUM('SURGERY', 'VACCINE', 'CHECKUP', 'WEIGHT', 'EVENT', 'OTHER') NOT NULL DEFAULT 'CHECKUP',
              \`title\` VARCHAR(150) NOT NULL,
              \`description\` TEXT NULL,
              \`hospital_name\` VARCHAR(100) NULL,
              \`weight_kg\` DECIMAL(5, 2) NULL,
              \`is_ai_generated\` TINYINT(1) NOT NULL DEFAULT 0,
              \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
              INDEX \`idx_pet_histories_pet\` (\`pet_id\`, \`event_date\` DESC),
              INDEX \`idx_pet_histories_user\` (\`user_id\`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);
        console.log("✅ [DB Migration] pet_histories 테이블 확인/생성 완료.");
    } catch (err) {
        console.error("⚠️ [DB Migration] pet_histories 테이블 생성 실패:", err.message);
    }
})();

// pet_journeys 테이블 자동 생성
(async () => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS \`pet_journeys\` (
              \`id\` BIGINT AUTO_INCREMENT PRIMARY KEY,
              \`pet_id\` VARCHAR(20) NOT NULL,
              \`user_id\` VARCHAR(50) NOT NULL,
              \`title\` VARCHAR(100) NOT NULL,
              \`description\` TEXT NULL,
              \`start_date\` DATE NOT NULL,
              \`end_date\` DATE NULL,
              \`is_ongoing\` TINYINT(1) NOT NULL DEFAULT 1,
              \`share_slug\` VARCHAR(64) UNIQUE NOT NULL,
              \`share_scope\` ENUM('PRIVATE', 'LINK_ONLY', 'PUBLIC') NOT NULL DEFAULT 'LINK_ONLY',
              \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
              \`updated_at\` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
              INDEX \`idx_pet_journeys_pet\` (\`pet_id\`, \`start_date\` DESC),
              INDEX \`idx_pet_journeys_user\` (\`user_id\`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);
        console.log("✅ [DB Migration] pet_journeys 테이블 확인/생성 완료.");

        // 기존 PRIVATE 저니를 공유 링크 지원을 위해 LINK_ONLY로 1회 일괄 마이그레이션
        await pool.query("UPDATE `pet_journeys` SET `share_scope` = 'LINK_ONLY' WHERE `share_scope` = 'PRIVATE'");

        // pet_histories.journey_id 컬럼 존재 여부 확인 및 추가
        const [journeyCols] = await pool.query("SHOW COLUMNS FROM `pet_histories` LIKE 'journey_id'");
        if (journeyCols.length === 0) {
            await pool.query("ALTER TABLE `pet_histories` ADD COLUMN `journey_id` BIGINT NULL AFTER `user_id`, ADD INDEX `idx_pet_histories_journey` (`journey_id`)");
            console.log("✅ [DB Migration] pet_histories.journey_id 컬럼 추가 완료.");
        }

        // pet_histories.is_ai_generated 컬럼 존재 여부 확인 및 추가
        const [isAiGeneratedCols] = await pool.query("SHOW COLUMNS FROM `pet_histories` LIKE 'is_ai_generated'");
        if (isAiGeneratedCols.length === 0) {
            await pool.query("ALTER TABLE `pet_histories` ADD COLUMN `is_ai_generated` TINYINT(1) NOT NULL DEFAULT 0 AFTER `weight_kg`");
            console.log("✅ [DB Migration] pet_histories.is_ai_generated 컬럼 추가 완료.");
        }

        // pet_history_posts 테이블 자동 생성 (기록과 룩북 글 N:M 연결)
        await pool.query(`
            CREATE TABLE IF NOT EXISTS \`pet_history_posts\` (
              \`id\` BIGINT AUTO_INCREMENT PRIMARY KEY,
              \`history_id\` BIGINT NOT NULL,
              \`post_id\` VARCHAR(50) NOT NULL,
              \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
              UNIQUE KEY \`uq_history_post\` (\`history_id\`, \`post_id\`),
              INDEX \`idx_php_history\` (\`history_id\`),
              INDEX \`idx_php_post\` (\`post_id\`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);
        console.log("✅ [DB Migration] pet_history_posts 테이블 확인/생성 완료.");

        // pets 소프트 삭제(Soft Delete) 컬럼 및 인덱스 마이그레이션
        const [isDeletedCols] = await pool.query("SHOW COLUMNS FROM `pets` LIKE 'is_deleted'");
        if (isDeletedCols.length === 0) {
            await pool.query(`
                ALTER TABLE \`pets\`
                ADD COLUMN \`is_deleted\` TINYINT(1) NOT NULL DEFAULT 0 AFTER \`is_primary\`,
                ADD COLUMN \`deleted_at\` DATETIME NULL AFTER \`is_deleted\`,
                ADD INDEX \`idx_pets_user_deleted\` (\`user_id\`, \`is_deleted\`)
            `);
            console.log("✅ [DB Migration] pets 소프트 삭제(is_deleted, deleted_at) 컬럼 및 인덱스 추가 완료.");
        }

        // users.auto_journal_enabled 컬럼 존재 여부 확인 및 추가
        const [autoJournalCols] = await pool.query("SHOW COLUMNS FROM `users` LIKE 'auto_journal_enabled'");
        if (autoJournalCols.length === 0) {
            await pool.query("ALTER TABLE `users` ADD COLUMN `auto_journal_enabled` TINYINT(1) NOT NULL DEFAULT 0 AFTER `is_multi_species`");
            console.log("✅ [DB Migration] users.auto_journal_enabled 컬럼 추가 완료.");
        }

        // post_images.is_sensitive 컬럼 존재 여부 확인 및 추가
        const [postImgSensitiveCols] = await pool.query("SHOW COLUMNS FROM `post_images` LIKE 'is_sensitive'");
        if (postImgSensitiveCols.length === 0) {
            await pool.query("ALTER TABLE `post_images` ADD COLUMN `is_sensitive` TINYINT(1) NOT NULL DEFAULT 0 AFTER `is_ai_generated`");
            console.log("✅ [DB Migration] post_images.is_sensitive 컬럼 추가 완료.");
        }

        // allowed_affiliate_domains 테이블 자동 생성 및 기본 제휴 쇼핑몰 시드
        await pool.query(`
            CREATE TABLE IF NOT EXISTS \`allowed_affiliate_domains\` (
              \`id\` INT AUTO_INCREMENT PRIMARY KEY,
              \`domain\` VARCHAR(255) NOT NULL UNIQUE,
              \`mall_name\` VARCHAR(100) NOT NULL,
              \`is_active\` TINYINT(1) NOT NULL DEFAULT 1,
              \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);
        await pool.query(`
            INSERT IGNORE INTO \`allowed_affiliate_domains\` (\`domain\`, \`mall_name\`) VALUES
            ('coupang.com', '쿠팡'),
            ('link.coupang.com', '쿠팡 파트너스'),
            ('smartstore.naver.com', '네이버 스마트스토어'),
            ('brand.naver.com', '네이버 브랜드스토어'),
            ('shopping.naver.com', '네이버 쇼핑'),
            ('naver.me', '네이버 단축URL'),
            ('11st.co.kr', '11번가'),
            ('gmarket.co.kr', 'G마켓'),
            ('auction.co.kr', '옥션'),
            ('ssg.com', 'SSG닷컴'),
            ('kurly.com', '컬리'),
            ('pet-friends.co.kr', '펫프렌즈'),
            ('oliveyoung.co.kr', '올리브영')
        `);
        console.log("✅ [DB Migration] allowed_affiliate_domains 테이블 및 기본 도메인 시드 확인 완료.");
    } catch (err) {
        console.error("⚠️ [DB Migration] pet_journeys/posts 테이블 생성 실패:", err.message);
    }
})();

export default pool;
