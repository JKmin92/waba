/**
 * [1단계] 회원(users, user_identities) 및 반려동물 생애주기·질병(pets 관련 5개 테이블) 인터페이스
 * 모든 속성명을 실제 MySQL DB 컬럼명(snake_case)과 100% 동일하게 통일
 */

export type AuthProvider = 'LOCAL' | 'KAKAO' | 'NAVER' | 'GOOGLE' | 'APPLE';
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

/** 1-1. 회원 마스터 (users 테이블) - 초경량 프라이버시 중심 */
export interface User {
  /** 회원 고유 코드 (랜덤숫자3자 + YYMMDDHHmm + 이메일앞3자) */
  id: string;
  /** 대표 이메일 (계정 식별 및 알림 수신용) */
  email: string;
  /** 커뮤니티 대표 활동 닉네임 */
  nickname: string;
  /** 프로필 아바타 이미지 URL (미설정 시 기본 캐릭터 or 대표 반려동물 아바타) */
  profile_image_url: string | null;
  /** 집사 한 줄 소개 */
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
  /** 첫 반려동물 등록 리워드(3,000P) 중복 수령 방지 플래그 */
  first_pet_reward_claimed: boolean | number;
  /** 팔로워 수 */
  follower_count: number;
  /** 팔로잉 수 */
  following_count: number;
  /** 로그인 상태 유지(Keep-Login) 토큰 */
  refresh_token?: string | null;
  /** 최근 접속 IP */
  last_ip?: string | null;
  /** 누적 피신고 수 (자동 블라인드/제재용) */
  report_count: number;
  /** 필수 약관 동의 여부 */
  terms_agreed: boolean | number;
  /** 마케팅 수신 동의 여부 */
  marketing_agreed: boolean | number;
  /** 계정 상태 ('ACTIVE' | 'SUSPENDED' | 'WITHDRAWN') */
  status: UserStatus;
  /** 마지막 로그인 일시 */
  last_login_at: string | null;
  /** 회원 탈퇴 일시 */
  withdrawn_at?: string | null;
  /** 가입 일시 */
  created_at: string;
  /** 수정 일시 */
  updated_at: string;
}

/** 1-2. 다중 로그인 인증 수단 (user_identities 테이블 - 1:N) */
export interface UserIdentity {
  /** 식별자 코드 (IDN + 랜덤숫자3자 + YYMMDDHHmm) */
  id: string;
  /** 연결된 회원 ID (users.id) */
  user_id: string;
  /** 인증 제공사 ('LOCAL' | 'KAKAO' | 'NAVER' | 'GOOGLE' | 'APPLE') */
  provider: AuthProvider;
  /** 각 제공사의 고유 식별값 (LOCAL: 이메일, 소셜: sub 또는 고유 회원번호) */
  provider_uid: string;
  /** 단방향 비밀번호 해시 (LOCAL만 사용, 소셜은 NULL) */
  password_hash?: string | null;
  /** 소셜 제공사에서 받은 이메일 (참고용) */
  provider_email?: string | null;
  /** 연동 일시 */
  created_at: string;
}

/** 1-3. 반려동물 기본 프로필 (pets 테이블) */
export interface Pet {
  /** 반려동물 고유 코드 (랜덤숫자4자 + YYMMDDHHmm) */
  id: string;
  /** 보호자 회원 ID (users.id) */
  user_id: string;
  /** 반려동물 이름 */
  name: string;
  /** 반려동물 종 분류 ('DOG' | 'CAT' | 'RABBIT' | 'HAMSTER' | 'GUINEAPIG' | 'CHINCHILA' | 'OTHER') */
  species: PetSpecies;
  /** 직접 입력한 동물 종류 ('OTHER'인 경우, 예: '페럿', '고슴도치') */
  custom_species?: string | null;
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

/** 1-4. 시간대별 체중·체장 성장 기록 (pet_growth_logs 테이블) */
export interface PetGrowthLog {
  id: number;
  pet_id: string;
  weight_kg: number | null;
  body_length_cm: number | null;
  age_months_at_log: number | null;
  memo: string | null;
  measured_at: string;
  created_at: string;
}

/** 1-5. 나이별 아바타 프로필 앨범 (pet_avatars 테이블) */
export interface PetAvatar {
  id: number;
  pet_id: string;
  avatar_url: string;
  age_years: number | null;
  age_months: number | null;
  age_label: string | null;
  taken_date: string | null;
  is_current: boolean | number;
  created_at: string;
}

/** 1-6. 질병 마스터 (pet_diseases 테이블) */
export interface PetDisease {
  id: number;
  pet_id: string;
  disease_name: string;
  status: PetDiseaseStatus;
  diagnosed_date: string | null;
  cured_date: string | null;
  hospital_name: string | null;
  summary_memo: string | null;
  /** 타인에게 공개 여부 (0: 비공개 / 1: 공개) */
  is_public: boolean | number;
  created_at: string;
  updated_at: string;
}

/** 1-7. 질병별 상세 치료 타임라인 (pet_disease_histories 테이블) */
export interface PetDiseaseHistory {
  id: number;
  pet_disease_id: number;
  recorded_at: string;
  status_at_record: PetDiseaseStatus;
  treatment_note: string;
  photo_url: string | null;
  cost_krw: number | null;
  created_at: string;
}
