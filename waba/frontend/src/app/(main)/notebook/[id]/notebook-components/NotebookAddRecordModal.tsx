'use client'

import React, { useEffect, useState } from 'react';
import {
    Box,
    Button,
    CloseButton,
    Dialog,
    Flex,
    HStack,
    Input,
    Portal,
    Text,
    Textarea,
    VStack,
} from '@chakra-ui/react';
import axiosInstance from '@/utils/api';
import { toaster } from '@/components/ui/toaster';
import { NotebookHistoryItem } from '../../notebook-components/types';
import KoreanDatePicker from '../../../common/KoreanDatePicker';

interface NotebookAddRecordModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    notebookId: string;
    petId?: string | number | null;
    editingRecord?: NotebookHistoryItem | null;
    onRecordAdded: (newRecord: NotebookHistoryItem) => void;
    onRecordUpdated?: (updatedRecord: NotebookHistoryItem) => void;
}

export default function NotebookAddRecordModal({
    open,
    onOpenChange,
    notebookId,
    petId,
    editingRecord = null,
    onRecordAdded,
    onRecordUpdated,
}: NotebookAddRecordModalProps) {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [recordDate, setRecordDate] = useState(() => new Date().toISOString().slice(0, 10));
    const [weightKg, setWeightKg] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (!open) return;
        if (editingRecord) {
            setTitle(editingRecord.title || '');
            setDescription(editingRecord.description || '');
            setRecordDate(
                (editingRecord.event_date || editingRecord.date || editingRecord.record_date || new Date().toISOString()).slice(0, 10)
            );
            setWeightKg(editingRecord.weight_kg ? String(editingRecord.weight_kg) : '');
        } else {
            setTitle('');
            setDescription('');
            setRecordDate(new Date().toISOString().slice(0, 10));
            setWeightKg('');
        }
    }, [open, editingRecord]);

    const handleSubmit = async () => {
        if (!title.trim()) {
            toaster.create({ title: '기록 제목을 입력해주세요.', type: 'warning' });
            return;
        }
        setSubmitting(true);
        try {
            if (editingRecord && petId) {
                const res = await axiosInstance.put(`/user/pets/${petId}/histories/${editingRecord.id}`, {
                    category: editingRecord.category || 'OTHER',
                    title: title.trim(),
                    description: description.trim() || null,
                    date: recordDate,
                    event_date: recordDate,
                    weight_kg: weightKg ? Number(weightKg) : null,
                    journey_id: Number(notebookId),
                });
                const updated: NotebookHistoryItem = res.data?.history ||
                    res.data?.data || {
                        ...editingRecord,
                        title: title.trim(),
                        description: description.trim() || null,
                        event_date: recordDate,
                        date: recordDate,
                        weight_kg: weightKg ? Number(weightKg) : null,
                    };
                onRecordUpdated?.(updated);
                onOpenChange(false);
                toaster.create({ title: '수첩 기록이 수정되었습니다.', type: 'success' });
                return;
            }

            const res = await axiosInstance.post(`/notebooks/${notebookId}/histories`, {
                title: title.trim(),
                description: description.trim() || null,
                event_date: recordDate,
                weight_kg: weightKg ? Number(weightKg) : null,
            });
            const created: NotebookHistoryItem = res.data?.history ||
                res.data?.data || {
                    id: Date.now(),
                    notebook_id: notebookId,
                    title: title.trim(),
                    description: description.trim() || null,
                    event_date: recordDate,
                    date: recordDate,
                    weight_kg: weightKg ? Number(weightKg) : null,
                    is_ai_generated: false,
                };
            onRecordAdded(created);
            setTitle('');
            setDescription('');
            setWeightKg('');
            onOpenChange(false);
            toaster.create({ title: '수첩 기록이 추가되었습니다.', type: 'success' });
        } catch (error: any) {
            toaster.create({
                title: error?.response?.data?.message || '기록 추가에 실패했습니다.',
                type: 'error',
            });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog.Root open={open} onOpenChange={(e) => onOpenChange(e.open)} placement="center" size="md">
            <Portal>
                <Dialog.Backdrop backdropFilter="blur(8px)" bg="blackAlpha.500" />
                <Dialog.Positioner p={4}>
                    <Dialog.Content borderRadius="24px" p={6} bg="var(--waba-card)" color="var(--waba-ink)">
                        <Dialog.Header p={0} mb={4}>
                            <Flex justify="space-between" align="center">
                                <Dialog.Title fontSize="18px" fontWeight="800">
                                    {editingRecord ? '수첩 기록 수정' : '+ 수첩 기록 직접 추가'}
                                </Dialog.Title>
                                <CloseButton size="sm" rounded="full" onClick={() => onOpenChange(false)} />
                            </Flex>
                            <Text fontSize="12px" color="var(--waba-ink-3)" mt={1}>
                                커뮤니티 글 작성 없이 수첩 타임라인에 단독 메모를 남깁니다.
                            </Text>
                        </Dialog.Header>

                        <Dialog.Body p={0}>
                            <VStack align="stretch" gap={3.5}>
                                <Box>
                                    <Text fontSize="12px" fontWeight="700" color="var(--waba-ink-2)" mb={1}>
                                        기록 제목 *
                                    </Text>
                                    <Input
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        placeholder="예: 체중 3.8kg 측정 및 관절 영양제 급여"
                                        rounded="12px"
                                        bg="var(--waba-surface)"
                                        borderColor="var(--waba-line)"
                                        fontSize="13px"
                                    />
                                </Box>

                                <HStack gap={3}>
                                    <Box flex="1">
                                        <Text fontSize="12px" fontWeight="700" color="var(--waba-ink-2)" mb={1}>
                                            기록 날짜
                                        </Text>
                                        <KoreanDatePicker
                                            value={recordDate}
                                            onChange={setRecordDate}
                                            h="40px"
                                        />
                                    </Box>
                                    <Box flex="1">
                                        <Text fontSize="12px" fontWeight="700" color="var(--waba-ink-2)" mb={1}>
                                            체중 (kg, 선택)
                                        </Text>
                                        <Input
                                            type="number"
                                            step="0.1"
                                            value={weightKg}
                                            onChange={(e) => setWeightKg(e.target.value)}
                                            placeholder="3.8"
                                            rounded="12px"
                                            bg="var(--waba-surface)"
                                            borderColor="var(--waba-line)"
                                            fontSize="13px"
                                        />
                                    </Box>
                                </HStack>

                                <Box>
                                    <Text fontSize="12px" fontWeight="700" color="var(--waba-ink-2)" mb={1}>
                                        상세 메모 (선택)
                                    </Text>
                                    <Textarea
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        placeholder="증상 변화, 급여량, 컨디션 등을 자유롭게 기록하세요."
                                        rows={3}
                                        rounded="12px"
                                        bg="var(--waba-surface)"
                                        borderColor="var(--waba-line)"
                                        fontSize="13px"
                                    />
                                </Box>
                            </VStack>
                        </Dialog.Body>

                        <Dialog.Footer p={0} mt={6}>
                            <HStack justify="flex-end" w="100%" gap={2}>
                                <Button
                                    variant="outline"
                                    rounded="full"
                                    size="sm"
                                    borderColor="var(--waba-line)"
                                    onClick={() => onOpenChange(false)}
                                >
                                    취소
                                </Button>
                                <Button
                                    bg="#6338A9"
                                    color="white"
                                    _hover={{ bg: '#522B8F' }}
                                    rounded="full"
                                    size="sm"
                                    px={5}
                                    fontWeight="700"
                                    loading={submitting}
                                    onClick={handleSubmit}
                                >
                                    기록 저장
                                </Button>
                            </HStack>
                        </Dialog.Footer>
                    </Dialog.Content>
                </Dialog.Positioner>
            </Portal>
        </Dialog.Root>
    );
}
