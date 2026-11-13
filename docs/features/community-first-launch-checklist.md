# 커뮤니티 선오픈(스토어 · 포인트 · 체험단 비활성화) 전환 체크리스트

## 1. 목적
커뮤니티(피드, 반려동물 프로필, AI 건강 수첩, 케어 저니)를 먼저 오픈하고 **스토어 · 포인트 · 체험단 기능은 추후 오픈**할 때, 기존 코드를 삭제하지 않고 **Feature Flag 스위치**로 안전하게 숨기고 재오픈 시 즉시 복구하기 위한 작업 체크리스트입니다.

---

## 2. 권장 Feature Flag 설계
- **프론트엔드 (`waba/frontend/.env.local`):**
  - `NEXT_PUBLIC_ENABLE_STORE=false` (스토어·장바구니·주문·포인트·체험단 UI 전체 숨김)
  - `NEXT_PUBLIC_ENABLE_EXTERNAL_AFFILIATE=true` (외부 쇼핑몰 제휴 핀 유지 여부 선택)
- **백엔드 (`waba/backend/config/.env`):**
  - `ENABLE_STORE_POINTS=false` (글 작성/활동 리워드 포인트 적립 및 스토어 결제/주문 API 비활성화)
  - `ENABLE_TRIAL_GROUP=false` (체험단 모집/신청/당첨/후기 연동 API 비활성화)

---

## 3. 숨김 및 비활성화 대상 목록

### 3.1 프론트엔드 UI 숨김 대상
1. **상단 헤더 & 네비게이션 (`HeaderClient.tsx`, `UserIcon.tsx`)**
   - 스토어/쇼핑 메뉴, **체험단 메뉴/배너** 링크 숨김
   - 장바구니 아이콘, 주문/배송, 보유 포인트 표시 영역 숨김
2. **통합 검색 (`SearchModal.tsx`, `SearchClient.tsx`)**
   - 검색 결과 내 스토어 상품 및 **체험단 관련 탭/섹션** 숨김 (커뮤니티 게시글·반려동물·사용자 검색만 노출)
3. **게시글 에디터 (`editor-components/PinRegistrationModal.tsx`, `FeedPreviewPane.tsx`, `editor.tsx`)**
   - 핀 등록 모달의 **공식 스토어 상품(`INTERNAL_PRODUCT`) 탭** 숨김
   - 에디터 우측/하단 **리워드·포인트 혜택 계산기** 안내 UI 숨김
   - **체험단 후기 연동/선택 UI**가 있는 경우 숨김
   - *(선택)* 외부 쇼핑몰 제휴 핀(`EXTERNAL_PRODUCT`)은 유지하거나, 커뮤니티 순수 오픈 정책에 따라 함께 숨김 결정
4. **게시글 상세 (`PostDetail.tsx`, `PostProductPinList.tsx`, `PostImagePins.tsx`)**
   - `INTERNAL_PRODUCT` 핀, **체험단 후기 배지/링크**, 스토어 상품 구매 유도 배너/포인트 안내 숨김
5. **마이페이지 (`member/mypage`)**
   - 보유 포인트 잔액, 포인트 적립/사용 내역, 장바구니, 주문/배송 내역, **체험단 신청/당첨/미션 내역** 관련 탭·카드 숨김
6. **스토어 · 체험단 전용 라우트 가드**
   - 스토어·장바구니·결제·**체험단 페이지** URL 직접 접근 시 "오픈 준비 중" 안내 또는 메인 피드(`/`)로 리다이렉트

### 3.2 백엔드 비활성화 대상
1. **포인트 적립 중단 (`ENABLE_STORE_POINTS=false`)**
   - 커뮤니티 선오픈 기간 중 포인트가 백그라운드에서 누적되어 추후 스토어 오픈 시 정산 혼선이 생기지 않도록, 게시글/댓글/활동 리워드 포인트 지급 로직 비활성화
2. **스토어/주문/장바구니 & 체험단 API 가드 (`ENABLE_TRIAL_GROUP=false`)**
   - 비활성 상태에서 스토어 주문·결제·포인트 사용 및 **체험단 모집·신청 API** 호출 시 `503 Service Unavailable` (또는 `"오픈 준비 중입니다."`) 반환

---

## 4. 추후 스토어 · 체험단 정식 오픈 시 복구 절차
1. `NEXT_PUBLIC_ENABLE_STORE=true`, `ENABLE_STORE_POINTS=true`, `ENABLE_TRIAL_GROUP=true`로 전환
2. 기존 테스트용 상품/포인트/체험단 데이터 초기화 여부 확인
3. 헤더 · 마이페이지 · 에디터 상품 핀 · 포인트 적립 · 체험단 신청/후기 플로우 E2E QA 후 배포
