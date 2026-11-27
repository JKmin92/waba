import axiosInstance from '@/utils/api';

export type NoticeType = 'NOTICE' | 'EVENT';
export type DisplayStatus = 'VISIBLE' | 'HIDDEN' | 'SCHEDULED';
export type EffectiveStatus = 'ACTIVE' | 'SCHEDULED' | 'HIDDEN' | 'EXPIRED';
export type BannerType = 'SINGLE' | 'SWIPER' | 'RANDOM';
export type DismissPolicy = 'DAY' | 'WEEK' | 'NONE';
export type MobileDisplayMode = 'MODAL' | 'BOTTOM_SHEET';

export type NoticeContentBlock =
    | { type: 'text'; content: string }
    | { type: 'image'; image_url: string; caption?: string };

export interface AdminNotice {
    id: string | number;
    type: NoticeType;
    title: string;
    content: string;
    thumbnail_url?: string | null;
    is_pinned?: boolean | number;
    display_status: DisplayStatus;
    effective_status?: EffectiveStatus;
    start_at?: string | null;
    end_at?: string | null;
    event_start_at?: string | null;
    event_end_at?: string | null;
    author_nickname?: string | null;
    view_count?: number;
    created_at?: string;
    updated_at?: string;
}

export interface AdminBannerItem {
    id?: string | number;
    localKey?: string;
    banner_id?: string | number;
    sort_order: number;
    title?: string | null;
    image_url?: string | null;
    pc_image_url?: string | null;
    tablet_image_url?: string | null;
    mobile_image_url?: string | null;
    link_url?: string | null;
    link_target?: '_self' | '_blank';
    display_status: DisplayStatus;
    effective_status?: EffectiveStatus;
    start_at?: string | null;
    end_at?: string | null;
    click_count?: number;
}

export interface AdminBanner {
    id: string | number;
    banner_key: string;
    title: string;
    banner_type: BannerType;
    display_status: DisplayStatus;
    effective_status?: EffectiveStatus;
    start_at?: string | null;
    end_at?: string | null;
    autoplay_enabled?: boolean | number;
    autoplay_interval_ms?: number;
    show_indicators?: boolean | number;
    show_pc?: boolean | number;
    show_tablet?: boolean | number;
    show_mobile?: boolean | number;
    has_item_schedules?: boolean | number;
    total_items?: number;
    active_items?: number;
    devices?: string[];
    click_count?: number;
    items?: AdminBannerItem[];
    created_at?: string;
    updated_at?: string;
}

export interface AdminPopupSettings {
    is_enabled: boolean | number;
    dismiss_policy: DismissPolicy;
    show_pc: boolean | number;
    show_tablet: boolean | number;
    show_mobile: boolean | number;
    mobile_display_mode: MobileDisplayMode;
}

export interface AdminPopupSlide {
    id: string | number;
    sort_order: number;
    title?: string | null;
    image_url: string;
    link_url?: string | null;
    link_target?: '_self' | '_blank';
    display_status: DisplayStatus;
    effective_status?: EffectiveStatus;
    start_at?: string | null;
    end_at?: string | null;
    click_count?: number;
    created_at?: string;
    updated_at?: string;
}

export interface MarketingSummary {
    notices?: { total?: number; active?: number; scheduled?: number; hidden?: number; expired?: number };
    banners?: { total?: number; active?: number; single?: number; swiper?: number; random?: number };
    popups?: { is_enabled?: boolean; total_slides?: number; active_slides?: number };
    upcoming_alerts?: number;
}

export function resolveMediaUrl(url?: string | null): string {
    if (!url) return '';
    const trimmed = String(url).trim();
    if (!trimmed) return '';
    if (/^(https?:\/\/|blob:|data:)/i.test(trimmed)) return trimmed;
    const base = String(axiosInstance.defaults?.baseURL || '');
    const origin = base.replace(/\/api\/?$/, '');
    if (origin && trimmed.startsWith('/')) {
        return `${origin}${trimmed}`;
    }
    return trimmed;
}

export function toDatetimeLocal(iso?: string | null): string {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function fromDatetimeLocal(localStr?: string | null): string | null {
    if (!localStr || !localStr.trim()) return null;
    const d = new Date(localStr);
    if (Number.isNaN(d.getTime())) return null;
    return d.toISOString();
}

export function formatDateShort(d?: string | null): string {
    if (!d) return '-';
    const parsed = new Date(d);
    if (Number.isNaN(parsed.getTime())) return '-';
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, '0');
    const day = String(parsed.getDate()).padStart(2, '0');
    return `${y}.${m}.${day}`;
}

export function formatPeriodRange(start?: string | null, end?: string | null): string {
    if (!start && !end) return '상시';
    const s = start ? formatDateShort(start) : '시작일 없음';
    const e = end ? formatDateShort(end) : '상시';
    return `${s} ~ ${e}`;
}

export function getEffectiveStatusBadge(status?: EffectiveStatus | DisplayStatus | string) {
    switch (status) {
        case 'ACTIVE':
        case 'VISIBLE':
            return { label: '노출 중', bg: 'rgba(16, 185, 129, 0.14)', color: '#10B981' };
        case 'SCHEDULED':
            return { label: '예약', bg: 'rgba(245, 158, 11, 0.14)', color: '#D97706' };
        case 'EXPIRED':
            return { label: '만료', bg: 'rgba(148, 163, 184, 0.18)', color: 'var(--waba-ink-3)' };
        case 'HIDDEN':
        default:
            return { label: '미노출', bg: 'rgba(239, 68, 68, 0.14)', color: '#EF4444' };
    }
}

export function parseNoticeContentBlocks(raw?: string | null): NoticeContentBlock[] {
    if (!raw || !raw.trim()) {
        return [{ type: 'text', content: '' }];
    }
    try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
            const valid = parsed.filter(
                (b: any) => b && (b.type === 'text' || b.type === 'image')
            );
            if (valid.length > 0) {
                return valid.map((b: any) =>
                    b.type === 'image'
                        ? {
                              type: 'image' as const,
                              image_url: String(b.image_url || ''),
                              ...(b.caption ? { caption: String(b.caption) } : {}),
                          }
                        : {
                              type: 'text' as const,
                              content: String(b.content || ''),
                          }
                );
            }
        }
    } catch {
        // legacy plain text fallback
    }
    return [{ type: 'text', content: raw }];
}

export function extractNoticeSummary(raw?: string | null): { text: string; imageCount: number } {
    const blocks = parseNoticeContentBlocks(raw);
    const texts: string[] = [];
    let imageCount = 0;
    for (const b of blocks) {
        if (b.type === 'image') {
            if (b.image_url) imageCount += 1;
        } else if (b.content.trim()) {
            texts.push(b.content.trim().replace(/\s+/g, ' '));
        }
    }
    return {
        text: texts.join(' '),
        imageCount,
    };
}
