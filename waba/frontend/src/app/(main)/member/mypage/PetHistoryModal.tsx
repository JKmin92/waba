'use client'

import React, { useState, useEffect, useMemo } from 'react';
import {
    Avatar,
    Badge,
    Box,
    Button,
    CloseButton,
    Dialog,
    Flex,
    Heading,
    HStack,
    IconButton,
    Input,
    NativeSelect,
    Portal,
    Text,
    VStack,
} from '@chakra-ui/react';
import {
    Scale,
    Calendar,
    Plus,
    Activity,
    Syringe,
    Stethoscope,
    HeartPulse,
    Sparkles,
    Pencil,
    Trash2,
    X,
    Folder,
    Link as LinkIcon,
    ExternalLink,
    Check,
    Share2,
    Layers,
    Clock,
} from 'lucide-react';
import { Pet } from '@/interface';
import axiosInstance from '@/utils/api';
import { toaster } from '@/components/ui/toaster';

export type PetHistoryCategory =
    | 'SURGERY' // 수술·치료
    | 'VACCINE' // 예방접종
    | 'CHECKUP' // 정기검진
    | 'WEIGHT'  // 체중 측정
    | 'EVENT'   // 생애 이벤트
    | 'OTHER';  // 기타

export interface PetJourney {
    id: number | string;
    pet_id: string;
    title: string;
    description?: string;
    start_date: string;
    end_date?: string | null;
    is_ongoing: boolean | number;
    share_slug: string;
    share_scope?: string;
    record_count?: number;
    created_at?: string;
}

export interface LinkedPost {
    id: string;
    title: string;
    thumbnail_url?: string;
}

export interface PetHistoryItem {
    id: string;
    pet_id: string;
    category: PetHistoryCategory;
    date: string; // YYYY-MM-DD
    title: string;
    description?: string;
    hospital_name?: string;
    weight_kg?: number | null;
    journey_id?: number | string | null;
    journey?: {
        id: number | string;
        title: string;
        is_ongoing: boolean | number;
    } | null;
    posts?: LinkedPost[];
    created_at?: string;
}

interface PetHistoryModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    pet: Pet | null;
    onHistoryUpdated?: () => void;
}

const CATEGORY_MAP: Record<PetHistoryCategory, { label: string; icon: any }> = {
    SURGERY: { label: '수술 · 치료', icon: Activity },
    VACCINE: { label: '예방접종', icon: Syringe },
    CHECKUP: { label: '정기검진', icon: Stethoscope },
    WEIGHT: { label: '체중 측정', icon: Scale },
    EVENT: { label: '생애 이벤트', icon: Sparkles },
    OTHER: { label: '기타 기록', icon: HeartPulse },
};

export default function PetHistoryModal({
    open,
    onOpenChange,
    pet,
    onHistoryUpdated,
}: PetHistoryModalProps) {
    // 탭 상태: 'timeline' (전체 기록) vs 'journey' (치료기 모아보기)
    const [activeTab, setActiveTab] = useState<'timeline' | 'journey'>('timeline');

    const [histories, setHistories] = useState<PetHistoryItem[]>([]);
    const [journeys, setJourneys] = useState<PetJourney[]>([]);
    const [myPosts, setMyPosts] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    // 실제 진료/이벤트 일자(date) 기준 최신순(내림차순) 정렬 함수
    const sortHistoriesByDateDesc = (items: PetHistoryItem[]) => {
        return [...items].sort((a, b) => {
            const timeA = new Date(a.date).getTime();
            const timeB = new Date(b.date).getTime();
            if (timeB !== timeA) {
                return timeB - timeA;
            }
            const createdA = a.created_at ? new Date(a.created_at).getTime() : 0;
            const createdB = b.created_at ? new Date(b.created_at).getTime() : 0;
            if (createdB !== createdA) {
                return createdB - createdA;
            }
            return String(b.id).localeCompare(String(a.id));
        });
    };

    // 타임라인용 정렬된 기록 목록 (항상 실제 일자 기준 최신순 유지)
    const sortedHistories = useMemo(() => sortHistoriesByDateDesc(histories), [histories]);

    // 기록 작성/수정 폼 상태
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingHistoryId, setEditingHistoryId] = useState<string | null>(null);

    const todayStr = new Date().toISOString().split('T')[0];
    const [formDate, setFormDate] = useState(todayStr);
    const [formCategory, setFormCategory] = useState<PetHistoryCategory>('SURGERY');
    const [formTitle, setFormTitle] = useState('');
    const [formDescription, setFormDescription] = useState('');
    const [formHospital, setFormHospital] = useState('');
    const [formWeight, setFormWeight] = useState('');
    const [formJourneyId, setFormJourneyId] = useState<string>('');
    const [selectedPostIds, setSelectedPostIds] = useState<string[]>([]);
    const [isSavingRecord, setIsSavingRecord] = useState(false);

    // 룩북 글 연결 선택기 팝업 상태
    const [isPostPickerOpen, setIsPostPickerOpen] = useState(false);

    // 새 치료기 모달 상태
    const [isJourneyModalOpen, setIsJourneyModalOpen] = useState(false);
    const [editingJourneyId, setEditingJourneyId] = useState<string | null>(null);
    const [journeyTitle, setJourneyTitle] = useState('');
    const [journeyDescription, setJourneyDescription] = useState('');
    const [journeyStartDate, setJourneyStartDate] = useState(todayStr);
    const [journeyEndDate, setJourneyEndDate] = useState('');
    const [journeyIsOngoing, setJourneyIsOngoing] = useState(true);
    const [journeyShareScope, setJourneyShareScope] = useState('LINK_ONLY');
    const [isSavingJourney, setIsSavingJourney] = useState(false);

    // 모달 오픈 시 데이터 로드
    useEffect(() => {
        if (!open || !pet) {
            setIsFormOpen(false);
            setEditingHistoryId(null);
            setIsJourneyModalOpen(false);
            setIsPostPickerOpen(false);
            return;
        }

        fetchData();
    }, [open, pet?.id]);

    const fetchData = async () => {
        if (!pet) return;
        setLoading(true);
        try {
            // 1. 치료기 목록 로드
            try {
                const jRes = await axiosInstance.get(`/user/pets/${pet.id}/journeys`);
                if (jRes && jRes.data) {
                    const jList = Array.isArray(jRes.data) ? jRes.data : (jRes.data.journeys || []);
                    setJourneys(jList);
                }
            } catch (jErr) {
                console.warn('Failed to fetch journeys:', jErr);
            }

            // 2. 전체 기록 로드 (실제 DB 데이터 보존: 성공 시 빈 배열이라도 그대로 유지)
            try {
                const hRes = await axiosInstance.get(`/user/pets/${pet.id}/histories`);
                if (hRes && hRes.data !== undefined) {
                    const hList = Array.isArray(hRes.data) ? hRes.data : (hRes.data.histories || []);
                    const mapped = hList.map((item: any) => ({
                        ...item,
                        date: item.date || item.event_date || (item.created_at ? item.created_at.slice(0, 10) : todayStr),
                        description: item.description || item.notes || '',
                    }));
                    setHistories(sortHistoriesByDateDesc(mapped));
                }
            } catch (hErr) {
                console.warn('Failed to fetch histories:', hErr);
            }

            // 3. 실제 로그인한 회원이 작성한 글 목록 로드 (/post/user/posts & /user/my-posts-simple)
            try {
                const userPostsRes = await axiosInstance.get('/post/user/posts').catch(() => null);
                if (userPostsRes && Array.isArray(userPostsRes.data) && userPostsRes.data.length > 0) {
                    const formatted = userPostsRes.data.map((item: any) => ({
                        id: item.post?.id,
                        title: item.post?.title,
                        thumbnail_url: item.post_images?.find((img: any) => img.is_thumbnail)?.image_url || item.post_images?.[0]?.image_url,
                        created_at: item.post?.created_at,
                        board_name: item.board?.name,
                    }));
                    setMyPosts(formatted);
                } else {
                    const simpleRes = await axiosInstance.get('/user/my-posts-simple').catch(() => null);
                    const postsData = Array.isArray(simpleRes?.data) ? simpleRes.data : (simpleRes?.data?.posts || []);
                    setMyPosts(postsData);
                }
            } catch {
                setMyPosts([]);
            }
        } catch (e) {
            console.error('Fetch error:', e);
        } finally {
            setLoading(false);
        }
    };

    // 기록 폼 초기화
    const resetRecordForm = () => {
        setFormDate(todayStr);
        setFormCategory('SURGERY');
        setFormTitle('');
        setFormDescription('');
        setFormHospital('');
        setFormWeight('');
        setFormJourneyId('');
        setSelectedPostIds([]);
        setEditingHistoryId(null);
    };

    // 기록 저장 핸들러
    const handleSaveRecord = async () => {
        if (!pet) return;
        if (!formTitle.trim()) {
            toaster.create({ title: '내용 또는 제목을 입력해주세요.', type: 'error' });
            return;
        }

        setIsSavingRecord(true);
        const payload = {
            category: formCategory,
            date: formDate,
            event_date: formDate,
            title: formTitle.trim(),
            description: formDescription.trim(),
            notes: formDescription.trim(),
            hospital_name: formHospital.trim(),
            weight_kg: formWeight ? parseFloat(formWeight) : null,
            journey_id: formJourneyId ? formJourneyId : null,
            post_ids: selectedPostIds,
        };

        try {
            if (editingHistoryId) {
                // 수정 API 호출
                await axiosInstance.put(`/user/pets/${pet.id}/histories/${editingHistoryId}`, payload);
                toaster.create({ title: '기록이 수정되었습니다.', type: 'success' });
            } else {
                // 등록 API 호출
                await axiosInstance.post(`/user/pets/${pet.id}/histories`, payload);
                toaster.create({ title: '기록이 저장되었습니다!', type: 'success' });
            }

            // DB에서 실제 저장된 최신 데이터를 다시 불러와 동기화
            await fetchData();

            setIsFormOpen(false);
            resetRecordForm();
            onHistoryUpdated?.();
        } catch (err: any) {
            const errorMsg = err.response?.data?.message || err.message || '저장 중 오류가 발생했습니다.';
            toaster.create({ title: errorMsg, type: 'error' });
        } finally {
            setIsSavingRecord(false);
        }
    };

    // 기록 삭제 핸들러
    const handleDeleteRecord = async (historyId: string) => {
        if (!pet) return;
        if (!confirm('이 기록을 삭제하시겠습니까?')) return;
        try {
            await axiosInstance.delete(`/user/pets/${pet.id}/histories/${historyId}`);
            toaster.create({ title: '기록이 삭제되었습니다.', type: 'info' });
            await fetchData();
            onHistoryUpdated?.();
        } catch (err: any) {
            const errorMsg = err.response?.data?.message || '삭제에 실패했습니다.';
            toaster.create({ title: errorMsg, type: 'error' });
        }
    };

    // 기록 수정 열기
    const handleOpenEditRecord = (item: PetHistoryItem) => {
        setEditingHistoryId(item.id);
        setFormDate(item.date);
        setFormCategory(item.category);
        setFormTitle(item.title);
        setFormDescription(item.description || '');
        setFormHospital(item.hospital_name || '');
        setFormWeight(item.weight_kg ? String(item.weight_kg) : '');
        setFormJourneyId(item.journey_id ? String(item.journey_id) : '');
        setSelectedPostIds(item.posts ? item.posts.map(p => p.id) : []);
        setIsFormOpen(true);
    };

    // 새 치료기 저장 핸들러
    const handleSaveJourney = async () => {
        if (!pet) return;
        if (!journeyTitle.trim()) {
            toaster.create({ title: '치료기 제목을 입력해주세요.', type: 'error' });
            return;
        }

        setIsSavingJourney(true);
        const payload = {
            title: journeyTitle.trim(),
            description: journeyDescription.trim(),
            start_date: journeyStartDate,
            end_date: journeyIsOngoing ? null : (journeyEndDate || null),
            is_ongoing: journeyIsOngoing,
            share_scope: journeyShareScope,
        };

        try {
            if (editingJourneyId) {
                await axiosInstance.put(`/user/pets/${pet.id}/journeys/${editingJourneyId}`, payload);
                toaster.create({ title: '치료기가 수정되었습니다.', type: 'success' });
            } else {
                const res = await axiosInstance.post(`/user/pets/${pet.id}/journeys`, payload);
                const createdId = res?.data?.id || res?.data?.journey?.id;
                if (createdId) {
                    setFormJourneyId(String(createdId));
                }
                toaster.create({ title: '새 치료기 그룹이 생성되었습니다!', type: 'success' });
            }

            await fetchData();

            setIsJourneyModalOpen(false);
            setEditingJourneyId(null);
            setJourneyTitle('');
            setJourneyDescription('');
            setJourneyStartDate(todayStr);
            setJourneyEndDate('');
            setJourneyIsOngoing(true);
        } catch (err: any) {
            const errorMsg = err.response?.data?.message || '치료기 저장에 실패했습니다.';
            toaster.create({ title: errorMsg, type: 'error' });
        } finally {
            setIsSavingJourney(false);
        }
    };

    // 치료기 삭제
    const handleDeleteJourney = async (jId: number | string) => {
        if (!pet) return;
        if (!confirm('치료기 그룹을 삭제하시겠습니까? (속한 진료 기록들은 일반 기록으로 안전하게 유지됩니다)')) return;

        try {
            await axiosInstance.delete(`/user/pets/${pet.id}/journeys/${jId}`);
            toaster.create({ title: '치료기 그룹이 삭제되었습니다.', type: 'info' });
            await fetchData();
        } catch (err: any) {
            const errorMsg = err.response?.data?.message || '삭제 실패';
            toaster.create({ title: errorMsg, type: 'error' });
        }
    };

    // 공유 링크 복사
    const handleCopyShareLink = (slug: string) => {
        const origin = typeof window !== 'undefined' ? window.location.origin : 'https://waba.kr';
        const url = `${origin}/journey/${slug}`;
        if (navigator.clipboard) {
            navigator.clipboard.writeText(url);
            toaster.create({
                title: '치료기 공유 링크가 복사되었습니다!',
                description: url,
                type: 'success',
            });
        }
    };

    // 치료 기간 D-day 계산 함수
    const getDaysDifference = (startDate: string) => {
        const start = new Date(startDate);
        const now = new Date();
        const diff = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        return Math.max(1, diff);
    };

    if (!pet) return null;

    return (
        <>
            <Dialog.Root open={open} onOpenChange={(e) => onOpenChange(e.open)}>
            <Portal>
                {/* 반투명 딤 백드롭 */}
                <Dialog.Backdrop bg="rgba(15, 17, 23, 0.5)" backdropFilter="blur(12px)" />

                <Dialog.Positioner p={{ base: 3, md: 6 }} alignItems="flex-start" pt={{ base: '24px', md: '48px' }}>
                    <Dialog.Content
                        maxW="680px"
                        w="full"
                        bg="white"
                        borderRadius="28px"
                        boxShadow="0 25px 60px -15px rgba(26, 26, 30, 0.22)"
                        border="1px solid"
                        borderColor="rgba(255, 255, 255, 0.9)"
                        overflow="hidden"
                    >
                        {/* 1. 헤더: 펫 프로필 & 닫기 */}
                        <Flex
                            px={{ base: 5, md: 7 }}
                            py={4.5}
                            borderBottom="1px solid"
                            borderColor="#F0F0F4"
                            align="center"
                            justify="space-between"
                            bg="white"
                        >
                            <HStack gap={3.5}>
                                <Avatar.Root
                                    size="md"
                                    borderRadius="full"
                                    border="1.5px solid"
                                    borderColor="#E8E8EE"
                                >
                                    {pet.current_avatar_url ? (
                                        <Avatar.Image src={pet.current_avatar_url} alt={pet.name} />
                                    ) : (
                                        <Avatar.Fallback>{pet.name.charAt(0)}</Avatar.Fallback>
                                    )}
                                </Avatar.Root>
                                <Box>
                                    <HStack gap={2}>
                                        <Heading fontSize="17px" fontWeight="800" color="charcoal" letterSpacing="-0.02em">
                                            {pet.name}의 건강 수첩
                                        </Heading>
                                        <Badge
                                            bg="#F4F4F6"
                                            color="#6E6E78"
                                            rounded="full"
                                            px={2}
                                            fontSize="11px"
                                            fontWeight="700"
                                        >
                                            {pet.breed || '반려동물'}
                                        </Badge>
                                    </HStack>
                                    <Text fontSize="12px" color="fg.subtle" mt={0.5}>
                                        최근 체중: {pet.latest_weight_kg ? `${pet.latest_weight_kg}kg` : '-'} · 생일: {pet.birth_date ? pet.birth_date.slice(0, 10) : '미등록'}
                                        {pet.is_birth_estimated ? ' (추정)' : ''}
                                    </Text>
                                </Box>
                            </HStack>

                            <Dialog.CloseTrigger asChild>
                                <CloseButton
                                    size="sm"
                                    borderRadius="full"
                                    bg="gray.100"
                                    color="gray.600"
                                    _hover={{ bg: 'gray.200', color: 'black' }}
                                />
                            </Dialog.CloseTrigger>
                        </Flex>

                        {/* 2. 세그먼트 탭 & [+ 새 기록 쓰기] 바 */}
                        <Flex
                            px={{ base: 5, md: 7 }}
                            py={3}
                            bg="#FAFAFC"
                            borderBottom="1px solid"
                            borderColor="#F0F0F4"
                            align="center"
                            justify="space-between"
                            flexWrap="wrap"
                            gap={2}
                        >
                            {/* 세그먼트 탭 */}
                            <HStack bg="#EAEAEF" p="1" rounded="2xl" gap="1">
                                <Button
                                    size="xs"
                                    rounded="xl"
                                    variant="plain"
                                    bg={activeTab === 'timeline' ? 'white' : 'transparent'}
                                    color={activeTab === 'timeline' ? 'charcoal' : 'fg.subtle'}
                                    fontWeight="bold"
                                    shadow={activeTab === 'timeline' ? 'xs' : 'none'}
                                    px={3.5}
                                    py={1.5}
                                    onClick={() => setActiveTab('timeline')}
                                >
                                    <Layers size={13} style={{ marginRight: '4px' }} />
                                    <span>전체 기록</span>
                                    <Badge ml="1.5" rounded="full" px="1.5" fontSize="10px" bg={activeTab === 'timeline' ? 'gray.100' : 'transparent'}>
                                        {histories.length}
                                    </Badge>
                                </Button>

                                <Button
                                    size="xs"
                                    rounded="xl"
                                    variant="plain"
                                    bg={activeTab === 'journey' ? 'white' : 'transparent'}
                                    color={activeTab === 'journey' ? 'charcoal' : 'fg.subtle'}
                                    fontWeight="bold"
                                    shadow={activeTab === 'journey' ? 'xs' : 'none'}
                                    px={3.5}
                                    py={1.5}
                                    onClick={() => setActiveTab('journey')}
                                >
                                    <Folder size={13} style={{ marginRight: '4px' }} />
                                    <span>치료기 모아보기</span>
                                    <Badge ml="1.5" rounded="full" px="1.5" fontSize="10px" bg={activeTab === 'journey' ? 'gray.100' : 'transparent'}>
                                        {journeys.length}
                                    </Badge>
                                </Button>
                            </HStack>

                            {/* 빠른 작성 토글 버튼 */}
                            <Button
                                size="xs"
                                bg="charcoal"
                                color="white"
                                rounded="full"
                                px={4}
                                h="32px"
                                fontWeight="bold"
                                shadow="xs"
                                _hover={{ bg: 'waba.purple' }}
                                onClick={() => {
                                    if (isFormOpen && !editingHistoryId) {
                                        setIsFormOpen(false);
                                    } else {
                                        resetRecordForm();
                                        setIsFormOpen(true);
                                    }
                                }}
                            >
                                {isFormOpen && !editingHistoryId ? (
                                    <X size={14} style={{ marginRight: '4px' }} />
                                ) : (
                                    <Plus size={14} style={{ marginRight: '4px' }} />
                                )}
                                {isFormOpen && !editingHistoryId ? '닫기' : '새 기록 쓰기'}
                            </Button>
                        </Flex>

                        {/* 3. 슬림 & 빠른 기록 작성 폼 (Collapsible) */}
                        {isFormOpen && (
                            <Box bg="#F8F8FA" borderBottom="1px solid" borderColor="#E8E8EE" p={{ base: 4, md: 5 }}>
                                <Flex justify="space-between" align="center" mb={3}>
                                    <HStack gap={1.5}>
                                        <Box w="6px" h="6px" borderRadius="full" bg="charcoal" />
                                        <Text fontSize="12px" fontWeight="800" color="charcoal">
                                            {editingHistoryId ? '건강/생애 기록 수정하기' : '새 건강/생애 기록 남기기'}
                                        </Text>
                                    </HStack>
                                    <CloseButton size="xs" onClick={() => { setIsFormOpen(false); resetRecordForm(); }} />
                                </Flex>

                                <VStack gap={3} align="stretch">
                                    {/* Line 1: 일자 + 분류 + 병원명 */}
                                    <Flex gap={2.5} flexWrap="wrap">
                                        <Box flex={1} minW="130px">
                                            <Text fontSize="11px" fontWeight="bold" color="fg.subtle" mb={1}>일자 *</Text>
                                            <Input
                                                type="date"
                                                size="sm"
                                                bg="white"
                                                rounded="xl"
                                                value={formDate}
                                                onChange={(e) => setFormDate(e.target.value)}
                                            />
                                        </Box>
                                        <Box flex={1} minW="130px">
                                            <Text fontSize="11px" fontWeight="bold" color="fg.subtle" mb={1}>분류 *</Text>
                                            <NativeSelect.Root size="sm">
                                                <NativeSelect.Field
                                                    value={formCategory}
                                                    onChange={(e: any) => setFormCategory(e.target.value as PetHistoryCategory)}
                                                    bg="white"
                                                    rounded="xl"
                                                    fontSize="xs"
                                                    fontWeight="semibold"
                                                    color="charcoal"
                                                    borderColor="#E8E8EE"
                                                    h="36px"
                                                >
                                                    {Object.entries(CATEGORY_MAP).map(([key, val]) => (
                                                        <option key={key} value={key}>{val.label}</option>
                                                    ))}
                                                </NativeSelect.Field>
                                                <NativeSelect.Indicator />
                                            </NativeSelect.Root>
                                        </Box>
                                        <Box flex={1.5} minW="160px">
                                            <Text fontSize="11px" fontWeight="bold" color="fg.subtle" mb={1}>병원/장소 (선택)</Text>
                                            <Input
                                                size="sm"
                                                bg="white"
                                                rounded="xl"
                                                placeholder="예: 닥터펫 동물병원 성수본점"
                                                value={formHospital}
                                                onChange={(e) => setFormHospital(e.target.value)}
                                            />
                                        </Box>
                                    </Flex>

                                    {/* Line 2: 내용 + 체중 */}
                                    <Flex gap={2.5}>
                                        <Box flex={3}>
                                            <Text fontSize="11px" fontWeight="bold" color="fg.subtle" mb={1}>내용 *</Text>
                                            <Input
                                                size="sm"
                                                bg="white"
                                                rounded="xl"
                                                placeholder="예: 광견병 예방접종 완료. 컨디션 양호."
                                                value={formTitle}
                                                onChange={(e) => setFormTitle(e.target.value)}
                                            />
                                        </Box>
                                        <Box flex={1} minW="80px">
                                            <Text fontSize="11px" fontWeight="bold" color="fg.subtle" mb={1}>체중 (kg)</Text>
                                            <Input
                                                size="sm"
                                                type="number"
                                                step="0.1"
                                                bg="white"
                                                rounded="xl"
                                                placeholder="3.5"
                                                value={formWeight}
                                                onChange={(e) => setFormWeight(e.target.value)}
                                            />
                                        </Box>
                                    </Flex>

                                    {/* Line 3: 치료기 연결 & 룩북 글 연결 옵션 바 */}
                                    <Flex
                                        p={2.5}
                                        bg="white"
                                        rounded="xl"
                                        border="1px solid"
                                        borderColor="#E8E8EE"
                                        justify="space-between"
                                        align="center"
                                        flexWrap="wrap"
                                        gap={2}
                                    >
                                        <HStack gap={2} alignItems="center">
                                            <Text fontSize="11px" fontWeight="bold" color="fg.subtle" whiteSpace="nowrap">📁 치료기 연결:</Text>
                                            <NativeSelect.Root size="xs" minW="180px">
                                                <NativeSelect.Field
                                                    value={formJourneyId}
                                                    onChange={(e: any) => {
                                                        if (e.target.value === '__NEW__') {
                                                            setIsJourneyModalOpen(true);
                                                        } else {
                                                            setFormJourneyId(e.target.value);
                                                        }
                                                    }}
                                                    bg="#F4F4F6"
                                                    borderColor="#E8E8EE"
                                                    rounded="lg"
                                                    fontSize="xs"
                                                    color="charcoal"
                                                    fontWeight="medium"
                                                    h="30px"
                                                >
                                                    <option value="">선택 안 함 (일반 기록)</option>
                                                    {journeys.map((j) => (
                                                        <option key={j.id} value={String(j.id)}>
                                                            {j.title} ({j.is_ongoing ? '진행 중' : '완치'})
                                                        </option>
                                                    ))}
                                                    <option value="__NEW__">+ 새 치료기 그룹 만들기</option>
                                                </NativeSelect.Field>
                                                <NativeSelect.Indicator />
                                            </NativeSelect.Root>
                                        </HStack>

                                        <Button
                                            size="xs"
                                            variant="ghost"
                                            color="waba.purple"
                                            fontWeight="bold"
                                            onClick={() => setIsPostPickerOpen(true)}
                                            _hover={{ bg: 'waba.purpleLight' }}
                                        >
                                            <LinkIcon size={12} style={{ marginRight: '4px' }} />
                                            <span>내 글 연결</span>
                                            {selectedPostIds.length > 0 && (
                                                <Badge ml={1} rounded="full" bg="waba.purple" color="white" fontSize="10px">
                                                    {selectedPostIds.length}
                                                </Badge>
                                            )}
                                        </Button>
                                    </Flex>

                                    {/* 선택된 룩북 글 태그 미리보기 */}
                                    {selectedPostIds.length > 0 && (
                                        <HStack gap={1.5} wrap="wrap">
                                            {myPosts.filter(p => selectedPostIds.includes(p.id)).map(p => (
                                                <Badge
                                                    key={p.id}
                                                    bg="waba.purpleLight"
                                                    color="waba.purple"
                                                    rounded="full"
                                                    px={2.5}
                                                    py={0.5}
                                                    fontSize="11px"
                                                    fontWeight="bold"
                                                    display="inline-flex"
                                                    alignItems="center"
                                                    gap={1}
                                                >
                                                    <span>📎 {p.title}</span>
                                                    <Box
                                                        as="button"
                                                        onClick={() => setSelectedPostIds(prev => prev.filter(id => id !== p.id))}
                                                        color="waba.purple"
                                                        opacity={0.7}
                                                        _hover={{ opacity: 1 }}
                                                    >
                                                        ✕
                                                    </Box>
                                                </Badge>
                                            ))}
                                        </HStack>
                                    )}

                                    {/* 폼 액션 버튼 */}
                                    <Flex justify="flex-end" gap={2} pt={1}>
                                        <Button
                                            size="xs"
                                            variant="ghost"
                                            color="fg.subtle"
                                            onClick={() => { setIsFormOpen(false); resetRecordForm(); }}
                                        >
                                            취소
                                        </Button>
                                        <Button
                                            size="xs"
                                            bg="charcoal"
                                            color="white"
                                            rounded="xl"
                                            px={4}
                                            fontWeight="bold"
                                            loading={isSavingRecord}
                                            _hover={{ bg: 'waba.purple' }}
                                            onClick={handleSaveRecord}
                                        >
                                            저장하기
                                        </Button>
                                    </Flex>
                                </VStack>
                            </Box>
                        )}

                        {/* ───────────────────────────────────────────────────────────── */}
                        {/* VIEW A: [전체 기록 타임라인] (종이 수첩 기본 뷰)               */}
                        {/* ───────────────────────────────────────────────────────────── */}
                        {activeTab === 'timeline' && (
                            <Box p={{ base: 5, md: 7 }} maxH="520px" overflowY="auto">
                                {sortedHistories.length > 0 ? (
                                    <Box position="relative" borderLeft="1px solid" borderColor="#E2E2E8" ml="12px" pl="24px" className="space-y-6">
                                        {sortedHistories.map((item, idx) => {
                                            const categoryMeta = CATEGORY_MAP[item.category] || CATEGORY_MAP.OTHER;
                                            return (
                                                <Box key={item.id} position="relative" className="group space-y-1.5">
                                                    {/* 타임라인 원형 닷 */}
                                                    <Box
                                                        position="absolute"
                                                        left="-31px"
                                                        top="6px"
                                                        w="13px"
                                                        h="13px"
                                                        borderRadius="full"
                                                        bg={idx === 0 ? 'charcoal' : 'gray.400'}
                                                        border="3px solid white"
                                                        shadow="xs"
                                                    />

                                                    {/* 상단 라인: 날짜 + 분류 + 치료기 태그 + 체중 */}
                                                    <Flex justify="space-between" align="center" fontSize="12px">
                                                        <HStack gap={2} flexWrap="wrap">
                                                            <Text fontWeight="800" color="charcoal">
                                                                {item.date}
                                                            </Text>
                                                            <Badge
                                                                bg="#F4F4F6"
                                                                color="#2D2D35"
                                                                border="1px solid"
                                                                borderColor="#E8E8EE"
                                                                rounded="full"
                                                                px={2}
                                                                py={0.2}
                                                                fontSize="10px"
                                                                fontWeight="bold"
                                                            >
                                                                {categoryMeta.label}
                                                            </Badge>

                                                            {/* 치료기 소속 태그 */}
                                                            {item.journey && (
                                                                <Badge
                                                                    bg="waba.purpleLight"
                                                                    color="waba.purple"
                                                                    rounded="full"
                                                                    px={2}
                                                                    py={0.2}
                                                                    fontSize="10px"
                                                                    fontWeight="bold"
                                                                >
                                                                    📁 {item.journey.title}
                                                                </Badge>
                                                            )}
                                                        </HStack>

                                                        <HStack gap={2}>
                                                            {item.weight_kg && (
                                                                <Text fontSize="12px" fontWeight="bold" color="fg.subtle">
                                                                    {item.weight_kg}kg
                                                                </Text>
                                                            )}
                                                            {/* 수정/삭제 버튼 */}
                                                            <HStack gap={1} opacity={{ base: 1, md: 0 }} _groupHover={{ opacity: 1 }} transition="opacity 0.15s">
                                                                <IconButton
                                                                    aria-label="수정"
                                                                    size="2xs"
                                                                    variant="ghost"
                                                                    color="fg.subtle"
                                                                    onClick={() => handleOpenEditRecord(item)}
                                                                >
                                                                    <Pencil size={11} />
                                                                </IconButton>
                                                                <IconButton
                                                                    aria-label="삭제"
                                                                    size="2xs"
                                                                    variant="ghost"
                                                                    color="red.400"
                                                                    onClick={() => handleDeleteRecord(item.id)}
                                                                >
                                                                    <Trash2 size={11} />
                                                                </IconButton>
                                                            </HStack>
                                                        </HStack>
                                                    </Flex>

                                                    {/* 본문 내용 */}
                                                    <Text fontSize="13px" fontWeight="500" color="charcoal" lineHeight="tall">
                                                        {item.title}
                                                    </Text>
                                                    {item.description && (
                                                        <Text fontSize="12px" color="fg.subtle" lineHeight="relaxed">
                                                            {item.description}
                                                        </Text>
                                                    )}

                                                    {/* 하단 메타 & 연결된 룩북 링크 */}
                                                    <Flex justify="space-between" align="center" fontSize="11px" color="fg.subtle" pt={0.5} flexWrap="wrap" gap={2}>
                                                        {item.hospital_name ? (
                                                            <Text>📍 {item.hospital_name}</Text>
                                                        ) : <span />}

                                                        {item.posts && item.posts.length > 0 && (
                                                            <HStack gap={1.5} flexWrap="wrap">
                                                                {item.posts.map(post => (
                                                                    <a
                                                                        key={post.id}
                                                                        href={`/post/${post.id}`}
                                                                        target="_blank"
                                                                        rel="noreferrer"
                                                                        className="inline-flex items-center gap-1 text-[11px] text-[#7B5CFA] font-bold hover:underline"
                                                                    >
                                                                        <span>📎 {post.title}</span>
                                                                        <span>→</span>
                                                                    </a>
                                                                ))}
                                                            </HStack>
                                                        )}
                                                    </Flex>
                                                </Box>
                                            );
                                        })}
                                    </Box>
                                ) : (
                                    <VStack py={12} gap={3} textAlign="center">
                                        <Box w="12" h="12" rounded="full" bg="gray.100" display="flex" alignItems="center" justifyContent="center">
                                            <Calendar size={24} className="text-gray-400" />
                                        </Box>
                                        <Text fontSize="sm" fontWeight="bold" color="charcoal">
                                            아직 등록된 진료 및 생애 기록이 없습니다.
                                        </Text>
                                        <Text fontSize="xs" color="fg.subtle">
                                            상단의 [+ 새 기록 쓰기]를 눌러 첫 번째 기록을 남겨보세요!
                                        </Text>
                                    </VStack>
                                )}
                            </Box>
                        )}

                        {/* ───────────────────────────────────────────────────────────── */}
                        {/* VIEW B: [치료기 모아보기 탭] (선택형 폴더 뷰)                  */}
                        {/* ───────────────────────────────────────────────────────────── */}
                        {activeTab === 'journey' && (
                            <Box p={{ base: 5, md: 7 }} maxH="520px" overflowY="auto">
                                <Flex justify="space-between" align="center" mb={4}>
                                    <Box>
                                        <Heading fontSize="13px" fontWeight="black" color="charcoal">
                                            장기 치료기 묶음 ({journeys.length}개)
                                        </Heading>
                                        <Text fontSize="11px" color="fg.subtle">
                                            질환별 회복 과정을 묶어서 관리하고 외부 공유 링크를 생성할 수 있습니다.
                                        </Text>
                                    </Box>
                                    <Button
                                        size="xs"
                                        variant="plain"
                                        color="waba.purple"
                                        fontWeight="bold"
                                        onClick={() => {
                                            setEditingJourneyId(null);
                                            setJourneyTitle('');
                                            setJourneyDescription('');
                                            setJourneyStartDate(todayStr);
                                            setJourneyEndDate('');
                                            setJourneyIsOngoing(true);
                                            setIsJourneyModalOpen(true);
                                        }}
                                        _hover={{ textDecoration: 'underline' }}
                                    >
                                        + 새 치료기 만들기
                                    </Button>
                                </Flex>

                                {journeys.length > 0 ? (
                                    <VStack gap={3.5} align="stretch">
                                        {journeys.map((j) => {
                                            const daysDiff = getDaysDifference(j.start_date);
                                            return (
                                                <Box
                                                    key={j.id}
                                                    bg="white"
                                                    p={4.5}
                                                    rounded="2xl"
                                                    border="1px solid"
                                                    borderColor="#E8E8EE"
                                                    shadow="xs"
                                                    transition="all 0.2s"
                                                    _hover={{ borderColor: 'waba.purple', shadow: 'sm' }}
                                                >
                                                    <Flex justify="space-between" align="flex-start" gap={3}>
                                                        <Box flex={1}>
                                                            {/* 진행 중 vs 완치 완료 상태 */}
                                                            <HStack gap={2} mb={1}>
                                                                {j.is_ongoing ? (
                                                                    <Badge bg="waba.purpleLight" color="waba.purple" rounded="full" px={2} py={0.5} fontSize="10px" fontWeight="black">
                                                                        ● 치료 진행 중
                                                                    </Badge>
                                                                ) : (
                                                                    <Badge bg="gray.100" color="fg.subtle" rounded="full" px={2} py={0.5} fontSize="10px" fontWeight="bold">
                                                                        ✓ 완치 완료
                                                                    </Badge>
                                                                )}
                                                                <Text fontSize="11px" color="fg.subtle" fontWeight="semibold">
                                                                    {j.start_date} ~ {j.is_ongoing ? `진행 중 (D+${daysDiff})` : (j.end_date || '완치')}
                                                                </Text>
                                                            </HStack>

                                                            <Heading fontSize="14px" fontWeight="800" color="charcoal" mt={0.5}>
                                                                {j.title}
                                                            </Heading>
                                                            <Text fontSize="12px" color="fg.subtle" mt={1}>
                                                                {j.description || '치료 기록 보관됨'}
                                                            </Text>
                                                        </Box>

                                                        {/* 공유 버튼 & 관리 */}
                                                        <HStack gap={1.5}>
                                                            <Button
                                                                size="xs"
                                                                bg="#F4F4F6"
                                                                color="charcoal"
                                                                rounded="xl"
                                                                px={3}
                                                                fontWeight="bold"
                                                                onClick={() => handleCopyShareLink(j.share_slug)}
                                                                _hover={{ bg: 'waba.purpleLight', color: 'waba.purple' }}
                                                            >
                                                                <Share2 size={12} style={{ marginRight: '4px' }} />
                                                                공유 링크
                                                            </Button>
                                                            <IconButton
                                                                aria-label="수정"
                                                                size="xs"
                                                                variant="ghost"
                                                                color="fg.subtle"
                                                                onClick={() => {
                                                                    setEditingJourneyId(String(j.id));
                                                                    setJourneyTitle(j.title);
                                                                    setJourneyDescription(j.description || '');
                                                                    setJourneyStartDate(j.start_date);
                                                                    setJourneyEndDate(j.end_date || '');
                                                                    setJourneyIsOngoing(Boolean(j.is_ongoing));
                                                                    setJourneyShareScope(j.share_scope || 'LINK_ONLY');
                                                                    setIsJourneyModalOpen(true);
                                                                }}
                                                            >
                                                                <Pencil size={12} />
                                                            </IconButton>
                                                            <IconButton
                                                                aria-label="삭제"
                                                                size="xs"
                                                                variant="ghost"
                                                                color="red.400"
                                                                onClick={() => handleDeleteJourney(j.id)}
                                                            >
                                                                <Trash2 size={12} />
                                                            </IconButton>
                                                        </HStack>
                                                    </Flex>
                                                </Box>
                                            );
                                        })}
                                    </VStack>
                                ) : (
                                    <VStack py={10} gap={2} textAlign="center">
                                        <Text fontSize="sm" fontWeight="bold" color="charcoal">
                                            등록된 치료기 그룹이 없습니다.
                                        </Text>
                                        <Text fontSize="xs" color="fg.subtle">
                                            슬개골 탈구, 피부 질환 등 장기 치료 여정을 하나의 폴더로 묶어보세요.
                                        </Text>
                                    </VStack>
                                )}
                            </Box>
                        )}

                        {/* 4. 푸터 */}
                        <Flex
                            px={{ base: 5, md: 7 }}
                            py={3.5}
                            bg="#FAFAFC"
                            borderTop="1px solid"
                            borderColor="#F0F0F4"
                            justify="space-between"
                            align="center"
                            fontSize="12px"
                            color="fg.subtle"
                        >
                            <Text>💡 일반 기록을 작성할 때 필요하면 치료기 그룹을 골라 담을 수 있습니다.</Text>
                            <Button
                                size="xs"
                                variant="outline"
                                rounded="xl"
                                px={4}
                                fontWeight="bold"
                                onClick={() => onOpenChange(false)}
                            >
                                닫기
                            </Button>
                        </Flex>

                    </Dialog.Content>
                </Dialog.Positioner>
            </Portal>
        </Dialog.Root>

        {/* ───────────────────────────────────────────────────────────── */}
        {/* SUB-MODAL 1: 새 치료기 그룹 생성/수정 모달                    */}
        {/* ───────────────────────────────────────────────────────────── */}
        <Dialog.Root open={isJourneyModalOpen} onOpenChange={(e) => setIsJourneyModalOpen(e.open)}>
            <Portal>
                <Dialog.Backdrop bg="rgba(15, 17, 23, 0.6)" backdropFilter="blur(8px)" zIndex={1500} />
                <Dialog.Positioner zIndex={1500} p={{ base: 3, md: 6 }} alignItems="center" justifyContent="center">
                    <Dialog.Content
                        w="full"
                        maxW="480px"
                        bg="white"
                        rounded="3xl"
                        p={6}
                        shadow="2xl"
                        border="1px solid"
                        borderColor="#E8E8EE"
                    >
                        <Flex justify="space-between" align="center" mb={4}>
                            <Heading fontSize="16px" fontWeight="800" color="charcoal">
                                {editingJourneyId ? '치료기 그룹 수정' : '새 치료기 그룹 만들기'}
                            </Heading>
                            <Dialog.CloseTrigger asChild>
                                <CloseButton size="xs" onClick={() => setIsJourneyModalOpen(false)} />
                            </Dialog.CloseTrigger>
                        </Flex>

                        <VStack gap={3.5} align="stretch">
                            <Box>
                                <Text fontSize="11px" fontWeight="bold" color="fg.subtle" mb={1}>치료기 제목 *</Text>
                                <Input
                                    size="sm"
                                    rounded="xl"
                                    placeholder="예: 좌측 슬개골 탈구 수술 및 재활 여정"
                                    value={journeyTitle}
                                    onChange={(e) => setJourneyTitle(e.target.value)}
                                />
                            </Box>

                            <Box>
                                <Text fontSize="11px" fontWeight="bold" color="fg.subtle" mb={1}>한 줄 설명 / 메모 (선택)</Text>
                                <Input
                                    size="sm"
                                    rounded="xl"
                                    placeholder="예: 닥터펫 동물병원 성수본점 · 활차구 성형술"
                                    value={journeyDescription}
                                    onChange={(e) => setJourneyDescription(e.target.value)}
                                />
                            </Box>

                            <Flex gap={2.5}>
                                <Box flex={1}>
                                    <Text fontSize="11px" fontWeight="bold" color="fg.subtle" mb={1}>시작 일자 *</Text>
                                    <Input
                                        type="date"
                                        size="sm"
                                        rounded="xl"
                                        value={journeyStartDate}
                                        onChange={(e) => setJourneyStartDate(e.target.value)}
                                    />
                                </Box>

                                <Box flex={1}>
                                    <Text fontSize="11px" fontWeight="bold" color="fg.subtle" mb={1}>
                                        {journeyIsOngoing ? '치료 상태' : '완치/종료 일자'}
                                    </Text>
                                    {journeyIsOngoing ? (
                                        <Box
                                            h="36px"
                                            rounded="xl"
                                            bg="waba.purpleLight"
                                            display="flex"
                                            alignItems="center"
                                            px={3}
                                            fontSize="11px"
                                            fontWeight="bold"
                                            color="waba.purple"
                                        >
                                            ● 진행 중 (종료일 없음)
                                        </Box>
                                    ) : (
                                        <Input
                                            type="date"
                                            size="sm"
                                            rounded="xl"
                                            value={journeyEndDate}
                                            onChange={(e) => setJourneyEndDate(e.target.value)}
                                        />
                                    )}
                                </Box>
                            </Flex>

                            {/* 치료 진행 중 체크박스 */}
                            <HStack
                                as="label"
                                cursor="pointer"
                                bg="#F4F4F6"
                                p={2.5}
                                rounded="xl"
                                align="center"
                                gap={2}
                            >
                                <input
                                    type="checkbox"
                                    checked={journeyIsOngoing}
                                    onChange={(e) => setJourneyIsOngoing(e.target.checked)}
                                    className="w-4 h-4 rounded text-[#7B5CFA] focus:ring-0"
                                />
                                <Text fontSize="12px" fontWeight="bold" color="charcoal">
                                    현재 치료 진행 중입니다
                                </Text>
                                <Text fontSize="10px" color="fg.subtle">
                                    (체크 해제 시 완치 일자를 입력할 수 있습니다)
                                </Text>
                            </HStack>

                            <Flex justify="flex-end" gap={2} pt={2}>
                                <Button size="xs" variant="ghost" onClick={() => setIsJourneyModalOpen(false)}>
                                    취소
                                </Button>
                                <Button
                                    size="xs"
                                    bg="charcoal"
                                    color="white"
                                    rounded="xl"
                                    px={4}
                                    fontWeight="bold"
                                    loading={isSavingJourney}
                                    onClick={handleSaveJourney}
                                >
                                    저장하기
                                </Button>
                            </Flex>
                        </VStack>
                    </Dialog.Content>
                </Dialog.Positioner>
            </Portal>
        </Dialog.Root>

        {/* ───────────────────────────────────────────────────────────── */}
        {/* SUB-MODAL 2: 내 룩북 글 연결 선택기 팝업                      */}
        {/* ───────────────────────────────────────────────────────────── */}
        <Dialog.Root open={isPostPickerOpen} onOpenChange={(e) => setIsPostPickerOpen(e.open)}>
            <Portal>
                <Dialog.Backdrop bg="rgba(15, 17, 23, 0.6)" backdropFilter="blur(8px)" zIndex={1500} />
                <Dialog.Positioner zIndex={1500} p={{ base: 3, md: 6 }} alignItems="center" justifyContent="center">
                    <Dialog.Content
                        w="full"
                        maxW="480px"
                        bg="white"
                        rounded="3xl"
                        p={6}
                        shadow="2xl"
                        border="1px solid"
                        borderColor="#E8E8EE"
                    >
                        <Flex justify="space-between" align="center" mb={3}>
                            <Box>
                                <Heading fontSize="15px" fontWeight="800" color="charcoal">
                                    내 글 연결하기
                                </Heading>
                                <Text fontSize="11px" color="fg.subtle">
                                    이 기록과 연결할 내가 작성한 게시글을 선택하세요.
                                </Text>
                            </Box>
                            <Dialog.CloseTrigger asChild>
                                <CloseButton size="xs" onClick={() => setIsPostPickerOpen(false)} />
                            </Dialog.CloseTrigger>
                        </Flex>

                        <VStack gap={2} maxH="280px" overflowY="auto" my={3} align="stretch">
                            {myPosts.length > 0 ? (
                                myPosts.map((post) => {
                                    const isChecked = selectedPostIds.includes(post.id);
                                    return (
                                        <Flex
                                            key={post.id}
                                            p={3}
                                            rounded="xl"
                                            border="1px solid"
                                            borderColor={isChecked ? 'waba.purple' : '#E8E8EE'}
                                            bg={isChecked ? 'waba.purpleLight' : 'white'}
                                            align="center"
                                            justify="space-between"
                                            cursor="pointer"
                                            onClick={() => {
                                                setSelectedPostIds(prev =>
                                                    prev.includes(post.id)
                                                        ? prev.filter(id => id !== post.id)
                                                        : [...prev, post.id]
                                                );
                                            }}
                                        >
                                            <HStack gap={2.5} flex={1} minW={0}>
                                                <Box
                                                    w="18px"
                                                    h="18px"
                                                    rounded="md"
                                                    border="1.5px solid"
                                                    borderColor={isChecked ? 'waba.purple' : '#C4C4CC'}
                                                    bg={isChecked ? 'waba.purple' : 'white'}
                                                    display="flex"
                                                    alignItems="center"
                                                    justifyContent="center"
                                                    color="white"
                                                    flexShrink={0}
                                                >
                                                    {isChecked && <Check size={12} strokeWidth={3} />}
                                                </Box>
                                                {post.thumbnail_url ? (
                                                    <Box w="36px" h="36px" rounded="lg" overflow="hidden" flexShrink={0} bg="gray.100">
                                                        <img src={post.thumbnail_url} alt="" className="w-full h-full object-cover" />
                                                    </Box>
                                                ) : (
                                                    <Box w="36px" h="36px" rounded="lg" bg="gray.100" display="flex" alignItems="center" justifyContent="center" flexShrink={0} color="gray.400">
                                                        <Layers size={16} />
                                                    </Box>
                                                )}
                                                <Box flex={1} minW={0}>
                                                    <Text fontSize="12px" fontWeight="bold" color="charcoal" truncate>
                                                        {post.title}
                                                    </Text>
                                                    <HStack gap={1.5} mt={0.5}>
                                                        {post.board_name && (
                                                            <Badge size="xs" fontSize="10px" px={1.5} py={0} bg="gray.100" color="fg.subtle">
                                                                {post.board_name}
                                                            </Badge>
                                                        )}
                                                        <Text fontSize="10px" color="fg.subtle">
                                                            {post.created_at ? post.created_at.slice(0, 10) : ''}
                                                        </Text>
                                                    </HStack>
                                                </Box>
                                            </HStack>
                                        </Flex>
                                    );
                                })
                            ) : (
                                <Text fontSize="xs" color="fg.subtle" py={8} textAlign="center">
                                    아직 작성하신 글이 없습니다. 커뮤니티에 글을 작성하고 기록과 연결해 보세요.
                                </Text>
                            )}
                        </VStack>

                        <Flex justify="space-between" align="center" pt={2} borderTop="1px solid" borderColor="#F0F0F4">
                            <Text fontSize="11px" fontWeight="bold" color="waba.purple">
                                {selectedPostIds.length}개 선택됨
                            </Text>
                            <Button
                                size="xs"
                                bg="charcoal"
                                color="white"
                                rounded="xl"
                                px={4}
                                fontWeight="bold"
                                onClick={() => setIsPostPickerOpen(false)}
                            >
                                선택 완료
                            </Button>
                        </Flex>
                    </Dialog.Content>
                </Dialog.Positioner>
            </Portal>
        </Dialog.Root>
    </>
);
}
