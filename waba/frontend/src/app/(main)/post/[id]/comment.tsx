'use client'

import { Avatar, Box, Button, Dialog, FormatNumber, Heading, HStack, IconButton, Menu, Portal, Stack, Text, Textarea, VStack } from "@chakra-ui/react";
import { useState } from "react";
import { Heart, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { Comment as CommentType, User } from "@/interface";
import { formatRelativeTime } from "@/utils/simpleUtils";
import { isAuthenticated } from "@/utils/authUtils";
import axiosInstance from "@/utils/api";
import { toaster } from "@/components/ui/toaster";
import { LuUserRound } from "react-icons/lu";

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

    // 정렬 로직
    const sortedComments = [...comments].sort((a, b) => {
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
                        <Dialog.Content borderRadius="24px" p={6} bg="white">
                            <Dialog.Header p={0} mb={2}>
                                <Dialog.Title fontSize="18px" fontWeight="800" color="waba.charcoal">
                                    댓글을 삭제할까요?
                                </Dialog.Title>
                            </Dialog.Header>
                            <Dialog.Body p={0} mb={6}>
                                <Text fontSize="13px" color="gray.600">삭제한 댓글은 복구할 수 없습니다.</Text>
                            </Dialog.Body>
                            <Dialog.Footer p={0} gap={2}>
                                <Button variant="outline" rounded="full" flex={1} onClick={() => setDeleteTargetId(null)} disabled={isDeletingComment}>
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

            {/* 상단 헤더: 댓글 개수 & 정렬 옵션 */}
            <HStack justifyContent="space-between">
                <HStack gap={2}>
                    <Heading fontSize="xl">댓글</Heading>
                    <Text fontSize="md" fontWeight="800" color="waba.purple">
                        {displayCount}
                    </Text>
                </HStack>
                <HStack gap={1}>
                    <Button
                        size="xs"
                        variant="ghost"
                        fontWeight={commentSort === 'oldest' ? "800" : "500"}
                        color={commentSort === 'oldest' ? "waba.charcoal" : "waba.muted"}
                        onClick={() => setCommentSort('oldest')}
                    >
                        등록순
                    </Button>
                    <Text color="gray.300">·</Text>
                    <Button
                        size="xs"
                        variant="ghost"
                        fontWeight={commentSort === 'latest' ? "800" : "500"}
                        color={commentSort === 'latest' ? "waba.charcoal" : "waba.muted"}
                        onClick={() => setCommentSort('latest')}
                    >
                        최신순
                    </Button>
                    <Text color="gray.300">·</Text>
                    <Button
                        size="xs"
                        variant="ghost"
                        fontWeight={commentSort === 'popular' ? "800" : "500"}
                        color={commentSort === 'popular' ? "waba.charcoal" : "waba.muted"}
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
                borderColor="waba.border"
                bg="white"
                p={4}
                boxShadow="0 4px 16px rgba(0, 0, 0, 0.03)"
                transition="all 0.2s"
                _focusWithin={{ borderColor: 'waba.purple', boxShadow: '0 6px 20px rgba(90, 49, 244, 0.08)' }}
            >
                <HStack align="flex-start" gap={3}>
                    <Avatar.Root size="md" borderRadius="full" border="1px solid" borderColor="waba.border">
                        {currentUser?.profile_image_url ? (
                            <Avatar.Image src={currentUser.profile_image_url} alt={currentUser.nickname} />
                        ) : (<LuUserRound />)}
                    </Avatar.Root>
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
                                color="waba.muted"
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
                                <Text fontSize="11px" color="waba.faint">
                                    {commentContent.length} / 500
                                </Text>
                                <Button
                                    size="sm"
                                    px={5}
                                    h="34px"
                                    borderRadius="full"
                                    bg="waba.charcoal"
                                    color="white"
                                    fontSize="13px"
                                    fontWeight="700"
                                    _hover={{ bg: 'waba.purple' }}
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
                        bg="waba.subtle"
                        border="1px dashed"
                        borderColor="blackAlpha.200"
                    >
                        <Text fontSize="14px" fontWeight="700" color="waba.charcoal" mb={1}>
                            아직 등록된 댓글이 없습니다.
                        </Text>
                        <Text fontSize="12px" color="waba.faint">
                            이 공간에 대해 가장 먼저 따뜻한 한마디를 남겨보세요!
                        </Text>
                    </Box>
                ) : (
                    sortedComments.map((item) => {
                        const commentUserId = item.user_id || item.author?.id;
                        const isMyComment = Boolean(currentUser?.id && commentUserId && currentUser.id === commentUserId);
                        const isPostAuthor = Boolean(postAuthorId && commentUserId && postAuthorId === commentUserId);

                        return (
                            <Stack
                                key={item.id}
                                bg="white"
                                border="1px solid"
                                borderColor="waba.border"
                                p={4}
                                gap={3}
                                borderRadius="20px"
                                boxShadow="0 2px 8px rgba(0, 0, 0, 0.02)"
                            >
                                <HStack justifyContent="space-between" align="center">
                                    <HStack alignItems="center" gap={3}>
                                        <Avatar.Root size="sm" borderRadius="full">
                                            {item.author?.profile_image_url && !item.is_anonymous ? (
                                                <Avatar.Image src={item.author.profile_image_url} alt={item.author?.nickname || "프로필"} />
                                            ) : (<LuUserRound />)}
                                        </Avatar.Root>
                                        <HStack gap={1.5} align="center">
                                            <Heading fontSize="sm" fontWeight="700">
                                                @{item.author?.nickname || "익명 집사"}
                                            </Heading>

                                            {/* ⭐️ 게시글 원작성자 뱃지 (누구에게나 보임) */}
                                            {isPostAuthor && (
                                                <Box
                                                    bg="waba.purpleLight"
                                                    color="waba.purple"
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
                                                    bg="blackAlpha.100"
                                                    color="waba.charcoal"
                                                    fontSize="10px"
                                                    fontWeight="800"
                                                    px={2}
                                                    py={0.5}
                                                    borderRadius="full"
                                                    border="1px solid"
                                                    borderColor="blackAlpha.200"
                                                >
                                                    내 댓글
                                                </Box>
                                            )}

                                            <Text fontSize="xs" color="waba.faint" ml={1}>
                                                {formatRelativeTime(item.created_at)}
                                            </Text>
                                        </HStack>
                                    </HStack>

                                    <HStack gap={2}>
                                        {isMyComment && (
                                            <Menu.Root positioning={{ placement: "bottom-end" }}>
                                                <Menu.Trigger asChild>
                                                    <IconButton
                                                        aria-label="댓글 메뉴"
                                                        variant="ghost"
                                                        size="2xs"
                                                        rounded="full"
                                                        color="waba.faint"
                                                        _hover={{ color: 'waba.charcoal' }}
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
                                                            borderColor="waba.border"
                                                            bg="white"
                                                        >
                                                            <Menu.Item
                                                                value="edit"
                                                                cursor="pointer"
                                                                borderRadius="10px"
                                                                py={2}
                                                                px={3}
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
                                                                _hover={{ bg: 'red.50' }}
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
                                        <HStack gap={1} color="waba.muted" fontSize="xs">
                                            <Heart size={13} />
                                            <Text><FormatNumber value={item.like_count || 0} /></Text>
                                        </HStack>
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
                                            autoFocus
                                        />
                                        <HStack justify="space-between">
                                            <Text fontSize="11px" color="waba.faint">{editContent.length} / 500</Text>
                                            <HStack gap={2}>
                                                <Button size="xs" variant="outline" rounded="full" onClick={cancelEditComment} disabled={isSavingEdit}>
                                                    취소
                                                </Button>
                                                <Button
                                                    size="xs"
                                                    rounded="full"
                                                    bg="waba.charcoal"
                                                    color="white"
                                                    _hover={{ bg: 'waba.purple' }}
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
                                    <Text fontSize="14px" lineHeight="1.6" color="waba.charcoal" pl="42px">
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
