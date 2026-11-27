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
        // PRIVATE(나만 보기) 기본 사용을 위해 기존 LINK_ONLY 일괄 변환 비활성화
        // await pool.query("UPDATE `pet_journeys` SET `share_scope` = 'LINK_ONLY' WHERE `share_scope` = 'PRIVATE'");

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

        // 1) comments 테이블 댓글 고정(최대 2개) 컬럼 및 인덱스 추가
        const [commentPinnedCols] = await pool.query("SHOW COLUMNS FROM `comments` LIKE 'is_pinned'");
        if (commentPinnedCols.length === 0) {
            await pool.query(`
                ALTER TABLE \`comments\`
                ADD COLUMN \`is_pinned\` TINYINT(1) NOT NULL DEFAULT 0 AFTER \`is_accepted\`,
                ADD COLUMN \`pinned_at\` DATETIME NULL AFTER \`is_pinned\`,
                ADD INDEX \`idx_post_pinned\` (\`post_id\`, \`is_pinned\`, \`pinned_at\`)
            `);
            console.log("✅ [DB Migration] comments.is_pinned, pinned_at 컬럼 및 idx_post_pinned 인덱스 추가 완료.");
        }

        // 2) pet_journeys 상태(ACTIVE/CURED/COMPLETED), 카테고리, 목표 요약, 완료일시 컬럼 추가
        const [journeyStatusCols] = await pool.query("SHOW COLUMNS FROM `pet_journeys` LIKE 'status'");
        if (journeyStatusCols.length === 0) {
            await pool.query("ALTER TABLE `pet_journeys` ADD COLUMN `status` VARCHAR(30) NOT NULL DEFAULT 'ACTIVE' AFTER `is_ongoing`");
            console.log("✅ [DB Migration] pet_journeys.status 컬럼 추가 완료.");
        }
        const [journeyCategoryCols] = await pool.query("SHOW COLUMNS FROM `pet_journeys` LIKE 'category'");
        if (journeyCategoryCols.length === 0) {
            await pool.query("ALTER TABLE `pet_journeys` ADD COLUMN `category` VARCHAR(50) NULL AFTER `status`");
            console.log("✅ [DB Migration] pet_journeys.category 컬럼 추가 완료.");
        }
        const [journeyGoalCols] = await pool.query("SHOW COLUMNS FROM `pet_journeys` LIKE 'goal_summary'");
        if (journeyGoalCols.length === 0) {
            await pool.query("ALTER TABLE `pet_journeys` ADD COLUMN `goal_summary` VARCHAR(255) NULL AFTER `category`");
            console.log("✅ [DB Migration] pet_journeys.goal_summary 컬럼 추가 완료.");
        }
        const [journeyCompletedCols] = await pool.query("SHOW COLUMNS FROM `pet_journeys` LIKE 'completed_at'");
        if (journeyCompletedCols.length === 0) {
            await pool.query("ALTER TABLE `pet_journeys` ADD COLUMN `completed_at` DATETIME NULL AFTER `goal_summary`");
            console.log("✅ [DB Migration] pet_journeys.completed_at 컬럼 추가 완료.");
        }

        const [journeyNoteCodeCols] = await pool.query("SHOW COLUMNS FROM `pet_journeys` LIKE 'note_code'");
        if (journeyNoteCodeCols.length === 0) {
            await pool.query("ALTER TABLE `pet_journeys` ADD COLUMN `note_code` VARCHAR(32) NULL AFTER `id`");
            await pool.query("ALTER TABLE `pet_journeys` ADD UNIQUE INDEX `uq_pet_journeys_note_code` (`note_code`)");
            console.log("✅ [DB Migration] pet_journeys.note_code 컬럼 및 UNIQUE 인덱스 추가 완료.");
        }

        const [missingNoteRows] = await pool.query("SELECT id FROM `pet_journeys` WHERE `note_code` IS NULL OR `note_code` = ''");
        if (missingNoteRows.length > 0) {
            const { generateNoteCode } = await import('../utils/simpleUtils.js');
            for (const row of missingNoteRows) {
                for (let attempt = 0; attempt < 5; attempt++) {
                    const code = generateNoteCode();
                    try {
                        await pool.query("UPDATE `pet_journeys` SET `note_code` = ? WHERE id = ?", [code, row.id]);
                        break;
                    } catch (e) {
                        if (e?.code !== 'ER_DUP_ENTRY' || attempt === 4) throw e;
                    }
                }
            }
            console.log(`✅ [DB Migration] 기존 pet_journeys ${missingNoteRows.length}건 note_code 백필 완료.`);
        }

        // 3) pet_journey_scraps 테이블 생성 (공유 수첩 스크랩)
        await pool.query(`
            CREATE TABLE IF NOT EXISTS \`pet_journey_scraps\` (
              \`id\` BIGINT AUTO_INCREMENT PRIMARY KEY,
              \`journey_id\` BIGINT NOT NULL,
              \`user_id\` VARCHAR(30) NOT NULL,
              \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              UNIQUE KEY \`uk_journey_scrap\` (\`journey_id\`, \`user_id\`),
              INDEX \`idx_pjs_user\` (\`user_id\`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);
        console.log("✅ [DB Migration] pet_journey_scraps 테이블 확인/생성 완료.");

        // 4) pet_journey_comments 테이블 생성 (건강 수첩 상세 응원/질문 댓글)
        await pool.query(`
            CREATE TABLE IF NOT EXISTS \`pet_journey_comments\` (
              \`id\` BIGINT AUTO_INCREMENT PRIMARY KEY,
              \`journey_id\` BIGINT NOT NULL,
              \`user_id\` VARCHAR(30) NOT NULL,
              \`content\` TEXT NOT NULL,
              \`is_deleted\` TINYINT(1) NOT NULL DEFAULT 0,
              \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
              INDEX \`idx_pjc_journey\` (\`journey_id\`, \`created_at\`),
              INDEX \`idx_pjc_user\` (\`user_id\`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);
        console.log("✅ [DB Migration] pet_journey_comments 테이블 확인/생성 완료.");

        // 5) posts.board_id NULL 허용 (카테고리 미선택 임시저장 지원)
        const [postBoardCols] = await pool.query("SHOW COLUMNS FROM `posts` LIKE 'board_id'");
        if (postBoardCols[0] && postBoardCols[0].Null === 'NO') {
            await pool.query("ALTER TABLE `posts` MODIFY COLUMN `board_id` VARCHAR(30) NULL DEFAULT NULL");
            console.log("✅ [DB Migration] posts.board_id NULL 허용 변경 완료.");
        }

        // 6) pet_history_pets 다중 반려동물 매핑 테이블 생성 및 기존 데이터 백필
        await pool.query(`
            CREATE TABLE IF NOT EXISTS \`pet_history_pets\` (
              \`history_id\` BIGINT NOT NULL,
              \`pet_id\` VARCHAR(30) NOT NULL,
              \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              PRIMARY KEY (\`history_id\`, \`pet_id\`),
              INDEX \`idx_phpets_pet\` (\`pet_id\`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);
        await pool.query(`
            INSERT IGNORE INTO \`pet_history_pets\` (\`history_id\`, \`pet_id\`)
            SELECT \`id\`, \`pet_id\` FROM \`pet_histories\`
        `);
        console.log("✅ [DB Migration] pet_history_pets 테이블 생성 및 백필 완료.");

        // 7) pet_journey_pets 다중 반려동물 매핑 테이블 생성 및 기존 데이터 백필
        await pool.query(`
            CREATE TABLE IF NOT EXISTS \`pet_journey_pets\` (
              \`journey_id\` BIGINT NOT NULL,
              \`pet_id\` VARCHAR(30) NOT NULL,
              \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              PRIMARY KEY (\`journey_id\`, \`pet_id\`),
              INDEX \`idx_pjpets_pet\` (\`pet_id\`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        await pool.query(`
            INSERT IGNORE INTO \`pet_journey_pets\` (\`journey_id\`, \`pet_id\`)
            SELECT id, pet_id FROM \`pet_journeys\` WHERE pet_id IS NOT NULL AND pet_id != ''
        `);
        console.log("✅ [DB Migration] pet_journey_pets 테이블 생성 및 백필 완료.");

        // 8) 관리자 감사 로그 / 신고 / 공지·배너 테이블 생성
        await pool.query(`
            CREATE TABLE IF NOT EXISTS \`admin_audit_logs\` (
              \`id\` BIGINT AUTO_INCREMENT PRIMARY KEY,
              \`admin_user_id\` VARCHAR(30) NOT NULL,
              \`action\` VARCHAR(60) NOT NULL,
              \`target_type\` VARCHAR(40) NOT NULL,
              \`target_id\` VARCHAR(64) NULL,
              \`summary\` VARCHAR(255) NOT NULL,
              \`detail_json\` JSON NULL,
              \`ip_address\` VARCHAR(45) NULL,
              \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
              INDEX \`idx_audit_created\` (\`created_at\` DESC),
              INDEX \`idx_audit_admin\` (\`admin_user_id\`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log("✅ [DB Migration] admin_audit_logs 테이블 확인/생성 완료.");

        await pool.query(`
            CREATE TABLE IF NOT EXISTS \`reports\` (
              \`id\` BIGINT AUTO_INCREMENT PRIMARY KEY,
              \`reporter_user_id\` VARCHAR(30) NOT NULL,
              \`target_type\` ENUM('POST','COMMENT','NOTEBOOK','USER') NOT NULL,
              \`target_id\` VARCHAR(64) NOT NULL,
              \`reason\` VARCHAR(100) NOT NULL,
              \`detail\` TEXT NULL,
              \`status\` ENUM('PENDING','RESOLVED','DISMISSED') NOT NULL DEFAULT 'PENDING',
              \`handled_by\` VARCHAR(30) NULL,
              \`handled_note\` VARCHAR(255) NULL,
              \`handled_at\` DATETIME NULL,
              \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
              INDEX \`idx_reports_status_created\` (\`status\`, \`created_at\` DESC)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log("✅ [DB Migration] reports 테이블 확인/생성 완료.");

        await pool.query(`
            CREATE TABLE IF NOT EXISTS \`admin_notices\` (
              \`id\` BIGINT AUTO_INCREMENT PRIMARY KEY,
              \`type\` ENUM('NOTICE','BANNER') NOT NULL DEFAULT 'NOTICE',
              \`title\` VARCHAR(150) NOT NULL,
              \`content\` TEXT NULL,
              \`link_url\` VARCHAR(500) NULL,
              \`is_active\` TINYINT(1) NOT NULL DEFAULT 1,
              \`start_at\` DATETIME NULL,
              \`end_at\` DATETIME NULL,
              \`created_by\` VARCHAR(30) NOT NULL,
              \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
              \`updated_at\` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log("✅ [DB Migration] admin_notices 테이블 확인/생성 완료.");

        // 9) 방문자/페이지 통계 및 공유 단축 URL 테이블 생성 (3년 보관 대상: site_visits, daily_page_stats)
        await pool.query(`
            CREATE TABLE IF NOT EXISTS \`site_visits\` (
              \`id\` BIGINT AUTO_INCREMENT PRIMARY KEY,
              \`visit_date\` DATE NOT NULL,
              \`visitor_key\` VARCHAR(64) NOT NULL,
              \`user_id\` VARCHAR(30) NULL,
              \`is_member\` TINYINT(1) NOT NULL DEFAULT 0,
              \`landing_path\` VARCHAR(255) NOT NULL DEFAULT '/',
              \`referrer_url\` VARCHAR(500) NULL,
              \`referrer_domain\` VARCHAR(120) NULL,
              \`channel\` VARCHAR(30) NOT NULL DEFAULT 'DIRECT',
              \`short_link_code\` VARCHAR(16) NULL,
              \`utm_source\` VARCHAR(100) NULL,
              \`utm_medium\` VARCHAR(100) NULL,
              \`utm_campaign\` VARCHAR(100) NULL,
              \`device_type\` ENUM('MOBILE','TABLET','DESKTOP') NOT NULL DEFAULT 'DESKTOP',
              \`page_view_count\` INT UNSIGNED NOT NULL DEFAULT 1,
              \`ip_hash\` CHAR(64) NULL,
              \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
              \`last_seen_at\` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
              UNIQUE KEY \`uk_site_visits_date_visitor\` (\`visit_date\`, \`visitor_key\`),
              INDEX \`idx_site_visits_date_member\` (\`visit_date\`, \`is_member\`),
              INDEX \`idx_site_visits_date_channel\` (\`visit_date\`, \`channel\`),
              INDEX \`idx_site_visits_user\` (\`user_id\`),
              INDEX \`idx_site_visits_short_code\` (\`short_link_code\`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log("✅ [DB Migration] site_visits 테이블 확인/생성 완료.");

        await pool.query(`
            CREATE TABLE IF NOT EXISTS \`daily_page_stats\` (
              \`id\` BIGINT AUTO_INCREMENT PRIMARY KEY,
              \`stat_date\` DATE NOT NULL,
              \`path\` VARCHAR(255) NOT NULL,
              \`route_group\` VARCHAR(30) NOT NULL DEFAULT 'OTHER',
              \`pv_count\` INT UNSIGNED NOT NULL DEFAULT 1,
              \`updated_at\` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
              UNIQUE KEY \`uk_daily_page_stats_date_path\` (\`stat_date\`, \`path\`),
              INDEX \`idx_daily_page_stats_date_pv\` (\`stat_date\`, \`pv_count\` DESC),
              INDEX \`idx_daily_page_stats_group\` (\`stat_date\`, \`route_group\`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log("✅ [DB Migration] daily_page_stats 테이블 확인/생성 완료.");

        await pool.query(`
            CREATE TABLE IF NOT EXISTS \`short_links\` (
              \`id\` BIGINT AUTO_INCREMENT PRIMARY KEY,
              \`code\` VARCHAR(16) NOT NULL,
              \`target_path\` VARCHAR(255) NOT NULL,
              \`target_type\` VARCHAR(30) NOT NULL DEFAULT 'PAGE',
              \`target_id\` VARCHAR(64) NULL,
              \`channel\` VARCHAR(30) NOT NULL DEFAULT 'SHARE_COPY',
              \`created_by_user_id\` VARCHAR(30) NULL,
              \`click_count\` INT UNSIGNED NOT NULL DEFAULT 0,
              \`last_clicked_at\` DATETIME NULL,
              \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
              UNIQUE KEY \`uk_short_links_code\` (\`code\`),
              INDEX \`idx_short_links_lookup\` (\`target_path\`(191), \`channel\`, \`created_by_user_id\`),
              INDEX \`idx_short_links_target\` (\`target_type\`, \`target_id\`),
              INDEX \`idx_short_links_channel\` (\`channel\`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log("✅ [DB Migration] short_links 테이블 확인/생성 완료.");
        // 10) users 수의사/관리자 메타 컬럼 추가
        const userMetaCols = [
            { name: 'vet_license_number', sql: 'ADD COLUMN `vet_license_number` VARCHAR(100) NULL AFTER `vet_license_info`' },
            { name: 'vet_hospital_name', sql: 'ADD COLUMN `vet_hospital_name` VARCHAR(150) NULL AFTER `vet_license_number`' },
            { name: 'admin_title', sql: 'ADD COLUMN `admin_title` VARCHAR(60) NULL AFTER `vet_hospital_name`' },
            { name: 'admin_name', sql: 'ADD COLUMN `admin_name` VARCHAR(60) NULL AFTER `admin_title`' }
        ];
        for (const col of userMetaCols) {
            const [cols] = await pool.query(`SHOW COLUMNS FROM \`users\` LIKE '${col.name}'`);
            if (cols.length === 0) {
                await pool.query(`ALTER TABLE \`users\` ${col.sql}`);
                console.log(`✅ [DB Migration] users.${col.name} 컬럼 추가 완료.`);
            }
        }
        // 11) posts 삭제 유예/이의제기 컬럼 및 post_appeals 테이블 추가
        const postDeleteCols = [
            { name: 'deleted_at', sql: 'ADD COLUMN `deleted_at` DATETIME NULL AFTER `status`' },
            { name: 'delete_type', sql: 'ADD COLUMN `delete_type` VARCHAR(20) NULL AFTER `deleted_at`' },
            { name: 'delete_reason', sql: 'ADD COLUMN `delete_reason` VARCHAR(255) NULL AFTER `delete_type`' },
            { name: 'deleted_by', sql: 'ADD COLUMN `deleted_by` VARCHAR(30) NULL AFTER `delete_reason`' },
            { name: 'purge_scheduled_at', sql: 'ADD COLUMN `purge_scheduled_at` DATETIME NULL AFTER `deleted_by`' },
            { name: 'admin_extended_days', sql: 'ADD COLUMN `admin_extended_days` INT NOT NULL DEFAULT 0 AFTER `purge_scheduled_at`' }
        ];
        for (const col of postDeleteCols) {
            const [cols] = await pool.query(`SHOW COLUMNS FROM \`posts\` LIKE '${col.name}'`);
            if (cols.length === 0) {
                await pool.query(`ALTER TABLE \`posts\` ${col.sql}`);
                console.log(`✅ [DB Migration] posts.${col.name} 컬럼 추가 완료.`);
            }
        }

        const [purgeIdx] = await pool.query("SHOW INDEX FROM `posts` WHERE Key_name = 'idx_posts_purge_scheduled'");
        if (purgeIdx.length === 0) {
            await pool.query("ALTER TABLE `posts` ADD INDEX `idx_posts_purge_scheduled` (`status`, `purge_scheduled_at`)");
            console.log("✅ [DB Migration] posts.idx_posts_purge_scheduled 인덱스 추가 완료.");
        }

        await pool.query(`
            UPDATE \`posts\`
            SET deleted_at = COALESCE(deleted_at, updated_at, NOW()),
                delete_type = COALESCE(delete_type, 'USER'),
                purge_scheduled_at = DATE_ADD(COALESCE(deleted_at, updated_at, NOW()), INTERVAL 30 DAY)
            WHERE status = 'DELETED' AND purge_scheduled_at IS NULL
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS \`post_appeals\` (
              \`id\` BIGINT AUTO_INCREMENT PRIMARY KEY,
              \`post_id\` VARCHAR(25) NOT NULL,
              \`user_id\` VARCHAR(30) NOT NULL,
              \`reason\` TEXT NOT NULL,
              \`status\` ENUM('PENDING','APPROVED','REJECTED') NOT NULL DEFAULT 'PENDING',
              \`extended_by_appeal\` TINYINT(1) NOT NULL DEFAULT 0,
              \`admin_note\` VARCHAR(255) NULL,
              \`handled_by\` VARCHAR(30) NULL,
              \`handled_at\` DATETIME NULL,
              \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
              \`updated_at\` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
              UNIQUE KEY \`uk_post_appeals_post\` (\`post_id\`),
              INDEX \`idx_post_appeals_user\` (\`user_id\`),
              INDEX \`idx_post_appeals_status\` (\`status\`, \`created_at\`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log("✅ [DB Migration] post_appeals 테이블 확인/생성 완료.");

        // 12) 반복 이의 제기 및 재이의 차단 컬럼/인덱스 마이그레이션
        const [appealBlockedCols] = await pool.query("SHOW COLUMNS FROM `posts` LIKE 'appeal_blocked'");
        if (appealBlockedCols.length === 0) {
            await pool.query("ALTER TABLE `posts` ADD COLUMN `appeal_blocked` TINYINT(1) NOT NULL DEFAULT 0 AFTER `admin_extended_days`");
            console.log("✅ [DB Migration] posts.appeal_blocked 컬럼 추가 완료.");
        }

        const [attemptNoCols] = await pool.query("SHOW COLUMNS FROM `post_appeals` LIKE 'attempt_no'");
        if (attemptNoCols.length === 0) {
            await pool.query("ALTER TABLE `post_appeals` ADD COLUMN `attempt_no` INT NOT NULL DEFAULT 1 AFTER `user_id`");
            console.log("✅ [DB Migration] post_appeals.attempt_no 컬럼 추가 완료.");
        }

        const [blockedReappealCols] = await pool.query("SHOW COLUMNS FROM `post_appeals` LIKE 'blocked_reappeal'");
        if (blockedReappealCols.length === 0) {
            await pool.query("ALTER TABLE `post_appeals` ADD COLUMN `blocked_reappeal` TINYINT(1) NOT NULL DEFAULT 0 AFTER `extended_by_appeal`");
            console.log("✅ [DB Migration] post_appeals.blocked_reappeal 컬럼 추가 완료.");
        }

        const [ukPostAppeals] = await pool.query("SHOW INDEX FROM `post_appeals` WHERE Key_name = 'uk_post_appeals_post'");
        if (ukPostAppeals.length > 0) {
            await pool.query("ALTER TABLE `post_appeals` DROP INDEX `uk_post_appeals_post`");
            console.log("✅ [DB Migration] post_appeals.uk_post_appeals_post UNIQUE 인덱스 제거 완료.");
        }

        const [idxPostAppeals] = await pool.query("SHOW INDEX FROM `post_appeals` WHERE Key_name = 'idx_post_appeals_post'");
        if (idxPostAppeals.length === 0) {
            await pool.query("ALTER TABLE `post_appeals` ADD INDEX `idx_post_appeals_post` (`post_id`, `attempt_no`)");
            console.log("✅ [DB Migration] post_appeals.idx_post_appeals_post 인덱스 추가 완료.");
        }

        // 13) post_appeals.admin_note / reports.handled_note TEXT 확장
        const [appealNoteCols] = await pool.query("SHOW COLUMNS FROM `post_appeals` LIKE 'admin_note'");
        if (appealNoteCols.length > 0 && String(appealNoteCols[0].Type || '').toLowerCase() !== 'text') {
            await pool.query("ALTER TABLE `post_appeals` MODIFY COLUMN `admin_note` TEXT NULL");
            console.log("✅ [DB Migration] post_appeals.admin_note TEXT 확장 완료.");
        }

        const [reportNoteCols] = await pool.query("SHOW COLUMNS FROM `reports` LIKE 'handled_note'");
        if (reportNoteCols.length > 0 && String(reportNoteCols[0].Type || '').toLowerCase() !== 'text') {
            await pool.query("ALTER TABLE `reports` MODIFY COLUMN `handled_note` TEXT NULL");
            console.log("✅ [DB Migration] reports.handled_note TEXT 확장 완료.");
        }

        // 14) posts.curation_target_species 컬럼 추가
        const [curationTargetCols] = await pool.query("SHOW COLUMNS FROM `posts` LIKE 'curation_target_species'");
        if (curationTargetCols.length === 0) {
            await pool.query("ALTER TABLE `posts` ADD COLUMN `curation_target_species` VARCHAR(200) NULL AFTER `curation_grade`");
            console.log("✅ [DB Migration] posts.curation_target_species 컬럼 추가 완료.");
        }

        // 15) pet_histories / pet_journeys 비공개 관리 컬럼 추가
        const historyPrivateCols = [
            { name: 'is_private', sql: 'ADD COLUMN `is_private` TINYINT(1) NOT NULL DEFAULT 0 AFTER `is_ai_generated`' },
            { name: 'private_reason', sql: 'ADD COLUMN `private_reason` VARCHAR(500) NULL AFTER `is_private`' },
            { name: 'private_at', sql: 'ADD COLUMN `private_at` DATETIME NULL AFTER `private_reason`' },
            { name: 'private_by', sql: 'ADD COLUMN `private_by` VARCHAR(30) NULL AFTER `private_at`' }
        ];
        for (const col of historyPrivateCols) {
            const [cols] = await pool.query(`SHOW COLUMNS FROM \`pet_histories\` LIKE '${col.name}'`);
            if (cols.length === 0) {
                await pool.query(`ALTER TABLE \`pet_histories\` ${col.sql}`);
                console.log(`✅ [DB Migration] pet_histories.${col.name} 컬럼 추가 완료.`);
            }
        }

        const journeyPrivateCols = [
            { name: 'private_reason', sql: 'ADD COLUMN `private_reason` VARCHAR(500) NULL AFTER `share_scope`' },
            { name: 'private_at', sql: 'ADD COLUMN `private_at` DATETIME NULL AFTER `private_reason`' },
            { name: 'private_by', sql: 'ADD COLUMN `private_by` VARCHAR(30) NULL AFTER `private_at`' }
        ];
        for (const col of journeyPrivateCols) {
            const [cols] = await pool.query(`SHOW COLUMNS FROM \`pet_journeys\` LIKE '${col.name}'`);
            if (cols.length === 0) {
                await pool.query(`ALTER TABLE \`pet_journeys\` ${col.sql}`);
                console.log(`✅ [DB Migration] pet_journeys.${col.name} 컬럼 추가 완료.`);
            }
        }

        // 16) allowed_affiliate_domains 서브도메인 정책 컬럼 추가
        const affiliateCols = [
            { name: 'subdomain_policy', sql: "ADD COLUMN `subdomain_policy` ENUM('ALL', 'SPECIFIC', 'NONE') NOT NULL DEFAULT 'ALL' AFTER `domain`" },
            { name: 'allowed_subdomains', sql: 'ADD COLUMN `allowed_subdomains` VARCHAR(500) NULL AFTER `subdomain_policy`' }
        ];
        for (const col of affiliateCols) {
            const [cols] = await pool.query(`SHOW COLUMNS FROM \`allowed_affiliate_domains\` LIKE '${col.name}'`);
            if (cols.length === 0) {
                await pool.query(`ALTER TABLE \`allowed_affiliate_domains\` ${col.sql}`);
                console.log(`✅ [DB Migration] allowed_affiliate_domains.${col.name} 컬럼 추가 완료.`);
            }
        }

        // 17) comment_likes 테이블 생성
        await pool.query(`
            CREATE TABLE IF NOT EXISTS \`comment_likes\` (
              \`id\` BIGINT AUTO_INCREMENT PRIMARY KEY,
              \`comment_id\` VARCHAR(20) NOT NULL,
              \`user_id\` VARCHAR(30) NOT NULL,
              \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
              UNIQUE KEY \`uk_comment_like\` (\`comment_id\`, \`user_id\`),
              INDEX \`idx_comment_likes_user\` (\`user_id\`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log("✅ [DB Migration] comment_likes 테이블 확인/생성 완료.");

        // 18) 공지·배너·팝업 관리 테이블 마이그레이션
        const [noticeTypeCols] = await pool.query("SHOW COLUMNS FROM `admin_notices` LIKE 'type'");
        if (noticeTypeCols.length > 0 && !String(noticeTypeCols[0].Type || '').includes("'EVENT'")) {
            await pool.query("ALTER TABLE `admin_notices` MODIFY COLUMN `type` ENUM('NOTICE','EVENT','BANNER') NOT NULL DEFAULT 'NOTICE'");
            console.log("✅ [DB Migration] admin_notices.type ENUM 확장 완료.");
        }

        const noticeExtraCols = [
            { name: 'display_status', sql: "ADD COLUMN `display_status` ENUM('VISIBLE','HIDDEN','SCHEDULED') NOT NULL DEFAULT 'VISIBLE' AFTER `is_active`" },
            { name: 'is_pinned', sql: 'ADD COLUMN `is_pinned` TINYINT(1) NOT NULL DEFAULT 0 AFTER `display_status`' },
            { name: 'event_start_at', sql: 'ADD COLUMN `event_start_at` DATETIME NULL AFTER `is_pinned`' },
            { name: 'event_end_at', sql: 'ADD COLUMN `event_end_at` DATETIME NULL AFTER `event_start_at`' },
            { name: 'thumbnail_url', sql: 'ADD COLUMN `thumbnail_url` VARCHAR(500) NULL AFTER `link_url`' },
            { name: 'view_count', sql: 'ADD COLUMN `view_count` INT UNSIGNED NOT NULL DEFAULT 0 AFTER `thumbnail_url`' }
        ];
        for (const col of noticeExtraCols) {
            const [cols] = await pool.query(`SHOW COLUMNS FROM \`admin_notices\` LIKE '${col.name}'`);
            if (cols.length === 0) {
                await pool.query(`ALTER TABLE \`admin_notices\` ${col.sql}`);
                console.log(`✅ [DB Migration] admin_notices.${col.name} 컬럼 추가 완료.`);
            }
        }

        await pool.query(`
            CREATE TABLE IF NOT EXISTS \`admin_banners\` (
              \`id\` BIGINT AUTO_INCREMENT PRIMARY KEY,
              \`banner_key\` VARCHAR(80) NOT NULL,
              \`title\` VARCHAR(150) NOT NULL,
              \`banner_type\` ENUM('SINGLE','SWIPER','RANDOM') NOT NULL DEFAULT 'SINGLE',
              \`display_status\` ENUM('VISIBLE','HIDDEN','SCHEDULED') NOT NULL DEFAULT 'VISIBLE',
              \`start_at\` DATETIME NULL,
              \`end_at\` DATETIME NULL,
              \`autoplay_enabled\` TINYINT(1) NOT NULL DEFAULT 1,
              \`autoplay_interval_ms\` INT UNSIGNED NOT NULL DEFAULT 4000,
              \`show_indicators\` TINYINT(1) NOT NULL DEFAULT 1,
              \`click_count\` INT UNSIGNED NOT NULL DEFAULT 0,
              \`created_by\` VARCHAR(30) NULL,
              \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
              \`updated_at\` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
              UNIQUE KEY \`uk_admin_banners_key\` (\`banner_key\`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log("✅ [DB Migration] admin_banners 테이블 확인/생성 완료.");

        await pool.query(`
            CREATE TABLE IF NOT EXISTS \`admin_banner_items\` (
              \`id\` BIGINT AUTO_INCREMENT PRIMARY KEY,
              \`banner_id\` BIGINT NOT NULL,
              \`sort_order\` INT NOT NULL DEFAULT 0,
              \`title\` VARCHAR(150) NULL,
              \`image_url\` VARCHAR(500) NOT NULL,
              \`pc_image_url\` VARCHAR(500) NULL,
              \`tablet_image_url\` VARCHAR(500) NULL,
              \`mobile_image_url\` VARCHAR(500) NULL,
              \`link_url\` VARCHAR(500) NULL,
              \`link_target\` ENUM('_self','_blank') NOT NULL DEFAULT '_self',
              \`display_status\` ENUM('VISIBLE','HIDDEN','SCHEDULED') NOT NULL DEFAULT 'VISIBLE',
              \`start_at\` DATETIME NULL,
              \`end_at\` DATETIME NULL,
              \`click_count\` INT UNSIGNED NOT NULL DEFAULT 0,
              \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
              \`updated_at\` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
              INDEX \`idx_banner_items_banner\` (\`banner_id\`, \`sort_order\`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log("✅ [DB Migration] admin_banner_items 테이블 확인/생성 완료.");

        await pool.query(`
            CREATE TABLE IF NOT EXISTS \`admin_popup_settings\` (
              \`id\` TINYINT PRIMARY KEY DEFAULT 1,
              \`is_enabled\` TINYINT(1) NOT NULL DEFAULT 1,
              \`dismiss_policy\` ENUM('DAY','WEEK','NONE') NOT NULL DEFAULT 'DAY',
              \`show_pc\` TINYINT(1) NOT NULL DEFAULT 1,
              \`show_tablet\` TINYINT(1) NOT NULL DEFAULT 1,
              \`show_mobile\` TINYINT(1) NOT NULL DEFAULT 1,
              \`mobile_display_mode\` ENUM('MODAL','BOTTOM_SHEET') NOT NULL DEFAULT 'BOTTOM_SHEET',
              \`updated_by\` VARCHAR(30) NULL,
              \`updated_at\` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        await pool.query("INSERT IGNORE INTO `admin_popup_settings` (`id`) VALUES (1)");
        console.log("✅ [DB Migration] admin_popup_settings 테이블 확인/생성 및 시드 완료.");

        await pool.query(`
            CREATE TABLE IF NOT EXISTS \`admin_popup_slides\` (
              \`id\` BIGINT AUTO_INCREMENT PRIMARY KEY,
              \`sort_order\` INT NOT NULL DEFAULT 0,
              \`title\` VARCHAR(150) NULL,
              \`image_url\` VARCHAR(500) NOT NULL,
              \`link_url\` VARCHAR(500) NULL,
              \`link_target\` ENUM('_self','_blank') NOT NULL DEFAULT '_self',
              \`display_status\` ENUM('VISIBLE','HIDDEN','SCHEDULED') NOT NULL DEFAULT 'VISIBLE',
              \`start_at\` DATETIME NULL,
              \`end_at\` DATETIME NULL,
              \`click_count\` INT UNSIGNED NOT NULL DEFAULT 0,
              \`created_by\` VARCHAR(30) NULL,
              \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
              \`updated_at\` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
              INDEX \`idx_popup_slides_sort\` (\`sort_order\`, \`id\`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log("✅ [DB Migration] admin_popup_slides 테이블 확인/생성 완료.");

        // 19) 2단계 관리자 등급(admin_level) 컬럼 추가 및 기존 관리자 SUPER 백필
        const [adminLevelCols] = await pool.query("SHOW COLUMNS FROM `users` LIKE 'admin_level'");
        if (adminLevelCols.length === 0) {
            await pool.query("ALTER TABLE `users` ADD COLUMN `admin_level` ENUM('SUPER', 'NORMAL') NULL DEFAULT NULL AFTER `admin_name`");
            console.log("✅ [DB Migration] users.admin_level 컬럼 추가 완료.");
        }
        await pool.query("UPDATE `users` SET `admin_level` = 'SUPER' WHERE `role` = 'ADMIN' AND `admin_level` IS NULL");

        // 20) 회원 탈퇴(30일 유예·파기) 컬럼 추가
        const withdrawCols = [
            { name: 'withdrawn_reason', sql: 'ADD COLUMN `withdrawn_reason` VARCHAR(255) NULL AFTER `withdrawn_at`' },
            { name: 'delete_content_on_withdraw', sql: 'ADD COLUMN `delete_content_on_withdraw` TINYINT(1) NOT NULL DEFAULT 0 AFTER `withdrawn_reason`' },
            { name: 'withdrawn_purged_at', sql: 'ADD COLUMN `withdrawn_purged_at` DATETIME NULL AFTER `delete_content_on_withdraw`' }
        ];
        for (const col of withdrawCols) {
            const [cols] = await pool.query(`SHOW COLUMNS FROM \`users\` LIKE '${col.name}'`);
            if (cols.length === 0) {
                await pool.query(`ALTER TABLE \`users\` ${col.sql}`);
                console.log(`✅ [DB Migration] users.${col.name} 컬럼 추가 완료.`);
            }
        }
    } catch (err) {
        console.error("⚠️ [DB Migration] pet_journeys/posts 테이블 생성 실패:", err.message);
    }
})();

export default pool;
