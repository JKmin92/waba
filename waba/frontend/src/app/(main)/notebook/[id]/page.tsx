'use client'

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Box, Button, Spinner, Text, VStack } from '@chakra-ui/react';
import axiosInstance from '@/utils/api';
import { getUserInfo, isAuthenticated } from '@/utils/authUtils';
import { toaster } from '@/components/ui/toaster';
import ShareModal from '../../common/ShareModal';
import NotebookDetailHeader from './notebook-components/NotebookDetailHeader';
import NotebookTimeline from './notebook-components/NotebookTimeline';
import NotebookAddRecordModal from './notebook-components/NotebookAddRecordModal';
import NotebookComments from './notebook-components/NotebookComments';
import {
    NotebookCommentItem,
    NotebookDetailData,
    NotebookHistoryItem,
    NotebookStatus,
} from '../notebook-components/types';

export default function NotebookDetailPage() {
    const params = useParams();
    const router = useRouter();
    const notebookId = String(params?.id || '');

    const [detail, setDetail] = useState<NotebookDetailData | null>(null);
    const [loading, setLoading] = useState(true);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [addRecordOpen, setAddRecordOpen] = useState(false);
    const [editingRecord, setEditingRecord] = useState<NotebookHistoryItem | null>(null);
    const [shareOpen, setShareOpen] = useState(false);
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

    useEffect(() => {
        const user = getUserInfo();
        setCurrentUserId(user?.id ? String(user.id) : null);

        const handleAuthChange = () => {
            const updated = getUserInfo();
            setCurrentUserId(updated?.id ? String(updated.id) : null);
        };
        window.addEventListener('auth-change', handleAuthChange);
        return () => window.removeEventListener('auth-change', handleAuthChange);
    }, []);

    useEffect(() => {
        if (!notebookId) return;
        const fetchDetail = async () => {
            setLoading(true);
            try {
                const res = await axiosInstance.get(`/notebooks/${notebookId}`);
                const raw = res.data?.data || res.data || {};
                const nbRaw = raw.notebook || raw.journey;
                if (nbRaw) {
                    const normalizedNotebook = {
                        ...nbRaw,
                        status: nbRaw.status || (nbRaw.is_ongoing ? 'ACTIVE' : 'CURED'),
                        pet: nbRaw.pet || raw.pet || null,
                        user: nbRaw.user || nbRaw.owner || raw.owner || raw.user || null,
                    };
                    setDetail({
                        notebook: normalizedNotebook,
                        histories: Array.isArray(raw.histories) ? raw.histories : Array.isArray(nbRaw.histories) ? nbRaw.histories : [],
                        comments: Array.isArray(raw.comments) ? raw.comments : Array.isArray(nbRaw.comments) ? nbRaw.comments : [],
                    });
                } else {
                    setDetail(null);
                }
            } catch {
                setDetail(null);
            } finally {
                setLoading(false);
            }
        };

        fetchDetail();
    }, [notebookId]);

    const handleToggleScrap = async () => {
        if (!detail) return;
        if (!isAuthenticated()) {
            toaster.create({ title: '로그인이 필요한 서비스입니다.', type: 'info' });
            return;
        }
        try {
            const res = await axiosInstance.post(`/notebooks/${notebookId}/scrap`);
            const nextScrapped =
                typeof res.data?.is_scrapped === 'boolean'
                    ? res.data.is_scrapped
                    : !detail.notebook.is_scrapped;
            const diff = nextScrapped ? 1 : -1;
            setDetail((prev) =>
                prev
                    ? {
                          ...prev,
                          notebook: {
                              ...prev.notebook,
                              is_scrapped: nextScrapped,
                              scrap_count: Math.max(0, (prev.notebook.scrap_count ?? 0) + diff),
                          },
                      }
                    : prev
            );
        } catch {
            toaster.create({ title: '스크랩 처리에 실패했습니다.', type: 'error' });
        }
    };

    const handleStatusChange = async (status: NotebookStatus) => {
        if (!detail || isUpdatingStatus) return;
        setIsUpdatingStatus(true);
        try {
            await axiosInstance.patch(`/notebooks/${notebookId}/status`, { status });
            setDetail((prev) =>
                prev
                    ? {
                          ...prev,
                          notebook: {
                              ...prev.notebook,
                              status,
                          },
                      }
                    : prev
            );
            toaster.create({ title: '수첩 상태가 변경되었습니다.', type: 'success' });
        } catch (error: any) {
            toaster.create({
                title: error?.response?.data?.message || '상태 변경에 실패했습니다.',
                type: 'error',
            });
        } finally {
            setIsUpdatingStatus(false);
        }
    };

    if (loading) {
        return (
            <VStack py={24} gap={3}>
                <Spinner size="lg" color="#6338A9" />
                <Text fontSize="13px" color="var(--waba-ink-3)">
                    건강 수첩 상세 정보를 불러오는 중...
                </Text>
            </VStack>
        );
    }

    if (!detail) {
        return (
            <Box maxW="600px" mx="auto" py={20} px={4} textAlign="center">
                <Text fontSize="17px" fontWeight="800" color="var(--waba-ink)" mb={2}>
                    건강 수첩을 찾을 수 없습니다
                </Text>
                <Text fontSize="13px" color="var(--waba-ink-3)" mb={6}>
                    삭제되었거나 접근할 수 없는 수첩입니다.
                </Text>
                <Button
                    size="sm"
                    borderRadius="full"
                    bg="#6338A9"
                    color="white"
                    px={5}
                    onClick={() => router.push('/notebook')}
                >
                    건강 수첩 목록으로 돌아가기
                </Button>
            </Box>
        );
    }

    const ownerId = detail.notebook.user?.id || detail.notebook.user_id;
    const isOwner = Boolean(currentUserId && ownerId && currentUserId === String(ownerId));
    const resolvedPetId = detail.notebook.pet_id || detail.notebook.pet?.id;

    const handleDeleteRecord = async (historyId: string | number) => {
        if (!resolvedPetId) return;
        if (!confirm('이 기록을 삭제하시겠습니까?')) return;
        try {
            await axiosInstance.delete(`/user/pets/${resolvedPetId}/histories/${historyId}`);
            setDetail((prev) =>
                prev
                    ? {
                          ...prev,
                          histories: prev.histories.filter((h) => String(h.id) !== String(historyId)),
                      }
                    : prev
            );
            toaster.create({ title: '기록이 삭제되었습니다.', type: 'info' });
        } catch (error: any) {
            toaster.create({
                title: error?.response?.data?.message || '기록 삭제에 실패했습니다.',
                type: 'error',
            });
        }
    };

    return (
        <Box
            w="100%"
            maxW="880px"
            mx="auto"
            px={{ base: 4, md: 6 }}
            pt={{ base: 4, md: 6 }}
            pb={{ base: 10, md: 16 }}
            minW={0}
        >
            <VStack align="stretch" gap="20px" minW={0}>
                <NotebookDetailHeader
                    notebook={detail.notebook}
                    recordCount={detail.histories.length}
                    isOwner={isOwner}
                    onOpenAddRecord={() => {
                        setEditingRecord(null);
                        setAddRecordOpen(true);
                    }}
                    onToggleScrap={handleToggleScrap}
                    onShare={() => setShareOpen(true)}
                    onStatusChange={handleStatusChange}
                    isUpdatingStatus={isUpdatingStatus}
                />

                <NotebookTimeline
                    histories={detail.histories}
                    summaryFlow={detail.notebook.summary_flow}
                    status={detail.notebook.status}
                    completedAt={(detail.notebook as any).completed_at || (detail.notebook as any).end_date || (detail.notebook as any).updated_at}
                    isOwner={isOwner}
                    onEditRecord={(item) => {
                        setEditingRecord(item);
                        setAddRecordOpen(true);
                    }}
                    onDeleteRecord={handleDeleteRecord}
                />

                <NotebookComments
                    notebookId={notebookId}
                    comments={detail.comments}
                    currentUserId={currentUserId}
                    onCommentsChange={(nextComments: NotebookCommentItem[]) => {
                        setDetail((prev) => (prev ? { ...prev, comments: nextComments } : prev));
                    }}
                />
            </VStack>

            <NotebookAddRecordModal
                open={addRecordOpen}
                onOpenChange={(open) => {
                    setAddRecordOpen(open);
                    if (!open) setEditingRecord(null);
                }}
                notebookId={notebookId}
                petId={resolvedPetId}
                editingRecord={editingRecord}
                onRecordAdded={(newRecord: NotebookHistoryItem) => {
                    setDetail((prev) =>
                        prev
                            ? {
                                  ...prev,
                                  histories: [newRecord, ...prev.histories],
                                  notebook: {
                                      ...prev.notebook,
                                      record_count: (prev.notebook.record_count ?? prev.histories.length) + 1,
                                  },
                              }
                            : prev
                    );
                }}
                onRecordUpdated={(updatedRecord: NotebookHistoryItem) => {
                    setDetail((prev) =>
                        prev
                            ? {
                                  ...prev,
                                  histories: prev.histories.map((h) =>
                                      String(h.id) === String(updatedRecord.id) ? { ...h, ...updatedRecord } : h
                                  ),
                              }
                            : prev
                    );
                }}
            />

            <ShareModal
                open={shareOpen}
                onOpenChange={setShareOpen}
                title={detail.notebook.title}
                thumbnailUrl={detail.notebook.pet?.current_avatar_url || undefined}
            />
        </Box>
    );
}
