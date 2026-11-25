'use client'

import { Box, Button, Dialog, FormatNumber, Heading, HStack, IconButton, Menu, Portal, Stack, Text, Textarea, VStack } from "@chakra-ui/react";
import { useEffect, useRef, useState } from "react";
import { MoreHorizontal, Pencil, Pin, Trash2 } from "lucide-react";
import { Comment as CommentType, User } from "@/interface";
import { formatRelativeTime } from "@/utils/simpleUtils";
import { isAuthenticated } from "@/utils/authUtils";
import axiosInstance from "@/utils/api";
import { toaster } from "@/components/ui/toaster";
import UserAvatar from "../../common/UserAvatar";
import LikeBurstButton from "../../common/LikeBurstButton";

export interface CommentProps {
    postId: string;
    postAuthorId?: string;
    comments?: CommentType[];
    commentCount?: number;
    currentUser?: User | null;
    onCommentsUpdate?: (comments: CommentType[], count: number) => void;
    onRequireLogin: () => void;
}

export default function Comment({
    postId,
    postAuthorId,
    comments = [],
    commentCount,
    currentUser,
    onCommentsUpdate,
    onRequireLogin
}: CommentProps) {
    const [commentContent, setCommentContent] = useState('');
    const [isSubmittingComment, setIsSubmittingComment] = useState(false);
    const [isAnonymousComment, setIsAnonymousComment] = useState(false);
    // 기본 정렬: 'oldest' (오래된 댓글이 맨 위로 올라오는 등록순)
    const [commentSort, setCommentSort] = useState<'oldest' | 'latest' | 'popular'>('oldest');
    const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
    const [editContent, setEditContent] = useState('');
    const [isSavingEdit, setIsSavingEdit] = useState(false);
    const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
    const [isDeletingComment, setIsDeletingComment] = useState(false);
    const [pinningCommentId, setPinningCommentId] = useState<string | null>(null);

    const isPostViewerAuthor = Boolean(currentUser?.id && postAuthorId && currentUser.id === postAuthorId);
    const pinnedCount = comments.filter((c) => Boolean(c.is_pinned)).length;

    const [likingCommentIds, setLikingCommentIds] = useState<Record<string, boolean>>({});
    const commentsRef = useRef<CommentType[]>(comments);

    useEffect(() => {
        commentsRef.current = comments;
    }, [comments]);

    const handleToggleCommentLike = async (commentId: string) => {
        if (!isAuthenticated()) {
            onRequireLogin();
            return;
        }
        if (likingCommentIds[commentId]) return;

        const currentList = commentsRef.current;
        const target = currentList.find((c) => String(c.id) === String(commentId));
        if (!target) return;

        const prevLiked = Boolean(target.is_liked);
        const prevCount = target.like_count || 0;
        const nextLiked = !prevLiked;
        const nextCount = Math.max(0, prevCount + (nextLiked ? 1 : -1));

        const optimisticList = currentList.map((c) =>
            String(c.id) === String(commentId)
                ? { ...c, is_liked: nextLiked, like_count: nextCount }
                : c
        );
        commentsRef.current = optimisticList;
        onCommentsUpdate?.(optimisticList, commentCount ?? optimisticList.length);
        setLikingCommentIds((prev) => ({ ...prev, [commentId]: true }));

        try {
            const res = await axiosInstance.post(`/post/comment/${commentId}/like`);
            const serverLiked = res.data?.is_liked ?? nextLiked;
            const serverCount = res.data?.like_count ?? nextCount;
            const reconciledList = commentsRef.current.map((c) =>
                String(c.id) === String(commentId)
                    ? { ...c, is_liked: Boolean(serverLiked), like_count: serverCount }
                    : c
            );
            commentsRef.current = reconciledList;
            onCommentsUpdate?.(reconciledList, commentCount ?? reconciledList.length);
        } catch (error: any) {
            const rollbackList = commentsRef.current.map((c) =>
                String(c.id) === String(commentId)
                    ? { ...c, is_liked: prevLiked, like_count: prevCount }
                    : c
            );
            commentsRef.current = rollbackList;
            onCommentsUpdate?.(rollbackList, commentCount ?? rollbackList.length);
            toaster.create({
                title: error?.response?.data?.message || '댓글 좋아요 처리에 실패했습니다.',
                type: 'error',
            });
        } finally {
            setLikingCommentIds((prev) => {
                const next = { ...prev };
                delete next[commentId];
                return next;
            });
        }
    };

    const handleTogglePinComment = async (commentId: string) => {
        if (!isPostViewerAuthor || pinningCommentId) return;
        setPinningCommentId(commentId);
        try {
            const res = await axiosInstance.patch(`/post/${postId}/comments/${commentId}/pin`);
            if (Array.isArray(res.data?.comments)) {
                onCommentsUpdate?.(res.data.comments, commentCount ?? res.data.comments.length);
            } else {
                const updatedComments = comments.map((c) =>
                    c.id === commentId
                        ? {
                            ...c,
                            is_pinned: !Boolean(c.is_pinned),
                            pinned_at: !Boolean(c.is_pinned) ? new Date().toISOString() : null,
                        }
                        : c
                );
                onCommentsUpdate?.(updatedComments, commentCount ?? updatedComments.length);
            }
            const target = comments.find((c) => c.id === commentId);
            toaster.create({
                title: target && Boolean(target.is_pinned) ? '댓글 고정이 해제되었습니다.' : '댓글이 상단에 고정되었습니다.',
                type: 'success',
            });
        } catch (error: any) {
            const msg = error?.response?.data?.message || '고정 댓글은 최대 2개까지 설정할 수 있습니다.';
            toaster.create({ title: msg, type: 'error' });
        } finally {
            setPinningCommentId(null);
        }
    };

    const handleCreateComment = async () => {
        if (!isAuthenticated()) {
            onRequireLogin();
            return;
        }

        if (!commentContent.trim()) {
            toaster.create({ title: '댓글 내용을 입력해주세요.', type: 'warning' });
            return;
        }

        setIsSubmittingComment(true);
        try {
            const res = await axiosInstance.post(`/post/${postId}/comment`, {
                content: commentContent.trim(),
                is_anonymous: isAnonymousComment
            });

            if (res.data?.success && res.data.comment) {
                const updatedComments = [...comments, res.data.comment];
                const updatedCount = res.data.comment_count;

                onCommentsUpdate?.(updatedComments, updatedCount);

                setCommentContent('');
                setIsAnonymousComment(false);
                toaster.create({
                    title: '댓글이 등록되었습니다.',
                    type: 'success'
                });
            }
        } catch (error: any) {
            const msg = error.response?.data?.message || '댓글 등록에 실패했습니다.';
            toaster.create({ title: msg, type: 'error' });
        } finally {
            setIsSubmittingComment(false);
        }
    };

    const handleDeleteComment = async (commentId: string) => {
        if (isDeletingComment) return;
        setIsDeletingComment(true);

        try {
            const res = await axiosInstance.delete(`/post/comment/${commentId}`);
            if (res.data?.success) {
                const updatedComments = comments.filter(c => c.id !== commentId);
                const updatedCount = res.data.comment_count;

                onCommentsUpdate?.(updatedComments, updatedCount);

                toaster.create({
                    title: '댓글이 삭제되었습니다.',
                    type: 'info'
                });
            }
        } catch (error: any) {
            const msg = error.response?.data?.message || '댓글 삭제에 실패했습니다.';
            toaster.create({ title: msg, type: 'error' });
        } finally {
            setIsDeletingComment(false);
            setDeleteTargetId(null);
        }
    };

    const startEditComment = (commentId: string, content: string) => {
        setEditingCommentId(commentId);
        setEditContent(content);
    };

    const cancelEditComment = () => {
        setEditingCommentId(null);
        setEditContent('');
    };

    const handleUpdateComment = async (commentId: string) => {
        const trimmed = editContent.trim();
        if (!trimmed || isSavingEdit) return;
        setIsSavingEdit(true);
        try {
            const res = await axiosInstance.put(`/post/comment/${commentId}`, { content: trimmed });
            if (res.data?.success) {
                const updatedComments = comments.map(c => c.id === commentId ? { ...c, content: trimmed } : c);
                onCommentsUpdate?.(updatedComments, commentCount ?? updatedComments.length);
                cancelEditComment();
                toaster.create({ title: '댓글이 수정되었습니다.', type: 'success' });
            }
        } catch (error: any) {
            const msg = error.response?.data?.message || '댓글 수정에 실패했습니다.';
            toaster.create({ title: msg, type: 'error' });
        } finally {
            setIsSavingEdit(false);
        }
    };

    // 정렬 로직 (고정 댓글 최상단 우선)
    const sortedComments = [...comments].sort((a, b) => {
        const pinnedA = Boolean(a.is_pinned) ? 1 : 0;
        const pinnedB = Boolean(b.is_pinned) ? 1 : 0;
        if (pinnedA !== pinnedB) return pinnedB - pinnedA;

        if (commentSort === 'popular') {
            const diff = (b.like_count || 0) - (a.like_count || 0);
            if (diff !== 0) return diff;
        }
        if (commentSort === 'latest') {
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        }
        // 'oldest' (기본값): 등록순 (오래된 댓글이 맨 위로)
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });

    const displayCount = commentCount ?? comments.length;

    return (
        <Stack gap="5" mt={4}>
            {/* 댓글 삭제 확인 모달 */}
            <Dialog.Root
                open={deleteTargetId !== null}
                onOpenChange={(e) => { if (!e.open) setDeleteTargetId(null); }}
                placement="center"
                size="sm"
            >
                <Portal>
                    <Dialog.Backdrop />
                    <Dialog.Positioner>
                        <Dialog.Content borderRadius="24px" p={6} bg="var(--waba-card)">
                            <Dialog.Header p={0} mb={2}>
                                <Dialog.Title fontSize="18px" fontWeight="800" color="var(--waba-ink)">
                                    댓글을 삭제할까요?
                                </Dialog.Title>
                            </Dialog.Header>
                            <Dialog.Body p={0} mb={6}>
                                <Text fontSize="13px" color="var(--waba-ink-2)">삭제한 댓글은 복구할 수 없습니다.</Text>
                            </Dialog.Body>
                            <Dialog.Footer p={0} gap={2}>
                                <Button variant="outline" rounded="full" flex={1} color="var(--waba-ink)" borderColor="var(--waba-line)" onClick={() => setDeleteTargetId(null)} disabled={isDeletingComment}>
                                    취소
                                </Button>
                                <Button
                                    bg="red.500"
                                    color="white"
                                    _hover={{ bg: 'red.600' }}
                                    rounded="full"
                                    flex={1}
                                    loading={isDeletingComment}
                                    onClick={() => deleteTargetId && handleDeleteComment(deleteTargetId)}
                                >
                                    삭제
                                </Button>
                            </Dialog.Footer>
                        </Dialog.Content>
                    </Dialog.Positioner>
                </Portal>
            </Dialog.Root>

            {/* 상단 헤더: 댓글 개수 & 고정 댓글 배지 & 정렬 옵션 */}
            <HStack justifyContent="space-between" flexWrap="wrap" gap={2}>
                <HStack gap={2} flexWrap="wrap">
                    <Heading fontSize="xl" color="var(--waba-ink)">댓글</Heading>
                    <Text fontSize="md" fontWeight="800" color="var(--waba-purple-text)">
                        {displayCount}
                    </Text>
                    <Box
                        bg="var(--waba-purple-soft)"
                        color="var(--waba-purple-text)"
                        border="1px solid"
                        borderColor="var(--waba-purple-border)"
                        fontSize="11px"
                        fontWeight="700"
                        px="10px"
                        py="3px"
                        borderRadius="full"
                    >
                        📌 고정 댓글 {pinnedCount}/2
                    </Box>
                </HStack>
                <HStack gap={1}>
                    <Button
                        size="xs"
                        variant="ghost"
                        fontWeight={commentSort === 'oldest' ? "800" : "500"}
                        color={commentSort === 'oldest' ? "var(--waba-ink)" : "var(--waba-ink-3)"}
                        onClick={() => setCommentSort('oldest')}
                    >
                        등록순
                    </Button>
                    <Text color="gray.300">·</Text>
                    <Button
                        size="xs"
                        variant="ghost"
                        fontWeight={commentSort === 'latest' ? "800" : "500"}
                        color={commentSort === 'latest' ? "var(--waba-ink)" : "var(--waba-ink-3)"}
                        onClick={() => setCommentSort('latest')}
                    >
                        최신순
                    </Button>
                    <Text color="gray.300">·</Text>
                    <Button
                        size="xs"
                        variant="ghost"
                        fontWeight={commentSort === 'popular' ? "800" : "500"}
                        color={commentSort === 'popular' ? "var(--waba-ink)" : "var(--waba-ink-3)"}
                        onClick={() => setCommentSort('popular')}
                    >
                        추천순
                    </Button>
                </HStack>
            </HStack>

            {/* 댓글 입력 카드 */}
            <Box
                borderRadius="20px"
                border="1px solid"
                borderColor="var(--waba-line)"
                bg="var(--waba-card)"
                p={4}
                boxShadow="0 4px 16px rgba(0, 0, 0, 0.03)"
                transition="all 0.2s"
                _focusWithin={{ borderColor: '#6338A9', boxShadow: '0 6px 20px rgba(99, 56, 169, 0.12)' }}
            >
                <HStack align="flex-start" gap={3}>
                    <UserAvatar
                        src={currentUser?.profile_image_url}
                        alt={currentUser?.nickname || '프로필'}
                        size="md"
                        border="1px solid"
                        borderColor="var(--waba-line)"
                    />
                    <VStack flex={1} align="stretch" gap={3}>
                        <Textarea
                            border="none"
                            outline="none"
                            p={0}
                            minH="70px"
                            resize="none"
                            fontSize="14px"
                            lineHeight="1.6"
                            placeholder={
                                currentUser
                                    ? "반려동물과 함께하는 공간에 대해 따뜻한 이야기를 남겨주세요."
                                    : "로그인 후 따뜻한 댓글을 남겨보세요. (클릭 시 로그인)"
                            }
                            value={commentContent}
                            onChange={(e) => setCommentContent(e.target.value)}
                            onClick={() => {
                                if (!currentUser) onRequireLogin();
                            }}
                            _focus={{ outline: 'none' }}
                        />
                        <HStack justify="space-between" pt={2} borderTop="1px solid" borderColor="blackAlpha.50">
                            <HStack
                                as="label"
                                cursor="pointer"
                                fontSize="12px"
                                color="var(--waba-ink-3)"
                                userSelect="none"
                                gap={1.5}
                            >
                                <input
                                    type="checkbox"
                                    checked={isAnonymousComment}
                                    onChange={(e) => setIsAnonymousComment(e.target.checked)}
                                    style={{ accentColor: '#5A31F4', cursor: 'pointer' }}
                                />
                                <Text>익명으로 남기기</Text>
                            </HStack>

                            <HStack gap={3}>
                                <Text fontSize="11px" color="var(--waba-ink-3)">
                                    {commentContent.length} / 500
                                </Text>
                                <Button
                                    size="sm"
                                    px={5}
                                    h="34px"
                                    borderRadius="full"
                                    bg="#6338A9"
                                    color="white"
                                    fontSize="13px"
                                    fontWeight="700"
                                    _hover={{ bg: '#532d91' }}
                                    disabled={!commentContent.trim() || isSubmittingComment}
                                    loading={isSubmittingComment}
                                    onClick={handleCreateComment}
                                >
                                    등록
                                </Button>
                            </HStack>
                        </HStack>
                    </VStack>
                </HStack>
            </Box>

            {/* 댓글 목록 */}
            <Stack gap={3} mt={2}>
                {sortedComments.length === 0 ? (
                    <Box
                        textAlign="center"
                        py={12}
                        borderRadius="24px"
                        bg="var(--waba-surface)"
                        border="1px dashed"
                        borderColor="var(--waba-line)"
                    >
                        <Text fontSize="14px" fontWeight="700" color="var(--waba-ink)" mb={1}>
                            아직 등록된 댓글이 없습니다.
                        </Text>
                        <Text fontSize="12px" color="var(--waba-ink-3)">
                            이 공간에 대해 가장 먼저 따뜻한 한마디를 남겨보세요!
                        </Text>
                    </Box>
                ) : (
                    sortedComments.map((item) => {
                        const commentUserId = item.user_id || item.author?.id;
                        const isMyComment = Boolean(currentUser?.id && commentUserId && currentUser.id === commentUserId);
                        const isPostAuthor = Boolean(postAuthorId && commentUserId && postAuthorId === commentUserId);
                        const isPinned = Boolean(item.is_pinned);

                        return (
                            <Stack
                                key={item.id}
                                bg={isPinned ? 'var(--waba-purple-soft)' : 'var(--waba-card)'}
                                border="1px solid"
                                borderColor={isPinned ? 'var(--waba-purple-border)' : 'var(--waba-line)'}
                                p={4}
                                gap={3}
                                borderRadius="20px"
                                boxShadow="0 2px 8px rgba(0, 0, 0, 0.02)"
                                minW={0}
                            >
                                {isPinned && (
                                    <HStack gap={1.5}>
                                        <Box
                                            bg="#6338A9"
                                            color="white"
                                            fontSize="10px"
                                            fontWeight="800"
                                            px={2.5}
                                            py={0.5}
                                            borderRadius="full"
                                        >
                                            📌 작성자가 고정한 댓글
                                        </Box>
                                    </HStack>
                                )}
                                <HStack justifyContent="space-between" align="center" gap={2} flexWrap="wrap">
                                    <HStack alignItems="center" gap={3} minW={0}>
                                        <UserAvatar
                                            src={!item.is_anonymous ? item.author?.profile_image_url : null}
                                            alt={item.author?.nickname || "프로필"}
                                            size="sm"
                                        />
                                        <HStack gap={1.5} align="center" flexWrap="wrap" minW={0}>
                                            <Heading fontSize="sm" fontWeight="700" color="var(--waba-ink)">
                                                @{item.author?.nickname || "익명 집사"}
                                            </Heading>

                                            {/* ⭐️ 게시글 원작성자 뱃지 (누구에게나 보임) */}
                                            {isPostAuthor && (
                                                <Box
                                                    bg="var(--waba-purple-soft)"
                                                    color="var(--waba-purple-text)"
                                                    fontSize="10px"
                                                    fontWeight="800"
                                                    px={2}
                                                    py={0.5}
                                                    borderRadius="full"
                                                >
                                                    작성자
                                                </Box>
                                            )}

                                            {/* ⭐️ 내가 쓴 댓글 뱃지 (오직 나에게만 보임) */}
                                            {isMyComment && (
                                                <Box
                                                    bg="var(--waba-surface)"
                                                    color="var(--waba-ink-2)"
                                                    fontSize="10px"
                                                    fontWeight="800"
                                                    px={2}
                                                    py={0.5}
                                                    borderRadius="full"
                                                    border="1px solid"
                                                    borderColor="var(--waba-line)"
                                                >
                                                    내 댓글
                                                </Box>
                                            )}

                                            <Text fontSize="xs" color="var(--waba-ink-3)" ml={1}>
                                                {formatRelativeTime(item.created_at)}
                                            </Text>
                                        </HStack>
                                    </HStack>

                                    <HStack gap={2} flexShrink={0}>
                                        {isPostViewerAuthor && (
                                            <Button
                                                size="2xs"
                                                variant="outline"
                                                borderRadius="full"
                                                px={2.5}
                                                h="24px"
                                                fontSize="11px"
                                                fontWeight="700"
                                                borderColor={isPinned ? '#6338A9' : 'var(--waba-line)'}
                                                bg={isPinned ? '#6338A9' : 'var(--waba-surface)'}
                                                color={isPinned ? 'white' : 'var(--waba-ink-2)'}
                                                loading={pinningCommentId === item.id}
                                                onClick={() => handleTogglePinComment(item.id)}
                                                gap={1}
                                            >
                                                <Pin size={11} />
                                                {isPinned ? '고정 해제' : '고정하기'}
                                            </Button>
                                        )}
                                        {isMyComment && (
                                            <Menu.Root positioning={{ placement: "bottom-end" }}>
                                                <Menu.Trigger asChild>
                                                    <IconButton
                                                        aria-label="댓글 메뉴"
                                                        variant="ghost"
                                                        size="2xs"
                                                        rounded="full"
                                                        color="var(--waba-ink-3)"
                                                        _hover={{ color: 'var(--waba-ink)' }}
                                                    >
                                                        <MoreHorizontal size={16} />
                                                    </IconButton>
                                                </Menu.Trigger>
                                                <Portal>
                                                    <Menu.Positioner>
                                                        <Menu.Content
                                                            minW="130px"
                                                            borderRadius="16px"
                                                            p={1.5}
                                                            boxShadow="0 12px 32px -4px rgba(26, 28, 30, 0.12)"
                                                            border="1px solid"
                                                            borderColor="var(--waba-line)"
                                                            bg="var(--waba-card)"
                                                        >
                                                            <Menu.Item
                                                                value="edit"
                                                                cursor="pointer"
                                                                borderRadius="10px"
                                                                py={2}
                                                                px={3}
                                                                color="var(--waba-ink)"
                                                                _hover={{ bg: 'var(--waba-surface)' }}
                                                                _highlighted={{ bg: 'var(--waba-surface)' }}
                                                                onClick={() => startEditComment(item.id, item.content)}
                                                            >
                                                                <Pencil size={14} />
                                                                <Text fontSize="13px" fontWeight="600">수정하기</Text>
                                                            </Menu.Item>
                                                            <Menu.Item
                                                                value="delete"
                                                                cursor="pointer"
                                                                borderRadius="10px"
                                                                py={2}
                                                                px={3}
                                                                color="red.500"
                                                                _hover={{ bg: 'rgba(239, 68, 68, 0.12)' }} _highlighted={{ bg: 'rgba(239, 68, 68, 0.12)' }}
                                                                onClick={() => setDeleteTargetId(item.id)}
                                                            >
                                                                <Trash2 size={14} />
                                                                <Text fontSize="13px" fontWeight="600">삭제하기</Text>
                                                            </Menu.Item>
                                                        </Menu.Content>
                                                    </Menu.Positioner>
                                                </Portal>
                                            </Menu.Root>
                                        )}
                                        <LikeBurstButton
                                            variant="ghost"
                                            size="sm"
                                            isLiked={Boolean(item.is_liked)}
                                            likeCount={item.like_count || 0}
                                            onToggle={() => handleToggleCommentLike(item.id)}
                                            disabled={Boolean(likingCommentIds[item.id])}
                                            ariaLabel={item.is_liked ? '댓글 좋아요 취소' : '댓글 좋아요'}
                                        />
                                    </HStack>
                                </HStack>
                                {editingCommentId === item.id ? (
                                    <VStack align="stretch" gap={2} pl="42px">
                                        <Textarea
                                            value={editContent}
                                            onChange={(e) => setEditContent(e.target.value)}
                                            maxLength={500}
                                            minH="80px"
                                            fontSize="14px"
                                            lineHeight="1.6"
                                            bg="var(--waba-surface)"
                                            color="var(--waba-ink)"
                                            borderColor="var(--waba-line)"
                                            autoFocus
                                        />
                                        <HStack justify="space-between">
                                            <Text fontSize="11px" color="var(--waba-ink-3)">{editContent.length} / 500</Text>
                                            <HStack gap={2}>
                                                <Button size="xs" variant="outline" rounded="full" color="var(--waba-ink)" borderColor="var(--waba-line)" _hover={{ bg: 'var(--waba-surface)' }} onClick={cancelEditComment} disabled={isSavingEdit}>
                                                    취소
                                                </Button>
                                                <Button
                                                    size="xs"
                                                    rounded="full"
                                                    bg="#6338A9"
                                                    color="white"
                                                    _hover={{ bg: '#532d91' }}
                                                    onClick={() => handleUpdateComment(item.id)}
                                                    disabled={!editContent.trim()}
                                                    loading={isSavingEdit}
                                                >
                                                    저장
                                                </Button>
                                            </HStack>
                                        </HStack>
                                    </VStack>
                                ) : (
                                    <Text fontSize="14px" lineHeight="1.6" color="var(--waba-ink)" pl={{ base: 0, sm: '42px' }} wordBreak="break-word">
                                        {item.content}
                                    </Text>
                                )}
                            </Stack>
                        );
                    })
                )}
            </Stack>
        </Stack>
    );
}

export { Comment as CommentSection };
