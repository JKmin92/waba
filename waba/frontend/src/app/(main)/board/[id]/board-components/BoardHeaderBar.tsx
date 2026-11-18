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
import { LuLayoutGrid, LuList, LuSearch, LuSparkles } from 'react-icons/lu';
import { petSpeciesLabel } from '@/utils/simpleUtils';

export interface BoardMeta {
    id: string;
    name: string;
    description?: string;
}

interface PetTypeCountItem {
    type: string;
    count: number;
    checked: boolean;
}

interface BoardHeaderBarProps {
    boards: BoardMeta[];
    selectedCategory: string;
    onCategoryChange: (catId: string) => void;
    categoryCounts: Record<string, number>;
    sortBy: string;
    onCycleSort: () => void;
    viewMode: 'grid' | 'list';
    onViewModeChange: (mode: 'grid' | 'list') => void;
    searchKeyword: string;
    onSearchKeywordChange: (val: string) => void;
    totalCount: number;
    petTypeCount: PetTypeCountItem[];
    selectedPetTypeList: string[];
    onPetTypeChange: (type: string) => void;
}

export default function BoardHeaderBar({
    boards,
    selectedCategory,
    onCategoryChange,
    sortBy,
    onCycleSort,
    viewMode,
    onViewModeChange,
    searchKeyword,
    onSearchKeywordChange,
    totalCount,
    petTypeCount,
    selectedPetTypeList,
    onPetTypeChange,
}: BoardHeaderBarProps) {
    return (
        <VStack align="stretch" gap="16px" minW={0}>
            {/* Top Title & Right Controls */}
            <Flex
                direction={{ base: 'column', lg: 'row' }}
                justify="space-between"
                align={{ base: 'stretch', lg: 'flex-end' }}
                gap={{ base: 3, lg: 4 }}
                minW={0}
            >
                <Box>
                    <Text
                        fontSize="11px"
                        fontWeight="800"
                        color="var(--waba-purple-text)"
                        letterSpacing="0.06em"
                    >
                        WABA COMMUNITY
                    </Text>
                    <Heading
                        as="h1"
                        fontSize={{ base: '20px', md: '24px' }}
                        fontWeight="800"
                        color="var(--waba-ink)"
                        mt="2px"
                    >
                        커뮤니티 탐색
                    </Heading>
                </Box>

                {/* Right Controls: Sort + View Switch + Search */}
                <Flex
                    wrap="wrap"
                    align="center"
                    gap="10px"
                    justify={{ base: 'flex-start', lg: 'flex-end' }}
                >
                    <Button
                        size="xs"
                        h="34px"
                        px="13px"
                        borderRadius="999px"
                        border="1px solid"
                        borderColor="var(--waba-line)"
                        bg="var(--waba-card)"
                        color="var(--waba-ink-2)"
                        fontSize="12px"
                        fontWeight="600"
                        onClick={onCycleSort}
                        flexShrink={0}
                    >
                        {sortBy} ▾
                    </Button>

                    {/* Grid / List View Toggle */}
                    <HStack
                        h="34px"
                        px="4px"
                        borderRadius="999px"
                        border="1px solid"
                        borderColor="var(--waba-line)"
                        bg="var(--waba-surface)"
                        gap="2px"
                        flexShrink={0}
                    >
                        <Button
                            size="2xs"
                            h="26px"
                            px="10px"
                            borderRadius="999px"
                            bg={viewMode === 'grid' ? 'var(--waba-card)' : 'transparent'}
                            color={viewMode === 'grid' ? 'var(--waba-purple-text)' : 'var(--waba-ink-3)'}
                            fontWeight={viewMode === 'grid' ? '700' : '600'}
                            fontSize="12px"
                            boxShadow={viewMode === 'grid' ? 'xs' : 'none'}
                            onClick={() => onViewModeChange('grid')}
                            gap={1}
                        >
                            <LuLayoutGrid size={13} />
                            그리드
                        </Button>
                        <Button
                            size="2xs"
                            h="26px"
                            px="10px"
                            borderRadius="999px"
                            bg={viewMode === 'list' ? 'var(--waba-card)' : 'transparent'}
                            color={viewMode === 'list' ? 'var(--waba-purple-text)' : 'var(--waba-ink-3)'}
                            fontWeight={viewMode === 'list' ? '700' : '600'}
                            fontSize="12px"
                            boxShadow={viewMode === 'list' ? 'xs' : 'none'}
                            onClick={() => onViewModeChange('list')}
                            gap={1}
                        >
                            <LuList size={13} />
                            리스트
                        </Button>
                    </HStack>

                    {/* Search Input */}
                    <Box
                        w={{ base: '100%', sm: '220px', md: '240px' }}
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
                            value={searchKeyword}
                            onChange={(e) => onSearchKeywordChange(e.target.value)}
                            placeholder="글 제목, 태그, 작성자 검색"
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
                </Flex>
            </Flex>

            {/* Underline Category Tabs + Total Count */}
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
                    {boards.map((board) => {
                        const isActive = selectedCategory === board.id;
                        return (
                            <Box
                                key={board.id}
                                as="button"
                                onClick={() => onCategoryChange(board.id)}
                                position="relative"
                                fontSize="14px"
                                fontWeight={isActive ? '800' : '600'}
                                color={isActive ? 'var(--waba-ink)' : 'var(--waba-ink-3)'}
                                pb={{ base: '8px', sm: '12px' }}
                                mb={{ base: '-9px', sm: '-13px' }}
                                cursor="pointer"
                                flexShrink={0}
                                _hover={{ color: 'var(--waba-ink)' }}
                                transition="color 0.15s"
                            >
                                {board.name}
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
                    총 {totalCount.toLocaleString()}개의 글
                </Text>
            </Flex>

            {/* Pet Species Filter Chips */}
            {petTypeCount.length > 1 && (
                <HStack gap="8px" flexWrap="wrap" align="center">
                    <HStack gap="4px" mr="4px" color="var(--waba-ink-3)" fontSize="12px" fontWeight="700">
                        <LuSparkles size={13} color="#6338A9" />
                        <Text>반려동물</Text>
                    </HStack>
                    {petTypeCount.map((petType) => {
                        const isSelected = selectedPetTypeList.includes(petType.type);
                        return (
                            <Button
                                key={petType.type}
                                size="xs"
                                h="28px"
                                px="12px"
                                borderRadius="999px"
                                bg={isSelected ? '#6338A9' : 'var(--waba-surface)'}
                                color={isSelected ? '#FFFFFF' : 'var(--waba-ink-2)'}
                                border="1px solid"
                                borderColor={isSelected ? '#6338A9' : 'var(--waba-line)'}
                                fontSize="12px"
                                fontWeight="600"
                                onClick={() => onPetTypeChange(petType.type)}
                            >
                                {petType.type === '전체' ? '전체' : petSpeciesLabel(petType.type)} ({petType.count})
                            </Button>
                        );
                    })}
                </HStack>
            )}
        </VStack>
    );
}
