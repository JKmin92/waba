'use client'

import React from 'react';
import {
    Box,
    Flex,
    HStack,
    IconButton,
    Text,
} from '@chakra-ui/react';
import { LuBookmark } from 'react-icons/lu';
import { useRouter } from 'next/navigation';
import UserAvatar from '../../common/UserAvatar';
import { getNotebookCategoryLabel, getNotebookStatusBadge, NotebookItem } from './types';

interface NotebookCardProps {
    item: NotebookItem;
    onToggleScrap: (notebookId: string | number, e: React.MouseEvent) => void;
}

export default function NotebookCard({ item, onToggleScrap }: NotebookCardProps) {
    const router = useRouter();
    const statusBadge = getNotebookStatusBadge(item.status, item.days_elapsed, item.weight_summary);

    const petLine = [
        item.pet?.name,
        item.pet?.breed || item.pet?.species,
        item.pet?.latest_weight_kg ? `${Number(item.pet.latest_weight_kg).toFixed(1)}kg` : null,
    ]
        .filter(Boolean)
        .join(' · ');

    return (
        <Box
            bg="var(--waba-card)"
            border="1px solid"
            borderColor="var(--waba-line)"
            borderRadius="20px"
            p="18px"
            display="flex"
            flexDirection="column"
            justifyContent="space-between"
            gap="14px"
            h="100%"
            cursor="pointer"
            onClick={() => router.push(`/notebook/${item.note_code || item.id}`)}
            _hover={{ transform: 'translateY(-3px)', borderColor: 'var(--waba-purple-border)' }}
            transition="all 0.2s ease"
            minW={0}
        >
            {/* Top: Pet Avatar + Category + Scrap Button */}
            <Flex justify="space-between" align="flex-start" gap={2} minW={0}>
                <HStack gap="10px" minW={0} flex="1">
                    <UserAvatar
                        src={item.pet?.current_avatar_url}
                        alt={item.pet?.name || '반려동물'}
                        w="46px"
                        h="46px"
                        iconSize={20}
                        fallbackType="pet"
                    />
                    <Box minW={0} flex="1">
                        <Box
                            display="inline-block"
                            bg="var(--waba-purple-soft)"
                            color="var(--waba-purple-text)"
                            fontSize="10px"
                            fontWeight="700"
                            px="8px"
                            py="2px"
                            borderRadius="999px"
                        >
                            {getNotebookCategoryLabel(item.category)}
                        </Box>
                        <Text fontSize="12px" color="var(--waba-ink-2)" mt="3px" truncate>
                            {petLine || '반려동물 케어 기록'}
                        </Text>
                    </Box>
                </HStack>

                <IconButton
                    aria-label="수첩 스크랩"
                    size="sm"
                    w="34px"
                    h="34px"
                    borderRadius="full"
                    border="1px solid"
                    borderColor={item.is_scrapped ? 'var(--waba-purple-border)' : 'var(--waba-line)'}
                    bg={item.is_scrapped ? 'var(--waba-purple-soft)' : 'var(--waba-card)'}
                    color={item.is_scrapped ? 'var(--waba-purple-text)' : 'var(--waba-ink-2)'}
                    onClick={(e) => onToggleScrap(item.id, e)}
                    flexShrink={0}
                >
                    <LuBookmark size={15} fill={item.is_scrapped ? 'currentColor' : 'none'} />
                </IconButton>
            </Flex>

            {/* Title */}
            <Text
                fontSize="16px"
                fontWeight="800"
                color="var(--waba-ink)"
                lineHeight="1.4"
                lineClamp={2}
            >
                {item.title}
            </Text>

            {/* Status & Record Count Badges */}
            <HStack gap="8px" fontSize="11px" fontWeight="700" flexWrap="wrap">
                <Box
                    bg={statusBadge.bg}
                    color={statusBadge.color}
                    px="10px"
                    py="4px"
                    borderRadius="999px"
                >
                    {statusBadge.label}
                </Box>
                <Box
                    bg="var(--waba-surface)"
                    color="var(--waba-ink-2)"
                    px="10px"
                    py="4px"
                    borderRadius="999px"
                >
                    기록 {item.record_count ?? 0}건
                </Box>
            </HStack>

            {/* Footer: Author + Scrap/Like Count */}
            <Flex
                justify="space-between"
                align="center"
                fontSize="12px"
                color="var(--waba-ink-3)"
                borderTop="1px solid"
                borderColor="var(--waba-line)"
                pt="10px"
                gap={2}
                minW={0}
            >
                <HStack gap={1.5} minW={0} flex="1">
                    <UserAvatar
                        src={item.user?.profile_image_url}
                        alt={item.user?.nickname || '작성자'}
                        size="2xs"
                    />
                    <Text truncate>
                        by <strong style={{ color: 'var(--waba-ink-2)' }}>{item.user?.nickname || '집사'}</strong>
                    </Text>
                </HStack>

                <Text flexShrink={0}>
                    스크랩 {item.scrap_count ?? 0} · ♥ {item.like_count ?? 0}
                </Text>
            </Flex>
        </Box>
    );
}
