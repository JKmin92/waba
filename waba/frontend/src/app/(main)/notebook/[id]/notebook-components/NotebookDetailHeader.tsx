'use client'

import React from 'react';
import {
    Box,
    Button,
    Flex,
    Grid,
    Heading,
    HStack,
    NativeSelect,
    Text,
    VStack,
} from '@chakra-ui/react';
import { LuBookmark, LuChevronRight, LuPlus, LuShare2 } from 'react-icons/lu';
import { useRouter } from 'next/navigation';
import UserAvatar from '../../../common/UserAvatar';
import {
    getNotebookCategoryLabel,
    getNotebookStatusBadge,
    NotebookItem,
    NotebookStatus,
} from '../../notebook-components/types';

interface NotebookDetailHeaderProps {
    notebook: NotebookItem;
    recordCount: number;
    isOwner: boolean;
    onOpenAddRecord: () => void;
    onToggleScrap: () => void;
    onShare: () => void;
    onStatusChange: (status: NotebookStatus) => void;
    isUpdatingStatus?: boolean;
}

export default function NotebookDetailHeader({
    notebook,
    recordCount,
    isOwner,
    onOpenAddRecord,
    onToggleScrap,
    onShare,
    onStatusChange,
    isUpdatingStatus = false,
}: NotebookDetailHeaderProps) {
    const router = useRouter();
    const statusBadge = getNotebookStatusBadge(
        notebook.status,
        notebook.days_elapsed,
        notebook.weight_summary
    );

    const petMeta = [
        notebook.pet?.name,
        notebook.pet?.breed || notebook.pet?.species,
        notebook.pet?.latest_weight_kg ? `${Number(notebook.pet.latest_weight_kg).toFixed(1)}kg` : null,
    ]
        .filter(Boolean)
        .join(' · ');

    return (
        <VStack align="stretch" gap="16px" minW={0}>
            {/* Breadcrumb */}
            <HStack gap={1.5} fontSize="12px" color="var(--waba-ink-3)" fontWeight="600" flexWrap="wrap">
                <Text
                    as="button"
                    cursor="pointer"
                    _hover={{ color: 'var(--waba-purple-text)' }}
                    onClick={() => router.push('/notebook')}
                >
                    건강 수첩
                </Text>
                <LuChevronRight size={13} />
                <Text color="var(--waba-purple-text)" fontWeight="700">
                    {getNotebookCategoryLabel(notebook.category)}
                </Text>
            </HStack>

            {/* Hero Summary Card */}
            <Box
                bg="linear-gradient(135deg, var(--waba-card) 0%, var(--waba-purple-soft) 100%)"
                border="1px solid"
                borderColor="var(--waba-purple-border)"
                borderRadius="24px"
                p={{ base: '18px', md: '24px 28px' }}
                display="flex"
                flexDirection="column"
                gap="18px"
                minW={0}
            >
                <Flex
                    direction={{ base: 'column', lg: 'row' }}
                    justify="space-between"
                    align={{ base: 'stretch', lg: 'flex-start' }}
                    gap={4}
                    minW={0}
                >
                    <HStack gap="14px" align="flex-start" minW={0} flex="1">
                        <UserAvatar
                            src={notebook.pet?.current_avatar_url}
                            alt={notebook.pet?.name || '반려동물'}
                            w={{ base: '48px', md: '58px' }}
                            h={{ base: '48px', md: '58px' }}
                            iconSize={24}
                            fallbackType="pet"
                            border="2px solid"
                            borderColor="var(--waba-card)"
                        />
                        <Box minW={0} flex="1">
                            <HStack gap="8px" flexWrap="wrap" align="center">
                                <Box
                                    bg="var(--waba-purple-soft)"
                                    color="var(--waba-purple-text)"
                                    fontSize="11px"
                                    fontWeight="700"
                                    px="10px"
                                    py="3px"
                                    borderRadius="999px"
                                >
                                    {getNotebookCategoryLabel(notebook.category)}
                                </Box>
                                <Box
                                    bg={statusBadge.bg}
                                    color={statusBadge.color}
                                    fontSize="11px"
                                    fontWeight="700"
                                    px="10px"
                                    py="3px"
                                    borderRadius="999px"
                                >
                                    {statusBadge.label}
                                </Box>
                                <Text fontSize="12px" color="var(--waba-ink-2)">
                                    {petMeta ? `${petMeta} · ` : ''}by <strong>{notebook.user?.nickname || '집사'}</strong>
                                </Text>
                            </HStack>

                            <Heading
                                as="h1"
                                fontSize={{ base: '19px', md: '22px' }}
                                fontWeight="800"
                                color="var(--waba-ink)"
                                mt="6px"
                                lineHeight="1.35"
                            >
                                {notebook.title}
                            </Heading>
                        </Box>
                    </HStack>

                    {/* Action Buttons */}
                    <HStack gap="8px" flexWrap="wrap" flexShrink={0}>
                        {isOwner && (
                            <>
                                <Button
                                    size="xs"
                                    h="34px"
                                    px="14px"
                                    borderRadius="999px"
                                    bg="#6338A9"
                                    color="#FFFFFF"
                                    fontSize="12px"
                                    fontWeight="700"
                                    _hover={{ bg: '#522B8F' }}
                                    onClick={onOpenAddRecord}
                                    gap={1}
                                >
                                    <LuPlus size={14} />
                                    기록 직접 추가
                                </Button>

                                <NativeSelect.Root size="xs" w="118px" disabled={isUpdatingStatus}>
                                    <NativeSelect.Field
                                        value={notebook.status}
                                        onChange={(e: any) => onStatusChange(e.target.value as NotebookStatus)}
                                        h="34px"
                                        borderRadius="999px"
                                        bg="var(--waba-card)"
                                        borderColor="var(--waba-line)"
                                        color="var(--waba-ink)"
                                        fontSize="12px"
                                        fontWeight="600"
                                    >
                                        <option value="ACTIVE">진행 중</option>
                                        <option value="CURED">완치 완료</option>
                                        <option value="COMPLETED">목표 달성</option>
                                    </NativeSelect.Field>
                                    <NativeSelect.Indicator />
                                </NativeSelect.Root>
                            </>
                        )}

                        <Button
                            size="xs"
                            h="34px"
                            px="13px"
                            borderRadius="999px"
                            border="1px solid"
                            borderColor={notebook.is_scrapped ? 'var(--waba-purple-border)' : 'var(--waba-line)'}
                            bg={notebook.is_scrapped ? 'var(--waba-purple-soft)' : 'var(--waba-card)'}
                            color={notebook.is_scrapped ? 'var(--waba-purple-text)' : 'var(--waba-ink-2)'}
                            fontSize="12px"
                            fontWeight="600"
                            onClick={onToggleScrap}
                            gap={1.5}
                        >
                            <LuBookmark size={14} fill={notebook.is_scrapped ? 'currentColor' : 'none'} />
                            스크랩 ({notebook.scrap_count ?? 0})
                        </Button>

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
                            onClick={onShare}
                            gap={1.5}
                        >
                            <LuShare2 size={14} />
                            공유
                        </Button>
                    </HStack>
                </Flex>

                {/* 3-Column Summary Metrics */}
                <Grid templateColumns={{ base: '1fr', sm: 'repeat(3, 1fr)' }} gap="12px">
                    <Box bg="var(--waba-card)" border="1px solid" borderColor="var(--waba-line)" borderRadius="14px" p="12px 14px">
                        <Text fontSize="11px" color="var(--waba-ink-3)">진행 기간</Text>
                        <Text fontSize="16px" fontWeight="800" color="var(--waba-ink)" mt="2px">
                            {notebook.days_elapsed ? `D+${notebook.days_elapsed}` : '진행 중'}
                        </Text>
                    </Box>
                    <Box bg="var(--waba-card)" border="1px solid" borderColor="var(--waba-line)" borderRadius="14px" p="12px 14px">
                        <Text fontSize="11px" color="var(--waba-ink-3)">누적 기록</Text>
                        <Text fontSize="16px" fontWeight="800" color="var(--waba-ink)" mt="2px">
                            총 {recordCount}건
                        </Text>
                    </Box>
                    <Box bg="var(--waba-card)" border="1px solid" borderColor="var(--waba-line)" borderRadius="14px" p="12px 14px">
                        <Text fontSize="11px" color="var(--waba-ink-3)">체중 · 목표 요약</Text>
                        <Text fontSize="16px" fontWeight="800" color="var(--waba-purple-text)" mt="2px" truncate>
                            {notebook.weight_summary ||
                                (notebook.pet?.latest_weight_kg ? `${Number(notebook.pet.latest_weight_kg).toFixed(1)}kg 유지` : statusBadge.shortLabel)}
                        </Text>
                    </Box>
                </Grid>
            </Box>
        </VStack>
    );
}
