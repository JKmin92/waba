'use client'

import React, { useState, useEffect, useMemo } from 'react';
import {
    Avatar,
    Badge,
    Box,
    Button,
    Container,
    Flex,
    Grid,
    Heading,
    HStack,
    IconButton,
    Image,
    Input,
    Separator,
    Spinner,
    Stack,
    Text,
    VStack,
} from '@chakra-ui/react';
import {
    Search as SearchIcon,
    X,
    Bookmark,
    Heart,
    ShoppingCart,
    ArrowUpRight,
    Tag,
    SlidersHorizontal,
    Sparkles,
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import axiosInstance from '@/utils/api';
import Header from '../common/Header';
import { PostDetail, Product } from '@/interface';
import { toaster } from '@/components/ui/toaster';

type SearchTabType = 'all' | 'post' | 'product';
type PetFilterType = 'all' | 'dog' | 'cat' | 'etc';
type SortType = 'relevance' | 'latest' | 'popular';

const POPULAR_RECOMMENDED_TAGS = [
    '원목 캣타워',
    '논슬립 매트',
    '고양이 숨숨집',
    '강아지 계단',
    '감성 원목 식기',
    '인테리어 캣폴',
];

export default function SearchClient() {
    const router = useRouter();
    const searchParams = useSearchParams();

    // Query parameters
    const initialQuery = searchParams.get('q') || '';
    const initialType = (searchParams.get('type') as SearchTabType) || 'all';
    const initialSpecies = (searchParams.get('species') as PetFilterType) || 'all';
    const initialSort = (searchParams.get('sort') as SortType) || 'relevance';

    const [searchInput, setSearchInput] = useState(initialQuery);
    const [activeTab, setActiveTab] = useState<SearchTabType>(initialType);
    const [activeSpecies, setActiveSpecies] = useState<PetFilterType>(initialSpecies);
    const [activeSort, setActiveSort] = useState<SortType>(initialSort);

    const [loading, setLoading] = useState(false);
    const [posts, setPosts] = useState<PostDetail[]>([]);
    const [products, setProducts] = useState<Product[]>([]);

    // Sync input with URL search param
    useEffect(() => {
        setSearchInput(initialQuery);
    }, [initialQuery]);

    // Fetch search results
    useEffect(() => {
        let isMounted = true;
        const fetchData = async () => {
            if (!initialQuery.trim()) {
                setPosts([]);
                setProducts([]);
                return;
            }

            setLoading(true);
            try {
                // Try dedicated search endpoint or parallel fetches
                const searchRes = await axiosInstance.get('/api/search', {
                    params: {
                        q: initialQuery,
                        type: activeTab,
                        species: activeSpecies,
                        sort: activeSort,
                    },
                }).catch(() => null);

                if (searchRes && searchRes.data?.success) {
                    if (isMounted) {
                        setPosts(searchRes.data.posts || []);
                        setProducts(searchRes.data.products || []);
                    }
                } else {
                    // Fallback: Fetch products and all posts
                    const [prodRes, postRes] = await Promise.all([
                        axiosInstance.get(`/product/search?q=${encodeURIComponent(initialQuery)}`).catch(() => ({ data: { products: [] } })),
                        axiosInstance.get('/post/board/all').catch(() => ({ data: [] })),
                    ]);

                    if (isMounted) {
                        const fetchedProducts: Product[] = prodRes.data?.products || [];
                        const rawPosts: PostDetail[] = Array.isArray(postRes.data) ? postRes.data : [];

                        // Filter posts by query
                        const qLower = initialQuery.toLowerCase();
                        let filteredPosts = rawPosts.filter((item) => {
                            const titleMatch = item.post?.title?.toLowerCase().includes(qLower);
                            const tagMatch = item.tags?.some((t) => t.toLowerCase().includes(qLower));
                            const petNameMatch = item.post_pets?.some((p) => p.name?.toLowerCase().includes(qLower));
                            return titleMatch || tagMatch || petNameMatch;
                        });

                        setPosts(filteredPosts);
                        setProducts(fetchedProducts);
                    }
                }
            } catch (err) {
                console.error('Search fetch error:', err);
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        fetchData();
        return () => {
            isMounted = false;
        };
    }, [initialQuery, activeTab, activeSpecies, activeSort]);

    // Filter posts by species
    const filteredPosts = useMemo(() => {
        if (activeSpecies === 'all') return posts;

        return posts.filter((p) => {
            if (!p.post_pets || p.post_pets.length === 0) return false;
            if (activeSpecies === 'dog') {
                return p.post_pets.some((pet) => pet.species === 'DOG');
            }
            if (activeSpecies === 'cat') {
                return p.post_pets.some((pet) => pet.species === 'CAT');
            }
            if (activeSpecies === 'etc') {
                return p.post_pets.some((pet) => pet.species !== 'DOG' && pet.species !== 'CAT');
            }
            return true;
        });
    }, [posts, activeSpecies]);

    // Sort posts
    const sortedPosts = useMemo(() => {
        const list = [...filteredPosts];
        if (activeSort === 'latest') {
            return list.sort((a, b) => new Date(b.post?.created_at || 0).getTime() - new Date(a.post?.created_at || 0).getTime());
        }
        if (activeSort === 'popular') {
            return list.sort((a, b) => (b.post?.like_count || 0) - (a.post?.like_count || 0));
        }
        return list; // relevance
    }, [filteredPosts, activeSort]);

    // Counts
    const counts = {
        all: sortedPosts.length + products.length,
        post: sortedPosts.length,
        product: products.length,
    };

    const handleSearchSubmit = (newTerm?: string) => {
        const queryToUse = newTerm !== undefined ? newTerm.trim() : searchInput.trim();
        if (!queryToUse) return;

        const params = new URLSearchParams();
        params.set('q', queryToUse);
        if (activeTab !== 'all') params.set('type', activeTab);
        if (activeSpecies !== 'all') params.set('species', activeSpecies);
        if (activeSort !== 'relevance') params.set('sort', activeSort);

        router.push(`/search?${params.toString()}`);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleSearchSubmit();
        }
    };

    const updateFilterParams = (updates: { type?: SearchTabType; species?: PetFilterType; sort?: SortType }) => {
        const newTab = updates.type !== undefined ? updates.type : activeTab;
        const newSpecies = updates.species !== undefined ? updates.species : activeSpecies;
        const newSort = updates.sort !== undefined ? updates.sort : activeSort;

        if (updates.type !== undefined) setActiveTab(updates.type);
        if (updates.species !== undefined) setActiveSpecies(updates.species);
        if (updates.sort !== undefined) setActiveSort(updates.sort);

        const params = new URLSearchParams();
        if (initialQuery) params.set('q', initialQuery);
        if (newTab !== 'all') params.set('type', newTab);
        if (newSpecies !== 'all') params.set('species', newSpecies);
        if (newSort !== 'relevance') params.set('sort', newSort);

        router.push(`/search?${params.toString()}`);
    };

    return (
        <Box minH="100vh" bg="#FAFAFC">
            <Header />

            <Container maxW="1280px" pt={{ base: 24, md: 28 }} pb={20} px={{ base: 4, md: 8 }}>
                {/* 1. 상단 검색어 요약 및 검색 입력창 */}
                <Box mb={8}>
                    <Flex
                        direction={{ base: 'column', md: 'row' }}
                        align={{ base: 'stretch', md: 'center' }}
                        justify="space-between"
                        gap={4}
                    >
                        <Box>
                            <HStack gap={2} mb={1}>
                                <Text fontSize="12px" fontWeight="700" color="waba.purple" bg="#F3EFFF" px={2.5} py={0.5} rounded="full">
                                    통합 검색 결과
                                </Text>
                            </HStack>
                            <Heading fontSize={{ base: '22px', md: '28px' }} fontWeight="800" color="waba.charcoal">
                                {initialQuery ? (
                                    <>
                                        &apos;{initialQuery}&apos; 검색 결과{' '}
                                        <Text as="span" color="waba.purple" fontWeight="800">
                                            (총 {counts.all}개)
                                        </Text>
                                    </>
                                ) : (
                                    '원하는 공간과 아이템을 검색해보세요'
                                )}
                            </Heading>
                        </Box>

                        {/* 상단 검색바 인풋 */}
                        <Flex
                            align="center"
                            bg="white"
                            border="1px solid"
                            borderColor="waba.border"
                            rounded="full"
                            px={4}
                            py={2}
                            w={{ base: 'full', md: '420px' }}
                            boxShadow="0 2px 10px rgba(0, 0, 0, 0.03)"
                            _focusWithin={{ borderColor: 'waba.purple', boxShadow: '0 0 0 3px rgba(123, 92, 250, 0.15)' }}
                            transition="all 0.2s"
                        >
                            <Box color="waba.purple" mr={2.5} flexShrink={0}>
                                <SearchIcon size={18} strokeWidth={2.5} />
                            </Box>
                            <Input
                                value={searchInput}
                                onChange={(e) => setSearchInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="반려동물 용품, 인테리어 꿀팁 재검색"
                                variant="flushed"
                                borderBottom="none"
                                _focus={{ borderBottom: 'none' }}
                                fontSize="14px"
                                fontWeight="500"
                                color="waba.charcoal"
                                _placeholder={{ color: 'waba.faint' }}
                                px={0}
                                h="auto"
                            />
                            {searchInput && (
                                <Box
                                    as="button"
                                    onClick={() => setSearchInput('')}
                                    color="waba.faint"
                                    _hover={{ color: 'waba.charcoal' }}
                                    p={1}
                                    cursor="pointer"
                                    flexShrink={0}
                                >
                                    <X size={14} />
                                </Box>
                            )}
                            <Button
                                size="xs"
                                bg="waba.purple"
                                color="white"
                                rounded="full"
                                px={3}
                                ml={2}
                                fontWeight="700"
                                _hover={{ bg: 'purple.600' }}
                                onClick={() => handleSearchSubmit()}
                            >
                                검색
                            </Button>
                        </Flex>
                    </Flex>
                </Box>

                {/* 2. 상단 탭 바 (통합검색 | 공간·룩북 | 제품·아이템) */}
                <Box borderBottom="1px solid" borderColor="waba.border" mb={6}>
                    <Flex gap={{ base: 4, md: 8 }} overflowX="auto" pb={0}>
                        {[
                            { id: 'all', label: '통합검색', count: counts.all },
                            { id: 'post', label: '공간·게시글', count: counts.post },
                            { id: 'product', label: '제품·아이템', count: counts.product },
                        ].map((tab) => {
                            const active = activeTab === tab.id;
                            return (
                                <Box
                                    key={tab.id}
                                    as="button"
                                    onClick={() => updateFilterParams({ type: tab.id as SearchTabType })}
                                    pb={3}
                                    position="relative"
                                    cursor="pointer"
                                    flexShrink={0}
                                >
                                    <HStack gap={1.5}>
                                        <Text
                                            fontSize={{ base: '14px', md: '16px' }}
                                            fontWeight={active ? '800' : '600'}
                                            color={active ? 'waba.charcoal' : 'waba.muted'}
                                            transition="color 0.15s"
                                        >
                                            {tab.label}
                                        </Text>
                                        <Text
                                            fontSize="12px"
                                            fontWeight="700"
                                            color={active ? 'waba.purple' : 'waba.faint'}
                                            bg={active ? '#F3EFFF' : 'waba.subtle'}
                                            px={2}
                                            py={0.5}
                                            rounded="full"
                                        >
                                            {tab.count}
                                        </Text>
                                    </HStack>
                                    {active && (
                                        <Box
                                            position="absolute"
                                            bottom="-1px"
                                            left={0}
                                            right={0}
                                            h="2.5px"
                                            bg="waba.purple"
                                            rounded="full"
                                        />
                                    )}
                                </Box>
                            );
                        })}
                    </Flex>
                </Box>

                {/* 3. 반려동물 퀵 필터 및 정렬 드롭다운 */}
                <Flex
                    direction={{ base: 'column', sm: 'row' }}
                    align={{ base: 'stretch', sm: 'center' }}
                    justify="space-between"
                    gap={4}
                    mb={8}
                >
                    {/* 반려동물 종 필터 칩 */}
                    <HStack gap={2} overflowX="auto" py={1}>
                        {[
                            { id: 'all', label: '전체' },
                            { id: 'cat', label: '고양이 🐱' },
                            { id: 'dog', label: '강아지 🐶' },
                            { id: 'etc', label: '소동물·기타 🦎' },
                        ].map((chip) => {
                            const active = activeSpecies === chip.id;
                            return (
                                <Box
                                    key={chip.id}
                                    as="button"
                                    onClick={() => updateFilterParams({ species: chip.id as PetFilterType })}
                                    px={3.5}
                                    py={1.5}
                                    rounded="full"
                                    fontSize="12px"
                                    fontWeight={active ? '700' : '600'}
                                    bg={active ? 'waba.purple' : 'white'}
                                    color={active ? 'white' : 'waba.charcoal'}
                                    border="1px solid"
                                    borderColor={active ? 'waba.purple' : 'waba.border'}
                                    boxShadow={active ? '0 2px 8px rgba(123, 92, 250, 0.25)' : 'none'}
                                    _hover={{ opacity: 0.95, bg: active ? 'waba.purple' : 'waba.subtle' }}
                                    transition="all 0.15s"
                                    flexShrink={0}
                                >
                                    {chip.label}
                                </Box>
                            );
                        })}
                    </HStack>

                    {/* 정렬 셀렉터 */}
                    <HStack gap={1} align="center" flexShrink={0}>
                        {[
                            { id: 'relevance', label: '정확도순' },
                            { id: 'latest', label: '최신순' },
                            { id: 'popular', label: '인기순' },
                        ].map((sortItem) => {
                            const active = activeSort === sortItem.id;
                            return (
                                <Box
                                    key={sortItem.id}
                                    as="button"
                                    onClick={() => updateFilterParams({ sort: sortItem.id as SortType })}
                                    px={2.5}
                                    py={1}
                                    fontSize="12px"
                                    fontWeight={active ? '700' : '500'}
                                    color={active ? 'waba.charcoal' : 'waba.faint'}
                                    _hover={{ color: 'waba.charcoal' }}
                                    cursor="pointer"
                                >
                                    {sortItem.label}
                                </Box>
                            );
                        })}
                    </HStack>
                </Flex>

                {/* 4. 로딩 상태 스피너 */}
                {loading ? (
                    <Flex justify="center" align="center" minH="300px" py={12}>
                        <VStack gap={3}>
                            <Spinner size="lg" color="waba.purple" />
                            <Text fontSize="13px" color="waba.faint">
                                검색 결과를 불러오는 중입니다...
                            </Text>
                        </VStack>
                    </Flex>
                ) : counts.all === 0 ? (
                    /* 5. 검색 결과 없음 (Empty State) */
                    <Box
                        bg="white"
                        rounded="3xl"
                        border="1px solid"
                        borderColor="waba.border"
                        p={{ base: 8, md: 16 }}
                        textAlign="center"
                        my={4}
                    >
                        <Box
                            w="64px"
                            h="64px"
                            mx="auto"
                            mb={4}
                            rounded="2xl"
                            bg="#F3EFFF"
                            color="waba.purple"
                            display="flex"
                            alignItems="center"
                            justifyContent="center"
                            fontSize="28px"
                        >
                            🐾
                        </Box>
                        <Heading fontSize={{ base: '18px', md: '22px' }} fontWeight="800" color="waba.charcoal" mb={2}>
                            &apos;{initialQuery}&apos;에 대한 검색 결과가 없습니다
                        </Heading>
                        <Text fontSize="14px" color="waba.muted" maxW="440px" mx="auto" mb={8} lineHeight="1.6">
                            단어의 철자가 정확한지 확인하시거나, 더 일반적인 검색어를 입력해 보세요.
                        </Text>

                        {/* 추천 인기 검색어 태그 칩 */}
                        <Box maxW="560px" mx="auto">
                            <Text fontSize="12px" fontWeight="700" color="waba.faint" mb={3} textTransform="uppercase">
                                집사들이 자주 찾는 추천 검색어
                            </Text>
                            <Flex wrap="wrap" justify="center" gap={2}>
                                {POPULAR_RECOMMENDED_TAGS.map((tag) => (
                                    <Box
                                        key={tag}
                                        as="button"
                                        onClick={() => {
                                            setSearchInput(tag);
                                            handleSearchSubmit(tag);
                                        }}
                                        px={3.5}
                                        py={1.5}
                                        rounded="full"
                                        fontSize="12px"
                                        fontWeight="600"
                                        bg="waba.subtle"
                                        color="waba.charcoal"
                                        _hover={{ bg: '#EAEAEF', color: 'waba.purple' }}
                                        transition="all 0.15s"
                                        cursor="pointer"
                                    >
                                        #{tag}
                                    </Box>
                                ))}
                            </Flex>
                        </Box>
                    </Box>
                ) : (
                    /* 6. 검색 결과 메인 컨텐츠 영역 */
                    <VStack align="stretch" gap={12}>
                        {/* ───────────────────────────────────────────────────────────── */}
                        {/* A. 🛍️ 큐레이션 제품 섹션 (activeTab === 'all' || 'product')     */}
                        {/* ───────────────────────────────────────────────────────────── */}
                        {(activeTab === 'all' || activeTab === 'product') && products.length > 0 && (
                            <Box>
                                <Flex align="center" justify="space-between" mb={4}>
                                    <HStack gap={2}>
                                        <Heading fontSize={{ base: '18px', md: '20px' }} fontWeight="800" color="waba.charcoal">
                                            연관 추천 제품
                                        </Heading>
                                        <Text fontSize="13px" fontWeight="700" color="waba.purple" bg="#F3EFFF" px={2} py={0.5} rounded="full">
                                            {products.length}
                                        </Text>
                                    </HStack>
                                    {activeTab === 'all' && products.length > 4 && (
                                        <Button
                                            size="xs"
                                            variant="ghost"
                                            color="waba.muted"
                                            _hover={{ color: 'waba.purple' }}
                                            onClick={() => updateFilterParams({ type: 'product' })}
                                        >
                                            전체보기 <ArrowUpRight size={13} />
                                        </Button>
                                    )}
                                </Flex>

                                {/* 제품 그리드 */}
                                <Grid
                                    templateColumns={{
                                        base: 'repeat(2, 1fr)',
                                        sm: 'repeat(2, 1fr)',
                                        md: 'repeat(3, 1fr)',
                                        lg: activeTab === 'all' ? 'repeat(4, 1fr)' : 'repeat(4, 1fr)',
                                    }}
                                    gap={{ base: 3, md: 5 }}
                                >
                                    {(activeTab === 'all' ? products.slice(0, 4) : products).map((prod) => {
                                        const discountPercent = prod.original_price && prod.original_price > prod.sale_price
                                            ? Math.round(((prod.original_price - prod.sale_price) / prod.original_price) * 100)
                                            : null;

                                        return (
                                            <Box
                                                key={prod.id}
                                                bg="white"
                                                rounded="2xl"
                                                border="1px solid"
                                                borderColor="waba.border"
                                                overflow="hidden"
                                                transition="all 0.2s cubic-bezier(0.4, 0, 0.2, 1)"
                                                _hover={{
                                                    transform: 'translateY(-4px)',
                                                    boxShadow: '0 12px 32px -4px rgba(123, 92, 250, 0.12), 0 4px 12px -2px rgba(26, 26, 30, 0.06)',
                                                    borderColor: 'waba.purple',
                                                }}
                                                display="flex"
                                                flexDirection="column"
                                            >
                                                {/* 썸네일 */}
                                                <Box position="relative" w="full" pt="100%" bg="#F4F4F6" overflow="hidden">
                                                    <Image
                                                        src={prod.thumbnail_url || ''}
                                                        alt={prod.name}
                                                        position="absolute"
                                                        top={0}
                                                        left={0}
                                                        w="full"
                                                        h="full"
                                                        objectFit="cover"
                                                        transition="transform 0.3s"
                                                        _hover={{ transform: 'scale(1.04)' }}
                                                    />
                                                    <Box
                                                        position="absolute"
                                                        top={2.5}
                                                        left={2.5}
                                                        bg="rgba(26, 26, 30, 0.85)"
                                                        backdropFilter="blur(6px)"
                                                        color="white"
                                                        fontSize="10px"
                                                        fontWeight="800"
                                                        px={2}
                                                        py={0.5}
                                                        rounded="full"
                                                    >
                                                        와바미 PICK
                                                    </Box>
                                                </Box>

                                                {/* 제품 정보 */}
                                                <Box p={3.5} display="flex" flexDirection="column" flex="1">
                                                    <Text fontSize="11px" fontWeight="700" color="waba.faint" mb={1}>
                                                        WABAMI
                                                    </Text>
                                                    <Text
                                                        fontSize="13px"
                                                        fontWeight="700"
                                                        color="waba.charcoal"
                                                        lineHeight="1.4"
                                                        mb={2}
                                                        overflow="hidden"
                                                        display="-webkit-box"
                                                        style={{ WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}
                                                    >
                                                        {prod.name}
                                                    </Text>

                                                    <Box mt="auto">
                                                        {prod.original_price && prod.original_price > prod.sale_price && (
                                                            <Text fontSize="11px" color="waba.faint" textDecoration="line-through">
                                                                {prod.original_price.toLocaleString()}원
                                                            </Text>
                                                        )}
                                                        <HStack justify="space-between" align="center">
                                                            <HStack gap={1.5} align="baseline">
                                                                {discountPercent && (
                                                                    <Text fontSize="14px" fontWeight="800" color="red.500">
                                                                        {discountPercent}%
                                                                    </Text>
                                                                )}
                                                                <Text fontSize="15px" fontWeight="800" color="waba.charcoal">
                                                                    {prod.sale_price.toLocaleString()}원
                                                                </Text>
                                                            </HStack>
                                                            <IconButton
                                                                aria-label="장바구니 담기"
                                                                size="xs"
                                                                rounded="full"
                                                                bg="waba.subtle"
                                                                color="waba.charcoal"
                                                                _hover={{ bg: 'waba.purple', color: 'white' }}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    toaster.create({ title: '장바구니에 상품이 담겼습니다.', type: 'success' });
                                                                }}
                                                            >
                                                                <ShoppingCart size={13} />
                                                            </IconButton>
                                                        </HStack>
                                                    </Box>
                                                </Box>
                                            </Box>
                                        );
                                    })}
                                </Grid>
                            </Box>
                        )}

                        {activeTab === 'all' && products.length > 0 && sortedPosts.length > 0 && (
                            <Separator borderColor="waba.border" />
                        )}

                        {/* ───────────────────────────────────────────────────────────── */}
                        {/* B. 📸 공간 & 룩북 피드 섹션 (activeTab === 'all' || 'post')      */}
                        {/* ───────────────────────────────────────────────────────────── */}
                        {(activeTab === 'all' || activeTab === 'post') && sortedPosts.length > 0 && (
                            <Box>
                                <Flex align="center" justify="space-between" mb={4}>
                                    <HStack gap={2}>
                                        <Heading fontSize={{ base: '18px', md: '20px' }} fontWeight="800" color="waba.charcoal">
                                            연관 공간 & 룩북 스냅
                                        </Heading>
                                        <Text fontSize="13px" fontWeight="700" color="waba.purple" bg="#F3EFFF" px={2} py={0.5} rounded="full">
                                            {sortedPosts.length}
                                        </Text>
                                    </HStack>
                                </Flex>

                                {/* 게시글 그리드 */}
                                <Grid
                                    templateColumns={{
                                        base: '1fr',
                                        sm: 'repeat(2, 1fr)',
                                        md: 'repeat(3, 1fr)',
                                    }}
                                    gap={{ base: 4, md: 6 }}
                                >
                                    {sortedPosts.map((item) => {
                                        const thumbnail = item.post_images?.find((img) => img.is_thumbnail)?.image_url
                                            || item.post_images?.[0]?.image_url;
                                        const productPinsCount = item.product_pins?.filter((p) => p.pin_type !== 'PET').length || 0;
                                        const mainPet = item.post_pets?.[0];

                                        return (
                                            <Box
                                                key={item.post.id}
                                                bg="white"
                                                rounded="2xl"
                                                border="1px solid"
                                                borderColor="waba.border"
                                                overflow="hidden"
                                                transition="all 0.2s cubic-bezier(0.4, 0, 0.2, 1)"
                                                _hover={{
                                                    transform: 'translateY(-4px)',
                                                    boxShadow: '0 12px 32px -4px rgba(26, 28, 30, 0.12)',
                                                    borderColor: 'waba.charcoal',
                                                }}
                                                cursor="pointer"
                                                onClick={() => router.push(`/post/${item.post.id}`)}
                                                display="flex"
                                                flexDirection="column"
                                            >
                                                {/* 썸네일 이미지 및 뱃지 */}
                                                <Box position="relative" w="full" pt="75%" bg="#F4F4F6" overflow="hidden">
                                                    {thumbnail ? (
                                                        <Image
                                                            src={thumbnail}
                                                            alt={item.post.title}
                                                            position="absolute"
                                                            top={0}
                                                            left={0}
                                                            w="full"
                                                            h="full"
                                                            objectFit="cover"
                                                            transition="transform 0.3s"
                                                            _hover={{ transform: 'scale(1.03)' }}
                                                        />
                                                    ) : (
                                                        <Box
                                                            position="absolute"
                                                            top={0}
                                                            left={0}
                                                            w="full"
                                                            h="full"
                                                            display="flex"
                                                            alignItems="center"
                                                            justifyContent="center"
                                                            color="waba.faint"
                                                            fontSize="13px"
                                                        >
                                                            이미지 없음
                                                        </Box>
                                                    )}

                                                    {/* 상품 핀 개수 뱃지 */}
                                                    {productPinsCount > 0 && (
                                                        <Box
                                                            position="absolute"
                                                            top={3}
                                                            left={3}
                                                            bg="rgba(15, 17, 23, 0.75)"
                                                            backdropFilter="blur(6px)"
                                                            color="white"
                                                            fontSize="11px"
                                                            fontWeight="700"
                                                            px={2.5}
                                                            py={1}
                                                            rounded="full"
                                                            display="flex"
                                                            alignItems="center"
                                                            gap={1}
                                                        >
                                                            <span>📌</span> 상품 {productPinsCount}개
                                                        </Box>
                                                    )}

                                                    {/* 펫 태그 뱃지 */}
                                                    {mainPet && (
                                                        <Box
                                                            position="absolute"
                                                            bottom={3}
                                                            left={3}
                                                            bg="rgba(255, 255, 255, 0.92)"
                                                            backdropFilter="blur(6px)"
                                                            color="waba.charcoal"
                                                            fontSize="11px"
                                                            fontWeight="700"
                                                            px={2.5}
                                                            py={0.8}
                                                            rounded="full"
                                                            boxShadow="0 2px 6px rgba(0,0,0,0.12)"
                                                        >
                                                            {mainPet.species === 'CAT' ? '🐱' : mainPet.species === 'DOG' ? '🐶' : '🦎'}{' '}
                                                            {mainPet.name} {mainPet.breed ? `· ${mainPet.breed}` : ''}
                                                        </Box>
                                                    )}
                                                </Box>

                                                {/* 본문 메타 */}
                                                <Box p={4} display="flex" flexDirection="column" flex="1">
                                                    <Heading
                                                        fontSize="15px"
                                                        fontWeight="800"
                                                        color="waba.charcoal"
                                                        lineHeight="1.4"
                                                        mb={1.5}
                                                        overflow="hidden"
                                                        display="-webkit-box"
                                                        style={{ WebkitLineClamp: 1, WebkitBoxOrient: 'vertical' }}
                                                    >
                                                        {item.post.title}
                                                    </Heading>

                                                    {/* 해시태그 */}
                                                    {item.tags && item.tags.length > 0 && (
                                                        <HStack gap={1.5} mb={3} overflow="hidden">
                                                            {item.tags.slice(0, 3).map((tag, idx) => (
                                                                <Text key={idx} fontSize="11px" color="waba.purple" fontWeight="600">
                                                                    #{tag}
                                                                </Text>
                                                            ))}
                                                        </HStack>
                                                    )}

                                                    {/* 작성자 & 인터랙션 카운트 */}
                                                    <Flex mt="auto" align="center" justify="space-between" pt={2} borderTop="1px solid" borderColor="#F0F0F4">
                                                        <HStack gap={2}>
                                                            <Avatar.Root size="xs">
                                                                {item.user?.profile_image_url && (
                                                                    <Avatar.Image src={item.user.profile_image_url} />
                                                                )}
                                                                <Avatar.Fallback>
                                                                    {item.user?.nickname?.charAt(0) || 'U'}
                                                                </Avatar.Fallback>
                                                            </Avatar.Root>
                                                            <Text fontSize="12px" fontWeight="600" color="waba.muted">
                                                                @{item.user?.nickname || '집사'}
                                                            </Text>
                                                        </HStack>

                                                        <HStack gap={3} color="waba.faint" fontSize="11px" fontWeight="600">
                                                            <HStack gap={1}>
                                                                <Heart size={13} />
                                                                <Text>{item.post.like_count || 0}</Text>
                                                            </HStack>
                                                            <HStack gap={1}>
                                                                <Bookmark size={13} />
                                                                <Text>{item.post.bookmark_count || 0}</Text>
                                                            </HStack>
                                                        </HStack>
                                                    </Flex>
                                                </Box>
                                            </Box>
                                        );
                                    })}
                                </Grid>
                            </Box>
                        )}
                    </VStack>
                )}
            </Container>
        </Box>
    );
}
