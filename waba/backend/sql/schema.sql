-- ============================================================================
-- WABA (와바 - by WABAMI) Database Schema (MySQL 8.0+)
-- Database Name: waba
-- Charset: utf8mb4 / Collation: utf8mb4_unicode_ci
-- ============================================================================

DROP DATABASE IF EXISTS `waba`;
CREATE DATABASE IF NOT EXISTS `waba`
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE `waba`;

-- 외래키 체크 일시 해제 (테이블 초기화/재생성 시 순서 충돌 방지)
SET FOREIGN_KEY_CHECKS = 0;

-- ============================================================================
-- [1단계] 회원(users) 및 반려동물 생애주기·질병(pets 관련 5개 테이블)
-- ============================================================================

-- 1-1. 회원 테이블 (users)
-- ID 규칙: 랜덤숫자 3자 + YYMMDDHHmm + 이메일 앞 3자 (예: 4822610211430kim)
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `id` VARCHAR(30) NOT NULL COMMENT '랜덤숫자3자 + YYMMDDHHmm + 이메일앞3자 (AUTO_INCREMENT 미사용)',
  `email` VARCHAR(255) NOT NULL COMMENT '실제 로그인 시 입력할 이메일 아이디 (NULL 불허)',
  `password_hash` VARCHAR(255) DEFAULT NULL COMMENT '비밀번호 암호화 값 (소셜 로그인 전용 가입 시 NULL 가능)',
  `auth_provider` VARCHAR(20) NOT NULL DEFAULT 'LOCAL' COMMENT '가입 경로 (LOCAL, KAKAO, NAVER, APPLE)',
  `provider_id` VARCHAR(255) DEFAULT NULL COMMENT '소셜 로그인 고유 식별값',
  `nickname` VARCHAR(50) NOT NULL COMMENT '활동 닉네임',
  `profile_image_url` VARCHAR(500) DEFAULT NULL COMMENT '프로필 아바타 이미지 URL',
  `bio` VARCHAR(300) DEFAULT NULL COMMENT '한 줄 소개',
  `role` VARCHAR(20) NOT NULL DEFAULT 'USER' COMMENT '권한 (USER: 일반집사, VET: 수의사, EDITOR: 에디터, ADMIN: 관리자)',
  `mentor_badge` VARCHAR(30) NOT NULL DEFAULT 'NONE' COMMENT '멘토 등급 (NONE, STYLE_MENTOR, CARE_MENTOR, DUAL_MENTOR)',
  `vet_license_info` VARCHAR(255) DEFAULT NULL COMMENT 'role=VET일 때 수의사 면허/소속 정보',
  `is_multi_species` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '다종 합사 가구 여부 (0: 단일종, 1: 2종 이상 합사)',
  `reward_points` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '보유 와바미 리워드 포인트 잔액',
  `follower_count` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '팔로워 수',
  `following_count` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '팔로잉 수',
  `status` VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' COMMENT '계정 상태 (ACTIVE, SUSPENDED, WITHDRAWN)',
  `last_login_at` DATETIME DEFAULT NULL COMMENT '마지막 로그인 일시',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '가입 일시',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정 일시',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_users_email` (`email`),
  UNIQUE KEY `uk_users_nickname` (`nickname`),
  KEY `idx_users_provider` (`auth_provider`, `provider_id`),
  KEY `idx_users_role_mentor` (`role`, `mentor_badge`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='WABA 회원 마스터 테이블';


-- 1-2. 반려동물 기본 프로필 테이블 (pets)
-- ID 규칙: 랜덤숫자 4자 + YYMMDDHHmm (예: 83912610211430)
DROP TABLE IF EXISTS `pets`;
CREATE TABLE `pets` (
  `id` VARCHAR(20) NOT NULL COMMENT '랜덤숫자4자 + YYMMDDHHmm',
  `user_id` VARCHAR(30) NOT NULL COMMENT '보호자(회원) ID (users.id)',
  `name` VARCHAR(50) NOT NULL COMMENT '반려동물 이름',
  `species` ENUM('DOG', 'CAT', 'RABBIT', 'HAMSTER', 'GUINEAPIG', 'CHINCHILA', 'OTHER') NOT NULL COMMENT '반려동물 종 분류',
  `breed` VARCHAR(100) NOT NULL COMMENT '세부 품종 (예: 랙돌, 롭이어, 골든햄스터, 말티푸)',
  `birth_date` DATE DEFAULT NULL COMMENT '생년월일 (나이/개월수 계산 기준)',
  `gender` VARCHAR(10) NOT NULL DEFAULT 'UNKNOWN' COMMENT '성별 (MALE, FEMALE, UNKNOWN)',
  `is_neutered` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '중성화 여부 (0: 안함, 1: 완료)',
  `latest_weight_kg` DECIMAL(5, 3) DEFAULT NULL COMMENT '가장 최근 기록된 체중(kg) 캐시 (소동물 g단위 대응 소수점 3자리)',
  `latest_body_length_cm` DECIMAL(5, 1) DEFAULT NULL COMMENT '가장 최근 기록된 등길이/체장(cm) 캐시',
  `current_avatar_url` VARCHAR(500) DEFAULT NULL COMMENT '현재 대표 아바타 이미지 URL (pet_avatars 연동)',
  `is_primary` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '대표 반려동물 여부 (1: 대표)',
  `ai_private_data_consent` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '본인이 AI 질문 시 비공개 건강/질병 이력을 열람·참고하는 것에 대한 본인 동의 여부 (0: 미동의, 1: 동의)',
  `agreed_at` DATETIME DEFAULT NULL COMMENT 'AI 비공개 데이터 열람 본인 동의 일시',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '등록 일시',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정 일시',
  PRIMARY KEY (`id`),
  KEY `idx_pets_user_id` (`user_id`),
  KEY `idx_pets_species_breed` (`species`, `breed`),
  CONSTRAINT `fk_pets_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='반려동물 기본 프로필 테이블';


-- 1-3. 반려동물 시간대별 체중·체장 성장 기록 테이블 (pet_growth_logs)
DROP TABLE IF EXISTS `pet_growth_logs`;
CREATE TABLE `pet_growth_logs` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '성장 기록 고유 번호',
  `pet_id` VARCHAR(20) NOT NULL COMMENT '대상 반려동물 ID (pets.id)',
  `weight_kg` DECIMAL(5, 3) DEFAULT NULL COMMENT '측정 체중(kg) - 소동물 대응 소수점 3자리',
  `body_length_cm` DECIMAL(5, 1) DEFAULT NULL COMMENT '측정 등길이/체장(cm)',
  `age_months_at_log` INT UNSIGNED DEFAULT NULL COMMENT '측정 당시 개월 수',
  `memo` VARCHAR(255) DEFAULT NULL COMMENT '측정 메모 (예: 아침 공복 측정, 사료 변경 후)',
  `measured_at` DATETIME NOT NULL COMMENT '실제 측정한 날짜와 시간 (매일/시간별/월별 자유 기록)',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'DB 등록 일시',
  PRIMARY KEY (`id`),
  KEY `idx_pet_growth_pet_measured` (`pet_id`, `measured_at` DESC),
  CONSTRAINT `fk_pet_growth_pet` FOREIGN KEY (`pet_id`) REFERENCES `pets` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='반려동물 시간대별 체중 및 등길이 기록 테이블';


-- 1-4. 반려동물 나이별 아바타 프로필 앨범 테이블 (pet_avatars)
DROP TABLE IF EXISTS `pet_avatars`;
CREATE TABLE `pet_avatars` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '아바타 사진 고유 번호',
  `pet_id` VARCHAR(20) NOT NULL COMMENT '대상 반려동물 ID (pets.id)',
  `avatar_url` VARCHAR(500) NOT NULL COMMENT '아바타 이미지 URL',
  `age_years` INT UNSIGNED DEFAULT NULL COMMENT '사진 촬영 당시 나이(세)',
  `age_months` INT UNSIGNED DEFAULT NULL COMMENT '사진 촬영 당시 개월 수',
  `age_label` VARCHAR(50) DEFAULT NULL COMMENT '표시용 나이 라벨 (예: 생후 3개월, 2살 성묘)',
  `taken_date` DATE DEFAULT NULL COMMENT '사진 촬영일',
  `is_current` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '현재 대표 아바타 여부 (1이면 pets.current_avatar_url에 반영)',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '업로드 일시',
  PRIMARY KEY (`id`),
  KEY `idx_pet_avatars_pet_age` (`pet_id`, `age_years`, `age_months`),
  CONSTRAINT `fk_pet_avatars_pet` FOREIGN KEY (`pet_id`) REFERENCES `pets` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='반려동물 나이별 아바타 이미지 히스토리 테이블';


-- 1-5. 반려동물 질병 마스터 테이블 (pet_diseases)
DROP TABLE IF EXISTS `pet_diseases`;
CREATE TABLE `pet_diseases` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '질병 기록 고유 ID',
  `pet_id` VARCHAR(20) NOT NULL COMMENT '대상 반려동물 ID (pets.id)',
  `disease_name` VARCHAR(100) NOT NULL COMMENT '질병/증상명 (예: 비절병, 심장질환, 슬개골 탈구 2기)',
  `status` VARCHAR(30) NOT NULL DEFAULT 'TREATING' COMMENT '상태 (TREATING: 치료중, CURED_OBSERVING: 완치 판정(관찰중), CURED: 완치, CHRONIC_MANAGING: 만성 관리중)',
  `diagnosed_date` DATE DEFAULT NULL COMMENT '최초 진단일(발병일)',
  `cured_date` DATE DEFAULT NULL COMMENT '완치 또는 완치 판정일',
  `hospital_name` VARCHAR(100) DEFAULT NULL COMMENT '진료 병원명 (선택)',
  `summary_memo` VARCHAR(500) DEFAULT NULL COMMENT '원인 및 관리 요약 메모',
  `is_public` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '타인에게 공개 여부 (0: 비공개-타인 AI질문 시 절대 참조불가, 1: 공개-익명 사례로만 활용 가능)',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '등록 일시',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정 일시',
  PRIMARY KEY (`id`),
  KEY `idx_pet_diseases_pet` (`pet_id`),
  KEY `idx_pet_diseases_name_public` (`disease_name`, `is_public`, `status`),
  CONSTRAINT `fk_pet_diseases_pet` FOREIGN KEY (`pet_id`) REFERENCES `pets` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='반려동물 보유/과거 질병 마스터 테이블';


-- 1-6. 반려동물 질병 치료·치유 상세 타임라인 테이블 (pet_disease_histories)
DROP TABLE IF EXISTS `pet_disease_histories`;
CREATE TABLE `pet_disease_histories` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '치료 히스토리 고유 ID',
  `pet_disease_id` BIGINT UNSIGNED NOT NULL COMMENT '연결된 질병 ID (pet_diseases.id)',
  `recorded_at` DATETIME NOT NULL COMMENT '진료/처치/경과 기록 일시',
  `status_at_record` VARCHAR(30) NOT NULL COMMENT '기록 시점의 상태 (TREATING, CURED_OBSERVING, CURED, CHRONIC_MANAGING)',
  `treatment_note` TEXT NOT NULL COMMENT '치료 과정, 약 복용, 제품/환경 개선 상세 기록',
  `photo_url` VARCHAR(500) DEFAULT NULL COMMENT '경과 사진 또는 참고 이미지 URL',
  `cost_krw` INT UNSIGNED DEFAULT NULL COMMENT '진료/치료 비용(원) - 선택 입력',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '작성 일시',
  PRIMARY KEY (`id`),
  KEY `idx_disease_hist_disease_date` (`pet_disease_id`, `recorded_at` DESC),
  CONSTRAINT `fk_disease_hist_disease` FOREIGN KEY (`pet_disease_id`) REFERENCES `pet_diseases` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='반려동물 질병별 치료 및 경과 히스토리 테이블';


-- ============================================================================
-- [2단계] 커뮤니티 (boards, posts, post_images, comments 등)
-- ============================================================================

-- 2-1. 확장형 게시판 설정 마스터 테이블 (boards)
DROP TABLE IF EXISTS `boards`;
CREATE TABLE `boards` (
  `id` VARCHAR(30) NOT NULL COMMENT '게시판 코드 (예: LOOKBOOK, SNAP, CARE_LOUNGE, QNA)',
  `name` VARCHAR(50) NOT NULL COMMENT '화면 표시 게시판 이름',
  `description` VARCHAR(200) DEFAULT NULL COMMENT '게시판 안내 문구',
  `allow_product_pins` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '사진 위 상품 핀(+) 태그 허용 여부',
  `allow_vet_verify` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '수의사 공식 검증 마크 사용 여부',
  `min_write_role` VARCHAR(20) NOT NULL DEFAULT 'USER' COMMENT '글쓰기 최소 권한 (USER, VET, EDITOR, ADMIN)',
  `sort_order` INT UNSIGNED NOT NULL DEFAULT 1 COMMENT '메뉴 노출 순서',
  `is_active` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '게시판 활성화 여부',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성 일시',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='확장형 커뮤니티 게시판 마스터 테이블';


-- 2-2. 커뮤니티 게시글 테이블 (posts)
-- 불필요한 source_type, space_type, ai_metadata 제거 및 title NOT NULL 적용
DROP TABLE IF EXISTS `posts`;
CREATE TABLE `posts` (
  `id` VARCHAR(25) NOT NULL COMMENT '게시글 고유 코드 (예: P + 랜덤3자 + YYMMDDHHmm)',
  `board_id` VARCHAR(30) NOT NULL COMMENT '소속 게시판 ID (boards.id)',
  `user_id` VARCHAR(30) NOT NULL COMMENT '작성자 ID (users.id)',
  `curation_grade` VARCHAR(30) NOT NULL DEFAULT 'NORMAL_FEED' COMMENT '노출 등급 (NORMAL_FEED, LOOKBOOK_CANDIDATE, MAIN_LOOKBOOK)',
  `title` VARCHAR(150) NOT NULL COMMENT '게시글 제목 (필수 입력, NULL 불허)',
  `content` JSON NOT NULL COMMENT '블록 에디터 본문 JSON 배열 (예: [{"type":"text","content":"..."},{"type":"image","image_id":1}])',
  `related_disease_id` BIGINT UNSIGNED DEFAULT NULL COMMENT '연결된 반려동물 질병 기록 ID (pet_diseases.id - 케어 라운지 등)',
  `is_vet_verified` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '[✓ 수의사 공식 검증] 획득 여부 (0: 일반, 1: 검증됨)',
  `view_count` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '조회수',
  `like_count` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '좋아요 수',
  `bookmark_count` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '북마크(스크랩) 수 (멘토 승급 및 룩북 선정 기준)',
  `comment_count` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '댓글 수',
  `status` VARCHAR(20) NOT NULL DEFAULT 'PUBLISHED' COMMENT '게시 상태 (PUBLISHED, DRAFT, HIDDEN, DELETED)',
  `promoted_at` DATETIME DEFAULT NULL COMMENT '메인 룩북(MAIN_LOOKBOOK)으로 승격된 일시',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '작성 일시',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정 일시',
  PRIMARY KEY (`id`),
  KEY `idx_posts_board_created` (`board_id`, `status`, `created_at` DESC),
  KEY `idx_posts_curation` (`curation_grade`, `status`, `created_at` DESC),
  KEY `idx_posts_user` (`user_id`),
  KEY `idx_posts_disease` (`related_disease_id`),
  CONSTRAINT `fk_posts_board` FOREIGN KEY (`board_id`) REFERENCES `boards` (`id`),
  CONSTRAINT `fk_posts_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_posts_disease` FOREIGN KEY (`related_disease_id`) REFERENCES `pet_diseases` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='커뮤니티 게시글 마스터 테이블';


-- 2-3. 게시글 다중 이미지 테이블 (post_images)
-- posts와 1:N 관계, 이미지별 썸네일 여부(is_thumbnail) 및 AI 생성 여부(is_ai_generated) 구분
DROP TABLE IF EXISTS `post_images`;
CREATE TABLE `post_images` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '게시글 이미지 고유 번호 (product_pins에서 참조)',
  `post_id` VARCHAR(25) NOT NULL COMMENT '소속 게시글 ID (posts.id)',
  `image_url` VARCHAR(500) NOT NULL COMMENT '이미지 URL',
  `is_thumbnail` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '대표 썸네일 이미지 여부 (1: True, 0: False)',
  `is_ai_generated` TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'AI 생성 이미지 여부 (1: AI로 만든 이미지 표시, 0: 일반 실사)',
  `sort_order` TINYINT UNSIGNED NOT NULL DEFAULT 1 COMMENT '게시글 내 슬라이드 노출 순서',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '등록 일시',
  PRIMARY KEY (`id`),
  KEY `idx_post_images_post_sort` (`post_id`, `sort_order`),
  CONSTRAINT `fk_post_images_post` FOREIGN KEY (`post_id`) REFERENCES `posts` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='게시글 첨부 이미지 테이블 (1:N)';


-- 2-4. 게시글에 등장한 반려동물 매핑 테이블 (post_pets)
DROP TABLE IF EXISTS `post_pets`;
CREATE TABLE `post_pets` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '매핑 고유 번호',
  `post_id` VARCHAR(25) NOT NULL COMMENT '게시글 ID (posts.id)',
  `pet_id` VARCHAR(20) NOT NULL COMMENT '등장한 반려동물 ID (pets.id)',
  `weight_at_post_kg` DECIMAL(5, 3) DEFAULT NULL COMMENT '게시글 작성 시점의 반려동물 체중(kg) 스냅샷',
  `age_months_at_post` INT UNSIGNED DEFAULT NULL COMMENT '게시글 작성 시점의 개월 수 스냅샷',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_post_pets` (`post_id`, `pet_id`),
  KEY `idx_post_pets_pet` (`pet_id`),
  CONSTRAINT `fk_post_pets_post` FOREIGN KEY (`post_id`) REFERENCES `posts` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_post_pets_pet` FOREIGN KEY (`pet_id`) REFERENCES `pets` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='게시글 등장 반려동물 다중 매핑 테이블';


-- 2-5. 게시글 해시태그 테이블 (post_tags)
DROP TABLE IF EXISTS `post_tags`;
CREATE TABLE `post_tags` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '해시태그 고유 번호',
  `post_id` VARCHAR(25) NOT NULL COMMENT '게시글 ID (posts.id)',
  `tag_name` VARCHAR(50) NOT NULL COMMENT '해시태그명 (# 제외 텍스트)',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_post_tags` (`post_id`, `tag_name`),
  KEY `idx_post_tags_name` (`tag_name`),
  CONSTRAINT `fk_post_tags_post` FOREIGN KEY (`post_id`) REFERENCES `posts` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='게시글 해시태그 테이블';


-- 2-6. 수의사 공식 검증 테이블 (care_verifications)
DROP TABLE IF EXISTS `care_verifications`;
CREATE TABLE `care_verifications` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '검증 고유 번호',
  `post_id` VARCHAR(25) NOT NULL COMMENT '검증 대상 게시글 ID (posts.id)',
  `vet_user_id` VARCHAR(30) NOT NULL COMMENT '검증한 수의사 회원 ID (users.id)',
  `vet_comment` VARCHAR(500) DEFAULT NULL COMMENT '수의사 공식 자문 한 줄 코멘트',
  `verified_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '검증 일시',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_care_verifications_post` (`post_id`),
  CONSTRAINT `fk_care_verify_post` FOREIGN KEY (`post_id`) REFERENCES `posts` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_care_verify_vet` FOREIGN KEY (`vet_user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='케어 라운지 수의사 공식 검증 테이블';


-- 2-7. 댓글 및 대댓글 테이블 (comments)
-- ID 규칙: C + 랜덤숫자 3자 + YYMMDD (예: C482261021)
DROP TABLE IF EXISTS `comments`;
CREATE TABLE `comments` (
  `id` VARCHAR(20) NOT NULL COMMENT 'C + 랜덤숫자3자 + YYMMDD (예: C482261021)',
  `post_id` VARCHAR(25) NOT NULL COMMENT '소속 게시글 ID (posts.id)',
  `user_id` VARCHAR(30) NOT NULL COMMENT '댓글 작성자 ID (users.id)',
  `parent_id` VARCHAR(20) DEFAULT NULL COMMENT '대댓글일 경우 부모 댓글 ID (comments.id)',
  `content` TEXT NOT NULL COMMENT '댓글 내용',
  `is_accepted` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '질문글(Q&A) 답변 채택 여부 (1: 채택됨)',
  `like_count` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '댓글 좋아요 수',
  `status` VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' COMMENT '상태 (ACTIVE, DELETED, BLINDED)',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '작성 일시',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정 일시',
  PRIMARY KEY (`id`),
  KEY `idx_comments_post_created` (`post_id`, `created_at` ASC),
  KEY `idx_comments_parent` (`parent_id`),
  CONSTRAINT `fk_comments_post` FOREIGN KEY (`post_id`) REFERENCES `posts` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_comments_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_comments_parent` FOREIGN KEY (`parent_id`) REFERENCES `comments` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='게시글 댓글 및 대댓글 테이블';


-- 2-8. 게시글 좋아요 및 북마크 기록 테이블 (post_interactions)
DROP TABLE IF EXISTS `post_interactions`;
CREATE TABLE `post_interactions` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '고유 번호',
  `post_id` VARCHAR(25) NOT NULL COMMENT '게시글 ID (posts.id)',
  `user_id` VARCHAR(30) NOT NULL COMMENT '누른 회원 ID (users.id)',
  `interaction_type` VARCHAR(20) NOT NULL COMMENT '유형 (LIKE: 좋아요, BOOKMARK: 스크랩/북마크)',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '클릭 일시',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_post_interactions` (`post_id`, `user_id`, `interaction_type`),
  KEY `idx_post_interactions_user` (`user_id`, `interaction_type`),
  CONSTRAINT `fk_post_inter_post` FOREIGN KEY (`post_id`) REFERENCES `posts` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_post_inter_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='게시글 좋아요 및 북마크 테이블';


-- ============================================================================
-- [3단계] 와바미 자사몰 상품(products) 및 이미지 상품 핀(product_pins)
-- ============================================================================

-- 3-1. 상품 카테고리 마스터 테이블 (product_categories)
-- ID 규칙: 랜덤숫자 3개 + YYMMDDHHmm (예: 7422610211549)
DROP TABLE IF EXISTS `product_categories`;
CREATE TABLE `product_categories` (
  `id` VARCHAR(20) NOT NULL COMMENT '랜덤숫자3자 + YYMMDDHHmm (예: 7422610211549)',
  `parent_id` VARCHAR(20) DEFAULT NULL COMMENT '상위 카테고리 ID (대분류면 NULL)',
  `name` VARCHAR(50) NOT NULL COMMENT '카테고리명 (예: 식기/급수기, 매트/방석, 영양/케어)',
  `sort_order` INT UNSIGNED NOT NULL DEFAULT 1 COMMENT '노출 순서',
  `is_active` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '사용 여부',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성 일시',
  PRIMARY KEY (`id`),
  KEY `idx_prod_cat_parent` (`parent_id`),
  CONSTRAINT `fk_prod_cat_parent` FOREIGN KEY (`parent_id`) REFERENCES `product_categories` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='자사몰 상품 카테고리 테이블';


-- 3-2. 와바미 자사몰 전용 상품 테이블 (products)
-- 자사몰 판매 제품만 등록하며, 상세페이지용 커스텀 .tsx 파일명(custom_detail_tsx) 및 향후 로컬 AI용 텍스트 컬럼 포함
DROP TABLE IF EXISTS `products`;
CREATE TABLE `products` (
  `id` VARCHAR(25) NOT NULL COMMENT '상품 고유 코드 (예: PRD + 랜덤3자 + YYMMDDHHmm)',
  `category_id` VARCHAR(20) NOT NULL COMMENT '카테고리 ID (product_categories.id)',
  `name` VARCHAR(200) NOT NULL COMMENT '와바미 상품명',
  `summary` VARCHAR(300) DEFAULT NULL COMMENT '상품 한 줄 요약 설명',
  `thumbnail_url` VARCHAR(500) NOT NULL COMMENT '대표 썸네일 이미지 URL',
  `original_price` INT UNSIGNED DEFAULT NULL COMMENT '할인 전 정가(원)',
  `sale_price` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '실제 판매가(원)',
  `stock_quantity` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '기본 재고 수량',
  `reward_rate` DECIMAL(4, 2) NOT NULL DEFAULT 5.00 COMMENT '커뮤니티 핀 태그 구매 전환 시 리워드 적립률(%)',
  `custom_detail_tsx` VARCHAR(150) DEFAULT NULL COMMENT '특정 폴더 내 커스텀 인터랙티브 상세페이지 .tsx 파일명 (애니메이션/스크립트/CSS 효과 표현용)',
  `ocr_detail_text` LONGTEXT DEFAULT NULL COMMENT '[향후 AI용] 상세페이지 이미지 내 글씨(OCR) 및 .tsx 상세 정보 통합 텍스트',
  `pin_review_summary` TEXT DEFAULT NULL COMMENT '[향후 AI용] 이 상품을 핀으로 등록한 유저들의 의견 및 반려동물 스펙 사전 요약본',
  `target_species` VARCHAR(200) DEFAULT NULL COMMENT '추천 반려동물 종 (예: DOG,CAT,RABBIT)',
  `pin_count` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '커뮤니티 사진에 핀(+)으로 태그된 누적 횟수',
  `status` VARCHAR(20) NOT NULL DEFAULT 'ON_SALE' COMMENT '판매 상태 (ON_SALE, SOLD_OUT, HIDDEN)',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '등록 일시',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정 일시',
  PRIMARY KEY (`id`),
  KEY `idx_products_category_status` (`category_id`, `status`),
  CONSTRAINT `fk_products_category` FOREIGN KEY (`category_id`) REFERENCES `product_categories` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='와바미 자사몰 전용 상품 테이블';


-- 3-3. 상품 이미지 테이블 (product_images)
-- 상단 갤러리 이미지(GALLERY)와 하단 상세페이지 통이미지(DETAIL) 구별
DROP TABLE IF EXISTS `product_images`;
CREATE TABLE `product_images` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '상품 이미지 고유 번호',
  `product_id` VARCHAR(25) NOT NULL COMMENT '상품 ID (products.id)',
  `image_url` VARCHAR(500) NOT NULL COMMENT '이미지 URL',
  `image_type` VARCHAR(20) NOT NULL DEFAULT 'GALLERY' COMMENT '이미지 구분 (GALLERY: 상단 썸네일 슬라이드, DETAIL: 하단 상세페이지 이미지)',
  `sort_order` INT UNSIGNED NOT NULL DEFAULT 1 COMMENT '노출 순서',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '등록 일시',
  PRIMARY KEY (`id`),
  KEY `idx_prod_images_prod_type` (`product_id`, `image_type`, `sort_order`),
  CONSTRAINT `fk_prod_images_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='상품 상단 갤러리 및 하단 상세 이미지 테이블';


-- 3-4. 상품 옵션 테이블 (product_options)
DROP TABLE IF EXISTS `product_options`;
CREATE TABLE `product_options` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '옵션 고유 번호',
  `product_id` VARCHAR(25) NOT NULL COMMENT '상품 ID (products.id)',
  `option_name` VARCHAR(100) NOT NULL COMMENT '옵션명 (예: 아이보리 / M 사이즈)',
  `additional_price` INT NOT NULL DEFAULT 0 COMMENT '옵션 추가 금액(원)',
  `stock_quantity` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '옵션 재고 수량',
  `is_available` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '옵션 선택 가능 여부',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성 일시',
  PRIMARY KEY (`id`),
  KEY `idx_prod_options_product` (`product_id`),
  CONSTRAINT `fk_prod_options_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='상품 옵션 테이블';


-- 3-5. 게시글 이미지 위 통합 핀(+) 테이블 (product_pins)
-- 3가지 핀 종류 지원: 1) 내 제품 검색(INTERNAL_PRODUCT), 2) 제품 URL 직접 입력(EXTERNAL_PRODUCT), 3) 반려동물 태그(PET)
DROP TABLE IF EXISTS `product_pins`;
CREATE TABLE `product_pins` (
  `id` VARCHAR(25) NOT NULL COMMENT '핀 고유 코드 (예: PIN + 랜덤3자 + YYMMDDHHmm)',
  `post_image_id` BIGINT UNSIGNED NOT NULL COMMENT '핀이 찍힌 게시글 이미지 ID (post_images.id)',
  `pin_type` VARCHAR(30) NOT NULL DEFAULT 'INTERNAL_PRODUCT' COMMENT '핀 구분 (INTERNAL_PRODUCT: 자사몰 상품 검색, EXTERNAL_PRODUCT: 외부/자사 URL 입력, PET: 내 반려동물 태그)',
  `pos_x` DECIMAL(5, 2) NOT NULL COMMENT '이미지 가로 상대 좌표 (0.00 ~ 100.00%)',
  `pos_y` DECIMAL(5, 2) NOT NULL COMMENT '이미지 세로 상대 좌표 (0.00 ~ 100.00%)',
  `product_id` VARCHAR(25) DEFAULT NULL COMMENT '1) 와바미 자사몰 상품 연결 시 ID (products.id)',
  `external_url` VARCHAR(1000) DEFAULT NULL COMMENT '2) 유저가 직접 입력한 상품 링크 URL',
  `external_product_name` VARCHAR(200) DEFAULT NULL COMMENT '외부몰 상품명',
  `external_brand_name` VARCHAR(100) DEFAULT NULL COMMENT '외부몰 브랜드/쇼핑몰명',
  `external_image_url` VARCHAR(500) DEFAULT NULL COMMENT '외부몰 상품 썸네일 이미지 URL',
  `external_price` INT UNSIGNED DEFAULT NULL COMMENT '외부몰 상품 참고 가격(원)',
  `pet_id` VARCHAR(20) DEFAULT NULL COMMENT '3) 반려동물 핀일 때 연결된 반려동물 ID (pets.id)',
  `pin_option_memo` VARCHAR(200) DEFAULT NULL COMMENT '작성자가 남긴 사용 옵션/사이즈/한줄 의견 메모',
  `click_count` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '핀 클릭 횟수',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '핀 등록 일시',
  PRIMARY KEY (`id`),
  KEY `idx_product_pins_image` (`post_image_id`),
  KEY `idx_product_pins_product` (`product_id`),
  KEY `idx_product_pins_pet` (`pet_id`),
  CONSTRAINT `fk_pins_post_image` FOREIGN KEY (`post_image_id`) REFERENCES `post_images` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_pins_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_pins_pet` FOREIGN KEY (`pet_id`) REFERENCES `pets` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='게시글 이미지 위 통합 핀(상품/URL/펫) 태그 테이블';


-- 3-6. 핀별 사용 반려동물 매핑 테이블 (pin_pet_mappings)
DROP TABLE IF EXISTS `pin_pet_mappings`;
CREATE TABLE `pin_pet_mappings` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '고유 번호',
  `pin_id` VARCHAR(25) NOT NULL COMMENT '상품 핀 ID (product_pins.id)',
  `pet_id` VARCHAR(20) NOT NULL COMMENT '해당 핀 상품을 사용하는 반려동물 ID (pets.id)',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_pin_pet` (`pin_id`, `pet_id`),
  CONSTRAINT `fk_pin_pet_pin` FOREIGN KEY (`pin_id`) REFERENCES `product_pins` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_pin_pet_pet` FOREIGN KEY (`pet_id`) REFERENCES `pets` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='상품 핀과 사용 반려동물 다중 매핑 테이블';


-- ============================================================================
-- [4단계] 장바구니(cart_items), 주문(orders), 취소·반품·환불(order_claims)
-- ============================================================================

-- 4-1. 장바구니 테이블 (cart_items)
DROP TABLE IF EXISTS `cart_items`;
CREATE TABLE `cart_items` (
  `id` VARCHAR(25) NOT NULL COMMENT '장바구니 항목 코드 (예: CRT + 랜덤3자 + YYMMDDHHmm)',
  `user_id` VARCHAR(30) NOT NULL COMMENT '회원 ID (users.id)',
  `product_id` VARCHAR(25) NOT NULL COMMENT '담은 와바미 상품 ID (products.id)',
  `product_option_id` BIGINT UNSIGNED DEFAULT NULL COMMENT '선택한 상품 옵션 ID (product_options.id)',
  `quantity` INT UNSIGNED NOT NULL DEFAULT 1 COMMENT '담은 수량',
  `source_pin_id` VARCHAR(25) DEFAULT NULL COMMENT '어느 게시글 핀(+)을 눌러 담았는지 추적 (product_pins.id)',
  `is_checked` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '장바구니 결제 선택 여부',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '담은 일시',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정 일시',
  PRIMARY KEY (`id`),
  KEY `idx_cart_user` (`user_id`),
  CONSTRAINT `fk_cart_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_cart_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_cart_option` FOREIGN KEY (`product_option_id`) REFERENCES `product_options` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_cart_pin` FOREIGN KEY (`source_pin_id`) REFERENCES `product_pins` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='장바구니 테이블';


-- 4-2. 주문 마스터 테이블 (orders)
DROP TABLE IF EXISTS `orders`;
CREATE TABLE `orders` (
  `id` VARCHAR(25) NOT NULL COMMENT '주문번호 (예: ORD + YYMMDDHHmm + 랜덤4자)',
  `user_id` VARCHAR(30) NOT NULL COMMENT '주문자 회원 ID (users.id)',
  `order_status` VARCHAR(30) NOT NULL DEFAULT 'PAYMENT_PENDING' COMMENT '주문 상태 (PAYMENT_PENDING, PAID, PREPARING, SHIPPING, DELIVERED, PURCHASE_CONFIRMED, CANCELED)',
  `total_product_price` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '순수 상품 총 금액(원)',
  `shipping_fee` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '배송비(원)',
  `used_reward_points` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '사용한 리워드 포인트(원)',
  `final_payment_price` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '실제 최종 결제 금액(원)',
  `payment_method` VARCHAR(30) DEFAULT NULL COMMENT '결제 수단 (CARD, KAKAOPAY, NAVERPAY, TOSSPAY, VBANK)',
  `pg_transaction_id` VARCHAR(100) DEFAULT NULL COMMENT 'PG사 결제 승인 고유 키',
  `recipient_name` VARCHAR(50) NOT NULL COMMENT '수령인 이름',
  `recipient_phone` VARCHAR(30) NOT NULL COMMENT '수령인 연락처',
  `zipcode` VARCHAR(10) NOT NULL COMMENT '우편번호',
  `address_line1` VARCHAR(255) NOT NULL COMMENT '기본 주소',
  `address_line2` VARCHAR(255) DEFAULT NULL COMMENT '상세 주소',
  `delivery_memo` VARCHAR(200) DEFAULT NULL COMMENT '배송 요청사항',
  `paid_at` DATETIME DEFAULT NULL COMMENT '결제 완료 일시',
  `canceled_at` DATETIME DEFAULT NULL COMMENT '전체 취소 일시',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '주문 생성 일시',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정 일시',
  PRIMARY KEY (`id`),
  KEY `idx_orders_user_created` (`user_id`, `created_at` DESC),
  KEY `idx_orders_status` (`order_status`),
  CONSTRAINT `fk_orders_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='주문 마스터 테이블';


-- 4-3. 주문 상세 품목 테이블 (order_items)
DROP TABLE IF EXISTS `order_items`;
CREATE TABLE `order_items` (
  `id` VARCHAR(25) NOT NULL COMMENT '주문 상세 품목 코드 (예: OI + 랜덤3자 + YYMMDDHHmm)',
  `order_id` VARCHAR(25) NOT NULL COMMENT '주문번호 (orders.id)',
  `product_id` VARCHAR(25) NOT NULL COMMENT '상품 ID (products.id)',
  `product_option_id` BIGINT UNSIGNED DEFAULT NULL COMMENT '옵션 ID (product_options.id)',
  `product_name_snapshot` VARCHAR(200) NOT NULL COMMENT '주문 당시 상품명 스냅샷',
  `option_name_snapshot` VARCHAR(100) DEFAULT NULL COMMENT '주문 당시 옵션명 스냅샷',
  `unit_price_snapshot` INT UNSIGNED NOT NULL COMMENT '주문 당시 개당 판매 단가(원)',
  `quantity` INT UNSIGNED NOT NULL DEFAULT 1 COMMENT '주문 수량',
  `subtotal_price` INT UNSIGNED NOT NULL COMMENT '품목 합계 금액 (unit_price_snapshot * quantity)',
  `item_status` VARCHAR(30) NOT NULL DEFAULT 'PAID' COMMENT '개별 품목 상태 (PAID, PREPARING, SHIPPING, DELIVERED, PURCHASE_CONFIRMED, CLAIM_IN_PROGRESS, CANCELED, RETURNED, EXCHANGED)',
  `courier_company` VARCHAR(50) DEFAULT NULL COMMENT '배송 택배사명',
  `tracking_number` VARCHAR(50) DEFAULT NULL COMMENT '운송장 번호',
  `source_pin_id` VARCHAR(25) DEFAULT NULL COMMENT '구매를 발생시킨 게시글 핀 ID (product_pins.id)',
  `reward_amount` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '구매 확정 시 핀 작성자에게 지급될 리워드 포인트 예정액',
  `is_reward_paid` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '핀 작성자 리워드 지급 완료 여부 (0: 미지급, 1: 지급완료)',
  `confirmed_at` DATETIME DEFAULT NULL COMMENT '구매 확정 일시',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성 일시',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정 일시',
  PRIMARY KEY (`id`),
  KEY `idx_order_items_order` (`order_id`),
  KEY `idx_order_items_pin` (`source_pin_id`),
  CONSTRAINT `fk_order_items_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_order_items_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`),
  CONSTRAINT `fk_order_items_option` FOREIGN KEY (`product_option_id`) REFERENCES `product_options` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_order_items_pin` FOREIGN KEY (`source_pin_id`) REFERENCES `product_pins` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='주문 상세 품목 테이블';


-- 4-4. 취소 · 반품 · 교환 · 환불 클레임 테이블 (order_claims)
DROP TABLE IF EXISTS `order_claims`;
CREATE TABLE `order_claims` (
  `id` VARCHAR(25) NOT NULL COMMENT '클레임 고유 코드 (예: CLM + 랜덤3자 + YYMMDDHHmm)',
  `order_id` VARCHAR(25) NOT NULL COMMENT '원 주문번호 (orders.id)',
  `order_item_id` VARCHAR(25) NOT NULL COMMENT '대상 주문 상세 품목 ID (order_items.id)',
  `user_id` VARCHAR(30) NOT NULL COMMENT '신청 회원 ID (users.id)',
  `claim_type` VARCHAR(20) NOT NULL COMMENT '클레임 구분 (CANCEL: 결제취소, RETURN: 반품/환불, EXCHANGE: 교환)',
  `claim_status` VARCHAR(30) NOT NULL DEFAULT 'REQUESTED' COMMENT '진행 상태 (REQUESTED: 접수, COLLECTING: 수거중, COLLECTED: 입고완료, COMPLETED: 환불/교환완료, REJECTED: 반려)',
  `reason_category` VARCHAR(50) NOT NULL COMMENT '사유 분류 (CHANGE_OF_MIND: 단순변심, SIZE_MISMATCH: 사이즈불일치, DEFECTIVE: 불량/파손, WRONG_DELIVERY: 오배송)',
  `reason_detail` TEXT DEFAULT NULL COMMENT '고객 작성 상세 사유',
  `claim_quantity` INT UNSIGNED NOT NULL DEFAULT 1 COMMENT '클레임 신청 수량',
  `refund_product_amount` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '환불 대상 상품 금액(원)',
  `deducted_shipping_fee` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '차감할 반품 배송비(원)',
  `refunded_reward_points` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '환불(복구)될 사용 리워드 포인트',
  `final_refund_amount` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '실제 고객에게 환불될 최종 결제 금액(원)',
  `pg_cancel_tid` VARCHAR(100) DEFAULT NULL COMMENT 'PG사 취소/환불 승인 거래번호',
  `return_courier` VARCHAR(50) DEFAULT NULL COMMENT '반품/교환 수거 택배사명',
  `return_tracking_no` VARCHAR(50) DEFAULT NULL COMMENT '반품/교환 수거 송장번호',
  `admin_memo` VARCHAR(500) DEFAULT NULL COMMENT '관리자 처리 메모 또는 반려 사유 안내',
  `requested_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '클레임 신청 일시',
  `completed_at` DATETIME DEFAULT NULL COMMENT '클레임 처리 완료 일시',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정 일시',
  PRIMARY KEY (`id`),
  KEY `idx_order_claims_order` (`order_id`),
  KEY `idx_order_claims_item` (`order_item_id`),
  KEY `idx_order_claims_user_status` (`user_id`, `claim_status`),
  CONSTRAINT `fk_claims_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`),
  CONSTRAINT `fk_claims_order_item` FOREIGN KEY (`order_item_id`) REFERENCES `order_items` (`id`),
  CONSTRAINT `fk_claims_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='주문 취소·반품·교환·환불 관리 테이블';


-- 4-5. 반품·교환 불량/파손 증빙 이미지 테이블 (order_claim_images)
DROP TABLE IF EXISTS `order_claim_images`;
CREATE TABLE `order_claim_images` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '증빙 이미지 고유 번호',
  `claim_id` VARCHAR(25) NOT NULL COMMENT '클레임 ID (order_claims.id)',
  `image_url` VARCHAR(500) NOT NULL COMMENT '증빙 사진 URL',
  `sort_order` TINYINT UNSIGNED NOT NULL DEFAULT 1 COMMENT '사진 순서',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '등록 일시',
  PRIMARY KEY (`id`),
  KEY `idx_claim_images_claim` (`claim_id`),
  CONSTRAINT `fk_claim_images_claim` FOREIGN KEY (`claim_id`) REFERENCES `order_claims` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='취소·반품·교환 증빙 사진 테이블';


SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================================
-- [초기 기본 게시판 데이터 시드 (boards)]
-- ============================================================================
INSERT INTO `boards` (`id`, `name`, `description`, `allow_product_pins`, `allow_vet_verify`, `min_write_role`, `sort_order`, `is_active`) VALUES
  ('LOOKBOOK', '공식 룩북', '와바미 공식 화보 및 선정된 베스트 펫-리빙 룩북', 1, 0, 'EDITOR', 1, 1),
  ('SNAP', '일상 스냅', '반려동물과 함께하는 일상과 추천 아이템 핀 공유', 1, 0, 'USER', 2, 1),
  ('CARE_LOUNGE', '케어 라운지', '질병 치유 히스토리와 육아 노하우 아티클', 1, 1, 'USER', 3, 1),
  ('QNA', '질문/고민', '초보 집사들의 궁금증과 선배 멘토들의 답변', 1, 1, 'USER', 4, 1)
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);
