'use client'

import React from 'react';
import {
    Box,
    Button,
    Flex,
    HStack,
    Input,
    Text,
} from '@chakra-ui/react';
import { LuSearch } from 'react-icons/lu';
import { useRouter } from 'next/navigation';

export type MainCategoryTab = 'ALL' | 'SNAP' | 'QNA' | 'CARE_LOUNGE';

interface MainTopBarProps {
    activeCategory: MainCategoryTab;
    onCategoryChange: (cat: MainCategoryTab) => void;
    sortOrder: 'popular' | 'latest';
    onToggleSort: () => void;
    searchQuery: string;
    onSearchQueryChange: (val: string) => void;
}

const TABS: { key: MainCategoryTab; label: string }[] = [
    { key: 'ALL', label: '전체' },
    { key: 'SNAP', label: '인기 스냅' },
    { key: 'QNA', label: '건강 Q&A' },
    { key: 'CARE_LOUNGE', label: '케어 저니 · 치료기' },
];

export default function MainTopBar({
    activeCategory,
    onCategoryChange,
    sortOrder,
    onToggleSort,
    searchQuery,
    onSearchQueryChange,
}: MainTopBarProps) {
    const router = useRouter();

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const q = searchQuery.trim();
        if (q) {
            router.push(`/search?q=${encodeURIComponent(q)}`);
        } else {
            router.push('/search');
        }
    };

    return (
        <Flex
            direction={{ base: 'column', md: 'row' }}
            align={{ base: 'stretch', md: 'center' }}
            justify="space-between"
            borderBottom="1px solid"
            borderColor="var(--waba-line)"
            pb={{ base: 3, md: '12px' }}
            gap={{ base: 3, md: 4 }}
            minW={0}
        >
            {/* Underline Category Tabs */}
            <HStack
                gap={{ base: 4, md: '24px' }}
                overflowX="auto"
                whiteSpace="nowrap"
                pb={{ base: 1, md: 0 }}
                css={{ '&::-webkit-scrollbar': { display: 'none' } }}
            >
                {TABS.map((tab) => {
                    const isActive = activeCategory === tab.key;
                    return (
                        <Box
                            key={tab.key}
                            as="button"
                            onClick={() => onCategoryChange(tab.key)}
                            position="relative"
                            fontSize="14px"
                            fontWeight={isActive ? '800' : '600'}
                            color={isActive ? 'var(--waba-ink)' : 'var(--waba-ink-3)'}
                            pb={{ base: '8px', md: '12px' }}
                            mb={{ base: '-9px', md: '-13px' }}
                            cursor="pointer"
                            flexShrink={0}
                            _hover={{ color: 'var(--waba-ink)' }}
                            transition="color 0.15s"
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

            {/* Sort Pill & Search Input */}
            <HStack gap="10px" align="center" justify={{ base: 'space-between', md: 'flex-end' }} flexShrink={0}>
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
                    onClick={onToggleSort}
                    flexShrink={0}
                >
                    {sortOrder === 'popular' ? '인기순 ▾' : '최신순 ▾'}
                </Button>

                <Box
                    as="form"
                    onSubmit={handleSearchSubmit}
                    w={{ base: 'full', sm: '220px', md: '240px' }}
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
                        placeholder="사진, 질문, 케어 저니 검색"
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
            </HStack>
        </Flex>
    );
}
