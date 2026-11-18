'use client'

import React from 'react';
import {
    Box,
    Button,
    Flex,
    Heading,
    HStack,
    Input,
    Text,
    VStack,
} from '@chakra-ui/react';
import { LuPlus, LuSearch } from 'react-icons/lu';
import { useRouter } from 'next/navigation';
import { NOTEBOOK_CATEGORIES } from './types';

export type NotebookTabKey = 'ALL' | 'POPULAR' | 'SCRAPPED';
export type NotebookStatusFilter = 'ALL' | 'ACTIVE' | 'CURED' | 'COMPLETED';

interface NotebookListHeaderProps {
    activeTab: NotebookTabKey;
    onTabChange: (tab: NotebookTabKey) => void;
    selectedCategory: string;
    onCategoryChange: (cat: string) => void;
    statusFilter: NotebookStatusFilter;
    onStatusFilterChange: (st: NotebookStatusFilter) => void;
    searchQuery: string;
    onSearchQueryChange: (q: string) => void;
    totalCount: number;
}

const STATUS_CHIPS: { key: NotebookStatusFilter; label: string }[] = [
    { key: 'ALL', label: '상태: 전체' },
    { key: 'ACTIVE', label: '진행 중' },
    { key: 'CURED', label: '완치' },
    { key: 'COMPLETED', label: '목표 달성' },
];

export default function NotebookListHeader({
    activeTab,
    onTabChange,
    selectedCategory,
    onCategoryChange,
    statusFilter,
    onStatusFilterChange,
    searchQuery,
    onSearchQueryChange,
    totalCount,
}: NotebookListHeaderProps) {
    const router = useRouter();

    return (
        <VStack align="stretch" gap="16px" minW={0}>
            {/* Top Title + Search + Create CTA */}
            <Flex
                direction={{ base: 'column', md: 'row' }}
                justify="space-between"
                align={{ base: 'stretch', md: 'flex-end' }}
                gap={3}
                minW={0}
            >
                <Box>
                    <Text fontSize="11px" fontWeight="800" color="var(--waba-purple-text)" letterSpacing="0.06em">
                        SHARED HEALTH NOTEBOOKS
                    </Text>
                    <Heading as="h1" fontSize={{ base: '20px', md: '24px' }} fontWeight="800" color="var(--waba-ink)" mt="2px">
                        건강 수첩 탐색
                    </Heading>
                </Box>

                <HStack gap="10px" flexWrap="wrap" justify={{ base: 'space-between', md: 'flex-end' }}>
                    <Box
                        w={{ base: '100%', sm: '230px' }}
                        minW={0}
                        h="34px"
                        borderRadius="999px"
                        bg="var(--waba-surface)"
                        border="1px solid"
                        borderColor="var(--waba-line)"
                        px="14px"
                        display="flex"
                        alignItems="center"
                        gap="8px"
                    >
                        <Box color="var(--waba-ink-3)" flexShrink={0}>
                            <LuSearch size={14} />
                        </Box>
                        <Input
                            value={searchQuery}
                            onChange={(e) => onSearchQueryChange(e.target.value)}
                            placeholder="증상, 케어 루틴, 견종 검색"
                            fontSize="12px"
                            color="var(--waba-ink)"
                            _placeholder={{ color: 'var(--waba-ink-3)' }}
                            border="none"
                            outline="none"
                            p={0}
                            h="100%"
                            bg="transparent"
                            _focus={{ outline: 'none', boxShadow: 'none' }}
                        />
                    </Box>

                    <Button
                        size="xs"
                        h="34px"
                        px="14px"
                        borderRadius="999px"
                        bg="#6338A9"
                        color="white"
                        fontSize="12px"
                        fontWeight="700"
                        _hover={{ bg: '#522B8F' }}
                        onClick={() => router.push('/member/mypage')}
                        gap={1}
                        flexShrink={0}
                    >
                        <LuPlus size={14} />
                        내 수첩 만들기
                    </Button>
                </HStack>
            </Flex>

            {/* Underline Tabs + Total Count */}
            <Flex
                direction={{ base: 'column', sm: 'row' }}
                align={{ base: 'stretch', sm: 'center' }}
                justify="space-between"
                borderBottom="1px solid"
                borderColor="var(--waba-line)"
                pb={{ base: 2, sm: '12px' }}
                gap={2}
                minW={0}
            >
                <HStack
                    gap={{ base: 4, md: '24px' }}
                    overflowX="auto"
                    whiteSpace="nowrap"
                    pb={{ base: 1, sm: 0 }}
                    css={{ '&::-webkit-scrollbar': { display: 'none' } }}
                >
                    {[
                        { key: 'ALL' as const, label: '전체 공유 수첩' },
                        { key: 'POPULAR' as const, label: '인기 수첩' },
                        { key: 'SCRAPPED' as const, label: '내가 스크랩한 수첩' },
                    ].map((tab) => {
                        const isActive = activeTab === tab.key;
                        return (
                            <Box
                                key={tab.key}
                                as="button"
                                onClick={() => onTabChange(tab.key)}
                                position="relative"
                                fontSize="14px"
                                fontWeight={isActive ? '800' : '600'}
                                color={isActive ? 'var(--waba-ink)' : 'var(--waba-ink-3)'}
                                pb={{ base: '8px', sm: '12px' }}
                                mb={{ base: '-9px', sm: '-13px' }}
                                cursor="pointer"
                                flexShrink={0}
                                _hover={{ color: 'var(--waba-ink)' }}
                            >
                                {tab.label}
                                {isActive && (
                                    <Box
                                        position="absolute"
                                        left={0}
                                        right={0}
                                        bottom={0}
                                        h="2.5px"
                                        bg="#6338A9"
                                        borderRadius="999px"
                                    />
                                )}
                            </Box>
                        );
                    })}
                </HStack>

                <Text fontSize="12px" color="var(--waba-ink-3)" fontWeight="600" flexShrink={0}>
                    총 {totalCount.toLocaleString()}개의 공유 수첩
                </Text>
            </Flex>

            {/* Category Chips + Status Filter Chips */}
            <Flex justify="space-between" align={{ base: 'stretch', md: 'center' }} direction={{ base: 'column', md: 'row' }} gap="12px">
                <HStack gap="8px" flexWrap="wrap">
                    {NOTEBOOK_CATEGORIES.map((cat) => {
                        const isSelected = selectedCategory === cat.key;
                        return (
                            <Button
                                key={cat.key}
                                size="xs"
                                h="30px"
                                px="13px"
                                borderRadius="999px"
                                bg={isSelected ? '#6338A9' : 'var(--waba-surface)'}
                                color={isSelected ? '#FFFFFF' : 'var(--waba-ink-2)'}
                                border="1px solid"
                                borderColor={isSelected ? '#6338A9' : 'var(--waba-line)'}
                                fontSize="12px"
                                fontWeight="600"
                                onClick={() => onCategoryChange(cat.key)}
                            >
                                {cat.label}
                            </Button>
                        );
                    })}
                </HStack>

                <HStack
                    bg="var(--waba-surface)"
                    p="3px"
                    borderRadius="999px"
                    border="1px solid"
                    borderColor="var(--waba-line)"
                    gap="2px"
                    w="fit-content"
                    flexWrap="wrap"
                >
                    {STATUS_CHIPS.map((st) => {
                        const isSelected = statusFilter === st.key;
                        return (
                            <Button
                                key={st.key}
                                size="2xs"
                                h="26px"
                                px="12px"
                                borderRadius="999px"
                                bg={isSelected ? '#6338A9' : 'transparent'}
                                color={isSelected ? '#FFFFFF' : 'var(--waba-ink-2)'}
                                fontSize="11px"
                                fontWeight="600"
                                onClick={() => onStatusFilterChange(st.key)}
                            >
                                {st.label}
                            </Button>
                        );
                    })}
                </HStack>
            </Flex>
        </VStack>
    );
}
