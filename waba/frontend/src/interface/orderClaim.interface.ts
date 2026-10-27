/**
 * [4단계] 장바구니(cart_items), 주문(orders), 취소·반품·환불(order_claims) 인터페이스
 * 모든 속성명을 실제 MySQL DB 컬럼명(snake_case)과 100% 동일하게 통일
 */

export type OrderStatus =
  | 'PAYMENT_PENDING'
  | 'PAID'
  | 'PREPARING'
  | 'SHIPPING'
  | 'DELIVERED'
  | 'PURCHASE_CONFIRMED'
  | 'CANCELED';

export type OrderItemStatus =
  | 'PAID'
  | 'PREPARING'
  | 'SHIPPING'
  | 'DELIVERED'
  | 'PURCHASE_CONFIRMED'
  | 'CLAIM_IN_PROGRESS'
  | 'CANCELED'
  | 'RETURNED'
  | 'EXCHANGED';

export type PaymentMethod = 'CARD' | 'KAKAOPAY' | 'NAVERPAY' | 'TOSSPAY' | 'VBANK';
export type ClaimType = 'CANCEL' | 'RETURN' | 'EXCHANGE';
export type ClaimStatus = 'REQUESTED' | 'COLLECTING' | 'COLLECTED' | 'COMPLETED' | 'REJECTED';
export type ClaimReasonCategory = 'CHANGE_OF_MIND' | 'SIZE_MISMATCH' | 'DEFECTIVE' | 'WRONG_DELIVERY';

/** 4-1. 장바구니 항목 (cart_items 테이블) */
export interface CartItem {
  /** 장바구니 항목 고유 코드 (CRT + 랜덤3자 + YYMMDDHHmm) */
  id: string;
  /** 장바구니 주인 회원 ID (users.id) */
  user_id: string;
  /** 담은 와바미 상품 ID (products.id) */
  product_id: string;
  /** 선택한 상품 옵션 ID (product_options.id) */
  product_option_id: number | null;
  /** 담은 수량 */
  quantity: number;
  /** 어느 게시글의 상품 핀(+)을 클릭해 담았는지 추적하는 핀 ID */
  source_pin_id: string | null;
  /** 장바구니 결제 체크박스 선택 여부 */
  is_checked: boolean | number;
  /** 담은 일시 */
  created_at: string;
  /** 수정 일시 */
  updated_at: string;
}

/** 4-2. 주문 마스터 (orders 테이블) */
export interface Order {
  /** 주문번호 (ORD + YYMMDDHHmm + 랜덤4자) */
  id: string;
  /** 주문자 회원 ID (users.id) */
  user_id: string;
  /** 주문 전체 상태 */
  order_status: OrderStatus;
  /** 순수 상품 총 금액(원) */
  total_product_price: number;
  /** 배송비(원) */
  shipping_fee: number;
  /** 결제 시 사용한 와바미 리워드 포인트(원) */
  used_reward_points: number;
  /** 실제 최종 결제 금액(원) */
  final_payment_price: number;
  /** 결제 수단 ('CARD' | 'KAKAOPAY' | 'NAVERPAY' | 'TOSSPAY' | 'VBANK') */
  payment_method: PaymentMethod | null;
  /** PG사 결제 승인 고유 거래번호 */
  pg_transaction_id: string | null;
  /** 수령인 이름 */
  recipient_name: string;
  /** 수령인 연락처 */
  recipient_phone: string;
  /** 우편번호 */
  zipcode: string;
  /** 기본 주소 */
  address_line1: string;
  /** 상세 주소 */
  address_line2: string | null;
  /** 배송 요청사항 메모 */
  delivery_memo: string | null;
  /** 결제 완료 일시 */
  paid_at: string | null;
  /** 주문 취소 일시 */
  canceled_at: string | null;
  /** 주문 생성 일시 */
  created_at: string;
  /** 수정 일시 */
  updated_at: string;
  /** 주문 상세 품목 리스트 */
  items?: OrderItem[];
}

/** 4-3. 주문 상세 품목 (order_items 테이블) */
export interface OrderItem {
  /** 주문 상세 품목 코드 (OI + 랜덤3자 + YYMMDDHHmm) */
  id: string;
  /** 소속 주문번호 (orders.id) */
  order_id: string;
  /** 구매한 상품 ID (products.id) */
  product_id: string;
  /** 구매한 옵션 ID (product_options.id) */
  product_option_id: number | null;
  /** 주문 당시 상품명 스냅샷 */
  product_name_snapshot: string;
  /** 주문 당시 옵션명 스냅샷 */
  option_name_snapshot: string | null;
  /** 주문 당시 개당 판매 단가 스냅샷(원) */
  unit_price_snapshot: number;
  /** 주문 수량 */
  quantity: number;
  /** 해당 품목 합계 금액 (unit_price_snapshot * quantity) */
  subtotal_price: number;
  /** 개별 품목 상태 (부분 취소/반품/교환 대응) */
  item_status: OrderItemStatus;
  /** 배송 택배사명 */
  courier_company: string | null;
  /** 운송장 번호 */
  tracking_number: string | null;
  /** 구매 전환을 일으킨 게시글 핀 ID (product_pins.id) */
  source_pin_id: string | null;
  /** 구매 확정 시 핀 작성자에게 지급될 리워드 포인트 예정액(원) */
  reward_amount: number;
  /** 핀 작성자에게 리워드 지급 완료 여부 */
  is_reward_paid: boolean | number;
  /** 구매 확정 일시 */
  confirmed_at: string | null;
  /** 생성 일시 */
  created_at: string;
  /** 수정 일시 */
  updated_at: string;
}

/** 4-4. 취소 · 반품 · 교환 · 환불 클레임 (order_claims 테이블) */
export interface OrderClaim {
  /** 클레임 고유 코드 (CLM + 랜덤3자 + YYMMDDHHmm) */
  id: string;
  /** 원 주문번호 (orders.id) */
  order_id: string;
  /** 클레임 대상 개별 주문 품목 ID (order_items.id) */
  order_item_id: string;
  /** 신청 회원 ID (users.id) */
  user_id: string;
  /** 클레임 구분 ('CANCEL': 결제취소, 'RETURN': 반품/환불, 'EXCHANGE': 교환) */
  claim_type: ClaimType;
  /** 진행 상태 ('REQUESTED' | 'COLLECTING' | 'COLLECTED' | 'COMPLETED' | 'REJECTED') */
  claim_status: ClaimStatus;
  /** 사유 분류 ('CHANGE_OF_MIND' | 'SIZE_MISMATCH' | 'DEFECTIVE' | 'WRONG_DELIVERY') */
  reason_category: ClaimReasonCategory;
  /** 고객 작성 상세 사유 */
  reason_detail: string | null;
  /** 클레임 신청 수량 */
  claim_quantity: number;
  /** 환불 대상 상품 금액(원) */
  refund_product_amount: number;
  /** 차감할 반품 배송비(원) */
  deducted_shipping_fee: number;
  /** 환불(복구)될 사용 리워드 포인트 */
  refunded_reward_points: number;
  /** 실제 고객에게 환불될 최종 결제 금액(원) */
  final_refund_amount: number;
  /** PG사 취소/환불 승인 거래번호 */
  pg_cancel_tid: string | null;
  /** 반품/교환 수거 택배사명 */
  return_courier: string | null;
  /** 반품/교환 수거 송장번호 */
  return_tracking_no: string | null;
  /** 관리자 처리 메모 또는 반려 사유 안내 */
  admin_memo: string | null;
  /** 클레임 신청 일시 */
  requested_at: string;
  /** 클레임 완료 일시 */
  completed_at: string | null;
  /** 수정 일시 */
  updated_at: string;
  /** 첨부된 불량/파손 증빙 이미지 목록 */
  claim_images?: OrderClaimImage[];
}

/** 4-5. 반품·교환 증빙 사진 (order_claim_images 테이블) */
export interface OrderClaimImage {
  /** 증빙 이미지 고유 번호 */
  id: number;
  /** 클레임 ID (order_claims.id) */
  claim_id: string;
  /** 증빙 사진 URL */
  image_url: string;
  /** 사진 순서 */
  sort_order: number;
  /** 업로드 일시 */
  created_at: string;
}
