'use client'

import { PostDetail } from "@/interface";
import axiosInstance from "@/utils/api";
import { Box, Button, Heading, Spinner, Text, VStack } from "@chakra-ui/react";
import { useEffect, useMemo, useState } from "react";
import { toaster } from "@/components/ui/toaster";
import { useRouter } from "next/navigation";
import { LuLayers, LuRefreshCw } from "react-icons/lu";
import BoardHeaderBar, { BoardMeta } from "./board-components/BoardHeaderBar";
import BoardEqualGridCard from "./board-components/BoardEqualGridCard";
import BoardListItem from "./board-components/BoardListItem";

const DEFAULT_BOARDS: BoardMeta[] = [
    { id: 'ALL', name: '전체', description: '모든 반려인들의 일상과 케어 노하우' },
    { id: 'LOOKBOOK', name: '공식 룩북', description: '와바미 공식 화보 및 베스트 펫-리빙 룩북' },
    { id: 'SNAP', name: '인기 스냅', description: '반려동물과 함께하는 일상과 추천 아이템 공유' },
    { id: 'CARE_LOUNGE', name: '케어 저니', description: '질병 치유 히스토리와 육아 노하우' },
    { id: 'QNA', name: '건강 Q&A', description: '초보 집사들의 궁금증과 멘토들의 답변' },
];

const SORT_OPTIONS = ['최신순', '인기순', '댓글 많은순'] as const;

export default function BoardClient({ boardId }: { boardId: string }) {
    const router = useRouter();

    const [postList, setPostList] = useState<PostDetail[]>([]);
    const [boards, setBoards] = useState<BoardMeta[]>(DEFAULT_BOARDS);
    const [selectedCategory, setSelectedCategory] = useState<string>(() => {
        if (!boardId || boardId.toUpperCase() === 'ALL') return 'ALL';
        return boardId.toUpperCase();
    });
    const [selectedPetTypeList, setSelectedPetTypeList] = useState<string[]>(['전체']);
    const [sortBy, setSortBy] = useState<string>('최신순');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [searchKeyword, setSearchKeyword] = useState<string>('');
    const [loading, setLoading] = useState(true);

    // URL의 boardId가 바뀔 때 selectedCategory 동기화
    useEffect(() => {
        if (boardId) {
            setSelectedCategory(boardId.toUpperCase() === 'ALL' ? 'ALL' : boardId.toUpperCase());
        }
    }, [boardId]);

    // 게시판 목록 및 전체 게시글 로드
    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                const boardRes = await axiosInstance.get('/post/boards');
                if (Array.isArray(boardRes.data) && boardRes.data.length > 0) {
                    const dynamicBoards = [
                        { id: 'ALL', name: '전체', description: '모든 반려인들의 일상과 케어 노하우' },
                        ...boardRes.data.map((b: any) => ({
                            id: b.id,
                            name: b.name,
                            description: b.description,
                        })),
                    ];
                    setBoards(dynamicBoards);
                }
            } catch {
                // 기본 목록 유지
            }

            try {
                const res = await axiosInstance.get('/post/board/all');
                setPostList(Array.isArray(res.data) ? res.data : []);
            } catch {
                toaster.create({ title: '게시글 목록을 불러오지 못했습니다.', type: 'error' });
            } finally {
                setLoading(false);
            }
        };

        fetchInitialData();
    }, []);

    // 1. 카테고리별 게시글 수 계산
    const categoryCounts = useMemo(() => {
        const counts: Record<string, number> = { ALL: postList.length };
        postList.forEach((item) => {
            const bId = item.post.board_id?.toUpperCase();
            if (bId) {
                counts[bId] = (counts[bId] || 0) + 1;
            }
        });
        return counts;
    }, [postList]);

    // 2. 현재 선택된 카테고리에 속한 글 목록
    const postsInCategory = useMemo(() => {
        if (selectedCategory === 'ALL') return postList;
        return postList.filter((item) => item.post.board_id?.toUpperCase() === selectedCategory);
    }, [postList, selectedCategory]);

    // 3. 반려동물 종별 게시글 수 계산
    const petTypeCount = useMemo(() => {
        const countMap: Record<string, number> = {};

        postsInCategory.forEach((post) => {
            post.post_pets?.forEach((pet) => {
                if (pet.species) {
                    countMap[pet.species] = (countMap[pet.species] || 0) + 1;
                }
            });
        });

        const sortedSpecies = Object.entries(countMap)
            .map(([type, count]) => ({
                type,
                count,
                checked: selectedPetTypeList.includes(type),
            }))
            .sort((a, b) => b.count - a.count);

        return [
            { type: '전체', count: postsInCategory.length, checked: selectedPetTypeList.includes('전체') },
            ...sortedSpecies,
        ];
    }, [postsInCategory, selectedPetTypeList]);

    const handleCategoryChange = (catId: string) => {
        setSelectedCategory(catId);
        router.replace(`/board/${catId.toLowerCase()}`, { scroll: false });
    };

    const petTypeChangeHandler = (type: string) => {
        if (type === '전체') {
            setSelectedPetTypeList(['전체']);
            return;
        }

        let next = selectedPetTypeList.filter((t) => t !== '전체');
        if (next.includes(type)) {
            next = next.filter((t) => t !== type);
        } else {
            next = [...next, type];
        }

        if (next.length === 0) {
            setSelectedPetTypeList(['전체']);
        } else {
            setSelectedPetTypeList(next);
        }
    };

    const handleCycleSort = () => {
        const idx = SORT_OPTIONS.indexOf(sortBy as (typeof SORT_OPTIONS)[number]);
        const nextIdx = (idx + 1) % SORT_OPTIONS.length;
        setSortBy(SORT_OPTIONS[nextIdx]);
    };

    const handleResetFilters = () => {
        setSelectedCategory('ALL');
        setSelectedPetTypeList(['전체']);
        setSortBy('최신순');
        setSearchKeyword('');
        router.replace('/board/all', { scroll: false });
    };

    // 4. 최종 필터링 및 정렬된 게시글 목록
    const filteredAndSortedPosts = useMemo(() => {
        let result =
            selectedCategory === 'ALL'
                ? postList
                : postList.filter((item) => item.post.board_id?.toUpperCase() === selectedCategory);

        if (!selectedPetTypeList.includes('전체')) {
            result = result.filter((item) =>
                item.post_pets?.some((pet) => selectedPetTypeList.includes(pet.species))
            );
        }

        const q = searchKeyword.trim().toLowerCase();
        if (q) {
            result = result.filter(
                (item) =>
                    item.post.title?.toLowerCase().includes(q) ||
                    item.user?.nickname?.toLowerCase().includes(q) ||
                    item.tags?.some((tag) => tag.toLowerCase().includes(q)) ||
                    item.post_pets?.some((p) => p.breed?.toLowerCase().includes(q) || p.name?.toLowerCase().includes(q))
            );
        }

        const sorted = [...result];
        if (sortBy === '인기순') {
            sorted.sort((a, b) => {
                const scoreA = (a.post.like_count || 0) * 3 + (a.post.view_count || 0);
                const scoreB = (b.post.like_count || 0) * 3 + (b.post.view_count || 0);
                return scoreB - scoreA;
            });
        } else if (sortBy === '댓글 많은순') {
            sorted.sort((a, b) => (b.post.comment_count || 0) - (a.post.comment_count || 0));
        } else {
            sorted.sort(
                (a, b) => new Date(b.post.created_at).getTime() - new Date(a.post.created_at).getTime()
            );
        }

        return sorted;
    }, [postList, selectedCategory, selectedPetTypeList, searchKeyword, sortBy]);

    return (
        <Box
            w="100%"
            maxW="1240px"
            mx="auto"
            px={{ base: 4, md: 6, lg: '36px' }}
            pt={{ base: 4, md: 6 }}
            pb={{ base: 8, md: '44px' }}
            minW={0}
        >
            <VStack align="stretch" gap={{ base: '18px', md: '22px' }} minW={0}>
                <BoardHeaderBar
                    boards={boards}
                    selectedCategory={selectedCategory}
                    onCategoryChange={handleCategoryChange}
                    categoryCounts={categoryCounts}
                    sortBy={sortBy}
                    onCycleSort={handleCycleSort}
                    viewMode={viewMode}
                    onViewModeChange={setViewMode}
                    searchKeyword={searchKeyword}
                    onSearchKeywordChange={setSearchKeyword}
                    totalCount={filteredAndSortedPosts.length}
                    petTypeCount={petTypeCount}
                    selectedPetTypeList={selectedPetTypeList}
                    onPetTypeChange={petTypeChangeHandler}
                />

                {loading ? (
                    <VStack py={20} gap={3}>
                        <Spinner size="lg" color="#6338A9" />
                        <Text fontSize="13px" color="var(--waba-ink-3)">
                            커뮤니티 게시글을 불러오는 중...
                        </Text>
                    </VStack>
                ) : filteredAndSortedPosts.length > 0 ? (
                    viewMode === 'grid' ? (
                        <BoardEqualGridCard postList={filteredAndSortedPosts} />
                    ) : (
                        <BoardListItem postList={filteredAndSortedPosts} />
                    )
                ) : (
                    <VStack
                        py="20"
                        px="6"
                        bg="var(--waba-surface)"
                        borderRadius="24px"
                        border="1px dashed"
                        borderColor="var(--waba-line)"
                        gap="4"
                        textAlign="center"
                    >
                        <Box
                            w="56px"
                            h="56px"
                            borderRadius="full"
                            bg="var(--waba-purple-soft)"
                            color="var(--waba-purple-text)"
                            display="flex"
                            alignItems="center"
                            justifyContent="center"
                        >
                            <LuLayers size={26} />
                        </Box>
                        <VStack gap="1">
                            <Heading fontSize="17px" fontWeight="800" color="var(--waba-ink)">
                                조건에 맞는 게시글이 없습니다
                            </Heading>
                            <Text fontSize="13px" color="var(--waba-ink-3)">
                                선택하신 카테고리 또는 검색 조건에 등록된 글이 아직 없습니다.
                            </Text>
                        </VStack>
                        <Button
                            size="sm"
                            borderRadius="999px"
                            bg="#6338A9"
                            color="white"
                            px="5"
                            onClick={handleResetFilters}
                            _hover={{ bg: '#522B8F' }}
                            gap={1.5}
                        >
                            <LuRefreshCw size={14} />
                            모든 필터 초기화
                        </Button>
                    </VStack>
                )}
            </VStack>
        </Box>
    );
}
