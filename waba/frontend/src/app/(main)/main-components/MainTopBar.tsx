'use client'

import React from 'react';
import {
    Box,
    Flex,
    Input,
} from '@chakra-ui/react';
import { LuSearch } from 'react-icons/lu';
import { useRouter } from 'next/navigation';

interface MainTopBarProps {
    searchQuery: string;
    onSearchQueryChange: (val: string) => void;
}

export default function MainTopBar({
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
            align="center"
            justify={{ base: 'stretch', md: 'flex-end' }}
            minW={0}
        >
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
        </Flex>
    );
}
