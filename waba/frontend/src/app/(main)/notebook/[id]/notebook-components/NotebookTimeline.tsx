'use client'

import React from 'react';
import {
    Box,
    Flex,
    Grid,
    Heading,
    HStack,
    IconButton,
    Menu,
    Portal,
    Text,
    VStack,
} from '@chakra-ui/react';
import { LuEllipsis, LuExternalLink, LuPencil, LuTrash2 } from 'react-icons/lu';
import { useRouter } from 'next/navigation';
import { NotebookHistoryItem } from '../../notebook-components/types';

interface NotebookTimelineProps {
    histories: NotebookHistoryItem[];
    summaryFlow?: string | null;
    status?: string;
    completedAt?: string | null;
    isOwner?: boolean;
    onEditRecord?: (item: NotebookHistoryItem) => void;
    onDeleteRecord?: (historyId: string | number) => void;
}

export default function NotebookTimeline({
    histories,
    summaryFlow,
    status,
    completedAt,
    isOwner = false,
    onEditRecord,
    onDeleteRecord,
}: NotebookTimelineProps) {
    const router = useRouter();

    const sortedHistories = [...histories].sort((a, b) => {
        const timeA = new Date(a.event_date || a.date || a.record_date || a.created_at || 0).getTime();
        const timeB = new Date(b.event_date || b.date || b.record_date || b.created_at || 0).getTime();
        return timeB - timeA;
    });

    const isMilestoneStatus = status === 'CURED' || status === 'COMPLETED';
    const milestoneTime = isMilestoneStatus && completedAt ? new Date(completedAt).getTime() : null;
    const formatMilestoneDate = (dateStr?: string | null) => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        if (Number.isNaN(d.getTime())) return '';
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}. ${m}. ${day}`;
    };
    const milestoneLabel = status === 'CURED' ? '완치' : '목표 달성';
    const milestoneText = [formatMilestoneDate(completedAt), milestoneLabel].filter(Boolean).join(' ');

    const milestoneInsertIndex = (() => {
        if (!isMilestoneStatus) return -1;
        if (milestoneTime === null || Number.isNaN(milestoneTime)) return 0;
        const idx = sortedHistories.findIndex((item) => {
            const t = new Date(item.event_date || item.date || item.record_date || item.created_at || 0).getTime();
            return t <= milestoneTime;
        });
        return idx === -1 ? sortedHistories.length : idx;
    })();

    const renderMilestoneDivider = () => (
        <HStack key="status-milestone" gap={3} align="center" py={1}>
            <Box flex="1" h="1px" bg="var(--waba-line)" />
            <Box
                px="12px"
                py="4px"
                borderRadius="999px"
                bg="var(--waba-purple-soft)"
                border="1px solid"
                borderColor="var(--waba-purple-border)"
                color="var(--waba-purple-text)"
                fontSize="11px"
                fontWeight="800"
                whiteSpace="nowrap"
            >
                {milestoneText}
            </Box>
            <Box flex="1" h="1px" bg="var(--waba-line)" />
        </HStack>
    );

    return (
        <Box
            as="section"
            bg="var(--waba-card)"
            border="1px solid"
            borderColor="var(--waba-line)"
            borderRadius="20px"
            p={{ base: '16px', md: '22px 24px' }}
            display="flex"
            flexDirection="column"
            gap="14px"
            minW={0}
        >
            <Flex justify="space-between" align="center" gap={2} flexWrap="wrap">
                <Heading as="h2" fontSize="16px" fontWeight="800" color="var(--waba-ink)">
                    누적 케어 타임라인
                </Heading>
                {summaryFlow && (
                    <Box
                        bg="var(--waba-purple-soft)"
                        color="var(--waba-purple-text)"
                        fontSize="11px"
                        fontWeight="700"
                        px="10px"
                        py="4px"
                        borderRadius="999px"
                    >
                        {summaryFlow}
                    </Box>
                )}
            </Flex>

            {sortedHistories.length === 0 ? (
                <>
                    {isMilestoneStatus && renderMilestoneDivider()}
                    <Box
                        bg="var(--waba-surface)"
                    border="1px dashed"
                    borderColor="var(--waba-line)"
                    borderRadius="16px"
                    py={10}
                    textAlign="center"
                >
                    <Text fontSize="13px" color="var(--waba-ink-3)">
                        아직 등록된 케어 타임라인 기록이 없습니다.
                    </Text>
                </Box>
                </>
            ) : (
                <VStack align="stretch" gap="12px" minW={0}>
                    {sortedHistories.map((item, idx) => {
                        const isAI = Boolean(item.is_ai_generated);
                        const linkedPostId = item.post_id || item.posts?.[0]?.id;
                        const hasPost = Boolean(linkedPostId);
                        const rawDate = item.event_date || item.date || item.record_date;
                        const formattedDate = rawDate
                            ? new Date(rawDate).toLocaleDateString('ko-KR')
                            : '';

                        return (
                            <React.Fragment key={item.id}>
                                {milestoneInsertIndex === idx && renderMilestoneDivider()}
                                <Grid
                                    templateColumns={{ base: '1fr', md: '96px 1fr auto' }}
                                gap={{ base: '8px', md: '16px' }}
                                alignItems={{ base: 'flex-start', md: 'center' }}
                                px={{ base: '14px', md: '18px' }}
                                py={{ base: '14px', md: '15px' }}
                                borderRadius="16px"
                                bg={isAI ? 'var(--waba-purple-soft)' : 'var(--waba-surface)'}
                                border="1px solid"
                                borderColor={isAI ? 'var(--waba-purple-border)' : 'var(--waba-line)'}
                                minW={0}
                            >
                                {/* Date & Day */}
                                <Box
                                    fontSize="12px"
                                    fontWeight={isAI ? '800' : '700'}
                                    color={isAI ? 'var(--waba-purple-text)' : 'var(--waba-ink-3)'}
                                >
                                    <Text>{formattedDate}</Text>
                                    {item.day_number !== null && item.day_number !== undefined && (
                                        <Text>DAY {item.day_number}</Text>
                                    )}
                                </Box>

                                {/* Content */}
                                <Box minW={0}>
                                    <HStack gap="8px" align="center" flexWrap="wrap">
                                        {isAI ? (
                                            <Box
                                                bg="var(--waba-purple-soft)"
                                                border="1px solid"
                                                borderColor="var(--waba-purple-border)"
                                                color="var(--waba-purple-text)"
                                                fontSize="11px"
                                                fontWeight="700"
                                                px="10px"
                                                py="3px"
                                                borderRadius="999px"
                                            >
                                                ✨ AI 자동 생성
                                            </Box>
                                        ) : (
                                            <Box
                                                bg="var(--waba-card)"
                                                border="1px solid"
                                                borderColor="var(--waba-line)"
                                                color="var(--waba-ink-2)"
                                                fontSize="11px"
                                                fontWeight="700"
                                                px="10px"
                                                py="3px"
                                                borderRadius="999px"
                                            >
                                                직접 기록
                                            </Box>
                                        )}

                                        {item.outcome_tag && (
                                            <Box
                                                bg="rgba(239, 68, 68, 0.12)"
                                                color="#DC2626"
                                                fontSize="11px"
                                                fontWeight="700"
                                                px="10px"
                                                py="3px"
                                                borderRadius="999px"
                                            >
                                                {item.outcome_tag}
                                            </Box>
                                        )}

                                        <Text fontSize="14px" fontWeight="700" color="var(--waba-ink)">
                                            {item.title}
                                        </Text>
                                    </HStack>

                                    {(item.description || item.weight_kg) && (
                                        <Text fontSize="12px" color="var(--waba-ink-2)" mt="4px" lineHeight="1.5">
                                            {item.description}
                                            {item.weight_kg ? ` · 체중 ${Number(item.weight_kg).toFixed(1)}kg` : ''}
                                        </Text>
                                    )}
                                </Box>

                                {/* Right Menu */}
                                <HStack gap={2} justify={{ base: 'flex-start', md: 'flex-end' }}>
                                    {isOwner && (onEditRecord || onDeleteRecord) ? (
                                        <Menu.Root positioning={{ placement: 'bottom-end' }}>
                                            <Menu.Trigger asChild>
                                                <IconButton
                                                    aria-label="기록 메뉴"
                                                    size="2xs"
                                                    variant="ghost"
                                                    rounded="full"
                                                    color="var(--waba-ink-3)"
                                                    _hover={{ color: 'var(--waba-ink)', bg: 'var(--waba-card)' }}
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <LuEllipsis size={14} />
                                                </IconButton>
                                            </Menu.Trigger>
                                            <Portal>
                                                <Menu.Positioner>
                                                    <Menu.Content
                                                        minW="130px"
                                                        borderRadius="14px"
                                                        p={1.5}
                                                        bg="var(--waba-card)"
                                                        border="1px solid"
                                                        borderColor="var(--waba-line)"
                                                        boxShadow="0 10px 28px rgba(0,0,0,0.12)"
                                                    >
                                                        {hasPost && (
                                                            <Menu.Item
                                                                value="view-post"
                                                                cursor="pointer"
                                                                borderRadius="10px"
                                                                py={1.5}
                                                                px={2.5}
                                                                color="var(--waba-purple-text)"
                                                                _hover={{ bg: 'var(--waba-surface)' }}
                                                                _highlighted={{ bg: 'var(--waba-surface)' }}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    router.push(`/post/${linkedPostId}`);
                                                                }}
                                                            >
                                                                <LuExternalLink size={13} />
                                                                <Text fontSize="12px" fontWeight="600">게시글 보기</Text>
                                                            </Menu.Item>
                                                        )}
                                                        {isOwner && onEditRecord && (
                                                            <Menu.Item
                                                                value="edit"
                                                                cursor="pointer"
                                                                borderRadius="10px"
                                                                py={1.5}
                                                                px={2.5}
                                                                color="var(--waba-ink)"
                                                                _hover={{ bg: 'var(--waba-surface)' }}
                                                                _highlighted={{ bg: 'var(--waba-surface)' }}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    onEditRecord(item);
                                                                }}
                                                            >
                                                                <LuPencil size={13} />
                                                                <Text fontSize="12px" fontWeight="600">수정하기</Text>
                                                            </Menu.Item>
                                                        )}
                                                        {isOwner && onDeleteRecord && (
                                                            <Menu.Item
                                                                value="delete"
                                                                cursor="pointer"
                                                                borderRadius="10px"
                                                                py={1.5}
                                                                px={2.5}
                                                                color="red.500"
                                                                _hover={{ bg: 'rgba(239, 68, 68, 0.12)' }} _highlighted={{ bg: 'rgba(239, 68, 68, 0.12)' }}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    onDeleteRecord(item.id);
                                                                }}
                                                            >
                                                                <LuTrash2 size={13} />
                                                                <Text fontSize="12px" fontWeight="600">삭제하기</Text>
                                                            </Menu.Item>
                                                        )}
                                                    </Menu.Content>
                                                </Menu.Positioner>
                                            </Portal>
                                        </Menu.Root>
                                    ) : hasPost ? (
                                        <Box
                                            as="button"
                                            display="inline-flex"
                                            alignItems="center"
                                            gap={1.5}
                                            px="12px"
                                            py="6px"
                                            borderRadius="999px"
                                            bg="var(--waba-card)"
                                            border="1px solid"
                                            borderColor="var(--waba-purple-border)"
                                            color="var(--waba-purple-text)"
                                            fontSize="11px"
                                            fontWeight="700"
                                            cursor="pointer"
                                            whiteSpace="nowrap"
                                            _hover={{ bg: '#6338A9', color: 'white' }}
                                            transition="all 0.15s"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                router.push(`/post/${linkedPostId}`);
                                            }}
                                        >
                                            <LuExternalLink size={12} />
                                            게시글 보기
                                        </Box>
                                    ) : null}
                                </HStack>
                            </Grid>
                            </React.Fragment>
                        );
                    })}
                    {milestoneInsertIndex === sortedHistories.length && renderMilestoneDivider()}
                </VStack>
            )}
        </Box>
    );
}
