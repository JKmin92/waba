'use client'

import React, { useCallback, useEffect, useState } from 'react';
import {
    Box,
    Button,
    CloseButton,
    Dialog,
    Flex,
    HStack,
    Portal,
    Spinner,
    Text,
    Textarea,
    VStack,
} from '@chakra-ui/react';
import { LuExternalLink, LuFolderOpen } from 'react-icons/lu';
import axiosInstance from '@/utils/api';
import { toaster } from '@/components/ui/toaster';
import UserAvatar from '../../(main)/common/UserAvatar';
import { getRoleBadgeProps } from '../posts/PostAdminDetailDialog';

const CATEGORY_LABELS: Record<string, string> = {
    CHECKUP: '진료/검사',
    SURGERY: '수술/시술',
    VACCINE: '접종',
    WEIGHT: '체중',
    EVENT: '일상/이벤트',
    OTHER: '기타',
};

const SPECIES_LABELS: Record<string, string> = {
    DOG: '강아지',
    CAT: '고양이',
    RABBIT: '토끼',
    HAMSTER: '햄스터',
    GUINEAPIG: '기니피그',
    CHINCHILA: '친칠라',
};

export function getSpeciesLabel(species?: string | null, customSpecies?: string | null): string {
    const upper = String(species || '').toUpperCase();
    if (SPECIES_LABELS[upper]) return SPECIES_LABELS[upper];
    if (upper === 'OTHER') return customSpecies?.trim() || '기타';
    return customSpecies?.trim() || species || '';
}

interface HistoryDetailDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    historyId: string | null;
    onUpdated?: () => void;
    onOpenGroup?: (journeyId: string) => void;
}

export default function HistoryDetailDialog({
    open,
    onOpenChange,
    historyId,
    onUpdated,
    onOpenGroup,
}: HistoryDetailDialogProps) {
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [history, setHistory] = useState<any>(null);

    const [privateFormOpen, setPrivateFormOpen] = useState(false);
    const [privateReason, setPrivateReason] = useState('');

    const fetchDetail = useCallback(async (targetId: string) => {
        setLoading(true);
        try {
            const res = await axiosInstance.get(`/admin/histories/${targetId}`);
            setHistory(res.data?.history || res.data || null);
        } catch {
            toaster.create({ title: '건강 기록 상세 정보를 불러오지 못했습니다.', type: 'error' });
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (open && historyId) {
            setPrivateFormOpen(false);
            setPrivateReason('');
            fetchDetail(historyId);
        } else if (!open) {
            setHistory(null);
        }
    }, [open, historyId, fetchDetail]);

    const formatDateStr = (d?: string | null) => {
        if (!d) return '-';
        const parsed = new Date(d);
        if (Number.isNaN(parsed.getTime())) return '-';
        return parsed.toLocaleString('ko-KR');
    };

    const handleVisibilityChange = async (isPrivate: boolean) => {
        if (!history?.id) return;
        if (isPrivate && !privateReason.trim()) {
            toaster.create({ title: '비공개 전환 사유를 입력해주세요.', type: 'warning' });
            return;
        }
        setSubmitting(true);
        try {
            await axiosInstance.patch(`/admin/histories/${history.id}/visibility`, {
                is_private: isPrivate,
                ...(isPrivate ? { reason: privateReason.trim() } : {}),
            });
            toaster.create({
                title: isPrivate ? '건강 기록이 비공개로 전환되었습니다.' : '건강 기록이 공개로 복구되었습니다.',
                type: 'success',
            });
            setPrivateFormOpen(false);
            setPrivateReason('');
            await fetchDetail(String(history.id));
            onUpdated?.();
        } catch (err: any) {
            toaster.create({ title: err?.response?.data?.message || '공개 상태 변경에 실패했습니다.', type: 'error' });
        } finally {
            setSubmitting(false);
        }
    };

    const roleBadge = getRoleBadgeProps(history?.author?.role || history?.author_role);
    const isAi = history?.source_type === 'AI' || history?.is_ai_generated;
    const pets: any[] = Array.isArray(history?.pets) ? history.pets : [];
    const linkedPosts: any[] = Array.isArray(history?.posts) ? history.posts : [];

    return (
        <Dialog.Root open={open} onOpenChange={(e) => onOpenChange(e.open)} size="lg" placement="center">
            <Portal>
                <Dialog.Backdrop bg="blackAlpha.600" backdropFilter="blur(4px)" zIndex={1400} />
                <Dialog.Positioner zIndex={1401} p={4}>
                    <Dialog.Content
                        bg="var(--waba-card)"
                        borderRadius="24px"
                        border="1px solid"
                        borderColor="var(--waba-line)"
                        p={{ base: 5, md: 6 }}
                        maxW="760px"
                        w="100%"
                        maxH="90vh"
                        display="flex"
                        flexDirection="column"
                        overflow="hidden"
                    >
                        {/* Header */}
                        <Dialog.Header p={0} pb={4} borderBottom="1px solid" borderColor="var(--waba-line)" flexShrink={0}>
                            <Flex justify="space-between" align="flex-start" gap={4} w="100%">
                                {history ? (
                                    <Box flex={1} minW={0}>
                                        <HStack gap={2} mb={2} flexWrap="wrap">
                                            <Box
                                                bg={isAi ? 'var(--waba-purple-soft)' : 'var(--waba-surface)'}
                                                color={isAi ? 'var(--waba-purple-text)' : 'var(--waba-ink-2)'}
                                                border="1px solid"
                                                borderColor={isAi ? 'var(--waba-purple-border)' : 'var(--waba-line)'}
                                                fontSize="11px"
                                                fontWeight="800"
                                                px={2.5}
                                                py={0.5}
                                                borderRadius="999px"
                                            >
                                                {isAi ? 'AI 자동' : '직접 작성'}
                                            </Box>
                                            <Box
                                                bg="var(--waba-surface)"
                                                color="var(--waba-ink-2)"
                                                border="1px solid"
                                                borderColor="var(--waba-line)"
                                                fontSize="11px"
                                                fontWeight="700"
                                                px={2.5}
                                                py={0.5}
                                                borderRadius="999px"
                                            >
                                                {CATEGORY_LABELS[history.category] || history.category || '기타'}
                                            </Box>
                                            <Box
                                                bg={history.is_private ? 'rgba(239, 68, 68, 0.14)' : 'rgba(16, 185, 129, 0.14)'}
                                                color={history.is_private ? '#EF4444' : '#10B981'}
                                                fontSize="11px"
                                                fontWeight="800"
                                                px={2.5}
                                                py={0.5}
                                                borderRadius="999px"
                                            >
                                                {history.is_private ? '비공개' : '공개 중'}
                                            </Box>
                                        </HStack>

                                        <Dialog.Title fontSize="17px" fontWeight="800" color="var(--waba-ink)">
                                            {history.title || `(기록 #${history.id})`}
                                        </Dialog.Title>

                                        <HStack gap={1.5} mt={1.5} flexWrap="wrap" align="center">
                                            <Text fontSize="12px" color="var(--waba-ink-3)">
                                                작성자: {history.author?.nickname || history.author_nickname || '-'}
                                            </Text>
                                            <Box
                                                bg={roleBadge.bg}
                                                color={roleBadge.color}
                                                border="1px solid"
                                                borderColor={roleBadge.borderColor}
                                                fontSize="10px"
                                                fontWeight="800"
                                                px={2}
                                                py="1px"
                                                borderRadius="999px"
                                            >
                                                {roleBadge.label}
                                            </Box>
                                            <Text fontSize="12px" color="var(--waba-ink-3)">
                                                ({history.author?.email || history.author_email || '-'}) · 기록일 {history.event_date || '-'}
                                            </Text>
                                        </HStack>
                                    </Box>
                                ) : (
                                    <Dialog.Title fontSize="17px" fontWeight="800" color="var(--waba-ink)">
                                        건강 기록 상세
                                    </Dialog.Title>
                                )}
                                <CloseButton
                                    size="sm"
                                    rounded="full"
                                    color="var(--waba-ink)"
                                    flexShrink={0}
                                    _hover={{ bg: 'var(--waba-surface)' }}
                                    onClick={() => onOpenChange(false)}
                                />
                            </Flex>
                        </Dialog.Header>

                        {/* Body */}
                        <Dialog.Body p={0} pt={4} overflowY="auto" flex={1}>
                            {loading ? (
                                <Flex py={16} justify="center">
                                    <Spinner size="lg" color="#6338A9" />
                                </Flex>
                            ) : history ? (
                                <VStack align="stretch" gap={4}>
                                    {/* 연결된 반려동물 & 수첩 그룹 */}
                                    <Box
                                        p={4}
                                        borderRadius="16px"
                                        bg="var(--waba-surface)"
                                        border="1px solid"
                                        borderColor="var(--waba-line)"
                                    >
                                        <Text fontSize="12px" fontWeight="800" color="var(--waba-ink-2)" mb={2.5}>
                                            연결된 반려동물 · 수첩 그룹
                                        </Text>
                                        {pets.length > 0 ? (
                                            <HStack gap={2} flexWrap="wrap" mb={history.journey ? 3 : 0}>
                                                {pets.map((p: any, idx: number) => (
                                                    <HStack
                                                        key={p.id || idx}
                                                        gap={2}
                                                        px={2.5}
                                                        py={1}
                                                        borderRadius="999px"
                                                        bg="var(--waba-card)"
                                                        border="1px solid"
                                                        borderColor="var(--waba-line)"
                                                    >
                                                        <UserAvatar src={p.current_avatar_url || p.profile_image || p.avatar} alt={p.name || '반려동물'} size="2xs" fallbackType="pet" boxShadow="var(--waba-avatar-shadow, 0 2px 6px rgba(0, 0, 0, 0.22))" />
                                                        <Text fontSize="12px" fontWeight="700" color="var(--waba-ink)">
                                                            {p.name || '-'}
                                                        </Text>
                                                        <Text fontSize="11px" color="var(--waba-ink-3)">
                                                            {getSpeciesLabel(p.species, p.custom_species)}{p.breed ? ` · ${p.breed}` : ''}
                                                        </Text>
                                                    </HStack>
                                                ))}
                                            </HStack>
                                        ) : (
                                            <Text fontSize="12px" color="var(--waba-ink-3)" mb={history.journey ? 3 : 0}>
                                                연결된 반려동물이 없습니다.
                                            </Text>
                                        )}

                                        {history.journey && (
                                            <Flex
                                                p={3}
                                                borderRadius="12px"
                                                bg="var(--waba-card)"
                                                border="1px solid"
                                                borderColor="var(--waba-purple-border)"
                                                justify="space-between"
                                                align="center"
                                                gap={2}
                                                flexWrap="wrap"
                                            >
                                                <HStack gap={2}>
                                                    <LuFolderOpen size={15} color="#6338A9" />
                                                    <Text fontSize="12.5px" fontWeight="700" color="var(--waba-ink)">
                                                        {history.journey.title || `(수첩 #${history.journey.id})`}
                                                    </Text>
                                                </HStack>
                                                {onOpenGroup && (
                                                    <Button
                                                        size="2xs"
                                                        variant="outline"
                                                        borderColor="var(--waba-purple-border)"
                                                        color="var(--waba-purple-text)"
                                                        borderRadius="999px"
                                                        px={3}
                                                        onClick={() => onOpenGroup(String(history.journey.id))}
                                                    >
                                                        수첩 그룹 보기
                                                    </Button>
                                                )}
                                            </Flex>
                                        )}
                                    </Box>

                                    {/* 기록 본문 & 메타 */}
                                    <Box
                                        p={4}
                                        borderRadius="16px"
                                        bg="var(--waba-surface)"
                                        border="1px solid"
                                        borderColor="var(--waba-line)"
                                    >
                                        <Text fontSize="12px" fontWeight="800" color="var(--waba-ink-2)" mb={2}>
                                            기록 내용
                                        </Text>
                                        <Text fontSize="13px" color="var(--waba-ink)" whiteSpace="pre-wrap" lineHeight="1.6">
                                            {history.description || '(상세 내용 없음)'}
                                        </Text>

                                        <HStack gap={3} mt={3} flexWrap="wrap" fontSize="11.5px" color="var(--waba-ink-3)">
                                            {history.hospital_name && <Text>병원: {history.hospital_name}</Text>}
                                            {history.weight_kg && <Text>체중: {history.weight_kg}kg</Text>}
                                            <Text>생성: {formatDateStr(history.created_at)}</Text>
                                            <Text>수정: {formatDateStr(history.updated_at)}</Text>
                                        </HStack>

                                        {linkedPosts.length > 0 && (
                                            <Box mt={3} pt={3} borderTop="1px solid" borderColor="var(--waba-line)">
                                                <Text fontSize="11.5px" fontWeight="800" color="var(--waba-ink-2)" mb={1.5}>
                                                    연결된 게시글 ({linkedPosts.length}건)
                                                </Text>
                                                <VStack align="stretch" gap={1.5}>
                                                    {linkedPosts.map((p: any) => (
                                                        <HStack
                                                            key={p.id}
                                                            gap={1.5}
                                                            cursor="pointer"
                                                            color="var(--waba-purple-text)"
                                                            _hover={{ textDecoration: 'underline' }}
                                                            onClick={() => window.open(`/post/${p.id}`, '_blank')}
                                                        >
                                                            <Text fontSize="12px" fontWeight="600">
                                                                {p.title || `(게시글 #${p.id})`}
                                                            </Text>
                                                            <LuExternalLink size={12} />
                                                        </HStack>
                                                    ))}
                                                </VStack>
                                            </Box>
                                        )}
                                    </Box>

                                    {/* 공개 상태 관리 */}
                                    <Box
                                        p={4}
                                        borderRadius="16px"
                                        bg="var(--waba-surface)"
                                        border="1px solid"
                                        borderColor="var(--waba-line)"
                                    >
                                        <Text fontSize="12.5px" fontWeight="800" color="var(--waba-ink)" mb={3}>
                                            공개 상태 관리
                                        </Text>

                                        {history.is_private ? (
                                            <VStack align="stretch" gap={3}>
                                                <Box
                                                    p={3}
                                                    borderRadius="12px"
                                                    bg="rgba(239, 68, 68, 0.08)"
                                                    border="1px solid"
                                                    borderColor="rgba(239, 68, 68, 0.25)"
                                                >
                                                    <Text fontSize="12px" fontWeight="700" color="#EF4444">
                                                        비공개 전환 사유: {history.private_reason || '-'}
                                                    </Text>
                                                    <Text fontSize="11px" color="var(--waba-ink-3)" mt={1}>
                                                        처리자: {history.private_by_nickname || '-'} · {formatDateStr(history.private_at)}
                                                    </Text>
                                                </Box>
                                                <Flex justify="flex-end">
                                                    <Button
                                                        size="xs"
                                                        bg="#10B981"
                                                        color="#FFFFFF"
                                                        borderRadius="999px"
                                                        px={4}
                                                        loading={submitting}
                                                        onClick={() => handleVisibilityChange(false)}
                                                    >
                                                        공개 복구
                                                    </Button>
                                                </Flex>
                                            </VStack>
                                        ) : (
                                            <VStack align="stretch" gap={3}>
                                                {!privateFormOpen ? (
                                                    <Flex justify="flex-end">
                                                        <Button
                                                            size="xs"
                                                            bg="#E53E3E"
                                                            color="#FFFFFF"
                                                            borderRadius="999px"
                                                            px={4}
                                                            onClick={() => setPrivateFormOpen(true)}
                                                        >
                                                            비공개 전환
                                                        </Button>
                                                    </Flex>
                                                ) : (
                                                    <VStack align="stretch" gap={2}>
                                                        <Textarea
                                                            value={privateReason}
                                                            onChange={(e) => setPrivateReason(e.target.value)}
                                                            placeholder="비공개 전환 사유를 입력해주세요 (필수)"
                                                            rows={2}
                                                            bg="var(--waba-card)"
                                                            borderColor="var(--waba-line)"
                                                            color="var(--waba-ink)"
                                                            fontSize="12.5px"
                                                        />
                                                        <HStack justify="flex-end" gap={2}>
                                                            <Button
                                                                size="xs"
                                                                variant="ghost"
                                                                color="var(--waba-ink-2)"
                                                                _hover={{ bg: 'var(--waba-card)' }}
                                                                onClick={() => {
                                                                    setPrivateFormOpen(false);
                                                                    setPrivateReason('');
                                                                }}
                                                            >
                                                                취소
                                                            </Button>
                                                            <Button
                                                                size="xs"
                                                                bg="#E53E3E"
                                                                color="#FFFFFF"
                                                                loading={submitting}
                                                                onClick={() => handleVisibilityChange(true)}
                                                            >
                                                                비공개 전환 확정
                                                            </Button>
                                                        </HStack>
                                                    </VStack>
                                                )}
                                            </VStack>
                                        )}
                                    </Box>
                                </VStack>
                            ) : null}
                        </Dialog.Body>
                    </Dialog.Content>
                </Dialog.Positioner>
            </Portal>
        </Dialog.Root>
    );
}
