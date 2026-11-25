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
import { LuExternalLink } from 'react-icons/lu';
import axiosInstance from '@/utils/api';
import { toaster } from '@/components/ui/toaster';
import UserAvatar from '../../(main)/common/UserAvatar';
import { getRoleBadgeProps } from '../posts/PostAdminDetailDialog';
import { getSpeciesLabel } from './HistoryDetailDialog';

const JOURNEY_CATEGORY_LABELS: Record<string, string> = {
    DISEASE: '질병·관절',
    DERMATOLOGY: '피부·알러지',
    DIET: '식단·다이어트',
    CARE: '일상 케어',
    CHECKUP: '건강검진',
    REVIEW: '사용기',
    OTHER: '기타',
};

const HISTORY_CATEGORY_LABELS: Record<string, string> = {
    CHECKUP: '진료/검사',
    SURGERY: '수술/시술',
    VACCINE: '접종',
    WEIGHT: '체중',
    EVENT: '일상/이벤트',
    OTHER: '기타',
};

const SCOPE_LABELS: Record<string, { label: string; bg: string; color: string }> = {
    PUBLIC: { label: '전체 공개', bg: 'rgba(16, 185, 129, 0.14)', color: '#10B981' },
    LINK_ONLY: { label: '링크 공유', bg: 'rgba(245, 158, 11, 0.14)', color: '#D97706' },
    PRIVATE: { label: '비공개', bg: 'rgba(239, 68, 68, 0.14)', color: '#EF4444' },
};

const STATUS_LABELS: Record<string, string> = {
    IN_PROGRESS: '진행 중',
    ACTIVE: '진행 중',
    CURED: '완치',
    COMPLETED: '목표 달성',
};

interface NotebookGroupDetailDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    journeyId: string | null;
    onUpdated?: () => void;
    onOpenHistory?: (historyId: string) => void;
}

export default function NotebookGroupDetailDialog({
    open,
    onOpenChange,
    journeyId,
    onUpdated,
    onOpenHistory,
}: NotebookGroupDetailDialogProps) {
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [notebook, setNotebook] = useState<any>(null);
    const [pets, setPets] = useState<any[]>([]);
    const [histories, setHistories] = useState<any[]>([]);

    const [privateFormOpen, setPrivateFormOpen] = useState(false);
    const [privateReason, setPrivateReason] = useState('');

    const fetchDetail = useCallback(async (targetId: string) => {
        setLoading(true);
        try {
            const res = await axiosInstance.get(`/admin/notebooks/${targetId}`);
            setNotebook(res.data?.notebook || res.data?.journey || null);
            setPets(res.data?.pets || res.data?.notebook?.pets || []);
            setHistories(res.data?.histories || []);
        } catch {
            toaster.create({ title: '수첩 그룹 상세 정보를 불러오지 못했습니다.', type: 'error' });
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (open && journeyId) {
            setPrivateFormOpen(false);
            setPrivateReason('');
            fetchDetail(journeyId);
        } else if (!open) {
            setNotebook(null);
            setPets([]);
            setHistories([]);
        }
    }, [open, journeyId, fetchDetail]);

    const formatDateStr = (d?: string | null) => {
        if (!d) return '-';
        const parsed = new Date(d);
        if (Number.isNaN(parsed.getTime())) return '-';
        return parsed.toLocaleString('ko-KR');
    };

    const handleShareScopeChange = async (shareScope: 'PRIVATE' | 'LINK_ONLY' | 'PUBLIC') => {
        if (!notebook?.id) return;
        if (shareScope === 'PRIVATE' && !privateReason.trim()) {
            toaster.create({ title: '비공개 전환 사유를 입력해주세요.', type: 'warning' });
            return;
        }
        setSubmitting(true);
        try {
            await axiosInstance.patch(`/admin/notebooks/${notebook.id}/share-scope`, {
                share_scope: shareScope,
                ...(shareScope === 'PRIVATE' ? { reason: privateReason.trim() } : {}),
            });
            const msg =
                shareScope === 'PRIVATE'
                    ? '수첩 그룹이 비공개로 전환되었습니다.'
                    : shareScope === 'LINK_ONLY'
                        ? '수첩 그룹이 링크 공유로 복구되었습니다.'
                        : '수첩 그룹이 전체 공개로 복구되었습니다.';
            toaster.create({ title: msg, type: 'success' });
            setPrivateFormOpen(false);
            setPrivateReason('');
            await fetchDetail(String(notebook.id));
            onUpdated?.();
        } catch (err: any) {
            toaster.create({ title: err?.response?.data?.message || '공유 범위 변경에 실패했습니다.', type: 'error' });
        } finally {
            setSubmitting(false);
        }
    };

    const roleBadge = getRoleBadgeProps(notebook?.author_role);
    const scopeInfo = SCOPE_LABELS[notebook?.share_scope] || SCOPE_LABELS.PRIVATE;

    return (
        <Dialog.Root open={open} onOpenChange={(e) => onOpenChange(e.open)} size="xl" placement="center">
            <Portal>
                <Dialog.Backdrop bg="blackAlpha.600" backdropFilter="blur(4px)" zIndex={1500} />
                <Dialog.Positioner zIndex={1501} p={4}>
                    <Dialog.Content
                        bg="var(--waba-card)"
                        borderRadius="24px"
                        border="1px solid"
                        borderColor="var(--waba-line)"
                        p={{ base: 5, md: 6 }}
                        maxW="820px"
                        w="100%"
                        maxH="90vh"
                        display="flex"
                        flexDirection="column"
                        overflow="hidden"
                    >
                        {/* Header */}
                        <Dialog.Header p={0} pb={4} borderBottom="1px solid" borderColor="var(--waba-line)" flexShrink={0}>
                            <Flex justify="space-between" align="flex-start" gap={4} w="100%">
                                {notebook ? (
                                    <Box flex={1} minW={0}>
                                        <HStack gap={2} mb={2} flexWrap="wrap">
                                            {notebook.category && (
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
                                                    {JOURNEY_CATEGORY_LABELS[notebook.category] || notebook.category}
                                                </Box>
                                            )}
                                            <Box
                                                bg={scopeInfo.bg}
                                                color={scopeInfo.color}
                                                fontSize="11px"
                                                fontWeight="800"
                                                px={2.5}
                                                py={0.5}
                                                borderRadius="999px"
                                            >
                                                {scopeInfo.label}
                                            </Box>
                                            {notebook.status && (
                                                <Box
                                                    bg="var(--waba-purple-soft)"
                                                    color="var(--waba-purple-text)"
                                                    fontSize="11px"
                                                    fontWeight="800"
                                                    px={2.5}
                                                    py={0.5}
                                                    borderRadius="999px"
                                                >
                                                    {STATUS_LABELS[notebook.status] || notebook.status}
                                                </Box>
                                            )}
                                        </HStack>

                                        <HStack gap={2} align="center">
                                            <Dialog.Title
                                                fontSize="17px"
                                                fontWeight="800"
                                                color="var(--waba-ink)"
                                                cursor="pointer"
                                                _hover={{ textDecoration: 'underline' }}
                                                onClick={() => window.open(`/notebook/${notebook.note_code || notebook.id}`, '_blank')}
                                            >
                                                {notebook.title || `(수첩 #${notebook.id})`}
                                            </Dialog.Title>
                                            <LuExternalLink size={14} color="var(--waba-ink-3)" />
                                        </HStack>

                                        <HStack gap={1.5} mt={1.5} flexWrap="wrap" align="center">
                                            <Text fontSize="12px" color="var(--waba-ink-3)">
                                                작성자: {notebook.author_nickname || '-'}
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
                                                · 기간: {notebook.start_date || '-'} ~ {notebook.end_date || '진행 중'}
                                            </Text>
                                        </HStack>

                                        <Text fontSize="11.5px" color="var(--waba-ink-3)" mt={1}>
                                            스크랩 {notebook.scrap_count ?? 0} · 댓글 {notebook.comment_count ?? 0} · 기록 {histories.length}건
                                        </Text>
                                    </Box>
                                ) : (
                                    <Dialog.Title fontSize="17px" fontWeight="800" color="var(--waba-ink)">
                                        수첩 그룹 상세
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
                            ) : notebook ? (
                                <VStack align="stretch" gap={4}>
                                    {/* 연결된 반려동물 & 설명 */}
                                    <Box
                                        p={4}
                                        borderRadius="16px"
                                        bg="var(--waba-surface)"
                                        border="1px solid"
                                        borderColor="var(--waba-line)"
                                    >
                                        {pets.length > 0 && (
                                            <HStack gap={2} flexWrap="wrap" mb={3}>
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
                                                            {getSpeciesLabel(p.species, p.custom_species)}
                                                        </Text>
                                                    </HStack>
                                                ))}
                                            </HStack>
                                        )}
                                        <Text fontSize="13px" color="var(--waba-ink)" whiteSpace="pre-wrap" lineHeight="1.6">
                                            {notebook.goal_summary || notebook.description || '(수첩 설명 없음)'}
                                        </Text>
                                    </Box>

                                    {/* 수첩 공개 범위 관리 */}
                                    <Box
                                        p={4}
                                        borderRadius="16px"
                                        bg="var(--waba-surface)"
                                        border="1px solid"
                                        borderColor="var(--waba-line)"
                                    >
                                        <Text fontSize="12.5px" fontWeight="800" color="var(--waba-ink)" mb={3}>
                                            수첩 공개 범위 관리
                                        </Text>

                                        {notebook.share_scope === 'PRIVATE' ? (
                                            <VStack align="stretch" gap={3}>
                                                <Box
                                                    p={3}
                                                    borderRadius="12px"
                                                    bg="rgba(239, 68, 68, 0.08)"
                                                    border="1px solid"
                                                    borderColor="rgba(239, 68, 68, 0.25)"
                                                >
                                                    <Text fontSize="12px" fontWeight="700" color="#EF4444">
                                                        비공개 전환 사유: {notebook.private_reason || '-'}
                                                    </Text>
                                                    <Text fontSize="11px" color="var(--waba-ink-3)" mt={1}>
                                                        처리자: {notebook.private_by_nickname || '-'} · {formatDateStr(notebook.private_at)}
                                                    </Text>
                                                </Box>
                                                <HStack justify="flex-end" gap={2}>
                                                    <Button
                                                        size="xs"
                                                        variant="outline"
                                                        borderColor="var(--waba-line)"
                                                        color="var(--waba-ink)"
                                                        borderRadius="999px"
                                                        px={3.5}
                                                        loading={submitting}
                                                        onClick={() => handleShareScopeChange('LINK_ONLY')}
                                                    >
                                                        링크 공유로 복구
                                                    </Button>
                                                    <Button
                                                        size="xs"
                                                        bg="#10B981"
                                                        color="#FFFFFF"
                                                        borderRadius="999px"
                                                        px={3.5}
                                                        loading={submitting}
                                                        onClick={() => handleShareScopeChange('PUBLIC')}
                                                    >
                                                        전체 공개로 복구
                                                    </Button>
                                                </HStack>
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
                                                                onClick={() => handleShareScopeChange('PRIVATE')}
                                                            >
                                                                비공개 전환 확정
                                                            </Button>
                                                        </HStack>
                                                    </VStack>
                                                )}
                                            </VStack>
                                        )}
                                    </Box>

                                    {/* 타임라인 기록 목록 */}
                                    <Box>
                                        <Text fontSize="12.5px" fontWeight="800" color="var(--waba-ink-2)" mb={2.5}>
                                            타임라인 기록 ({histories.length}건)
                                        </Text>
                                        {histories.length === 0 ? (
                                            <Flex py={8} justify="center" color="var(--waba-ink-3)" fontSize="13px">
                                                등록된 건강 기록이 없습니다.
                                            </Flex>
                                        ) : (
                                            <VStack align="stretch" gap={2}>
                                                {histories.map((h: any) => {
                                                    const isAi = h.source_type === 'AI' || h.is_ai_generated;
                                                    return (
                                                        <Box
                                                            key={h.id}
                                                            p={3.5}
                                                            borderRadius="14px"
                                                            bg="var(--waba-surface)"
                                                            border="1px solid"
                                                            borderColor="var(--waba-line)"
                                                            cursor={onOpenHistory ? 'pointer' : 'default'}
                                                            _hover={onOpenHistory ? { borderColor: 'var(--waba-purple-border)' } : undefined}
                                                            onClick={() => onOpenHistory?.(String(h.id))}
                                                        >
                                                            <Flex justify="space-between" align="center" gap={2} mb={1.5} flexWrap="wrap">
                                                                <HStack gap={1.5} flexWrap="wrap">
                                                                    <Text fontSize="11.5px" fontWeight="700" color="var(--waba-ink-3)">
                                                                        {h.event_date || '-'}
                                                                    </Text>
                                                                    <Box
                                                                        bg="var(--waba-card)"
                                                                        color="var(--waba-ink-2)"
                                                                        border="1px solid"
                                                                        borderColor="var(--waba-line)"
                                                                        fontSize="10px"
                                                                        fontWeight="700"
                                                                        px={2}
                                                                        py="1px"
                                                                        borderRadius="999px"
                                                                    >
                                                                        {HISTORY_CATEGORY_LABELS[h.category] || h.category || '기타'}
                                                                    </Box>
                                                                    {isAi && (
                                                                        <Box
                                                                            bg="var(--waba-purple-soft)"
                                                                            color="var(--waba-purple-text)"
                                                                            fontSize="10px"
                                                                            fontWeight="800"
                                                                            px={2}
                                                                            py="1px"
                                                                            borderRadius="999px"
                                                                        >
                                                                            AI 자동
                                                                        </Box>
                                                                    )}
                                                                    {h.is_private && (
                                                                        <Box
                                                                            bg="rgba(239, 68, 68, 0.14)"
                                                                            color="#EF4444"
                                                                            fontSize="10px"
                                                                            fontWeight="800"
                                                                            px={2}
                                                                            py="1px"
                                                                            borderRadius="999px"
                                                                        >
                                                                            비공개
                                                                        </Box>
                                                                    )}
                                                                </HStack>
                                                                <HStack gap={2} fontSize="11px" color="var(--waba-ink-3)">
                                                                    {h.hospital_name && <Text>{h.hospital_name}</Text>}
                                                                    {h.weight_kg && <Text>{h.weight_kg}kg</Text>}
                                                                </HStack>
                                                            </Flex>
                                                            <Text fontSize="13px" fontWeight="700" color="var(--waba-ink)">
                                                                {h.title || `(기록 #${h.id})`}
                                                            </Text>
                                                            {h.description && (
                                                                <Text fontSize="12px" color="var(--waba-ink-2)" mt={1} lineClamp={2}>
                                                                    {h.description}
                                                                </Text>
                                                            )}
                                                        </Box>
                                                    );
                                                })}
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
