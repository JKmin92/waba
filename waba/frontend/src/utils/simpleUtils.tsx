export function formatDate(dateString: string) {
    const date = new Date(dateString);

    const yyyy = String(date.getFullYear());
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');

    return `${yyyy}.${mm}.${dd}`;
}

/**
 * 날짜를 상대적 시간 문자열로 변환하는 함수
 * - 1분 미만: '방금전'
 * - 1분 ~ 59분: '{n}분전'
 * - 1시간 ~ 23시간: '{n}시간전'
 * - 1일 ~ 6일: '{n}일전'
 * - 7일 ~ 29일: '{n}주전'
 * - 30일 이상: 'YY. MM. DD'
 */
export function formatRelativeTime(dateInput: string | Date | undefined): string {
    if (!dateInput) return '';
    const targetDate = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    if (isNaN(targetDate.getTime())) return '';
    const now = new Date();
    // 경과 시간(초 단위)
    const diffSeconds = Math.floor((now.getTime() - targetDate.getTime()) / 1000);
    // 1분 미만
    if (diffSeconds < 60) {
        return '방금전';
    }
    // 1분 ~ 59분
    const diffMinutes = Math.floor(diffSeconds / 60);
    if (diffMinutes < 60) {
        return `${diffMinutes}분전`;
    }
    // 1시간 ~ 23시간
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) {
        return `${diffHours}시간전`;
    }
    // 1일 ~ 6일
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) {
        return `${diffDays}일전`;
    }
    // 7일 ~ 29일
    if (diffDays < 30) {
        const diffWeeks = Math.floor(diffDays / 7);
        return `${diffWeeks}주전`;
    }
    // 30일 이상: 'YY. MM. DD'
    const yy = String(targetDate.getFullYear()).slice(-2);
    const mm = String(targetDate.getMonth() + 1).padStart(2, '0');
    const dd = String(targetDate.getDate()).padStart(2, '0');
    return `${yy}. ${mm}. ${dd}.`;
}