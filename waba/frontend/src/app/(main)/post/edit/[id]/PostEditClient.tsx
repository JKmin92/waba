'use client'

import { useEffect, useState } from 'react';
import { Box, Spinner, Text, VStack } from '@chakra-ui/react';
import { useRouter } from 'next/navigation';
import axiosInstance from '@/utils/api';
import { toaster } from '@/components/ui/toaster';
import { isAuthenticated } from '@/utils/authUtils';
import Editor, { PostEditorData } from '../../editor';

export default function PostEditClient({ postId }: { postId: string }) {
    const router = useRouter();
    const [initialData, setInitialData] = useState<PostEditorData | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        const load = async () => {
            if (!isAuthenticated()) {
                toaster.create({ title: '로그인이 필요한 서비스입니다.', type: 'error' });
                router.replace(`/post/${postId}`);
                return;
            }
            try {
                const res = await axiosInstance.get(`/post/${postId}/edit`);
                if (res.data?.success) {
                    setInitialData(res.data.post);
                }
            } catch (e: any) {
                toaster.create({
                    title: e?.response?.data?.message || '게시글을 불러오지 못했습니다.',
                    type: 'error',
                });
                router.replace(`/post/${postId}`);
            }
        };
        load();
    }, [postId, router]);

    const handleUpdatePost = async (data: PostEditorData) => {
        setIsSubmitting(true);
        try {
            const formData = new FormData();
            formData.append('board_id', data.board_id);
            formData.append('title', data.title);
            formData.append('selected_pets', JSON.stringify(data.selectedPets || []));
            formData.append('tags', JSON.stringify(data.tags || []));
            if (data.auto_journal !== undefined) {
                formData.append('auto_journal', String(Boolean(data.auto_journal)));
            }
            if (data.auto_journal && data.auto_journal_pet_id) {
                formData.append('auto_journal_pet_id', data.auto_journal_pet_id);
            }
            if (data.auto_journal && data.auto_journal_journey_id) {
                formData.append('auto_journal_journey_id', data.auto_journal_journey_id);
            }

            let fileIndex = 0;
            const formattedBlocks = data.blocks.map((b) => {
                if (b.type === 'text') {
                    return { type: 'text', content: b.content, format: b.format };
                }
                const imageBlock: any = {
                    type: 'image',
                    caption: b.caption || '',
                    pins: b.pins || [],
                    previewUrl: b.file ? '' : b.previewUrl || b.image_url || '',
                    image_url: b.file ? '' : b.image_url || '',
                };
                if (b.file) {
                    formData.append('images', b.file);
                    imageBlock.fileIndex = fileIndex++;
                }
                return imageBlock;
            });
            formData.append('blocks', JSON.stringify(formattedBlocks));

            const res = await axiosInstance.put(`/post/${postId}`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                timeout: 45000,
            });

            if (res.data?.success) {
                const journalResult = res.data?.auto_journal_result;
                if (journalResult?.updated === true) {
                    toaster.create({
                        title: '게시글이 수정되었고, AI 건강 수첩에도 변경 내용이 이어서 기록되었습니다.',
                        type: 'success',
                    });
                } else if (journalResult?.created === true) {
                    toaster.create({
                        title: '게시글이 수정되었고, AI 건강 수첩에 새 기록이 추가되었습니다.',
                        type: 'success',
                    });
                } else {
                    toaster.create({ title: '게시글이 수정되었습니다.', type: 'success' });
                }
                router.push(`/post/${postId}`);
            } else {
                throw new Error(res.data?.message || '수정에 실패했습니다.');
            }
        } catch (error: any) {
            toaster.create({
                title: error?.response?.data?.message || '게시글 수정 중 오류가 발생했습니다.',
                type: 'error',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!initialData) {
        return (
            <Box minH="100vh" bg="#F9F9FB" display="flex" alignItems="center" justifyContent="center">
                <VStack gap={3}>
                    <Spinner color="waba.purple" />
                    <Text fontSize="sm" color="gray.500">게시글을 불러오는 중...</Text>
                </VStack>
            </Box>
        );
    }

    return (
        <Box minH="100vh" bg="#F9F9FB">
            <Editor
                mode="edit"
                postId={postId}
                initialData={initialData}
                onSubmit={handleUpdatePost}
                isSubmitting={isSubmitting}
            />
        </Box>
    );
}
