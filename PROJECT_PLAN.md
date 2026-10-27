# 🐾 WABA (와바 — by WABAMI) 반려동물 인터랙티브 룩북 · 커뮤니티 & 커머스 기획서

> **플랫폼 명칭:** **WABA (와바)** — *"우리 집 펫-리빙 룩북과 케어 노하우, 구경 와바! (Curated by WABAMI)"*
> **문서 목적:** 사내 제안 및 본격적인 개발에 앞서 프로젝트의 핵심 컨셉, 상호작용(UX) 기획, 외부 상품 연동 전략, 확정된 기술 스택을 정리한 마스터 기획 문서입니다.

---

## 1. 프로젝트 개요 및 비전
* **배경:** 반려동물 전문가들이 모여 만든 브랜드 '와바미'의 기존 회사 소개형 사이트에서 발전하여, 유저들이 직접 소통하고 소비하는 **상호작용형 플랫폼(웹 + 앱)** 구축
* **핵심 정체성 (Core Identity):**
  1. **펫-리빙 라이프스타일 쇼케이스 (Lifestyle & Wannabe):** 단순히 사료·간식만 다루는 것이 아니라, *"고양이가 긁어도 안 뜯기는 소파"*, *"강아지 털 안 붙는 침구"* 등 **'반려동물과 함께하는 나의 멋진 공간과 라이프스타일'**을 자랑하고 공유하는 공간 (쿠팡·스마트스토어 외부 상품 연동의 핵심 이유)
  2. **지식 뽐내기 & 궁금증 해결 라운지 (Knowledge & Care):** 반려동물에 대한 자신만의 육아 노하우·전문 지식을 멋지게 뽐내고, 궁금증을 해결하는 품격 있는 지식 채널
* **핵심 구조:** `라이프스타일 스냅(이미지 상품 태그)` + `지식/케어 라운지` + `와바미 스토어 & 리워드 리뷰(체험단)`
* **주 타겟층:** 20~30대 여성 중심 (나와 내 반려동물의 멋진 라이프스타일을 표현하고 싶은 모든 반려인)

---

## 2. 디자인 디렉션 & 컬러 시스템 (Design System)

'오늘의집' 같은 전단지형 쇼핑몰 느낌이나 유아틱한 귀여움을 배제하고, **29CM · 무신사 스냅 · 핀터레스트 스타일의 세련된 에디토리얼(매거진) 무드**를 지향합니다.

* **디자인 철학:** *"유저가 올리는 사진과 지식이 하나의 '매거진 화보'와 '칼럼'처럼 멋져 보이게 만드는 세련된 액자(UI)"*
* **컬러 팔레트 (95% 모노톤 + 5% 브랜드 포인트):**
  * **Base (90%):** 오프화이트(`#FAFAFA`), 퓨어화이트(`#FFFFFF`), 라이트 그레이(`#F4F4F5`) — 사진이 가장 돋보이는 깨끗한 여백
  * **Typography & Contrast (5%):** 딥 차콜/블랙(`#141416`), 미드 그레이(`#71717A`) — 매거진처럼 힘 있고 시크한 타이포그래피
  * **Brand Accent (5% 미만): 와바미 시그니처 퍼플 (`#6338A9`)**
    * 넓은 면적에 쓰지 않고, **와바미 공식/멘토 인증 뱃지, 사진 위 활성화된 핀(Pin) 포인트, 리워드 아이콘** 등 시선이 멈춰야 하는 결정적 순간에만 보석처럼 작게 사용하여 고급스러움 극대화

---

## 2. 확정 기술 스택 (Tech Stack)

개발 생산성과 기존 숙련도, 향후 앱 확장성을 고려하여 **프론트엔드와 백엔드를 명확히 분리한 구조**로 진행합니다.

| 구분 | 기술 스택 | 선정 이유 및 역할 |
| :--- | :--- | :--- |
| **Frontend (웹)** | **Next.js (React 기반)** | • 커뮤니티 게시글 및 쇼핑몰 상품의 **네이버/구글 검색 노출(SEO)** 확보<br>• 카카오톡/SNS 링크 공유 시 게시글별 **동적 미리보기(OG 태그)** 지원 |
| **UI Framework** | **Chakra UI** | • 이전 프로젝트 경험을 살려 빠른 UI 개발 및 반응형 레이아웃 구현<br>• `Drawer`(바텀시트), `Popover`(상품 핀 툴팁), `Badge` 등 핵심 UX 컴포넌트 활용<br>• *디자인 보완:* 1040 여성 타겟에 맞춘 커스텀 테마(둥근 모서리, 웜톤 컬러, Pretendard 폰트) 적용 |
| **Backend (서버)** | **Node.js + Express** | • 프론트엔드와 물리적으로 분리된 독립 API 서버로 **보안성 및 안정성** 확보<br>• 쇼핑몰 결제 검증, 리워드 포인트 적립/차감, 인증/권한, 외부 API 연동 전담 |
| **Database (DB)** | **MySQL** | • 기존 프로젝트 숙련도가 높고, 유저-반려동물-게시글-이미지핀-상품-포인트 간의 정합성 및 트랜잭션 처리에 최적화된 관계형 DB |
| **Mobile App** | **React Native (Expo WebView)** | • Next.js 모바일 웹을 앱으로 감싸 개발 공수를 줄이고, 푸시 알림·카메라·스마트폰 자체 URL 메타데이터 파싱 기능 연동 |

---

## 3. 핵심 기능 및 상호작용(Interaction) 기획

### ① 이미지 내 상품 태그 (Pin) & 다종·다둥이(Multi-Pet) 스펙 연동
* **사진 위 좌표 핀(`+`) 등록:** 유저가 커뮤니티에 사진을 올릴 때 특정 위치를 클릭해 상품 정보를 매핑
* **다종·다둥이(강아지+고양이, 고양이+토끼 등) 맞춤형 연동:**
  * 반려인이 한 종류의 동물만 키우지 않고 **강아지+고양이, 고양이+토끼 등을 함께 키우는(합사/다둥이) 현실**을 반영하여, 1명의 유저가 여러 종의 반려동물을 가족으로 등록(`1:N`) 가능
  * 하나의 상품 핀(예: 거실 매트, 소파, 안전문)에 **`🐶 초코 + 🐱 루이 함께 사용`**처럼 **여러 반려동물을 복수 선택(`N:M` 매핑)**하거나, 한 사진 안에서도 핀마다 다른 반려동물 스펙을 연결할 수 있도록 설계
* **구매 전환 효과:** 다른 유저가 핀을 클릭하면 상품 정보와 함께 실제 사용한 아이들의 종/몸무게/품종/기호성 정보가 툴팁으로 노출됨

### ② 반려동물 프로필 기반 맞춤 연결 & '합사 라이프스타일' 특화
* **멀티 프로필 요약 뱃지 노출:** 다종 반려 가구의 경우 작성자 닉네임 옆에 `🐱 랙돌 4.8kg · 🐰 렉스 2.1kg 함께 사는 집` 형태의 뱃지를 자동 노출
* **단일 선택이 아닌 '멀티 필터링':** 기존 펫 앱들처럼 '강아지 앱 / 고양이 앱'을 강제로 쪼개지 않고, 내가 키우는 동물 조합(예: `고양이 + 토끼` 동시 선택)에 맞춘 통합 큐레이션 제공
* **독점 콘텐츠 ('합사/공존 공간 세팅'):** 단일 동물 카페(강사모, 고다 등)에서는 다루기 힘든 *"강아지와 고양이가 함께 사는 거실 수직/수평 동선"*, *"고양이와 토끼 공간 분리 인테리어"* 등 다종 반려 가구만의 라이프스타일 & 노하우 집중 조명
* **목적별 탐색 분리:** 질병이나 고민(예: `#비절병`, `#슬개골`) 검색 시 단순 일상글이 섞이지 않도록 **[1. 추천 상품/리뷰]**, **[2. 케어 노하우/질문글]**, **[3. 같은 구성의 반려 가족 프로필]** 탭으로 분리

### ③ '와바미 인증 멘토 집사' 뱃지 시스템 (트랙 분리 & 선발 기준)
* **2가지 멘토 트랙:**
  * **🟣 케어 멘토 (지식형):** 질병, 영양, 합사 노하우 등 깊이 있는 지식과 답변을 제공하는 선배 집사
  * **⚫ 스타일 멘토 (감각형):** 감각적인 리빙 공간 스냅과 유용한 상품 태그를 공유하는 크리에이터 집사
* **선발 기준 (도배 방지를 위한 질적 지표 적용):**
  * **기본 자격:** 반려동물 프로필 100% 입력 + 양육 경력 1년 이상
  * **활동 기준:** 단순 '좋아요'가 아닌, 타 유저의 **‘스크랩(저장) 누적 30회 이상’** 또는 질문글 답변 **‘도움됐어요(채택) 5회 이상’** 달성 시 자동 승급 *(오픈 초기 1~3개월은 양질의 노하우 칼럼 1편 작성 시 '1기 명예 멘토'로 관리자 심사 승인)*
* **멘토 혜택:** 닉네임 옆 `#6338A9` 퍼플 멘토 뱃지, 질문글 답변 시 최상단 고정 노출, 자사몰 태그 리워드율 우대(기본 3% → 멘토 5~7%), 체험단 우선 선정권

### ④ 쇼핑몰 & 리워드(체험단/어필리에이트) 구조
* **리워드 리뷰(체험단):** 쇼핑몰 구매 제품에 대해 양질의 포토 리뷰 및 커뮤니티 태그 작성 시 포인트 리워드 지급
* **태그 구매 리워드:** 내가 게시글에 태그한 **와바미 자사몰 상품**을 다른 유저가 클릭해 구매할 경우 결제 금액의 일부를 포인트로 적립

### ⑤ 10~40대 여성 타겟 맞춤형 감성 액션
* **유저 자율 투표:** 인스타그램처럼 게시글/질문에 유저가 마음껏 사진·텍스트 투표(예: *"1번 옷 vs 2번 옷 골라주세요!"*)를 추가하는 기능
* **커스텀 리액션 스탬프:** 단순 '좋아요' 외에 상황에 맞는 감성 스탬프(`심장폭행💘`, `궁디팡팡👋`, `아프지마💊`, `꿀팁감사📝`) 제공
* **디지털 반려동물 주민증 & 네컷 프레임:** 프로필 등록 시 SNS 공유용 귀여운 동물 주민증 이미지를 자동 생성해 초기 바이럴 유도
* **주간 미니 콘테스트:** 매주 가벼운 사진 주제(예: *"가장 웃기게 자는 자세"*)를 열고 최다 스탬프 획득자에게 포인트 및 프로필 테두리 보상

---

## 4. 외부 쇼핑몰(쿠팡 / 네이버 스마트스토어) 상품 연동 전략

자사몰 상품 외에 외부 상품 URL도 자유롭게 태그할 수 있도록 하되, 봇 차단(403) 없이 **최소한 상품명과 썸네일 이미지**를 100% 가져오는 하이브리드 구조입니다.

1. **앱 내 [상품명 통합 검색] 제공 (1순위 UX):**
   * 유저가 번거롭게 외부 앱에서 URL을 복사해 오지 않아도 되도록, 핀 등록 창에서 바로 키워드 검색 제공
   * **쿠팡 파트너스 검색 API** 및 **네이버 쇼핑 검색 API**를 호출하여 공식 상품명, 고화질 썸네일, 가격, 링크를 즉시 매핑 (쿠팡은 수익 코드 자동 변환 포함)
2. **외부 URL 직접 붙여넣기 시 우회 파싱:**
   * **쿠팡 URL:** 쿠팡 파트너스 `Deeplink API`로 링크 변환 + 검색 API 또는 클라이언트 파싱으로 메타데이터 확보
   * **네이버 스마트스토어 / 일반 쇼핑몰 URL:**
     * **모바일 앱 유저:** 서버가 아닌 **유저 스마트폰(앱 네트워크)**에서 직접 URL의 Open Graph(`og:title`, `og:image`)를 읽어 서버로 전달 (데이터센터 IP 차단 완벽 우회)
     * **웹 브라우저 유저:** Node.js(Express) 서버에서 메신저 프리뷰 헤더 또는 경량 프록시를 통해 메타데이터 추출
   * **폴백(Fallback) 처리:**만약 메타데이터가 없는 특수 링크일 경우, 유저가 찍은 핀 좌표 주변 사진을 동그랗게 자동 크롭(Crop)하여 기본 썸네일로 사용


---

## 5. 기존 플랫폼(인스타그램·네이버 카페) 대비 차별성 및 성장 전략

### ① 왜 유저들이 인스타·카페 대신 와바미로 오는가? (4대 차별화 무기)
1. **정보 구걸(DM)과 링크 강퇴의 해방 + 수익화:** 인스타에선 못 거는 상품 링크, 네이버 카페에선 강퇴당하는 스마트스토어 링크를 합법적으로 사진에 태그하고, 구매 발생 시 리워드 포인트까지 적립받음
2. **다종·다둥이(강아지+고양이, 고양이+토끼) 통합 공간:** 강아지 카페·고양이 카페·토끼 카페를 따로 돌아다닐 필요 없이, 여러 동물을 함께 키우는 가구의 합사 노하우와 공용 리빙템(소파, 매트, 안전문 등)을 한곳에서 해결
3. **1초 스펙 필터링:** 카페 글 100개를 뒤질 필요 없이 내 아이와 같은 종·몸무게·질병(`#비절병`, `#슬개골`)을 가진 집사들이 실제로 가장 많이 태그한 검증된 상품만 즉시 모아보기
4. **와바미 전문가 공식 보증:** 비전문가의 위험한 '카더라 통신' 대신, 와바미 전문가 집단이 우수 케어 칼럼에 공식 인증 마크를 부여하여 신뢰도 확보

### ② 방문자 급등 예상 시기 (런칭 후 3~4개월 차) 및 근거
* **1~2개월 차 (시드 축적):** 와바미 리워드 체험단을 통해 매주 양질의 라이프 스냅 및 케어 칼럼 300~400건 강제 축적
* **3~4개월 차 (1차 점프):** `Next.js` SSR 기반 게시글들이 네이버·구글 검색엔진에 본격 색인(90일 주기)되며 `"고양이 안 뜯기는 소파"`, `"토끼 비절병 매트"` 등 롱테일 검색 유입 폭발 + 오픈채팅방 역바이럴 발생

### ③ 트래픽 정체 시 대응 시나리오 (Plan B)
* **글쓰기 허들 문제 (집 전체 사진 부담):** 거실 전체가 아닌 *"우리 애 밥그릇/매트 한 뼘 클로즈업 스냅"* 테마로 진입 장벽 완화 및 국민템 100선 원클릭 태그 지원
* **체리피커(체험단 먹튀) 문제:** 기본 작성 리워드 외에, 타 유저의 핀 클릭/스크랩 수에 비례한 추가 리워드를 지급하여 작성자가 스스로 본인 SNS에 와바미 링크를 공유하도록 유도


---

## 6. 초기 마케팅 4단계 로드맵 (Go-To-Market)

대규모 초기 광고비 지출 없이, 와바미의 기존 브랜드 자산과 플랫폼의 구조적 매력을 활용해 초기 진성 유저와 시드 콘텐츠를 확보하는 전략입니다.

### 1단계: 오픈 2주 전 (Pre-launch) — ‘1기 공식 멘토(크리에이터) 50명’ 사전 섭외
* **목표:** 정식 오픈 전 사이트 내에 최소 100~150개의 고감도 공간 스냅 및 케어 칼럼 확보 ('빈집' 문제 완전 해결)
* **실행:** 인스타그램/블로그에서 팔로워 500~3,000명 규모의 감각적인 집사 및 다종 반려(강아지+고양이, 고양이+토끼 등) 고수 50명에게 DM 제안
* **혜택:** 와바미 5만 원 상당 본품 키트 무상 제공 + 1기 공식 멘토 뱃지(`#6338A9`) 부여 + 본인 사진 핀을 통한 구매 발생 시 평생 5~7% 리워드 우대

### 2단계: 오픈 직후 (1개월 차) — 와바미 제품 택배 박스 ‘시크릿 리워드 초대장’ 동봉
* **목표:** 마케팅 비용 0원으로 기존 와바미 구매 고객을 플랫폼 초기 업로더로 전환
* **실행:** 자사몰/스마트스토어 출고 택배 박스에 29CM 감성의 블랙 & 퍼플 리워드 티켓 동봉
* **내용:** 구매 제품을 반려동물이 먹는 모습이나 거실 공간과 함께 [와바미 스냅]에 핀 태그로 올리면 즉시 3,000P 지급 + 타 유저 구매 시 5% 지속 적립

### 3단계: 오픈 1~2개월 차 — SNS 자발적 확산(바이럴) 2대 장치 가동
* **① 인스타 스토리 공유용 ‘펫-리빙 매거진 커버 발급기’:** 반려동물 사진과 스펙 입력 시 잡지 표지 스타일의 세련된 프로필 카드를 1초 만에 생성해 주어 인스타그램 자발적 공유 유도
* **② 특수 고민 & 합사 가구 핀셋 카드뉴스:** *"랙돌 2마리 키우는 집의 안 뜯기는 소파 TOP 4"*, *"강아지+고양이 합사 거실 배치법"*, *"비절병 토끼 매트 종결 루틴"* 등 클릭률이 높은 구체적 주제로 타겟 유입

### 4단계: 오픈 2~3개월 차 — "인스타 프로필 링크를 와바미로!" 캠페인
* **목표:** 인스타그램 반려동물 계정 운영자들의 팔로워 트래픽을 와바미로 상시 흡수
* **실행:** 인스타 댓글/DM으로 반복되는 *"소파 어디 거예요?", "매트 정보 좀요"* 질문에 지친 집사들에게, 본인 인스타 프로필 링크에 **‘와바미 내 공간 스냅 페이지’**를 걸어두도록 유도 (정보 공유 자동화 + 리워드 수익 창출)


---

## 7. 하이브리드 룩북(Lookbook) 운영 및 DB 아키텍처 메모 (추후 개발 반영)

사이트의 세련된 시각적 퀄리티를 365일 유지하면서 유저의 참여 욕구(명예욕 + 리워드 수익)를 극대화하기 위한 **‘공식 제작 룩북 + 유저 승격 룩북’** 이원화 구조입니다.

### ① 하이브리드 룩북 노출 구조
1. **와바미 공식 룩북 (WABAMI Original):**
   * 관리자가 **AI 생성 이미지(반려동물+제품 연출)** 및 **직접 촬영한 고감도 화보**를 업로드하고, 이미지 내 와바미 상품 핀(Pin)을 매핑하여 메인 쇼룸의 기본 퀄리티를 보장
2. **유저 커뮤니티 스냅 & 룩북 승격 (User Curated Lookbook):**
   * 일반 유저는 커뮤니티에 자유롭게 사진을 등록하며, 아래 기준 충족 시 메인 **[공식 룩북]** 영역으로 승격 노출됨
   * **승격 프로세스:** `상품 핀 1개 이상 포함` + `타 유저 리액션(스탬프/스크랩) 기준치 달성` → 관리자 페이지 `[룩북 승격 후보]` 자동 등록 → 관리자 원클릭 승인 시 메인 룩북 노출 및 `[👑 LOOKBOOK 선정]` 뱃지·보너스 포인트 자동 지급

---

## 8. MySQL 데이터베이스(DB) 상세 스키마 설계 (1~4단계 확정본)

### [1단계] 회원 (`users`) 및 반려동물 생애주기·질병 (`pets` 관련 5개 테이블)

#### 1-1. `users` (회원 테이블)
* **ID 생성 규칙:** `랜덤숫자 3자 + YYMMDDHHmm + 이메일 앞 3자` (`VARCHAR(30)`, `AUTO_INCREMENT` 미사용)
* **주요 컬럼:**
  * `id` (`VARCHAR(30)`, PK, NOT NULL): 예) `4822610211430kim`
  * `email` (`VARCHAR(255)`, UNIQUE, **NOT NULL**): 실제 로그인 시 입력할 아이디 (NULL 불허)
  * `password_hash` (`VARCHAR(255)`, NULL 허용): 비밀번호 암호화 값
  * `auth_provider` (`VARCHAR(20)`, NOT NULL, DEFAULT `'LOCAL'`): 가입 경로 (`LOCAL`, `KAKAO`, `NAVER`, `APPLE`)
  * `provider_id` (`VARCHAR(255)`, NULL 허용): 소셜 로그인 식별자
  * `nickname` (`VARCHAR(50)`, UNIQUE, NOT NULL): 활동 닉네임
  * `profile_image_url` (`VARCHAR(500)`, NULL 허용), `bio` (`VARCHAR(300)`, NULL 허용)
  * `role` (`VARCHAR(20)`, NOT NULL, DEFAULT `'USER'`): `USER`, `VET`(수의사), `EDITOR`, `ADMIN`
  * `mentor_badge` (`VARCHAR(30)`, NOT NULL, DEFAULT `'NONE'`): `NONE`, `STYLE_MENTOR`, `CARE_MENTOR`, `DUAL_MENTOR`
  * `vet_license_info` (`VARCHAR(255)`, NULL 허용): 수의사 면허/소속 메모
  * `is_multi_species` (`TINYINT(1)`, NOT NULL, DEFAULT `0`): 다종 합사 가구 여부
  * `reward_points` (`INT UNSIGNED`, NOT NULL, DEFAULT `0`): 보유 와바미 리워드 포인트
  * `follower_count`, `following_count` (`INT UNSIGNED`, DEFAULT `0`)
  * `status` (`VARCHAR(20)`, NOT NULL, DEFAULT `'ACTIVE'`), `last_login_at`, `created_at`, `updated_at`

#### 1-2. `pets` (반려동물 기본 프로필 테이블)
* **ID 생성 규칙:** `랜덤숫자 4자 + YYMMDDHHmm` (`VARCHAR(20)`, `AUTO_INCREMENT` 미사용)
* **주요 컬럼:**
  * `id` (`VARCHAR(20)`, PK, NOT NULL): 예) `83912610211430`
  * `user_id` (`VARCHAR(30)`, FK -> `users.id`, NOT NULL)
  * `name` (`VARCHAR(50)`, NOT NULL): 반려동물 이름
  * `species` (`ENUM('DOG', 'CAT', 'RABBIT', 'HAMSTER', 'GUINEAPIG', 'CHINCHILA', 'OTHER')`, NOT NULL): 종 분류 (강아지, 고양이, 토끼, 햄스터, 기니피그, 친칠라, 기타)
  * `breed` (`VARCHAR(100)`, NOT NULL): 세부 품종
  * `birth_date` (`DATE`, NULL 허용), `gender` (`VARCHAR(10)`, DEFAULT `'UNKNOWN'`), `is_neutered` (`TINYINT(1)`, DEFAULT `0`)
  * `latest_weight_kg` (`DECIMAL(5, 3)`, NULL 허용): 최근 기록 체중 캐시 (소동물 g 단위 대응을 위해 소수점 3자리)
  * `latest_body_length_cm` (`DECIMAL(5, 1)`, NULL 허용): 최근 기록 체장(cm) 캐시
  * `current_avatar_url` (`VARCHAR(500)`, NULL 허용): 현재 대표 아바타 이미지 URL
  * `is_primary` (`TINYINT(1)`, DEFAULT `0`): 대표 반려동물 여부
  * **`ai_private_data_consent`** (`TINYINT(1)`, NOT NULL, DEFAULT `0`): 본인이 AI 질문 시 비공개 반려동물 건강/질병 이력을 열람·참고하는 것에 대한 본인 사전 동의 여부 (`agreed_at DATETIME NULL` 포함)
  * `created_at`, `updated_at`

#### 1-3. `pet_growth_logs` (시간대별 체중·체장 성장 기록 테이블)
* 매일/시간별/월별 등 자유로운 주기로 체중과 등길이를 기록하고 시기별 변화를 조회하는 테이블
* **주요 컬럼:**
  * `id` (`BIGINT UNSIGNED`, PK, AUTO_INCREMENT)
  * `pet_id` (`VARCHAR(20)`, FK -> `pets.id`, NOT NULL)
  * `weight_kg` (`DECIMAL(5, 3)`, NULL 허용): 측정 체중(kg)
  * `body_length_cm` (`DECIMAL(5, 1)`, NULL 허용): 측정 등길이/체장(cm)
  * `age_months_at_log` (`INT UNSIGNED`, NULL 허용): 측정 당시 개월 수
  * `memo` (`VARCHAR(255)`, NULL 허용): 측정 메모
  * `measured_at` (`DATETIME`, NOT NULL, INDEX): 실제 측정 일시 (시간대별 입력 지원)
  * `created_at` (`DATETIME`)

#### 1-4. `pet_avatars` (나이별 아바타 프로필 앨범 테이블)
* 반려동물의 성장 과정(나이/개월별)에 따라 프로필 사진을 시기별로 저장하는 테이블
* **주요 컬럼:**
  * `id` (`BIGINT UNSIGNED`, PK, AUTO_INCREMENT)
  * `pet_id` (`VARCHAR(20)`, FK -> `pets.id`, NOT NULL)
  * `avatar_url` (`VARCHAR(500)`, NOT NULL): 아바타 이미지 URL
  * `age_years` (`INT UNSIGNED`, NULL 허용), `age_months` (`INT UNSIGNED`, NULL 허용)
  * `age_label` (`VARCHAR(50)`, NULL 허용): 표시용 나이 라벨 (예: `생후 3개월`, `2살`)
  * `taken_date` (`DATE`, NULL 허용), `is_current` (`TINYINT(1)`, DEFAULT `0`), `created_at`

#### 1-5. `pet_diseases` & `pet_disease_histories` (질병 및 치유 히스토리 테이블)
* **`pet_diseases` (보유/과거 질병 마스터):**
  * `id` (`BIGINT UNSIGNED`, PK, AUTO_INCREMENT)
  * `pet_id` (`VARCHAR(20)`, FK -> `pets.id`, NOT NULL)
  * `disease_name` (`VARCHAR(100)`, NOT NULL): 질병/증상명 (예: `비절병`, `심장질환`, `슬개골 탈구`)
  * `status` (`VARCHAR(30)`, NOT NULL, DEFAULT `'TREATING'`):
    * `TREATING` (치료중)
    * `CURED_OBSERVING` (**완치 판정(관찰중)**)
    * `CURED` (**완치**)
    * `CHRONIC_MANAGING` (만성 관리중)
  * `diagnosed_date` (`DATE`, NULL 허용), `cured_date` (`DATE`, NULL 허용), `hospital_name` (`VARCHAR(100)`, NULL 허용), `summary_memo` (`VARCHAR(500)`, NULL 허용)
  * **`is_public`** (`TINYINT(1)`, NOT NULL, DEFAULT `0`): 타인에게 공개 여부 (`0`: 비공개 — 타인의 AI 질문 시 절대 참조 불가 / `1`: 공개 — 익명화된 사례로만 활용 가능)
  * `created_at`, `updated_at`
* **`pet_disease_histories` (질병별 상세 치료 타임라인):**
  * `id` (`BIGINT UNSIGNED`, PK, AUTO_INCREMENT)
  * `pet_disease_id` (`BIGINT UNSIGNED`, FK -> `pet_diseases.id`, NOT NULL)
  * `recorded_at` (`DATETIME`, NOT NULL): 기록 일시
  * `status_at_record` (`VARCHAR(30)`, NOT NULL): 기록 시점의 상태 (`TREATING`, `CURED_OBSERVING`, `CURED` 등)
  * `treatment_note` (`TEXT`, NOT NULL): 치료 및 환경 개선 상세 내용
  * `photo_url` (`VARCHAR(500)`, NULL 허용), `cost_krw` (`INT UNSIGNED`, NULL 허용), `created_at`

---

### [2단계] 커뮤니티 (`boards`, `posts`, `post_images`, `comments` 등)

#### 2-1. `boards` (확장형 게시판 마스터 테이블)
* 게시판 종류가 추가·수정될 수 있으므로 `ENUM` 대신 별도 마스터 테이블로 분리
* **주요 컬럼:** `id` (`VARCHAR(30)`, PK), `name` (`VARCHAR(50)`, NOT NULL), `description` (`VARCHAR(200)`), `allow_product_pins` (`TINYINT(1)`), `allow_vet_verify` (`TINYINT(1)`), `min_write_role` (`VARCHAR(20)`), `sort_order`, `is_active`, `created_at`

#### 2-2. `posts` (게시글 마스터 테이블 — 반려동물 중심 설계)
* 불필요한 `source_type`, `space_type`(공간 구분), 게시글 단위의 `ai_metadata`를 제거하고 **반려동물과 제품 태그 중심**으로 정돈
* **주요 컬럼:**
  * `id` (`VARCHAR(25)`, PK, NOT NULL): 예) `P + 랜덤숫자3자 + YYMMDDHHmm`
  * `board_id` (`VARCHAR(30)`, FK -> `boards.id`, **NOT NULL**)
  * `user_id` (`VARCHAR(30)`, FK -> `users.id`, NOT NULL)
  * `curation_grade` (`VARCHAR(30)`, NOT NULL, DEFAULT `'NORMAL_FEED'`): `NORMAL_FEED`, `LOOKBOOK_CANDIDATE`, `MAIN_LOOKBOOK`
  * **`title`** (`VARCHAR(150)`, **NOT NULL**): 제목 필수 입력 (`NULL` 불허)
  * `content` (`TEXT`, NOT NULL): 본문 내용
  * `related_disease_id` (`BIGINT UNSIGNED`, FK -> `pet_diseases.id`, NULL 허용): 질병 치유 기록 연동 시 사용
  * `is_vet_verified` (`TINYINT(1)`, NOT NULL, DEFAULT `0`): `[✓ 수의사 공식 검증]` 획득 여부
  * `view_count`, `like_count`, `bookmark_count`, `comment_count` (`INT UNSIGNED`, DEFAULT `0`)
  * `status` (`VARCHAR(20)`, DEFAULT `'PUBLISHED'`), `promoted_at` (`DATETIME`, NULL 허용), `created_at`, `updated_at`

#### 2-3. `post_images` (게시글 1:N 다중 이미지 테이블)
* 게시글 하나에 여러 이미지가 올라가며, **대표 썸네일 여부**와 **AI 생성 이미지 여부**를 개별 이미지 단위로 구분 (`width`, `height`, 별도 `thumbnail_url` 컬럼은 제거)
* **주요 컬럼:**
  * `id` (`BIGINT UNSIGNED`, PK, AUTO_INCREMENT)
  * `post_id` (`VARCHAR(25)`, FK -> `posts.id`, NOT NULL)
  * `image_url` (`VARCHAR(500)`, NOT NULL)
  * **`is_thumbnail`** (`TINYINT(1)`, NOT NULL, DEFAULT `0`): 대표 썸네일 이미지 여부 (`1`: True, `0`: False)
  * **`is_ai_generated`** (`TINYINT(1)`, NOT NULL, DEFAULT `0`): AI 생성 이미지 여부 (`1`일 경우 해당 이미지에 `[AI 연출 이미지]` 배지 표시)
  * `sort_order` (`TINYINT UNSIGNED`, NOT NULL, DEFAULT `1`), `created_at`

#### 2-4. `post_pets`, `post_tags`, `care_verifications`, `post_interactions`
* **`post_pets`:** 게시글에 등장한 반려동물 다중 매핑 (`post_id`, `pet_id`, 작성 시점의 `weight_at_post_kg`, `age_months_at_post` 스냅샷 저장)
* **`post_tags`:** 게시글 해시태그 (`post_id`, `tag_name`)
* **`care_verifications`:** 수의사 공식 검증 코멘트 (`post_id`, `vet_user_id`, `vet_comment`, `verified_at`)
* **`post_interactions`:** 좋아요(`LIKE`) 및 북마크(`BOOKMARK`) 기록 (`post_id`, `user_id`, `interaction_type`)

#### 2-5. `comments` (댓글 및 대댓글 테이블)
* **ID 생성 규칙:** `C + 랜덤숫자 3자 + YYMMDD` (`VARCHAR(20)`)
* **주요 컬럼:**
  * `id` (`VARCHAR(20)`, PK, NOT NULL): 예) `C482261021`
  * `post_id` (`VARCHAR(25)`, FK -> `posts.id`, NOT NULL)
  * `user_id` (`VARCHAR(30)`, FK -> `users.id`, NOT NULL)
  * `parent_id` (`VARCHAR(20)`, FK -> `comments.id`, NULL 허용): 대댓글 부모 ID
  * `content` (`TEXT`, NOT NULL), `is_accepted` (`TINYINT(1)`, DEFAULT `0` — Q&A 답변 채택 여부), `like_count`, `status`, `created_at`

---

### [3단계] 자사몰 상품 (`products`) 및 이미지 상품 핀 (`product_pins`)

#### 3-1. `product_categories` (상품 카테고리 테이블)
* **ID 생성 규칙:** `랜덤숫자 3개 + YYMMDDHHmm` (`VARCHAR(20)`)
* **주요 컬럼:** `id` (`VARCHAR(20)`, PK), `parent_id` (`VARCHAR(20)`, NULL 허용), `name` (`VARCHAR(50)`, NOT NULL), `sort_order`, `is_active`, `created_at`

#### 3-2. `products` (와바미 자사몰 전용 상품 테이블)
* **설계 원칙:** `products` 테이블에는 **오직 와바미 자사몰에서 판매하는 상품만 등록**하며, 유저가 태그하는 외부몰 상품은 `products`에 저장하지 않고 `product_pins`에서 직접 링크로 처리함
* **주요 컬럼:**
  * `id` (`VARCHAR(25)`, PK, NOT NULL): 예) `PRD + 랜덤숫자3자 + YYMMDDHHmm`
  * `category_id` (`VARCHAR(20)`, FK -> `product_categories.id`, NOT NULL)
  * `name` (`VARCHAR(200)`, NOT NULL), `summary` (`VARCHAR(300)`, NULL 허용), `thumbnail_url` (`VARCHAR(500)`, NOT NULL)
  * `original_price` (`INT UNSIGNED`, NULL 허용), `sale_price` (`INT UNSIGNED`, NOT NULL), `stock_quantity` (`INT UNSIGNED`, NOT NULL)
  * `reward_rate` (`DECIMAL(4, 2)`, DEFAULT `5.00`): 핀 구매 전환 시 리워드 적립률(%)
  * **`custom_detail_tsx`** (`VARCHAR(150)`, NULL 허용): **특정 폴더 내의 커스텀 상세페이지 `.tsx` 파일명** (기존 `product_images`의 통이미지 상세페이지 외에, 특정 주력 상품에 스크립트/애니메이션/CSS 효과가 적용된 인터랙티브 `.tsx` 상세페이지를 렌더링할 때 사용)
  * **`ocr_detail_text`** (`LONGTEXT`, NULL 허용): 추후 AI 도입을 대비해 상품 상세페이지(이미지 내 텍스트 및 `.tsx` 텍스트) 내용을 저장해 두는 컬럼
  * **`pin_review_summary`** (`TEXT`, NULL 허용): 이 상품을 핀으로 등록한 유저들의 의견 요약본 캐시 컬럼
  * `target_species` (`VARCHAR(200)`, NULL 허용), `pin_count` (`INT UNSIGNED`, DEFAULT `0`), `status` (`VARCHAR(20)`, DEFAULT `'ON_SALE'`), `created_at`, `updated_at`

#### 3-3. `product_images` & `product_options`
* **`product_images`:** 상품 상단 갤러리(`GALLERY`) 및 하단 상세페이지 이미지(`DETAIL`) 구분 저장 (`product_id`, `image_url`, `image_type`, `sort_order`)
* **`product_options`:** 상품 옵션별 추가 금액 및 재고 (`product_id`, `option_name`, `additional_price`, `stock_quantity`, `is_available`)

#### 3-4. `product_pins` & `pin_pet_mappings` (이미지 위 `+` 상품 핀 테이블)
* **주요 컬럼 (`product_pins`):**
  * `id` (`VARCHAR(25)`, PK, NOT NULL): 예) `PIN + 랜덤숫자3자 + YYMMDDHHmm`
  * `post_image_id` (`BIGINT UNSIGNED`, FK -> `post_images.id`, NOT NULL)
  * `pos_x`, `pos_y` (`DECIMAL(5, 2)`, NOT NULL): 이미지 위 가로/세로 상대 좌표 (`0.00 ~ 100.00%`)
  * `product_id` (`VARCHAR(25)`, FK -> `products.id`, **NULL 허용**): **와바미 자사몰 상품을 태그했을 때만 연결**
  * `external_url` (`VARCHAR(1000)`, **NULL 허용**): **유저가 외부몰 상품 링크를 직접 입력했을 때 저장** (`external_product_name`, `external_brand_name`, `external_image_url`, `external_price` 포함 — `products` 테이블에 저장하지 않음)
  * `pin_option_memo` (`VARCHAR(100)`, NULL 허용): 작성자의 구매 옵션/사용 후기 한 줄 메모
  * `click_count` (`INT UNSIGNED`, DEFAULT `0`), `created_at`
* **`pin_pet_mappings`:** 해당 핀의 제품을 사용하는 반려동물 다중 매핑 (`pin_id`, `pet_id`)

---

### [4단계] 장바구니 (`cart_items`), 주문 (`orders`), 취소·반품·환불 (`order_claims`)

#### 4-1. `cart_items` (장바구니 테이블)
* `id` (`VARCHAR(25)`, PK), `user_id` (`VARCHAR(30)`, FK), `product_id` (`VARCHAR(25)`, FK), `product_option_id` (`BIGINT UNSIGNED`, NULL 허용), `quantity` (`INT UNSIGNED`), **`source_pin_id`** (`VARCHAR(25)`, FK -> `product_pins.id`, NULL 허용 — 어느 핀을 통해 담았는지 추적), `is_checked` (`TINYINT(1)`), `created_at`, `updated_at`

#### 4-2. `orders` & `order_items` (주문 마스터 및 상세 품목 테이블)
* **`orders`:**
  * `id` (`VARCHAR(25)`, PK): 주문번호 (`ORD + YYMMDDHHmm + 랜덤4자`)
  * `user_id` (`VARCHAR(30)`, FK)
  * `order_status` (`VARCHAR(30)`): `PAYMENT_PENDING`, `PAID`, `PREPARING`, `SHIPPING`, `DELIVERED`, `PURCHASE_CONFIRMED`, `CANCELED`
  * `total_product_price`, `shipping_fee`, `used_reward_points`, `final_payment_price` (`INT UNSIGNED`)
  * `payment_method`, `pg_transaction_id`, 수령인/배송지 정보(`recipient_name`, `recipient_phone`, `zipcode`, `address_line1`, `address_line2`, `delivery_memo`), `paid_at`, `canceled_at`, `created_at`, `updated_at`
* **`order_items`:**
  * `id` (`VARCHAR(25)`, PK), `order_id` (`VARCHAR(25)`, FK), `product_id` (`VARCHAR(25)`, FK), `product_option_id` (`BIGINT UNSIGNED`, NULL 허용)
  * 주문 시점 스냅샷: `product_name_snapshot`, `option_name_snapshot`, `unit_price_snapshot`, `quantity`, `subtotal_price`
  * 개별 배송/상태: `item_status`, `courier_company`, `tracking_number`
  * 리워드 정산 연동: `source_pin_id`, `reward_amount`, `is_reward_paid` (`TINYINT(1)`), `confirmed_at`, `created_at`

#### 4-3. `order_claims` & `order_claim_images` (취소 · 반품 · 교환 · 환불 관리 테이블)
* **`order_claims`:**
  * `id` (`VARCHAR(25)`, PK): 클레임 번호 (`CLM + 랜덤3자 + YYMMDDHHmm`)
  * `order_id` (`VARCHAR(25)`, FK), `order_item_id` (`VARCHAR(25)`, FK), `user_id` (`VARCHAR(30)`, FK)
  * `claim_type` (`VARCHAR(20)`): `CANCEL`(취소), `RETURN`(반품/환불), `EXCHANGE`(교환)
  * `claim_status` (`VARCHAR(30)`): `REQUESTED`(접수), `COLLECTING`(수거중), `COLLECTED`(입고완료), `COMPLETED`(환불/교환완료), `REJECTED`(반려)
  * `reason_category` (`VARCHAR(50)`): `CHANGE_OF_MIND`(단순변심), `SIZE_MISMATCH`(사이즈미스), `DEFECTIVE`(불량/파손), `WRONG_DELIVERY`(오배송)
  * `reason_detail` (`TEXT`), `claim_quantity` (`INT UNSIGNED`)
  * 금액/포인트 정산: `refund_product_amount`, `deducted_shipping_fee`(차감 반품배송비), `refunded_reward_points`, `final_refund_amount`(실환불액), `pg_cancel_tid`
  * 반품 수거 정보: `return_courier`, `return_tracking_no`, `admin_memo`, `requested_at`, `completed_at`, `updated_at`
* **`order_claim_images`:** 불량/파손 등 반품·교환 증빙 사진 (`claim_id`, `image_url`, `sort_order`, `created_at`)

---

## 9. 서버 인프라 단계별 확장 로드맵 및 추후 로컬 AI 도입 · 프라이버시 설계

### ① 카페24 리눅스 호스팅 단계별 스케일업 계획
1. **초기 (월 9,000원 — RAM 1GB / SSD 30GB / 트래픽 월 300GB):**
   * AI 모델 없이 기본 웹/커뮤니티/쇼핑몰 기능 운영 및 **DB 데이터(상품, 핀 후기, 반려동물 성장·질병 이력, 클레임) 축적**에 집중
   * *메모리 최적화:* 리눅스 Swap 메모리(2~4GB) 설정 및 로컬 PC 빌드 후 배포(`.next/standalone`)로 RAM 1GB 환경 대응
2. **성장기 (월 55,000원 — RAM 6GB / SSD 150GB / 트래픽 월 1.5TB):**
   * 이용자 및 사진 데이터 증가 시 전환하여 쾌적한 웹/DB 처리 성능 확보
3. **AI 도입기 (월 99,000원 — 4 Core CPU / RAM 16GB / SSD 250GB + 1TB SATA):**
   * 외부 유료 API(GPT 등) 비용 없이, **서버 내부에 로컬 경량 한국어 AI 모델(`Ollama` + `EXAONE 3.5` / `Qwen 2.5` 등) 및 무료 로컬 OCR**을 설치하여 운영
   * 외부 웹 검색은 차단하고, **1~2단계부터 우리 DB에 축적된 데이터(상품 상세페이지 이미지 내 텍스트 + `product_pins`로 태그된 집사들의 의견 + 클레임/문의 정보)**만을 기반으로 답변하며 DB에 없는 외부 정보는 *"확인되지 않는 정보"*로 안내
   * *서버 부하 방지:* 새벽 시간대 사전 요약(`pin_review_summary`) 및 자주 묻는 질문 DB 캐싱(`ai_qna_cache`)을 통해 4 Core CPU 환경에서도 빠른 응답 속도 유지

### ② AI 상담 시 반려동물 질병/이력 프라이버시 보호 및 익명 근거 링크 원칙 (핵심 규칙)
추후 로컬 AI를 도입하여 상품 추천 및 케어 상담을 제공할 때, **개인정보 및 반려동물 민감 이력 보호**를 위해 아래 3가지 원칙을 DB와 백엔드 쿼리 레벨에서 강제합니다.

1. **비공개 이력의 타인 노출 절대 금지 (`pet_diseases.is_public = 0`):**
   * 회원이 반려동물의 질병/치료 이력을 비공개(`is_public = 0`)로 설정한 경우, **다른 회원이 질문했을 때 해당 데이터는 AI 참조 대상(SQL 조회)에서 원천 제외**되어 절대로 답변에 사용되지 않음
2. **질문한 '본인'의 비공개 반려동물 정보 활용 시 사전 동의 필수 (`pets.ai_private_data_consent`):**
   * 비공개로 설정된 반려동물의 보호자 **본인**이 질문하더라도, 먼저 *"회원님의 반려동물 정보를 열람하여 맞춤 답변에 활용하는 것에 동의하시나요?"*라는 동의를 받은 경우(`ai_private_data_consent = 1`)에만 본인 한정으로 해당 반려동물의 정보를 토대로 답변함
3. **공개된 이력(`is_public = 1`)이라도 실명(아이디/반려동물 이름) 노출 금지 & 근거 게시글 링크 제공:**
   * 다른 회원이 공개한 질병 치유 이력이나 핀 후기를 바탕으로 답변할 때도, **회원 아이디(`@nickname`)나 반려동물 이름(예: `'모아'`)을 직접 언급하는 것은 엄격히 금지**함
   * 백엔드에서 AI에게 데이터를 전달할 때 처음부터 아이디와 이름을 제거하고 **익명화된 스펙과 근거 게시글 링크**만 전달하여 아래와 같이 답변하도록 설계:
     * ❌ 잘못된 답변: *"OOO님의 고양이 '모아'가 이 제품을 쓰고 심장질환이 나았어요."*
     * ⭕ **올바른 답변:** *"어떤 고양이(랙돌, 4.8kg)는 이 제품을 사용하고 몇 개월 동안 겪던 심장질환 치유에 도움이 되었다고 해요. 자세한 내용은 해당 집사님이 작성한 아래 게시글 링크를 참고해 보세요!"* + **[🔗 관련 게시글 링크 제공]**
