'use client'

import { PostDetail } from "@/interface";
import axiosInstance from "@/utils/api";
import { Badge, Box, Button, Container, Heading, HStack, SegmentGroup, Stack, Text, VStack } from "@chakra-ui/react"
import { useEffect, useMemo, useState } from "react";
import Header from "../../common/Header";
import { petSpeciesLabel } from "@/utils/simpleUtils";
import { toaster } from "@/components/ui/toaster";
import PostMasonryList from "./PostMasonryList";
import { useRouter } from "next/navigation";
import { Sparkles, Layers, RefreshCw } from "lucide-react";

interface BoardMeta {
    id: string;
    name: string;
    description?: string;
}

const DEFAULT_BOARDS: BoardMeta[] = [
    { id: 'ALL', name: '전체', description: '모든 반려인들의 일상과 케어 노하우' },
    { id: 'LOOKBOOK', name: '공식 룩북', description: '와바미 공식 화보 및 베스트 펫-리빙 룩북' },
    { id: 'SNAP', name: '일상 스냅', description: '반려동물과 함께하는 일상과 추천 아이템 공유' },
    { id: 'CARE_LOUNGE', name: '케어 라운지', description: '질병 치유 히스토리와 육아 노하우' },
    { id: 'QNA', name: '질문/고민', description: '초보 집사들의 궁금증과 멘토들의 답변' },
];

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
                // 1. 게시판 목록 동적 로드
                const boardRes = await axiosInstance.get('/post/boards');
                if (Array.isArray(boardRes.data) && boardRes.data.length > 0) {
                    const dynamicBoards = [
                        { id: 'ALL', name: '전체', description: '모든 반려인들의 일상과 케어 노하우' },
                        ...boardRes.data.map((b: any) => ({
                            id: b.id,
                            name: b.name,
                            description: b.description,
                        }))
                    ];
                    setBoards(dynamicBoards);
                }
            } catch (err) {
                // 기본 목록 유지
            }

            try {
                // 2. 전체 게시글 로드 (빠른 클라이언트 필터링 및 카테고리별 건수 계산)
                const res = await axiosInstance.get('/post/board/all');
                setPostList(res.data);
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

    // 2. 현재 선택된 카테고리에 속한 글 목록 (동물 통계 산출용)
    const postsInCategory = useMemo(() => {
        if (selectedCategory === 'ALL') return postList;
        return postList.filter(item => item.post.board_id?.toUpperCase() === selectedCategory);
    }, [postList, selectedCategory]);

    // 3. 반려동물 종별 게시글 수 계산 (현재 카테고리 기준)
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

    // 카테고리 변경 핸들러
    const handleCategoryChange = (catId: string) => {
        setSelectedCategory(catId);
        router.replace(`/board/${catId.toLowerCase()}`, { scroll: false });
    };

    // 반려동물 종 필터 변경 핸들러
    const petTypeChangeHandler = (type: string) => {
        if (type === '전체') {
            setSelectedPetTypeList(['전체']);
            return;
        }

        let next = selectedPetTypeList.filter(t => t !== '전체');
        if (next.includes(type)) {
            next = next.filter(t => t !== type);
        } else {
            next = [...next, type];
        }

        if (next.length === 0) {
            setSelectedPetTypeList(['전체']);
        } else {
            setSelectedPetTypeList(next);
        }
    };

    // 필터 초기화
    const handleResetFilters = () => {
        setSelectedCategory('ALL');
        setSelectedPetTypeList(['전체']);
        setSortBy('최신순');
        router.replace('/board/all', { scroll: false });
    };

    // 4. 최종 필터링 및 정렬된 게시글 목록
    const filteredAndSortedPosts = useMemo(() => {
        // A. 카테고리 필터
        let result = selectedCategory === 'ALL'
            ? postList
            : postList.filter(item => item.post.board_id?.toUpperCase() === selectedCategory);

        // B. 동물 종 필터
        if (!selectedPetTypeList.includes('전체')) {
            result = result.filter(item =>
                item.post_pets?.some(pet => selectedPetTypeList.includes(pet.species))
            );
        }

        // C. 정렬
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
            // 기본: 최신순
            sorted.sort((a, b) => new Date(b.post.created_at).getTime() - new Date(a.post.created_at).getTime());
        }

        return sorted;
    }, [postList, selectedCategory, selectedPetTypeList, sortBy]);

    // 현재 활성화된 카테고리 정보
    const currentBoardMeta = boards.find(b => b.id === selectedCategory) || boards[0];

    return (
        <Container minH="100vh" bg="waba.canvas" pb={24}>
            <Header />
            <Container maxW="1280px" pt={{ base: 24, md: 32 }} px={{ base: 4, md: 6 }}>
                <Stack gap={{ base: 8, md: 10 }}>

                    {/* 상단 헤더 & 정렬 */}
                    <Stack gap="4">
                        <Stack
                            direction={{ base: "column", md: "row" }}
                            alignItems={{ base: "flex-start", md: "flex-end" }}
                            justifyContent="space-between"
                            gap="3"
                        >
                            <Stack gap="0.5">
                                <HStack gap="2">
                                    <Heading fontSize={{ base: "xl", md: "2xl" }} fontWeight="black" color="charcoal">
                                        {currentBoardMeta.name === '전체' ? '반려생활 이야기' : currentBoardMeta.name}
                                    </Heading>
                                    <Badge rounded="full" px="2.5" py="0.5" bg="waba.purpleLight" color="waba.purple" fontSize="xs" fontWeight="bold">
                                        {filteredAndSortedPosts.length}건
                                    </Badge>
                                </HStack>
                                <Text fontSize="sm" color="fg.subtle">
                                    {currentBoardMeta.description || '다양한 반려동물 가족의 이야기와 노하우를 만나보세요.'}
                                </Text>
                            </Stack>

                            <SegmentGroup.Root
                                size="sm"
                                value={sortBy}
                                onValueChange={(details) => {
                                    if (details.value) setSortBy(details.value);
                                }}
                                rounded="full"
                                bg="white"
                                p="1"
                                border="1px solid"
                                borderColor="waba.border"
                                shadow="xs"
                            >
                                <SegmentGroup.Indicator rounded="full" bg="bg" />
                                <SegmentGroup.Items items={["최신순", "인기순", "댓글 많은순"]} />
                            </SegmentGroup.Root>
                        </Stack>

                        {/* ───────────────────────────────────────────────────────────── */}
                        {/* 1. 카테고리(게시판) 탭 필터 (Category Chips)                 */}
                        {/* ───────────────────────────────────────────────────────────── */}
                        <Box
                            overflowX="auto"
                            py="1"
                            css={{
                                scrollbarWidth: 'none',
                                '&::-webkit-scrollbar': { display: 'none' }
                            }}
                        >
                            <HStack gap="2" minW="max-content">
                                {boards.map((board) => {
                                    const isSelected = selectedCategory === board.id;
                                    const count = categoryCounts[board.id] || 0;

                                    return (
                                        <Button
                                            key={board.id}
                                            size="sm"
                                            rounded="full"
                                            variant={isSelected ? "solid" : "outline"}
                                            bg={isSelected ? "charcoal" : "white"}
                                            color={isSelected ? "white" : "charcoal"}
                                            borderColor={isSelected ? "charcoal" : "waba.border"}
                                            fontWeight={isSelected ? "bold" : "semibold"}
                                            px="4"
                                            py="2"
                                            shadow={isSelected ? "sm" : "xs"}
                                            transition="all 0.2s"
                                            onClick={() => handleCategoryChange(board.id)}
                                            _hover={{
                                                bg: isSelected ? "#000000" : "waba.subtle",
                                                borderColor: isSelected ? "#000000" : "gray.300",
                                                transform: "translateY(-1px)",
                                            }}
                                        >
                                            <span>{board.name}</span>
                                            <Badge
                                                ml="1.5"
                                                rounded="full"
                                                fontSize="11px"
                                                px="1.5"
                                                py="0"
                                                bg={isSelected ? "whiteAlpha.300" : "gray.100"}
                                                color={isSelected ? "white" : "fg.subtle"}
                                            >
                                                {count}
                                            </Badge>
                                        </Button>
                                    );
                                })}
                            </HStack>
                        </Box>

                        {/* ───────────────────────────────────────────────────────────── */}
                        {/* 2. 반려동물 종별 필터 (Pet Species Chips)                     */}
                        {/* ───────────────────────────────────────────────────────────── */}
                        <Box
                            bg="white"
                            p="3"
                            rounded="2xl"
                            border="1px solid"
                            borderColor="waba.border"
                            shadow="xs"
                        >
                            <HStack gap="2" wrap="wrap" alignItems="center">
                                <HStack gap="1" mr="1" color="fg.subtle" fontSize="xs" fontWeight="bold">
                                    <Sparkles size={14} className="text-purple-500" />
                                    <span>반려동물</span>
                                </HStack>

                                {petTypeCount.map((petType) => {
                                    const isSelected = selectedPetTypeList.includes(petType.type);
                                    return (
                                        <Button
                                            key={petType.type}
                                            size="xs"
                                            rounded="full"
                                            variant={isSelected ? "solid" : "subtle"}
                                            bg={isSelected ? "waba.purple" : "gray.100"}
                                            color={isSelected ? "white" : "charcoal"}
                                            fontWeight="semibold"
                                            px="3"
                                            py="1.5"
                                            transition="all 0.15s"
                                            onClick={() => petTypeChangeHandler(petType.type)}
                                            _hover={{
                                                bg: isSelected ? "waba.purpleHover" : "gray.200",
                                            }}
                                        >
                                            <span>
                                                {petType.type === '전체' ? '전체' : petSpeciesLabel(petType.type)}
                                            </span>
                                            <Text as="span" ml="1" fontSize="10px" opacity={isSelected ? 0.9 : 0.6}>
                                                ({petType.count})
                                            </Text>
                                        </Button>
                                    );
                                })}
                            </HStack>
                        </Box>
                    </Stack>

                    {/* ───────────────────────────────────────────────────────────── */}
                    {/* 3. 게시글 목록 또는 검색 결과 0건 Empty State                  */}
                    {/* ───────────────────────────────────────────────────────────── */}
                    {filteredAndSortedPosts.length > 0 ? (
                        <PostMasonryList postList={filteredAndSortedPosts} />
                    ) : (
                        <VStack
                            py="20"
                            px="6"
                            bg="white"
                            rounded="3xl"
                            border="1px dashed"
                            borderColor="waba.border"
                            gap="4"
                            textAlign="center"
                        >
                            <Box w="14" h="14" rounded="full" bg="gray.100" display="flex" alignItems="center" justifyContent="center">
                                <Layers size={28} className="text-gray-400" />
                            </Box>
                            <VStack gap="1">
                                <Heading fontSize="lg" fontWeight="bold" color="charcoal">
                                    조건에 맞는 게시글이 없습니다
                                </Heading>
                                <Text fontSize="sm" color="fg.subtle">
                                    선택하신 카테고리 또는 반려동물 필터에 등록된 글이 아직 없습니다.
                                </Text>
                            </VStack>
                            <Button
                                size="sm"
                                rounded="full"
                                bg="charcoal"
                                color="white"
                                px="5"
                                onClick={handleResetFilters}
                                _hover={{ bg: "black" }}
                            >
                                <RefreshCw size={14} className="mr-1.5" />
                                모든 필터 초기화
                            </Button>
                        </VStack>
                    )}

                </Stack>
            </Container>
        </Container>
    );
}
