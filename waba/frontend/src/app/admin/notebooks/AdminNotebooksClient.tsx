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
    Input,
    Spinner,
    Text,
    VStack,
} from '@chakra-ui/react';
import { LuLock, LuLink, LuRefreshCw, LuSearch } from 'react-icons/lu';
import axiosInstance from '@/utils/api';
import { toaster } from '@/components/ui/toaster';
import UserAvatar from '../../(main)/common/UserAvatar';
import { getRoleBadgeProps } from '../posts/PostAdminDetailDialog';
import HistoryDetailDialog, { getSpeciesLabel } from './HistoryDetailDialog';
import NotebookGroupDetailDialog from './NotebookGroupDetailDialog';

const SOURCE_TABS = [
    { key: 'ALL', label: '전체' },
    { key: 'AI', label: 'AI 자동 추출' },
    { key: 'MANUAL', label: '직접 작성' },
    { key: 'GROUPS', label: '그룹' },
];

const GROUP_SCOPE_TABS = [
    { key: 'ALL', label: '전체' },
    { key: 'PUBLIC', label: '전체 공개' },
    { key: 'LINK_ONLY', label: '링크 공유' },
    { key: 'PRIVATE', label: '비공개' },
];

const GROUP_STATUS_OPTIONS = [
    { key: 'ALL', label: '전체 상태' },
    { key: 'ACTIVE', label: '진행 중' },
    { key: 'CURED', label: '완치' },
    { key: 'COMPLETED', label: '목표 달성' },
];

const GROUP_CATEGORY_OPTIONS = [
    { key: 'ALL', label: '전체 카테고리' },
    { key: 'DISEASE', label: '질병·관절' },
    { key: 'DERMATOLOGY', label: '피부·알러지' },
    { key: 'DIET', label: '식단·다이어트' },
    { key: 'CARE', label: '일상 케어' },
    { key: 'CHECKUP', label: '건강검진' },
    { key: 'REVIEW', label: '사용기' },
    { key: 'OTHER', label: '기타' },
];

const JOURNEY_CATEGORY_LABELS: Record<string, string> = {
    DISEASE: '질병·관절',
    DERMATOLOGY: '피부·알러지',
    DIET: '식단·다이어트',
    CARE: '일상 케어',
    CHECKUP: '건강검진',
    REVIEW: '사용기',
    OTHER: '기타',
};

const JOURNEY_STATUS_LABELS: Record<string, { label: string; bg: string; color: string }> = {
    ACTIVE: { label: '진행 중', bg: 'var(--waba-purple-soft)', color: 'var(--waba-purple-text)' },
    IN_PROGRESS: { label: '진행 중', bg: 'var(--waba-purple-soft)', color: 'var(--waba-purple-text)' },
    CURED: { label: '완치', bg: 'rgba(16, 185, 129, 0.14)', color: '#10B981' },
    COMPLETED: { label: '목표 달성', bg: 'rgba(59, 130, 246, 0.14)', color: '#3B82F6' },
};

const SCOPE_BADGE_MAP: Record<string, { label: string; bg: string; color: string }> = {
    PUBLIC: { label: '전체 공개', bg: 'rgba(16, 185, 129, 0.14)', color: '#10B981' },
    LINK_ONLY: { label: '링크 공유', bg: 'rgba(245, 158, 11, 0.14)', color: '#D97706' },
    PRIVATE: { label: '비공개', bg: 'rgba(239, 68, 68, 0.14)', color: '#EF4444' },
};

const VISIBILITY_TABS = [
    { key: 'ALL', label: '전체' },
    { key: 'PUBLIC', label: '공개' },
    { key: 'PRIVATE', label: '비공개' },
];

const CATEGORY_OPTIONS = [
    { key: 'ALL', label: '전체 카테고리' },
    { key: 'CHECKUP', label: '진료/검사' },
    { key: 'SURGERY', label: '수술/시술' },
    { key: 'VACCINE', label: '접종' },
    { key: 'WEIGHT', label: '체중' },
    { key: 'EVENT', label: '일상/이벤트' },
    { key: 'OTHER', label: '기타' },
];

const CATEGORY_LABELS: Record<string, string> = {
    CHECKUP: '진료/검사',
    SURGERY: '수술/시술',
    VACCINE: '접종',
    WEIGHT: '체중',
    EVENT: '일상/이벤트',
    OTHER: '기타',
};

export default function AdminNotebooksClient() {
    const [loading, setLoading] = useState(true);
    const [histories, setHistories] = useState<any[]>([]);
    const [kpi, setKpi] = useState<any>({});
    const [categoryDistribution, setCategoryDistribution] = useState<any[]>([]);

    const [sourceFilter, setSourceFilter] = useState('ALL');
    const [visibilityFilter, setVisibilityFilter] = useState('ALL');
    const [categoryFilter, setCategoryFilter] = useState('ALL');
    const [searchInput, setSearchInput] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    // Groups state
    const [notebooks, setNotebooks] = useState<any[]>([]);
    const [groupScopeFilter, setGroupScopeFilter] = useState('ALL');
    const [groupStatusFilter, setGroupStatusFilter] = useState('ALL');
    const [groupCategoryFilter, setGroupCategoryFilter] = useState('ALL');
    const [groupPage, setGroupPage] = useState(1);
    const [groupTotalPages, setGroupTotalPages] = useState(1);

    // Dialogs
    const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
    const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null);
    const [groupDialogOpen, setGroupDialogOpen] = useState(false);
    const [selectedJourneyId, setSelectedJourneyId] = useState<string | null>(null);

    const fetchHistories = useCallback(async () => {
        setLoading(true);
        try {
            const res = await axiosInstance.get('/admin/histories', {
                params: {
                    source: sourceFilter === 'ALL' || sourceFilter === 'GROUPS' ? undefined : sourceFilter,
                    visibility: visibilityFilter === 'ALL' ? undefined : visibilityFilter,
                    category: categoryFilter === 'ALL' ? undefined : categoryFilter,
                    q: searchQuery || undefined,
                    page,
                    limit: 20,
                },
            });
            setHistories(res.data?.histories || []);
            setKpi(res.data?.kpi || {});
            setCategoryDistribution(res.data?.categoryDistribution || []);
            setTotalPages(res.data?.pagination?.totalPages || 1);
        } catch {
            toaster.create({ title: '건강 수첩 기록을 불러오지 못했습니다.', type: 'error' });
        } finally {
            setLoading(false);
        }
    }, [sourceFilter, visibilityFilter, categoryFilter, searchQuery, page]);

    const fetchNotebooks = useCallback(async () => {
        setLoading(true);
        try {
            const res = await axiosInstance.get('/admin/notebooks', {
                params: {
                    shareScope: groupScopeFilter === 'ALL' ? undefined : groupScopeFilter,
                    status: groupStatusFilter === 'ALL' ? undefined : groupStatusFilter,
                    category: groupCategoryFilter === 'ALL' ? undefined : groupCategoryFilter,
                    q: searchQuery || undefined,
                    page: groupPage,
                    limit: 20,
                },
            });
            setNotebooks(res.data?.notebooks || []);
            setGroupTotalPages(res.data?.pagination?.totalPages || 1);
        } catch {
            toaster.create({ title: '수첩 그룹 목록을 불러오지 못했습니다.', type: 'error' });
        } finally {
            setLoading(false);
        }
    }, [groupScopeFilter, groupStatusFilter, groupCategoryFilter, searchQuery, groupPage]);

    useEffect(() => {
        if (sourceFilter === 'GROUPS') {
            fetchNotebooks();
        } else {
            fetchHistories();
        }
    }, [sourceFilter, fetchHistories, fetchNotebooks]);

    const handleRefreshAll = useCallback(() => {
        fetchHistories();
        if (sourceFilter === 'GROUPS') {
            fetchNotebooks();
        }
    }, [sourceFilter, fetchHistories, fetchNotebooks]);

    const renderPetAvatarStack = (pets: any[]) => {
        if (!Array.isArray(pets) || pets.length === 0) return null;
        const visiblePets = pets.slice(0, 3);
        const extraPets = pets.slice(3);
        return (
            <Flex align="center">
                {visiblePets.map((p: any, idx: number) => {
                    const speciesLabel = getSpeciesLabel(p.species, p.custom_species);
                    return (
                        <Box
                            key={p.id || idx}
                            ml={idx > 0 ? '-8px' : '0'}
                            border="2px solid var(--waba-card)"
                            borderRadius="full"
                            overflow="hidden"
                            w="28px"
                            h="28px"
                            bg="var(--waba-surface)"
                            boxShadow="var(--waba-avatar-shadow, 0 2px 6px rgba(0, 0, 0, 0.22))"
                            flexShrink={0}
                            title={`${p.name || '반려동물'}${speciesLabel ? ` (${speciesLabel})` : ''}`}
                        >
                            <UserAvatar
                                src={p.current_avatar_url || p.profile_image || p.avatar}
                                alt={p.name || '반려동물'}
                                w="100%"
                                h="100%"
                                iconSize={13}
                                fallbackType="pet"
                            />
                        </Box>
                    );
                })}
                {extraPets.length > 0 && (
                    <Box
                        w="28px"
                        h="28px"
                        borderRadius="full"
                        ml="-8px"
                        bg="var(--waba-ink)"
                        color="var(--waba-bg)"
                        border="2px solid var(--waba-card)"
                        boxShadow="var(--waba-avatar-shadow, 0 2px 6px rgba(0, 0, 0, 0.22))"
                        display="flex"
                        alignItems="center"
                        justifyContent="center"
                        fontSize="10.5px"
                        fontWeight="800"
                        title={extraPets
                            .map((ep: any) => {
                                const sp = getSpeciesLabel(ep.species, ep.custom_species);
                                return `${ep.name || '반려동물'}${sp ? ` (${sp})` : ''}`;
                            })
                            .join(', ')}
                    >
                        +{extraPets.length}
                    </Box>
                )}
            </Flex>
        );
    };

    const aiRatioPct = Number(kpi.aiRatioPct ?? 0);
    const manualRatioPct = Math.max(0, 100 - aiRatioPct);

    return (
        <Box maxW="1400px" mx="auto" px={{ base: 4, md: 6 }} py={6}>
            {/* Header */}
            <Flex justify="space-between" align={{ base: 'flex-start', md: 'center' }} direction={{ base: 'column', md: 'row' }} gap={3} mb={5}>
                <Box>
                    <Heading size="xl" fontWeight="800" color="var(--waba-ink)">
                        건강 수첩 · AI 분석
                    </Heading>
                    <Text fontSize="13.5px" color="var(--waba-ink-3)" mt={1}>
                        AI 자동 추출 및 직접 작성된 건강 기록과 수첩 그룹의 공개 상태를 통합 관리합니다.
                    </Text>
                </Box>

                <IconButton
                    aria-label="새로고침"
                    size="sm"
                    variant="outline"
                    borderColor="var(--waba-line)"
                    color="var(--waba-ink)"
                    borderRadius="999px"
                    onClick={handleRefreshAll}
                >
                    <LuRefreshCw />
                </IconButton>
            </Flex>

            {/* 4 KPI Cards */}
            <Grid templateColumns={{ base: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }} gap={3} mb={5}>
                {[
                    {
                        label: '전체 건강 기록',
                        value: kpi.totalHistories ?? 0,
                        sub: `AI 자동 ${kpi.aiCount ?? 0} · 직접 작성 ${kpi.manualCount ?? 0} · 비공개 ${kpi.privateHistoryCount ?? 0}`,
                        color: 'var(--waba-ink)',
                    },
                    {
                        label: '전체 수첩 그룹',
                        value: kpi.totalJourneys ?? 0,
                        sub: `전체 공개 ${kpi.publicJourneys ?? 0} · 링크 공유 ${kpi.linkOnlyJourneys ?? 0} · 비공개 ${kpi.privateJourneys ?? 0}`,
                        color: '#6338A9',
                    },
                    {
                        label: '진행 중 케어',
                        value: kpi.activeJourneys ?? 0,
                        sub: `진행 중 ${kpi.activeJourneys ?? 0} · 완료/완치 ${kpi.completedJourneys ?? 0}`,
                        color: '#10B981',
                    },
                    {
                        label: 'AI 자동 일지 활성',
                        value: kpi.autoJournalEnabledUsers ?? 0,
                        sub: `전체 활성 회원 ${kpi.totalActiveUsers ?? 0}명 (${kpi.autoJournalRatioPct ?? 0}%)`,
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

            {/* 2 Analytics Cards */}
            <Grid templateColumns={{ base: '1fr', lg: '1fr 1fr' }} gap={4} mb={5}>
                {/* Left: AI vs Manual Ratio */}
                <Box
                    p={4}
                    borderRadius="20px"
                    bg="var(--waba-card)"
                    border="1px solid"
                    borderColor="var(--waba-line)"
                >
                    <Text fontSize="13.5px" fontWeight="800" color="var(--waba-ink)" mb={3}>
                        AI 자동 추출 vs 직접 작성 비율
                    </Text>
                    <Flex h="14px" borderRadius="999px" overflow="hidden" bg="var(--waba-surface)" mb={3}>
                        <Box w={`${aiRatioPct}%`} bg="#6338A9" transition="width 0.3s ease" />
                        <Box w={`${manualRatioPct}%`} bg="#10B981" transition="width 0.3s ease" />
                    </Flex>
                    <HStack justify="space-between" fontSize="12px" color="var(--waba-ink-2)" flexWrap="wrap" gap={2}>
                        <HStack gap={2}>
                            <Box w="10px" h="10px" borderRadius="full" bg="#6338A9" />
                            <Text fontWeight="700">AI 자동 추출: {kpi.aiCount ?? 0}건 ({aiRatioPct}%)</Text>
                        </HStack>
                        <HStack gap={2}>
                            <Box w="10px" h="10px" borderRadius="full" bg="#10B981" />
                            <Text fontWeight="700">직접 작성: {kpi.manualCount ?? 0}건 ({manualRatioPct}%)</Text>
                        </HStack>
                    </HStack>
                </Box>

                {/* Right: Category Distribution */}
                <Box
                    p={4}
                    borderRadius="20px"
                    bg="var(--waba-card)"
                    border="1px solid"
                    borderColor="var(--waba-line)"
                >
                    <Text fontSize="13.5px" fontWeight="800" color="var(--waba-ink)" mb={3}>
                        카테고리별 기록 분포
                    </Text>
                    <VStack align="stretch" gap={2}>
                        {categoryDistribution.length === 0 ? (
                            <Text fontSize="12px" color="var(--waba-ink-3)">
                                분포 데이터가 없습니다.
                            </Text>
                        ) : (
                            categoryDistribution.map((c: any) => (
                                <Flex key={c.category} align="center" gap={3}>
                                    <Text fontSize="11.5px" fontWeight="700" color="var(--waba-ink-2)" w="84px" flexShrink={0}>
                                        {CATEGORY_LABELS[c.category] || c.category}
                                    </Text>
                                    <Box flex={1} h="8px" borderRadius="999px" bg="var(--waba-surface)" overflow="hidden">
                                        <Box h="100%" w={`${c.pct ?? 0}%`} bg="#6338A9" borderRadius="999px" />
                                    </Box>
                                    <Text fontSize="11px" fontWeight="700" color="var(--waba-ink-3)" w="68px" textAlign="right" flexShrink={0}>
                                        {c.count ?? 0}건 ({c.pct ?? 0}%)
                                    </Text>
                                </Flex>
                            ))
                        )}
                    </VStack>
                </Box>
            </Grid>

            {/* Filter Bar */}
            <Box
                p={4}
                borderRadius="20px"
                bg="var(--waba-card)"
                border="1px solid"
                borderColor="var(--waba-line)"
                mb={4}
            >
                <VStack align="stretch" gap={3}>
                    <Flex justify="space-between" align="center" gap={3} flexWrap="wrap">
                        <HStack gap={1.5} flexWrap="wrap">
                            {SOURCE_TABS.map((tab) => (
                                <Button
                                    key={tab.key}
                                    size="xs"
                                    h="28px"
                                    px={3}
                                    borderRadius="999px"
                                    bg={sourceFilter === tab.key ? 'var(--waba-ink)' : 'var(--waba-surface)'}
                                    color={sourceFilter === tab.key ? 'var(--waba-bg)' : 'var(--waba-ink-2)'}
                                    border="1px solid"
                                    borderColor={sourceFilter === tab.key ? 'var(--waba-ink)' : 'var(--waba-line)'}
                                    fontSize="11.5px"
                                    fontWeight="700"
                                    onClick={() => {
                                        setSourceFilter(tab.key);
                                        if (tab.key === 'GROUPS') {
                                            setGroupPage(1);
                                        } else {
                                            setPage(1);
                                        }
                                    }}
                                >
                                    {tab.label}
                                </Button>
                            ))}
                        </HStack>

                        {sourceFilter === 'GROUPS' ? (
                            <HStack gap={1.5} flexWrap="wrap">
                                {GROUP_SCOPE_TABS.map((tab) => (
                                    <Button
                                        key={tab.key}
                                        size="xs"
                                        h="28px"
                                        px={3}
                                        borderRadius="999px"
                                        bg={groupScopeFilter === tab.key ? '#6338A9' : 'var(--waba-surface)'}
                                        color={groupScopeFilter === tab.key ? '#FFFFFF' : 'var(--waba-ink-2)'}
                                        border="1px solid"
                                        borderColor={groupScopeFilter === tab.key ? '#6338A9' : 'var(--waba-line)'}
                                        fontSize="11.5px"
                                        fontWeight="700"
                                        onClick={() => {
                                            setGroupScopeFilter(tab.key);
                                            setGroupPage(1);
                                        }}
                                    >
                                        {tab.label}
                                    </Button>
                                ))}
                            </HStack>
                        ) : (
                            <HStack gap={1.5} flexWrap="wrap">
                                {VISIBILITY_TABS.map((tab) => (
                                    <Button
                                        key={tab.key}
                                        size="xs"
                                        h="28px"
                                        px={3}
                                        borderRadius="999px"
                                        bg={visibilityFilter === tab.key ? '#6338A9' : 'var(--waba-surface)'}
                                        color={visibilityFilter === tab.key ? '#FFFFFF' : 'var(--waba-ink-2)'}
                                        border="1px solid"
                                        borderColor={visibilityFilter === tab.key ? '#6338A9' : 'var(--waba-line)'}
                                        fontSize="11.5px"
                                        fontWeight="700"
                                        onClick={() => {
                                            setVisibilityFilter(tab.key);
                                            setPage(1);
                                        }}
                                    >
                                        {tab.label}
                                    </Button>
                                ))}
                            </HStack>
                        )}

                        <HStack gap={2} flexWrap="wrap">
                            <Input
                                value={searchInput}
                                onChange={(e) => setSearchInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        setSearchQuery(searchInput.trim());
                                        if (sourceFilter === 'GROUPS') {
                                            setGroupPage(1);
                                        } else {
                                            setPage(1);
                                        }
                                    }
                                }}
                                placeholder="기록 제목, 병원명, 반려동물명, 작성자, 그룹명 검색..."
                                size="sm"
                                w={{ base: '200px', md: '280px' }}
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
                                onClick={() => {
                                    setSearchQuery(searchInput.trim());
                                    if (sourceFilter === 'GROUPS') {
                                        setGroupPage(1);
                                    } else {
                                        setPage(1);
                                    }
                                }}
                            >
                                <LuSearch size={14} />
                            </IconButton>
                        </HStack>
                    </Flex>

                    {sourceFilter === 'GROUPS' ? (
                        <Flex gap={3} flexWrap="wrap" align="center">
                            <HStack gap={1.5} flexWrap="wrap">
                                {GROUP_STATUS_OPTIONS.map((opt) => (
                                    <Button
                                        key={opt.key}
                                        size="xs"
                                        h="26px"
                                        px={2.5}
                                        borderRadius="999px"
                                        bg={groupStatusFilter === opt.key ? 'var(--waba-ink)' : 'var(--waba-surface)'}
                                        color={groupStatusFilter === opt.key ? 'var(--waba-bg)' : 'var(--waba-ink-3)'}
                                        border="1px solid"
                                        borderColor={groupStatusFilter === opt.key ? 'var(--waba-ink)' : 'var(--waba-line)'}
                                        fontSize="11px"
                                        fontWeight="700"
                                        onClick={() => {
                                            setGroupStatusFilter(opt.key);
                                            setGroupPage(1);
                                        }}
                                    >
                                        {opt.label}
                                    </Button>
                                ))}
                            </HStack>

                            <HStack gap={1.5} flexWrap="wrap">
                                {GROUP_CATEGORY_OPTIONS.map((opt) => (
                                    <Button
                                        key={opt.key}
                                        size="xs"
                                        h="26px"
                                        px={2.5}
                                        borderRadius="999px"
                                        bg={groupCategoryFilter === opt.key ? 'var(--waba-purple-soft)' : 'var(--waba-surface)'}
                                        color={groupCategoryFilter === opt.key ? 'var(--waba-purple-text)' : 'var(--waba-ink-3)'}
                                        border="1px solid"
                                        borderColor={groupCategoryFilter === opt.key ? 'var(--waba-purple-border)' : 'var(--waba-line)'}
                                        fontSize="11px"
                                        fontWeight="700"
                                        onClick={() => {
                                            setGroupCategoryFilter(opt.key);
                                            setGroupPage(1);
                                        }}
                                    >
                                        {opt.label}
                                    </Button>
                                ))}
                            </HStack>
                        </Flex>
                    ) : (
                        <HStack gap={1.5} flexWrap="wrap">
                            {CATEGORY_OPTIONS.map((opt) => (
                                <Button
                                    key={opt.key}
                                    size="xs"
                                    h="26px"
                                    px={2.5}
                                    borderRadius="999px"
                                    bg={categoryFilter === opt.key ? 'var(--waba-purple-soft)' : 'var(--waba-surface)'}
                                    color={categoryFilter === opt.key ? 'var(--waba-purple-text)' : 'var(--waba-ink-3)'}
                                    border="1px solid"
                                    borderColor={categoryFilter === opt.key ? 'var(--waba-purple-border)' : 'var(--waba-line)'}
                                    fontSize="11px"
                                    fontWeight="700"
                                    onClick={() => {
                                        setCategoryFilter(opt.key);
                                        setPage(1);
                                    }}
                                >
                                    {opt.label}
                                </Button>
                            ))}
                        </HStack>
                    )}
                </VStack>
            </Box>

            {/* Table */}
            {loading ? (
                <Flex py={20} justify="center">
                    <Spinner size="lg" color="#6338A9" />
                </Flex>
            ) : sourceFilter === 'GROUPS' ? (
                notebooks.length === 0 ? (
                    <Box p={12} textAlign="center" borderRadius="20px" bg="var(--waba-card)" border="1px solid" borderColor="var(--waba-line)">
                        <Text color="var(--waba-ink-3)" fontSize="14px">
                            조건에 해당하는 수첩 그룹이 없습니다.
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
                        <Box as="table" w="100%" minW="960px" borderCollapse="collapse">
                            <Box as="thead" bg="var(--waba-surface)" borderBottom="1px solid" borderColor="var(--waba-line)">
                                <Box as="tr">
                                    {['공개 범위 / 상태', '카테고리', '그룹명 및 메타', '연결 펫', '작성자', '액션'].map((col) => (
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
                                {notebooks.map((nb) => {
                                    const scopeBadge = SCOPE_BADGE_MAP[nb.share_scope] || SCOPE_BADGE_MAP.PRIVATE;
                                    const statusBadge = JOURNEY_STATUS_LABELS[nb.status] || {
                                        label: nb.status || '-',
                                        bg: 'var(--waba-surface)',
                                        color: 'var(--waba-ink-2)',
                                    };
                                    const roleBadge = getRoleBadgeProps(nb.author_role);
                                    const pets: any[] = Array.isArray(nb.pets) ? nb.pets : [];
                                    const desc = nb.goal_summary || nb.description;

                                    return (
                                        <Box
                                            as="tr"
                                            key={nb.id}
                                            borderBottom="1px solid"
                                            borderColor="var(--waba-line)"
                                            _last={{ borderBottom: 'none' }}
                                            _hover={{ bg: 'var(--waba-surface)' }}
                                        >
                                            {/* 공개 범위 / 상태 */}
                                            <Box as="td" px={4} py={3.5} verticalAlign="middle" whiteSpace="nowrap">
                                                <HStack gap={1.5} mb={1}>
                                                    <Box
                                                        bg={scopeBadge.bg}
                                                        color={scopeBadge.color}
                                                        fontSize="10px"
                                                        fontWeight="800"
                                                        px={2}
                                                        py="1px"
                                                        borderRadius="999px"
                                                    >
                                                        {scopeBadge.label}
                                                    </Box>
                                                    <Box
                                                        bg={statusBadge.bg}
                                                        color={statusBadge.color}
                                                        fontSize="10px"
                                                        fontWeight="800"
                                                        px={2}
                                                        py="1px"
                                                        borderRadius="999px"
                                                    >
                                                        {statusBadge.label}
                                                    </Box>
                                                </HStack>
                                                <Text fontSize="11.5px" color="var(--waba-ink-3)">
                                                    {nb.start_date ? `${nb.start_date} ~ ${nb.end_date || '진행 중'}` : '-'}
                                                </Text>
                                            </Box>

                                            {/* 카테고리 */}
                                            <Box as="td" px={4} py={3.5} verticalAlign="middle" whiteSpace="nowrap">
                                                <Box
                                                    display="inline-block"
                                                    bg="var(--waba-surface)"
                                                    color="var(--waba-ink-2)"
                                                    border="1px solid"
                                                    borderColor="var(--waba-line)"
                                                    fontSize="11px"
                                                    fontWeight="700"
                                                    px={2.5}
                                                    py={0.5}
                                                    borderRadius="999px"
                                                >
                                                    {JOURNEY_CATEGORY_LABELS[nb.category] || nb.category || '-'}
                                                </Box>
                                            </Box>

                                            {/* 그룹명 및 메타 */}
                                            <Box as="td" px={4} py={3.5} verticalAlign="middle" maxW="320px">
                                                <Text fontSize="13.5px" fontWeight="800" color="var(--waba-ink)" truncate>
                                                    {nb.title || `(수첩 #${nb.id})`}
                                                </Text>
                                                <Text fontSize="11.5px" color="var(--waba-ink-3)" mt={0.5} truncate>
                                                    기록 {nb.record_count ?? 0}건 · 스크랩 {nb.scrap_count ?? 0} · 댓글 {nb.comment_count ?? 0}
                                                </Text>
                                                {desc && (
                                                    <Text fontSize="11px" color="var(--waba-ink-3)" mt={0.5} truncate>
                                                        {desc}
                                                    </Text>
                                                )}
                                            </Box>

                                            {/* 연결 펫 */}
                                            <Box as="td" px={4} py={3.5} verticalAlign="middle">
                                                {renderPetAvatarStack(pets)}
                                            </Box>

                                            {/* 작성자 */}
                                            <Box as="td" px={4} py={3.5} verticalAlign="middle" whiteSpace="nowrap">
                                                <HStack gap={2}>
                                                    <UserAvatar src={nb.author_avatar} alt={nb.author_nickname || '작성자'} size="2xs" fallbackType="user" />
                                                    <Text fontSize="12px" fontWeight="700" color="var(--waba-ink)">
                                                        {nb.author_nickname || '-'}
                                                    </Text>
                                                    <Box
                                                        bg={roleBadge.bg}
                                                        color={roleBadge.color}
                                                        border="1px solid"
                                                        borderColor={roleBadge.borderColor}
                                                        fontSize="10px"
                                                        fontWeight="800"
                                                        px={2}
                                                        py="1px"
                                                        borderRadius="999px"
                                                    >
                                                        {roleBadge.label}
                                                    </Box>
                                                </HStack>
                                            </Box>

                                            {/* 액션 */}
                                            <Box as="td" px={4} py={3.5} verticalAlign="middle" whiteSpace="nowrap">
                                                <Button
                                                    size="xs"
                                                    h="30px"
                                                    px={3.5}
                                                    borderRadius="999px"
                                                    bg="#6338A9"
                                                    color="#FFFFFF"
                                                    _hover={{ bg: '#522B8F' }}
                                                    onClick={() => {
                                                        setSelectedJourneyId(String(nb.id));
                                                        setGroupDialogOpen(true);
                                                    }}
                                                >
                                                    상세보기
                                                </Button>
                                            </Box>
                                        </Box>
                                    );
                                })}
                            </Box>
                        </Box>
                    </Box>
                )
            ) : histories.length === 0 ? (
                <Box p={12} textAlign="center" borderRadius="20px" bg="var(--waba-card)" border="1px solid" borderColor="var(--waba-line)">
                    <Text color="var(--waba-ink-3)" fontSize="14px">
                        조건에 해당하는 건강 기록이 없습니다.
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
                    <Box as="table" w="100%" minW="960px" borderCollapse="collapse">
                        <Box as="thead" bg="var(--waba-surface)" borderBottom="1px solid" borderColor="var(--waba-line)">
                            <Box as="tr">
                                {['구분 / 날짜', '카테고리', '기록 제목 및 메타', '연결 펫 · 수첩', '작성자', '액션'].map((col) => (
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
                            {histories.map((item) => {
                                const isAi = item.source_type === 'AI' || item.is_ai_generated;
                                const roleBadge = getRoleBadgeProps(item.author_role);
                                const pets: any[] = Array.isArray(item.pets) ? item.pets : [];
                                const visiblePets = pets.slice(0, 3);
                                const extraPets = pets.slice(3);
                                const metaParts = [
                                    item.hospital_name || null,
                                    item.weight_kg ? `${item.weight_kg}kg` : null,
                                    Number(item.post_count || 0) > 0 ? `연결 글 ${item.post_count}건` : null,
                                ].filter(Boolean);

                                return (
                                    <Box
                                        as="tr"
                                        key={item.id}
                                        borderBottom="1px solid"
                                        borderColor="var(--waba-line)"
                                        _last={{ borderBottom: 'none' }}
                                        _hover={{ bg: 'var(--waba-surface)' }}
                                    >
                                        {/* 구분 / 날짜 */}
                                        <Box as="td" px={4} py={3.5} verticalAlign="middle" whiteSpace="nowrap">
                                            <HStack gap={1.5} mb={1}>
                                                <Box
                                                    bg={isAi ? 'var(--waba-purple-soft)' : 'var(--waba-surface)'}
                                                    color={isAi ? 'var(--waba-purple-text)' : 'var(--waba-ink-2)'}
                                                    border="1px solid"
                                                    borderColor={isAi ? 'var(--waba-purple-border)' : 'var(--waba-line)'}
                                                    fontSize="10px"
                                                    fontWeight="800"
                                                    px={2}
                                                    py="1px"
                                                    borderRadius="999px"
                                                >
                                                    {isAi ? 'AI 자동' : '직접 작성'}
                                                </Box>
                                                {item.is_private && (
                                                    <Box
                                                        bg="rgba(239, 68, 68, 0.14)"
                                                        color="#EF4444"
                                                        fontSize="10px"
                                                        fontWeight="800"
                                                        px={2}
                                                        py="1px"
                                                        borderRadius="999px"
                                                    >
                                                        비공개
                                                    </Box>
                                                )}
                                            </HStack>
                                            <Text fontSize="11.5px" color="var(--waba-ink-3)">
                                                {item.event_date || '-'}
                                            </Text>
                                        </Box>

                                        {/* 카테고리 */}
                                        <Box as="td" px={4} py={3.5} verticalAlign="middle" whiteSpace="nowrap">
                                            <Box
                                                display="inline-block"
                                                bg="var(--waba-surface)"
                                                color="var(--waba-ink-2)"
                                                border="1px solid"
                                                borderColor="var(--waba-line)"
                                                fontSize="11px"
                                                fontWeight="700"
                                                px={2.5}
                                                py={0.5}
                                                borderRadius="999px"
                                            >
                                                {CATEGORY_LABELS[item.category] || item.category || '기타'}
                                            </Box>
                                        </Box>

                                        {/* 기록 제목 및 메타 */}
                                        <Box as="td" px={4} py={3.5} verticalAlign="middle" maxW="300px">
                                            <Text fontSize="13.5px" fontWeight="800" color="var(--waba-ink)" truncate>
                                                {item.title || `(기록 #${item.id})`}
                                            </Text>
                                            {metaParts.length > 0 && (
                                                <Text fontSize="11.5px" color="var(--waba-ink-3)" mt={0.5} truncate>
                                                    {metaParts.join(' · ')}
                                                </Text>
                                            )}
                                        </Box>

                                        {/* 연결 펫 · 수첩 */}
                                        <Box as="td" px={4} py={3.5} verticalAlign="middle">
                                            <VStack align="flex-start" gap={1.5}>
                                                {renderPetAvatarStack(pets)}

                                                {item.journey_id && (() => {
                                                    const scopeTooltip =
                                                        item.journey_share_scope === 'PRIVATE'
                                                            ? '비공개 (작성자만 열람 가능)'
                                                            : item.journey_share_scope === 'LINK_ONLY'
                                                                ? '링크 공유 (공유 URL 보유자만 열람 가능)'
                                                                : '전체 공개 (모든 사용자에게 공개)';
                                                    return (
                                                        <Button
                                                            size="2xs"
                                                            variant="outline"
                                                            borderColor="var(--waba-purple-border)"
                                                            bg="var(--waba-purple-soft)"
                                                            color="var(--waba-purple-text)"
                                                            borderRadius="999px"
                                                            px={2.5}
                                                            gap={1}
                                                            maxW="200px"
                                                            title={`${item.journey_title || `수첩 #${item.journey_id}`} · ${scopeTooltip}`}
                                                            onClick={() => {
                                                                setSelectedJourneyId(String(item.journey_id));
                                                                setGroupDialogOpen(true);
                                                            }}
                                                        >
                                                            {item.journey_share_scope === 'PRIVATE' && (
                                                                <Box as="span" display="inline-flex" title={scopeTooltip}>
                                                                    <LuLock size={10} />
                                                                </Box>
                                                            )}
                                                            {item.journey_share_scope === 'LINK_ONLY' && (
                                                                <Box as="span" display="inline-flex" title={scopeTooltip}>
                                                                    <LuLink size={10} />
                                                                </Box>
                                                            )}
                                                            <Text truncate fontSize="10.5px" fontWeight="700">
                                                                {item.journey_title || `수첩 #${item.journey_id}`}
                                                            </Text>
                                                        </Button>
                                                    );
                                                })()}
                                            </VStack>
                                        </Box>

                                        {/* 작성자 */}
                                        <Box as="td" px={4} py={3.5} verticalAlign="middle" whiteSpace="nowrap">
                                            <HStack gap={2}>
                                                <UserAvatar src={item.author_avatar} alt={item.author_nickname || '작성자'} size="2xs" fallbackType="user" />
                                                <Text fontSize="12px" fontWeight="700" color="var(--waba-ink)">
                                                    {item.author_nickname || '-'}
                                                </Text>
                                                <Box
                                                    bg={roleBadge.bg}
                                                    color={roleBadge.color}
                                                    border="1px solid"
                                                    borderColor={roleBadge.borderColor}
                                                    fontSize="10px"
                                                    fontWeight="800"
                                                    px={2}
                                                    py="1px"
                                                    borderRadius="999px"
                                                >
                                                    {roleBadge.label}
                                                </Box>
                                            </HStack>
                                        </Box>

                                        {/* 액션 */}
                                        <Box as="td" px={4} py={3.5} verticalAlign="middle" whiteSpace="nowrap">
                                            <Button
                                                size="xs"
                                                h="30px"
                                                px={3.5}
                                                borderRadius="999px"
                                                bg="#6338A9"
                                                color="#FFFFFF"
                                                _hover={{ bg: '#522B8F' }}
                                                onClick={() => {
                                                    setSelectedHistoryId(String(item.id));
                                                    setHistoryDialogOpen(true);
                                                }}
                                            >
                                                상세보기
                                            </Button>
                                        </Box>
                                    </Box>
                                );
                            })}
                        </Box>
                    </Box>
                </Box>
            )}

            {/* Pagination */}
            {(sourceFilter === 'GROUPS' ? groupTotalPages : totalPages) > 1 && (
                <HStack justify="center" gap={2} mt={6}>
                    <Button
                        size="xs"
                        variant="outline"
                        borderColor="var(--waba-line)"
                        color="var(--waba-ink)"
                        disabled={(sourceFilter === 'GROUPS' ? groupPage : page) <= 1}
                        onClick={() => {
                            if (sourceFilter === 'GROUPS') {
                                setGroupPage((p) => Math.max(1, p - 1));
                            } else {
                                setPage((p) => Math.max(1, p - 1));
                            }
                        }}
                    >
                        이전
                    </Button>
                    <Text fontSize="12.5px" color="var(--waba-ink-2)" fontWeight="700">
                        {sourceFilter === 'GROUPS' ? `${groupPage} / ${groupTotalPages}` : `${page} / ${totalPages}`}
                    </Text>
                    <Button
                        size="xs"
                        variant="outline"
                        borderColor="var(--waba-line)"
                        color="var(--waba-ink)"
                        disabled={
                            sourceFilter === 'GROUPS' ? groupPage >= groupTotalPages : page >= totalPages
                        }
                        onClick={() => {
                            if (sourceFilter === 'GROUPS') {
                                setGroupPage((p) => Math.min(groupTotalPages, p + 1));
                            } else {
                                setPage((p) => Math.min(totalPages, p + 1));
                            }
                        }}
                    >
                        다음
                    </Button>
                </HStack>
            )}

            <HistoryDetailDialog
                open={historyDialogOpen}
                onOpenChange={setHistoryDialogOpen}
                historyId={selectedHistoryId}
                onUpdated={handleRefreshAll}
                onOpenGroup={(jId) => {
                    setSelectedJourneyId(jId);
                    setGroupDialogOpen(true);
                }}
            />

            <NotebookGroupDetailDialog
                open={groupDialogOpen}
                onOpenChange={setGroupDialogOpen}
                journeyId={selectedJourneyId}
                onUpdated={handleRefreshAll}
                onOpenHistory={(hId) => {
                    setGroupDialogOpen(false);
                    setSelectedHistoryId(hId);
                    setHistoryDialogOpen(true);
                }}
            />
        </Box>
    );
}
