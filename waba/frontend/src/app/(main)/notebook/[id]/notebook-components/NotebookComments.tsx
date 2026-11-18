'use client'

import React, { useState } from 'react';
import {
    Box,
    Button,
    Flex,
    Heading,
    HStack,
    IconButton,
    Input,
    Text,
    VStack,
} from '@chakra-ui/react';
import { LuTrash2 } from 'react-icons/lu';
import axiosInstance from '@/utils/api';
import { isAuthenticated } from '@/utils/authUtils';
import { toaster } from '@/components/ui/toaster';
import { formatRelativeTime } from '@/utils/simpleUtils';
import UserAvatar from '../../../common/UserAvatar';
import { NotebookCommentItem } from '../../notebook-components/types';

interface NotebookCommentsProps {
    notebookId: string;
    comments: NotebookCommentItem[];
    currentUserId?: string | null;
    onCommentsChange: (nextComments: NotebookCommentItem[]) => void;
}

export default function NotebookComments({
    notebookId,
    comments,
    currentUserId,
    onCommentsChange,
}: NotebookCommentsProps) {
    const [content, setContent] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isAuthenticated()) {
            toaster.create({ title: '로그인이 필요한 서비스입니다.', type: 'info' });
            return;
        }
        if (!content.trim()) return;

        setSubmitting(true);
        try {
            const res = await axiosInstance.post(`/notebooks/${notebookId}/comments`, {
                content: content.trim(),
            });
            const created: NotebookCommentItem = res.data?.comment || res.data?.data;
            if (created) {
                onCommentsChange([created, ...comments]);
            }
            setContent('');
            toaster.create({ title: '댓글이 등록되었습니다.', type: 'success' });
        } catch (error: any) {
            toaster.create({
                title: error?.response?.data?.message || '댓글 등록에 실패했습니다.',
                type: 'error',
            });
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (commentId: string | number) => {
        try {
            await axiosInstance.delete(`/notebooks/${notebookId}/comments/${commentId}`);
            onCommentsChange(comments.filter((c) => c.id !== commentId));
            toaster.create({ title: '댓글이 삭제되었습니다.', type: 'info' });
        } catch (error: any) {
            toaster.create({
                title: error?.response?.data?.message || '댓글 삭제에 실패했습니다.',
                type: 'error',
            });
        }
    };

    return (
        <Box
            as="section"
            bg="var(--waba-surface)"
            border="1px solid"
            borderColor="var(--waba-line)"
            borderRadius="22px"
            p={{ base: '16px', md: '20px' }}
            display="flex"
            flexDirection="column"
            gap="12px"
            minW={0}
        >
            <Heading as="h3" fontSize="15px" fontWeight="800" color="var(--waba-ink)">
                💬 이 수첩에 대한 응원 &amp; 질문 ({comments.length})
            </Heading>

            <Flex
                as="form"
                onSubmit={handleCreate}
                bg="var(--waba-card)"
                border="1px solid"
                borderColor="var(--waba-line)"
                borderRadius="14px"
                px="14px"
                py="8px"
                align="center"
                gap={2}
            >
                <Input
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="수첩 작성자에게 응원이나 질문을 남겨보세요..."
                    fontSize="13px"
                    color="var(--waba-ink)"
                    _placeholder={{ color: 'var(--waba-ink-3)' }}
                    border="none"
                    outline="none"
                    p={0}
                    bg="transparent"
                    _focus={{ outline: 'none', boxShadow: 'none' }}
                />
                <Button
                    type="submit"
                    size="xs"
                    h="32px"
                    px="14px"
                    borderRadius="999px"
                    bg="#6338A9"
                    color="white"
                    fontWeight="700"
                    loading={submitting}
                    disabled={!content.trim()}
                    flexShrink={0}
                >
                    등록
                </Button>
            </Flex>

            {comments.length === 0 ? (
                <Text fontSize="12px" color="var(--waba-ink-3)" textAlign="center" py={4}>
                    아직 등록된 응원 댓글이 없습니다. 첫 응원을 남겨보세요!
                </Text>
            ) : (
                <VStack align="stretch" gap="10px" minW={0}>
                    {comments.map((comment) => {
                        const authorId = comment.user_id || comment.author?.id;
                        const isMine = Boolean(currentUserId && authorId && currentUserId === authorId);

                        return (
                            <Box
                                key={comment.id}
                                bg="var(--waba-card)"
                                border="1px solid"
                                borderColor="var(--waba-line)"
                                borderRadius="16px"
                                p="14px 16px"
                                display="flex"
                                flexDirection="column"
                                gap="8px"
                                minW={0}
                            >
                                <Flex justify="space-between" align="center" gap={2}>
                                    <HStack gap={2} minW={0}>
                                        <UserAvatar
                                            src={comment.author?.profile_image_url}
                                            alt={comment.author?.nickname || '작성자'}
                                            size="xs"
                                        />
                                        <Text fontSize="13px" fontWeight="700" color="var(--waba-ink)" truncate>
                                            {comment.author?.nickname || '집사'}
                                        </Text>
                                        <Text fontSize="11px" color="var(--waba-ink-3)">
                                            {formatRelativeTime(comment.created_at)}
                                        </Text>
                                    </HStack>

                                    {isMine && (
                                        <IconButton
                                            aria-label="댓글 삭제"
                                            size="2xs"
                                            variant="ghost"
                                            color="var(--waba-ink-3)"
                                            _hover={{ color: 'red.500' }}
                                            onClick={() => handleDelete(comment.id)}
                                        >
                                            <LuTrash2 size={14} />
                                        </IconButton>
                                    )}
                                </Flex>

                                <Text fontSize="13px" color="var(--waba-ink-2)" lineHeight="1.55" wordBreak="break-word">
                                    {comment.content}
                                </Text>
                            </Box>
                        );
                    })}
                </VStack>
            )}
        </Box>
    );
}
