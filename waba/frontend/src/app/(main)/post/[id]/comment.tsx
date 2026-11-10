'use client'

import { Avatar, Box, Button, FormatNumber, Heading, HStack, Stack, Text, Textarea, VStack } from "@chakra-ui/react";
import { useState } from "react";
import { Heart } from "lucide-react";
import { Comment as CommentType, User } from "@/interface";
import { formatRelativeTime } from "@/utils/simpleUtils";
import { isAuthenticated } from "@/utils/authUtils";
import axiosInstance from "@/utils/api";
import { toaster } from "@/components/ui/toaster";

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
        if (!window.confirm('정말 이 댓글을 삭제하시겠습니까?')) return;

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
                        <Avatar.Fallback name={currentUser?.nickname || "게스트"} />
                        {currentUser?.profile_image_url && (
                            <Avatar.Image src={currentUser.profile_image_url} alt={currentUser.nickname} />
                        )}
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
                                            <Avatar.Fallback name={item.is_anonymous ? "익명" : (item.author?.nickname || "와바")} />
                                            {item.author?.profile_image_url && !item.is_anonymous && (
                                                <Avatar.Image src={item.author.profile_image_url} alt={item.author?.nickname || "프로필"} />
                                            )}
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
                                            <Button
                                                size="xs"
                                                variant="ghost"
                                                color="waba.faint"
                                                fontSize="11px"
                                                h="24px"
                                                px={2}
                                                _hover={{ color: 'red.500', bg: 'red.50' }}
                                                onClick={() => handleDeleteComment(item.id)}
                                            >
                                                삭제
                                            </Button>
                                        )}
                                        <HStack gap={1} color="waba.muted" fontSize="xs">
                                            <Heart size={13} />
                                            <Text><FormatNumber value={item.like_count || 0} /></Text>
                                        </HStack>
                                    </HStack>
                                </HStack>
                                <Text fontSize="14px" lineHeight="1.6" color="waba.charcoal" pl="42px">
                                    {item.content}
                                </Text>
                            </Stack>
                        );
                    })
                )}
            </Stack>
        </Stack>
    );
}

export { Comment as CommentSection };
