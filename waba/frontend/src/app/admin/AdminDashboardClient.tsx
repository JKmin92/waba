'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
    Box,
    Button,
    Flex,
    Grid,
    Heading,
    HStack,
    IconButton,
    Input,
    Spinner,
    Text,
    VStack,
} from '@chakra-ui/react';
import {
    LuArrowUpRight,
    LuDownload,
    LuMessageSquare,
    LuRefreshCw,
    LuSearch,
    LuSparkles,
    LuTriangleAlert,
    LuUserPlus,
} from 'react-icons/lu';
import axiosInstance from '@/utils/api';
import { toaster } from '@/components/ui/toaster';

type PeriodKey = 'today' | '7d' | '30d' | 'all';

interface DashboardTrendItem {
    date: string;
    label?: string;
    posts: number;
    aiHistories: number;
    newUsers: number;
}

interface UrgentQueueItem {
    id: string | number;
    type: 'REPORT' | 'SENSITIVE_IMAGE' | 'VET_VERIFY' | string;
    badge?: string;
    title: string;
    subtitle?: string;
    targetUrl?: string;
    createdAt?: string;
}

interface RecentPostItem {
    id: string | number;
    title: string;
    board_id?: string;
    board_name?: string;
    author_nickname?: string;
    pet_summary?: string | null;
    view_count?: number;
    like_count?: number;
    curation_grade?: string | null;
    is_curated?: boolean | number;
    has_sensitive_image?: boolean;
    created_at?: string;
}

interface AuditLogItem {
    id: string | number;
    admin_nickname?: string;
    admin_id?: string;
    action?: string;
    target_type?: string;
    target_id?: string;
    summary?: string;
    created_at?: string;
}

interface DashboardData {
    period?: PeriodKey;
    kpi?: {
        newUsers?: number;
        newUsersDeltaPct?: number | null;
        totalUsers?: number;
        totalPets?: number;
        newPostsAndComments?: number;
        newPostsAndCommentsDeltaPct?: number | null;
        sensitiveImagesCount?: number;
        aiHistoriesCount?: number;
        totalHistoriesCount?: number;
        aiAutoRatio?: number;
        publicNotebooksCount?: number;
        pendingTotal?: number;
        pendingReportsCount?: number;
        handledReportsCount?: number;
        pendingVerificationsCount?: number;
    };
    dailyTrend?: DashboardTrendItem[];
    urgentQueue?: UrgentQueueItem[];
    recentPosts?: RecentPostItem[];
    curatedCount?: number;
    recentAuditLogs?: AuditLogItem[];
    affiliateDomains?: {
        activeCount?: number;
        totalCount?: number;
    };
}

const PERIOD_OPTIONS: Array<{ key: PeriodKey; label: string }> = [
    { key: 'today', label: '오늘' },
    { key: '7d', label: '7일' },
    { key: '30d', label: '30일' },
    { key: 'all', label: '전체' },
];

const ACTION_LABELS: Record<string, string> = {
    POST_CURATION_ON: '큐레이션 지정',
    POST_CURATION_OFF: '큐레이션 해제',
};

const URGENT_STYLE_MAP: Record<string, { bg: string; color: string; btnLabel: string }> = {
    REPORT: { bg: 'rgba(239, 68, 68, 0.12)', color: '#EF4444', btnLabel: '검토' },
    SENSITIVE_IMAGE: { bg: 'rgba(245, 158, 11, 0.14)', color: '#D97706', btnLabel: '확인' },
    VET_VERIFY: { bg: 'var(--waba-purple-soft)', color: 'var(--waba-purple-text)', btnLabel: '승인' },
};

function formatRelativeTime(dateStr?: string) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return '';
    const diffMs = Date.now() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return '방금 전';
    if (diffMin < 60) return `${diffMin}분 전`;
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return `${diffHour}시간 전`;
    const diffDay = Math.floor(diffHour / 24);
    return `${diffDay}일 전`;
}

function renderDeltaBadge(deltaPct?: number | null) {
    if (typeof deltaPct !== 'number') {
        return (
            <Text fontSize="11px" fontWeight="600" color="var(--waba-ink-3)" mt={1.5}>
                전체 기간 누적
            </Text>
        );
    }
    const isPositive = deltaPct >= 0;
    return (
        <HStack gap={1.5} mt={1.5} align="center">
            <Box
                bg={isPositive ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.14)'}
                color={isPositive ? '#10B981' : '#D97706'}
                fontSize="11px"
                fontWeight="700"
                px={2}
                py="1px"
                borderRadius="999px"
            >
                {isPositive ? `▲ +${deltaPct}%` : `▼ ${deltaPct}%`}
            </Box>
            <Text fontSize="11px" color="var(--waba-ink-3)">
                전기 대비
            </Text>
        </HStack>
    );
}

export default function AdminDashboardClient() {
    const router = useRouter();
    const [period, setPeriod] = useState<PeriodKey>('7d');
    const [searchQuery, setSearchQuery] = useState('');
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

    const fetchDashboard = useCallback(async (targetPeriod: PeriodKey, q: string, silent = false) => {
        if (!silent) setLoading(true);
        try {
            const params: Record<string, string> = { period: targetPeriod };
            if (q.trim()) params.q = q.trim();
            const res = await axiosInstance.get('/admin/dashboard', { params });
            setData(res.data?.data || res.data || {});
        } catch {
            if (!silent) {
                toaster.create({ title: '대시보드 데이터를 불러오지 못했습니다.', type: 'error' });
            }
        } finally {
            if (!silent) setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchDashboard(period, searchQuery);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [period, fetchDashboard]);

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        fetchDashboard(period, searchQuery);
    };

    const handleNavigateUrgent = (targetUrl?: string) => {
        const target = targetUrl || '/admin/reports';
        if (target.startsWith('/admin')) {
            router.push(target);
        } else {
            window.open(target, '_blank', 'noopener,noreferrer');
        }
    };

    const kpi = data?.kpi || {};
    const trends = data?.dailyTrend || [];
    const urgentQueue = data?.urgentQueue || [];
    const recentPosts = data?.recentPosts || [];
    const auditLogs = data?.recentAuditLogs || [];
    const affiliateDomainsActiveCount = data?.affiliateDomains?.activeCount ?? 0;

    const avgDailyActivity = useMemo(() => {
        if (trends.length === 0) return 0;
        const total = trends.reduce((acc, t) => acc + (t.posts || 0) + (t.aiHistories || 0), 0);
        return Math.round(total / trends.length);
    }, [trends]);

    const handleDownloadCsv = () => {
        if (trends.length === 0) {
            toaster.create({ title: '다운로드할 추이 데이터가 없습니다.', type: 'info' });
            return;
        }
        const header = '날짜,게시글 및 스냅,AI 건강 수첩,신규 가입\n';
        const rows = trends
            .map((t) => `${t.date},${t.posts || 0},${t.aiHistories || 0},${t.newUsers || 0}`)
            .join('\n');
        const blob = new Blob(['\uFEFF' + header + rows], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `waba_activity_report_${period}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    // SVG Chart geometry
    const chartW = 640;
    const chartH = 228;
    const padX = 28;
    const padTop = 18;
    const padBottom = 32;
    const plotW = chartW - padX * 2;
    const plotH = chartH - padTop - padBottom;

    const maxVal = useMemo(() => {
        let m = 10;
        for (const t of trends) {
            m = Math.max(m, t.posts || 0, t.aiHistories || 0, t.newUsers || 0);
        }
        return m;
    }, [trends]);

    const getPointX = (index: number, length: number) => {
        if (length <= 1) return chartW / 2;
        return padX + (index / (length - 1)) * plotW;
    };

    const getPointY = (value: number) => {
        return padTop + plotH - (value / maxVal) * plotH;
    };

    const buildPath = (values: number[]) => {
        if (values.length === 0) return '';
        if (values.length === 1) {
            const y = getPointY(values[0]);
            return `M ${padX} ${y.toFixed(1)} L ${chartW - padX} ${y.toFixed(1)}`;
        }
        return values
            .map((v, i) => {
                const x = getPointX(i, values.length);
                const y = getPointY(v);
                return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
            })
            .join(' ');
    };

    const buildAreaPath = (values: number[]) => {
        const line = buildPath(values);
        if (!line) return '';
        const baseY = padTop + plotH;
        const startX = values.length === 1 ? padX : getPointX(0, values.length);
        const endX = values.length === 1 ? chartW - padX : getPointX(values.length - 1, values.length);
        return `${line} L ${endX.toFixed(1)} ${baseY} L ${startX.toFixed(1)} ${baseY} Z`;
    };

    const postsLine = buildPath(trends.map((t) => t.posts || 0));
    const postsArea = buildAreaPath(trends.map((t) => t.posts || 0));
    const aiLine = buildPath(trends.map((t) => t.aiHistories || 0));
    const usersLine = buildPath(trends.map((t) => t.newUsers || 0));

    const trendTitle = period === '30d' ? '최근 30일 커뮤니티 활동 추이' : '최근 7일 커뮤니티 활동 추이';
    const pendingTotalCount = kpi.pendingReportsCount ?? kpi.pendingTotal ?? 0;

    return (
        <VStack align="stretch" gap={5} maxW="1400px" mx="auto">
            {/* Single Unified Top Header */}
            <Flex
                direction={{ base: 'column', xl: 'row' }}
                justify="space-between"
                align={{ base: 'flex-start', xl: 'center' }}
                gap={4}
            >
                <Box>
                    <HStack gap={2.5} align="center">
                        <Heading as="h1" fontSize={{ base: '20px', md: '24px' }} fontWeight="900" color="var(--waba-ink)">
                            운영 대시보드
                        </Heading>
                        <Box
                            bg="var(--waba-purple-soft)"
                            color="var(--waba-purple-text)"
                            fontSize="11px"
                            fontWeight="800"
                            px={2.5}
                            py={0.5}
                            borderRadius="999px"
                        >
                            실시간 관제중
                        </Box>
                    </HStack>
                    <Text fontSize="13px" color="var(--waba-ink-3)" mt={0.5}>
                        WABA 커뮤니티 및 AI 건강 수첩 실시간 운영 현황
                    </Text>
                </Box>

                <Flex gap={2.5} flexWrap="wrap" align="center" w={{ base: 'full', xl: 'auto' }}>
                    <HStack
                        bg="var(--waba-card)"
                        border="1px solid"
                        borderColor="var(--waba-line)"
                        p="3px"
                        borderRadius="999px"
                        gap={1}
                    >
                        {PERIOD_OPTIONS.map((opt) => {
                            const active = period === opt.key;
                            return (
                                <Button
                                    key={opt.key}
                                    size="2xs"
                                    h="28px"
                                    px={3}
                                    borderRadius="999px"
                                    bg={active ? 'var(--waba-ink)' : 'transparent'}
                                    color={active ? 'var(--waba-bg)' : 'var(--waba-ink-2)'}
                                    fontSize="12px"
                                    fontWeight={active ? '700' : '600'}
                                    onClick={() => setPeriod(opt.key)}
                                >
                                    {opt.label}
                                </Button>
                            );
                        })}
                    </HStack>

                    <form onSubmit={handleSearchSubmit}>
                        <HStack
                            bg="var(--waba-card)"
                            border="1px solid"
                            borderColor="var(--waba-line)"
                            borderRadius="999px"
                            px={3}
                            h="34px"
                            gap={1.5}
                            w={{ base: '200px', sm: '230px' }}
                        >
                            <LuSearch size={14} color="var(--waba-ink-3)" />
                            <Input
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="회원, 게시글, 수첩 검색..."
                                border="none"
                                bg="transparent"
                                color="var(--waba-ink)"
                                fontSize="12px"
                                px={0}
                                h="full"
                                _focus={{ outline: 'none', boxShadow: 'none' }}
                            />
                        </HStack>
                    </form>

                    <IconButton
                        aria-label="새로고침"
                        size="sm"
                        variant="outline"
                        rounded="full"
                        bg="var(--waba-card)"
                        borderColor="var(--waba-line)"
                        onClick={() => fetchDashboard(period, searchQuery)}
                        loading={loading}
                    >
                        <LuRefreshCw size={14} />
                    </IconButton>
                </Flex>
            </Flex>

            {loading && !data ? (
                <Flex py={20} justify="center" align="center">
                    <Spinner size="lg" color="#6338A9" />
                </Flex>
            ) : (
                <>
                    {/* Row 1: 4 KPI Cards */}
                    <Grid templateColumns={{ base: '1fr', sm: 'repeat(2, 1fr)', xl: 'repeat(4, 1fr)' }} gap={4}>
                        {/* KPI 1: 신규 가입자 */}
                        <Box bg="var(--waba-card)" border="1px solid" borderColor="var(--waba-line)" borderRadius="20px" p={5}>
                            <Flex justify="space-between" align="flex-start" mb={1.5}>
                                <Text fontSize="12.5px" fontWeight="700" color="var(--waba-ink-2)" pt={1}>
                                    신규 가입자
                                </Text>
                                <Flex
                                    w="36px"
                                    h="36px"
                                    borderRadius="12px"
                                    bg="var(--waba-purple-soft)"
                                    color="var(--waba-purple-text)"
                                    align="center"
                                    justify="center"
                                    flexShrink={0}
                                >
                                    <LuUserPlus size={17} />
                                </Flex>
                            </Flex>
                            <Text fontSize="28px" fontWeight="900" color="var(--waba-ink)" lineHeight="1.2">
                                {(kpi.newUsers ?? 0).toLocaleString()}명
                            </Text>
                            {renderDeltaBadge(kpi.newUsersDeltaPct)}
                            <Text fontSize="11.5px" color="var(--waba-ink-3)" mt={2.5}>
                                누적 회원 {(kpi.totalUsers ?? 0).toLocaleString()} · 펫 {(kpi.totalPets ?? 0).toLocaleString()}
                            </Text>
                        </Box>

                        {/* KPI 2: 신규 게시글 · 댓글 */}
                        <Box bg="var(--waba-card)" border="1px solid" borderColor="var(--waba-line)" borderRadius="20px" p={5}>
                            <Flex justify="space-between" align="flex-start" mb={1.5}>
                                <Text fontSize="12.5px" fontWeight="700" color="var(--waba-ink-2)" pt={1}>
                                    신규 게시글 · 댓글
                                </Text>
                                <Flex
                                    w="36px"
                                    h="36px"
                                    borderRadius="12px"
                                    bg="var(--waba-purple-soft)"
                                    color="var(--waba-purple-text)"
                                    align="center"
                                    justify="center"
                                    flexShrink={0}
                                >
                                    <LuMessageSquare size={17} />
                                </Flex>
                            </Flex>
                            <Text fontSize="28px" fontWeight="900" color="var(--waba-ink)" lineHeight="1.2">
                                {(kpi.newPostsAndComments ?? 0).toLocaleString()}건
                            </Text>
                            {renderDeltaBadge(kpi.newPostsAndCommentsDeltaPct)}
                            <Box
                                display="inline-block"
                                mt={2.5}
                                bg="var(--waba-surface)"
                                border="1px solid"
                                borderColor="var(--waba-line)"
                                color="var(--waba-ink-2)"
                                fontSize="11px"
                                fontWeight="600"
                                px={2.5}
                                py={0.5}
                                borderRadius="999px"
                            >
                                민감 이미지 감지 {(kpi.sensitiveImagesCount ?? 0).toLocaleString()}건
                            </Box>
                        </Box>

                        {/* KPI 3: 건강 수첩 생성 */}
                        <Box bg="var(--waba-card)" border="1px solid" borderColor="var(--waba-line)" borderRadius="20px" p={5}>
                            <Flex justify="space-between" align="flex-start" mb={1.5}>
                                <Text fontSize="12.5px" fontWeight="700" color="var(--waba-ink-2)" pt={1}>
                                    건강 수첩 생성
                                </Text>
                                <Flex
                                    w="36px"
                                    h="36px"
                                    borderRadius="12px"
                                    bg="var(--waba-purple-soft)"
                                    color="var(--waba-purple-text)"
                                    align="center"
                                    justify="center"
                                    flexShrink={0}
                                >
                                    <LuSparkles size={17} />
                                </Flex>
                            </Flex>
                            <Text fontSize="28px" fontWeight="900" color="var(--waba-ink)" lineHeight="1.2">
                                {(kpi.totalHistoriesCount ?? 0).toLocaleString()}건
                            </Text>
                            <Box mt={1.5}>
                                <Box
                                    display="inline-block"
                                    bg="var(--waba-purple-soft)"
                                    color="var(--waba-purple-text)"
                                    fontSize="11px"
                                    fontWeight="700"
                                    px={2}
                                    py="1px"
                                    borderRadius="999px"
                                >
                                    자동 추출 {kpi.aiAutoRatio ?? 0}%
                                </Box>
                            </Box>
                            <Text fontSize="11.5px" color="var(--waba-ink-3)" mt={2.5}>
                                공개 수첩 그룹 {(kpi.publicNotebooksCount ?? 0).toLocaleString()}개 활성
                            </Text>
                        </Box>

                        {/* KPI 4: 신고 처리 대기 */}
                        <Box bg="var(--waba-card)" border="1px solid" borderColor="var(--waba-line)" borderRadius="20px" p={5}>
                            <Flex justify="space-between" align="flex-start" mb={1.5}>
                                <Text fontSize="12.5px" fontWeight="700" color="var(--waba-ink-2)" pt={1}>
                                    신고 처리 대기
                                </Text>
                                <Flex
                                    w="36px"
                                    h="36px"
                                    borderRadius="12px"
                                    bg={pendingTotalCount > 0 ? 'rgba(239, 68, 68, 0.12)' : 'rgba(16, 185, 129, 0.12)'}
                                    color={pendingTotalCount > 0 ? '#EF4444' : '#10B981'}
                                    align="center"
                                    justify="center"
                                    flexShrink={0}
                                >
                                    <LuTriangleAlert size={17} />
                                </Flex>
                            </Flex>
                            <Text
                                fontSize="28px"
                                fontWeight="900"
                                color={pendingTotalCount > 0 ? '#EF4444' : '#10B981'}
                                lineHeight="1.2"
                            >
                                {pendingTotalCount.toLocaleString()}건
                            </Text>
                            <Box mt={1.5}>
                                <Box
                                    display="inline-block"
                                    bg={pendingTotalCount > 0 ? 'rgba(239, 68, 68, 0.12)' : 'rgba(16, 185, 129, 0.12)'}
                                    color={pendingTotalCount > 0 ? '#EF4444' : '#10B981'}
                                    fontSize="11px"
                                    fontWeight="700"
                                    px={2}
                                    py="1px"
                                    borderRadius="999px"
                                >
                                    {pendingTotalCount > 0 ? '조치 필요' : '안정'}
                                </Box>
                            </Box>
                            <Text fontSize="11.5px" color="var(--waba-ink-3)" mt={2.5}>
                                미처리 신고 {(kpi.pendingReportsCount ?? 0).toLocaleString()}건 · 처리 완료{' '}
                                {(kpi.handledReportsCount ?? 0).toLocaleString()}건
                            </Text>
                        </Box>
                    </Grid>

                    {/* Row 2: 2 Columns (8 / 4) */}
                    <Grid templateColumns={{ base: '1fr', xl: 'repeat(12, 1fr)' }} gap={5}>
                        {/* Left: Activity Trend SVG Chart */}
                        <Box
                            gridColumn={{ base: 'span 1', xl: 'span 8' }}
                            bg="var(--waba-card)"
                            border="1px solid"
                            borderColor="var(--waba-line)"
                            borderRadius="20px"
                            p={5}
                            display="flex"
                            flexDirection="column"
                            justifyContent="space-between"
                        >
                            <Flex justify="space-between" align="flex-start" flexWrap="wrap" gap={2} mb={4}>
                                <Box>
                                    <Heading as="h2" fontSize="16px" fontWeight="800" color="var(--waba-ink)">
                                        {trendTitle}
                                    </Heading>
                                    <Text fontSize="12px" color="var(--waba-ink-3)" mt={0.5}>
                                        일자별 게시글, AI 수첩 및 신규 가입자 발생량
                                    </Text>
                                </Box>
                                <HStack gap={4} fontSize="11.5px" color="var(--waba-ink-2)" pt={1}>
                                    <HStack gap={1.5}>
                                        <Box w="8px" h="8px" borderRadius="full" bg="#6338A9" />
                                        <Text>게시글 및 스냅</Text>
                                    </HStack>
                                    <HStack gap={1.5}>
                                        <Box w="8px" h="8px" borderRadius="full" bg="#A984EE" />
                                        <Text>AI 건강 수첩</Text>
                                    </HStack>
                                    <HStack gap={1.5}>
                                        <Box w="8px" h="8px" borderRadius="full" bg="#94A3B8" />
                                        <Text>신규 가입</Text>
                                    </HStack>
                                </HStack>
                            </Flex>

                            <Box position="relative" w="100%" minH="228px">
                                {trends.length === 0 ? (
                                    <Flex h="228px" align="center" justify="center" color="var(--waba-ink-3)" fontSize="13px">
                                        표시할 활동 추이 데이터가 없습니다.
                                    </Flex>
                                ) : (
                                    <svg
                                        viewBox={`0 0 ${chartW} ${chartH}`}
                                        style={{ width: '100%', height: '228px', overflow: 'visible' }}
                                        onMouseLeave={() => setHoveredIdx(null)}
                                    >
                                        <defs>
                                            <linearGradient id="wabaPostsGrad" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor="#6338A9" stopOpacity="0.22" />
                                                <stop offset="100%" stopColor="#6338A9" stopOpacity="0" />
                                            </linearGradient>
                                        </defs>

                                        {/* Dashed horizontal grid lines */}
                                        {[0.25, 0.5, 0.75, 1].map((ratio) => {
                                            const gy = padTop + plotH * (1 - ratio);
                                            return (
                                                <line
                                                    key={ratio}
                                                    x1={padX}
                                                    y1={gy}
                                                    x2={chartW - padX}
                                                    y2={gy}
                                                    stroke="var(--waba-line)"
                                                    strokeWidth="1"
                                                    strokeDasharray="3 4"
                                                />
                                            );
                                        })}

                                        {/* Baseline axis */}
                                        <line
                                            x1={padX}
                                            y1={padTop + plotH}
                                            x2={chartW - padX}
                                            y2={padTop + plotH}
                                            stroke="var(--waba-line)"
                                            strokeWidth="1"
                                        />

                                        {postsArea && <path d={postsArea} fill="url(#wabaPostsGrad)" />}
                                        {usersLine && <path d={usersLine} fill="none" stroke="#94A3B8" strokeWidth="2" strokeDasharray="4 4" />}
                                        {aiLine && <path d={aiLine} fill="none" stroke="#A984EE" strokeWidth="2.2" />}
                                        {postsLine && <path d={postsLine} fill="none" stroke="#6338A9" strokeWidth="2.8" />}

                                        {/* Vertical hover guide line */}
                                        {hoveredIdx !== null && trends[hoveredIdx] && (
                                            <line
                                                x1={getPointX(hoveredIdx, trends.length)}
                                                y1={padTop}
                                                x2={getPointX(hoveredIdx, trends.length)}
                                                y2={padTop + plotH}
                                                stroke="var(--waba-purple-text)"
                                                strokeWidth="1.2"
                                                strokeDasharray="3 3"
                                            />
                                        )}

                                        {/* Data points & X-axis labels */}
                                        {trends.map((t, i) => {
                                            const x = getPointX(i, trends.length);
                                            const postY = getPointY(t.posts || 0);
                                            const aiY = getPointY(t.aiHistories || 0);
                                            const showXLabel =
                                                trends.length <= 10 ||
                                                i === trends.length - 1 ||
                                                (i % 5 === 0 && trends.length - 1 - i >= 3);
                                            const colStep = trends.length > 1 ? plotW / (trends.length - 1) : plotW;
                                            const colX = trends.length > 1 ? Math.max(0, x - colStep / 2) : 0;
                                            const colW = trends.length > 1 ? colStep : chartW;

                                            return (
                                                <g key={t.date}>
                                                    <circle
                                                        cx={x}
                                                        cy={aiY}
                                                        r={hoveredIdx === i ? 4.5 : 2.8}
                                                        fill="#A984EE"
                                                        stroke="var(--waba-card)"
                                                        strokeWidth="1.5"
                                                    />
                                                    <circle
                                                        cx={x}
                                                        cy={postY}
                                                        r={hoveredIdx === i ? 6 : 4}
                                                        fill="#6338A9"
                                                        stroke="var(--waba-card)"
                                                        strokeWidth="2"
                                                    />
                                                    {showXLabel && (
                                                        <text
                                                            x={x}
                                                            y={chartH - 8}
                                                            textAnchor="middle"
                                                            fontSize="11"
                                                            fill={hoveredIdx === i ? 'var(--waba-ink)' : 'var(--waba-ink-3)'}
                                                            fontWeight={hoveredIdx === i ? '700' : '500'}
                                                        >
                                                            {t.label || t.date}
                                                        </text>
                                                    )}
                                                    <rect
                                                        x={colX}
                                                        y={0}
                                                        width={colW}
                                                        height={chartH}
                                                        fill="transparent"
                                                        style={{ cursor: 'pointer' }}
                                                        onMouseEnter={() => setHoveredIdx(i)}
                                                    />
                                                </g>
                                            );
                                        })}
                                    </svg>
                                )}

                                {hoveredIdx !== null && trends[hoveredIdx] && (
                                    <Box
                                        position="absolute"
                                        top="6px"
                                        right="12px"
                                        bg="var(--waba-ink)"
                                        color="var(--waba-bg)"
                                        px={3}
                                        py={1.5}
                                        borderRadius="10px"
                                        fontSize="11px"
                                        fontWeight="700"
                                        pointerEvents="none"
                                        boxShadow="0 6px 18px rgba(0,0,0,0.2)"
                                        zIndex={2}
                                    >
                                        <Text>{trends[hoveredIdx].label || trends[hoveredIdx].date}</Text>
                                        <Text fontWeight="600" opacity={0.9}>
                                            게시글 {trends[hoveredIdx].posts}건 · AI 수첩 {trends[hoveredIdx].aiHistories}건 · 가입{' '}
                                            {trends[hoveredIdx].newUsers}명
                                        </Text>
                                    </Box>
                                )}
                            </Box>

                            <Flex
                                justify="space-between"
                                align="center"
                                pt={3}
                                mt={3}
                                borderTop="1px solid"
                                borderColor="var(--waba-line)"
                                flexWrap="wrap"
                                gap={2}
                            >
                                <Text fontSize="12px" color="var(--waba-ink-3)" fontWeight="600">
                                    일평균 활동량: <strong style={{ color: 'var(--waba-ink)' }}>{avgDailyActivity}건/일</strong>
                                </Text>
                                <Button
                                    size="xs"
                                    variant="ghost"
                                    color="var(--waba-purple-text)"
                                    fontWeight="700"
                                    gap={1}
                                    onClick={handleDownloadCsv}
                                >
                                    <LuDownload size={13} />
                                    활동 리포트 CSV 다운로드
                                </Button>
                            </Flex>
                        </Box>

                        {/* Right: Urgent Queue */}
                        <Box
                            gridColumn={{ base: 'span 1', xl: 'span 4' }}
                            bg="var(--waba-card)"
                            border="1px solid"
                            borderColor="var(--waba-line)"
                            borderRadius="20px"
                            p={5}
                            display="flex"
                            flexDirection="column"
                            justifyContent="space-between"
                            gap={3}
                        >
                            <Box>
                                <Flex justify="space-between" align="center" mb={3}>
                                    <Heading as="h2" fontSize="16px" fontWeight="800" color="var(--waba-ink)">
                                        즉시 확인 필요
                                    </Heading>
                                    <Box
                                        bg={urgentQueue.length === 0 ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)'}
                                        color={urgentQueue.length === 0 ? '#10B981' : '#EF4444'}
                                        fontSize="11px"
                                        fontWeight="800"
                                        px={2.5}
                                        py={0.5}
                                        borderRadius="999px"
                                    >
                                        {urgentQueue.length}건 대기
                                    </Box>
                                </Flex>

                                {urgentQueue.length === 0 ? (
                                    <Flex
                                        minH="190px"
                                        align="center"
                                        justify="center"
                                        bg="var(--waba-surface)"
                                        borderRadius="16px"
                                        border="1px dashed"
                                        borderColor="var(--waba-line)"
                                        p={4}
                                        textAlign="center"
                                    >
                                        <Text fontSize="13px" color="var(--waba-ink-3)">
                                            현재 긴급 처리 대기 항목이 없습니다.
                                        </Text>
                                    </Flex>
                                ) : (
                                    <VStack align="stretch" gap={2.5} maxH="248px" overflowY="auto">
                                        {urgentQueue.map((item) => {
                                            const badgeStyle = URGENT_STYLE_MAP[item.type] || {
                                                bg: 'var(--waba-purple-soft)',
                                                color: 'var(--waba-purple-text)',
                                                btnLabel: '확인',
                                            };
                                            return (
                                                <Flex
                                                    key={item.id}
                                                    bg="var(--waba-surface)"
                                                    border="1px solid"
                                                    borderColor="var(--waba-line)"
                                                    borderRadius="14px"
                                                    p={3}
                                                    justify="space-between"
                                                    align="center"
                                                    gap={2.5}
                                                >
                                                    <Box minW={0} flex={1}>
                                                        <HStack gap={1.5} mb={1}>
                                                            <Box
                                                                bg={badgeStyle.bg}
                                                                color={badgeStyle.color}
                                                                fontSize="10px"
                                                                fontWeight="700"
                                                                px={2}
                                                                py="1px"
                                                                borderRadius="999px"
                                                            >
                                                                {item.badge || item.type}
                                                            </Box>
                                                            <Text fontSize="10.5px" color="var(--waba-ink-3)">
                                                                {formatRelativeTime(item.createdAt)}
                                                            </Text>
                                                        </HStack>
                                                        <Text fontSize="12.5px" fontWeight="700" color="var(--waba-ink)" truncate>
                                                            {item.title}
                                                        </Text>
                                                        {item.subtitle && (
                                                            <Text fontSize="11px" color="var(--waba-ink-3)" truncate>
                                                                {item.subtitle}
                                                            </Text>
                                                        )}
                                                    </Box>
                                                    <Button
                                                        size="2xs"
                                                        h="26px"
                                                        px={2.5}
                                                        borderRadius="999px"
                                                        bg="var(--waba-card)"
                                                        border="1px solid"
                                                        borderColor="var(--waba-line)"
                                                        color="var(--waba-ink)"
                                                        fontSize="11px"
                                                        fontWeight="700"
                                                        flexShrink={0}
                                                        onClick={() => handleNavigateUrgent(item.targetUrl)}
                                                    >
                                                        {badgeStyle.btnLabel}
                                                    </Button>
                                                </Flex>
                                            );
                                        })}
                                    </VStack>
                                )}
                            </Box>

                            <Flex pt={2.5} borderTop="1px solid" borderColor="var(--waba-line)" justify="center">
                                <Link href="/admin/reports">
                                    <Text fontSize="12px" fontWeight="700" color="var(--waba-purple-text)">
                                        신고 센터 전체 보기 ({pendingTotalCount}건 대기) →
                                    </Text>
                                </Link>
                            </Flex>
                        </Box>
                    </Grid>

                    {/* Row 3: 2 Columns (Recent Posts / Audit Logs) */}
                    <Grid templateColumns={{ base: '1fr', xl: 'repeat(2, 1fr)' }} gap={5}>
                        {/* Left: Recent Posts */}
                        <Box
                            bg="var(--waba-card)"
                            border="1px solid"
                            borderColor="var(--waba-line)"
                            borderRadius="20px"
                            p={5}
                            display="flex"
                            flexDirection="column"
                            gap={3}
                        >
                            <Flex justify="space-between" align="center">
                                <Heading as="h2" fontSize="16px" fontWeight="800" color="var(--waba-ink)">
                                    최근 게시글
                                </Heading>
                                <Link href="/admin/posts">
                                    <Text fontSize="12px" fontWeight="700" color="var(--waba-purple-text)">
                                        전체 보기 →
                                    </Text>
                                </Link>
                            </Flex>

                            {recentPosts.length === 0 ? (
                                <Flex py={10} justify="center" color="var(--waba-ink-3)" fontSize="13px">
                                    최근 게시글이 없습니다.
                                </Flex>
                            ) : (
                                <VStack align="stretch" gap={2}>
                                    {recentPosts.map((post) => (
                                        <Flex
                                            key={post.id}
                                            align="center"
                                            justify="space-between"
                                            gap={3}
                                            p={2.5}
                                            borderRadius="14px"
                                            bg="var(--waba-surface)"
                                            border="1px solid"
                                            borderColor="var(--waba-line)"
                                        >
                                            <Box minW={0} flex={1}>
                                                <HStack gap={1.5} mb={0.5}>
                                                    {post.board_name && (
                                                        <Box
                                                            bg="var(--waba-purple-soft)"
                                                            color="var(--waba-purple-text)"
                                                            fontSize="10px"
                                                            fontWeight="700"
                                                            px={2}
                                                            py="1px"
                                                            borderRadius="999px"
                                                            flexShrink={0}
                                                        >
                                                            {post.board_name}
                                                        </Box>
                                                    )}
                                                    {post.has_sensitive_image && (
                                                        <Box
                                                            bg="rgba(245, 158, 11, 0.14)"
                                                            color="#D97706"
                                                            fontSize="10px"
                                                            fontWeight="700"
                                                            px={1.5}
                                                            py="1px"
                                                            borderRadius="999px"
                                                            flexShrink={0}
                                                        >
                                                            민감
                                                        </Box>
                                                    )}
                                                    <Text
                                                        fontSize="13px"
                                                        fontWeight="700"
                                                        color="var(--waba-ink)"
                                                        truncate
                                                        cursor="pointer"
                                                        _hover={{ textDecoration: 'underline' }}
                                                        onClick={() => window.open(`/post/${post.id}`, '_blank', 'noopener,noreferrer')}
                                                    >
                                                        {post.title}
                                                    </Text>
                                                </HStack>
                                                <Text fontSize="11px" color="var(--waba-ink-3)" truncate>
                                                    {post.author_nickname || '집사'}
                                                    {post.pet_summary ? ` · ${post.pet_summary}` : ''} · 조회 {post.view_count ?? 0} · ♥{' '}
                                                    {post.like_count ?? 0}
                                                </Text>
                                            </Box>
                                            <Text fontSize="11px" color="var(--waba-ink-3)" flexShrink={0}>
                                                {formatRelativeTime(post.created_at)}
                                            </Text>
                                        </Flex>
                                    ))}
                                </VStack>
                            )}
                        </Box>

                        {/* Right: Audit Logs */}
                        <Box
                            bg="var(--waba-card)"
                            border="1px solid"
                            borderColor="var(--waba-line)"
                            borderRadius="20px"
                            p={5}
                            display="flex"
                            flexDirection="column"
                            justifyContent="space-between"
                            gap={3}
                        >
                            <Flex justify="space-between" align="center">
                                <Heading as="h2" fontSize="16px" fontWeight="800" color="var(--waba-ink)">
                                    최근 관리자 감사 로그
                                </Heading>
                                <Box
                                    bg="rgba(16, 185, 129, 0.12)"
                                    color="#10B981"
                                    fontSize="11px"
                                    fontWeight="800"
                                    px={2.5}
                                    py={0.5}
                                    borderRadius="999px"
                                >
                                    ● 실시간 기록
                                </Box>
                            </Flex>

                            {auditLogs.length === 0 ? (
                                <Flex py={10} justify="center" color="var(--waba-ink-3)" fontSize="13px">
                                    최근 감사 로그가 없습니다.
                                </Flex>
                            ) : (
                                <VStack align="stretch" gap={2}>
                                    {auditLogs.map((log) => (
                                        <Flex
                                            key={log.id}
                                            justify="space-between"
                                            align="center"
                                            gap={2.5}
                                            p={2.5}
                                            borderRadius="14px"
                                            bg="var(--waba-surface)"
                                            border="1px solid"
                                            borderColor="var(--waba-line)"
                                        >
                                            <Box minW={0} flex={1}>
                                                <HStack gap={1.5} mb={0.5}>
                                                    <Text fontSize="12px" fontWeight="700" color="var(--waba-ink)">
                                                        {log.admin_nickname || '관리자'}
                                                    </Text>
                                                    {log.action && (
                                                        <Box
                                                            bg="var(--waba-purple-soft)"
                                                            color="var(--waba-purple-text)"
                                                            fontSize="10px"
                                                            fontWeight="700"
                                                            px={2}
                                                            py="1px"
                                                            borderRadius="999px"
                                                        >
                                                            {ACTION_LABELS[log.action] || log.action}
                                                        </Box>
                                                    )}
                                                </HStack>
                                                <Text fontSize="11.5px" color="var(--waba-ink-2)" truncate>
                                                    {log.summary || '-'}
                                                </Text>
                                            </Box>
                                            <Text fontSize="11px" color="var(--waba-ink-3)" flexShrink={0}>
                                                {formatRelativeTime(log.created_at)}
                                            </Text>
                                        </Flex>
                                    ))}
                                </VStack>
                            )}

                            <Flex
                                pt={2}
                                borderTop="1px solid"
                                borderColor="var(--waba-line)"
                                justify="space-between"
                                align="center"
                                flexWrap="wrap"
                                gap={2}
                            >
                                <HStack gap={2} fontSize="11.5px" color="var(--waba-ink-2)">
                                    <Text>● 제휴 도메인 화이트리스트 {affiliateDomainsActiveCount}개 활성</Text>
                                    <Link href="/admin/affiliate-domains">
                                        <Text color="var(--waba-purple-text)" fontWeight="700">
                                            관리 →
                                        </Text>
                                    </Link>
                                </HStack>
                                <Link href="/admin/audit-logs">
                                    <HStack gap={0.5} fontSize="12px" fontWeight="700" color="var(--waba-purple-text)">
                                        <Text>감사 로그 전체보기</Text>
                                        <LuArrowUpRight size={13} />
                                    </HStack>
                                </Link>
                            </Flex>
                        </Box>
                    </Grid>
                </>
            )}
        </VStack>
    );
}
