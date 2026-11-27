'use client'

import React, { useCallback, useEffect, useState } from 'react';
import {
    Box,
    Button,
    Flex,
    Grid,
    Heading,
    HStack,
    IconButton,
    Image,
    Input,
    Spinner,
    Switch,
    Text,
    VStack,
} from '@chakra-ui/react';
import {
    LuArrowDown,
    LuArrowUp,
    LuChevronLeft,
    LuChevronRight,
    LuCopy,
    LuPin,
    LuPlus,
    LuRefreshCw,
    LuSearch,
} from 'react-icons/lu';
import { useRouter, useSearchParams } from 'next/navigation';
import axiosInstance from '@/utils/api';
import { toaster } from '@/components/ui/toaster';
import {
    AdminBanner,
    AdminNotice,
    AdminPopupSettings,
    AdminPopupSlide,
    extractNoticeSummary,
    formatPeriodRange,
    getEffectiveStatusBadge,
    MarketingSummary,
    resolveMediaUrl,
} from './types';

type HubTab = 'notices' | 'banners' | 'popups';

const NOTICE_TYPE_TABS = [
    { key: 'ALL', label: '전체' },
    { key: 'NOTICE', label: '공지' },
    { key: 'EVENT', label: '이벤트' },
];

const STATUS_FILTER_TABS = [
    { key: 'ALL', label: '전체' },
    { key: 'ACTIVE', label: '노출 중' },
    { key: 'SCHEDULED', label: '예약' },
    { key: 'HIDDEN', label: '미노출' },
    { key: 'EXPIRED', label: '만료' },
];

const BANNER_TYPE_TABS = [
    { key: 'ALL', label: '전체' },
    { key: 'SINGLE', label: '단일 이미지' },
    { key: 'SWIPER', label: '스와이퍼' },
    { key: 'RANDOM', label: '랜덤' },
];

const BANNER_TYPE_LABELS: Record<string, string> = {
    SINGLE: '단일 이미지',
    SWIPER: '스와이퍼',
    RANDOM: '랜덤',
};

const DISMISS_POLICY_LABELS: Record<string, string> = {
    DAY: '오늘 하루 보지 않기',
    WEEK: '7일간 보지 않기',
    NONE: '닫기만',
};

const DEVICE_LABELS: Record<string, string> = {
    COMMON: '공통',
    PC: 'PC',
    TABLET: '태블릿',
    MOBILE: '모바일',
};

export default function AdminNoticesHubClient() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const initialTabParam = searchParams.get('tab');
    const [activeTab, setActiveTab] = useState<HubTab>(
        initialTabParam === 'banners' || initialTabParam === 'popups' ? initialTabParam : 'notices'
    );

    const [summary, setSummary] = useState<MarketingSummary>({});

    // Tab 1: Notices
    const [noticesLoading, setNoticesLoading] = useState(true);
    const [notices, setNotices] = useState<AdminNotice[]>([]);
    const [noticeTypeFilter, setNoticeTypeFilter] = useState('ALL');
    const [noticeStatusFilter, setNoticeStatusFilter] = useState('ALL');
    const [noticeSearchInput, setNoticeSearchInput] = useState('');
    const [noticeSearchQuery, setNoticeSearchQuery] = useState('');

    // Tab 2: Banners
    const [bannersLoading, setBannersLoading] = useState(false);
    const [banners, setBanners] = useState<AdminBanner[]>([]);
    const [bannerTypeFilter, setBannerTypeFilter] = useState('ALL');
    const [bannerStatusFilter, setBannerStatusFilter] = useState('ALL');
    const [bannerSearchInput, setBannerSearchInput] = useState('');
    const [bannerSearchQuery, setBannerSearchQuery] = useState('');

    // Tab 3: Popups
    const [popupsLoading, setPopupsLoading] = useState(false);
    const [popupSettings, setPopupSettings] = useState<AdminPopupSettings | null>(null);
    const [popupSlides, setPopupSlides] = useState<AdminPopupSlide[]>([]);
    const [previewSlideIdx, setPreviewSlideIdx] = useState(0);
    const [reorderingSlides, setReorderingSlides] = useState(false);

    useEffect(() => {
        const t = searchParams.get('tab');
        if (t === 'notices' || t === 'banners' || t === 'popups') {
            setActiveTab(t);
        }
    }, [searchParams]);

    const fetchSummary = useCallback(async () => {
        try {
            const res = await axiosInstance.get('/admin/marketing/summary');
            setSummary(res.data?.summary || res.data || {});
        } catch {
            // silent fallback
        }
    }, []);

    const fetchNotices = useCallback(async () => {
        setNoticesLoading(true);
        try {
            const res = await axiosInstance.get('/admin/notices', {
                params: {
                    type: noticeTypeFilter === 'ALL' ? undefined : noticeTypeFilter,
                    status: noticeStatusFilter === 'ALL' ? undefined : noticeStatusFilter,
                    q: noticeSearchQuery || undefined,
                },
            });
            setNotices(res.data?.notices || []);
        } catch {
            toaster.create({ title: '공지사항 목록을 불러오지 못했습니다.', type: 'error' });
        } finally {
            setNoticesLoading(false);
        }
    }, [noticeTypeFilter, noticeStatusFilter, noticeSearchQuery]);

    const fetchBanners = useCallback(async () => {
        setBannersLoading(true);
        try {
            const res = await axiosInstance.get('/admin/banners', {
                params: {
                    type: bannerTypeFilter === 'ALL' ? undefined : bannerTypeFilter,
                    status: bannerStatusFilter === 'ALL' ? undefined : bannerStatusFilter,
                    q: bannerSearchQuery || undefined,
                },
            });
            setBanners(res.data?.banners || []);
        } catch {
            toaster.create({ title: '배너 목록을 불러오지 못했습니다.', type: 'error' });
        } finally {
            setBannersLoading(false);
        }
    }, [bannerTypeFilter, bannerStatusFilter, bannerSearchQuery]);

    const fetchPopups = useCallback(async () => {
        setPopupsLoading(true);
        try {
            const res = await axiosInstance.get('/admin/popups');
            setPopupSettings(res.data?.settings || null);
            const slides: AdminPopupSlide[] = res.data?.slides || [];
            setPopupSlides(slides);
            setPreviewSlideIdx(0);
        } catch {
            toaster.create({ title: '메인 팝업 정보를 불러오지 못했습니다.', type: 'error' });
        } finally {
            setPopupsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchSummary();
    }, [fetchSummary]);

    useEffect(() => {
        if (activeTab === 'notices') fetchNotices();
        else if (activeTab === 'banners') fetchBanners();
        else fetchPopups();
    }, [activeTab, fetchNotices, fetchBanners, fetchPopups]);

    const handleRefresh = () => {
        fetchSummary();
        if (activeTab === 'notices') fetchNotices();
        else if (activeTab === 'banners') fetchBanners();
        else fetchPopups();
    };

    const handleTabSwitch = (tab: HubTab) => {
        setActiveTab(tab);
        router.replace(`/admin/notices?tab=${tab}`, { scroll: false });
    };

    const handleCopyBannerCode = async (bannerKey: string) => {
        const snippet = `<WabaBanner bannerKey="${bannerKey}" />`;
        try {
            await navigator.clipboard.writeText(snippet);
            toaster.create({ title: '삽입 코드가 클립보드에 복사되었습니다.', type: 'success' });
        } catch {
            toaster.create({ title: '클립보드 복사에 실패했습니다.', type: 'error' });
        }
    };

    const handleTogglePopupEnabled = async (nextVal: boolean) => {
        if (!popupSettings) return;
        const prev = popupSettings;
        setPopupSettings({ ...popupSettings, is_enabled: nextVal });
        try {
            await axiosInstance.patch('/admin/popups/settings', {
                ...popupSettings,
                is_enabled: nextVal,
            });
            toaster.create({
                title: nextVal ? '메인 팝업이 활성화되었습니다.' : '메인 팝업이 비활성화되었습니다.',
                type: 'success',
            });
            fetchSummary();
        } catch {
            setPopupSettings(prev);
            toaster.create({ title: '팝업 설정 변경에 실패했습니다.', type: 'error' });
        }
    };

    const handleMovePopupSlide = async (index: number, dir: 'up' | 'down') => {
        if (reorderingSlides) return;
        const target = dir === 'up' ? index - 1 : index + 1;
        if (target < 0 || target >= popupSlides.length) return;

        const next = [...popupSlides];
        const [moved] = next.splice(index, 1);
        next.splice(target, 0, moved);
        setPopupSlides(next);

        setReorderingSlides(true);
        try {
            await axiosInstance.patch('/admin/popups/slides/reorder', {
                slideIds: next.map((s) => s.id),
            });
            toaster.create({ title: '팝업 슬라이드 순서가 변경되었습니다.', type: 'success' });
            await fetchPopups();
        } catch {
            toaster.create({ title: '순서 변경에 실패했습니다.', type: 'error' });
            await fetchPopups();
        } finally {
            setReorderingSlides(false);
        }
    };

    const activePopupSlides = popupSlides.filter(
        (s) => (s.effective_status || s.display_status) === 'ACTIVE' || s.display_status === 'VISIBLE'
    );
    const previewList = activePopupSlides.length > 0 ? activePopupSlides : popupSlides;
    const currentPreviewSlide = previewList[previewSlideIdx] || previewList[0] || null;

    return (
        <Box maxW="1400px" mx="auto" px={{ base: 4, md: 6 }} py={6}>
            {/* Header */}
            <Flex
                justify="space-between"
                align={{ base: 'flex-start', md: 'center' }}
                direction={{ base: 'column', md: 'row' }}
                gap={3}
                mb={5}
            >
                <Box>
                    <Heading size="xl" fontWeight="800" color="var(--waba-ink)">
                        공지 · 배너 · 팝업 관리
                    </Heading>
                    <Text fontSize="13.5px" color="var(--waba-ink-3)" mt={1}>
                        커뮤니티 공지사항, 이벤트, 자유 위치 배너 및 메인 팝업 노출을 통합 관리합니다.
                    </Text>
                </Box>

                <HStack gap={2}>
                    <Button
                        size="sm"
                        h="34px"
                        px={4}
                        borderRadius="999px"
                        bg="#6338A9"
                        color="#FFFFFF"
                        _hover={{ bg: '#522B8F' }}
                        fontSize="12.5px"
                        fontWeight="700"
                        gap={1.5}
                        onClick={() => {
                            if (activeTab === 'banners') router.push('/admin/notices/banners/new');
                            else if (activeTab === 'popups') router.push('/admin/notices/popups/new');
                            else router.push('/admin/notices/new');
                        }}
                    >
                        <LuPlus size={15} />
                        {activeTab === 'banners'
                            ? '배너 생성'
                            : activeTab === 'popups'
                                ? '팝업 이미지 추가'
                                : '공지 작성'}
                    </Button>
                    <IconButton
                        aria-label="새로고침"
                        size="sm"
                        variant="outline"
                        borderColor="var(--waba-line)"
                        color="var(--waba-ink)"
                        borderRadius="999px"
                        onClick={handleRefresh}
                    >
                        <LuRefreshCw />
                    </IconButton>
                </HStack>
            </Flex>

            {/* 4 KPI Cards */}
            <Grid templateColumns={{ base: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }} gap={3} mb={5}>
                {[
                    {
                        label: '공지 · 이벤트',
                        value: summary.notices?.total ?? 0,
                        sub: `노출 ${summary.notices?.active ?? 0} · 예약 ${summary.notices?.scheduled ?? 0} · 미노출 ${summary.notices?.hidden ?? 0}`,
                        color: 'var(--waba-ink)',
                    },
                    {
                        label: '운영 중인 배너',
                        value: summary.banners?.active ?? 0,
                        sub: `전체 ${summary.banners?.total ?? 0} (단일 ${summary.banners?.single ?? 0} · 스와이퍼 ${summary.banners?.swiper ?? 0} · 랜덤 ${summary.banners?.random ?? 0})`,
                        color: '#6338A9',
                    },
                    {
                        label: '메인 팝업',
                        value: summary.popups?.is_enabled ? 'ON' : 'OFF',
                        sub: `활성 슬라이드 ${summary.popups?.active_slides ?? 0} / ${summary.popups?.total_slides ?? 0}장`,
                        color: summary.popups?.is_enabled ? '#10B981' : '#EF4444',
                    },
                    {
                        label: '일정 알림',
                        value: summary.upcoming_alerts ?? 0,
                        sub: '7일 내 시작·종료 예정',
                        color: '#D97706',
                    },
                ].map((card) => (
                    <Box
                        key={card.label}
                        p={4}
                        borderRadius="18px"
                        bg="var(--waba-card)"
                        border="1px solid"
                        borderColor="var(--waba-line)"
                    >
                        <Text fontSize="12px" color="var(--waba-ink-3)" fontWeight="600">
                            {card.label}
                        </Text>
                        <Text fontSize="24px" fontWeight="800" color={card.color} mt={1}>
                            {card.value}
                        </Text>
                        <Text fontSize="11px" color="var(--waba-ink-3)" mt={0.5}>
                            {card.sub}
                        </Text>
                    </Box>
                ))}
            </Grid>

            {/* 3-Tab Switcher */}
            <HStack
                bg="var(--waba-surface)"
                p={1}
                borderRadius="999px"
                border="1px solid"
                borderColor="var(--waba-line)"
                display="inline-flex"
                mb={5}
            >
                {[
                    { key: 'notices' as HubTab, label: '공지사항' },
                    { key: 'banners' as HubTab, label: '배너 관리' },
                    { key: 'popups' as HubTab, label: '메인 팝업' },
                ].map((tab) => {
                    const active = activeTab === tab.key;
                    return (
                        <Button
                            key={tab.key}
                            size="xs"
                            h="32px"
                            px={5}
                            borderRadius="999px"
                            bg={active ? 'var(--waba-ink)' : 'transparent'}
                            color={active ? 'var(--waba-bg)' : 'var(--waba-ink-2)'}
                            fontSize="12.5px"
                            fontWeight="700"
                            onClick={() => handleTabSwitch(tab.key)}
                        >
                            {tab.label}
                        </Button>
                    );
                })}
            </HStack>

            {/* TAB 1: 공지사항 */}
            {activeTab === 'notices' && (
                <>
                    <Box
                        p={4}
                        borderRadius="20px"
                        bg="var(--waba-card)"
                        border="1px solid"
                        borderColor="var(--waba-line)"
                        mb={4}
                    >
                        <Flex justify="space-between" align="center" gap={3} flexWrap="wrap">
                            <HStack gap={1.5} flexWrap="wrap">
                                {NOTICE_TYPE_TABS.map((t) => (
                                    <Button
                                        key={t.key}
                                        size="xs"
                                        h="28px"
                                        px={3}
                                        borderRadius="999px"
                                        bg={noticeTypeFilter === t.key ? 'var(--waba-ink)' : 'var(--waba-surface)'}
                                        color={noticeTypeFilter === t.key ? 'var(--waba-bg)' : 'var(--waba-ink-2)'}
                                        border="1px solid"
                                        borderColor={noticeTypeFilter === t.key ? 'var(--waba-ink)' : 'var(--waba-line)'}
                                        fontSize="11.5px"
                                        fontWeight="700"
                                        onClick={() => setNoticeTypeFilter(t.key)}
                                    >
                                        {t.label}
                                    </Button>
                                ))}
                            </HStack>

                            <HStack gap={1.5} flexWrap="wrap">
                                {STATUS_FILTER_TABS.map((t) => (
                                    <Button
                                        key={t.key}
                                        size="xs"
                                        h="28px"
                                        px={3}
                                        borderRadius="999px"
                                        bg={noticeStatusFilter === t.key ? '#6338A9' : 'var(--waba-surface)'}
                                        color={noticeStatusFilter === t.key ? '#FFFFFF' : 'var(--waba-ink-2)'}
                                        border="1px solid"
                                        borderColor={noticeStatusFilter === t.key ? '#6338A9' : 'var(--waba-line)'}
                                        fontSize="11.5px"
                                        fontWeight="700"
                                        onClick={() => setNoticeStatusFilter(t.key)}
                                    >
                                        {t.label}
                                    </Button>
                                ))}
                            </HStack>

                            <HStack gap={2}>
                                <Input
                                    value={noticeSearchInput}
                                    onChange={(e) => setNoticeSearchInput(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') setNoticeSearchQuery(noticeSearchInput.trim());
                                    }}
                                    placeholder="제목, 내용 검색..."
                                    size="sm"
                                    w={{ base: '180px', md: '240px' }}
                                    h="32px"
                                    borderRadius="999px"
                                    bg="var(--waba-surface)"
                                    borderColor="var(--waba-line)"
                                    color="var(--waba-ink)"
                                />
                                <IconButton
                                    aria-label="검색"
                                    size="sm"
                                    h="32px"
                                    w="32px"
                                    borderRadius="999px"
                                    bg="#6338A9"
                                    color="#FFFFFF"
                                    onClick={() => setNoticeSearchQuery(noticeSearchInput.trim())}
                                >
                                    <LuSearch size={14} />
                                </IconButton>
                            </HStack>
                        </Flex>
                    </Box>

                    {noticesLoading ? (
                        <Flex py={20} justify="center">
                            <Spinner size="lg" color="#6338A9" />
                        </Flex>
                    ) : notices.length === 0 ? (
                        <Box p={12} textAlign="center" borderRadius="20px" bg="var(--waba-card)" border="1px solid" borderColor="var(--waba-line)">
                            <Text color="var(--waba-ink-3)" fontSize="14px">
                                등록된 공지사항 또는 이벤트가 없습니다.
                            </Text>
                        </Box>
                    ) : (
                        <Box
                            borderRadius="20px"
                            bg="var(--waba-card)"
                            border="1px solid"
                            borderColor="var(--waba-line)"
                            overflowX="auto"
                        >
                            <Box as="table" w="100%" minW="900px" borderCollapse="collapse">
                                <Box as="thead" bg="var(--waba-surface)" borderBottom="1px solid" borderColor="var(--waba-line)">
                                    <Box as="tr">
                                        {['유형 / 상태', '제목', '노출 기간', '이벤트 기간', '조회 / 작성자', '액션'].map((col) => (
                                            <Box
                                                as="th"
                                                key={col}
                                                textAlign="left"
                                                px={4}
                                                py={3}
                                                fontSize="11.5px"
                                                fontWeight="800"
                                                color="var(--waba-ink-3)"
                                                whiteSpace="nowrap"
                                            >
                                                {col}
                                            </Box>
                                        ))}
                                    </Box>
                                </Box>
                                <Box as="tbody">
                                    {notices.map((n) => {
                                        const st = getEffectiveStatusBadge(n.effective_status || n.display_status);
                                        return (
                                            <Box
                                                as="tr"
                                                key={n.id}
                                                borderBottom="1px solid"
                                                borderColor="var(--waba-line)"
                                                _last={{ borderBottom: 'none' }}
                                                _hover={{ bg: 'var(--waba-surface)' }}
                                            >
                                                <Box as="td" px={4} py={3.5} verticalAlign="middle" whiteSpace="nowrap">
                                                    <HStack gap={1.5}>
                                                        <Box
                                                            bg={n.type === 'EVENT' ? 'var(--waba-purple-soft)' : 'var(--waba-surface)'}
                                                            color={n.type === 'EVENT' ? 'var(--waba-purple-text)' : 'var(--waba-ink-2)'}
                                                            border="1px solid"
                                                            borderColor={n.type === 'EVENT' ? 'var(--waba-purple-border)' : 'var(--waba-line)'}
                                                            fontSize="10.5px"
                                                            fontWeight="800"
                                                            px={2}
                                                            py="1px"
                                                            borderRadius="999px"
                                                        >
                                                            {n.type === 'EVENT' ? '이벤트' : '공지'}
                                                        </Box>
                                                        <Box
                                                            bg={st.bg}
                                                            color={st.color}
                                                            fontSize="10.5px"
                                                            fontWeight="800"
                                                            px={2}
                                                            py="1px"
                                                            borderRadius="999px"
                                                        >
                                                            {st.label}
                                                        </Box>
                                                        {Boolean(n.is_pinned) && (
                                                            <Box color="#6338A9" title="상단 고정">
                                                                <LuPin size={13} />
                                                            </Box>
                                                        )}
                                                    </HStack>
                                                </Box>
                                                <Box as="td" px={4} py={3.5} verticalAlign="middle" maxW="320px">
                                                    <Text fontSize="13.5px" fontWeight="800" color="var(--waba-ink)" truncate>
                                                        {n.title}
                                                    </Text>
                                                    {(() => {
                                                        const { text, imageCount } = extractNoticeSummary(n.content);
                                                        if (!text && imageCount === 0) return null;
                                                        return (
                                                            <HStack gap={1.5} mt={0.5} align="center">
                                                                {text && (
                                                                    <Text fontSize="11.5px" color="var(--waba-ink-3)" truncate>
                                                                        {text}
                                                                    </Text>
                                                                )}
                                                                {imageCount > 0 && (
                                                                    <Box
                                                                        bg="var(--waba-purple-soft)"
                                                                        color="var(--waba-purple-text)"
                                                                        fontSize="10px"
                                                                        fontWeight="700"
                                                                        px={1.5}
                                                                        py="1px"
                                                                        borderRadius="999px"
                                                                        flexShrink={0}
                                                                    >
                                                                        이미지 {imageCount}
                                                                    </Box>
                                                                )}
                                                            </HStack>
                                                        );
                                                    })()}
                                                </Box>
                                                <Box as="td" px={4} py={3.5} verticalAlign="middle" whiteSpace="nowrap">
                                                    <Text fontSize="12px" color="var(--waba-ink-2)">
                                                        {formatPeriodRange(n.start_at, n.end_at)}
                                                    </Text>
                                                </Box>
                                                <Box as="td" px={4} py={3.5} verticalAlign="middle" whiteSpace="nowrap">
                                                    <Text fontSize="12px" color="var(--waba-ink-3)">
                                                        {n.type === 'EVENT'
                                                            ? formatPeriodRange(n.event_start_at, n.event_end_at)
                                                            : '-'}
                                                    </Text>
                                                </Box>
                                                <Box as="td" px={4} py={3.5} verticalAlign="middle" whiteSpace="nowrap">
                                                    <Text fontSize="12px" color="var(--waba-ink-3)">
                                                        조회 {n.view_count ?? 0} · {n.author_nickname || '관리자'}
                                                    </Text>
                                                </Box>
                                                <Box as="td" px={4} py={3.5} verticalAlign="middle" whiteSpace="nowrap">
                                                    <Button
                                                        size="xs"
                                                        h="30px"
                                                        px={3.5}
                                                        borderRadius="999px"
                                                        bg="#6338A9"
                                                        color="#FFFFFF"
                                                        _hover={{ bg: '#522B8F' }}
                                                        onClick={() => router.push(`/admin/notices/${n.id}`)}
                                                    >
                                                        상세 관리
                                                    </Button>
                                                </Box>
                                            </Box>
                                        );
                                    })}
                                </Box>
                            </Box>
                        </Box>
                    )}
                </>
            )}

            {/* TAB 2: 배너 관리 */}
            {activeTab === 'banners' && (
                <>
                    <Box
                        p={4}
                        borderRadius="20px"
                        bg="var(--waba-card)"
                        border="1px solid"
                        borderColor="var(--waba-line)"
                        mb={4}
                    >
                        <Flex justify="space-between" align="center" gap={3} flexWrap="wrap">
                            <HStack gap={1.5} flexWrap="wrap">
                                {BANNER_TYPE_TABS.map((t) => (
                                    <Button
                                        key={t.key}
                                        size="xs"
                                        h="28px"
                                        px={3}
                                        borderRadius="999px"
                                        bg={bannerTypeFilter === t.key ? 'var(--waba-ink)' : 'var(--waba-surface)'}
                                        color={bannerTypeFilter === t.key ? 'var(--waba-bg)' : 'var(--waba-ink-2)'}
                                        border="1px solid"
                                        borderColor={bannerTypeFilter === t.key ? 'var(--waba-ink)' : 'var(--waba-line)'}
                                        fontSize="11.5px"
                                        fontWeight="700"
                                        onClick={() => setBannerTypeFilter(t.key)}
                                    >
                                        {t.label}
                                    </Button>
                                ))}
                            </HStack>

                            <HStack gap={1.5} flexWrap="wrap">
                                {STATUS_FILTER_TABS.map((t) => (
                                    <Button
                                        key={t.key}
                                        size="xs"
                                        h="28px"
                                        px={3}
                                        borderRadius="999px"
                                        bg={bannerStatusFilter === t.key ? '#6338A9' : 'var(--waba-surface)'}
                                        color={bannerStatusFilter === t.key ? '#FFFFFF' : 'var(--waba-ink-2)'}
                                        border="1px solid"
                                        borderColor={bannerStatusFilter === t.key ? '#6338A9' : 'var(--waba-line)'}
                                        fontSize="11.5px"
                                        fontWeight="700"
                                        onClick={() => setBannerStatusFilter(t.key)}
                                    >
                                        {t.label}
                                    </Button>
                                ))}
                            </HStack>

                            <HStack gap={2}>
                                <Input
                                    value={bannerSearchInput}
                                    onChange={(e) => setBannerSearchInput(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') setBannerSearchQuery(bannerSearchInput.trim());
                                    }}
                                    placeholder="배너명, banner_key 검색..."
                                    size="sm"
                                    w={{ base: '180px', md: '240px' }}
                                    h="32px"
                                    borderRadius="999px"
                                    bg="var(--waba-surface)"
                                    borderColor="var(--waba-line)"
                                    color="var(--waba-ink)"
                                />
                                <IconButton
                                    aria-label="검색"
                                    size="sm"
                                    h="32px"
                                    w="32px"
                                    borderRadius="999px"
                                    bg="#6338A9"
                                    color="#FFFFFF"
                                    onClick={() => setBannerSearchQuery(bannerSearchInput.trim())}
                                >
                                    <LuSearch size={14} />
                                </IconButton>
                            </HStack>
                        </Flex>
                    </Box>

                    {bannersLoading ? (
                        <Flex py={20} justify="center">
                            <Spinner size="lg" color="#6338A9" />
                        </Flex>
                    ) : banners.length === 0 ? (
                        <Box p={12} textAlign="center" borderRadius="20px" bg="var(--waba-card)" border="1px solid" borderColor="var(--waba-line)">
                            <Text color="var(--waba-ink-3)" fontSize="14px">
                                등록된 배너가 없습니다.
                            </Text>
                        </Box>
                    ) : (
                        <Box
                            borderRadius="20px"
                            bg="var(--waba-card)"
                            border="1px solid"
                            borderColor="var(--waba-line)"
                            overflowX="auto"
                        >
                            <Box as="table" w="100%" minW="1040px" borderCollapse="collapse">
                                <Box as="thead" bg="var(--waba-surface)" borderBottom="1px solid" borderColor="var(--waba-line)">
                                    <Box as="tr">
                                        {['배너명 · banner_key', '타입 · 구성', '디바이스', '배너 전체 상태 · 기간', '삽입 코드', '클릭 수', '액션'].map((col) => (
                                            <Box
                                                as="th"
                                                key={col}
                                                textAlign="left"
                                                px={4}
                                                py={3}
                                                fontSize="11.5px"
                                                fontWeight="800"
                                                color="var(--waba-ink-3)"
                                                whiteSpace="nowrap"
                                            >
                                                {col}
                                            </Box>
                                        ))}
                                    </Box>
                                </Box>
                                <Box as="tbody">
                                    {banners.map((b) => {
                                        const st = getEffectiveStatusBadge(b.effective_status || b.display_status);
                                        const devices = Array.isArray(b.devices)
                                            ? b.devices.map((d) => DEVICE_LABELS[d] || d)
                                            : [];

                                        return (
                                            <Box
                                                as="tr"
                                                key={b.id}
                                                borderBottom="1px solid"
                                                borderColor="var(--waba-line)"
                                                _last={{ borderBottom: 'none' }}
                                                _hover={{ bg: 'var(--waba-surface)' }}
                                            >
                                                <Box as="td" px={4} py={3.5} verticalAlign="middle">
                                                    <Text fontSize="13.5px" fontWeight="800" color="var(--waba-ink)">
                                                        {b.title}
                                                    </Text>
                                                    <Box
                                                        display="inline-block"
                                                        mt={1}
                                                        bg="var(--waba-surface)"
                                                        color="var(--waba-ink-2)"
                                                        border="1px solid"
                                                        borderColor="var(--waba-line)"
                                                        fontSize="10.5px"
                                                        fontFamily="mono"
                                                        px={2}
                                                        py="1px"
                                                        borderRadius="999px"
                                                    >
                                                        {b.banner_key}
                                                    </Box>
                                                </Box>

                                                <Box as="td" px={4} py={3.5} verticalAlign="middle" whiteSpace="nowrap">
                                                    <Text fontSize="12.5px" fontWeight="700" color="var(--waba-ink)">
                                                        {BANNER_TYPE_LABELS[b.banner_type] || b.banner_type}
                                                    </Text>
                                                    <Text fontSize="11px" color="var(--waba-ink-3)">
                                                        슬라이드 {b.total_items ?? 0}장 (활성 {b.active_items ?? 0})
                                                    </Text>
                                                </Box>

                                                <Box as="td" px={4} py={3.5} verticalAlign="middle" whiteSpace="nowrap">
                                                    <Text fontSize="12px" color="var(--waba-ink-2)">
                                                        {devices.length > 0 ? devices.join(' · ') : '전체'}
                                                    </Text>
                                                </Box>

                                                <Box as="td" px={4} py={3.5} verticalAlign="middle" whiteSpace="nowrap">
                                                    <Box
                                                        display="inline-block"
                                                        bg={st.bg}
                                                        color={st.color}
                                                        fontSize="10.5px"
                                                        fontWeight="800"
                                                        px={2}
                                                        py="1px"
                                                        borderRadius="999px"
                                                        mb={1}
                                                    >
                                                        {st.label}
                                                    </Box>
                                                    <Text fontSize="11.5px" color="var(--waba-ink-2)">
                                                        {formatPeriodRange(b.start_at, b.end_at)}
                                                    </Text>
                                                    {Boolean(b.has_item_schedules) && (
                                                        <Text fontSize="10.5px" color="var(--waba-purple-text)" fontWeight="700">
                                                            이미지별 개별 기간 적용
                                                        </Text>
                                                    )}
                                                </Box>

                                                <Box as="td" px={4} py={3.5} verticalAlign="middle">
                                                    <HStack gap={1.5}>
                                                        <Box
                                                            bg="var(--waba-surface)"
                                                            border="1px solid"
                                                            borderColor="var(--waba-line)"
                                                            borderRadius="8px"
                                                            px={2.5}
                                                            py={1}
                                                            fontSize="11px"
                                                            fontFamily="mono"
                                                            color="var(--waba-ink-2)"
                                                            whiteSpace="nowrap"
                                                        >
                                                            {`<WabaBanner bannerKey="${b.banner_key}" />`}
                                                        </Box>
                                                        <IconButton
                                                            aria-label="코드 복사"
                                                            size="xs"
                                                            variant="outline"
                                                            borderColor="var(--waba-line)"
                                                            color="var(--waba-ink)"
                                                            borderRadius="8px"
                                                            onClick={() => handleCopyBannerCode(b.banner_key)}
                                                        >
                                                            <LuCopy size={13} />
                                                        </IconButton>
                                                    </HStack>
                                                </Box>

                                                <Box as="td" px={4} py={3.5} verticalAlign="middle" whiteSpace="nowrap">
                                                    <Text fontSize="12.5px" fontWeight="700" color="var(--waba-ink)">
                                                        {b.click_count ?? 0}회
                                                    </Text>
                                                </Box>

                                                <Box as="td" px={4} py={3.5} verticalAlign="middle" whiteSpace="nowrap">
                                                    <Button
                                                        size="xs"
                                                        h="30px"
                                                        px={3.5}
                                                        borderRadius="999px"
                                                        bg="#6338A9"
                                                        color="#FFFFFF"
                                                        _hover={{ bg: '#522B8F' }}
                                                        onClick={() => router.push(`/admin/notices/banners/${b.id}`)}
                                                    >
                                                        상세 관리
                                                    </Button>
                                                </Box>
                                            </Box>
                                        );
                                    })}
                                </Box>
                            </Box>
                        </Box>
                    )}

                    <Box
                        mt={4}
                        p={3.5}
                        borderRadius="14px"
                        bg="var(--waba-purple-soft)"
                        border="1px solid"
                        borderColor="var(--waba-purple-border)"
                    >
                        <Text fontSize="12px" color="var(--waba-purple-text)" fontWeight="700">
                            Next.js 삽입 안내: <Box as="span" fontFamily="mono">{`import WabaBanner from '@/app/(main)/common/WabaBanner'`}</Box> 후 원하는 위치에 복사한 코드를 붙여넣으세요.
                        </Text>
                    </Box>
                </>
            )}

            {/* TAB 3: 메인 팝업 */}
            {activeTab === 'popups' && (
                popupsLoading ? (
                    <Flex py={20} justify="center">
                        <Spinner size="lg" color="#6338A9" />
                    </Flex>
                ) : (
                    <VStack align="stretch" gap={4}>
                        {/* Master Status Bar */}
                        <Flex
                            p={4}
                            borderRadius="20px"
                            bg="var(--waba-card)"
                            border="1px solid"
                            borderColor="var(--waba-line)"
                            justify="space-between"
                            align="center"
                            gap={3}
                            flexWrap="wrap"
                        >
                            <HStack gap={3} flexWrap="wrap">
                                <HStack gap={2}>
                                    <Text fontSize="13.5px" fontWeight="800" color="var(--waba-ink)">
                                        전체 팝업 노출
                                    </Text>
                                    <Switch.Root
                                        checked={Boolean(popupSettings?.is_enabled)}
                                        onCheckedChange={(e) => handleTogglePopupEnabled(e.checked)}
                                        colorPalette="purple"
                                    >
                                        <Switch.HiddenInput />
                                        <Switch.Control />
                                    </Switch.Root>
                                </HStack>

                                <Box
                                    bg="var(--waba-purple-soft)"
                                    color="var(--waba-purple-text)"
                                    fontSize="11px"
                                    fontWeight="800"
                                    px={2.5}
                                    py={0.5}
                                    borderRadius="999px"
                                >
                                    {DISMISS_POLICY_LABELS[popupSettings?.dismiss_policy || 'DAY']}
                                </Box>

                                <HStack gap={1}>
                                    {popupSettings?.show_pc && (
                                        <Box bg="var(--waba-surface)" border="1px solid" borderColor="var(--waba-line)" fontSize="10.5px" fontWeight="700" px={2} py="1px" borderRadius="999px" color="var(--waba-ink-2)">
                                            PC
                                        </Box>
                                    )}
                                    {popupSettings?.show_tablet && (
                                        <Box bg="var(--waba-surface)" border="1px solid" borderColor="var(--waba-line)" fontSize="10.5px" fontWeight="700" px={2} py="1px" borderRadius="999px" color="var(--waba-ink-2)">
                                            태블릿
                                        </Box>
                                    )}
                                    {popupSettings?.show_mobile && (
                                        <Box bg="var(--waba-surface)" border="1px solid" borderColor="var(--waba-line)" fontSize="10.5px" fontWeight="700" px={2} py="1px" borderRadius="999px" color="var(--waba-ink-2)">
                                            모바일
                                        </Box>
                                    )}
                                </HStack>
                            </HStack>

                            <Button
                                size="xs"
                                h="32px"
                                px={4}
                                borderRadius="999px"
                                bg="#6338A9"
                                color="#FFFFFF"
                                _hover={{ bg: '#522B8F' }}
                                gap={1}
                                onClick={() => router.push('/admin/notices/popups/new')}
                            >
                                <LuPlus size={14} />
                                팝업 이미지 추가
                            </Button>
                        </Flex>

                        <Grid templateColumns={{ base: '1fr', lg: '360px 1fr' }} gap={5} alignItems="start">
                            {/* Left: 4:5 Live Preview */}
                            <Box
                                p={4}
                                borderRadius="20px"
                                bg="var(--waba-card)"
                                border="1px solid"
                                borderColor="var(--waba-line)"
                            >
                                <Flex justify="space-between" align="center" mb={3}>
                                    <Text fontSize="13px" fontWeight="800" color="var(--waba-ink)">
                                        실시간 메인 팝업 미리보기 (4:5)
                                    </Text>
                                    <Text fontSize="11px" color="var(--waba-purple-text)" fontWeight="700">
                                        {previewList.length <= 1 ? '1장 단일' : `${previewList.length}장 스와이퍼`}
                                    </Text>
                                </Flex>

                                <Box
                                    borderRadius="18px"
                                    overflow="hidden"
                                    border="1px solid"
                                    borderColor="var(--waba-line)"
                                    bg="var(--waba-surface)"
                                >
                                    <Box position="relative" w="100%" aspectRatio={4 / 5}>
                                        {currentPreviewSlide?.image_url ? (
                                            <Image
                                                src={resolveMediaUrl(currentPreviewSlide.image_url)}
                                                alt={currentPreviewSlide.title || '미리보기'}
                                                w="100%"
                                                h="100%"
                                                objectFit="cover"
                                            />
                                        ) : (
                                            <Flex h="100%" align="center" justify="center" color="var(--waba-ink-3)" fontSize="12.5px">
                                                활성 팝업 이미지가 없습니다.
                                            </Flex>
                                        )}

                                        {previewList.length > 1 && (
                                            <>
                                                <IconButton
                                                    aria-label="이전"
                                                    size="xs"
                                                    rounded="full"
                                                    position="absolute"
                                                    left={2}
                                                    top="50%"
                                                    transform="translateY(-50%)"
                                                    bg="blackAlpha.600"
                                                    color="white"
                                                    onClick={() =>
                                                        setPreviewSlideIdx((p) => (p - 1 + previewList.length) % previewList.length)
                                                    }
                                                >
                                                    <LuChevronLeft size={14} />
                                                </IconButton>
                                                <IconButton
                                                    aria-label="다음"
                                                    size="xs"
                                                    rounded="full"
                                                    position="absolute"
                                                    right={2}
                                                    top="50%"
                                                    transform="translateY(-50%)"
                                                    bg="blackAlpha.600"
                                                    color="white"
                                                    onClick={() =>
                                                        setPreviewSlideIdx((p) => (p + 1) % previewList.length)
                                                    }
                                                >
                                                    <LuChevronRight size={14} />
                                                </IconButton>
                                            </>
                                        )}
                                    </Box>
                                    <Flex justify="space-between" px={3.5} py={2.5} bg="var(--waba-card)" borderTop="1px solid" borderColor="var(--waba-line)" fontSize="11.5px" color="var(--waba-ink-2)">
                                        <Text>{DISMISS_POLICY_LABELS[popupSettings?.dismiss_policy || 'DAY']}</Text>
                                        <Text fontWeight="700" color="var(--waba-ink)">닫기</Text>
                                    </Flex>
                                </Box>
                            </Box>

                            {/* Right: Ordered Slide List */}
                            <VStack align="stretch" gap={2.5}>
                                {popupSlides.length === 0 ? (
                                    <Box p={12} textAlign="center" borderRadius="20px" bg="var(--waba-card)" border="1px solid" borderColor="var(--waba-line)">
                                        <Text color="var(--waba-ink-3)" fontSize="14px">
                                            등록된 팝업 슬라이드가 없습니다.
                                        </Text>
                                    </Box>
                                ) : (
                                    popupSlides.map((s, idx) => {
                                        const st = getEffectiveStatusBadge(s.effective_status || s.display_status);
                                        return (
                                            <Flex
                                                key={s.id}
                                                p={3.5}
                                                borderRadius="16px"
                                                bg="var(--waba-card)"
                                                border="1px solid"
                                                borderColor="var(--waba-line)"
                                                justify="space-between"
                                                align="center"
                                                gap={3}
                                                flexWrap="wrap"
                                            >
                                                <HStack gap={3} flex={1} minW={0}>
                                                    <VStack gap={1}>
                                                        <IconButton
                                                            aria-label="위로"
                                                            size="2xs"
                                                            variant="outline"
                                                            borderColor="var(--waba-line)"
                                                            color="var(--waba-ink-2)"
                                                            rounded="full"
                                                            disabled={reorderingSlides || idx === 0}
                                                            onClick={() => handleMovePopupSlide(idx, 'up')}
                                                        >
                                                            <LuArrowUp size={12} />
                                                        </IconButton>
                                                        <IconButton
                                                            aria-label="아래로"
                                                            size="2xs"
                                                            variant="outline"
                                                            borderColor="var(--waba-line)"
                                                            color="var(--waba-ink-2)"
                                                            rounded="full"
                                                            disabled={reorderingSlides || idx === popupSlides.length - 1}
                                                            onClick={() => handleMovePopupSlide(idx, 'down')}
                                                        >
                                                            <LuArrowDown size={12} />
                                                        </IconButton>
                                                    </VStack>

                                                    <Box w="56px" h="70px" borderRadius="10px" overflow="hidden" bg="var(--waba-surface)" flexShrink={0}>
                                                        {s.image_url && (
                                                            <Image
                                                                src={resolveMediaUrl(s.image_url)}
                                                                alt={s.title || '슬라이드'}
                                                                w="100%"
                                                                h="100%"
                                                                objectFit="cover"
                                                            />
                                                        )}
                                                    </Box>

                                                    <Box flex={1} minW={0}>
                                                        <HStack gap={1.5} mb={1}>
                                                            <Box bg={st.bg} color={st.color} fontSize="10px" fontWeight="800" px={2} py="1px" borderRadius="999px">
                                                                {st.label}
                                                            </Box>
                                                            <Text fontSize="11px" color="var(--waba-ink-3)">
                                                                #{idx + 1} · {formatPeriodRange(s.start_at, s.end_at)}
                                                            </Text>
                                                        </HStack>
                                                        <Text fontSize="13.5px" fontWeight="800" color="var(--waba-ink)" truncate>
                                                            {s.title || `(팝업 슬라이드 #${s.id})`}
                                                        </Text>
                                                        <Text fontSize="11.5px" color="var(--waba-ink-3)" truncate>
                                                            {s.link_url || '링크 없음'}
                                                        </Text>
                                                    </Box>
                                                </HStack>

                                                <Button
                                                    size="xs"
                                                    h="30px"
                                                    px={3.5}
                                                    borderRadius="999px"
                                                    bg="#6338A9"
                                                    color="#FFFFFF"
                                                    _hover={{ bg: '#522B8F' }}
                                                    onClick={() => router.push(`/admin/notices/popups/${s.id}`)}
                                                >
                                                    상세 편집
                                                </Button>
                                            </Flex>
                                        );
                                    })
                                )}
                            </VStack>
                        </Grid>
                    </VStack>
                )
            )}
        </Box>
    );
}
