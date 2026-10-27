/**
 * [3단계] 와바미 자사몰 상품(products) 및 이미지 위 상품 핀(product_pins) 인터페이스
 * 모든 속성명을 실제 MySQL DB 컬럼명(snake_case)과 100% 동일하게 통일
 */

export type ProductStatus = 'ON_SALE' | 'SOLD_OUT' | 'HIDDEN';
export type ProductImageType = 'GALLERY' | 'DETAIL';
export type PinType = 'INTERNAL_PRODUCT' | 'EXTERNAL_PRODUCT' | 'PET';

/** 3-1. 상품 카테고리 (product_categories 테이블) */
export interface ProductCategory {
  /** 카테고리 고유 코드 (랜덤숫자3자 + YYMMDDHHmm, 예: 7422610211549) */
  id: string;
  /** 상위 카테고리 ID (대분류면 null) */
  parent_id: string | null;
  /** 카테고리명 (예: '식기/급수기', '매트/방석/리빙') */
  name: string;
  /** 노출 순서 */
  sort_order: number;
  /** 사용 여부 */
  is_active: boolean | number;
  /** 생성 일시 */
  created_at: string;
  /** 하위 카테고리 목록 */
  children?: ProductCategory[];
}

/** 3-2. 와바미 자사몰 전용 상품 (products 테이블) */
export interface Product {
  /** 상품 고유 코드 (PRD + 랜덤3자 + YYMMDDHHmm) */
  id: string;
  /** 소속 카테고리 ID (product_categories.id) */
  category_id: string;
  /** 와바미 자사몰 상품명 */
  name: string;
  /** 상품 한 줄 요약 카피 */
  summary: string | null;
  /** 상품 대표 썸네일 이미지 URL */
  thumbnail_url: string;
  /** 할인 전 정가(원) */
  original_price: number | null;
  /** 실제 판매가(원) */
  sale_price: number;
  /** 기본 재고 수량 */
  stock_quantity: number;
  /** 커뮤니티 핀 태그 구매 전환 시 리워드 적립률 (기본 5.00%) */
  reward_rate: number;
  /** 특정 폴더 내 인터랙티브 상세페이지 .tsx 파일명 (null이면 일반 DETAIL 이미지 렌더링) */
  custom_detail_tsx: string | null;
  /** [향후 로컬 AI용] 상세페이지 이미지 내 OCR 텍스트 + .tsx 텍스트 통합본 */
  ocr_detail_text?: string | null;
  /** [향후 로컬 AI용] 이 상품을 핀으로 태그한 집사들의 의견 사전 요약본 */
  pin_review_summary?: string | null;
  /** 추천 대상 반려동물 종 (예: 'DOG,CAT,RABBIT') */
  target_species: string | null;
  /** 커뮤니티 사진에 핀(+)으로 태그된 누적 횟수 */
  pin_count: number;
  /** 판매 상태 ('ON_SALE' | 'SOLD_OUT' | 'HIDDEN') */
  status: ProductStatus;
  /** 등록 일시 */
  created_at: string;
  /** 수정 일시 */
  updated_at: string;
  /** 상품 갤러리 및 상세 이미지 목록 */
  images?: ProductImage[];
  /** 상품 옵션 목록 */
  options?: ProductOption[];
}

/** 3-3. 상품 이미지 (product_images 테이블) */
export interface ProductImage {
  /** 상품 이미지 고유 번호 */
  id: number;
  /** 상품 ID (products.id) */
  product_id: string;
  /** 이미지 URL */
  image_url: string;
  /** 이미지 구분 ('GALLERY': 상단 슬라이드, 'DETAIL': 하단 상세 통이미지) */
  image_type: ProductImageType;
  /** 노출 순서 */
  sort_order: number;
  /** 등록 일시 */
  created_at: string;
}

/** 3-4. 상품 옵션 (product_options 테이블) */
export interface ProductOption {
  /** 옵션 고유 번호 */
  id: number;
  /** 상품 ID (products.id) */
  product_id: string;
  /** 옵션명 (예: '아이보리 / M 사이즈') */
  option_name: string;
  /** 옵션 추가 금액(원) */
  additional_price: number;
  /** 옵션 재고 수량 */
  stock_quantity: number;
  /** 옵션 선택 가능 여부 */
  is_available: boolean | number;
  /** 생성 일시 */
  created_at: string;
}

/** 3-5. 게시글 이미지 위 통합 핀 DB 원본 (product_pins 테이블) */
export interface ProductPin {
  /** 핀 고유 코드 (PIN + 랜덤3자 + YYMMDDHHmm) */
  id: string;
  /** 핀이 찍힌 게시글 이미지 ID (post_images.id) */
  post_image_id: number;
  /** 핀 종류 ('INTERNAL_PRODUCT' | 'EXTERNAL_PRODUCT' | 'PET') */
  pin_type: PinType;
  /** 이미지 위 가로 상대 좌표 (0.00 ~ 100.00%) */
  pos_x: number;
  /** 이미지 위 세로 상대 좌표 (0.00 ~ 100.00%) */
  pos_y: number;
  /** 와바미 자사몰 상품일 때만 연결되는 상품 ID (외부몰 링크일 때는 null) */
  product_id: string | null;
  /** 유저가 직접 입력한 외부몰 상품 링크 URL (자사 상품일 때는 null) */
  external_url: string | null;
  /** 외부몰 상품명 */
  external_product_name: string | null;
  /** 외부몰 브랜드/쇼핑몰명 (예: '네이버 스마트스토어', '쿠팡') */
  external_brand_name: string | null;
  /** 외부몰 상품 썸네일 이미지 URL */
  external_image_url: string | null;
  /** 외부몰 상품 참고 가격(원) */
  external_price: number | null;
  /** 반려동물 핀일 때 연결되는 반려동물 ID (pets.id) */
  pet_id: string | null;
  /** 작성자가 남긴 착용 사이즈/옵션/한줄 후기 메모 */
  pin_option_memo: string | null;
  /** 핀 클릭 횟수 */
  click_count: number;
  /** 생성 일시 */
  created_at: string;
}

/**
 * ⭐ [프론트엔드 화면 표시용 통합 핀 인터페이스: ProductPinItem]
 * MySQL COALESCE(자사상품, 외부상품, 펫태그) 쿼리 결과와 1:1 매칭 (snake_case 통일)
 */
export interface ProductPinItem {
  /** 핀 고유 코드 (PIN + 랜덤3자 + YYMMDDHHmm) */
  pin_id: string;
  /** 핀이 속한 게시글 이미지 ID (post_images.id) */
  post_image_id: number;
  /** 핀 종류 ('INTERNAL_PRODUCT' | 'EXTERNAL_PRODUCT' | 'PET') */
  pin_type: PinType;
  /** 이미지 가로 위치 비율 (0.00 ~ 100.00%) */
  pos_x: number;
  /** 이미지 세로 위치 비율 (0.00 ~ 100.00%) */
  pos_y: number;
  /** 자사몰 상품 여부 (true/1: 와바미 공식 상품 5% 리워드, false/0: 외부 링크 또는 펫 핀) */
  is_official: boolean | number;
  /** 와바미 자사몰 상품 ID (외부몰 상품이나 펫 핀이면 null) */
  product_id: string | null;
  /** 상품명 또는 펫 이름 (자사몰 상품명 / 외부몰 상품명 / 반려동물 이름 자동 매핑) */
  product_name: string;
  /** 브랜드명 또는 펫 스펙 (자사몰이면 'WABAMI', 외부몰이면 외부 몰 이름, 펫이면 품종·몸무게) */
  brand_name: string;
  /** 판매 가격(원) */
  price: number;
  /** 핀 구매 전환 리워드 적립률 (자사몰 5%, 외부몰 0%) */
  reward_rate: number;
  /** 상품 썸네일 또는 펫 아바타 이미지 URL */
  thumbnail_url: string | null;
  /** 외부몰 이동 URL (외부몰 핀일 때만 값 존재) */
  external_url: string | null;
  /** 반려동물 ID (펫 핀일 때만 값 존재) */
  pet_id: string | null;
  /** 작성자가 남긴 구매 옵션/사이즈/한줄 의견 메모 */
  pin_option_memo: string | null;
  /** 이 핀의 상품을 함께 사용하는 반려동물 이름 배열 (예: ['구름', '모찌']) */
  used_pet_names: string[];
}
