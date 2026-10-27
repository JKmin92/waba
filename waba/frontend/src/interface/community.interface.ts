import { MentorBadge, PetDisease, PetDiseaseStatus, PetSpecies, User, UserRole } from './userPet.interface';
import { ProductPinItem } from './productPin.interface';

/**
 * [2단계] 커뮤니티(boards, posts, post_images, comments 등) 인터페이스
 * 모든 속성명을 실제 MySQL DB 컬럼명(snake_case)과 100% 동일하게 통일
 */

export type CurationGrade = 'NORMAL_FEED' | 'LOOKBOOK_CANDIDATE' | 'MAIN_LOOKBOOK';
export type PostStatus = 'PUBLISHED' | 'DRAFT' | 'HIDDEN' | 'DELETED';
export type CommentStatus = 'ACTIVE' | 'DELETED' | 'BLINDED';
export type InteractionType = 'LIKE' | 'BOOKMARK';

/** 1. 확장형 게시판 설정 마스터 (boards 테이블) */
export interface Board {
  /** 게시판 고유 코드 (예: 'LOOKBOOK' | 'SNAP' | 'CARE_LOUNGE' | 'QNA') */
  id: string;
  /** 화면에 표시될 게시판 이름 (예: '공식 룩북', '일상 스냅') */
  name: string;
  /** 게시판 한 줄 설명 */
  description: string | null;
  /** 사진 위 상품 핀(+) 태그 허용 여부 */
  allow_product_pins: boolean | number;
  /** 수의사 공식 검증 마크 사용 여부 */
  allow_vet_verify: boolean | number;
  /** 글쓰기 최소 권한 ('USER' | 'VET' | 'EDITOR' | 'ADMIN') */
  min_write_role: UserRole;
  /** 상단 메뉴 노출 순서 */
  sort_order: number;
  /** 게시판 활성화 여부 */
  is_active: boolean | number;
  /** 생성 일시 */
  created_at: string;
}

/** 블록 에디터 본문 요소 타입 (글 또는 이미지 ID 참조) */
export type PostContentBlock =
  | { type: 'text'; content: string }
  | { type: 'image'; image_id: number };

/** 2. 게시글 기본 테이블 (posts 테이블) */
export interface Post {
  /** 게시글 고유 코드 (예: P + 랜덤3자 + YYMMDDHHmm) */
  id: string;
  /** 소속 게시판 코드 (boards.id 참조: 'LOOKBOOK' | 'SNAP' | 'CARE_LOUNGE' | 'QNA') */
  board_id: string;
  /** 작성자 회원 ID (users.id 참조) */
  user_id: string;
  /** 큐레이션 노출 등급 ('NORMAL_FEED': 일반피드, 'LOOKBOOK_CANDIDATE': 승격대기, 'MAIN_LOOKBOOK': 메인룩북) */
  curation_grade: CurationGrade;
  /** 게시글 제목 (NOT NULL 필수) */
  title: string;
  /** 게시글 본문 내용 (블록 에디터 JSON 배열) */
  content: PostContentBlock[];
  /** 연결된 반려동물 질병 기록 ID (pet_diseases.id 참조, 선택) */
  related_disease_id?: number | null;
  /** [✓ 수의사 공식 검증] 획득 여부 */
  is_vet_verified: boolean | number;
  /** 조회수 */
  view_count: number;
  /** 좋아요(하트) 수 */
  like_count: number;
  /** 북마크(스크랩) 수 (멘토 승급 및 메인 룩북 선정 기준) */
  bookmark_count: number;
  /** 댓글 수 */
  comment_count: number;
  /** 게시 상태 ('PUBLISHED' | 'DRAFT' | 'HIDDEN' | 'DELETED') */
  status: PostStatus;
  /** 메인 룩북(MAIN_LOOKBOOK)으로 승격된 일시 */
  promoted_at?: string | null;
  /** 작성 일시 */
  created_at: string;
  /** 수정 일시 */
  updated_at?: string;
}

/** 3. 게시글 다중 이미지 (post_images 테이블) */
export interface PostImage {
  /** 게시글 이미지 고유 번호 (PK, product_pins에서 참조) */
  id: number;
  /** 소속 게시글 ID (posts.id) */
  post_id: string;
  /** 이미지 URL */
  image_url: string;
  /** 대표 썸네일 이미지 여부 (true/1: 목록에 대표로 노출될 사진) */
  is_thumbnail: boolean | number;
  /** AI 생성 이미지 여부 (true/1: 해당 사진에 [AI 연출 이미지] 배지 표시) */
  is_ai_generated: boolean | number;
  /** 게시글 내 이미지 슬라이드 순서 (1부터 시작) */
  sort_order: number;
}

/** 4. 게시글에 등장한 반려동물 스펙 (post_pets + pets 조인) */
export interface PostPetSpec {
  /** 반려동물 고유 ID (pets.id) */
  pet_id: string;
  /** 반려동물 이름 (예: '구름', '모찌') */
  name: string;
  /** 반려동물 종 분류 ('DOG' | 'CAT' | 'RABBIT' | 'HAMSTER' | 'GUINEAPIG' | 'CHINCHILA' | 'OTHER') */
  species: PetSpecies;
  /** 세부 품종 (예: '랙돌', '홀랜드 롭이어', '말티푸') */
  breed: string;
  /** 게시글 작성 당시 체중(kg) 스냅샷 또는 최신 체중 (예: 4.8) */
  weight_kg?: number | null;
  /** 게시글 작성 당시 개월 수 스냅샷 */
  age_months?: number | null;
}

/** 5. 수의사 공식 검증 정보 (care_verifications 테이블) */
export interface CareVerification {
  /** 검증 기록 고유 번호 */
  id?: number;
  /** 검증된 게시글 ID (posts.id) */
  post_id?: string;
  /** 검증을 수행한 수의사 회원 ID (users.id) */
  vet_user_id?: string;
  /** 검증 수의사 닉네임 */
  vet_nickname?: string;
  /** 수의사 공식 자문 한 줄 코멘트 */
  vet_comment?: string | null;
  /** 검증 승인 일시 */
  verified_at?: string;
}

/** 6. 댓글 및 대댓글 (comments 테이블) */
export interface Comment {
  /** 댓글 고유 코드 (C + 랜덤숫자3자 + YYMMDD, 예: C482261021) */
  id: string;
  /** 소속 게시글 ID (posts.id) */
  post_id: string;
  /** 댓글 작성자 ID (users.id) */
  user_id: string;
  /** 대댓글일 경우 부모 댓글 ID (원댓글이면 null) */
  parent_id?: string | null;
  /** 댓글 본문 내용 */
  content: string;
  /** 질문/고민(Q&A) 게시판에서 질문자가 채택한 답변 여부 */
  is_accepted: boolean | number;
  /** 댓글 공감(좋아요) 수 */
  like_count: number;
  /** 댓글 상태 ('ACTIVE' | 'DELETED' | 'BLINDED') */
  status: CommentStatus;
  /** 작성 일시 */
  created_at: string;
  /** 수정 일시 */
  updated_at?: string;
  /** 댓글 작성자 요약 정보 */
  author?: Partial<User>;
  /** 대댓글 목록 */
  replies?: Comment[];
}

/**
 * ⭐ [통합 게시글 인터페이스: PostDetail]
 * DB에서 게시글 1개를 가져올 때 관련된 모든 테이블을 DB 컬럼명(snake_case) 그대로 묶어놓은 인터페이스입니다.
 */
export interface PostDetail {
  /** 1) 게시글 기본 정보 (posts 테이블: id, board_id, curation_grade, title, content 등) */
  post: Post;

  /** 1-1) 소속 게시판 마스터 정보 (boards 테이블: id, name, allow_product_pins 등) */
  board: {
    id: string;
    name: string;
    description: string | null;
    allow_product_pins: boolean;
    allow_vet_verify: boolean;
  };

  /** 2) 작성자 정보 (users 테이블: id, nickname, profile_image_url, mentor_badge, vet_license_info 등) */
  user: {
    /** 작성자 회원 ID */
    id: string;
    /** 작성자 닉네임 */
    nickname: string;
    /** 작성자 프로필 이미지 URL */
    profile_image_url: string | null;
    /** 멘토 뱃지 등급 ('NONE' | 'STYLE_MENTOR' | 'CARE_MENTOR' | 'DUAL_MENTOR') */
    mentor_badge: MentorBadge;
    /** 수의사 면허/소속 정보 */
    vet_license_info?: string | null;
    /** 다종 합사 가구 여부 (true/1: 2종 이상 합사) */
    is_multi_species: boolean | number;
  };

  /** 3) 게시글 사진 배열 (post_images 테이블: 0번 인덱스가 대표 썸네일 이미지) */
  post_images: PostImage[];

  /** 4) 게시글에 연결된 반려동물 스펙 배열 (post_pets + pets 테이블, 연결된 펫이 없을 수 있음) */
  post_pets?: PostPetSpec[];

  /** 5) 사진 위 상품 핀(+) 배열 (product_pins + products 테이블, 자사몰 상품 + 외부몰 링크 통합) */
  product_pins?: ProductPinItem[];

  /** 6) 게시글 해시태그 문자열 배열 (post_tags 테이블, 예: ['캣토합사', '비절병예방']) */
  tags?: string[];

  /** 7) 수의사 공식 검증 코멘트 및 연결된 질병 상태 (케어 라운지 게시글일 때 값 존재) */
  care_verification?: {
    /** 수의사 공식 자문 한 줄 코멘트 */
    vet_comment: string | null;
    /** 연결된 반려동물 질병명 (예: '비절병(족저피부염) 초기') */
    disease_name: string | null;
    /** 질병 치유 상태 ('TREATING': 치료중, 'CURED_OBSERVING': 완치 판정(관찰중), 'CURED': 완치) */
    disease_status: PetDiseaseStatus | null;
  } | null;

  /** 8) 게시글 댓글 목록 (상세 조회 시 포함) */
  comments?: Comment[];
}
