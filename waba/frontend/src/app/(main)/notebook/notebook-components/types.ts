export type NotebookStatus = 'ACTIVE' | 'CURED' | 'COMPLETED';

export interface NotebookPetInfo {
    id?: string | number;
    name: string;
    species?: string;
    breed?: string | null;
    latest_weight_kg?: number | string | null;
    current_avatar_url?: string | null;
}

export interface NotebookAuthorInfo {
    id?: string;
    nickname?: string;
    profile_image_url?: string | null;
}

export interface NotebookItem {
    id: string | number;
    user_id?: string;
    pet_id?: string | number;
    title: string;
    category?: string | null;
    status: NotebookStatus;
    started_at?: string | null;
    ended_at?: string | null;
    days_elapsed?: number;
    record_count?: number;
    scrap_count?: number;
    like_count?: number;
    is_scrapped?: boolean;
    summary_flow?: string | null;
    weight_summary?: string | null;
    pet?: NotebookPetInfo | null;
    user?: NotebookAuthorInfo | null;
    owner?: NotebookAuthorInfo | null;
    created_at?: string;
}

export interface NotebookHistoryItem {
    id: string | number;
    notebook_id?: string | number;
    post_id?: string | null;
    event_date?: string;
    date?: string;
    record_date?: string;
    day_number?: number | null;
    category?: string | null;
    title: string;
    description?: string | null;
    hospital_name?: string | null;
    weight_kg?: number | string | null;
    is_ai_generated?: boolean | number;
    outcome_tag?: string | null;
    posts?: { id: string; title: string }[];
    created_at?: string;
}

export const NOTEBOOK_CATEGORIES: { key: string; label: string }[] = [
    { key: 'ALL', label: '전체' },
    { key: 'DISEASE', label: '질병·관절' },
    { key: 'DERMATOLOGY', label: '피부·알러지' },
    { key: 'DIET', label: '식단·다이어트' },
    { key: 'CARE', label: '일상 케어' },
    { key: 'CHECKUP', label: '건강검진' },
    { key: 'REVIEW', label: '사용기' },
    { key: 'OTHER', label: '기타' },
];

export function getNotebookCategoryLabel(category?: string | null): string {
    if (!category) return '건강 수첩';
    const upper = category.toUpperCase();
    const matched = NOTEBOOK_CATEGORIES.find((c) => c.key === upper || c.label === category);
    return matched ? matched.label : category;
}

export interface NotebookCommentItem {
    id: string | number;
    notebook_id?: string | number;
    user_id?: string;
    content: string;
    created_at: string;
    author?: NotebookAuthorInfo | null;
}

export interface NotebookDetailData {
    notebook: NotebookItem;
    histories: NotebookHistoryItem[];
    comments: NotebookCommentItem[];
}

export function getNotebookStatusBadge(
    status?: NotebookStatus | string | null,
    daysElapsed?: number | null,
    weightSummary?: string | null
) {
    if (status === 'CURED') {
        return {
            label: daysElapsed ? `완치 완료 · 총 ${daysElapsed}일` : '완치 완료',
            shortLabel: '완치 완료',
            bg: 'rgba(16, 185, 129, 0.14)',
            color: '#059669',
        };
    }
    if (status === 'COMPLETED' || status === 'GOAL_ACHIEVED') {
        return {
            label: weightSummary ? `목표 달성 · ${weightSummary}` : '목표 달성',
            shortLabel: '목표 달성',
            bg: 'rgba(59, 130, 246, 0.14)',
            color: '#2563EB',
        };
    }
    return {
        label: daysElapsed ? `진행 중 · D+${daysElapsed}` : '진행 중',
        shortLabel: '진행 중',
        bg: 'var(--waba-purple-soft)',
        color: 'var(--waba-purple-text)',
    };
}
