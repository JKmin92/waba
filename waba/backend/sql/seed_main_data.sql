-- ============================================================================
-- WABA (와바 - by WABAMI) 메인페이지 초기 데이터 복원 Seed SQL
-- 현재 확정된 waba 데이터베이스 스키마(schema.sql) 및 커스텀 ID 규칙 100% 반영
-- ============================================================================

USE `waba`;

SET FOREIGN_KEY_CHECKS = 0;

-- (선택) 중복 방지를 위해 기존 샘플 데이터 정리 후 재삽입
DELETE FROM `pin_pet_mappings`;
DELETE FROM `product_pins`;
DELETE FROM `product_options`;
DELETE FROM `product_images`;
DELETE FROM `products`;
DELETE FROM `product_categories`;
DELETE FROM `comments`;
DELETE FROM `care_verifications`;
DELETE FROM `post_tags`;
DELETE FROM `post_pets`;
DELETE FROM `post_images`;
DELETE FROM `posts`;
DELETE FROM `pet_disease_histories`;
DELETE FROM `pet_diseases`;
DELETE FROM `pet_avatars`;
DELETE FROM `pet_growth_logs`;
DELETE FROM `pets`;
DELETE FROM `users`;

-- ============================================================================
-- 1. 게시판 마스터 (boards)
-- ============================================================================
INSERT INTO `boards` (`id`, `name`, `description`, `allow_product_pins`, `allow_vet_verify`, `min_write_role`, `sort_order`, `is_active`) VALUES
  ('LOOKBOOK', '공식 룩북', '와바미 공식 화보 및 선정된 베스트 펫-리빙 룩북', 1, 0, 'USER', 1, 1),
  ('SNAP', '일상 스냅', '반려동물과 함께하는 일상과 추천 아이템 핀 공유', 1, 0, 'USER', 2, 1),
  ('CARE_LOUNGE', '케어 라운지', '질병 치유 히스토리와 육아 노하우 아티클', 1, 1, 'USER', 3, 1),
  ('QNA', '질문/고민', '초보 집사들의 궁금증과 선배 멘토들의 답변', 1, 1, 'USER', 4, 1)
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);


-- ============================================================================
-- 2. 회원 데이터 (users)
-- ID 규칙: 랜덤숫자 3자 + YYMMDDHHmm + 이메일 앞 3자
-- ============================================================================
INSERT INTO `users` (
  `id`, `email`, `password_hash`, `auth_provider`, `nickname`, `profile_image_url`, `bio`,
  `role`, `mentor_badge`, `vet_license_info`, `is_multi_species`, `reward_points`, `follower_count`, `following_count`, `status`
) VALUES
  -- 1) 메인 히어로 룩북 작성자 (고양이 + 토끼 다종 합사 스타일 멘토)
  ('4822610221030ate', 'atelier@wabami.com', 'hashed_pw_1', 'LOCAL', 'atelier_cat_bun',
   'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
   '랙돌 구름이(4.8kg)와 롭이어 모찌(2.1kg)가 함께 사는 무소음 거실 기록',
   'USER', 'STYLE_MENTOR', NULL, 1, 15400, 1280, 210, 'ACTIVE'),

  -- 2) 일상 스냅 작성자 1 (고양이 집사)
  ('7192610221031coz', 'cozy@naver.com', 'hashed_pw_2', 'NAVER', 'cozy_ragdoll_home',
   'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=300&q=80',
   '햇살 좋아하는 랙돌 두부와 원목 캣테리어',
   'USER', 'STYLE_MENTOR', NULL, 0, 8200, 640, 150, 'ACTIVE'),

  -- 3) 일상 스냅 작성자 2 (강아지 + 고양이 합사 집사)
  ('3052610221032arc', 'arch@kakao.com', 'hashed_pw_3', 'KAKAO', 'arch_pet_studio',
   'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80',
   '말티푸 보리와 코숏 루이의 1층 식사 공간',
   'USER', 'NONE', NULL, 1, 3500, 310, 95, 'ACTIVE'),

  -- 4) 케어 라운지 작성자 (토끼 비절병 완치 판정 케어 멘토)
  ('9122610221033bun', 'bunny@gmail.com', 'hashed_pw_4', 'LOCAL', 'bunny_care_lab',
   'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=300&q=80',
   '롭이어 토끼 6년차 집사 · 비절병 케어 기록장',
   'USER', 'CARE_MENTOR', NULL, 0, 24000, 2150, 80, 'ACTIVE'),

  -- 5) 와바미 공식 자문 수의사 (케어 라운지 공식 검증자)
  ('1042610221034vet', 'vet_kim@wabami.com', 'hashed_pw_5', 'LOCAL', 'vet_kim_wabami',
   'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=300&q=80',
   '와바미 특수동물·반려동물 자문 수의사',
   'VET', 'CARE_MENTOR', '와바미 공식 자문 수의사 (특수동물/소동물 클리닉)', 0, 0, 4500, 12, 'ACTIVE');


-- ============================================================================
-- 3. 반려동물 데이터 (pets, pet_growth_logs, pet_avatars, pet_diseases)
-- ID 규칙: 랜덤숫자 4자 + YYMMDDHHmm
-- ============================================================================
INSERT INTO `pets` (
  `id`, `user_id`, `name`, `species`, `breed`, `birth_date`, `gender`, `is_neutered`,
  `latest_weight_kg`, `latest_body_length_cm`, `current_avatar_url`, `is_primary`, `ai_private_data_consent`, `agreed_at`
) VALUES
  -- atelier_cat_bun님의 반려동물 2마리 (고양이 구름 + 토끼 모찌)
  ('83912610221035', '4822610221030ate', '구름', 'CAT', '랙돌', '2023-04-15', 'FEMALE', 1,
   4.800, 42.0, 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=400&q=80', 1, 1, NOW()),
  ('55202610221035', '4822610221030ate', '모찌', 'RABBIT', '홀랜드 롭이어', '2024-02-10', 'MALE', 1,
   2.100, 26.5, 'https://images.unsplash.com/photo-1585110396000-c9ffd4e4b308?auto=format&fit=crop&w=400&q=80', 0, 1, NOW()),

  -- cozy_ragdoll_home님의 반려동물 (고양이 두부)
  ('19402610221036', '7192610221031coz', '두부', 'CAT', '랙돌', '2022-11-20', 'MALE', 1,
   5.100, 44.5, 'https://images.unsplash.com/photo-1573865526739-10659fec78a5?auto=format&fit=crop&w=400&q=80', 1, 0, NULL),

  -- arch_pet_studio님의 반려동물 2마리 (강아지 보리 + 고양이 루이)
  ('66312610221037', '3052610221032arc', '보리', 'DOG', '말티푸', '2023-08-05', 'FEMALE', 1,
   3.400, 31.0, 'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?auto=format&fit=crop&w=400&q=80', 1, 0, NULL),
  ('77422610221037', '3052610221032arc', '루이', 'CAT', '코리안숏헤어', '2023-01-12', 'MALE', 1,
   4.200, 39.0, 'https://images.unsplash.com/photo-1533738363-b7f9aef128ce?auto=format&fit=crop&w=400&q=80', 0, 0, NULL),

  -- bunny_care_lab님의 반려동물 (토끼 토리 - 비절병 완치 판정)
  ('90122610221038', '9122610221033bun', '토리', 'RABBIT', '미니 렉스', '2021-09-01', 'FEMALE', 1,
   1.950, 25.0, 'https://images.unsplash.com/photo-1585110396000-c9ffd4e4b308?auto=format&fit=crop&w=400&q=80', 1, 1, NOW());

-- 반려동물 시간대별 성장 기록 (pet_growth_logs)
INSERT INTO `pet_growth_logs` (`pet_id`, `weight_kg`, `body_length_cm`, `age_months_at_log`, `memo`, `measured_at`) VALUES
  ('83912610221035', 4.500, 41.0, 24, '봄 정기검진 측정', '2025-04-15 10:30:00'),
  ('83912610221035', 4.800, 42.0, 30, '아침 공복 측정 (건강 양호)', '2026-10-15 08:20:00'),
  ('55202610221035', 1.850, 24.0, 12, '1살 생일 체중 측정', '2025-02-10 19:00:00'),
  ('55202610221035', 2.100, 26.5, 20, '건초 급여량 늘린 후 정상 체중 도달', '2026-10-18 20:15:00'),
  ('90122610221038', 1.950, 25.0, 48, '비절병 완치 판정 후 체중 유지중', '2026-10-10 14:00:00');

-- 반려동물 나이별 아바타 히스토리 (pet_avatars)
INSERT INTO `pet_avatars` (`pet_id`, `avatar_url`, `age_years`, `age_months`, `age_label`, `taken_date`, `is_current`) VALUES
  ('83912610221035', 'https://images.unsplash.com/photo-1592194996308-7b43878e84a6?auto=format&fit=crop&w=400&q=80', 0, 3, '생후 3개월 아기 시절', '2023-07-15', 0),
  ('83912610221035', 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=400&q=80', 3, 30, '3살 성묘', '2026-10-01', 1);

-- 반려동물 질병 및 치유 히스토리 (pet_diseases & pet_disease_histories)
INSERT INTO `pet_diseases` (
  `id`, `pet_id`, `disease_name`, `status`, `diagnosed_date`, `cured_date`, `hospital_name`, `summary_memo`, `is_public`
) VALUES
  (1, '90122610221038', '비절병(족저피부염) 초기', 'CURED_OBSERVING', '2026-04-10', '2026-07-20',
   '에코 특수동물병원', '거실 미끄러운 장판 때문에 발뒤꿈치 각질·발적 발생 -> 와바미 복원력 메모리폼 매트 + 천연 건초 베딩 교체 후 3개월 만에 털 복구 및 완치 판정(관찰중)', 1);

INSERT INTO `pet_disease_histories` (`pet_disease_id`, `recorded_at`, `status_at_record`, `treatment_note`, `cost_krw`) VALUES
  (1, '2026-04-10 15:00:00', 'TREATING', '뒷발 꿈치 털 빠짐과 붉은 발적 발견. 붕대 감기는 오히려 압박이 될 수 있어 바닥재 전면 교체 처방 받음.', 45000),
  (1, '2026-05-25 16:30:00', 'TREATING', '와바미 22mm 논슬립 셀 매트 2겹 시공 후 붉은 기 가라앉고 새 털이 자라기 시작함.', 25000),
  (1, '2026-07-20 11:00:00', 'CURED_OBSERVING', '담당 수의사 선생님께 완치 판정 받음! 재발 방지를 위해 매트 환경 유지하며 관찰중.', 15000);


-- ============================================================================
-- 4. 상품 카테고리 및 와바미 자사몰 상품 (product_categories, products)
-- ID 규칙: 카테고리(랜덤3자 + YYMMDDHHmm), 상품(PRD + 랜덤3자 + YYMMDDHHmm)
-- ============================================================================
INSERT INTO `product_categories` (`id`, `parent_id`, `name`, `sort_order`, `is_active`) VALUES
  ('7412610221100', NULL, '식기/급수기', 1, 1),
  ('8522610221100', NULL, '매트/방석/리빙', 2, 1),
  ('9632610221100', NULL, '위생/케어/베딩', 3, 1);

INSERT INTO `products` (
  `id`, `category_id`, `name`, `summary`, `thumbnail_url`, `original_price`, `sale_price`,
  `stock_quantity`, `reward_rate`, `custom_detail_tsx`, `ocr_detail_text`, `pin_review_summary`, `target_species`, `pin_count`, `status`
) VALUES
  -- 자사 상품 1: 세라믹 워터볼 (메인 룩북 핀 #1)
  ('PRD1012610221105', '7412610221100', '와바미 높이조절 세라믹 워터볼',
   '고양이와 토끼가 귀 젖음 없이 편안한 각도로 마시는 무소음 세라믹 볼',
   'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?auto=format&fit=crop&w=400&q=80',
   45000, 38000, 120, 5.00, 'CeramicWaterBowlDetail',
   '와바미 높이조절 세라믹 워터볼. 1단계 9cm(토끼/소형견), 2단계 13cm(성묘/중형견). 1250도 고온 소성 친환경 도자기. 식기세척기 및 전자레인지 사용 가능.',
   '랙돌 고양이(4.8kg)와 롭이어 토끼(2.1kg) 합사 가정에서 M사이즈 공용 사용 시 물 튀김과 귀 젖음이 없다는 호평이 많음.',
   'DOG,CAT,RABBIT', 24, 'ON_SALE'),

  -- 자사 상품 2: 비절병 예방 논슬립 매트 (메인 룩북 핀 #2 & 케어 라운지 추천)
  ('PRD2022610221105', '8522610221100', '와바미 비절병 예방 논슬립 릴렉스 매트',
   '토끼 비절병과 강아지·고양이 슬개골을 동시에 보호하는 22mm 고밀도 셀 매트',
   'https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?auto=format&fit=crop&w=400&q=80',
   79000, 64000, 85, 5.00, 'RelaxNonSlipMatDetail',
   '와바미 22mm 고밀도 에어셀 쿠션 매트. 방수 코팅으로 소변/이물질 1초 닦임. 토끼 족저피부염(비절병) 충격 흡수 테스트 완료.',
   '비절병 초기였던 1.9kg 토끼가 3개월간 사용 후 발바닥 털이 복구되어 완치 판정을 받은 실제 사례 다수 보유.',
   'DOG,CAT,RABBIT,GUINEAPIG', 38, 'ON_SALE'),

  -- 자사 상품 3: 원목 캣타워 해먹 스텝 (스냅 카드 #1)
  ('PRD3032610221105', '8522610221100', '와바미 라운드 원목 클리어 해먹 스텝',
   '5kg 이상 대형묘도 흔들림 없이 지지하는 곡선형 자작나무 해먹',
   'https://images.unsplash.com/photo-1545249390-6bdfa286032f?auto=format&fit=crop&w=400&q=80',
   115000, 92000, 40, 5.00, NULL,
   '와바미 라운드 자작나무 원목 해먹. 최대 하중 15kg 테스트 통과.',
   '5.1kg 랙돌 성묘가 올라가도 흔들림이 없고 인테리어와 잘 어울린다는 평.',
   'CAT', 19, 'ON_SALE'),

  -- 자사 상품 4: 더스트프리 티모시 건초 베딩 (케어 라운지 핀)
  ('PRD4042610221105', '9632610221100', '와바미 더스트프리 소프트 티모시 베딩',
   '눈·호흡기 자극 없는 3차 에어워싱 부드러운 천연 베딩',
   'https://images.unsplash.com/photo-1585110396000-c9ffd4e4b308?auto=format&fit=crop&w=400&q=80',
   24000, 19800, 200, 5.00, NULL,
   '3차 분진 제거 공정 완료. 토끼, 기니피그, 친칠라, 햄스터 발바닥 보호용 소프트 베딩.',
   '발바닥이 예민한 토끼와 기니피그 화장실/휴식존 베딩으로 재구매율 높음.',
   'RABBIT,HAMSTER,GUINEAPIG,CHINCHILA', 31, 'ON_SALE');


-- ============================================================================
-- 5. 커뮤니티 게시글 (posts), 이미지 (post_images), 반려동물 매핑 (post_pets)
-- posts.content는 블록 에디터 JSON 배열 형태로 저장!
-- ============================================================================
INSERT INTO `posts` (
  `id`, `board_id`, `user_id`, `curation_grade`, `title`, `content`,
  `related_disease_id`, `is_vet_verified`, `view_count`, `like_count`, `bookmark_count`, `comment_count`, `status`, `promoted_at`
) VALUES
  -- [게시글 1: 메인 히어로 룩북 (MAIN_LOOKBOOK) - 이미지 2장 중 1번째가 대표 이미지]
  ('P1012610221110', 'LOOKBOOK', '4822610221030ate', 'MAIN_LOOKBOOK',
   '고양이 구름이와 토끼 모찌가 평화롭게 공존하는 무소음 라운드 거실',
   JSON_ARRAY(
     JSON_OBJECT('type', 'text', 'content', '랙돌 구름이(4.8kg)와 롭이어 토끼 모찌(2.1kg)를 함께 키우면서 가장 신경 쓴 건 바닥 미끄럼 방지와 물그릇 높이였어요.'),
     JSON_OBJECT('type', 'image', 'image_id', 1),
     JSON_OBJECT('type', 'text', 'content', '와바미 비절병 예방 논슬립 매트를 깔아주니 구름이가 우다다를 해도 조용하고, 모찌 발바닥도 완벽하게 보호됩니다! 아래는 창가 쪽 휴식 공간 사진이에요.'),
     JSON_OBJECT('type', 'image', 'image_id', 2),
     JSON_OBJECT('type', 'text', 'content', '다종 합사 가정이라면 높이조절 워터볼과 논슬립 매트 조합을 강력 추천합니다.')
   ),
   NULL, 0, 3420, 284, 192, 24, 'PUBLISHED', NOW()),

  -- [게시글 2: 일상 스냅 #1 - 이미지 2장 중 작성자가 2번째 이미지(image_id=4)를 대표 메인 이미지로 설정한 예시!]
  ('P2022610221112', 'SNAP', '7192610221031coz', 'MAIN_LOOKBOOK',
   '5.1kg 랙돌 두부가 하루 종일 내려오지 않는 창가 해먹 존',
   JSON_ARRAY(
     JSON_OBJECT('type', 'text', 'content', '덩치가 큰 편이라 일반 해먹은 불안했는데, 와바미 라운드 원목 스텝은 곡선 마감도 부드럽고 전혀 흔들리지 않아요.'),
     JSON_OBJECT('type', 'image', 'image_id', 3),
     JSON_OBJECT('type', 'text', 'content', '특히 오후 햇살이 들어올 때 찍은 두 번째 사진이 너무 마음에 들어서 이 사진을 대표 썸네일로 지정했어요!'),
     JSON_OBJECT('type', 'image', 'image_id', 4)
   ),
   NULL, 0, 1890, 165, 118, 14, 'PUBLISHED', NOW()),

  -- [게시글 3: 일상 스냅 #2 (강아지 + 고양이 합사)]
  ('P3032610221115', 'SNAP', '3052610221032arc', 'NORMAL_FEED',
   '말티푸 보리와 코숏 루이의 싸우지 않는 1층 워터바 세팅',
   JSON_ARRAY(
     JSON_OBJECT('type', 'text', 'content', '강아지랑 고양이가 물을 같이 마시다 보니 귀가 안 젖으면서도 목이 편한 높이를 찾기가 힘들었는데, 와바미 세라믹 워터볼 하나로 정착했어요!'),
     JSON_OBJECT('type', 'image', 'image_id', 5)
   ),
   NULL, 0, 1240, 98, 76, 9, 'PUBLISHED', NULL),

  -- [게시글 4: 케어 라운지 (수의사 공식 검증 + 비절병 완치 판정 히스토리 연동!)]
  ('P4042610221120', 'CARE_LOUNGE', '9122610221033bun', 'MAIN_LOOKBOOK',
   '토끼 비절병 초기 발적부터 3개월 만의 완치 판정까지, 바닥재 교체 실전 루틴',
   JSON_ARRAY(
     JSON_OBJECT('type', 'text', 'content', '처음 뒷발 꿈치에 붉은 각질을 발견했을 때 정말 막막했어요. 병원에서 붕대 대신 바닥 환경부터 100% 바꾸라고 하셨습니다.'),
     JSON_OBJECT('type', 'image', 'image_id', 6),
     JSON_OBJECT('type', 'text', 'content', '와바미 22mm 논슬립 매트와 소프트 베딩으로 전면 교체한 뒤 3개월 만에 새 털이 복구되고 완치 판정(관찰중)을 받았습니다.')
   ),
   1, 1, 5120, 412, 389, 47, 'PUBLISHED', NOW());


-- 게시글 이미지 (post_images: 기본은 1번째가 is_thumbnail=1이나, 작성자 선택에 따라 2번째/3번째도 is_thumbnail=1 가능)
INSERT INTO `post_images` (`id`, `post_id`, `image_url`, `is_thumbnail`, `is_ai_generated`, `sort_order`) VALUES
  -- P101: 이미지 2장 (1번째 이미지가 대표 메인 이미지 is_thumbnail = 1)
  (1, 'P1012610221110', 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=1200&q=85', 1, 0, 1),
  (2, 'P1012610221110', 'https://images.unsplash.com/photo-1585110396000-c9ffd4e4b308?auto=format&fit=crop&w=1000&q=80', 0, 0, 2),
  -- P202: 이미지 2장 (작성자가 2번째 이미지 id=4를 대표 메인 이미지 is_thumbnail = 1로 설정한 케이스!)
  (3, 'P2022610221112', 'https://images.unsplash.com/photo-1592194996308-7b43878e84a6?auto=format&fit=crop&w=800&q=80', 0, 0, 1),
  (4, 'P2022610221112', 'https://images.unsplash.com/photo-1573865526739-10659fec78a5?auto=format&fit=crop&w=800&q=80', 1, 0, 2),
  -- P303: 이미지 1장 (AI 연출 이미지 예시)
  (5, 'P3032610221115', 'https://images.unsplash.com/photo-1543852786-1cf6624b9987?auto=format&fit=crop&w=800&q=80', 1, 1, 1),
  -- P404: 케어 라운지 이미지 1장
  (6, 'P4042610221120', 'https://images.unsplash.com/photo-1585110396000-c9ffd4e4b308?auto=format&fit=crop&w=800&q=80', 1, 0, 1);


-- 게시글 등장 반려동물 매핑 (post_pets)
INSERT INTO `post_pets` (`post_id`, `pet_id`, `weight_at_post_kg`, `age_months_at_post`) VALUES
  ('P1012610221110', '83912610221035', 4.800, 30), -- 구름(고양이 4.8kg)
  ('P1012610221110', '55202610221035', 2.100, 20), -- 모찌(토끼 2.1kg)
  ('P2022610221112', '19402610221036', 5.100, 35), -- 두부(고양이 5.1kg)
  ('P3032610221115', '66312610221037', 3.400, 26), -- 보리(강아지 3.4kg)
  ('P3032610221115', '77422610221037', 4.200, 33), -- 루이(고양이 4.2kg)
  ('P4042610221120', '90122610221038', 1.950, 48); -- 토리(토끼 1.95kg)


-- 게시글 해시태그 (post_tags)
INSERT INTO `post_tags` (`post_id`, `tag_name`) VALUES
  ('P1012610221110', '캣토합사'),
  ('P1012610221110', '비절병예방매트'),
  ('P1012610221110', '세라믹워터볼'),
  ('P2022610221112', '랙돌'),
  ('P2022610221112', '원목해먹'),
  ('P3032610221115', '강고합사'),
  ('P3032610221115', '높이조절식기'),
  ('P4042610221120', '비절병완치'),
  ('P4042610221120', '토끼케어'),
  ('P4042610221120', '수의사검증');


-- 수의사 공식 검증 데이터 (care_verifications)
INSERT INTO `care_verifications` (`post_id`, `vet_user_id`, `vet_comment`, `verified_at`) VALUES
  ('P4042610221120', '1042610221034vet',
   '토끼 비절병(족저피부염) 초기에는 무리한 붕대 감기보다 바닥 압력을 분산시키는 고밀도 매트와 건조하고 부드러운 베딩 교체가 가장 핵심적인 치료법입니다. 아주 모범적인 케어 사례입니다.',
   NOW());


-- ============================================================================
-- 6. 이미지 위 통합 핀 (product_pins) & 핀별 사용 반려동물 (pin_pet_mappings)
-- 3가지 핀 유형 모두 포함: 1) INTERNAL_PRODUCT(내 제품 검색), 2) EXTERNAL_PRODUCT(제품 URL), 3) PET(내 펫 태그)
-- ============================================================================
INSERT INTO `product_pins` (
  `id`, `post_image_id`, `pin_type`, `pos_x`, `pos_y`, `product_id`,
  `external_url`, `external_product_name`, `external_brand_name`, `external_image_url`, `external_price`,
  `pet_id`, `pin_option_memo`, `click_count`
) VALUES
  -- [P101 1번째 대표 이미지(image_id=1) 위의 핀 4개: 자사상품 2 + 외부URL 1 + 펫태그 1]
  ('PIN1012610221130', 1, 'INTERNAL_PRODUCT', 34.50, 62.00, 'PRD1012610221105',
   NULL, NULL, NULL, NULL, NULL,
   NULL, '크림화이트 M사이즈 / 구름이랑 모찌가 같이 마셔요', 142),

  ('PIN1022610221130', 1, 'INTERNAL_PRODUCT', 58.00, 78.50, 'PRD2022610221105',
   NULL, NULL, NULL, NULL, NULL,
   NULL, '오트밀 베이지 대형 2장 연결 시공 (우다다 소음 0%)', 215),

  ('PIN1032610221130', 1, 'EXTERNAL_PRODUCT', 72.00, 38.00, NULL,
   'https://smartstore.naver.com/example/products/12345',
   '노르딕 아쿠아클린 발톱 스크래치 방지 모듈 소파',
   '네이버 스마트스토어',
   'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=400&q=80',
   489000,
   NULL, '고양이가 긁어도 실밥 안 나가는 원단이라 2년째 만족중!', 89),

  ('PIN1042610221130', 1, 'PET', 48.00, 42.00, NULL,
   NULL, NULL, NULL, NULL, NULL,
   '83912610221035', '우리 집 첫째 랙돌 구름이 (4.8kg)', 97),

  -- [P101 2번째 본문 이미지(image_id=2) 위의 핀 1개: 펫 태그 (모찌)]
  ('PIN1052610221131', 2, 'PET', 52.00, 55.00, NULL,
   NULL, NULL, NULL, NULL, NULL,
   '55202610221035', '귀여운 막내 홀랜드 롭이어 모찌 (2.1kg)', 63),

  -- [P202 2번째 대표 이미지(image_id=4) 위의 핀 2개: 자사상품 1 + 펫태그 1]
  ('PIN2012610221132', 4, 'INTERNAL_PRODUCT', 46.00, 52.00, 'PRD3032610221105',
   NULL, NULL, NULL, NULL, NULL,
   NULL, '5.1kg 두부가 올라가도 튼튼한 라운드 해먹', 64),

  ('PIN2022610221132', 4, 'PET', 55.00, 36.00, NULL,
   NULL, NULL, NULL, NULL, NULL,
   '19402610221036', '해먹 위에서 꿀잠 자는 두부', 41),

  -- [P303 대표 이미지(image_id=5) 위의 핀 1개]
  ('PIN3012610221133', 5, 'INTERNAL_PRODUCT', 50.00, 68.00, 'PRD1012610221105',
   NULL, NULL, NULL, NULL, NULL,
   NULL, '강아지 보리랑 고양이 루이 공용 워터볼', 51),

  -- [P404 대표 이미지(image_id=6) 위의 핀 2개]
  ('PIN4012610221135', 6, 'INTERNAL_PRODUCT', 42.00, 74.00, 'PRD2022610221105',
   NULL, NULL, NULL, NULL, NULL,
   NULL, '비절병 완치 일등공신 22mm 매트', 310),
  ('PIN4022610221135', 6, 'INTERNAL_PRODUCT', 65.00, 60.00, 'PRD4042610221105',
   NULL, NULL, NULL, NULL, NULL,
   NULL, '분진 없는 소프트 티모시 베딩', 178);


-- 핀별 사용 반려동물 매핑 (pin_pet_mappings)
INSERT INTO `pin_pet_mappings` (`pin_id`, `pet_id`) VALUES
  ('PIN1012610221130', '83912610221035'), -- 워터볼: 구름(고양이)
  ('PIN1012610221130', '55202610221035'), -- 워터볼: 모찌(토끼) 함께 사용!
  ('PIN1022610221130', '83912610221035'), -- 매트: 구름
  ('PIN1022610221130', '55202610221035'), -- 매트: 모찌 함께 사용!
  ('PIN1032610221130', '83912610221035'), -- 외부몰 소파: 구름
  ('PIN2012610221132', '19402610221036'), -- 해먹: 두부
  ('PIN3012610221133', '66312610221037'), -- 워터볼: 보리(강아지)
  ('PIN3012610221133', '77422610221037'), -- 워터볼: 루이(고양이)
  ('PIN4012610221135', '90122610221038'), -- 비절병 매트: 토리(토끼)
  ('PIN4022610221135', '90122610221038'); -- 베딩: 토리(토끼)


-- ============================================================================
-- 7. 샘플 댓글 (comments)
-- ID 규칙: C + 랜덤숫자 3자 + YYMMDD
-- ============================================================================
INSERT INTO `comments` (`id`, `post_id`, `user_id`, `parent_id`, `content`, `is_accepted`, `like_count`, `status`) VALUES
  ('C482261022', 'P1012610221110', '7192610221031coz', NULL,
   '고양이랑 토끼가 같이 물 마시는 모습 너무 평화로워요! 매트 두께감이 딱 좋아 보이네요.', 0, 12, 'ACTIVE'),
  ('C915261022', 'P4042610221120', '4822610221030ate', NULL,
   '저희 모찌도 발바닥 걱정돼서 이 글 보고 바로 와바미 매트로 깔아줬어요. 정성스러운 완치 기록 감사합니다!', 0, 28, 'ACTIVE');

SET FOREIGN_KEY_CHECKS = 1;
