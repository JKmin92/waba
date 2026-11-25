'use client'

import React, { useCallback, useEffect, useState } from 'react';
import {
    Box,
    Button,
    CloseButton,
    Dialog,
    Flex,
    HStack,
    Input,
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

interface PostReportDetailDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    postId: string | null;
    initialTab?: 'reports' | 'appeals';
    onUpdated?: () => void;
}

export default function PostReportDetailDialog({
    open,
    onOpenChange,
    postId,
    initialTab = 'reports',
    onUpdated,
}: PostReportDetailDialogProps) {
    const [activeTab, setActiveTab] = useState<'reports' | 'appeals'>(initialTab);
    const [loading, setLoading] = useState(false);
    const [post, setPost] = useState<any>(null);
    const [reports, setReports] = useState<any[]>([]);
    const [appeals, setAppeals] = useState<any[]>([]);

    // Purge extend inline state
    const [extendOpen, setExtendOpen] = useState(false);
    const [extendDays, setExtendDays] = useState('7');
    const [extendReason, setExtendReason] = useState('');

    // Batch report handling & decision history state
    const [decisionHistory, setDecisionHistory] = useState<any[]>([]);
    const [decisionReason, setDecisionReason] = useState('');

    // Appeal pending reply state (per appeal id)
    const [appealReplies, setAppealReplies] = useState<Record<string, string>>({});
    const [blockReappealMap, setBlockReappealMap] = useState<Record<string, boolean>>({});

    // Appeal note edit state
    const [editingAppealId, setEditingAppealId] = useState<string | null>(null);
    const [editingNoteText, setEditingNoteText] = useState('');

    const [submitting, setSubmitting] = useState(false);

    const fetchDetail = useCallback(async (targetPostId: string) => {
        setLoading(true);
        try {
            const res = await axiosInstance.get(`/admin/posts/${targetPostId}/moderation-detail`);
            setPost(res.data?.post || null);
            setReports(res.data?.reports || []);
            setAppeals(res.data?.appeals || []);
            setDecisionHistory(res.data?.decisionHistory || []);
        } catch {
            toaster.create({ title: '신고/이의 상세 정보를 불러오지 못했습니다.', type: 'error' });
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (open) {
            setActiveTab(initialTab);
            setExtendOpen(false);
            setDecisionReason('');
            setEditingAppealId(null);
            if (postId) {
                fetchDetail(postId);
            }
        } else {
            setPost(null);
            setReports([]);
            setAppeals([]);
            setDecisionHistory([]);
        }
    }, [open, postId, initialTab, fetchDetail]);

    const formatDateStr = (d?: string | null) => {
        if (!d) return '-';
        const parsed = new Date(d);
        if (Number.isNaN(parsed.getTime())) return '-';
        return parsed.toLocaleString('ko-KR');
    };

    const getRoleBadgeProps = (role?: string | null) => {
        const upper = (role || 'USER').toUpperCase();
        switch (upper) {
            case 'ADMIN':
                return { label: '관리자', bg: 'var(--waba-purple-soft)', color: 'var(--waba-purple-text)', borderColor: 'var(--waba-purple-border)' };
            case 'VET':
                return { label: '수의사', bg: 'rgba(16, 185, 129, 0.14)', color: '#10B981', borderColor: 'rgba(16, 185, 129, 0.3)' };
            case 'EDITOR':
                return { label: '에디터', bg: 'rgba(245, 158, 11, 0.14)', color: '#D97706', borderColor: 'rgba(245, 158, 11, 0.3)' };
            default:
                return { label: '일반 유저', bg: 'rgba(148, 163, 184, 0.16)', color: 'var(--waba-ink-2)', borderColor: 'rgba(148, 163, 184, 0.35)' };
        }
    };

    const handleExtendPurge = async () => {
        if (!post?.id) return;
        const maxExtend = Math.max(0, 30 - Number(post.admin_extended_days || 0));
        const days = Number(extendDays);
        if (!days || days < 1 || days > maxExtend) {
            toaster.create({ title: `연장 일수는 1 ~ ${maxExtend}일 사이로 입력해주세요.`, type: 'warning' });
            return;
        }
        if (!extendReason.trim()) {
            toaster.create({ title: '연장 사유를 입력해주세요.', type: 'warning' });
            return;
        }
        setSubmitting(true);
        try {
            await axiosInstance.patch(`/admin/posts/${post.id}/extend-purge`, {
                extendDays: days,
                reason: extendReason.trim(),
            });
            toaster.create({ title: `영구 삭제 예정일이 ${days}일 연장되었습니다.`, type: 'success' });
            setExtendOpen(false);
            setExtendReason('');
            await fetchDetail(String(post.id));
            onUpdated?.();
        } catch (err: any) {
            toaster.create({ title: err?.response?.data?.message || '삭제일 연장에 실패했습니다.', type: 'error' });
        } finally {
            setSubmitting(false);
        }
    };

    const handleBatchReportDecision = async (decision: 'APPROVE' | 'REJECT') => {
        if (!post?.id) return;
        if (!decisionReason.trim()) {
            toaster.create({ title: '결정 사유를 입력해주세요.', type: 'warning' });
            return;
        }
        setSubmitting(true);
        try {
            await axiosInstance.patch(`/admin/posts/${post.id}/reports/handle`, {
                decision,
                decisionReason: decisionReason.trim(),
            });
            toaster.create({
                title: decision === 'APPROVE' ? '대기 중인 신고가 승인되어 게시글이 삭제 처리되었습니다.' : '대기 중인 신고가 일괄 반려되었습니다.',
                type: 'success',
            });
            setDecisionReason('');
            if (postId) await fetchDetail(postId);
            onUpdated?.();
        } catch (err: any) {
            toaster.create({ title: err?.response?.data?.message || '신고 처리에 실패했습니다.', type: 'error' });
        } finally {
            setSubmitting(false);
        }
    };

    const handleApproveAppeal = async (appealId: string) => {
        if (!post?.id) return;
        const replyText = (appealReplies[appealId] || '').trim();
        setSubmitting(true);
        try {
            await axiosInstance.patch(`/admin/posts/${post.id}/restore`, {
                adminNote: replyText || undefined,
            });
            toaster.create({ title: '이의가 승인되어 게시글이 복구되었습니다.', type: 'success' });
            await fetchDetail(String(post.id));
            onUpdated?.();
        } catch (err: any) {
            toaster.create({ title: err?.response?.data?.message || '이의 승인 처리에 실패했습니다.', type: 'error' });
        } finally {
            setSubmitting(false);
        }
    };

    const handleRejectAppeal = async (appealId: string) => {
        if (!post?.id) return;
        const replyText = (appealReplies[appealId] || '').trim();
        if (!replyText) {
            toaster.create({ title: '반려 사유를 입력해주세요.', type: 'warning' });
            return;
        }
        setSubmitting(true);
        try {
            await axiosInstance.patch(`/admin/posts/${post.id}/appeal/reject`, {
                reason: replyText,
                blockReappeal: Boolean(blockReappealMap[appealId]),
            });
            toaster.create({ title: '이의 제기가 반려되었습니다.', type: 'info' });
            await fetchDetail(String(post.id));
            onUpdated?.();
        } catch (err: any) {
            toaster.create({ title: err?.response?.data?.message || '이의 반려 처리에 실패했습니다.', type: 'error' });
        } finally {
            setSubmitting(false);
        }
    };

    const handleSaveAppealNote = async (ap: any) => {
        if (ap.status === 'REJECTED' && !editingNoteText.trim()) {
            toaster.create({ title: '반려 답변은 비워둘 수 없습니다.', type: 'warning' });
            return;
        }
        setSubmitting(true);
        try {
            await axiosInstance.patch(`/admin/appeals/${ap.id}/note`, {
                adminNote: editingNoteText.trim(),
            });
            toaster.create({ title: '답변이 수정되었습니다.', type: 'success' });
            setEditingAppealId(null);
            if (postId) await fetchDetail(postId);
            onUpdated?.();
        } catch (err: any) {
            toaster.create({ title: err?.response?.data?.message || '답변 수정에 실패했습니다.', type: 'error' });
        } finally {
            setSubmitting(false);
        }
    };

    const pendingReportCount = reports.filter((r) => r.status === 'PENDING').length;
    const pendingAppealCount = appeals.filter((a) => a.status === 'PENDING').length;
    const maxExtend = post ? Math.max(0, 30 - Number(post.admin_extended_days || 0)) : 0;

    const purgeDate = post?.purge_scheduled_at ? new Date(post.purge_scheduled_at) : null;
    const purgeDDay = purgeDate
        ? Math.max(0, Math.ceil((purgeDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000)))
        : null;
    const purgeFormatted = purgeDate
        ? `${purgeDate.getFullYear()}.${String(purgeDate.getMonth() + 1).padStart(2, '0')}.${String(purgeDate.getDate()).padStart(2, '0')}`
        : '';

    return (
        <Dialog.Root open={open} onOpenChange={(e) => onOpenChange(e.open)} placement="center" size="xl">
            <Portal>
                <Dialog.Backdrop zIndex={1500} bg="blackAlpha.600" backdropFilter="blur(4px)" />
                <Dialog.Positioner zIndex={1501} p={{ base: 3, md: 4 }}>
                    <Dialog.Content
                        maxW="820px"
                        w="full"
                        borderRadius="24px"
                        bg="var(--waba-card)"
                        border="1px solid"
                        borderColor="var(--waba-line)"
                        boxShadow="0 24px 60px rgba(0,0,0,0.3)"
                        p={{ base: 4, md: 6 }}
                        maxH="88vh"
                        display="flex"
                        flexDirection="column"
                    >
                        {/* Header */}
                        <Dialog.Header p={0} pb={4} borderBottom="1px solid" borderColor="var(--waba-line)">
                            <Flex w="100%" justify="space-between" align="flex-start" gap={3}>
                                {post ? (
                                    <Box minW={0} flex={1}>
                                        <HStack gap={1.5} mb={1.5} flexWrap="wrap">
                                            {post.board_name && (
                                                <Box bg="var(--waba-purple-soft)" color="var(--waba-purple-text)" fontSize="10.5px" fontWeight="700" px={2} py={0.5} borderRadius="999px">
                                                    {post.board_name}
                                                </Box>
                                            )}
                                            <Box
                                                bg={
                                                    post.status === 'DELETED'
                                                        ? 'rgba(239, 68, 68, 0.12)'
                                                        : post.status === 'HIDDEN'
                                                            ? 'rgba(245, 158, 11, 0.14)'
                                                            : 'rgba(16, 185, 129, 0.12)'
                                                }
                                                color={
                                                    post.status === 'DELETED'
                                                        ? '#EF4444'
                                                        : post.status === 'HIDDEN'
                                                            ? '#D97706'
                                                            : '#10B981'
                                                }
                                                fontSize="10.5px"
                                                fontWeight="800"
                                                px={2}
                                                py={0.5}
                                                borderRadius="999px"
                                            >
                                                {post.status === 'DELETED' ? '삭제됨' : post.status === 'HIDDEN' ? '숨김' : '게시 중'}
                                            </Box>
                                        </HStack>
                                        <HStack gap={2} align="center">
                                            <Dialog.Title
                                                fontSize="17px"
                                                fontWeight="800"
                                                color="var(--waba-ink)"
                                                cursor="pointer"
                                                _hover={{ textDecoration: 'underline' }}
                                                onClick={() => window.open(`/post/${post.id}`, '_blank')}
                                            >
                                                {post.title || `(게시글 #${post.id})`}
                                            </Dialog.Title>
                                            <LuExternalLink size={14} color="var(--waba-ink-3)" />
                                        </HStack>
                                        <HStack gap={1.5} mt={1} flexWrap="wrap" align="center">
                                            <Text fontSize="12px" color="var(--waba-ink-3)">
                                                작성자: {post.author_nickname || '-'}
                                            </Text>
                                            {(() => {
                                                const roleBadge = getRoleBadgeProps(post.author_role);
                                                return (
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
                                                );
                                            })()}
                                            <Text fontSize="12px" color="var(--waba-ink-3)">
                                                ({post.author_email || '-'})
                                            </Text>
                                        </HStack>

                                        {post.status === 'DELETED' && purgeDate && (
                                            <HStack gap={2} mt={2} flexWrap="wrap" align="center">
                                                <Text fontSize="11.5px" fontWeight="700" color="#EF4444">
                                                    영구 삭제 예정: {purgeFormatted} (D-{purgeDDay})
                                                    {Number(post.admin_extended_days || 0) > 0 ? ` · +${post.admin_extended_days}일 연장됨` : ''}
                                                </Text>
                                                {maxExtend > 0 && (
                                                    <Button
                                                        size="2xs"
                                                        variant="outline"
                                                        borderColor="var(--waba-line)"
                                                        color="var(--waba-ink)"
                                                        borderRadius="999px"
                                                        px={2.5}
                                                        onClick={() => {
                                                            setExtendOpen((prev) => !prev);
                                                            setExtendDays('7');
                                                            setExtendReason('');
                                                        }}
                                                    >
                                                        삭제일 연장
                                                    </Button>
                                                )}
                                            </HStack>
                                        )}

                                        {extendOpen && (
                                            <HStack gap={2} mt={2.5} flexWrap="wrap">
                                                <Input
                                                    type="number"
                                                    min={1}
                                                    max={maxExtend}
                                                    value={extendDays}
                                                    onChange={(e) => setExtendDays(e.target.value)}
                                                    w="72px"
                                                    size="xs"
                                                    h="30px"
                                                    bg="var(--waba-surface)"
                                                    borderColor="var(--waba-line)"
                                                    color="var(--waba-ink)"
                                                />
                                                <Input
                                                    flex={1}
                                                    minW="160px"
                                                    value={extendReason}
                                                    onChange={(e) => setExtendReason(e.target.value)}
                                                    placeholder={`연장 사유 입력 (최대 ${maxExtend}일)...`}
                                                    size="xs"
                                                    h="30px"
                                                    bg="var(--waba-surface)"
                                                    borderColor="var(--waba-line)"
                                                    color="var(--waba-ink)"
                                                />
                                                <Button size="xs" variant="ghost" onClick={() => setExtendOpen(false)}>취소</Button>
                                                <Button size="xs" bg="#6338A9" color="#FFFFFF" loading={submitting} onClick={handleExtendPurge}>
                                                    연장 적용
                                                </Button>
                                            </HStack>
                                        )}
                                    </Box>
                                ) : (
                                    <Dialog.Title fontSize="17px" fontWeight="800" color="var(--waba-ink)">
                                        신고 · 이의 상세
                                    </Dialog.Title>
                                )}
                                <CloseButton size="sm" rounded="full" color="var(--waba-ink)" onClick={() => onOpenChange(false)} />
                            </Flex>
                        </Dialog.Header>

                        {/* Tabs */}
                        <HStack gap={2} py={3} borderBottom="1px solid" borderColor="var(--waba-line)" flexShrink={0}>
                            <Button
                                size="xs"
                                h="30px"
                                px={3.5}
                                borderRadius="999px"
                                bg={activeTab === 'reports' ? 'var(--waba-ink)' : 'var(--waba-surface)'}
                                color={activeTab === 'reports' ? 'var(--waba-bg)' : 'var(--waba-ink-2)'}
                                border="1px solid"
                                borderColor={activeTab === 'reports' ? 'var(--waba-ink)' : 'var(--waba-line)'}
                                fontSize="12px"
                                fontWeight="700"
                                gap={1.5}
                                onClick={() => setActiveTab('reports')}
                            >
                                <Text>신고 내역 ({reports.length})</Text>
                                {pendingReportCount > 0 && (
                                    <Box bg="#EF4444" color="white" fontSize="10px" px={1.5} borderRadius="999px">
                                        {pendingReportCount}
                                    </Box>
                                )}
                            </Button>

                            <Button
                                size="xs"
                                h="30px"
                                px={3.5}
                                borderRadius="999px"
                                bg={activeTab === 'appeals' ? 'var(--waba-ink)' : 'var(--waba-surface)'}
                                color={activeTab === 'appeals' ? 'var(--waba-bg)' : 'var(--waba-ink-2)'}
                                border="1px solid"
                                borderColor={activeTab === 'appeals' ? 'var(--waba-ink)' : 'var(--waba-line)'}
                                fontSize="12px"
                                fontWeight="700"
                                gap={1.5}
                                onClick={() => setActiveTab('appeals')}
                            >
                                <Text>이의 제기 ({appeals.length})</Text>
                                {pendingAppealCount > 0 && (
                                    <Box bg="#D97706" color="white" fontSize="10px" px={1.5} borderRadius="999px">
                                        {pendingAppealCount}
                                    </Box>
                                )}
                            </Button>
                        </HStack>

                        {/* Body */}
                        <Dialog.Body p={0} pt={4} overflowY="auto" flex={1}>
                            {loading ? (
                                <Flex py={16} justify="center">
                                    <Spinner size="lg" color="#6338A9" />
                                </Flex>
                            ) : activeTab === 'reports' ? (
                                <VStack align="stretch" gap={4}>
                                    {/* ① 접수된 신고 목록 */}
                                    {reports.length === 0 ? (
                                        <Flex py={12} justify="center" color="var(--waba-ink-3)" fontSize="13px">
                                            접수된 신고 내역이 없습니다.
                                        </Flex>
                                    ) : (
                                        <VStack align="stretch" gap={2.5}>
                                            <Text fontSize="12px" fontWeight="800" color="var(--waba-ink-2)">
                                                접수된 신고 ({reports.length}건)
                                            </Text>
                                            {reports.map((r) => (
                                                <Box
                                                    key={r.id}
                                                    p={3.5}
                                                    borderRadius="14px"
                                                    bg="var(--waba-surface)"
                                                    border="1px solid"
                                                    borderColor="var(--waba-line)"
                                                >
                                                    <Flex justify="space-between" align="center" gap={2} mb={2} flexWrap="wrap">
                                                        <HStack gap={2}>
                                                            <UserAvatar src={r.reporter_avatar} alt={r.reporter_nickname || '신고자'} size="2xs" fallbackType="user" />
                                                            <Text fontSize="12.5px" fontWeight="700" color="var(--waba-ink)">
                                                                {r.reporter_nickname || '알 수 없음'}
                                                            </Text>
                                                            {(() => {
                                                                const roleBadge = getRoleBadgeProps(r.reporter_role);
                                                                return (
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
                                                                );
                                                            })()}
                                                            <Text fontSize="11.5px" color="var(--waba-ink-3)">
                                                                ({r.reporter_email || '-'})
                                                            </Text>
                                                        </HStack>
                                                        <HStack gap={2}>
                                                            <Text fontSize="11px" color="var(--waba-ink-3)">
                                                                {formatDateStr(r.created_at)}
                                                            </Text>
                                                            <Box
                                                                bg={
                                                                    r.status === 'PENDING'
                                                                        ? 'rgba(239, 68, 68, 0.12)'
                                                                        : r.status === 'RESOLVED'
                                                                            ? 'rgba(16, 185, 129, 0.12)'
                                                                            : 'var(--waba-card)'
                                                                }
                                                                color={
                                                                    r.status === 'PENDING'
                                                                        ? '#EF4444'
                                                                        : r.status === 'RESOLVED'
                                                                            ? '#10B981'
                                                                            : 'var(--waba-ink-3)'
                                                                }
                                                                fontSize="10.5px"
                                                                fontWeight="800"
                                                                px={2}
                                                                py={0.5}
                                                                borderRadius="999px"
                                                            >
                                                                {r.status === 'PENDING' ? '대기 중' : r.status === 'RESOLVED' ? '승인됨' : '반려됨'}
                                                            </Box>
                                                        </HStack>
                                                    </Flex>

                                                    <Box
                                                        display="inline-block"
                                                        bg="var(--waba-purple-soft)"
                                                        color="var(--waba-purple-text)"
                                                        fontSize="11px"
                                                        fontWeight="700"
                                                        px={2}
                                                        py="1px"
                                                        borderRadius="999px"
                                                        mb={r.detail ? 1.5 : 0}
                                                    >
                                                        {r.reason}
                                                    </Box>
                                                    {r.detail && (
                                                        <Text fontSize="12.5px" color="var(--waba-ink-2)">
                                                            {r.detail}
                                                        </Text>
                                                    )}
                                                </Box>
                                            ))}
                                        </VStack>
                                    )}

                                    {/* ② 대기 중인 신고 일괄 검토 · 처리 패널 */}
                                    {pendingReportCount > 0 && (
                                        <VStack
                                            align="stretch"
                                            gap={2.5}
                                            p={4}
                                            borderRadius="16px"
                                            bg="var(--waba-surface)"
                                            border="1px solid"
                                            borderColor="var(--waba-purple-border)"
                                        >
                                            <Text fontSize="13px" fontWeight="800" color="var(--waba-ink)">
                                                대기 중인 신고 {pendingReportCount}건 일괄 검토 · 처리
                                            </Text>
                                            <Text fontSize="11.5px" color="var(--waba-purple-text)" fontWeight="600">
                                                승인 시 게시글이 삭제(DELETED) 상태로 전환되며 대기 중인 신고 전체가 한 번에 승인 처리됩니다. 반려 시 대기 중인 신고 전체가 반려됩니다. 결정 사유는 관리자만 확인할 수 있습니다.
                                            </Text>
                                            <Textarea
                                                value={decisionReason}
                                                onChange={(e) => setDecisionReason(e.target.value)}
                                                placeholder="결정 사유 (관리자 전용, 필수)..."
                                                rows={2}
                                                bg="var(--waba-card)"
                                                borderColor="var(--waba-line)"
                                                color="var(--waba-ink)"
                                                fontSize="12.5px"
                                            />
                                            <HStack justify="flex-end" gap={2}>
                                                <Button
                                                    size="xs"
                                                    variant="outline"
                                                    borderColor="var(--waba-line)"
                                                    color="var(--waba-ink)"
                                                    loading={submitting}
                                                    onClick={() => handleBatchReportDecision('REJECT')}
                                                >
                                                    전체 반려
                                                </Button>
                                                <Button
                                                    size="xs"
                                                    bg="#E53E3E"
                                                    color="#FFFFFF"
                                                    loading={submitting}
                                                    onClick={() => handleBatchReportDecision('APPROVE')}
                                                >
                                                    신고 승인 (게시글 삭제)
                                                </Button>
                                            </HStack>
                                        </VStack>
                                    )}

                                    {/* ③ 처리 완료된 검토 결과 */}
                                    {decisionHistory.length > 0 && (
                                        <VStack align="stretch" gap={2.5}>
                                            <Text fontSize="12px" fontWeight="800" color="var(--waba-ink-2)">
                                                처리 완료된 검토 결과 ({decisionHistory.length})
                                            </Text>
                                            {decisionHistory.map((h, idx) => (
                                                <Box
                                                    key={h.id || `${h.handled_at}-${idx}`}
                                                    p={3.5}
                                                    borderRadius="14px"
                                                    bg="var(--waba-purple-soft)"
                                                    border="1px solid"
                                                    borderColor="var(--waba-purple-border)"
                                                >
                                                    <Flex justify="space-between" align="center" gap={2} mb={1.5} flexWrap="wrap">
                                                        <Box
                                                            bg={h.decision === 'APPROVE' || h.status === 'RESOLVED' ? 'rgba(16, 185, 129, 0.14)' : 'var(--waba-card)'}
                                                            color={h.decision === 'APPROVE' || h.status === 'RESOLVED' ? '#10B981' : 'var(--waba-ink-3)'}
                                                            fontSize="10.5px"
                                                            fontWeight="800"
                                                            px={2}
                                                            py={0.5}
                                                            borderRadius="999px"
                                                        >
                                                            {h.decision === 'APPROVE' || h.status === 'RESOLVED'
                                                                ? `승인됨 (${h.report_count ?? 1}건 일괄 처리)`
                                                                : `반려됨 (${h.report_count ?? 1}건 일괄 처리)`}
                                                        </Box>
                                                        <Text fontSize="11px" fontWeight="700" color="var(--waba-purple-text)">
                                                            관리자 전용 결정 사유 · {h.handled_by_nickname || '-'} · {formatDateStr(h.handled_at)}
                                                        </Text>
                                                    </Flex>
                                                    <Text fontSize="12.5px" color="var(--waba-ink)">
                                                        {h.handled_note || '-'}
                                                    </Text>
                                                </Box>
                                            ))}
                                        </VStack>
                                    )}
                                </VStack>
                            ) : (
                                <VStack align="stretch" gap={3}>
                                    {appeals.length === 0 ? (
                                        <Flex py={12} justify="center" color="var(--waba-ink-3)" fontSize="13px">
                                            접수된 이의 제기가 없습니다.
                                        </Flex>
                                    ) : (
                                        appeals.map((ap, idx) => {
                                            const apId = String(ap.id);
                                            const isPending = ap.status === 'PENDING';
                                            const isEditingNote = editingAppealId === apId;
                                            return (
                                                <Box
                                                    key={apId}
                                                    p={4}
                                                    borderRadius="16px"
                                                    bg="var(--waba-surface)"
                                                    border="1px solid"
                                                    borderColor="var(--waba-line)"
                                                >
                                                    <Flex justify="space-between" align="center" mb={2} flexWrap="wrap" gap={2}>
                                                        <HStack gap={1.5} flexWrap="wrap">
                                                            <Box bg="var(--waba-card)" border="1px solid" borderColor="var(--waba-line)" color="var(--waba-ink)" fontSize="10.5px" fontWeight="800" px={2} py="1px" borderRadius="999px">
                                                                {ap.attempt_no || idx + 1}차
                                                            </Box>
                                                            <Box
                                                                bg={
                                                                    ap.status === 'APPROVED'
                                                                        ? 'rgba(16, 185, 129, 0.12)'
                                                                        : ap.status === 'REJECTED'
                                                                            ? 'rgba(239, 68, 68, 0.12)'
                                                                            : 'rgba(245, 158, 11, 0.14)'
                                                                }
                                                                color={
                                                                    ap.status === 'APPROVED'
                                                                        ? '#10B981'
                                                                        : ap.status === 'REJECTED'
                                                                            ? '#EF4444'
                                                                            : '#D97706'
                                                                }
                                                                fontSize="10.5px"
                                                                fontWeight="800"
                                                                px={2}
                                                                py="1px"
                                                                borderRadius="999px"
                                                            >
                                                                {ap.status === 'APPROVED' ? '승인됨' : ap.status === 'REJECTED' ? '반려됨' : '심사 중'}
                                                            </Box>
                                                            {Number(ap.extended_by_appeal) === 1 && (
                                                                <Box bg="var(--waba-purple-soft)" color="var(--waba-purple-text)" fontSize="10px" fontWeight="700" px={2} py="1px" borderRadius="999px">
                                                                    +10일 자동 연장
                                                                </Box>
                                                            )}
                                                            {Boolean(ap.blocked_reappeal) && (
                                                                <Box bg="rgba(239, 68, 68, 0.12)" color="#EF4444" fontSize="10px" fontWeight="700" px={2} py="1px" borderRadius="999px">
                                                                    재이의 차단
                                                                </Box>
                                                            )}
                                                        </HStack>
                                                        <Text fontSize="11px" color="var(--waba-ink-3)">
                                                            {formatDateStr(ap.created_at)}
                                                        </Text>
                                                    </Flex>

                                                    <Text fontSize="12.5px" color="var(--waba-ink)" mb={3}>
                                                        {ap.reason}
                                                    </Text>

                                                    {isPending ? (
                                                        <VStack align="stretch" gap={2} pt={3} borderTop="1px solid" borderColor="var(--waba-line)">
                                                            <Textarea
                                                                value={appealReplies[apId] || ''}
                                                                onChange={(e) => setAppealReplies((prev) => ({ ...prev, [apId]: e.target.value }))}
                                                                placeholder="관리자 답변 입력 (반려 시 필수·유저 공개, 승인 시 선택·관리자 전용 비공개)"
                                                                rows={2}
                                                                bg="var(--waba-card)"
                                                                borderColor="var(--waba-line)"
                                                                color="var(--waba-ink)"
                                                                fontSize="12.5px"
                                                            />
                                                            {Number(ap.attempt_no || 1) > 3 && (
                                                                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', color: '#EF4444', fontWeight: 600, cursor: 'pointer' }}>
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={Boolean(blockReappealMap[apId])}
                                                                        onChange={(e) => setBlockReappealMap((prev) => ({ ...prev, [apId]: e.target.checked }))}
                                                                    />
                                                                    추가 재이의 제기 차단 (3회 초과 반려 시 해당 게시글 재이의 불가)
                                                                </label>
                                                            )}
                                                            <HStack justify="flex-end" gap={2}>
                                                                <Button
                                                                    size="xs"
                                                                    bg="#E53E3E"
                                                                    color="#FFFFFF"
                                                                    loading={submitting}
                                                                    onClick={() => handleRejectAppeal(apId)}
                                                                >
                                                                    이의 반려
                                                                </Button>
                                                                <Button
                                                                    size="xs"
                                                                    bg="#6338A9"
                                                                    color="#FFFFFF"
                                                                    _hover={{ bg: '#522B8F' }}
                                                                    loading={submitting}
                                                                    onClick={() => handleApproveAppeal(apId)}
                                                                >
                                                                    이의 승인 (게시글 복구)
                                                                </Button>
                                                            </HStack>
                                                        </VStack>
                                                    ) : (
                                                        <Box p={3} borderRadius="12px" bg="var(--waba-card)" border="1px solid" borderColor="var(--waba-line)">
                                                            <Flex justify="space-between" align="center" mb={1} flexWrap="wrap" gap={2}>
                                                                <HStack gap={2}>
                                                                    <Box
                                                                        bg={ap.status === 'APPROVED' ? 'var(--waba-purple-soft)' : 'rgba(239, 68, 68, 0.12)'}
                                                                        color={ap.status === 'APPROVED' ? 'var(--waba-purple-text)' : '#EF4444'}
                                                                        fontSize="10.5px"
                                                                        fontWeight="800"
                                                                        px={2}
                                                                        py="1px"
                                                                        borderRadius="999px"
                                                                    >
                                                                        {ap.status === 'APPROVED' ? '관리자 전용 답변 (유저 비공개)' : '유저 공개 반려 답변'}
                                                                    </Box>
                                                                    <Text fontSize="11px" color="var(--waba-ink-3)">
                                                                        {ap.handled_by_nickname || '-'} · {formatDateStr(ap.handled_at)}
                                                                    </Text>
                                                                </HStack>
                                                                {!isEditingNote && (
                                                                    <Button
                                                                        size="2xs"
                                                                        variant="outline"
                                                                        borderColor="var(--waba-line)"
                                                                        color="var(--waba-ink)"
                                                                        onClick={() => {
                                                                            setEditingAppealId(apId);
                                                                            setEditingNoteText(ap.admin_note || '');
                                                                        }}
                                                                    >
                                                                        답변 수정
                                                                    </Button>
                                                                )}
                                                            </Flex>
                                                            {ap.status === 'APPROVED' && (
                                                                <Text fontSize="11px" color="var(--waba-ink-3)" mb={1.5}>
                                                                    유저 마이페이지에는 고정 복구 안내 문구만 표시됩니다.
                                                                </Text>
                                                            )}
                                                            {isEditingNote ? (
                                                                <VStack align="stretch" gap={2} mt={2}>
                                                                    <Textarea
                                                                        value={editingNoteText}
                                                                        onChange={(e) => setEditingNoteText(e.target.value)}
                                                                        rows={2}
                                                                        bg="var(--waba-surface)"
                                                                        borderColor="var(--waba-line)"
                                                                        color="var(--waba-ink)"
                                                                        fontSize="12.5px"
                                                                    />
                                                                    <HStack justify="flex-end" gap={2}>
                                                                        <Button size="xs" variant="ghost" onClick={() => setEditingAppealId(null)}>취소</Button>
                                                                        <Button size="xs" bg="#6338A9" color="#FFFFFF" loading={submitting} onClick={() => handleSaveAppealNote(ap)}>
                                                                            저장
                                                                        </Button>
                                                                    </HStack>
                                                                </VStack>
                                                            ) : (
                                                                <Text fontSize="12.5px" color="var(--waba-ink)">
                                                                    {ap.admin_note || '(작성된 답변 없음)'}
                                                                </Text>
                                                            )}
                                                        </Box>
                                                    )}
                                                </Box>
                                            );
                                        })
                                    )}
                                </VStack>
                            )}
                        </Dialog.Body>
                    </Dialog.Content>
                </Dialog.Positioner>
            </Portal>
        </Dialog.Root>
    );
}
