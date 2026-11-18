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
import { LuGlobe, LuLock, LuX } from 'react-icons/lu';
import axiosInstance from '@/utils/api';
import { toaster } from '@/components/ui/toaster';
import { Pet } from '@/interface';
import UserAvatar from '../../common/UserAvatar';
import { MypageJourneyRecord } from './MypageTabsContent';

type JourneyCategory = 'DISEASE' | 'DERMATOLOGY' | 'DIET' | 'CARE' | 'CHECKUP' | 'REVIEW' | 'OTHER';
type JourneyStatus = 'ACTIVE' | 'CURED' | 'COMPLETED';
type JourneyShareScope = 'PUBLIC' | 'PRIVATE';

const CATEGORY_OPTIONS: { key: JourneyCategory; label: string }[] = [
    { key: 'DISEASE', label: '질병·관절' },
    { key: 'DERMATOLOGY', label: '피부·알러지' },
    { key: 'DIET', label: '식단·다이어트' },
    { key: 'CARE', label: '일상 케어' },
    { key: 'CHECKUP', label: '건강검진' },
    { key: 'REVIEW', label: '사용기' },
    { key: 'OTHER', label: '기타' },
];

const STATUS_OPTIONS: { key: JourneyStatus; label: string }[] = [
    { key: 'ACTIVE', label: '진행 중' },
    { key: 'CURED', label: '완치' },
    { key: 'COMPLETED', label: '목표 달성' },
];

interface NotebookGroupModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    pet: Pet | null;
    editingJourney?: MypageJourneyRecord | null;
    onSaved: () => void;
}

export default function NotebookGroupModal({
    open,
    onOpenChange,
    pet,
    editingJourney = null,
    onSaved,
}: NotebookGroupModalProps) {
    const todayStr = new Date().toISOString().slice(0, 10);

    const [title, setTitle] = useState('');
    const [category, setCategory] = useState<JourneyCategory>('DISEASE');
    const [status, setStatus] = useState<JourneyStatus>('ACTIVE');
    const [goalSummary, setGoalSummary] = useState('');
    const [description, setDescription] = useState('');
    const [shareScope, setShareScope] = useState<JourneyShareScope>('PUBLIC');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (!open) return;

        if (editingJourney) {
            setTitle(editingJourney.title || '');
            const nextCat = CATEGORY_OPTIONS.some((c) => c.key === editingJourney.category)
                ? (editingJourney.category as JourneyCategory)
                : 'DISEASE';
            setCategory(nextCat);

            const resolvedStatus =
                editingJourney.status ||
                (editingJourney.is_ongoing === false || editingJourney.is_ongoing === 0 ? 'CURED' : 'ACTIVE');
            setStatus(
                STATUS_OPTIONS.some((s) => s.key === resolvedStatus)
                    ? (resolvedStatus as JourneyStatus)
                    : 'ACTIVE'
            );

            setGoalSummary(editingJourney.goal_summary || '');
            setDescription(editingJourney.description || '');
            setShareScope(editingJourney.share_scope === 'PRIVATE' ? 'PRIVATE' : 'PUBLIC');
        } else {
            setTitle('');
            setCategory('DISEASE');
            setStatus('ACTIVE');
            setGoalSummary('');
            setDescription('');
            setShareScope('PUBLIC');
        }
    }, [open, editingJourney]);

    const handleSave = async () => {
        if (!pet?.id) return;
        if (!title.trim()) {
            toaster.create({ title: '그룹 이름을 입력해주세요.', type: 'warning' });
            return;
        }

        setIsSaving(true);
        try {
            const resolvedStartDate = editingJourney?.start_date
                ? String(editingJourney.start_date).slice(0, 10)
                : todayStr;
            const payload = {
                title: title.trim(),
                start_date: resolvedStartDate,
                category,
                status,
                is_ongoing: status === 'ACTIVE',
                goal_summary: goalSummary.trim() || null,
                description: description.trim() || null,
                share_scope: shareScope,
            };

            if (editingJourney?.id) {
                await axiosInstance.put(`/user/pets/${pet.id}/journeys/${editingJourney.id}`, payload);
                toaster.create({ title: '수첩 그룹이 수정되었습니다.', type: 'success' });
            } else {
                await axiosInstance.post(`/user/pets/${pet.id}/journeys`, payload);
                toaster.create({ title: '새 수첩 그룹이 생성되었습니다.', type: 'success' });
            }

            onOpenChange(false);
            onSaved();
        } catch (err: any) {
            toaster.create({
                title: err?.response?.data?.message || '수첩 그룹 저장에 실패했습니다.',
                type: 'error',
            });
        } finally {
            setIsSaving(false);
        }
    };

    if (!pet) return null;

    return (
        <Dialog.Root open={open} onOpenChange={(e) => onOpenChange(e.open)} placement="center" size="lg">
            <Portal>
                <Dialog.Backdrop bg="rgba(16, 17, 26, 0.56)" backdropFilter="blur(4px)" zIndex={1400} />
                <Dialog.Positioner zIndex={1401} px={4}>
                    <Dialog.Content
                        bg="var(--waba-card)"
                        color="var(--waba-ink)"
                        border="1px solid"
                        borderColor="var(--waba-line)"
                        borderRadius="24px"
                        overflow="hidden"
                        boxShadow="0 24px 60px rgba(0, 0, 0, 0.22)"
                        maxW="580px"
                        w="100%"
                    >
                        {/* 1. 헤더 */}
                        <Flex
                            align="center"
                            justify="space-between"
                            px={{ base: 5, md: 6 }}
                            py={4}
                            borderBottom="1px solid"
                            borderColor="var(--waba-line)"
                        >
                            <HStack gap={3} minW={0}>
                                <UserAvatar
                                    src={pet.current_avatar_url}
                                    alt={pet.name}
                                    size="sm"
                                    fallbackType="pet"
                                />
                                <Box minW={0}>
                                    <Text fontSize="11px" fontWeight="700" color="var(--waba-purple-text)">
                                        {pet.name}
                                    </Text>
                                    <Text fontSize="16px" fontWeight="800" color="var(--waba-ink)">
                                        {editingJourney ? '수첩 그룹 수정' : '새 수첩 그룹 만들기'}
                                    </Text>
                                </Box>
                            </HStack>
                            <CloseButton
                                size="sm"
                                rounded="full"
                                color="var(--waba-ink-3)"
                                onClick={() => onOpenChange(false)}
                            >
                                <LuX />
                            </CloseButton>
                        </Flex>

                        {/* 바디 */}
                        <Box px={{ base: 5, md: 6 }} py={5} maxH="74vh" overflowY="auto">
                            <VStack align="stretch" gap={4.5}>
                                {/* 1. 그룹 이름 */}
                                <Box>
                                    <Text fontSize="12px" fontWeight="700" color="var(--waba-ink-2)" mb={1.5}>
                                        그룹 이름 *
                                    </Text>
                                    <Input
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        placeholder="예: 슬개골 2기 비수술 관리"
                                        h="40px"
                                        rounded="12px"
                                        bg="var(--waba-surface)"
                                        borderColor="var(--waba-line)"
                                        color="var(--waba-ink)"
                                        fontSize="13px"
                                    />
                                </Box>

                                {/* 2. 카테고리 */}
                                <Box>
                                    <Text fontSize="12px" fontWeight="700" color="var(--waba-ink-2)" mb={1.5}>
                                        카테고리
                                    </Text>
                                    <HStack gap={1.5} flexWrap="wrap">
                                        {CATEGORY_OPTIONS.map((opt) => {
                                            const active = category === opt.key;
                                            return (
                                                <Button
                                                    key={opt.key}
                                                    type="button"
                                                    size="xs"
                                                    h="32px"
                                                    px={3}
                                                    rounded="full"
                                                    bg={active ? 'var(--waba-purple-soft)' : 'var(--waba-surface)'}
                                                    color={active ? 'var(--waba-purple-text)' : 'var(--waba-ink-2)'}
                                                    border="1px solid"
                                                    borderColor={active ? 'var(--waba-purple-border)' : 'var(--waba-line)'}
                                                    fontSize="12px"
                                                    fontWeight={active ? '700' : '600'}
                                                    onClick={() => setCategory(opt.key)}
                                                >
                                                    {opt.label}
                                                </Button>
                                            );
                                        })}
                                    </HStack>
                                </Box>

                                {/* 3. 진행 상태 */}
                                <Box>
                                    <Text fontSize="12px" fontWeight="700" color="var(--waba-ink-2)" mb={1.5}>
                                        진행 상태
                                    </Text>
                                    <HStack gap={2} flexWrap="wrap">
                                        {STATUS_OPTIONS.map((opt) => {
                                            const active = status === opt.key;
                                            return (
                                                <Button
                                                    key={opt.key}
                                                    type="button"
                                                    size="xs"
                                                    h="32px"
                                                    px={3.5}
                                                    rounded="full"
                                                    bg={active ? '#6338A9' : 'var(--waba-surface)'}
                                                    color={active ? '#FFFFFF' : 'var(--waba-ink-2)'}
                                                    border="1px solid"
                                                    borderColor={active ? '#6338A9' : 'var(--waba-line)'}
                                                    fontSize="12px"
                                                    fontWeight={active ? '700' : '600'}
                                                    onClick={() => setStatus(opt.key)}
                                                >
                                                    {opt.label}
                                                </Button>
                                            );
                                        })}
                                    </HStack>
                                </Box>

                                {/* 4. 목표 요약 */}
                                <Box>
                                    <Text fontSize="12px" fontWeight="700" color="var(--waba-ink-2)" mb={1.5}>
                                        목표 요약 (선택)
                                    </Text>
                                    <Input
                                        value={goalSummary}
                                        onChange={(e) => setGoalSummary(e.target.value)}
                                        placeholder="예: 체중 4.5kg → 3.9kg 감량"
                                        h="38px"
                                        rounded="12px"
                                        bg="var(--waba-surface)"
                                        borderColor="var(--waba-line)"
                                        color="var(--waba-ink)"
                                        fontSize="13px"
                                    />
                                </Box>

                                {/* 5. 설명 */}
                                <Box>
                                    <Text fontSize="12px" fontWeight="700" color="var(--waba-ink-2)" mb={1.5}>
                                        설명 (선택)
                                    </Text>
                                    <Textarea
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        placeholder="그룹에 대한 관리 방향이나 참고 메모를 자유롭게 적어주세요."
                                        rows={3}
                                        rounded="12px"
                                        bg="var(--waba-surface)"
                                        borderColor="var(--waba-line)"
                                        color="var(--waba-ink)"
                                        fontSize="13px"
                                    />
                                </Box>

                                {/* 6. 공개 여부 */}
                                <Box>
                                    <Text fontSize="12px" fontWeight="700" color="var(--waba-ink-2)" mb={1.5}>
                                        공개 여부
                                    </Text>
                                    <Flex direction={{ base: 'column', sm: 'row' }} gap={2.5}>
                                        <Flex
                                            as="button"
                                            flex={1}
                                            align="center"
                                            gap={2.5}
                                            p={3}
                                            borderRadius="14px"
                                            border="1px solid"
                                            borderColor={shareScope === 'PUBLIC' ? 'var(--waba-purple-border)' : 'var(--waba-line)'}
                                            bg={shareScope === 'PUBLIC' ? 'var(--waba-purple-soft)' : 'var(--waba-surface)'}
                                            textAlign="left"
                                            cursor="pointer"
                                            onClick={() => setShareScope('PUBLIC')}
                                        >
                                            <Box color={shareScope === 'PUBLIC' ? 'var(--waba-purple-text)' : 'var(--waba-ink-3)'}>
                                                <LuGlobe size={16} />
                                            </Box>
                                            <Box>
                                                <Text
                                                    fontSize="12px"
                                                    fontWeight="700"
                                                    color={shareScope === 'PUBLIC' ? 'var(--waba-purple-text)' : 'var(--waba-ink)'}
                                                >
                                                    공개 수첩
                                                </Text>
                                                <Text fontSize="11px" color="var(--waba-ink-3)">
                                                    건강 수첩 게시판 공유
                                                </Text>
                                            </Box>
                                        </Flex>

                                        <Flex
                                            as="button"
                                            flex={1}
                                            align="center"
                                            gap={2.5}
                                            p={3}
                                            borderRadius="14px"
                                            border="1px solid"
                                            borderColor={shareScope === 'PRIVATE' ? 'var(--waba-purple-border)' : 'var(--waba-line)'}
                                            bg={shareScope === 'PRIVATE' ? 'var(--waba-purple-soft)' : 'var(--waba-surface)'}
                                            textAlign="left"
                                            cursor="pointer"
                                            onClick={() => setShareScope('PRIVATE')}
                                        >
                                            <Box color={shareScope === 'PRIVATE' ? 'var(--waba-purple-text)' : 'var(--waba-ink-3)'}>
                                                <LuLock size={16} />
                                            </Box>
                                            <Box>
                                                <Text
                                                    fontSize="12px"
                                                    fontWeight="700"
                                                    color={shareScope === 'PRIVATE' ? 'var(--waba-purple-text)' : 'var(--waba-ink)'}
                                                >
                                                    나만 보기
                                                </Text>
                                                <Text fontSize="11px" color="var(--waba-ink-3)">
                                                    비공개
                                                </Text>
                                            </Box>
                                        </Flex>
                                    </Flex>
                                </Box>
                            </VStack>
                        </Box>

                        {/* 푸터 */}
                        <Flex
                            align="center"
                            justify="flex-end"
                            gap={2.5}
                            px={{ base: 5, md: 6 }}
                            py={4}
                            borderTop="1px solid"
                            borderColor="var(--waba-line)"
                            bg="var(--waba-surface)"
                        >
                            <Button
                                size="sm"
                                rounded="full"
                                variant="outline"
                                borderColor="var(--waba-line)"
                                color="var(--waba-ink-2)"
                                px={5}
                                onClick={() => onOpenChange(false)}
                            >
                                취소
                            </Button>
                            <Button
                                size="sm"
                                rounded="full"
                                bg="#6338A9"
                                color="#FFFFFF"
                                _hover={{ bg: '#522B8F' }}
                                px={5}
                                fontWeight="700"
                                loading={isSaving}
                                onClick={handleSave}
                            >
                                {editingJourney ? '수정 완료' : '그룹 만들기'}
                            </Button>
                        </Flex>
                    </Dialog.Content>
                </Dialog.Positioner>
            </Portal>
        </Dialog.Root>
    );
}
