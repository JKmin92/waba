'use client'

import React, { useState, useEffect, useRef } from 'react';
import {
    Box,
    Button,
    Dialog,
    Flex,
    HStack,
    Input,
    Portal,
    Text,
    VStack,
} from '@chakra-ui/react';
import { Search, X, Sparkles, TrendingUp } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface SearchModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

const RECENT_SEARCHES_KEY = 'waba_recent_searches';

const INITIAL_RECENT_SEARCHES = [
    '원목 캣타워',
    '골든리트리버',
    '방석',
    '슬개골 매트',
];

interface TrendingKeyword {
    rank: number;
    keyword: string;
    changeType: 'up' | 'new' | 'same';
    changeValue?: string;
}

const TRENDING_KEYWORDS: TrendingKeyword[] = [
    { rank: 1, keyword: '감성 원목 식기', changeType: 'up', changeValue: '2' },
    { rank: 2, keyword: '강아지 계단 논슬립', changeType: 'up', changeValue: '1' },
    { rank: 3, keyword: '고양이 숨숨집 터널', changeType: 'new' },
    { rank: 4, keyword: '노견 맞춤 영양제', changeType: 'same' },
    { rank: 5, keyword: '친환경 배변패드', changeType: 'up', changeValue: '3' },
    { rank: 6, keyword: '인테리어 캣폴', changeType: 'new' },
];

const RECOMMENDED_COLLECTIONS = [
    '#성수동냥이집',
    '#소형견거실인테리어',
    '#합사하우스_꿀팁',
];

type PetFilterType = 'all' | 'dog' | 'cat' | 'etc';

export default function SearchModal({ open, onOpenChange }: SearchModalProps) {
    const router = useRouter();
    const inputRef = useRef<HTMLInputElement>(null);

    const [keyword, setKeyword] = useState('');
    const [petFilter, setPetFilter] = useState<PetFilterType>('all');
    const [recentSearches, setRecentSearches] = useState<string[]>([]);

    // 1. Load recent searches from localStorage on mount & when opened
    useEffect(() => {
        if (typeof window !== 'undefined') {
            try {
                const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
                if (stored) {
                    const parsed = JSON.parse(stored);
                    if (Array.isArray(parsed)) {
                        setRecentSearches(parsed);
                        return;
                    }
                }
            } catch (e) {
                console.error('Failed to parse recent searches:', e);
            }
            // Fallback default
            setRecentSearches(INITIAL_RECENT_SEARCHES);
        }
    }, [open]);

    // 2. Auto-focus on open
    useEffect(() => {
        if (open) {
            const timer = setTimeout(() => {
                inputRef.current?.focus();
            }, 100);
            return () => clearTimeout(timer);
        } else {
            setKeyword('');
        }
    }, [open]);

    const saveRecentSearch = (searchTerm: string) => {
        const trimmed = searchTerm.trim();
        if (!trimmed) return;
        const updated = [trimmed, ...recentSearches.filter((item) => item !== trimmed)].slice(0, 8);
        setRecentSearches(updated);
        if (typeof window !== 'undefined') {
            localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
        }
    };

    const handleRemoveRecent = (termToRemove: string, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        const updated = recentSearches.filter((item) => item !== termToRemove);
        setRecentSearches(updated);
        if (typeof window !== 'undefined') {
            localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
        }
    };

    const handleClearAllRecent = () => {
        setRecentSearches([]);
        if (typeof window !== 'undefined') {
            localStorage.removeItem(RECENT_SEARCHES_KEY);
        }
    };

    const handleExecuteSearch = (targetKeyword: string) => {
        const query = targetKeyword.trim();
        if (!query) return;

        saveRecentSearch(query);
        onOpenChange(false);

        const filterParam = petFilter !== 'all' ? `&species=${petFilter}` : '';
        router.push(`/search?q=${encodeURIComponent(query)}${filterParam}`);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleExecuteSearch(keyword);
        } else if (e.key === 'Escape') {
            e.preventDefault();
            onOpenChange(false);
        }
    };

    return (
        <Dialog.Root
            open={open}
            onOpenChange={(e) => onOpenChange(e.open)}
        >
            <Portal>
                {/* 반투명 블러 백드롭 (10px blur, dark alpha) */}
                <Dialog.Backdrop
                    bg="rgba(15, 17, 23, 0.45)"
                    backdropFilter="blur(10px)"
                    transition="all 0.25s cubic-bezier(0.16, 1, 0.3, 1)"
                />
                <Dialog.Positioner
                    p={{ base: 3, md: 6 }}
                    alignItems="flex-start"
                    pt={{ base: '48px', md: '72px' }}
                >
                    <Dialog.Content
                        maxW="680px"
                        w="full"
                        bg="rgba(255, 255, 255, 0.96)"
                        backdropFilter="blur(24px)"
                        borderRadius={{ base: '20px', md: '28px' }}
                        border="1px solid"
                        borderColor="rgba(255, 255, 255, 0.9)"
                        boxShadow="0 25px 60px -15px rgba(26, 26, 30, 0.22), 0 0 0 1px rgba(255, 255, 255, 0.8) inset"
                        overflow="hidden"
                    >
                        {/* 1. 검색창 인풋 헤더 */}
                        <Flex
                            align="center"
                            gap={3}
                            px={{ base: 4, md: 6 }}
                            py={{ base: 3.5, md: 4.5 }}
                            borderBottom="1px solid"
                            borderColor="#F0F0F4"
                        >
                            <Box color="waba.purple" flexShrink={0}>
                                <Search size={22} strokeWidth={2.4} />
                            </Box>
                            <Input
                                ref={inputRef}
                                value={keyword}
                                onChange={(e) => setKeyword(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="반려동물 용품, 인테리어 꿀팁, 공간을 검색해보세요"
                                variant="flushed"
                                borderBottom="none"
                                _focus={{ borderBottom: 'none' }}
                                fontSize={{ base: '14px', md: '16px' }}
                                fontWeight="500"
                                color="waba.charcoal"
                                _placeholder={{ color: 'waba.faint' }}
                                px={0}
                                h="auto"
                                py={1}
                            />
                            <HStack gap={1.5} flexShrink={0}>
                                {keyword.trim().length > 0 && (
                                    <Box
                                        as="button"
                                        aria-label="입력 내용 지우기"
                                        onClick={() => {
                                            setKeyword('');
                                            inputRef.current?.focus();
                                        }}
                                        w="24px"
                                        h="24px"
                                        borderRadius="full"
                                        bg="waba.subtle"
                                        _hover={{ bg: '#E8E8EE' }}
                                        display="flex"
                                        alignItems="center"
                                        justifyContent="center"
                                        color="waba.muted"
                                        cursor="pointer"
                                        transition="all 0.15s"
                                    >
                                        <X size={13} strokeWidth={2.5} />
                                    </Box>
                                )}
                                <Box
                                    display={{ base: 'none', md: 'flex' }}
                                    alignItems="center"
                                    bg="waba.subtle"
                                    color="waba.muted"
                                    px={2}
                                    py={1}
                                    borderRadius="md"
                                    fontSize="11px"
                                    fontWeight="600"
                                    fontFamily="monospace"
                                    border="1px solid"
                                    borderColor="#E8E8EE"
                                >
                                    ESC
                                </Box>
                                <Button
                                    size="xs"
                                    bg="waba.purple"
                                    color="white"
                                    rounded="full"
                                    px={3}
                                    h="28px"
                                    fontSize="12px"
                                    fontWeight="700"
                                    _hover={{ bg: 'purple.600' }}
                                    onClick={() => handleExecuteSearch(keyword)}
                                >
                                    검색
                                </Button>
                            </HStack>
                        </Flex>

                        {/* 2. 반려동물 종별 퀵 필터 바 */}
                        <Box
                            px={{ base: 4, md: 6 }}
                            py={2.5}
                            bg="#FAFAFC"
                            borderBottom="1px solid"
                            borderColor="#F0F0F4"
                        >
                            <HStack gap={2} overflowX="auto" py={0.5}>
                                <Text
                                    fontSize="11px"
                                    fontWeight="700"
                                    color="waba.muted"
                                    mr={1}
                                    flexShrink={0}
                                >
                                    종별 퀵 필터
                                </Text>
                                {[
                                    { id: 'all', label: '전체' },
                                    { id: 'dog', label: '강아지 🐶' },
                                    { id: 'cat', label: '고양이 🐱' },
                                    { id: 'etc', label: '소동물·기타 🦎' },
                                ].map((tab) => {
                                    const active = petFilter === tab.id;
                                    return (
                                        <Box
                                            key={tab.id}
                                            as="button"
                                            onClick={() => setPetFilter(tab.id as PetFilterType)}
                                            px={3}
                                            py={1}
                                            borderRadius="full"
                                            fontSize="11px"
                                            fontWeight={active ? '700' : '600'}
                                            bg={active ? 'waba.purple' : 'white'}
                                            color={active ? 'white' : 'waba.charcoal'}
                                            border="1px solid"
                                            borderColor={active ? 'waba.purple' : 'waba.border'}
                                            boxShadow={active ? '0 2px 6px rgba(123, 92, 250, 0.28)' : 'none'}
                                            _hover={{ opacity: 0.9, bg: active ? 'waba.purple' : 'waba.subtle' }}
                                            transition="all 0.15s"
                                            flexShrink={0}
                                        >
                                            {tab.label}
                                        </Box>
                                    );
                                })}
                            </HStack>
                        </Box>

                        {/* 3. 모달 바디: 최근 검색어 & 실시간 인기 검색어 & 추천 컬렉션 */}
                        <Box
                            px={{ base: 4, md: 6 }}
                            py={5}
                            maxH={{ base: 'calc(100vh - 220px)', md: '440px' }}
                            overflowY="auto"
                        >
                            <VStack align="stretch" gap={5}>
                                {/* Section A: 최근 검색어 */}
                                <Box>
                                    <Flex align="center" justify="space-between" mb={2.5}>
                                        <HStack gap={1.5}>
                                            <Text fontSize="12px" fontWeight="700" color="waba.charcoal">
                                                최근 검색어
                                            </Text>
                                            {recentSearches.length > 0 && (
                                                <Box
                                                    fontSize="10px"
                                                    fontWeight="700"
                                                    color="waba.purple"
                                                    bg="#F3EFFF"
                                                    px={1.5}
                                                    py={0.5}
                                                    borderRadius="full"
                                                >
                                                    {recentSearches.length}개
                                                </Box>
                                            )}
                                        </HStack>
                                        {recentSearches.length > 0 && (
                                            <Box
                                                as="button"
                                                onClick={handleClearAllRecent}
                                                fontSize="11px"
                                                fontWeight="600"
                                                color="waba.faint"
                                                _hover={{ color: 'waba.muted' }}
                                                cursor="pointer"
                                            >
                                                전체 삭제
                                            </Box>
                                        )}
                                    </Flex>

                                    {recentSearches.length === 0 ? (
                                        <Text fontSize="12px" color="waba.faint" py={2}>
                                            최근 검색한 내역이 없습니다.
                                        </Text>
                                    ) : (
                                        <Flex wrap="wrap" gap={2}>
                                            {recentSearches.map((term) => (
                                                <HStack
                                                    key={term}
                                                    as="button"
                                                    onClick={() => handleExecuteSearch(term)}
                                                    gap={1.5}
                                                    bg="waba.subtle"
                                                    _hover={{ bg: '#EAEAEF' }}
                                                    px={3}
                                                    py={1.5}
                                                    borderRadius="full"
                                                    cursor="pointer"
                                                    transition="all 0.15s"
                                                >
                                                    <Text fontSize="12px" fontWeight="600" color="waba.charcoal">
                                                        {term}
                                                    </Text>
                                                    <Box
                                                        as="span"
                                                        onClick={(e: React.MouseEvent) => handleRemoveRecent(term, e)}
                                                        color="waba.faint"
                                                        _hover={{ color: 'waba.charcoal' }}
                                                        display="inline-flex"
                                                        alignItems="center"
                                                        justifyContent="center"
                                                        p={0.5}
                                                    >
                                                        <X size={12} strokeWidth={2.5} />
                                                    </Box>
                                                </HStack>
                                            ))}
                                        </Flex>
                                    )}
                                </Box>

                                <Box borderBottom="1px solid" borderColor="#F0F0F4" />

                                {/* Section B: 실시간 인기 검색어 */}
                                <Box>
                                    <Flex align="center" justify="space-between" mb={3}>
                                        <HStack gap={2}>
                                            <Text fontSize="12px" fontWeight="700" color="waba.charcoal">
                                                실시간 인기 검색어
                                            </Text>
                                            <HStack
                                                gap={1}
                                                bg="red.50"
                                                color="red.500"
                                                px={1.5}
                                                py={0.5}
                                                borderRadius="full"
                                                border="1px solid"
                                                borderColor="red.100"
                                            >
                                                <Box w="5px" h="5px" borderRadius="full" bg="red.500" />
                                                <Text fontSize="9px" fontWeight="800">
                                                    LIVE
                                                </Text>
                                            </HStack>
                                        </HStack>
                                        <Text fontSize="11px" fontWeight="500" color="waba.faint">
                                            실시간 갱신
                                        </Text>
                                    </Flex>

                                    {/* 2열 그리드 리스트 */}
                                    <Box
                                        display="grid"
                                        gridTemplateColumns={{ base: '1fr', sm: '1fr 1fr' }}
                                        gapX={3}
                                        gapY={1.5}
                                    >
                                        {TRENDING_KEYWORDS.map((item) => (
                                            <Flex
                                                key={item.rank}
                                                as="button"
                                                onClick={() => handleExecuteSearch(item.keyword)}
                                                align="center"
                                                justify="space-between"
                                                px={2.5}
                                                py={2}
                                                borderRadius="xl"
                                                _hover={{ bg: 'waba.subtle' }}
                                                cursor="pointer"
                                                transition="all 0.15s"
                                                textAlign="left"
                                            >
                                                <HStack gap={2.5}>
                                                    <Box
                                                        w="20px"
                                                        h="20px"
                                                        borderRadius="md"
                                                        bg={item.rank === 1 ? 'waba.purple' : item.rank <= 3 ? '#F3EFFF' : 'waba.subtle'}
                                                        color={item.rank === 1 ? 'white' : item.rank <= 3 ? 'waba.purple' : 'waba.muted'}
                                                        fontSize="11px"
                                                        fontWeight="800"
                                                        display="flex"
                                                        alignItems="center"
                                                        justifyContent="center"
                                                    >
                                                        {item.rank}
                                                    </Box>
                                                    <Text
                                                        fontSize="12px"
                                                        fontWeight={item.rank <= 3 ? '700' : '600'}
                                                        color="waba.charcoal"
                                                    >
                                                        {item.keyword}
                                                    </Text>
                                                </HStack>

                                                {/* 순위 변동 뱃지 */}
                                                {item.changeType === 'new' ? (
                                                    <Box
                                                        bg="#F3EFFF"
                                                        color="waba.purple"
                                                        fontSize="9px"
                                                        fontWeight="800"
                                                        px={1.5}
                                                        py={0.5}
                                                        borderRadius="sm"
                                                    >
                                                        NEW
                                                    </Box>
                                                ) : item.changeType === 'up' ? (
                                                    <Text fontSize="10px" fontWeight="700" color="red.500">
                                                        ▲ {item.changeValue}
                                                    </Text>
                                                ) : (
                                                    <Text fontSize="10px" fontWeight="700" color="waba.faint">
                                                        —
                                                    </Text>
                                                )}
                                            </Flex>
                                        ))}
                                    </Box>
                                </Box>

                                <Box borderBottom="1px solid" borderColor="#F0F0F4" />

                                {/* Section C: 추천 공간 컬렉션 */}
                                <Box>
                                    <Text
                                        fontSize="11px"
                                        fontWeight="700"
                                        color="waba.faint"
                                        textTransform="uppercase"
                                        letterSpacing="wider"
                                        mb={2}
                                    >
                                        추천 공간 컬렉션
                                    </Text>
                                    <Flex wrap="wrap" gap={2}>
                                        {RECOMMENDED_COLLECTIONS.map((col, idx) => (
                                            <Box
                                                key={col}
                                                as="button"
                                                onClick={() => handleExecuteSearch(col.replace('#', ''))}
                                                px={3}
                                                py={1.5}
                                                borderRadius="full"
                                                fontSize="11px"
                                                fontWeight="600"
                                                bg={idx === 0 ? '#F3EFFF' : 'waba.subtle'}
                                                color={idx === 0 ? 'waba.purple' : 'waba.muted'}
                                                _hover={{ bg: idx === 0 ? '#ECE5FF' : '#EAEAEF' }}
                                                transition="all 0.15s"
                                                cursor="pointer"
                                            >
                                                {col}
                                            </Box>
                                        ))}
                                    </Flex>
                                </Box>
                            </VStack>
                        </Box>

                        {/* 4. 모달 하단 내비게이션 헬퍼 */}
                        <Flex
                            px={{ base: 4, md: 6 }}
                            py={2.5}
                            bg="#F9F9FB"
                            borderTop="1px solid"
                            borderColor="#F0F0F4"
                            align="center"
                            justify="space-between"
                            fontSize="11px"
                            color="waba.faint"
                        >
                            <HStack gap={3}>
                                <HStack gap={1}>
                                    <Box
                                        bg="white"
                                        border="1px solid"
                                        borderColor="waba.border"
                                        borderRadius="sm"
                                        px={1}
                                        fontSize="10px"
                                        fontFamily="monospace"
                                    >
                                        ↵
                                    </Box>
                                    <Text>선택 및 검색</Text>
                                </HStack>
                                <HStack gap={1} display={{ base: 'none', sm: 'flex' }}>
                                    <Box
                                        bg="white"
                                        border="1px solid"
                                        borderColor="waba.border"
                                        borderRadius="sm"
                                        px={1}
                                        fontSize="10px"
                                        fontFamily="monospace"
                                    >
                                        ESC
                                    </Box>
                                    <Text>닫기</Text>
                                </HStack>
                            </HStack>
                            <HStack gap={1}>
                                <Sparkles size={12} color="#7B5CFA" />
                                <Text color="waba.purple" fontWeight="600">
                                    스포트라이트 빠른 검색
                                </Text>
                            </HStack>
                        </Flex>
                    </Dialog.Content>
                </Dialog.Positioner>
            </Portal>
        </Dialog.Root>
    );
}
