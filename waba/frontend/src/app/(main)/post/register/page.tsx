'use client'

import React, { useState } from 'react';
import Editor, { PostEditorData } from '../editor';
import { Box } from '@chakra-ui/react';
import { toaster } from '@/components/ui/toaster';
import { useRouter } from 'next/navigation';
import axiosInstance from '@/utils/api';
import { isAuthenticated } from '@/utils/authUtils';

export default function PostRegisterPage() {
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleCreatePost = async (data: PostEditorData, draftPostId?: string) => {
        setIsSubmitting(true);
        try {
            // 1. Check Login
            if (!isAuthenticated()) {
                toaster.create({
                    title: '로그인이 필요한 서비스입니다.',
                    type: 'error',
                });
                setIsSubmitting(false);
                return;
            }

            // 2. Prepare FormData for image uploads & blocks
            const formData = new FormData();
            if (draftPostId) {
                formData.append('postId', draftPostId);
            }
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
                    return {
                        type: 'text',
                        content: b.content,
                        format: b.format,
                    };
                }
                const imageBlock: any = {
                    type: 'image',
                    caption: b.caption || '',
                    pins: b.pins || [],
                    previewUrl: b.previewUrl || b.image_url || '',
                    image_url: b.image_url || '',
                };
                if (b.file) {
                    formData.append('images', b.file);
                    imageBlock.fileIndex = fileIndex++;
                }
                return imageBlock;
            });

            formData.append('blocks', JSON.stringify(formattedBlocks));

            const res = await axiosInstance.post('/post', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                timeout: 45000,
            });

            if (res.data?.success) {
                // Clear any local draft
                if (typeof window !== 'undefined') {
                    localStorage.removeItem('waba_post_draft');
                }
                toaster.create({
                    title: '게시글이 성공적으로 발행되었습니다!',
                    description: '+500P 리워드가 적립되었습니다.',
                    type: 'success',
                });
                if (res.data?.auto_journal_result?.created === true) {
                    toaster.create({
                        title: '게시글 등록과 함께 건강 수첩에도 자동 기록되었어요!',
                        type: 'success',
                    });
                }
                const newPostId = res.data?.postId;
                if (newPostId) {
                    router.push(`/post/${newPostId}`);
                } else {
                    router.push('/');
                }
            } else {
                throw new Error(res.data?.message || '발행에 실패했습니다.');
            }
        } catch (error: any) {
            console.error('Post register error:', error);
            toaster.create({
                title: error?.response?.data?.message || '게시글 등록 중 오류가 발생했습니다.',
                type: 'error',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSaveDraft = async (data: PostEditorData, draftPostId?: string): Promise<string | undefined> => {
        try {
            if (!isAuthenticated()) {
                if (typeof window !== 'undefined') {
                    localStorage.setItem('waba_post_draft', JSON.stringify({
                        data,
                        savedAt: new Date().toISOString()
                    }));
                }
                toaster.create({
                    title: '임시 저장이 완료되었습니다. (로컬)',
                    type: 'info',
                });
                return;
            }

            const formData = new FormData();
            if (draftPostId) {
                formData.append('postId', draftPostId);
            }
            formData.append('board_id', data.board_id);
            formData.append('title', data.title || '제목 없음');
            formData.append('selected_pets', JSON.stringify(data.selectedPets || []));
            formData.append('tags', JSON.stringify(data.tags || []));

            let fileIndex = 0;
            const formattedBlocks = data.blocks.map((b) => {
                if (b.type === 'text') {
                    return {
                        type: 'text',
                        content: b.content,
                        format: b.format,
                    };
                }
                const imageBlock: any = {
                    type: 'image',
                    caption: b.caption || '',
                    pins: b.pins || [],
                    previewUrl: b.previewUrl || b.image_url || '',
                    image_url: b.image_url || '',
                };
                if (b.file) {
                    formData.append('images', b.file);
                    imageBlock.fileIndex = fileIndex++;
                }
                return imageBlock;
            });

            formData.append('blocks', JSON.stringify(formattedBlocks));

            const res = await axiosInstance.post('/post/draft', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            if (res.data?.success) {
                if (typeof window !== 'undefined') {
                    localStorage.setItem('waba_post_draft', JSON.stringify({
                        data: { ...data, postId: res.data.postId },
                        savedAt: new Date().toISOString()
                    }));
                }
                toaster.create({
                    title: '서버에 임시 저장되었습니다.',
                    description: '모바일 및 다른 기기에서도 언제든 이어서 작성할 수 있습니다.',
                    type: 'success',
                });
                return res.data.postId;
            }
        } catch (e: any) {
            console.error('Draft save error:', e);
            toaster.create({
                title: '임시 저장 중 오류가 발생했습니다.',
                type: 'error',
            });
        }
    };

    return (
        <Box minH="100vh" bg="#F9F9FB">
            {/* Reusable In-stream Block Editor Component (Dedicated Studio Header Mode) */}
            <Editor
                mode="create"
                onSubmit={handleCreatePost}
                onSaveDraft={handleSaveDraft}
                isSubmitting={isSubmitting}
            />
        </Box>
    );
}
