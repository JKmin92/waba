'use client'

import React, { useEffect, useMemo, useState } from 'react';
import {
    Box,
    Button,
    CloseButton,
    Dialog,
    Flex,
    Grid,
    HStack,
    Input,
    NativeSelect,
    Portal,
    Text,
    Textarea,
    VStack,
} from '@chakra-ui/react';
import { LuPlus, LuX } from 'react-icons/lu';
import axiosInstance from '@/utils/api';
import { toaster } from '@/components/ui/toaster';
import { Pet } from '@/interface';
import UserAvatar from '../../common/UserAvatar';
import KoreanDatePicker from '../../common/KoreanDatePicker';
import { MypageHistoryRecord, MypageJourneyRecord } from './MypageTabsContent';
import PostPickerDialog, { SimplePostOption } from './PostPickerDialog';

type HistoryCategory = 'CHECKUP' | 'VACCINE' | 'SURGERY' | 'WEIGHT' | 'EVENT' | 'OTHER';

const CATEGORY_OPTIONS: { key: HistoryCategory; label: string }[] = [
    { key: 'CHECKUP', label: '건강검진' },
    { key: 'VACCINE', label: '예방접종' },
    { key: 'SURGERY', label: '수술/시술' },
    { key: 'WEIGHT', label: '체중' },
    { key: 'EVENT', label: '일상/이벤트' },
    { key: 'OTHER', label: '기타' },
];

interface NotebookRecordModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    pet: Pet | null;
    pets?: Pet[];
    journeys: MypageJourneyRecord[];
    editingHistory?: MypageHistoryRecord | null;
    onSaved: () => void;
}

export default function NotebookRecordModal({
    open,
    onOpenChange,
    pet,
    pets = [],
    journeys,
    editingHistory = null,
    onSaved,
}: NotebookRecordModalProps) {
    const todayStr = new Date().toISOString().slice(0, 10);

    const availablePets = useMemo(
        () => (pets.length > 0 ? pets : pet ? [pet] : []),
        [pets, pet]
    );

    const [selectedPetIds, setSelectedPetIds] = useState<string[]>([]);
    const [eventDate, setEventDate] = useState(todayStr);
    const [category, setCategory] = useState<HistoryCategory>('CHECKUP');
    const [title, setTitle] = useState('');
    const [weightKg, setWeightKg] = useState('');
    const [hospitalName, setHospitalName] = useState('');
    const [journeyId, setJourneyId] = useState('');
    const [description, setDescription] = useState('');
    const [selectedPost, setSelectedPost] = useState<SimplePostOption | null>(null);
    const [postPickerOpen, setPostPickerOpen] = useState(false);

    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (!open) return;

        if (editingHistory) {
            if (Array.isArray(editingHistory.pets) && editingHistory.pets.length > 0) {
                setSelectedPetIds(editingHistory.pets.map((p) => String(p.id)));
            } else if (editingHistory.pet?.id) {
                setSelectedPetIds([String(editingHistory.pet.id)]);
            } else if (editingHistory.pet_id) {
                setSelectedPetIds([String(editingHistory.pet_id)]);
            } else if (pet?.id) {
                setSelectedPetIds([String(pet.id)]);
            } else {
                setSelectedPetIds([]);
            }

            setEventDate((editingHistory.date || todayStr).slice(0, 10));
            setCategory((editingHistory.category as HistoryCategory) || 'CHECKUP');
            setTitle(editingHistory.title || '');
            setWeightKg(editingHistory.weight_kg ? String(editingHistory.weight_kg) : '');
            setHospitalName(editingHistory.hospital_name || '');
            setJourneyId(
                editingHistory.journey_id
                    ? String(editingHistory.journey_id)
                    : editingHistory.journey?.id
                        ? String(editingHistory.journey.id)
                        : ''
            );
            setDescription(editingHistory.description || '');
            const firstPost = editingHistory.posts?.[0];
            setSelectedPost(
                firstPost?.id
                    ? { id: String(firstPost.id), title: firstPost.title || '연결된 게시글' }
                    : null
            );
        } else {
            if (pet?.id) {
                setSelectedPetIds([String(pet.id)]);
            } else if (availablePets[0]?.id) {
                setSelectedPetIds([String(availablePets[0].id)]);
            } else {
                setSelectedPetIds([]);
            }

            setEventDate(todayStr);
            setCategory('CHECKUP');
            setTitle('');
            setWeightKg('');
            setHospitalName('');
            setJourneyId('');
            setDescription('');
            setSelectedPost(null);
        }
    }, [open, editingHistory, pet, availablePets]);

    const togglePetSelection = (petId: string) => {
        setSelectedPetIds((prev) =>
            prev.includes(petId) ? prev.filter((id) => id !== petId) : [...prev, petId]
        );
    };

    const handleSave = async () => {
        if (selectedPetIds.length === 0) {
            toaster.create({ title: '반려동물을 1마리 이상 선택해주세요.', type: 'warning' });
            return;
        }
        if (!title.trim()) {
            toaster.create({ title: '기록 제목을 입력해주세요.', type: 'warning' });
            return;
        }

        setIsSaving(true);
        try {
            const payload = {
                pet_ids: selectedPetIds,
                date: eventDate,
                event_date: eventDate,
                category,
                title: title.trim(),
                description: description.trim() || null,
                hospital_name: hospitalName.trim() || null,
                weight_kg: weightKg ? Number(weightKg) : null,
                journey_id: journeyId ? Number(journeyId) : null,
                post_ids: selectedPost ? [selectedPost.id] : [],
            };

            if (editingHistory) {
                await axiosInstance.put(`/user/histories/${editingHistory.id}`, payload);
                toaster.create({ title: '수첩 기록이 수정되었습니다.', type: 'success' });
            } else {
                await axiosInstance.post('/user/histories', payload);
                toaster.create({ title: '수첩 기록이 저장되었습니다.', type: 'success' });
            }

            onSaved();
            onOpenChange(false);
        } catch (err: any) {
            toaster.create({
                title: err?.response?.data?.message || '기록 저장에 실패했습니다.',
                type: 'error',
            });
        } finally {
            setIsSaving(false);
        }
    };

    const primaryPet =
        availablePets.find((p) => selectedPetIds.includes(String(p.id))) ||
        pet ||
        availablePets[0] ||
        null;

    if (!primaryPet && availablePets.length === 0) return null;

    const selectedPetNames = availablePets
        .filter((p) => selectedPetIds.includes(String(p.id)))
        .map((p) => p.name)
        .join(', ');

    return (
        <>
        <Dialog.Root open={open} onOpenChange={(e) => onOpenChange(e.open)} placement="center" size="lg">
            <Portal>
                <Dialog.Backdrop backdropFilter="blur(8px)" bg="blackAlpha.500" />
                <Dialog.Positioner p={{ base: 3, md: 4 }}>
                    <Dialog.Content
                        borderRadius="24px"
                        p={0}
                        overflow="hidden"
                        bg="var(--waba-card)"
                        color="var(--waba-ink)"
                        border="1px solid"
                        borderColor="var(--waba-line)"
                        maxW="620px"
                        w="100%"
                    >
                        {/* 1. 헤더 */}
                        <Flex
                            px={{ base: 5, md: 6 }}
                            py={4}
                            borderBottom="1px solid"
                            borderColor="var(--waba-line)"
                            align="center"
                            justify="space-between"
                            bg="var(--waba-card)"
                        >
                            <HStack gap={3} minW={0}>
                                <UserAvatar
                                    src={primaryPet?.current_avatar_url}
                                    alt={primaryPet?.name || '반려동물'}
                                    size="sm"
                                    fallbackType="pet"
                                />
                                <Box minW={0}>
                                    <Dialog.Title fontSize="16px" fontWeight="800" color="var(--waba-ink)">
                                        {editingHistory ? '수첩 기록 수정' : '수첩 기록 작성'}
                                    </Dialog.Title>
                                    <Text fontSize="12px" color="var(--waba-ink-3)" truncate>
                                        {selectedPetNames || '반려동물을 1마리 이상 선택해주세요'}
                                    </Text>
                                </Box>
                            </HStack>

                            <CloseButton
                                size="sm"
                                rounded="full"
                                color="var(--waba-ink-2)"
                                onClick={() => onOpenChange(false)}
                            >
                                <LuX size={16} />
                            </CloseButton>
                        </Flex>

                        {/* 바디 */}
                        <Box px={{ base: 5, md: 6 }} py={5} maxH="74vh" overflowY="auto">
                            <VStack align="stretch" gap={4.5}>
                                {/* 1. 반려동물 선택 (1마리 이상 다중 선택) */}
                                <Box>
                                    <Text fontSize="12px" fontWeight="700" color="var(--waba-ink-2)" mb={1.5}>
                                        반려동물 선택 * (1마리 이상)
                                    </Text>
                                    <HStack gap={2} flexWrap="wrap">
                                        {availablePets.map((p) => {
                                            const pid = String(p.id);
                                            const active = selectedPetIds.includes(pid);
                                            return (
                                                <Button
                                                    key={pid}
                                                    type="button"
                                                    size="xs"
                                                    h="34px"
                                                    px={3}
                                                    rounded="full"
                                                    bg={active ? 'var(--waba-purple-soft)' : 'var(--waba-surface)'}
                                                    color={active ? 'var(--waba-purple-text)' : 'var(--waba-ink-2)'}
                                                    border="1px solid"
                                                    borderColor={active ? '#6338A9' : 'var(--waba-line)'}
                                                    fontSize="12px"
                                                    fontWeight={active ? '700' : '600'}
                                                    gap={1.5}
                                                    onClick={() => togglePetSelection(pid)}
                                                >
                                                    <UserAvatar
                                                        src={p.current_avatar_url}
                                                        alt={p.name}
                                                        size="2xs"
                                                        fallbackType="pet"
                                                    />
                                                    <Text>{p.name}</Text>
                                                </Button>
                                            );
                                        })}
                                    </HStack>
                                </Box>

                                {/* 2. 날짜 */}
                                <Box maxW={{ base: '100%', sm: '220px' }}>
                                    <Text fontSize="12px" fontWeight="700" color="var(--waba-ink-2)" mb={1.5}>
                                        기록 날짜
                                    </Text>
                                    <KoreanDatePicker
                                        value={eventDate}
                                        onChange={setEventDate}
                                        h="38px"
                                    />
                                </Box>

                                {/* 3. 카테고리 */}
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
                                                    onClick={() => setCategory(opt.key)}
                                                >
                                                    {opt.label}
                                                </Button>
                                            );
                                        })}
                                    </HStack>
                                </Box>

                                {/* 4. 제목 */}
                                <Box>
                                    <Text fontSize="12px" fontWeight="700" color="var(--waba-ink-2)" mb={1.5}>
                                        제목 *
                                    </Text>
                                    <Input
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        placeholder="예: 정기 혈액검사 및 체중 측정"
                                        size="sm"
                                        h="40px"
                                        rounded="12px"
                                        bg="var(--waba-surface)"
                                        borderColor="var(--waba-line)"
                                        color="var(--waba-ink)"
                                        fontSize="13px"
                                    />
                                </Box>

                                {/* 5. 체중 & 병원명 */}
                                <Grid templateColumns={{ base: '1fr', sm: '1fr 1fr' }} gap={3.5}>
                                    <Box>
                                        <Text fontSize="12px" fontWeight="700" color="var(--waba-ink-2)" mb={1.5}>
                                            체중 (kg, 선택)
                                        </Text>
                                        <Input
                                            type="number"
                                            step="0.1"
                                            value={weightKg}
                                            onChange={(e) => setWeightKg(e.target.value)}
                                            placeholder="예: 3.8"
                                            size="sm"
                                            h="38px"
                                            rounded="12px"
                                            bg="var(--waba-surface)"
                                            borderColor="var(--waba-line)"
                                            color="var(--waba-ink)"
                                            fontSize="13px"
                                        />
                                    </Box>
                                    <Box>
                                        <Text fontSize="12px" fontWeight="700" color="var(--waba-ink-2)" mb={1.5}>
                                            병원명 (선택)
                                        </Text>
                                        <Input
                                            value={hospitalName}
                                            onChange={(e) => setHospitalName(e.target.value)}
                                            placeholder="예: 와바 동물의료센터"
                                            size="sm"
                                            h="38px"
                                            rounded="12px"
                                            bg="var(--waba-surface)"
                                            borderColor="var(--waba-line)"
                                            color="var(--waba-ink)"
                                            fontSize="13px"
                                        />
                                    </Box>
                                </Grid>

                                {/* 6. 수첩 그룹 & 게시글 연결 */}
                                <Grid templateColumns={{ base: '1fr', sm: '1fr 1fr' }} gap={3.5}>
                                    <Box>
                                        <Text fontSize="12px" fontWeight="700" color="var(--waba-ink-2)" mb={1.5}>
                                            수첩 그룹 연결 (선택)
                                        </Text>
                                        <NativeSelect.Root size="sm">
                                            <NativeSelect.Field
                                                value={journeyId}
                                                onChange={(e: any) => setJourneyId(e.target.value)}
                                                h="38px"
                                                rounded="12px"
                                                bg="var(--waba-surface)"
                                                borderColor="var(--waba-line)"
                                                color="var(--waba-ink)"
                                                fontSize="12px"
                                            >
                                                <option value="">미분류 (단독 기록)</option>
                                                {journeys.map((j) => (
                                                    <option key={j.id} value={String(j.id)}>
                                                        {j.title}
                                                    </option>
                                                ))}
                                            </NativeSelect.Field>
                                            <NativeSelect.Indicator />
                                        </NativeSelect.Root>
                                        {(editingHistory?.is_ai_generated === 1 || editingHistory?.is_ai_generated === true) && (
                                            <Text fontSize="11px" color="var(--waba-purple-text)" mt={1.5}>
                                                소속 수첩 그룹만 변경하면 ✨ AI 자동 생성 배지가 유지됩니다.
                                            </Text>
                                        )}
                                    </Box>

                                    <Box>
                                        <Text fontSize="12px" fontWeight="700" color="var(--waba-ink-2)" mb={1.5}>
                                            연결할 게시글 (선택)
                                        </Text>
                                        {selectedPost ? (
                                            <Flex
                                                align="center"
                                                justify="space-between"
                                                gap={2}
                                                h="38px"
                                                px={3}
                                                borderRadius="12px"
                                                bg="var(--waba-purple-soft)"
                                                border="1px solid"
                                                borderColor="var(--waba-purple-border)"
                                                minW={0}
                                            >
                                                <Text
                                                    fontSize="12px"
                                                    fontWeight="700"
                                                    color="var(--waba-purple-text)"
                                                    truncate
                                                    flex={1}
                                                >
                                                    {selectedPost.title}
                                                </Text>
                                                <HStack gap={1} flexShrink={0}>
                                                    <Button
                                                        type="button"
                                                        size="2xs"
                                                        h="24px"
                                                        px={2}
                                                        rounded="full"
                                                        variant="outline"
                                                        borderColor="var(--waba-purple-border)"
                                                        color="var(--waba-purple-text)"
                                                        bg="var(--waba-card)"
                                                        fontSize="11px"
                                                        fontWeight="700"
                                                        onClick={() => setPostPickerOpen(true)}
                                                    >
                                                        변경
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        size="2xs"
                                                        h="24px"
                                                        px={2}
                                                        rounded="full"
                                                        variant="ghost"
                                                        color="var(--waba-ink-3)"
                                                        fontSize="11px"
                                                        fontWeight="700"
                                                        onClick={() => setSelectedPost(null)}
                                                    >
                                                        해제
                                                    </Button>
                                                </HStack>
                                            </Flex>
                                        ) : (
                                            <Button
                                                type="button"
                                                w="100%"
                                                h="38px"
                                                rounded="12px"
                                                variant="outline"
                                                borderColor="var(--waba-line)"
                                                bg="var(--waba-surface)"
                                                color="var(--waba-ink-2)"
                                                fontSize="12px"
                                                fontWeight="700"
                                                _hover={{
                                                    borderColor: 'var(--waba-purple-border)',
                                                    bg: 'var(--waba-purple-soft)',
                                                    color: 'var(--waba-purple-text)',
                                                }}
                                                onClick={() => setPostPickerOpen(true)}
                                                gap={1.5}
                                            >
                                                <LuPlus size={14} />
                                                내 게시글 선택
                                            </Button>
                                        )}
                                    </Box>
                                </Grid>

                                {/* 7. 상세 메모 */}
                                <Box>
                                    <Text fontSize="12px" fontWeight="700" color="var(--waba-ink-2)" mb={1.5}>
                                        상세 메모 (선택)
                                    </Text>
                                    <Textarea
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        placeholder="진료 소견, 처방약, 컨디션 변화 등을 자유롭게 기록하세요."
                                        rows={3}
                                        rounded="12px"
                                        bg="var(--waba-surface)"
                                        borderColor="var(--waba-line)"
                                        color="var(--waba-ink)"
                                        fontSize="13px"
                                    />
                                </Box>
                            </VStack>
                        </Box>

                        {/* 8. 푸터 */}
                        <Flex
                            px={{ base: 5, md: 6 }}
                            py={4}
                            borderTop="1px solid"
                            borderColor="var(--waba-line)"
                            justify="flex-end"
                            gap={2.5}
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
                                {editingHistory ? '수정 완료' : '기록 저장'}
                            </Button>
                        </Flex>
                    </Dialog.Content>
                </Dialog.Positioner>
            </Portal>
        </Dialog.Root>
        <PostPickerDialog
            open={postPickerOpen}
            onOpenChange={setPostPickerOpen}
            selectedPostId={selectedPost?.id}
            onSelect={(post) => setSelectedPost(post)}
        />
        </>
    );
}
