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
import { LuExternalLink, LuRefreshCw, LuSearch } from 'react-icons/lu';
import axiosInstance from '@/utils/api';
import { toaster } from '@/components/ui/toaster';
import PostReportDetailDialog from '../components/PostReportDetailDialog';

const STATUS_TABS = [
    { key: 'ALL', label: '전체' },
    { key: 'PENDING', label: '신고 대기 중' },
    { key: 'APPEAL_PENDING', label: '이의 심사 중' },
    { key: 'RESOLVED', label: '승인됨' },
    { key: 'DISMISSED', label: '반려됨' },
];

export default function AdminReportsClient() {
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [q, setQ] = useState('');
    const [page, setPage] = useState(1);

    const [loading, setLoading] = useState(true);
    const [kpi, setKpi] = useState<any>({});
    const [groupedPosts, setGroupedPosts] = useState<any[]>([]);
    const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });

    const [detailPostId, setDetailPostId] = useState<string | null>(null);
    const [detailInitialTab, setDetailInitialTab] = useState<'reports' | 'appeals'>('reports');
    const [detailOpen, setDetailOpen] = useState(false);

    const fetchReports = useCallback(async (targetPage = page) => {
        setLoading(true);
        try {
            const res = await axiosInstance.get('/admin/reports', {
                params: {
                    status: statusFilter,
                    q: q.trim(),
                    page: targetPage,
                    limit: 20,
                },
            });
            setKpi(res.data?.kpi || {});
            setGroupedPosts(res.data?.groupedPosts || res.data?.reports || []);
            setPagination(res.data?.pagination || { page: targetPage, limit: 20, total: 0, totalPages: 1 });
        } catch {
            toaster.create({ title: '신고 목록을 불러오지 못했습니다.', type: 'error' });
        } finally {
            setLoading(false);
        }
    }, [statusFilter, q, page]);

    useEffect(() => {
        fetchReports(page);
    }, [statusFilter, page]);

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setPage(1);
        fetchReports(1);
    };

    const formatDateStr = (d?: string | null) => {
        if (!d) return '-';
        const parsed = new Date(d);
        if (Number.isNaN(parsed.getTime())) return '-';
        return parsed.toLocaleString('ko-KR');
    };

    return (
        <VStack align="stretch" gap={5} maxW="1400px" mx="auto">
            <Flex justify="space-between" align={{ base: 'flex-start', sm: 'center' }} direction={{ base: 'column', sm: 'row' }} gap={3}>
                <Box>
                    <Heading as="h1" fontSize={{ base: '20px', md: '24px' }} fontWeight="900" color="var(--waba-ink)">
                        신고 센터
                    </Heading>
                    <Text fontSize="13px" color="var(--waba-ink-3)" mt={0.5}>
                        게시글 단위로 누적된 신고 내역과 이의 제기를 통합 검토·처리합니다.
                    </Text>
                </Box>
                <IconButton
                    aria-label="새로고침"
                    size="sm"
                    variant="outline"
                    rounded="full"
                    bg="var(--waba-card)"
                    borderColor="var(--waba-line)"
                    onClick={() => fetchReports(page)}
                    loading={loading}
                >
                    <LuRefreshCw size={14} />
                </IconButton>
            </Flex>

            {/* 4 KPI Cards */}
            <Grid templateColumns={{ base: '1fr', sm: 'repeat(2, 1fr)', xl: 'repeat(4, 1fr)' }} gap={4}>
                <Box bg="var(--waba-card)" border="1px solid" borderColor="var(--waba-line)" borderRadius="20px" p={5}>
                    <Text fontSize="12.5px" fontWeight="700" color="var(--waba-ink-2)" mb={2}>신고 대기 게시글</Text>
                    <Text fontSize="28px" fontWeight="900" color="#EF4444">{(kpi.pendingPostCount ?? kpi.pendingCount ?? 0).toLocaleString()}건</Text>
                </Box>
                <Box bg="var(--waba-card)" border="1px solid" borderColor="var(--waba-line)" borderRadius="20px" p={5}>
                    <Text fontSize="12.5px" fontWeight="700" color="var(--waba-ink-2)" mb={2}>이의 심사 중</Text>
                    <Text fontSize="28px" fontWeight="900" color="#D97706">{(kpi.pendingAppealCount ?? 0).toLocaleString()}건</Text>
                </Box>
                <Box bg="var(--waba-card)" border="1px solid" borderColor="var(--waba-line)" borderRadius="20px" p={5}>
                    <Text fontSize="12.5px" fontWeight="700" color="var(--waba-ink-2)" mb={2}>신고 승인</Text>
                    <Text fontSize="28px" fontWeight="900" color="#10B981">{(kpi.resolvedCount ?? 0).toLocaleString()}건</Text>
                </Box>
                <Box bg="var(--waba-card)" border="1px solid" borderColor="var(--waba-line)" borderRadius="20px" p={5}>
                    <Text fontSize="12.5px" fontWeight="700" color="var(--waba-ink-2)" mb={2}>전체 신고</Text>
                    <Text fontSize="28px" fontWeight="900" color="var(--waba-ink)">{(kpi.totalCount ?? 0).toLocaleString()}건</Text>
                </Box>
            </Grid>

            {/* Search & Status Filter */}
            <Flex
                bg="var(--waba-card)"
                border="1px solid"
                borderColor="var(--waba-line)"
                borderRadius="18px"
                p={3.5}
                gap={3}
                flexWrap="wrap"
                align="center"
                justify="space-between"
            >
                <HStack gap={1.5} flexWrap="wrap">
                    {STATUS_TABS.map((tab) => {
                        const active = statusFilter === tab.key;
                        return (
                            <Button
                                key={tab.key}
                                size="xs"
                                h="32px"
                                px={3.5}
                                borderRadius="999px"
                                bg={active ? 'var(--waba-ink)' : 'var(--waba-surface)'}
                                color={active ? 'var(--waba-bg)' : 'var(--waba-ink-2)'}
                                border="1px solid"
                                borderColor={active ? 'var(--waba-ink)' : 'var(--waba-line)'}
                                fontSize="12px"
                                fontWeight={active ? '700' : '600'}
                                onClick={() => {
                                    setStatusFilter(tab.key);
                                    setPage(1);
                                }}
                            >
                                {tab.label}
                            </Button>
                        );
                    })}
                </HStack>

                <form onSubmit={handleSearchSubmit} style={{ flex: 1, minWidth: '240px', maxWidth: '380px' }}>
                    <HStack
                        bg="var(--waba-surface)"
                        border="1px solid"
                        borderColor="var(--waba-line)"
                        borderRadius="12px"
                        px={3}
                        h="36px"
                        gap={2}
                    >
                        <LuSearch size={14} color="var(--waba-ink-3)" />
                        <Input
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                            placeholder="작성자, 게시글 제목, 신고 사유 검색..."
                            border="none"
                            bg="transparent"
                            color="var(--waba-ink)"
                            fontSize="12.5px"
                            px={0}
                            _focus={{ outline: 'none', boxShadow: 'none' }}
                        />
                    </HStack>
                </form>
            </Flex>

            {/* Grouped Posts List */}
            {loading ? (
                <Flex py={20} justify="center">
                    <Spinner size="lg" color="#6338A9" />
                </Flex>
            ) : groupedPosts.length === 0 ? (
                <Flex
                    py={16}
                    justify="center"
                    bg="var(--waba-card)"
                    border="1px solid"
                    borderColor="var(--waba-line)"
                    borderRadius="20px"
                    color="var(--waba-ink-3)"
                    fontSize="13px"
                >
                    조건에 맞는 신고 게시글이 없습니다.
                </Flex>
            ) : (
                <VStack align="stretch" gap={3}>
                    {groupedPosts.map((item) => {
                        const targetPostId = String(item.post_id || item.target_id);
                        return (
                            <Box
                                key={targetPostId}
                                bg="var(--waba-card)"
                                border="1px solid"
                                borderColor="var(--waba-line)"
                                borderRadius="20px"
                                p={5}
                            >
                                <Flex justify="space-between" align={{ base: 'flex-start', md: 'center' }} direction={{ base: 'column', md: 'row' }} gap={4}>
                                    <VStack align="stretch" gap={1.5} flex={1} minW={0}>
                                        <HStack gap={1.5} flexWrap="wrap">
                                            {item.board_name && (
                                                <Box bg="var(--waba-purple-soft)" color="var(--waba-purple-text)" fontSize="10.5px" fontWeight="700" px={2} py={0.5} borderRadius="999px">
                                                    {item.board_name}
                                                </Box>
                                            )}
                                            <Box
                                                bg={
                                                    item.post_status === 'DELETED'
                                                        ? 'rgba(239, 68, 68, 0.12)'
                                                        : item.post_status === 'HIDDEN'
                                                            ? 'rgba(245, 158, 11, 0.14)'
                                                            : 'rgba(16, 185, 129, 0.12)'
                                                }
                                                color={
                                                    item.post_status === 'DELETED'
                                                        ? '#EF4444'
                                                        : item.post_status === 'HIDDEN'
                                                            ? '#D97706'
                                                            : '#10B981'
                                                }
                                                fontSize="10.5px"
                                                fontWeight="800"
                                                px={2}
                                                py={0.5}
                                                borderRadius="999px"
                                            >
                                                {item.post_status === 'DELETED' ? '삭제됨' : item.post_status === 'HIDDEN' ? '숨김' : '게시 중'}
                                            </Box>
                                            <Box bg="var(--waba-surface)" border="1px solid" borderColor="var(--waba-line)" color="var(--waba-ink)" fontSize="10.5px" fontWeight="700" px={2} py={0.5} borderRadius="999px">
                                                신고 {item.total_report_count ?? 1}건
                                            </Box>
                                            {Number(item.pending_report_count || 0) > 0 && (
                                                <Box bg="rgba(239, 68, 68, 0.12)" color="#EF4444" fontSize="10.5px" fontWeight="800" px={2} py={0.5} borderRadius="999px">
                                                    대기 {item.pending_report_count}건
                                                </Box>
                                            )}
                                            {Number(item.pending_appeal_count || 0) > 0 && (
                                                <Box bg="rgba(245, 158, 11, 0.14)" color="#D97706" fontSize="10.5px" fontWeight="800" px={2} py={0.5} borderRadius="999px">
                                                    이의 심사 중
                                                </Box>
                                            )}
                                        </HStack>

                                        <HStack gap={2} flexWrap="wrap">
                                            <Text
                                                fontSize="15px"
                                                fontWeight="800"
                                                color="var(--waba-ink)"
                                                cursor="pointer"
                                                _hover={{ textDecoration: 'underline' }}
                                                onClick={() => window.open(`/post/${targetPostId}`, '_blank')}
                                            >
                                                {item.post_title || `(게시글 #${targetPostId})`}
                                            </Text>
                                            <LuExternalLink size={13} color="var(--waba-ink-3)" />
                                            <HStack gap={1.5} align="center">
                                                <Text fontSize="12px" color="var(--waba-ink-3)">
                                                    작성자: {item.author_nickname || item.post_author_nickname || '-'}
                                                </Text>
                                                {(() => {
                                                    const upper = (item.author_role || 'USER').toUpperCase();
                                                    const roleBadge =
                                                        upper === 'ADMIN'
                                                            ? { label: '관리자', bg: 'var(--waba-purple-soft)', color: 'var(--waba-purple-text)', borderColor: 'var(--waba-purple-border)' }
                                                            : upper === 'VET'
                                                                ? { label: '수의사', bg: 'rgba(16, 185, 129, 0.14)', color: '#10B981', borderColor: 'rgba(16, 185, 129, 0.3)' }
                                                                : upper === 'EDITOR'
                                                                    ? { label: '에디터', bg: 'rgba(245, 158, 11, 0.14)', color: '#D97706', borderColor: 'rgba(245, 158, 11, 0.3)' }
                                                                    : { label: '일반 유저', bg: 'rgba(148, 163, 184, 0.16)', color: 'var(--waba-ink-2)', borderColor: 'rgba(148, 163, 184, 0.35)' };
                                                    return (
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
                                                    );
                                                })()}
                                            </HStack>
                                        </HStack>

                                        <Text fontSize="12px" color="var(--waba-ink-2)">
                                            최근 신고 사유: {item.latest_reason || item.reason || '-'} · {formatDateStr(item.latest_report_at || item.latest_reported_at || item.created_at)}
                                        </Text>
                                    </VStack>

                                    <HStack gap={2} flexShrink={0}>
                                        <Button
                                            size="sm"
                                            bg="#6338A9"
                                            color="#FFFFFF"
                                            _hover={{ bg: '#522B8F' }}
                                            borderRadius="999px"
                                            px={4}
                                            fontWeight="700"
                                            onClick={() => {
                                                setDetailPostId(targetPostId);
                                                setDetailInitialTab('reports');
                                                setDetailOpen(true);
                                            }}
                                        >
                                            신고 상세
                                        </Button>
                                        {Number(item.appeal_count || 0) > 0 && (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                borderColor="var(--waba-line)"
                                                color="var(--waba-ink)"
                                                borderRadius="999px"
                                                px={3.5}
                                                fontWeight="700"
                                                onClick={() => {
                                                    setDetailPostId(targetPostId);
                                                    setDetailInitialTab('appeals');
                                                    setDetailOpen(true);
                                                }}
                                            >
                                                이의 제기 ({item.appeal_count})
                                            </Button>
                                        )}
                                    </HStack>
                                </Flex>
                            </Box>
                        );
                    })}
                </VStack>
            )}

            {/* Pagination */}
            {pagination.totalPages > 1 && (
                <Flex justify="center" align="center" gap={2} pt={2}>
                    <Button size="xs" variant="outline" borderColor="var(--waba-line)" color="var(--waba-ink)" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                        이전
                    </Button>
                    {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                        .slice(Math.max(0, page - 3), page + 2)
                        .map((pNum) => (
                            <Button
                                key={pNum}
                                size="xs"
                                borderRadius="full"
                                bg={pNum === page ? 'var(--waba-ink)' : 'var(--waba-card)'}
                                color={pNum === page ? 'var(--waba-bg)' : 'var(--waba-ink-2)'}
                                border="1px solid"
                                borderColor={pNum === page ? 'var(--waba-ink)' : 'var(--waba-line)'}
                                onClick={() => setPage(pNum)}
                            >
                                {pNum}
                            </Button>
                        ))}
                    <Button size="xs" variant="outline" borderColor="var(--waba-line)" color="var(--waba-ink)" disabled={page >= pagination.totalPages} onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}>
                        다음
                    </Button>
                </Flex>
            )}

            <PostReportDetailDialog
                open={detailOpen}
                onOpenChange={setDetailOpen}
                postId={detailPostId}
                initialTab={detailInitialTab}
                onUpdated={() => fetchReports(page)}
            />
        </VStack>
    );
}
