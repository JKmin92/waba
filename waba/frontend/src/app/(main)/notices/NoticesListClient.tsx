'use client'

import React, { useCallback, useEffect, useState } from 'react';
import {
    Box,
    Button,
    Flex,
    Heading,
    HStack,
    IconButton,
    Input,
    Spinner,
    Text,
    VStack,
} from '@chakra-ui/react';
import { LuImage, LuPin, LuRotateCcw, LuSearch } from 'react-icons/lu';
import { useRouter } from 'next/navigation';
import axiosInstance from '@/utils/api';
import {
    extractNoticeSummary,
    formatDateShort,
    formatPeriodRange,
} from '@/app/admin/notices/types';

interface PublicNoticeItem {
    id: string | number;
    type: 'NOTICE' | 'EVENT';
    title: string;
    content: string;
    is_pinned?: boolean | number;
    event_status?: 'ONGOING' | 'ALWAYS' | 'UPCOMING' | 'ENDED' | null;
    event_start_at?: string | null;
    event_end_at?: string | null;
    view_count?: number;
    created_at?: string;
}

const EVENT_STATUS_BADGE: Record<string, { label: string; bg: string; color: string }> = {
    ONGOING: { label: '진행 중', bg: 'rgba(16, 185, 129, 0.14)', color: '#10B981' },
    ALWAYS: { label: '상시 진행', bg: 'var(--waba-purple-soft)', color: 'var(--waba-purple-text)' },
    UPCOMING: { label: '예정', bg: 'rgba(245, 158, 11, 0.14)', color: '#D97706' },
    ENDED: { label: '종료', bg: 'rgba(148, 163, 184, 0.18)', color: 'var(--waba-ink-3)' },
};

export default function NoticesListClient() {
    const router = useRouter();

    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const [typeFilter, setTypeFilter] = useState<'ALL' | 'NOTICE' | 'EVENT'>('ALL');
    const [onlyOngoingEvents, setOnlyOngoingEvents] = useState(false);
    const [searchInput, setSearchInput] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [page, setPage] = useState(1);

    const [counts, setCounts] = useState({ total: 0, noticeCount: 0, eventCount: 0 });
    const [pinnedNotices, setPinnedNotices] = useState<PublicNoticeItem[]>([]);
    const [notices, setNotices] = useState<PublicNoticeItem[]>([]);
    const [totalPages, setTotalPages] = useState(1);

    const fetchNotices = useCallback(async () => {
        setLoading(true);
        setErrorMsg(null);
        try {
            const res = await axiosInstance.get('/public/notices', {
                params: {
                    type: typeFilter,
                    onlyOngoingEvents,
                    q: searchQuery || undefined,
                    page,
                    pageSize: 10,
                },
            });
            setCounts(res.data?.counts || { total: 0, noticeCount: 0, eventCount: 0 });
            setPinnedNotices(res.data?.pinnedNotices || []);
            setNotices(res.data?.notices || []);
            setTotalPages(res.data?.pagination?.totalPages || 1);
        } catch (err: any) {
            setErrorMsg(err?.response?.data?.message || '공지 · 이벤트 목록을 불러오지 못했습니다.');
        } finally {
            setLoading(false);
        }
    }, [typeFilter, onlyOngoingEvents, searchQuery, page]);

    useEffect(() => {
        fetchNotices();
    }, [fetchNotices]);

    const handleReset = () => {
        setTypeFilter('ALL');
        setOnlyOngoingEvents(false);
        setSearchInput('');
        setSearchQuery('');
        setPage(1);
    };

    const renderNoticeRow = (n: PublicNoticeItem, isPinnedCard: boolean) => {
        const { text, imageCount } = extractNoticeSummary(n.content);
        const evBadge = n.type === 'EVENT' && n.event_status ? EVENT_STATUS_BADGE[n.event_status] : null;

        return (
            <Box
                key={n.id}
                p={{ base: 4, md: 5 }}
                borderRadius="18px"
                bg={isPinnedCard ? 'var(--waba-purple-soft)' : 'var(--waba-card)'}
                border="1px solid"
                borderColor={isPinnedCard ? 'var(--waba-purple-border)' : 'var(--waba-line)'}
                cursor="pointer"
                transition="transform 0.15s ease, border-color 0.15s ease"
                _hover={{
                    transform: 'translateY(-1px)',
                    borderColor: 'var(--waba-purple-border)',
                }}
                onClick={() => router.push(`/notices/${n.id}`)}
            >
                <Flex justify="space-between" align={{ base: 'flex-start', md: 'center' }} direction={{ base: 'column', md: 'row' }} gap={3}>
                    <VStack align="stretch" gap={1.5} flex={1} minW={0}>
                        <HStack gap={1.5} flexWrap="wrap">
                            {isPinnedCard && (
                                <HStack
                                    gap={1}
                                    bg="#6338A9"
                                    color="#FFFFFF"
                                    fontSize="10px"
                                    fontWeight="800"
                                    px={2}
                                    py="1px"
                                    borderRadius="999px"
                                >
                                    <LuPin size={10} />
                                    <Text>고정</Text>
                                </HStack>
                            )}
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
                            {evBadge && (
                                <Box
                                    bg={evBadge.bg}
                                    color={evBadge.color}
                                    fontSize="10.5px"
                                    fontWeight="800"
                                    px={2}
                                    py="1px"
                                    borderRadius="999px"
                                >
                                    {evBadge.label}
                                </Box>
                            )}
                            {imageCount > 0 && (
                                <HStack gap={1} color="var(--waba-ink-3)" fontSize="11px">
                                    <LuImage size={12} />
                                    <Text>{imageCount}</Text>
                                </HStack>
                            )}
                        </HStack>

                        <Text fontSize="15px" fontWeight="800" color="var(--waba-ink)" truncate>
                            {n.title}
                        </Text>

                        {text && (
                            <Text fontSize="12.5px" color="var(--waba-ink-2)" truncate>
                                {text}
                            </Text>
                        )}
                    </VStack>

                    <VStack align={{ base: 'flex-start', md: 'flex-end' }} gap={0.5} flexShrink={0}>
                        {n.type === 'EVENT' && (
                            <Text fontSize="11.5px" fontWeight="700" color="var(--waba-purple-text)">
                                {formatPeriodRange(n.event_start_at, n.event_end_at)}
                            </Text>
                        )}
                        <Text fontSize="11.5px" color="var(--waba-ink-3)">
                            {formatDateShort(n.created_at)} · 조회 {n.view_count ?? 0}
                        </Text>
                    </VStack>
                </Flex>
            </Box>
        );
    };

    return (
        <Box maxW="960px" mx="auto" px={{ base: 4, md: 6 }} py={{ base: 5, md: 8 }}>
            {/* Header */}
            <Flex
                justify="space-between"
                align={{ base: 'flex-start', md: 'center' }}
                direction={{ base: 'column', md: 'row' }}
                gap={3}
                mb={5}
            >
                <Box>
                    <Heading size="xl" fontWeight="900" color="var(--waba-ink)">
                        공지 · 이벤트
                    </Heading>
                    <Text fontSize="13.5px" color="var(--waba-ink-3)" mt={1}>
                        WABA의 새로운 소식과 진행 중인 이벤트를 확인하세요.
                    </Text>
                </Box>

                <HStack gap={1.5}>
                    <Input
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                setSearchQuery(searchInput.trim());
                                setPage(1);
                            }
                        }}
                        placeholder="제목, 내용 검색..."
                        size="sm"
                        w={{ base: '180px', md: '220px' }}
                        h="34px"
                        borderRadius="999px"
                        bg="var(--waba-card)"
                        borderColor="var(--waba-line)"
                        color="var(--waba-ink)"
                    />
                    <IconButton
                        aria-label="검색"
                        size="sm"
                        h="34px"
                        w="34px"
                        borderRadius="999px"
                        bg="#6338A9"
                        color="#FFFFFF"
                        onClick={() => {
                            setSearchQuery(searchInput.trim());
                            setPage(1);
                        }}
                    >
                        <LuSearch size={14} />
                    </IconButton>
                    <IconButton
                        aria-label="초기화"
                        size="sm"
                        h="34px"
                        w="34px"
                        variant="outline"
                        borderColor="var(--waba-line)"
                        color="var(--waba-ink-2)"
                        borderRadius="999px"
                        onClick={handleReset}
                    >
                        <LuRotateCcw size={13} />
                    </IconButton>
                </HStack>
            </Flex>

            {/* Filter Bar */}
            <Flex
                justify="space-between"
                align="center"
                gap={3}
                flexWrap="wrap"
                mb={5}
                p={3.5}
                borderRadius="18px"
                bg="var(--waba-card)"
                border="1px solid"
                borderColor="var(--waba-line)"
            >
                <HStack gap={1.5} flexWrap="wrap">
                    {[
                        { key: 'ALL' as const, label: `전체 (${counts.total})` },
                        { key: 'NOTICE' as const, label: `공지사항 (${counts.noticeCount})` },
                        { key: 'EVENT' as const, label: `이벤트 (${counts.eventCount})` },
                    ].map((tab) => (
                        <Button
                            key={tab.key}
                            size="xs"
                            h="30px"
                            px={3.5}
                            borderRadius="999px"
                            bg={typeFilter === tab.key ? 'var(--waba-ink)' : 'var(--waba-surface)'}
                            color={typeFilter === tab.key ? 'var(--waba-bg)' : 'var(--waba-ink-2)'}
                            border="1px solid"
                            borderColor={typeFilter === tab.key ? 'var(--waba-ink)' : 'var(--waba-line)'}
                            fontSize="12px"
                            fontWeight="700"
                            onClick={() => {
                                setTypeFilter(tab.key);
                                setPage(1);
                            }}
                        >
                            {tab.label}
                        </Button>
                    ))}
                </HStack>

                <Button
                    size="xs"
                    h="30px"
                    px={3.5}
                    borderRadius="999px"
                    bg={onlyOngoingEvents ? '#6338A9' : 'var(--waba-surface)'}
                    color={onlyOngoingEvents ? '#FFFFFF' : 'var(--waba-ink-2)'}
                    border="1px solid"
                    borderColor={onlyOngoingEvents ? '#6338A9' : 'var(--waba-line)'}
                    fontSize="11.5px"
                    fontWeight="700"
                    onClick={() => {
                        setOnlyOngoingEvents((p) => !p);
                        setPage(1);
                    }}
                >
                    진행 중 이벤트만
                </Button>
            </Flex>

            {/* Error Banner */}
            {errorMsg && (
                <Flex
                    p={4}
                    mb={4}
                    borderRadius="16px"
                    bg="rgba(239, 68, 68, 0.1)"
                    border="1px solid"
                    borderColor="rgba(239, 68, 68, 0.35)"
                    justify="space-between"
                    align="center"
                >
                    <Text fontSize="13px" fontWeight="700" color="#EF4444">
                        {errorMsg}
                    </Text>
                    <Button size="xs" bg="#EF4444" color="#FFFFFF" borderRadius="999px" onClick={fetchNotices}>
                        재시도
                    </Button>
                </Flex>
            )}

            {/* List */}
            {loading ? (
                <Flex py={20} justify="center">
                    <Spinner size="lg" color="#6338A9" />
                </Flex>
            ) : pinnedNotices.length === 0 && notices.length === 0 ? (
                <Box p={12} textAlign="center" borderRadius="20px" bg="var(--waba-card)" border="1px solid" borderColor="var(--waba-line)">
                    <Text color="var(--waba-ink-3)" fontSize="14px">
                        등록된 공지사항 또는 이벤트가 없습니다.
                    </Text>
                </Box>
            ) : (
                <VStack align="stretch" gap={2.5}>
                    {pinnedNotices.map((n) => renderNoticeRow(n, true))}
                    {notices.map((n) => renderNoticeRow(n, false))}
                </VStack>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
                <HStack justify="center" gap={2} mt={6}>
                    <Button
                        size="xs"
                        variant="outline"
                        borderColor="var(--waba-line)"
                        color="var(--waba-ink)"
                        disabled={page <= 1}
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                        이전
                    </Button>
                    <Text fontSize="12.5px" color="var(--waba-ink-2)" fontWeight="700">
                        {page} / {totalPages}
                    </Text>
                    <Button
                        size="xs"
                        variant="outline"
                        borderColor="var(--waba-line)"
                        color="var(--waba-ink)"
                        disabled={page >= totalPages}
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    >
                        다음
                    </Button>
                </HStack>
            )}
        </Box>
    );
}
