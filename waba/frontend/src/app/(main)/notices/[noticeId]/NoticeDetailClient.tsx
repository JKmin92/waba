'use client'

import React, { useEffect, useState } from 'react';
import {
    Box,
    Button,
    Flex,
    Grid,
    Heading,
    HStack,
    Image,
    Spinner,
    Text,
    VStack,
} from '@chakra-ui/react';
import { LuArrowLeft, LuCalendar, LuLink, LuPin } from 'react-icons/lu';
import { useRouter } from 'next/navigation';
import axiosInstance from '@/utils/api';
import { toaster } from '@/components/ui/toaster';
import {
    formatDateShort,
    formatPeriodRange,
    parseNoticeContentBlocks,
    resolveMediaUrl,
} from '@/app/admin/notices/types';

const EVENT_STATUS_BADGE: Record<string, { label: string; bg: string; color: string }> = {
    ONGOING: { label: '진행 중', bg: 'rgba(16, 185, 129, 0.14)', color: '#10B981' },
    ALWAYS: { label: '상시 진행', bg: 'var(--waba-purple-soft)', color: 'var(--waba-purple-text)' },
    UPCOMING: { label: '예정', bg: 'rgba(245, 158, 11, 0.14)', color: '#D97706' },
    ENDED: { label: '종료', bg: 'rgba(148, 163, 184, 0.18)', color: 'var(--waba-ink-3)' },
};

export default function NoticeDetailClient({ noticeId }: { noticeId: string }) {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);
    const [notice, setNotice] = useState<any>(null);
    const [prevNotice, setPrevNotice] = useState<any>(null);
    const [nextNotice, setNextNotice] = useState<any>(null);

    useEffect(() => {
        setLoading(true);
        setNotFound(false);
        axiosInstance
            .get(`/public/notices/${noticeId}`)
            .then((res) => {
                if (!res.data?.notice) {
                    setNotFound(true);
                    return;
                }
                setNotice(res.data.notice);
                setPrevNotice(res.data.prevNotice || null);
                setNextNotice(res.data.nextNotice || null);
            })
            .catch(() => {
                setNotFound(true);
            })
            .finally(() => setLoading(false));
    }, [noticeId]);

    const handleCopyLink = async () => {
        try {
            await navigator.clipboard.writeText(window.location.href);
            toaster.create({ title: '링크가 클립보드에 복사되었습니다.', type: 'success' });
        } catch {
            toaster.create({ title: '링크 복사에 실패했습니다.', type: 'error' });
        }
    };

    if (loading) {
        return (
            <Flex py={24} justify="center">
                <Spinner size="lg" color="#6338A9" />
            </Flex>
        );
    }

    if (notFound || !notice) {
        return (
            <Box maxW="760px" mx="auto" px={4} py={20} textAlign="center">
                <Text fontSize="16px" fontWeight="800" color="var(--waba-ink)" mb={2}>
                    공지사항을 찾을 수 없습니다.
                </Text>
                <Text fontSize="13px" color="var(--waba-ink-3)" mb={5}>
                    삭제되었거나 노출 기간이 종료된 게시물일 수 있습니다.
                </Text>
                <Button
                    size="sm"
                    bg="#6338A9"
                    color="#FFFFFF"
                    borderRadius="999px"
                    px={5}
                    onClick={() => router.push('/notices')}
                >
                    목록으로 돌아가기
                </Button>
            </Box>
        );
    }

    const blocks = parseNoticeContentBlocks(notice.content);
    const evBadge = notice.type === 'EVENT' && notice.event_status ? EVENT_STATUS_BADGE[notice.event_status] : null;
    const endAtTime = notice.event_end_at ? new Date(notice.event_end_at).getTime() : null;
    const dDay =
        notice.type === 'EVENT' &&
        notice.event_status === 'ONGOING' &&
        endAtTime &&
        endAtTime > Date.now()
            ? Math.ceil((endAtTime - Date.now()) / (1000 * 60 * 60 * 24))
            : null;

    return (
        <Box maxW="860px" mx="auto" px={{ base: 4, md: 6 }} py={{ base: 5, md: 8 }}>
            <Button
                size="xs"
                variant="ghost"
                color="var(--waba-ink-2)"
                px={0}
                mb={4}
                gap={1}
                onClick={() => router.push('/notices')}
            >
                <LuArrowLeft size={14} />
                공지 · 이벤트 목록으로
            </Button>

            {/* Article Card */}
            <Box
                p={{ base: 5, md: 8 }}
                borderRadius="24px"
                bg="var(--waba-card)"
                border="1px solid"
                borderColor="var(--waba-line)"
                mb={6}
            >
                {/* Article Header */}
                <Box pb={5} mb={6} borderBottom="1px solid" borderColor="var(--waba-line)">
                    <HStack gap={1.5} mb={3} flexWrap="wrap">
                        {Boolean(notice.is_pinned) && (
                            <HStack gap={1} bg="#6338A9" color="#FFFFFF" fontSize="10.5px" fontWeight="800" px={2.5} py={0.5} borderRadius="999px">
                                <LuPin size={11} />
                                <Text>상단 고정</Text>
                            </HStack>
                        )}
                        <Box
                            bg={notice.type === 'EVENT' ? 'var(--waba-purple-soft)' : 'var(--waba-surface)'}
                            color={notice.type === 'EVENT' ? 'var(--waba-purple-text)' : 'var(--waba-ink-2)'}
                            border="1px solid"
                            borderColor={notice.type === 'EVENT' ? 'var(--waba-purple-border)' : 'var(--waba-line)'}
                            fontSize="11px"
                            fontWeight="800"
                            px={2.5}
                            py={0.5}
                            borderRadius="999px"
                        >
                            {notice.type === 'EVENT' ? '이벤트' : '공지'}
                        </Box>
                        {evBadge && (
                            <Box bg={evBadge.bg} color={evBadge.color} fontSize="11px" fontWeight="800" px={2.5} py={0.5} borderRadius="999px">
                                {evBadge.label}
                            </Box>
                        )}
                        {dDay !== null && (
                            <Box bg="rgba(239, 68, 68, 0.14)" color="#EF4444" fontSize="11px" fontWeight="800" px={2.5} py={0.5} borderRadius="999px">
                                D-{dDay}
                            </Box>
                        )}
                    </HStack>

                    <Heading size="xl" fontWeight="900" color="var(--waba-ink)" lineHeight="1.35" mb={3}>
                        {notice.title}
                    </Heading>

                    <Flex justify="space-between" align="center" gap={3} flexWrap="wrap">
                        <Text fontSize="12.5px" color="var(--waba-ink-3)">
                            WABA 운영팀 · {formatDateShort(notice.created_at)} · 조회 {notice.view_count ?? 0}
                        </Text>
                        <Button
                            size="xs"
                            variant="outline"
                            borderColor="var(--waba-line)"
                            color="var(--waba-ink-2)"
                            borderRadius="999px"
                            px={3}
                            gap={1}
                            onClick={handleCopyLink}
                        >
                            <LuLink size={12} />
                            링크 복사
                        </Button>
                    </Flex>
                </Box>

                {/* Event Period Banner */}
                {notice.type === 'EVENT' && (
                    <HStack
                        p={3.5}
                        mb={6}
                        borderRadius="14px"
                        bg="var(--waba-purple-soft)"
                        border="1px solid"
                        borderColor="var(--waba-purple-border)"
                        gap={2}
                    >
                        <LuCalendar size={15} color="#6338A9" />
                        <Text fontSize="12.5px" fontWeight="700" color="var(--waba-purple-text)">
                            이벤트 기간: {formatPeriodRange(notice.event_start_at, notice.event_end_at)}
                        </Text>
                    </HStack>
                )}

                {/* Content Blocks */}
                <VStack align="stretch" gap={5}>
                    {blocks.map((block, idx) => {
                        if (block.type === 'text') {
                            if (!block.content.trim()) return null;
                            return (
                                <Text
                                    key={idx}
                                    fontSize={{ base: '14.5px', md: '15.5px' }}
                                    lineHeight="1.85"
                                    color="var(--waba-ink)"
                                    whiteSpace="pre-wrap"
                                >
                                    {block.content}
                                </Text>
                            );
                        }
                        if (!block.image_url) return null;
                        return (
                            <Box key={idx}>
                                <Box borderRadius="16px" overflow="hidden" border="1px solid" borderColor="var(--waba-line)" bg="var(--waba-surface)">
                                    <Image
                                        src={resolveMediaUrl(block.image_url)}
                                        alt={block.caption || '공지 이미지'}
                                        w="100%"
                                        h="auto"
                                        display="block"
                                    />
                                </Box>
                                {block.caption && (
                                    <Text fontSize="12.5px" color="var(--waba-ink-3)" mt={1.5} px={1}>
                                        {block.caption}
                                    </Text>
                                )}
                            </Box>
                        );
                    })}
                </VStack>
            </Box>

            {/* Prev / Next Navigation */}
            <Grid templateColumns={{ base: '1fr', sm: '1fr 1fr' }} gap={3} mb={6}>
                <Box
                    p={4}
                    borderRadius="16px"
                    bg="var(--waba-card)"
                    border="1px solid"
                    borderColor="var(--waba-line)"
                    cursor={prevNotice ? 'pointer' : 'default'}
                    opacity={prevNotice ? 1 : 0.5}
                    _hover={prevNotice ? { borderColor: 'var(--waba-purple-border)' } : undefined}
                    onClick={() => prevNotice && router.push(`/notices/${prevNotice.id}`)}
                >
                    <Text fontSize="11px" fontWeight="700" color="var(--waba-ink-3)" mb={1}>
                        이전 글
                    </Text>
                    <Text fontSize="13.5px" fontWeight="700" color="var(--waba-ink)" truncate>
                        {prevNotice ? prevNotice.title : '이전 글이 없습니다.'}
                    </Text>
                </Box>

                <Box
                    p={4}
                    borderRadius="16px"
                    bg="var(--waba-card)"
                    border="1px solid"
                    borderColor="var(--waba-line)"
                    cursor={nextNotice ? 'pointer' : 'default'}
                    opacity={nextNotice ? 1 : 0.5}
                    _hover={nextNotice ? { borderColor: 'var(--waba-purple-border)' } : undefined}
                    onClick={() => nextNotice && router.push(`/notices/${nextNotice.id}`)}
                >
                    <Text fontSize="11px" fontWeight="700" color="var(--waba-ink-3)" mb={1}>
                        다음 글
                    </Text>
                    <Text fontSize="13.5px" fontWeight="700" color="var(--waba-ink)" truncate>
                        {nextNotice ? nextNotice.title : '다음 글이 없습니다.'}
                    </Text>
                </Box>
            </Grid>

            <Flex justify="center">
                <Button
                    size="sm"
                    variant="outline"
                    borderColor="var(--waba-line)"
                    color="var(--waba-ink)"
                    borderRadius="999px"
                    px={6}
                    onClick={() => router.push('/notices')}
                >
                    목록으로 돌아가기
                </Button>
            </Flex>
        </Box>
    );
}
