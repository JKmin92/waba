/**
 * [1단계] 회원(users) 및 반려동물 생애주기·질병(pets 관련 5개 테이블) 인터페이스
 * 모든 속성명을 실제 MySQL DB 컬럼명(snake_case)과 100% 동일하게 통일
 */

export type AuthProvider = 'LOCAL' | 'KAKAO' | 'NAVER' | 'APPLE';
export type UserRole = 'USER' | 'VET' | 'EDITOR' | 'ADMIN';
export type MentorBadge = 'NONE' | 'STYLE_MENTOR' | 'CARE_MENTOR' | 'DUAL_MENTOR';
export type UserStatus = 'ACTIVE' | 'SUSPENDED' | 'WITHDRAWN';

export type PetSpecies =
  | 'DOG'
  | 'CAT'
  | 'RABBIT'
  | 'HAMSTER'
  | 'GUINEAPIG'
  | 'CHINCHILA'
  | 'OTHER';

export type PetGender = 'MALE' | 'FEMALE' | 'UNKNOWN';

export type PetDiseaseStatus =
  | 'TREATING'
  | 'CURED_OBSERVING'
  | 'CURED'
  | 'CHRONIC_MANAGING';

/** 1-1. 회원 마스터 (users 테이블) */
export interface User {
  /** 회원 고유 코드 (랜덤숫자3자 + YYMMDDHHmm + 이메일앞3자) */
  id: string;
  /** 로그인 이메일 아이디 (NOT NULL 필수) */
  email: string;
  /** 가입 경로 ('LOCAL' | 'KAKAO' | 'NAVER' | 'APPLE') */
  auth_provider: AuthProvider;
  /** 소셜 로그인 식별자 */
  provider_id?: string | null;
  /** 활동 닉네임 */
  nickname: string;
  /** 프로필 아바타 이미지 URL */
  profile_image_url: string | null;
  /** 한 줄 소개 */
  bio: string | null;
  /** 회원 권한 ('USER' | 'VET' | 'EDITOR' | 'ADMIN') */
  role: UserRole;
  /** 멘토 뱃지 등급 ('NONE' | 'STYLE_MENTOR' | 'CARE_MENTOR' | 'DUAL_MENTOR') */
  mentor_badge: MentorBadge;
  /** 수의사(VET)일 경우 면허/소속 정보 */
  vet_license_info: string | null;
  /** 다종 합사 가구 여부 (true/1: 2종 이상 합사) */
  is_multi_species: boolean | number;
  /** 보유 와바미 리워드 포인트 잔액(원) */
  reward_points: number;
  /** 팔로워 수 */
  follower_count: number;
  /** 팔로잉 수 */
  following_count: number;
  /** 계정 상태 ('ACTIVE' | 'SUSPENDED' | 'WITHDRAWN') */
  status: UserStatus;
  /** 마지막 로그인 일시 */
  last_login_at: string | null;
  /** 가입 일시 */
  created_at: string;
  /** 수정 일시 */
  updated_at: string;
}

/** 1-2. 반려동물 기본 프로필 (pets 테이블) */
export interface Pet {
  /** 반려동물 고유 코드 (랜덤숫자4자 + YYMMDDHHmm) */
  id: string;
  /** 보호자 회원 ID (users.id) */
  user_id: string;
  /** 반려동물 이름 */
  name: string;
  /** 반려동물 종 분류 ('DOG' | 'CAT' | 'RABBIT' | 'HAMSTER' | 'GUINEAPIG' | 'CHINCHILA' | 'OTHER') */
  species: PetSpecies;
  /** 세부 품종 (예: '랙돌', '홀랜드 롭이어') */
  breed: string;
  /** 생년월일 (YYYY-MM-DD) */
  birth_date: string | null;
  /** 성별 ('MALE' | 'FEMALE' | 'UNKNOWN') */
  gender: PetGender;
  /** 중성화 여부 */
  is_neutered: boolean | number;
  /** 가장 최근 기록된 체중(kg) 캐시 */
  latest_weight_kg: number | null;
  /** 가장 최근 기록된 등길이/체장(cm) 캐시 */
  latest_body_length_cm: number | null;
  /** 현재 대표 아바타 이미지 URL */
  current_avatar_url: string | null;
  /** 대표 반려동물 여부 */
  is_primary: boolean | number;
  /** 본인이 AI 질문 시 비공개 건강/질병 이력 열람 동의 여부 */
  ai_private_data_consent: boolean | number;
  /** AI 열람 동의 일시 */
  agreed_at: string | null;
  /** 등록 일시 */
  created_at: string;
  /** 수정 일시 */
  updated_at: string;
}

/** 1-3. 반려동물 시간대별 체중·체장 성장 기록 (pet_growth_logs 테이블) */
export interface PetGrowthLog {
  /** 성장 기록 고유 번호 */
  id: number;
  /** 대상 반려동물 ID (pets.id) */
  pet_id: string;
  /** 측정 체중(kg) - 소동물 대응 소수점 3자리 */
  weight_kg: number | null;
  /** 측정 등길이/체장(cm) */
  body_length_cm: number | null;
  /** 측정 당시 개월 수 */
  age_months_at_log: number | null;
  /** 측정 메모 (예: '아침 공복 측정') */
  memo: string | null;
  /** 실제 측정한 날짜와 시간 (DATETIME) */
  measured_at: string;
  /** 등록 일시 */
  created_at: string;
}

/** 1-4. 반려동물 나이별 아바타 프로필 앨범 (pet_avatars 테이블) */
export interface PetAvatar {
  /** 아바타 고유 번호 */
  id: number;
  /** 대상 반려동물 ID (pets.id) */
  pet_id: string;
  /** 아바타 이미지 URL */
  avatar_url: string;
  /** 사진 촬영 당시 나이(세) */
  age_years: number | null;
  /** 사진 촬영 당시 개월 수 */
  age_months: number | null;
  /** 표시용 나이 라벨 (예: '생후 3개월', '2살 성묘') */
  age_label: string | null;
  /** 사진 촬영일 */
  taken_date: string | null;
  /** 현재 대표 아바타 여부 */
  is_current: boolean | number;
  /** 업로드 일시 */
  created_at: string;
}

/** 1-5. 반려동물 보유/과거 질병 마스터 (pet_diseases 테이블) */
export interface PetDisease {
  /** 질병 기록 고유 번호 */
  id: number;
  /** 대상 반려동물 ID (pets.id) */
  pet_id: string;
  /** 질병/증상명 (예: '비절병', '심장질환') */
  disease_name: string;
  /** 치료 상태 ('TREATING': 치료중, 'CURED_OBSERVING': 완치 판정(관찰중), 'CURED': 완치, 'CHRONIC_MANAGING': 만성 관리중) */
  status: PetDiseaseStatus;
  /** 최초 진단일 */
  diagnosed_date: string | null;
  /** 완치 또는 완치 판정일 */
  cured_date: string | null;
  /** 진료 병원명 */
  hospital_name: string | null;
  /** 원인 및 관리 한 줄 요약 */
  summary_memo: string | null;
  /** 타인에게 공개 여부 (false/0이면 타인의 AI 질문 시 절대 참조 불가) */
  is_public: boolean | number;
  /** 등록 일시 */
  created_at: string;
  /** 수정 일시 */
  updated_at: string;
  /** 상세 치료 타임라인 목록 */
  histories?: PetDiseaseHistory[];
}

/** 1-6. 반려동물 질병 치료·치유 상세 타임라인 (pet_disease_histories 테이블) */
export interface PetDiseaseHistory {
  /** 히스토리 고유 번호 */
  id: number;
  /** 연결된 질병 ID (pet_diseases.id) */
  pet_disease_id: number;
  /** 진료/처치/경과 기록 일시 */
  recorded_at: string;
  /** 당시 기록 시점의 상태 ('TREATING' | 'CURED_OBSERVING' | 'CURED' | 'CHRONIC_MANAGING') */
  status_at_record: PetDiseaseStatus;
  /** 치료 및 환경 개선 상세 내용 */
  treatment_note: string;
  /** 경과 사진 URL */
  photo_url: string | null;
  /** 진료/치료 비용(원) */
  cost_krw: number | null;
  /** 작성 일시 */
  created_at: string;
}
