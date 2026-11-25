'use client'

import React, { useCallback, useEffect, useState } from 'react';
import {
    Box,
    Button,
    CloseButton,
    Dialog,
    Flex,
    Grid,
    HStack,
    Image,
    Input,
    Portal,
    Spinner,
    Text,
    VStack,
} from '@chakra-ui/react';
import { LuExternalLink, LuEyeOff, LuShieldAlert } from 'react-icons/lu';
import axiosInstance from '@/utils/api';
import { toaster } from '@/components/ui/toaster';
import PostReportDetailDialog from '../components/PostReportDetailDialog';

interface PostAdminDetailDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    postId: string | null;
    onUpdated?: () => void;
}

export const CURATION_SPECIES_OPTIONS = [
    { key: 'ALL', label: '전체 공통' },
    { key: 'DOG', label: '강아지' },
    { key: 'CAT', label: '고양이' },
    { key: 'RABBIT', label: '토끼' },
    { key: 'HAMSTER', label: '햄스터' },
    { key: 'GUINEAPIG', label: '기니피그' },
    { key: 'CHINCHILA', label: '친칠라' },
] as const;

export function getRoleBadgeProps(role?: string | null) {
    const upper = (role || 'USER').toUpperCase();
    switch (upper) {
        case 'ADMIN':
            return {
                label: '관리자',
                bg: 'var(--waba-purple-soft)',
                color: 'var(--waba-purple-text)',
                borderColor: 'var(--waba-purple-border)',
            };
        case 'VET':
            return {
                label: '수의사',
                bg: 'rgba(16, 185, 129, 0.14)',
                color: '#10B981',
                borderColor: 'rgba(16, 185, 129, 0.3)',
            };
        case 'EDITOR':
            return {
                label: '에디터',
                bg: 'rgba(245, 158, 11, 0.14)',
                color: '#D97706',
                borderColor: 'rgba(245, 158, 11, 0.3)',
            };
        default:
            return {
                label: '일반 유저',
                bg: 'rgba(148, 163, 184, 0.16)',
                color: 'var(--waba-ink-2)',
                borderColor: 'rgba(148, 163, 184, 0.35)',
            };
    }
}

function extractTextFromContent(content: unknown): string {
    if (!content) return '';
    let parsed = content;
    if (typeof content === 'string') {
        try {
            parsed = JSON.parse(content);
        } catch {
            return content;
        }
    }
    if (Array.isArray(parsed)) {
        const texts: string[] = [];
        for (const block of parsed) {
            if (typeof block === 'string') {
                texts.push(block);
            } else if (block && typeof block === 'object') {
                const b = block as Record<string, any>;
                if (typeof b.text === 'string' && b.text.trim()) {
                    texts.push(b.text.trim());
                } else if (typeof b.content === 'string' && b.content.trim()) {
                    texts.push(b.content.trim());
                }
            }
        }
        return texts.join('\n').trim();
    }
    if (typeof parsed === 'object' && parsed !== null) {
        const obj = parsed as Record<string, any>;
        if (typeof obj.text === 'string') return obj.text;
    }
    return String(content);
}

export default function PostAdminDetailDialog({
    open,
    onOpenChange,
    postId,
    onUpdated,
}: PostAdminDetailDialogProps) {
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [post, setPost] = useState<any>(null);
    const [images, setImages] = useState<any[]>([]);
    const [tags, setTags] = useState<any[]>([]);

    // Delete reason toggle
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [deleteReason, setDeleteReason] = useState('');

    // Extend purge toggle
    const [extendOpen, setExtendOpen] = useState(false);
    const [extendDays, setExtendDays] = useState('7');
    const [extendReason, setExtendReason] = useState('');

    // Report/Appeal detail dialog
    const [reportDialogOpen, setReportDialogOpen] = useState(false);

    // Curation state
    const [selectedGrade, setSelectedGrade] = useState<'NORMAL_FEED' | 'LOOKBOOK_CANDIDATE' | 'MAIN_LOOKBOOK'>('NORMAL_FEED');
    const [isAutoSpecies, setIsAutoSpecies] = useState(true);
    const [selectedSpecies, setSelectedSpecies] = useState<string[]>([]);

    const fetchDetail = useCallback(async (targetId: string) => {
        setLoading(true);
        try {
            const res = await axiosInstance.get(`/admin/posts/${targetId}/detail`);
            const nextPost = res.data?.post || null;
            setPost(nextPost);
            setImages(res.data?.images || []);
            setTags(res.data?.tags || []);
            if (nextPost) {
                setSelectedGrade((nextPost.curation_grade as any) || 'NORMAL_FEED');
                setIsAutoSpecies(nextPost.curation_target_species === null || nextPost.curation_target_species === undefined);
                const eff = nextPost.effective_target_species || nextPost.auto_detected_species || [];
                setSelectedSpecies(Array.isArray(eff) ? eff : []);
            }
        } catch {
            toaster.create({ title: '게시글 상세 정보를 불러오지 못했습니다.', type: 'error' });
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (open && postId) {
            setDeleteOpen(false);
            setDeleteReason('');
            setExtendOpen(false);
            setExtendDays('7');
            setExtendReason('');
            fetchDetail(postId);
        } else if (!open) {
            setPost(null);
            setImages([]);
            setTags([]);
        }
    }, [open, postId, fetchDetail]);

    const formatDateStr = (d?: string | null) => {
        if (!d) return '-';
        const parsed = new Date(d);
        if (Number.isNaN(parsed.getTime())) return '-';
        return parsed.toLocaleString('ko-KR');
    };

    const handleToggleSensitive = async (img: any) => {
        if (!img?.id) return;
        setSubmitting(true);
        try {
            const nextSensitive = !img.is_sensitive;
            await axiosInstance.patch(`/admin/post-images/${img.id}/sensitive`, {
                is_sensitive: nextSensitive,
            });
            toaster.create({
                title: nextSensitive ? '민감 이미지 블러가 적용되었습니다.' : '민감 이미지 블러가 해제되었습니다.',
                type: 'success',
            });
            if (postId) await fetchDetail(postId);
            onUpdated?.();
        } catch (err: any) {
            toaster.create({ title: err?.response?.data?.message || '민감 블러 변경에 실패했습니다.', type: 'error' });
        } finally {
            setSubmitting(false);
        }
    };

    const handleSpeciesToggle = (speciesKey: string) => {
        setIsAutoSpecies(false);
        if (speciesKey === 'ALL') {
            setSelectedSpecies(['ALL']);
            return;
        }
        setSelectedSpecies((prev) => {
            const withoutAll = prev.filter((s) => s !== 'ALL');
            if (withoutAll.includes(speciesKey)) {
                return withoutAll.filter((s) => s !== speciesKey);
            }
            return [...withoutAll, speciesKey];
        });
    };

    const handleResetAutoSpecies = () => {
        const auto = post?.auto_detected_species || [];
        setSelectedSpecies(Array.isArray(auto) ? auto : []);
        setIsAutoSpecies(true);
    };

    const handleApplyCuration = async () => {
        if (!post?.id) return;
        setSubmitting(true);
        try {
            await axiosInstance.patch(`/admin/posts/${post.id}/curation`, {
                curation_grade: selectedGrade,
                curation_target_species:
                    selectedGrade === 'NORMAL_FEED'
                        ? undefined
                        : isAutoSpecies
                            ? null
                            : selectedSpecies,
            });
            const labelMap = {
                NORMAL_FEED: '일반 피드',
                LOOKBOOK_CANDIDATE: '메인 후보',
                MAIN_LOOKBOOK: '메인 룩북',
            };
            toaster.create({ title: `큐레이션이 '${labelMap[selectedGrade]}'(으)로 적용되었습니다.`, type: 'success' });
            await fetchDetail(String(post.id));
            onUpdated?.();
        } catch (err: any) {
            toaster.create({ title: err?.response?.data?.message || '큐레이션 적용에 실패했습니다.', type: 'error' });
        } finally {
            setSubmitting(false);
        }
    };

    const handleStatusChange = async (status: 'PUBLISHED' | 'HIDDEN' | 'DELETED', reason?: string) => {
        if (!post?.id) return;
        if (status === 'DELETED' && !reason?.trim()) {
            toaster.create({ title: '삭제 사유를 입력해주세요.', type: 'warning' });
            return;
        }
        setSubmitting(true);
        try {
            await axiosInstance.patch(`/admin/posts/${post.id}/status`, {
                status,
                ...(reason?.trim() ? { reason: reason.trim() } : {}),
            });
            const msgMap = {
                PUBLISHED: '게시글이 게시 복구되었습니다.',
                HIDDEN: '게시글이 숨김 처리되었습니다.',
                DELETED: '게시글이 삭제(30일 유예) 처리되었습니다.',
            };
            toaster.create({ title: msgMap[status], type: 'success' });
            setDeleteOpen(false);
            setDeleteReason('');
            await fetchDetail(String(post.id));
            onUpdated?.();
        } catch (err: any) {
            toaster.create({ title: err?.response?.data?.message || '게시글 상태 변경에 실패했습니다.', type: 'error' });
        } finally {
            setSubmitting(false);
        }
    };

    const handleRestoreDeleted = async () => {
        if (!post?.id) return;
        setSubmitting(true);
        try {
            await axiosInstance.patch(`/admin/posts/${post.id}/restore`);
            toaster.create({ title: '삭제된 게시글이 게시 복구되었습니다.', type: 'success' });
            await fetchDetail(String(post.id));
            onUpdated?.();
        } catch (err: any) {
            toaster.create({ title: err?.response?.data?.message || '게시글 복구에 실패했습니다.', type: 'error' });
        } finally {
            setSubmitting(false);
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

    const purgeDate = post?.purge_scheduled_at ? new Date(post.purge_scheduled_at) : null;
    const purgeDDay = purgeDate ? Math.max(0, Math.ceil((purgeDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))) : null;
    const maxExtend = Math.max(0, 30 - Number(post?.admin_extended_days || 0));
    const roleBadge = getRoleBadgeProps(post?.author_role);
    const contentPreview = extractTextFromContent(post?.content);
    const hasReportsOrAppeals = Number(post?.report_count || 0) > 0 || Number(post?.appeal_count || 0) > 0;

    return (
        <>
            <Dialog.Root open={open} onOpenChange={(e) => onOpenChange(e.open)} size="xl" placement="center">
                <Portal>
                    <Dialog.Backdrop bg="blackAlpha.600" backdropFilter="blur(4px)" zIndex={1400} />
                    <Dialog.Positioner zIndex={1401} p={4}>
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
                                    {post ? (
                                        <Box flex={1} minW={0}>
                                            <HStack gap={2} mb={2} flexWrap="wrap">
                                                {post.board_name && (
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
                                                        {post.board_name}
                                                    </Box>
                                                )}
                                                <Box
                                                    bg={
                                                        post.status === 'DELETED'
                                                            ? 'rgba(239, 68, 68, 0.14)'
                                                            : post.status === 'HIDDEN'
                                                                ? 'rgba(245, 158, 11, 0.14)'
                                                                : 'rgba(16, 185, 129, 0.14)'
                                                    }
                                                    color={
                                                        post.status === 'DELETED'
                                                            ? '#EF4444'
                                                            : post.status === 'HIDDEN'
                                                                ? '#D97706'
                                                                : '#10B981'
                                                    }
                                                    fontSize="11px"
                                                    fontWeight="800"
                                                    px={2.5}
                                                    py={0.5}
                                                    borderRadius="999px"
                                                >
                                                    {post.status === 'DELETED' ? '삭제됨' : post.status === 'HIDDEN' ? '숨김' : '게시 중'}
                                                </Box>
                                                {hasReportsOrAppeals && (
                                                    <Button
                                                        size="2xs"
                                                        variant="outline"
                                                        borderColor="rgba(239, 68, 68, 0.35)"
                                                        color="#EF4444"
                                                        borderRadius="999px"
                                                        px={2.5}
                                                        gap={1}
                                                        onClick={() => setReportDialogOpen(true)}
                                                    >
                                                        <LuShieldAlert size={12} />
                                                        신고 · 이의 상세 보기 ({Number(post.report_count || 0)}/{Number(post.appeal_count || 0)})
                                                    </Button>
                                                )}
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

                                            <HStack gap={1.5} mt={1.5} flexWrap="wrap" align="center">
                                                <Text fontSize="12px" color="var(--waba-ink-3)">
                                                    작성자: {post.author_nickname || '-'}
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
                                                    ({post.author_email || '-'})
                                                </Text>
                                            </HStack>

                                            <Text fontSize="11.5px" color="var(--waba-ink-3)" mt={1}>
                                                조회 {post.view_count ?? 0} · ♥ {post.like_count ?? 0} · 북마크 {post.bookmark_count ?? 0} · 댓글 {post.comment_count ?? 0} · 작성일 {formatDateStr(post.created_at)}
                                            </Text>
                                        </Box>
                                    ) : (
                                        <Dialog.Title fontSize="17px" fontWeight="800" color="var(--waba-ink)">
                                            게시글 상세 관리
                                        </Dialog.Title>
                                    )}
                                    <CloseButton size="sm" rounded="full" color="var(--waba-ink)" flexShrink={0} _hover={{ bg: 'var(--waba-surface)' }} onClick={() => onOpenChange(false)} />
                                </Flex>
                            </Dialog.Header>

                            {/* Body */}
                            <Dialog.Body p={0} pt={4} overflowY="auto" flex={1}>
                                {loading ? (
                                    <Flex py={16} justify="center">
                                        <Spinner size="lg" color="#6338A9" />
                                    </Flex>
                                ) : post ? (
                                    <VStack align="stretch" gap={5}>
                                        {/* 본문 미리보기 & 해시태그 */}
                                        <Box
                                            p={4}
                                            borderRadius="16px"
                                            bg="var(--waba-surface)"
                                            border="1px solid"
                                            borderColor="var(--waba-line)"
                                        >
                                            <Text fontSize="12px" fontWeight="800" color="var(--waba-ink-2)" mb={2}>
                                                본문 미리보기
                                            </Text>
                                            <Text fontSize="13px" color="var(--waba-ink)" whiteSpace="pre-wrap" lineHeight="1.6">
                                                {contentPreview || '(본문 텍스트 없음)'}
                                            </Text>
                                            {tags.length > 0 && (
                                                <HStack gap={1.5} mt={3} flexWrap="wrap">
                                                    {tags.map((t: any, idx: number) => (
                                                        <Box
                                                            key={t.id || idx}
                                                            bg="var(--waba-purple-soft)"
                                                            color="var(--waba-purple-text)"
                                                            fontSize="11px"
                                                            fontWeight="700"
                                                            px={2}
                                                            py="2px"
                                                            borderRadius="999px"
                                                        >
                                                            #{typeof t === 'string' ? t : t.name || t.tag_name}
                                                        </Box>
                                                    ))}
                                                </HStack>
                                            )}
                                        </Box>

                                        {/* 첨부 이미지 & 민감 이미지 블러 토글 */}
                                        {images.length > 0 && (
                                            <Box
                                                p={4}
                                                borderRadius="16px"
                                                bg="var(--waba-surface)"
                                                border="1px solid"
                                                borderColor="var(--waba-line)"
                                            >
                                                <Text fontSize="12px" fontWeight="800" color="var(--waba-ink-2)" mb={3}>
                                                    첨부 이미지 ({images.length}장)
                                                </Text>
                                                <Grid templateColumns={{ base: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }} gap={3}>
                                                    {images.map((img: any) => (
                                                        <Box
                                                            key={img.id}
                                                            borderRadius="12px"
                                                            overflow="hidden"
                                                            bg="var(--waba-card)"
                                                            border="1px solid"
                                                            borderColor="var(--waba-line)"
                                                        >
                                                            <Box position="relative" h="130px" bg="var(--waba-surface)" overflow="hidden">
                                                                <Image
                                                                    src={img.image_url || img.url}
                                                                    alt="첨부 이미지"
                                                                    w="100%"
                                                                    h="100%"
                                                                    objectFit="cover"
                                                                    filter={img.is_sensitive ? 'blur(12px)' : 'none'}
                                                                    transform={img.is_sensitive ? 'scale(1.08)' : 'none'}
                                                                    transition="filter 0.2s ease"
                                                                />
                                                                {img.is_sensitive && (
                                                                    <Flex
                                                                        position="absolute"
                                                                        inset={0}
                                                                        align="center"
                                                                        justify="center"
                                                                        bg="blackAlpha.400"
                                                                    >
                                                                        <Box
                                                                            bg="rgba(239, 68, 68, 0.9)"
                                                                            color="white"
                                                                            fontSize="10.5px"
                                                                            fontWeight="800"
                                                                            px={2}
                                                                            py={0.5}
                                                                            borderRadius="999px"
                                                                        >
                                                                            민감 블러
                                                                        </Box>
                                                                    </Flex>
                                                                )}
                                                            </Box>
                                                            <Flex p={2} justify="space-between" align="center">
                                                                <Text fontSize="11px" color="var(--waba-ink-3)" fontWeight="600">
                                                                    {img.is_sensitive ? '블러 적용됨' : '일반 노출'}
                                                                </Text>
                                                                <Button
                                                                    size="2xs"
                                                                    variant={img.is_sensitive ? 'solid' : 'outline'}
                                                                    bg={img.is_sensitive ? '#EF4444' : 'transparent'}
                                                                    color={img.is_sensitive ? '#FFFFFF' : 'var(--waba-ink)'}
                                                                    borderColor="var(--waba-line)"
                                                                    borderRadius="999px"
                                                                    px={2.5}
                                                                    gap={1}
                                                                    loading={submitting}
                                                                    onClick={() => handleToggleSensitive(img)}
                                                                >
                                                                    <LuEyeOff size={11} />
                                                                    민감 블러
                                                                </Button>
                                                            </Flex>
                                                        </Box>
                                                    ))}
                                                </Grid>
                                            </Box>
                                        )}

                                        {/* 큐레이션 등급 결정 */}
                                        <Box
                                            p={4}
                                            borderRadius="16px"
                                            bg="var(--waba-surface)"
                                            border="1px solid"
                                            borderColor="var(--waba-line)"
                                        >
                                            <Flex justify="space-between" align="center" mb={3} flexWrap="wrap" gap={2}>
                                                <Text fontSize="12.5px" fontWeight="800" color="var(--waba-ink)">
                                                    큐레이션 등급 결정
                                                </Text>
                                                {post.promoted_at && (
                                                    <Text fontSize="11px" color="var(--waba-purple-text)" fontWeight="700">
                                                        승격일시: {formatDateStr(post.promoted_at)}
                                                    </Text>
                                                )}
                                            </Flex>
                                            <HStack gap={2} flexWrap="wrap">
                                                {[
                                                    { key: 'NORMAL_FEED' as const, label: '일반 피드' },
                                                    { key: 'LOOKBOOK_CANDIDATE' as const, label: '메인 후보' },
                                                    { key: 'MAIN_LOOKBOOK' as const, label: '메인 룩북' },
                                                ].map((opt) => {
                                                    const active = selectedGrade === opt.key;
                                                    return (
                                                        <Button
                                                            key={opt.key}
                                                            size="sm"
                                                            h="34px"
                                                            px={4}
                                                            borderRadius="999px"
                                                            bg={active ? '#6338A9' : 'var(--waba-card)'}
                                                            color={active ? '#FFFFFF' : 'var(--waba-ink-2)'}
                                                            border="1px solid"
                                                            borderColor={active ? '#6338A9' : 'var(--waba-line)'}
                                                            fontSize="12.5px"
                                                            fontWeight="700"
                                                            onClick={() => setSelectedGrade(opt.key)}
                                                        >
                                                            {opt.label}
                                                        </Button>
                                                    );
                                                })}
                                            </HStack>

                                            {(selectedGrade === 'MAIN_LOOKBOOK' || selectedGrade === 'LOOKBOOK_CANDIDATE') && (
                                                <Box mt={4} pt={3.5} borderTop="1px solid" borderColor="var(--waba-line)">
                                                    <Flex justify="space-between" align="center" mb={2} flexWrap="wrap" gap={2}>
                                                        <HStack gap={2}>
                                                            <Text fontSize="12px" fontWeight="800" color="var(--waba-ink)">
                                                                노출 대상 동물
                                                            </Text>
                                                            <Box
                                                                bg={isAutoSpecies ? 'rgba(16, 185, 129, 0.14)' : 'var(--waba-purple-soft)'}
                                                                color={isAutoSpecies ? '#10B981' : 'var(--waba-purple-text)'}
                                                                fontSize="10px"
                                                                fontWeight="800"
                                                                px={2}
                                                                py="1px"
                                                                borderRadius="999px"
                                                            >
                                                                {isAutoSpecies ? '태그된 펫 기준 자동 선택됨' : '관리자 수동 지정됨'}
                                                            </Box>
                                                        </HStack>
                                                        {!isAutoSpecies && (
                                                            <Button
                                                                size="2xs"
                                                                variant="outline"
                                                                borderColor="var(--waba-line)"
                                                                color="var(--waba-ink-2)"
                                                                borderRadius="999px"
                                                                px={2.5}
                                                                onClick={handleResetAutoSpecies}
                                                            >
                                                                태그된 펫 기준으로 초기화
                                                            </Button>
                                                        )}
                                                    </Flex>

                                                    <HStack gap={1.5} flexWrap="wrap" mb={2}>
                                                        {CURATION_SPECIES_OPTIONS.map((sp) => {
                                                            const active = selectedSpecies.includes(sp.key);
                                                            return (
                                                                <Button
                                                                    key={sp.key}
                                                                    size="xs"
                                                                    h="28px"
                                                                    px={3}
                                                                    borderRadius="999px"
                                                                    bg={active ? '#6338A9' : 'var(--waba-card)'}
                                                                    color={active ? '#FFFFFF' : 'var(--waba-ink-2)'}
                                                                    border="1px solid"
                                                                    borderColor={active ? '#6338A9' : 'var(--waba-line)'}
                                                                    fontSize="11.5px"
                                                                    fontWeight="700"
                                                                    onClick={() => handleSpeciesToggle(sp.key)}
                                                                >
                                                                    {sp.label}
                                                                </Button>
                                                            );
                                                        })}
                                                    </HStack>

                                                    <Text fontSize="11px" color="var(--waba-ink-3)">
                                                        여기서 동물을 변경해도 게시글 원본의 펫 태그 데이터는 변경되지 않습니다.
                                                    </Text>
                                                </Box>
                                            )}

                                            <Flex justify="flex-end" mt={4}>
                                                <Button
                                                    size="sm"
                                                    h="34px"
                                                    px={5}
                                                    borderRadius="999px"
                                                    bg="#6338A9"
                                                    color="#FFFFFF"
                                                    _hover={{ bg: '#522B8F' }}
                                                    fontSize="12.5px"
                                                    fontWeight="700"
                                                    loading={submitting}
                                                    onClick={handleApplyCuration}
                                                >
                                                    큐레이션 적용
                                                </Button>
                                            </Flex>
                                        </Box>

                                        {/* 게시글 상태 관리 */}
                                        <Box
                                            p={4}
                                            borderRadius="16px"
                                            bg="var(--waba-surface)"
                                            border="1px solid"
                                            borderColor="var(--waba-line)"
                                        >
                                            <Text fontSize="12.5px" fontWeight="800" color="var(--waba-ink)" mb={3}>
                                                게시글 상태 관리
                                            </Text>

                                            {post.status === 'DELETED' ? (
                                                <VStack align="stretch" gap={3}>
                                                    <Box p={3} borderRadius="12px" bg="rgba(239, 68, 68, 0.08)" border="1px solid" borderColor="rgba(239, 68, 68, 0.25)">
                                                        <Text fontSize="12px" fontWeight="700" color="#EF4444">
                                                            삭제 사유: {post.delete_reason || '-'}
                                                        </Text>
                                                        {purgeDate && (
                                                            <Text fontSize="11.5px" color="var(--waba-ink-2)" mt={1}>
                                                                영구 삭제 예정: {formatDateStr(post.purge_scheduled_at)} (D-{purgeDDay})
                                                                {Number(post.admin_extended_days || 0) > 0 ? ` · +${post.admin_extended_days}일 연장됨` : ''}
                                                            </Text>
                                                        )}
                                                    </Box>

                                                    <HStack gap={2} flexWrap="wrap">
                                                        {maxExtend > 0 && (
                                                            <Button
                                                                size="xs"
                                                                variant="outline"
                                                                borderColor="var(--waba-line)"
                                                                color="var(--waba-ink)"
                                                                borderRadius="999px"
                                                                px={3.5}
                                                                onClick={() => setExtendOpen((prev) => !prev)}
                                                            >
                                                                삭제일 연장
                                                            </Button>
                                                        )}
                                                        <Button
                                                            size="xs"
                                                            bg="#10B981"
                                                            color="#FFFFFF"
                                                            borderRadius="999px"
                                                            px={4}
                                                            loading={submitting}
                                                            onClick={handleRestoreDeleted}
                                                        >
                                                            게시 복구
                                                        </Button>
                                                    </HStack>

                                                    {extendOpen && (
                                                        <HStack gap={2} flexWrap="wrap">
                                                            <Input
                                                                type="number"
                                                                min={1}
                                                                max={maxExtend}
                                                                value={extendDays}
                                                                onChange={(e) => setExtendDays(e.target.value)}
                                                                w="72px"
                                                                size="xs"
                                                                h="32px"
                                                                bg="var(--waba-card)"
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
                                                                h="32px"
                                                                bg="var(--waba-card)"
                                                                borderColor="var(--waba-line)"
                                                                color="var(--waba-ink)"
                                                            />
                                                            <Button size="xs" variant="ghost" onClick={() => setExtendOpen(false)}>취소</Button>
                                                            <Button size="xs" bg="#6338A9" color="#FFFFFF" loading={submitting} onClick={handleExtendPurge}>
                                                                연장 적용
                                                            </Button>
                                                        </HStack>
                                                    )}
                                                </VStack>
                                            ) : (
                                                <VStack align="stretch" gap={3}>
                                                    <HStack gap={2} flexWrap="wrap">
                                                        {post.status === 'PUBLISHED' ? (
                                                            <Button
                                                                size="xs"
                                                                variant="outline"
                                                                borderColor="var(--waba-line)"
                                                                color="var(--waba-ink)"
                                                                borderRadius="999px"
                                                                px={4}
                                                                loading={submitting}
                                                                onClick={() => handleStatusChange('HIDDEN')}
                                                            >
                                                                숨김
                                                            </Button>
                                                        ) : (
                                                            <Button
                                                                size="xs"
                                                                bg="#10B981"
                                                                color="#FFFFFF"
                                                                borderRadius="999px"
                                                                px={4}
                                                                loading={submitting}
                                                                onClick={() => handleStatusChange('PUBLISHED')}
                                                            >
                                                                게시 복구
                                                            </Button>
                                                        )}

                                                        <Button
                                                            size="xs"
                                                            bg="#E53E3E"
                                                            color="#FFFFFF"
                                                            borderRadius="999px"
                                                            px={4}
                                                            onClick={() => setDeleteOpen((prev) => !prev)}
                                                        >
                                                            삭제 (30일 유예)
                                                        </Button>
                                                    </HStack>

                                                    {deleteOpen && (
                                                        <HStack gap={2} flexWrap="wrap">
                                                            <Input
                                                                flex={1}
                                                                minW="200px"
                                                                value={deleteReason}
                                                                onChange={(e) => setDeleteReason(e.target.value)}
                                                                placeholder="삭제 사유를 입력하세요..."
                                                                size="xs"
                                                                h="32px"
                                                                bg="var(--waba-card)"
                                                                borderColor="var(--waba-line)"
                                                                color="var(--waba-ink)"
                                                            />
                                                            <Button size="xs" variant="ghost" onClick={() => setDeleteOpen(false)}>
                                                                취소
                                                            </Button>
                                                            <Button
                                                                size="xs"
                                                                bg="#E53E3E"
                                                                color="#FFFFFF"
                                                                loading={submitting}
                                                                onClick={() => handleStatusChange('DELETED', deleteReason)}
                                                            >
                                                                삭제 확정
                                                            </Button>
                                                        </HStack>
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

            <PostReportDetailDialog
                open={reportDialogOpen}
                onOpenChange={setReportDialogOpen}
                postId={post?.id ? String(post.id) : null}
                onUpdated={() => {
                    if (postId) fetchDetail(postId);
                    onUpdated?.();
                }}
            />
        </>
    );
}
