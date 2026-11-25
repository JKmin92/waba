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
    Text,
    VStack,
} from '@chakra-ui/react';
import {
    LuChevronDown,
    LuChevronUp,
    LuExternalLink,
    LuRefreshCw,
    LuSearch,
    LuSparkles,
} from 'react-icons/lu';
import axiosInstance from '@/utils/api';
import { toaster } from '@/components/ui/toaster';
import UserAvatar from '../../(main)/common/UserAvatar';
import PostAdminDetailDialog, { CURATION_SPECIES_OPTIONS, getRoleBadgeProps } from './PostAdminDetailDialog';

const POST_STATUS_TABS = [
    { key: 'ALL', label: '전체' },
    { key: 'PUBLISHED', label: '게시 중' },
    { key: 'HIDDEN', label: '숨김' },
    { key: 'DELETED', label: '삭제됨' },
];

const CURATION_TABS = [
    { key: 'ALL', label: '전체' },
    { key: 'MAIN_LOOKBOOK', label: '메인 룩북' },
    { key: 'LOOKBOOK_CANDIDATE', label: '메인 후보' },
    { key: 'NORMAL_FEED', label: '일반 피드' },
];

const SORT_OPTIONS = [
    { key: 'latest', label: '최신순' },
    { key: 'popular', label: '인기순' },
    { key: 'views', label: '조회순' },
    { key: 'reports', label: '신고순' },
];

const COMMENT_STATUS_TABS = [
    { key: 'ALL', label: '전체' },
    { key: 'ACTIVE', label: '정상' },
    { key: 'HIDDEN', label: '숨김' },
    { key: 'DELETED', label: '삭제됨' },
];

const COMMENT_ATTR_TABS = [
    { key: 'ALL', label: '전체' },
    { key: 'ACCEPTED', label: '채택됨' },
    { key: 'PINNED', label: '고정됨' },
    { key: 'REPLY', label: '대댓글' },
];

export default function AdminPostsClient() {
    const [activeSection, setActiveSection] = useState<'posts' | 'comments'>('posts');

    // Posts state
    const [postsLoading, setPostsLoading] = useState(true);
    const [posts, setPosts] = useState<any[]>([]);
    const [postSummary, setPostSummary] = useState<any>({});
    const [boards, setBoards] = useState<any[]>([]);
    const [curationBoard, setCurationBoard] = useState<any[]>([]);
    const [curationExpanded, setCurationExpanded] = useState(true);

    const [boardFilter, setBoardFilter] = useState('ALL');
    const [postStatusFilter, setPostStatusFilter] = useState('ALL');
    const [curationFilter, setCurationFilter] = useState('ALL');
    const [sortBy, setSortBy] = useState('latest');
    const [postSearchInput, setPostSearchInput] = useState('');
    const [postSearchQuery, setPostSearchQuery] = useState('');
    const [postPage, setPostPage] = useState(1);
    const [postTotalPages, setPostTotalPages] = useState(1);

    // Detail dialog
    const [detailOpen, setDetailOpen] = useState(false);
    const [selectedPostId, setSelectedPostId] = useState<string | null>(null);

    // Comments state
    const [commentsLoading, setCommentsLoading] = useState(false);
    const [comments, setComments] = useState<any[]>([]);
    const [commentSummary, setCommentSummary] = useState<any>({});
    const [commentStatusFilter, setCommentStatusFilter] = useState('ALL');
    const [commentAttrFilter, setCommentAttrFilter] = useState('ALL');
    const [commentSearchInput, setCommentSearchInput] = useState('');
    const [commentSearchQuery, setCommentSearchQuery] = useState('');
    const [commentPage, setCommentPage] = useState(1);
    const [commentTotalPages, setCommentTotalPages] = useState(1);
    const [commentSubmittingId, setCommentSubmittingId] = useState<string | null>(null);

    const formatDateStr = (d?: string | null) => {
        if (!d) return '-';
        const parsed = new Date(d);
        if (Number.isNaN(parsed.getTime())) return '-';
        return parsed.toLocaleString('ko-KR');
    };

    const fetchPosts = useCallback(async () => {
        setPostsLoading(true);
        try {
            const res = await axiosInstance.get('/admin/posts', {
                params: {
                    boardId: boardFilter === 'ALL' ? undefined : boardFilter,
                    status: postStatusFilter === 'ALL' ? undefined : postStatusFilter,
                    curationGrade: curationFilter === 'ALL' ? undefined : curationFilter,
                    sort: sortBy,
                    q: postSearchQuery || undefined,
                    page: postPage,
                    limit: 20,
                },
            });
            setPosts(res.data?.posts || []);
            setPostSummary(res.data?.kpi || {});
            setBoards(res.data?.boards || []);
            const cb = res.data?.curatedBoard;
            const nextBoard = Array.isArray(cb) ? cb : [...(cb?.mainLookbook || []), ...(cb?.candidates || [])];
            setCurationBoard(nextBoard);
            setPostTotalPages(res.data?.pagination?.totalPages || 1);
        } catch {
            toaster.create({ title: '게시글 목록을 불러오지 못했습니다.', type: 'error' });
        } finally {
            setPostsLoading(false);
        }
    }, [boardFilter, postStatusFilter, curationFilter, sortBy, postSearchQuery, postPage]);

    const fetchComments = useCallback(async () => {
        setCommentsLoading(true);
        try {
            const res = await axiosInstance.get('/admin/comments', {
                params: {
                    status: commentStatusFilter === 'ALL' ? undefined : commentStatusFilter,
                    attr: commentAttrFilter === 'ALL' ? undefined : commentAttrFilter,
                    q: commentSearchQuery || undefined,
                    page: commentPage,
                    limit: 20,
                },
            });
            setComments(res.data?.comments || []);
            setCommentSummary(res.data?.kpi || {});
            setCommentTotalPages(res.data?.pagination?.totalPages || 1);
        } catch {
            toaster.create({ title: '댓글 목록을 불러오지 못했습니다.', type: 'error' });
        } finally {
            setCommentsLoading(false);
        }
    }, [commentStatusFilter, commentAttrFilter, commentSearchQuery, commentPage]);

    useEffect(() => {
        if (activeSection === 'posts') {
            fetchPosts();
        } else {
            fetchComments();
        }
    }, [activeSection, fetchPosts, fetchComments]);

    const handleOpenDetail = (id: string | number) => {
        setSelectedPostId(String(id));
        setDetailOpen(true);
    };

    const handleCommentStatus = async (commentId: string | number, status: 'ACTIVE' | 'HIDDEN' | 'DELETED') => {
        setCommentSubmittingId(String(commentId));
        try {
            await axiosInstance.patch(`/admin/comments/${commentId}/status`, { status });
            const msgMap = {
                ACTIVE: '댓글이 복구되었습니다.',
                HIDDEN: '댓글이 숨김 처리되었습니다.',
                DELETED: '댓글이 삭제 처리되었습니다.',
            };
            toaster.create({ title: msgMap[status], type: 'success' });
            await fetchComments();
        } catch (err: any) {
            toaster.create({ title: err?.response?.data?.message || '댓글 상태 변경에 실패했습니다.', type: 'error' });
        } finally {
            setCommentSubmittingId(null);
        }
    };

    return (
        <Box maxW="1400px" mx="auto" px={{ base: 4, md: 6 }} py={6}>
            {/* Header */}
            <Flex justify="space-between" align={{ base: 'flex-start', md: 'center' }} direction={{ base: 'column', md: 'row' }} gap={3} mb={5}>
                <Box>
                    <Heading size="xl" fontWeight="800" color="var(--waba-ink)">
                        게시글 · 댓글 · 큐레이션
                    </Heading>
                    <Text fontSize="13.5px" color="var(--waba-ink-3)" mt={1}>
                        커뮤니티 게시글 상태, 민감 이미지 블러, 메인 룩북 큐레이션 및 댓글을 통합 관리합니다.
                    </Text>
                </Box>

                <HStack gap={2}>
                    <HStack bg="var(--waba-surface)" p={1} borderRadius="999px" border="1px solid" borderColor="var(--waba-line)">
                        <Button
                            size="xs"
                            h="30px"
                            px={4}
                            borderRadius="999px"
                            bg={activeSection === 'posts' ? 'var(--waba-ink)' : 'transparent'}
                            color={activeSection === 'posts' ? 'var(--waba-bg)' : 'var(--waba-ink-2)'}
                            fontSize="12px"
                            fontWeight="700"
                            onClick={() => setActiveSection('posts')}
                        >
                            게시글 관리
                        </Button>
                        <Button
                            size="xs"
                            h="30px"
                            px={4}
                            borderRadius="999px"
                            bg={activeSection === 'comments' ? 'var(--waba-ink)' : 'transparent'}
                            color={activeSection === 'comments' ? 'var(--waba-bg)' : 'var(--waba-ink-2)'}
                            fontSize="12px"
                            fontWeight="700"
                            onClick={() => setActiveSection('comments')}
                        >
                            댓글 관리
                        </Button>
                    </HStack>

                    <IconButton
                        aria-label="새로고침"
                        size="sm"
                        variant="outline"
                        borderColor="var(--waba-line)"
                        color="var(--waba-ink)"
                        borderRadius="999px"
                        onClick={activeSection === 'posts' ? fetchPosts : fetchComments}
                    >
                        <LuRefreshCw />
                    </IconButton>
                </HStack>
            </Flex>

            {activeSection === 'posts' ? (
                <>
                    {/* 4 KPI Cards */}
                    <Grid templateColumns={{ base: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }} gap={3} mb={5}>
                        {[
                            {
                                label: '전체 게시글',
                                value: postSummary.totalPosts ?? 0,
                                sub: '임시저장(DRAFT) 제외',
                                color: 'var(--waba-ink)',
                            },
                            {
                                label: '메인 룩북 · 큐레이션',
                                value: Number(postSummary.mainLookbookCount ?? 0) + Number(postSummary.candidateCount ?? 0),
                                sub: `메인 룩북 ${postSummary.mainLookbookCount ?? 0} · 메인 후보 ${postSummary.candidateCount ?? 0}`,
                                color: '#6338A9',
                            },
                            {
                                label: '숨김 · 삭제 유예',
                                value: Number(postSummary.hiddenCount ?? 0) + Number(postSummary.deletedCount ?? 0),
                                sub: `숨김 ${postSummary.hiddenCount ?? 0} · 30일 보관 ${postSummary.deletedCount ?? 0}`,
                                color: '#D97706',
                            },
                            {
                                label: '민감 이미지 · 신고 글',
                                value: Number(postSummary.sensitivePostCount ?? 0) + Number(postSummary.reportedPostCount ?? 0),
                                sub: `민감 블러 ${postSummary.sensitivePostCount ?? 0} · 신고 접수 ${postSummary.reportedPostCount ?? 0}`,
                                color: '#EF4444',
                            },
                        ].map((kpi) => (
                            <Box
                                key={kpi.label}
                                p={4}
                                borderRadius="18px"
                                bg="var(--waba-card)"
                                border="1px solid"
                                borderColor="var(--waba-line)"
                            >
                                <Text fontSize="12px" color="var(--waba-ink-3)" fontWeight="600">
                                    {kpi.label}
                                </Text>
                                <Text fontSize="24px" fontWeight="800" color={kpi.color} mt={1}>
                                    {kpi.value}
                                </Text>
                                <Text fontSize="11px" color="var(--waba-ink-3)" mt={0.5}>
                                    {kpi.sub}
                                </Text>
                            </Box>
                        ))}
                    </Grid>

                    {/* 상단 큐레이션 보드 (2번 시안 스타일) */}
                    <Box
                        p={4}
                        borderRadius="20px"
                        bg="var(--waba-card)"
                        border="1px solid"
                        borderColor="var(--waba-line)"
                        mb={5}
                    >
                        <Flex justify="space-between" align="center" mb={curationExpanded ? 3.5 : 0}>
                            <HStack gap={2}>
                                <LuSparkles size={16} color="#6338A9" />
                                <Text fontSize="14px" fontWeight="800" color="var(--waba-ink)">
                                    큐레이션 보드
                                </Text>
                                <Box
                                    bg="var(--waba-purple-soft)"
                                    color="var(--waba-purple-text)"
                                    fontSize="11px"
                                    fontWeight="800"
                                    px={2}
                                    py="1px"
                                    borderRadius="999px"
                                >
                                    {curationBoard.length}건
                                </Box>
                            </HStack>
                            <Button
                                size="xs"
                                variant="ghost"
                                color="var(--waba-ink-2)"
                                gap={1}
                                onClick={() => setCurationExpanded((prev) => !prev)}
                            >
                                {curationExpanded ? '접기' : '펼치기'}
                                {curationExpanded ? <LuChevronUp size={14} /> : <LuChevronDown size={14} />}
                            </Button>
                        </Flex>

                        {curationExpanded && (
                            <>
                                {/* 메인 룩북 동물별 보유 현황 요약 칩 */}
                                <HStack gap={1.5} flexWrap="wrap" mb={3}>
                                    <Text fontSize="11px" fontWeight="700" color="var(--waba-ink-3)" mr={1}>
                                        메인 룩북 분포:
                                    </Text>
                                    {[...CURATION_SPECIES_OPTIONS.filter((s) => s.key !== 'ALL'), { key: 'ALL', label: '전체 공통' }].map((sp) => {
                                        const count = curationBoard.filter(
                                            (item) =>
                                                item.curation_grade === 'MAIN_LOOKBOOK' &&
                                                Array.isArray(item.effective_target_species) &&
                                                item.effective_target_species.includes(sp.key)
                                        ).length;
                                        return (
                                            <Box
                                                key={sp.key}
                                                bg="var(--waba-surface)"
                                                color="var(--waba-ink-2)"
                                                border="1px solid"
                                                borderColor="var(--waba-line)"
                                                fontSize="10.5px"
                                                fontWeight="700"
                                                px={2}
                                                py="1px"
                                                borderRadius="999px"
                                            >
                                                {sp.label} {count}
                                            </Box>
                                        );
                                    })}
                                </HStack>

                                {curationBoard.length === 0 ? (
                                    <Flex py={6} justify="center" color="var(--waba-ink-3)" fontSize="12.5px">
                                        메인 룩북 또는 메인 후보로 지정된 게시글이 없습니다.
                                    </Flex>
                                ) : (
                                    <Grid templateColumns={{ base: 'repeat(1, 1fr)', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' }} gap={3}>
                                    {curationBoard.map((c: any) => {
                                        const isMain = c.curation_grade === 'MAIN_LOOKBOOK';
                                        const roleBadge = getRoleBadgeProps(c.author_role);
                                        const isSensitive = Boolean(c.thumbnail_is_sensitive || c.has_sensitive_image);
                                        return (
                                            <Box
                                                key={c.id}
                                                borderRadius="16px"
                                                overflow="hidden"
                                                bg="var(--waba-surface)"
                                                border="1px solid"
                                                borderColor={isMain ? 'var(--waba-purple-border)' : 'var(--waba-line)'}
                                                cursor="pointer"
                                                transition="transform 0.15s ease"
                                                _hover={{ transform: 'translateY(-2px)' }}
                                                onClick={() => handleOpenDetail(c.id)}
                                            >
                                                <Box position="relative" h="130px" bg="var(--waba-card)" overflow="hidden">
                                                    {c.thumbnail_url ? (
                                                        <Image
                                                            src={c.thumbnail_url}
                                                            alt={c.title || '큐레이션 썸네일'}
                                                            w="100%"
                                                            h="100%"
                                                            objectFit="cover"
                                                            filter={isSensitive ? 'blur(12px)' : 'none'}
                                                            transform={isSensitive ? 'scale(1.08)' : 'none'}
                                                        />
                                                    ) : (
                                                        <Flex h="100%" align="center" justify="center" color="var(--waba-ink-3)" fontSize="12px">
                                                            이미지 없음
                                                        </Flex>
                                                    )}
                                                    <Box
                                                        position="absolute"
                                                        top={2}
                                                        left={2}
                                                        bg={isMain ? '#6338A9' : 'rgba(15, 23, 42, 0.85)'}
                                                        color="#FFFFFF"
                                                        fontSize="10.5px"
                                                        fontWeight="800"
                                                        px={2.5}
                                                        py={0.5}
                                                        borderRadius="999px"
                                                    >
                                                        {isMain ? '메인 룩북' : '메인 후보'}
                                                    </Box>
                                                    {isSensitive && (
                                                        <Box
                                                            position="absolute"
                                                            top={2}
                                                            right={2}
                                                            bg="rgba(239, 68, 68, 0.9)"
                                                            color="#FFFFFF"
                                                            fontSize="10px"
                                                            fontWeight="800"
                                                            px={2}
                                                            py={0.5}
                                                            borderRadius="999px"
                                                        >
                                                            민감 블러
                                                        </Box>
                                                    )}
                                                </Box>
                                                <Box p={3}>
                                                    <Text fontSize="13px" fontWeight="700" color="var(--waba-ink)" truncate mb={1.5}>
                                                        {c.title || `(게시글 #${c.id})`}
                                                    </Text>
                                                    <HStack gap={1.5} align="center" mb={1}>
                                                        <Text fontSize="11.5px" color="var(--waba-ink-2)" fontWeight="600" truncate>
                                                            {c.author_nickname || '-'}
                                                        </Text>
                                                        <Box
                                                            bg={roleBadge.bg}
                                                            color={roleBadge.color}
                                                            border="1px solid"
                                                            borderColor={roleBadge.borderColor}
                                                            fontSize="9.5px"
                                                            fontWeight="800"
                                                            px={1.5}
                                                            py="1px"
                                                            borderRadius="999px"
                                                            flexShrink={0}
                                                        >
                                                            {roleBadge.label}
                                                        </Box>
                                                    </HStack>
                                                    <Text fontSize="10.5px" color="var(--waba-ink-3)" mb={1.5}>
                                                        승격: {formatDateStr(c.promoted_at)}
                                                    </Text>
                                                    {Array.isArray(c.effective_target_species) && c.effective_target_species.length > 0 && (
                                                        <HStack gap={1} flexWrap="wrap">
                                                            {c.effective_target_species.map((spKey: string) => {
                                                                const found = CURATION_SPECIES_OPTIONS.find((o) => o.key === spKey);
                                                                return (
                                                                    <Box
                                                                        key={spKey}
                                                                        bg="var(--waba-purple-soft)"
                                                                        color="var(--waba-purple-text)"
                                                                        fontSize="9.5px"
                                                                        fontWeight="800"
                                                                        px={1.5}
                                                                        py="1px"
                                                                        borderRadius="999px"
                                                                    >
                                                                        {found ? found.label : spKey}
                                                                    </Box>
                                                                );
                                                            })}
                                                        </HStack>
                                                    )}
                                                </Box>
                                            </Box>
                                        );
                                    })}
                                    </Grid>
                                )}
                            </>
                        )}
                    </Box>

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
                                    <Button
                                        size="xs"
                                        h="28px"
                                        px={3}
                                        borderRadius="999px"
                                        bg={boardFilter === 'ALL' ? 'var(--waba-ink)' : 'var(--waba-surface)'}
                                        color={boardFilter === 'ALL' ? 'var(--waba-bg)' : 'var(--waba-ink-2)'}
                                        border="1px solid"
                                        borderColor={boardFilter === 'ALL' ? 'var(--waba-ink)' : 'var(--waba-line)'}
                                        fontSize="11.5px"
                                        fontWeight="700"
                                        onClick={() => {
                                            setBoardFilter('ALL');
                                            setPostPage(1);
                                        }}
                                    >
                                        전체 게시판
                                    </Button>
                                    {boards.map((b: any) => (
                                        <Button
                                            key={b.id}
                                            size="xs"
                                            h="28px"
                                            px={3}
                                            borderRadius="999px"
                                            bg={boardFilter === String(b.id) ? 'var(--waba-ink)' : 'var(--waba-surface)'}
                                            color={boardFilter === String(b.id) ? 'var(--waba-bg)' : 'var(--waba-ink-2)'}
                                            border="1px solid"
                                            borderColor={boardFilter === String(b.id) ? 'var(--waba-ink)' : 'var(--waba-line)'}
                                            fontSize="11.5px"
                                            fontWeight="700"
                                            onClick={() => {
                                                setBoardFilter(String(b.id));
                                                setPostPage(1);
                                            }}
                                        >
                                            {b.name}
                                        </Button>
                                    ))}
                                </HStack>

                                <HStack gap={2} flexWrap="wrap">
                                    <Input
                                        value={postSearchInput}
                                        onChange={(e) => setPostSearchInput(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                setPostSearchQuery(postSearchInput.trim());
                                                setPostPage(1);
                                            }
                                        }}
                                        placeholder="제목, 작성자 검색..."
                                        size="sm"
                                        w={{ base: '180px', md: '230px' }}
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
                                            setPostSearchQuery(postSearchInput.trim());
                                            setPostPage(1);
                                        }}
                                    >
                                        <LuSearch size={14} />
                                    </IconButton>
                                </HStack>
                            </Flex>

                            <Flex justify="space-between" align="center" gap={3} flexWrap="wrap">
                                <HStack gap={1.5} flexWrap="wrap">
                                    {POST_STATUS_TABS.map((tab) => (
                                        <Button
                                            key={tab.key}
                                            size="xs"
                                            h="28px"
                                            px={3}
                                            borderRadius="999px"
                                            bg={postStatusFilter === tab.key ? 'var(--waba-ink)' : 'var(--waba-surface)'}
                                            color={postStatusFilter === tab.key ? 'var(--waba-bg)' : 'var(--waba-ink-2)'}
                                            border="1px solid"
                                            borderColor={postStatusFilter === tab.key ? 'var(--waba-ink)' : 'var(--waba-line)'}
                                            fontSize="11.5px"
                                            fontWeight="700"
                                            onClick={() => {
                                                setPostStatusFilter(tab.key);
                                                setPostPage(1);
                                            }}
                                        >
                                            {tab.label}
                                        </Button>
                                    ))}
                                </HStack>

                                <HStack gap={1.5} flexWrap="wrap">
                                    {CURATION_TABS.map((tab) => (
                                        <Button
                                            key={tab.key}
                                            size="xs"
                                            h="28px"
                                            px={3}
                                            borderRadius="999px"
                                            bg={curationFilter === tab.key ? '#6338A9' : 'var(--waba-surface)'}
                                            color={curationFilter === tab.key ? '#FFFFFF' : 'var(--waba-ink-2)'}
                                            border="1px solid"
                                            borderColor={curationFilter === tab.key ? '#6338A9' : 'var(--waba-line)'}
                                            fontSize="11.5px"
                                            fontWeight="700"
                                            onClick={() => {
                                                setCurationFilter(tab.key);
                                                setPostPage(1);
                                            }}
                                        >
                                            {tab.label}
                                        </Button>
                                    ))}
                                </HStack>

                                <HStack gap={1.5} flexWrap="wrap">
                                    {SORT_OPTIONS.map((opt) => (
                                        <Button
                                            key={opt.key}
                                            size="xs"
                                            h="28px"
                                            px={2.5}
                                            borderRadius="999px"
                                            variant={sortBy === opt.key ? 'solid' : 'ghost'}
                                            bg={sortBy === opt.key ? 'var(--waba-surface)' : 'transparent'}
                                            color={sortBy === opt.key ? 'var(--waba-ink)' : 'var(--waba-ink-3)'}
                                            fontSize="11.5px"
                                            fontWeight="700"
                                            onClick={() => {
                                                setSortBy(opt.key);
                                                setPostPage(1);
                                            }}
                                        >
                                            {opt.label}
                                        </Button>
                                    ))}
                                </HStack>
                            </Flex>
                        </VStack>
                    </Box>

                    {/* Posts List (1번 시안: 행에는 상세 관리 버튼 1개만 배치) */}
                    {postsLoading ? (
                        <Flex py={20} justify="center">
                            <Spinner size="lg" color="#6338A9" />
                        </Flex>
                    ) : posts.length === 0 ? (
                        <Box p={12} textAlign="center" borderRadius="20px" bg="var(--waba-card)" border="1px solid" borderColor="var(--waba-line)">
                            <Text color="var(--waba-ink-3)" fontSize="14px">
                                조건에 해당하는 게시글이 없습니다.
                            </Text>
                        </Box>
                    ) : (
                        <VStack align="stretch" gap={2.5}>
                            {posts.map((item) => {
                                const purgeDate = item.purge_scheduled_at ? new Date(item.purge_scheduled_at) : null;
                                const dDay = purgeDate
                                    ? Math.max(0, Math.ceil((purgeDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
                                    : null;
                                const roleBadge = getRoleBadgeProps(item.author_role);

                                return (
                                    <Flex
                                        key={item.id}
                                        p={4}
                                        borderRadius="18px"
                                        bg="var(--waba-card)"
                                        border="1px solid"
                                        borderColor="var(--waba-line)"
                                        justify="space-between"
                                        align={{ base: 'flex-start', md: 'center' }}
                                        direction={{ base: 'column', md: 'row' }}
                                        gap={3.5}
                                    >
                                        <HStack gap={3.5} flex={1} minW={0} align="center">
                                            {item.thumbnail_url && (
                                                <Box position="relative" w="64px" h="64px" borderRadius="12px" overflow="hidden" flexShrink={0} bg="var(--waba-surface)">
                                                    <Image
                                                        src={item.thumbnail_url}
                                                        alt={item.title || '썸네일'}
                                                        w="100%"
                                                        h="100%"
                                                        objectFit="cover"
                                                        filter={item.has_sensitive_image ? 'blur(8px)' : 'none'}
                                                        transform={item.has_sensitive_image ? 'scale(1.08)' : 'none'}
                                                    />
                                                    {item.has_sensitive_image && (
                                                        <Box
                                                            position="absolute"
                                                            bottom={1}
                                                            left={1}
                                                            bg="rgba(239, 68, 68, 0.9)"
                                                            color="white"
                                                            fontSize="9px"
                                                            fontWeight="800"
                                                            px={1.5}
                                                            py="1px"
                                                            borderRadius="999px"
                                                        >
                                                            민감 블러
                                                        </Box>
                                                    )}
                                                </Box>
                                            )}

                                            <VStack align="stretch" gap={1.5} flex={1} minW={0}>
                                                <HStack gap={1.5} flexWrap="wrap">
                                                    {item.board_name && (
                                                        <Box
                                                            bg="var(--waba-surface)"
                                                            color="var(--waba-ink-2)"
                                                            border="1px solid"
                                                            borderColor="var(--waba-line)"
                                                            fontSize="10.5px"
                                                            fontWeight="700"
                                                            px={2}
                                                            py="1px"
                                                            borderRadius="999px"
                                                        >
                                                            {item.board_name}
                                                        </Box>
                                                    )}

                                                    {item.status === 'HIDDEN' && (
                                                        <Box bg="rgba(245, 158, 11, 0.14)" color="#D97706" fontSize="10.5px" fontWeight="800" px={2} py="1px" borderRadius="999px">
                                                            숨김
                                                        </Box>
                                                    )}
                                                    {item.status === 'DELETED' && (
                                                        <Box bg="rgba(239, 68, 68, 0.14)" color="#EF4444" fontSize="10.5px" fontWeight="800" px={2} py="1px" borderRadius="999px">
                                                            삭제됨{dDay !== null ? ` (D-${dDay})` : ''}
                                                        </Box>
                                                    )}
                                                    {Number(item.report_count || 0) > 0 && (
                                                        <Box bg="rgba(239, 68, 68, 0.12)" color="#EF4444" fontSize="10.5px" fontWeight="800" px={2} py="1px" borderRadius="999px">
                                                            신고 {item.report_count}건
                                                        </Box>
                                                    )}
                                                    {item.curation_grade === 'MAIN_LOOKBOOK' && (
                                                        <Box bg="var(--waba-purple-soft)" color="var(--waba-purple-text)" border="1px solid" borderColor="var(--waba-purple-border)" fontSize="10.5px" fontWeight="800" px={2} py="1px" borderRadius="999px">
                                                            메인 룩북
                                                        </Box>
                                                    )}
                                                    {item.curation_grade === 'LOOKBOOK_CANDIDATE' && (
                                                        <Box bg="var(--waba-surface)" color="var(--waba-ink)" border="1px solid" borderColor="var(--waba-line)" fontSize="10.5px" fontWeight="800" px={2} py="1px" borderRadius="999px">
                                                            메인 후보
                                                        </Box>
                                                    )}
                                                </HStack>

                                                <Text
                                                    fontSize="14px"
                                                    fontWeight="800"
                                                    color="var(--waba-ink)"
                                                    truncate
                                                    cursor="pointer"
                                                    _hover={{ textDecoration: 'underline' }}
                                                    onClick={() => handleOpenDetail(item.id)}
                                                >
                                                    {item.title || `(게시글 #${item.id})`}
                                                </Text>

                                                <Text fontSize="11.5px" color="var(--waba-ink-3)">
                                                    조회 {item.view_count ?? 0} · ♥ {item.like_count ?? 0} · 북마크 {item.bookmark_count ?? 0} · 💬 {item.comment_count ?? 0} · {formatDateStr(item.created_at)}
                                                </Text>
                                            </VStack>
                                        </HStack>

                                        <HStack gap={3} flexShrink={0} align="center">
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

                                            <Button
                                                size="xs"
                                                h="32px"
                                                px={4}
                                                borderRadius="999px"
                                                bg="#6338A9"
                                                color="#FFFFFF"
                                                _hover={{ bg: '#522B8F' }}
                                                onClick={() => handleOpenDetail(item.id)}
                                            >
                                                상세 관리
                                            </Button>
                                        </HStack>
                                    </Flex>
                                );
                            })}
                        </VStack>
                    )}

                    {/* Pagination */}
                    {postTotalPages > 1 && (
                        <HStack justify="center" gap={2} mt={6}>
                            <Button
                                size="xs"
                                variant="outline"
                                borderColor="var(--waba-line)"
                                color="var(--waba-ink)"
                                disabled={postPage <= 1}
                                onClick={() => setPostPage((p) => Math.max(1, p - 1))}
                            >
                                이전
                            </Button>
                            <Text fontSize="12.5px" color="var(--waba-ink-2)" fontWeight="700">
                                {postPage} / {postTotalPages}
                            </Text>
                            <Button
                                size="xs"
                                variant="outline"
                                borderColor="var(--waba-line)"
                                color="var(--waba-ink)"
                                disabled={postPage >= postTotalPages}
                                onClick={() => setPostPage((p) => Math.min(postTotalPages, p + 1))}
                            >
                                다음
                            </Button>
                        </HStack>
                    )}
                </>
            ) : (
                /* 탭 2: 댓글 관리 */
                <>
                    {/* Comment KPI Summary */}
                    <Grid templateColumns={{ base: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }} gap={3} mb={5}>
                        {[
                            { label: '전체 댓글', value: commentSummary.totalComments ?? 0, color: 'var(--waba-ink)' },
                            { label: '정상 노출', value: commentSummary.activeCount ?? 0, color: '#10B981' },
                            { label: '숨김 처리', value: commentSummary.hiddenCount ?? 0, color: '#D97706' },
                            { label: '삭제 처리', value: commentSummary.deletedCount ?? 0, color: '#EF4444' },
                        ].map((kpi) => (
                            <Box
                                key={kpi.label}
                                p={4}
                                borderRadius="18px"
                                bg="var(--waba-card)"
                                border="1px solid"
                                borderColor="var(--waba-line)"
                            >
                                <Text fontSize="12px" color="var(--waba-ink-3)" fontWeight="600">
                                    {kpi.label}
                                </Text>
                                <Text fontSize="24px" fontWeight="800" color={kpi.color} mt={1}>
                                    {kpi.value}
                                </Text>
                            </Box>
                        ))}
                    </Grid>

                    {/* Comment Filter Bar */}
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
                                {COMMENT_STATUS_TABS.map((tab) => (
                                    <Button
                                        key={tab.key}
                                        size="xs"
                                        h="28px"
                                        px={3}
                                        borderRadius="999px"
                                        bg={commentStatusFilter === tab.key ? 'var(--waba-ink)' : 'var(--waba-surface)'}
                                        color={commentStatusFilter === tab.key ? 'var(--waba-bg)' : 'var(--waba-ink-2)'}
                                        border="1px solid"
                                        borderColor={commentStatusFilter === tab.key ? 'var(--waba-ink)' : 'var(--waba-line)'}
                                        fontSize="11.5px"
                                        fontWeight="700"
                                        onClick={() => {
                                            setCommentStatusFilter(tab.key);
                                            setCommentPage(1);
                                        }}
                                    >
                                        {tab.label}
                                    </Button>
                                ))}
                            </HStack>

                            <HStack gap={1.5} flexWrap="wrap">
                                {COMMENT_ATTR_TABS.map((tab) => (
                                    <Button
                                        key={tab.key}
                                        size="xs"
                                        h="28px"
                                        px={3}
                                        borderRadius="999px"
                                        bg={commentAttrFilter === tab.key ? '#6338A9' : 'var(--waba-surface)'}
                                        color={commentAttrFilter === tab.key ? '#FFFFFF' : 'var(--waba-ink-2)'}
                                        border="1px solid"
                                        borderColor={commentAttrFilter === tab.key ? '#6338A9' : 'var(--waba-line)'}
                                        fontSize="11.5px"
                                        fontWeight="700"
                                        onClick={() => {
                                            setCommentAttrFilter(tab.key);
                                            setCommentPage(1);
                                        }}
                                    >
                                        {tab.label}
                                    </Button>
                                ))}
                            </HStack>

                            <HStack gap={2}>
                                <Input
                                    value={commentSearchInput}
                                    onChange={(e) => setCommentSearchInput(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            setCommentSearchQuery(commentSearchInput.trim());
                                            setCommentPage(1);
                                        }
                                    }}
                                    placeholder="댓글 내용, 작성자 검색..."
                                    size="sm"
                                    w={{ base: '180px', md: '220px' }}
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
                                        setCommentSearchQuery(commentSearchInput.trim());
                                        setCommentPage(1);
                                    }}
                                >
                                    <LuSearch size={14} />
                                </IconButton>
                            </HStack>
                        </Flex>
                    </Box>

                    {/* Comments List */}
                    {commentsLoading ? (
                        <Flex py={20} justify="center">
                            <Spinner size="lg" color="#6338A9" />
                        </Flex>
                    ) : comments.length === 0 ? (
                        <Box p={12} textAlign="center" borderRadius="20px" bg="var(--waba-card)" border="1px solid" borderColor="var(--waba-line)">
                            <Text color="var(--waba-ink-3)" fontSize="14px">
                                조건에 해당하는 댓글이 없습니다.
                            </Text>
                        </Box>
                    ) : (
                        <VStack align="stretch" gap={2.5}>
                            {comments.map((c: any) => {
                                const roleBadge = getRoleBadgeProps(c.author_role);
                                const isSubmitting = commentSubmittingId === String(c.id);
                                return (
                                    <Flex
                                        key={c.id}
                                        p={4}
                                        borderRadius="18px"
                                        bg="var(--waba-card)"
                                        border="1px solid"
                                        borderColor="var(--waba-line)"
                                        justify="space-between"
                                        align={{ base: 'flex-start', md: 'center' }}
                                        direction={{ base: 'column', md: 'row' }}
                                        gap={3}
                                    >
                                        <VStack align="stretch" gap={1.5} flex={1} minW={0}>
                                            <HStack gap={1.5} flexWrap="wrap">
                                                {c.parent_id && (
                                                    <Box bg="var(--waba-surface)" color="var(--waba-ink-2)" border="1px solid" borderColor="var(--waba-line)" fontSize="10px" fontWeight="700" px={2} py="1px" borderRadius="999px">
                                                        ↳ 대댓글
                                                    </Box>
                                                )}
                                                {c.is_accepted && (
                                                    <Box bg="rgba(16, 185, 129, 0.14)" color="#10B981" fontSize="10px" fontWeight="800" px={2} py="1px" borderRadius="999px">
                                                        채택
                                                    </Box>
                                                )}
                                                {c.is_pinned && (
                                                    <Box bg="var(--waba-purple-soft)" color="var(--waba-purple-text)" fontSize="10px" fontWeight="800" px={2} py="1px" borderRadius="999px">
                                                        고정
                                                    </Box>
                                                )}
                                                {c.status === 'HIDDEN' && (
                                                    <Box bg="rgba(245, 158, 11, 0.14)" color="#D97706" fontSize="10px" fontWeight="800" px={2} py="1px" borderRadius="999px">
                                                        숨김
                                                    </Box>
                                                )}
                                                {c.status === 'DELETED' && (
                                                    <Box bg="rgba(239, 68, 68, 0.14)" color="#EF4444" fontSize="10px" fontWeight="800" px={2} py="1px" borderRadius="999px">
                                                        삭제됨
                                                    </Box>
                                                )}
                                            </HStack>

                                            <Text fontSize="13.5px" color="var(--waba-ink)" fontWeight="600">
                                                {c.content}
                                            </Text>

                                            <HStack gap={1.5} flexWrap="wrap" align="center">
                                                <Text
                                                    fontSize="11.5px"
                                                    color="var(--waba-purple-text)"
                                                    fontWeight="600"
                                                    cursor="pointer"
                                                    _hover={{ textDecoration: 'underline' }}
                                                    onClick={() => window.open(`/post/${c.post_id}`, '_blank')}
                                                >
                                                    원글: {c.post_title || `(게시글 #${c.post_id})`}
                                                </Text>
                                                <LuExternalLink size={11} color="var(--waba-purple-text)" />
                                                <Text fontSize="11.5px" color="var(--waba-ink-3)">
                                                    · ♥ {c.like_count ?? 0} · {formatDateStr(c.created_at)}
                                                </Text>
                                            </HStack>
                                        </VStack>

                                        <HStack gap={3} flexShrink={0} align="center" flexWrap="wrap">
                                            <HStack gap={2}>
                                                <UserAvatar src={c.author_avatar} alt={c.author_nickname || '작성자'} size="2xs" fallbackType="user" />
                                                <Text fontSize="12px" fontWeight="700" color="var(--waba-ink)">
                                                    {c.author_nickname || '-'}
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

                                            <HStack gap={1.5}>
                                                {c.status !== 'HIDDEN' && (
                                                    <Button
                                                        size="xs"
                                                        variant="outline"
                                                        borderColor="var(--waba-line)"
                                                        color="var(--waba-ink)"
                                                        borderRadius="999px"
                                                        loading={isSubmitting}
                                                        onClick={() => handleCommentStatus(c.id, 'HIDDEN')}
                                                    >
                                                        숨김
                                                    </Button>
                                                )}
                                                {c.status !== 'ACTIVE' && (
                                                    <Button
                                                        size="xs"
                                                        bg="#10B981"
                                                        color="#FFFFFF"
                                                        borderRadius="999px"
                                                        loading={isSubmitting}
                                                        onClick={() => handleCommentStatus(c.id, 'ACTIVE')}
                                                    >
                                                        복구
                                                    </Button>
                                                )}
                                                {c.status !== 'DELETED' && (
                                                    <Button
                                                        size="xs"
                                                        bg="#E53E3E"
                                                        color="#FFFFFF"
                                                        borderRadius="999px"
                                                        loading={isSubmitting}
                                                        onClick={() => handleCommentStatus(c.id, 'DELETED')}
                                                    >
                                                        삭제
                                                    </Button>
                                                )}
                                            </HStack>
                                        </HStack>
                                    </Flex>
                                );
                            })}
                        </VStack>
                    )}

                    {/* Comment Pagination */}
                    {commentTotalPages > 1 && (
                        <HStack justify="center" gap={2} mt={6}>
                            <Button
                                size="xs"
                                variant="outline"
                                borderColor="var(--waba-line)"
                                color="var(--waba-ink)"
                                disabled={commentPage <= 1}
                                onClick={() => setCommentPage((p) => Math.max(1, p - 1))}
                            >
                                이전
                            </Button>
                            <Text fontSize="12.5px" color="var(--waba-ink-2)" fontWeight="700">
                                {commentPage} / {commentTotalPages}
                            </Text>
                            <Button
                                size="xs"
                                variant="outline"
                                borderColor="var(--waba-line)"
                                color="var(--waba-ink)"
                                disabled={commentPage >= commentTotalPages}
                                onClick={() => setCommentPage((p) => Math.min(commentTotalPages, p + 1))}
                            >
                                다음
                            </Button>
                        </HStack>
                    )}
                </>
            )}

            <PostAdminDetailDialog
                open={detailOpen}
                onOpenChange={setDetailOpen}
                postId={selectedPostId}
                onUpdated={fetchPosts}
            />
        </Box>
    );
}
