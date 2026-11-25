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
import { LuArrowDown, LuArrowUp, LuPlus, LuRefreshCw, LuSearch } from 'react-icons/lu';
import axiosInstance from '@/utils/api';
import { toaster } from '@/components/ui/toaster';
import { getRoleBadgeProps } from '../posts/PostAdminDetailDialog';
import BoardFormDialog from './BoardFormDialog';

const STATUS_TABS = [
    { key: 'ALL', label: '전체' },
    { key: 'ACTIVE', label: '활성' },
    { key: 'INACTIVE', label: '비활성' },
];

const ROLE_TABS = [
    { key: 'ALL', label: '전체 권한' },
    { key: 'USER', label: '일반 유저' },
    { key: 'EDITOR_PLUS', label: '에디터 이상' },
    { key: 'ADMIN', label: '관리자 전용' },
];

export default function AdminBoardsClient() {
    const [loading, setLoading] = useState(true);
    const [reordering, setReordering] = useState(false);
    const [boards, setBoards] = useState<any[]>([]);
    const [kpi, setKpi] = useState<any>({});

    const [statusFilter, setStatusFilter] = useState('ALL');
    const [roleFilter, setRoleFilter] = useState('ALL');
    const [searchInput, setSearchInput] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    // Dialog state
    const [dialogOpen, setDialogOpen] = useState(false);
    const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
    const [selectedBoard, setSelectedBoard] = useState<any | null>(null);

    const fetchBoards = useCallback(async () => {
        setLoading(true);
        try {
            const res = await axiosInstance.get('/admin/boards', {
                params: {
                    status: statusFilter === 'ALL' ? undefined : statusFilter,
                    minWriteRole: roleFilter === 'ALL' ? undefined : roleFilter,
                    q: searchQuery || undefined,
                },
            });
            setBoards(res.data?.boards || []);
            setKpi(res.data?.kpi || {});
        } catch {
            toaster.create({ title: '게시판 목록을 불러오지 못했습니다.', type: 'error' });
        } finally {
            setLoading(false);
        }
    }, [statusFilter, roleFilter, searchQuery]);

    useEffect(() => {
        fetchBoards();
    }, [fetchBoards]);

    const isFiltered = statusFilter !== 'ALL' || roleFilter !== 'ALL' || Boolean(searchQuery);

    const handleMoveBoard = async (index: number, direction: 'up' | 'down') => {
        if (isFiltered || reordering) return;
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= boards.length) return;

        const nextBoards = [...boards];
        const [moved] = nextBoards.splice(index, 1);
        nextBoards.splice(targetIndex, 0, moved);
        const orderedIds = nextBoards.map((b) => b.id);

        setReordering(true);
        try {
            await axiosInstance.patch('/admin/boards/reorder', { orderedIds });
            toaster.create({ title: '게시판 노출 순서가 변경되었습니다.', type: 'success' });
            await fetchBoards();
        } catch (err: any) {
            toaster.create({ title: err?.response?.data?.message || '순서 변경에 실패했습니다.', type: 'error' });
        } finally {
            setReordering(false);
        }
    };

    const nextSortOrder = boards.length > 0
        ? Math.max(...boards.map((b) => Number(b.sort_order || 0))) + 1
        : 1;

    return (
        <Box maxW="1400px" mx="auto" px={{ base: 4, md: 6 }} py={6}>
            {/* Header */}
            <Flex justify="space-between" align={{ base: 'flex-start', md: 'center' }} direction={{ base: 'column', md: 'row' }} gap={3} mb={5}>
                <Box>
                    <Heading size="xl" fontWeight="800" color="var(--waba-ink)">
                        게시판 관리
                    </Heading>
                    <Text fontSize="13.5px" color="var(--waba-ink-3)" mt={1}>
                        커뮤니티 게시판의 노출 순서, 작성 권한, 기능 옵션 및 활성 상태를 관리합니다.
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
                            setDialogMode('create');
                            setSelectedBoard(null);
                            setDialogOpen(true);
                        }}
                    >
                        <LuPlus size={15} />
                        새 게시판 추가
                    </Button>
                    <IconButton
                        aria-label="새로고침"
                        size="sm"
                        variant="outline"
                        borderColor="var(--waba-line)"
                        color="var(--waba-ink)"
                        borderRadius="999px"
                        onClick={fetchBoards}
                    >
                        <LuRefreshCw />
                    </IconButton>
                </HStack>
            </Flex>

            {/* 4 KPI Cards */}
            <Grid templateColumns={{ base: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }} gap={3} mb={5}>
                {[
                    {
                        label: '전체 게시판',
                        value: kpi.totalBoards ?? 0,
                        sub: `활성 ${kpi.activeBoards ?? 0}개 · 비활성 ${kpi.inactiveBoards ?? 0}개`,
                        color: 'var(--waba-ink)',
                    },
                    {
                        label: '전체 등록 게시글',
                        value: kpi.totalPosts ?? 0,
                        sub: `게시 중 ${kpi.publishedPosts ?? 0}건 · 임시저장 제외`,
                        color: '#10B981',
                    },
                    {
                        label: '권한 제한 게시판',
                        value: kpi.restrictedBoards ?? 0,
                        sub: `에디터 ${kpi.editorBoards ?? 0} · 관리자 ${kpi.adminBoards ?? 0}`,
                        color: '#D97706',
                    },
                    {
                        label: '특화 기능 활성',
                        value: kpi.productPinBoards ?? 0,
                        sub: `상품 핀 허용 ${kpi.productPinBoards ?? 0}개 · 수의사 검증 ${kpi.vetVerifyBoards ?? 0}개`,
                        color: '#6338A9',
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

            {/* Filter Bar */}
            <Box
                p={4}
                borderRadius="20px"
                bg="var(--waba-card)"
                border="1px solid"
                borderColor="var(--waba-line)"
                mb={4}
            >
                <VStack align="stretch" gap={2.5}>
                    <Flex justify="space-between" align="center" gap={3} flexWrap="wrap">
                        <HStack gap={1.5} flexWrap="wrap">
                            {STATUS_TABS.map((tab) => (
                                <Button
                                    key={tab.key}
                                    size="xs"
                                    h="28px"
                                    px={3}
                                    borderRadius="999px"
                                    bg={statusFilter === tab.key ? 'var(--waba-ink)' : 'var(--waba-surface)'}
                                    color={statusFilter === tab.key ? 'var(--waba-bg)' : 'var(--waba-ink-2)'}
                                    border="1px solid"
                                    borderColor={statusFilter === tab.key ? 'var(--waba-ink)' : 'var(--waba-line)'}
                                    fontSize="11.5px"
                                    fontWeight="700"
                                    onClick={() => setStatusFilter(tab.key)}
                                >
                                    {tab.label}
                                </Button>
                            ))}
                        </HStack>

                        <HStack gap={1.5} flexWrap="wrap">
                            {ROLE_TABS.map((tab) => (
                                <Button
                                    key={tab.key}
                                    size="xs"
                                    h="28px"
                                    px={3}
                                    borderRadius="999px"
                                    bg={roleFilter === tab.key ? '#6338A9' : 'var(--waba-surface)'}
                                    color={roleFilter === tab.key ? '#FFFFFF' : 'var(--waba-ink-2)'}
                                    border="1px solid"
                                    borderColor={roleFilter === tab.key ? '#6338A9' : 'var(--waba-line)'}
                                    fontSize="11.5px"
                                    fontWeight="700"
                                    onClick={() => setRoleFilter(tab.key)}
                                >
                                    {tab.label}
                                </Button>
                            ))}
                        </HStack>

                        <HStack gap={2} flexWrap="wrap">
                            <Input
                                value={searchInput}
                                onChange={(e) => setSearchInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        setSearchQuery(searchInput.trim());
                                    }
                                }}
                                placeholder="게시판명, 코드(ID), 설명 검색..."
                                size="sm"
                                w={{ base: '200px', md: '250px' }}
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
                                onClick={() => setSearchQuery(searchInput.trim())}
                            >
                                <LuSearch size={14} />
                            </IconButton>
                        </HStack>
                    </Flex>

                    <Text fontSize="11.5px" color={isFiltered ? '#D97706' : 'var(--waba-ink-3)'}>
                        {isFiltered
                            ? '필터/검색 적용 중에는 순서 이동(↑/↓)이 비활성화됩니다.'
                            : '순서(↑/↓) 버튼으로 커뮤니티 노출 순서를 즉시 조정할 수 있습니다.'}
                    </Text>
                </VStack>
            </Box>

            {/* Boards Table */}
            {loading ? (
                <Flex py={20} justify="center">
                    <Spinner size="lg" color="#6338A9" />
                </Flex>
            ) : boards.length === 0 ? (
                <Box p={12} textAlign="center" borderRadius="20px" bg="var(--waba-card)" border="1px solid" borderColor="var(--waba-line)">
                    <Text color="var(--waba-ink-3)" fontSize="14px">
                        조건에 해당하는 게시판이 없습니다.
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
                                {['순서', '상태', '게시판 정보', '최소 작성 권한', '기능 옵션', '게시글 수', '액션'].map((col) => (
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
                            {boards.map((board, index) => {
                                const roleBadge = getRoleBadgeProps(board.min_write_role);
                                const hasProductPin = Boolean(board.allow_product_pins);
                                const hasVetVerify = Boolean(board.allow_vet_verify);

                                return (
                                    <Box
                                        as="tr"
                                        key={board.id}
                                        borderBottom="1px solid"
                                        borderColor="var(--waba-line)"
                                        _last={{ borderBottom: 'none' }}
                                        _hover={{ bg: 'var(--waba-surface)' }}
                                    >
                                        {/* 순서 */}
                                        <Box as="td" px={4} py={3.5} verticalAlign="middle" whiteSpace="nowrap">
                                            <HStack gap={1.5}>
                                                <Text fontSize="13px" fontWeight="800" color="var(--waba-ink)" w="20px">
                                                    {board.sort_order ?? index + 1}
                                                </Text>
                                                <IconButton
                                                    aria-label="위로 이동"
                                                    size="2xs"
                                                    variant="outline"
                                                    borderColor="var(--waba-line)"
                                                    color="var(--waba-ink-2)"
                                                    borderRadius="full"
                                                    disabled={isFiltered || reordering || index === 0}
                                                    onClick={() => handleMoveBoard(index, 'up')}
                                                >
                                                    <LuArrowUp size={12} />
                                                </IconButton>
                                                <IconButton
                                                    aria-label="아래로 이동"
                                                    size="2xs"
                                                    variant="outline"
                                                    borderColor="var(--waba-line)"
                                                    color="var(--waba-ink-2)"
                                                    borderRadius="full"
                                                    disabled={isFiltered || reordering || index === boards.length - 1}
                                                    onClick={() => handleMoveBoard(index, 'down')}
                                                >
                                                    <LuArrowDown size={12} />
                                                </IconButton>
                                            </HStack>
                                        </Box>

                                        {/* 상태 */}
                                        <Box as="td" px={4} py={3.5} verticalAlign="middle" whiteSpace="nowrap">
                                            <Box
                                                display="inline-block"
                                                bg={board.is_active ? 'rgba(16, 185, 129, 0.14)' : 'rgba(239, 68, 68, 0.14)'}
                                                color={board.is_active ? '#10B981' : '#EF4444'}
                                                fontSize="10.5px"
                                                fontWeight="800"
                                                px={2.5}
                                                py={0.5}
                                                borderRadius="999px"
                                            >
                                                {board.is_active ? '활성' : '비활성'}
                                            </Box>
                                        </Box>

                                        {/* 게시판 정보 */}
                                        <Box as="td" px={4} py={3.5} verticalAlign="middle" maxW="340px">
                                            <HStack gap={2} mb={0.5} flexWrap="wrap">
                                                <Text fontSize="13.5px" fontWeight="800" color="var(--waba-ink)">
                                                    {board.name}
                                                </Text>
                                                <Box
                                                    bg="var(--waba-surface)"
                                                    color="var(--waba-ink-2)"
                                                    border="1px solid"
                                                    borderColor="var(--waba-line)"
                                                    fontSize="10.5px"
                                                    fontWeight="700"
                                                    fontFamily="mono"
                                                    px={2}
                                                    py="1px"
                                                    borderRadius="999px"
                                                >
                                                    {board.id}
                                                </Box>
                                            </HStack>
                                            <Text fontSize="11.5px" color="var(--waba-ink-3)" truncate>
                                                {board.description || '-'}
                                            </Text>
                                        </Box>

                                        {/* 최소 작성 권한 */}
                                        <Box as="td" px={4} py={3.5} verticalAlign="middle" whiteSpace="nowrap">
                                            <Box
                                                display="inline-block"
                                                bg={roleBadge.bg}
                                                color={roleBadge.color}
                                                border="1px solid"
                                                borderColor={roleBadge.borderColor}
                                                fontSize="10.5px"
                                                fontWeight="800"
                                                px={2.5}
                                                py="2px"
                                                borderRadius="999px"
                                            >
                                                {roleBadge.label}
                                            </Box>
                                        </Box>

                                        {/* 기능 옵션 */}
                                        <Box as="td" px={4} py={3.5} verticalAlign="middle" whiteSpace="nowrap">
                                            {!hasProductPin && !hasVetVerify ? (
                                                <Text fontSize="12px" color="var(--waba-ink-3)">-</Text>
                                            ) : (
                                                <HStack gap={1.5}>
                                                    {hasProductPin && (
                                                        <Box
                                                            bg="var(--waba-purple-soft)"
                                                            color="var(--waba-purple-text)"
                                                            border="1px solid"
                                                            borderColor="var(--waba-purple-border)"
                                                            fontSize="10.5px"
                                                            fontWeight="700"
                                                            px={2}
                                                            py="1px"
                                                            borderRadius="999px"
                                                        >
                                                            상품 핀
                                                        </Box>
                                                    )}
                                                    {hasVetVerify && (
                                                        <Box
                                                            bg="rgba(16, 185, 129, 0.14)"
                                                            color="#10B981"
                                                            border="1px solid"
                                                            borderColor="rgba(16, 185, 129, 0.3)"
                                                            fontSize="10.5px"
                                                            fontWeight="700"
                                                            px={2}
                                                            py="1px"
                                                            borderRadius="999px"
                                                        >
                                                            수의사 검증
                                                        </Box>
                                                    )}
                                                </HStack>
                                            )}
                                        </Box>

                                        {/* 게시글 수 */}
                                        <Box as="td" px={4} py={3.5} verticalAlign="middle" whiteSpace="nowrap">
                                            <Text fontSize="13px" fontWeight="700" color="var(--waba-ink)">
                                                {board.total_post_count ?? 0}건
                                            </Text>
                                            <Text fontSize="11px" color="var(--waba-ink-3)">
                                                (게시 {board.published_post_count ?? 0})
                                            </Text>
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
                                                    setDialogMode('edit');
                                                    setSelectedBoard(board);
                                                    setDialogOpen(true);
                                                }}
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

            <BoardFormDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                mode={dialogMode}
                board={selectedBoard}
                defaultSortOrder={nextSortOrder}
                onSaved={fetchBoards}
            />
        </Box>
    );
}
