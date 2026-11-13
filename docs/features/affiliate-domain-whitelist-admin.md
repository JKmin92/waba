# 외부 쇼핑몰 제휴 링크 화이트리스트 & 추후 Admin 관리 기능 설계

## 1. 개요
게시글 이미지의 상품 핀(`product_url`)에 악성·피싱·해킹 유도 링크가 삽입되는 것을 방지하기 위해, **검증된 제휴 쇼핑몰 도메인만 등록할 수 있는 화이트리스트(Allowlist)**를 운영합니다.

---

## 2. 현재 구현된 기반 구조 (Phase 1)

### 2.1 DB 테이블 (`allowed_affiliate_domains`)
```sql
CREATE TABLE IF NOT EXISTS allowed_affiliate_domains (
    id INT AUTO_INCREMENT PRIMARY KEY,
    domain VARCHAR(255) NOT NULL UNIQUE,
    mall_name VARCHAR(100) NOT NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```
- **기본 시드 도메인:** `coupang.com`, `link.coupang.com`, `smartstore.naver.com`, `brand.naver.com`, `shopping.naver.com`, `naver.me`, `11st.co.kr`, `gmarket.co.kr`, `auction.co.kr`, `ssg.com`, `kurly.com`, `pet-friends.co.kr`, `oliveyoung.co.kr`

### 2.2 서버 URL 검증 규칙
- `new URL(rawUrl)` 파싱 실패 시 차단 (`400 Bad Request`)
- 프로토콜은 `http:` / `https:`만 허용 (`javascript:`, `data:` 등 XSS 스킴 차단)
- 호스트(`hostname.toLowerCase()`)가 활성(`is_active = 1`) 도메인과 **정확히 일치하거나 서브도메인(`.domain`)으로 끝나는 경우만 허용**
  - 예: `https://www.coupang.com/...` → 허용
  - 예: `https://coupang.com.evil.com/...`, `https://evil.com/?r=coupang.com` → **차단**

---

## 3. 추후 Admin 페이지 확장 스펙 (Phase 2)

### 3.1 Admin API 설계 (관리자 권한 미들웨어 필수)
- `GET /api/admin/affiliate-domains`: 전체 허용 도메인 목록 조회 (`is_active` 필터 및 검색 지원)
- `POST /api/admin/affiliate-domains`: 신규 쇼핑몰 도메인 추가
  - 입력: `{ domain, mall_name, is_active }`
  - 서버에서 도메인 정규화(소문자, 프로토콜/경로 제거, 공백/와일드카드 차단) 및 중복 검사
- `PATCH /api/admin/affiliate-domains/:id`: 도메인 활성/비활성(`is_active`) 토글 및 쇼핑몰명 수정
- `DELETE /api/admin/affiliate-domains/:id`: 도메인 삭제 (실운영에서는 기존 핀 보존을 위해 삭제보다 `is_active = 0` 비활성화 권장)

### 3.2 Admin UI 화면 구성
1. **제휴 도메인 목록 테이블**
   - 컬럼: 쇼핑몰명 (`mall_name`), 도메인 (`domain`), 상태 토글 (`ON/OFF`), 등록일, 수정/삭제 버튼
2. **신규 도메인 등록 모달/폼**
   - 쇼핑몰명 입력, 도메인 입력 (예: `coupang.com` 또는 URL 붙여넣기 시 자동 호스트 추출)
3. **사전 테스트 입력창**
   - 관리자가 특정 상품 URL을 붙여넣어 현재 화이트리스트 통과 여부를 즉시 테스트해 볼 수 있는 검증기

### 3.3 운영 및 보안 고려사항
- **기존 게시글 영향:** 특정 도메인을 `is_active = 0`으로 비활성화하면 **신규 등록/수정**부터 차단됩니다. 이미 등록된 악성/문제가 된 링크까지 막아야 한다면, 링크 클릭 시점에 도메인 활성 여부를 한 번 더 체크하거나 배치로 비활성화할 수 있습니다.
- **프론트엔드 UX 연동:** 향후 `GET /api/post/allowed-domains` (활성 도메인 목록 공개 조회)를 연결하면, 에디터 상품 핀 입력창에서도 등록 가능한 쇼핑몰 안내 문구 표시 및 사전 검증이 가능합니다.
- **외부 링크 속성:** 상품 링크 렌더링 시 `target="_blank" rel="noopener noreferrer nofollow"`를 유지합니다.
