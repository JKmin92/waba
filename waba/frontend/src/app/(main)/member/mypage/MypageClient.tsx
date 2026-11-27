'use client'

import { Box, Button, Flex, HStack, IconButton, Menu, Portal, Text, VStack } from "@chakra-ui/react";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import axiosInstance from "@/utils/api";
import { clearAuthSession, isAuthenticated } from "@/utils/authUtils";
import { formatPetShortName } from "@/utils/simpleUtils";
import { toaster } from "@/components/ui/toaster";
import { Pet, PostDetail } from "@/interface";
import { LuEllipsis, LuPencil, LuPlus, LuTrash2 } from "react-icons/lu";
import UserAvatar from "../../common/UserAvatar";
import MypageGuestView from "./MypageGuestView";
import { UserProfileData } from "./ProfileSection";
import ActivitySection from "./ActivitySection";
import ProfileEditModal from "./ProfileEditModal";
import WithdrawAccountModal from "./WithdrawAccountModal";
import PetRegisterModal from "./PetRegisterModal";
import PetManageAllModal from "./PetManageAllModal";
import NotebookGroupModal from "./NotebookGroupModal";
import NotebookRecordModal from "./NotebookRecordModal";
import {
    MypageHistoryRecord,
    MypageJourneyRecord,
    MypageNotebookTab,
    MypageScrappedNotebooks,
    MypageSettingsTab,
} from "./MypageTabsContent";
import { NotebookItem } from "../../notebook/notebook-components/types";

type MypageMainTab = 'notebook' | 'activity' | 'settings';

export default function MypageClient() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const initialTabParam = searchParams.get('tab');

    const [mainTab, setMainTab] = useState<MypageMainTab>(() => {
        if (initialTabParam === 'activity' || initialTabParam === 'post' || initialTabParam === 'bookmark' || initialTabParam === 'like' || initialTabParam === 'draft') {
            return 'activity';
        }
        if (initialTabParam === 'settings') return 'settings';
        return 'notebook';
    });

    const [activitySubTab, setActivitySubTab] = useState<'post' | 'bookmark' | 'like' | 'draft' | 'appeal'>(
        initialTabParam && ['post', 'bookmark', 'like', 'draft'].includes(initialTabParam)
            ? (initialTabParam as 'post' | 'bookmark' | 'like' | 'draft')
            : 'post'
    );

    const [profile, setProfile] = useState<UserProfileData | null>(null);
    const [pets, setPets] = useState<Pet[]>([]);
    const [selectedPetId, setSelectedPetId] = useState<string | null>(null);
    const [activityPetId, setActivityPetId] = useState<string | null>(null);

    const [histories, setHistories] = useState<MypageHistoryRecord[]>([]);
    const [selectedHistoryPetIds, setSelectedHistoryPetIds] = useState<string[]>([]);
    const [historyFilterMode, setHistoryFilterMode] = useState<'all' | 'group' | 'unclassified'>('all');
    const [historyOffset, setHistoryOffset] = useState(0);
    const [historyTotal, setHistoryTotal] = useState(0);
    const [historyHasMore, setHistoryHasMore] = useState(false);
    const [isLoadingMoreHistories, setIsLoadingMoreHistories] = useState(false);
    const [journeys, setJourneys] = useState<MypageJourneyRecord[]>([]);
    const [scrappedNotebooks, setScrappedNotebooks] = useState<NotebookItem[]>([]);

    const [postList, setPostList] = useState<PostDetail[]>([]);
    const [bookmarkList, setBookmarkList] = useState<PostDetail[]>([]);
    const [likeList, setLikeList] = useState<PostDetail[]>([]);
    const [draftList, setDraftList] = useState<any[]>([]);
    const [reportedDeletedPosts, setReportedDeletedPosts] = useState<any[]>([]);

    const [autoJournalEnabled, setAutoJournalEnabled] = useState(true);
    const [isUpdatingAutoJournal, setIsUpdatingAutoJournal] = useState(false);

    const [loading, setLoading] = useState(true);
    const [tabLoading, setTabLoading] = useState(false);
    const [withdrawModalOpen, setWithdrawModalOpen] = useState(false);
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [petModalOpen, setPetModalOpen] = useState(false);
    const [allPetsModalOpen, setAllPetsModalOpen] = useState(false);
    const [groupModalOpen, setGroupModalOpen] = useState(false);
    const [editingJourney, setEditingJourney] = useState<MypageJourneyRecord | null>(null);
    const [recordModalOpen, setRecordModalOpen] = useState(false);
    const [editingHistory, setEditingHistory] = useState<MypageHistoryRecord | null>(null);
    const [editingPet, setEditingPet] = useState<Pet | null>(null);

    const openLoginModal = () => {
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('open-login-modal'));
        }
    };

    const activePet = useMemo(() => {
        if (pets.length === 0) return null;
        return pets.find((p) => String(p.id) === String(selectedPetId)) || pets[0];
    }, [pets, selectedPetId]);

    useEffect(() => {
        const loadAuthenticatedData = () => {
            setLoading(true);
            fetchUserProfile();
            fetchAutoJournalSetting();
            fetchScrappedNotebooks();
            fetchActivityTabData(activitySubTab);
            fetchReportedDeletedPosts();
        };

        if (isAuthenticated()) {
            loadAuthenticatedData();
        } else {
            setLoading(false);
            openLoginModal();
        }

        const handleAuthChange = () => {
            if (isAuthenticated()) {
                loadAuthenticatedData();
            } else {
                setProfile(null);
                setPets([]);
                setSelectedPetId(null);
                setHistories([]);
                setJourneys([]);
                setLoading(false);
                openLoginModal();
            }
        };

        window.addEventListener('auth-change', handleAuthChange);
        return () => window.removeEventListener('auth-change', handleAuthChange);
    }, []);

    useEffect(() => {
        if (isAuthenticated() && mainTab === 'activity') {
            fetchActivityTabData(activitySubTab);
        fetchReportedDeletedPosts();
        }
    }, [activitySubTab, mainTab]);

    useEffect(() => {
        if (!isAuthenticated() || (!activePet?.id && pets.length === 0)) {
            setHistories([]);
            setJourneys([]);
            return;
        }
        fetchPetTimelineAndJourneys(activePet?.id);
    }, [activePet?.id, pets.length]);

    const fetchUserProfile = async () => {
        try {
            const res = await axiosInstance.get('/user/profile');
            if (res.data?.success && res.data?.profile) {
                setProfile(res.data.profile);
                if (res.data.profile.pets) {
                    const loadedPets: Pet[] = res.data.profile.pets;
                    setPets(loadedPets);
                    setSelectedPetId((prev) => prev || (loadedPets[0]?.id ? String(loadedPets[0].id) : null));
                }
            }
        } catch (e: any) {
            if (e.response?.status === 401) {
                openLoginModal();
            } else {
                toaster.create({ title: '프로필 정보를 불러오지 못했습니다.', type: 'error' });
            }
        } finally {
            setLoading(false);
        }
    };

    const fetchPetTimelineAndJourneys = async (
        petId?: string | number | null,
        options?: {
            petIds?: string[];
            filterMode?: 'all' | 'group' | 'unclassified';
            offset?: number;
            append?: boolean;
        }
    ) => {
        const petIds = options?.petIds ?? selectedHistoryPetIds;
        const filterMode = options?.filterMode ?? historyFilterMode;
        const offset = options?.offset ?? 0;
        const append = options?.append ?? false;

        const histParams: Record<string, any> = { limit: 20, offset };
        if (petIds.length > 0) histParams.pet_ids = petIds.join(',');
        if (filterMode === 'unclassified') histParams.unclassified = 'true';

        if (append) {
            setIsLoadingMoreHistories(true);
            try {
                const histRes = await axiosInstance.get('/user/histories', { params: histParams });
                const newHistories: MypageHistoryRecord[] = histRes.data?.histories || [];
                setHistories((prev) => {
                    const seen = new Set(prev.map((h) => String(h.id)));
                    const uniqueNew = newHistories.filter((h) => !seen.has(String(h.id)));
                    return [...prev, ...uniqueNew];
                });
                setHistoryOffset(offset + newHistories.length);
                setHistoryTotal(histRes.data?.total ?? offset + newHistories.length);
                setHistoryHasMore(Boolean(histRes.data?.hasMore));
            } catch {
                // 조용히 처리
            } finally {
                setIsLoadingMoreHistories(false);
            }
            return;
        }

        try {
            const targetPetIds =
                pets.length > 0
                    ? pets.map((p) => p.id)
                    : petId
                        ? [petId]
                        : [];

            const [histRes, ...jourResList] = await Promise.all([
                axiosInstance.get('/user/histories', { params: histParams }),
                ...targetPetIds.map((id) => axiosInstance.get(`/user/pets/${id}/journeys`)),
            ]);
            const newHistories: MypageHistoryRecord[] = histRes.data?.histories || [];
            setHistories(newHistories);
            setHistoryOffset(newHistories.length);
            setHistoryTotal(histRes.data?.total ?? newHistories.length);
            setHistoryHasMore(Boolean(histRes.data?.hasMore));

            const mergedJourneys: MypageJourneyRecord[] = [];
            const seenJourneyIds = new Set<string>();
            for (const jRes of jourResList) {
                const list: MypageJourneyRecord[] = jRes.data?.journeys || [];
                for (const j of list) {
                    const key = String(j.id);
                    if (!seenJourneyIds.has(key)) {
                        seenJourneyIds.add(key);
                        mergedJourneys.push(j);
                    }
                }
            }
            setJourneys(mergedJourneys);
        } catch {
            // 조용히 처리
        }
    };

    const handleSelectAllHistoryPets = () => {
        setSelectedHistoryPetIds([]);
        fetchPetTimelineAndJourneys(activePet?.id, {
            petIds: [],
            filterMode: historyFilterMode,
            offset: 0,
            append: false,
        });
    };

    const handleToggleHistoryPetId = (petId: string) => {
        const exists = selectedHistoryPetIds.includes(petId);
        let nextIds = exists
            ? selectedHistoryPetIds.filter((id) => id !== petId)
            : [...selectedHistoryPetIds, petId];
        if (pets.length > 0 && nextIds.length >= pets.length) {
            nextIds = [];
        }
        setSelectedHistoryPetIds(nextIds);
        fetchPetTimelineAndJourneys(activePet?.id, {
            petIds: nextIds,
            filterMode: historyFilterMode,
            offset: 0,
            append: false,
        });
    };

    const handleApplyHistoryPetIds = (petIds: string[]) => {
        let nextIds = petIds;
        if (pets.length > 0 && nextIds.length >= pets.length) {
            nextIds = [];
        }
        setSelectedHistoryPetIds(nextIds);
        fetchPetTimelineAndJourneys(activePet?.id, {
            petIds: nextIds,
            filterMode: historyFilterMode,
            offset: 0,
            append: false,
        });
    };

    const handleChangeHistoryFilterMode = (nextMode: 'all' | 'group' | 'unclassified') => {
        setHistoryFilterMode(nextMode);
        fetchPetTimelineAndJourneys(activePet?.id, {
            petIds: selectedHistoryPetIds,
            filterMode: nextMode,
            offset: 0,
            append: false,
        });
    };

    const handleLoadMoreHistories = () => {
        if (!historyHasMore || isLoadingMoreHistories) return;
        fetchPetTimelineAndJourneys(activePet?.id, {
            petIds: selectedHistoryPetIds,
            filterMode: historyFilterMode,
            offset: historyOffset,
            append: true,
        });
    };

    const fetchScrappedNotebooks = async () => {
        try {
            const res = await axiosInstance.get('/notebooks?tab=scrapped');
            const rawList: any[] = Array.isArray(res.data)
                ? res.data
                : res.data?.notebooks || res.data?.journeys || res.data?.data || [];
            const list: NotebookItem[] = rawList.map((nb) => ({
                ...nb,
                status: nb.status || (nb.is_ongoing ? 'ACTIVE' : 'CURED'),
                user: nb.user || nb.owner || null,
            }));
            setScrappedNotebooks(list);
        } catch {
            setScrappedNotebooks([]);
        }
    };

    const fetchAutoJournalSetting = async () => {
        try {
            const res = await axiosInstance.get('/user/settings/auto-journal');
            const val = res.data?.auto_journal_enabled ?? res.data?.enabled;
            if (typeof val === 'boolean') {
                setAutoJournalEnabled(val);
            }
        } catch {
            // 기본값 유지
        }
    };

    const handleToggleAutoJournal = async (checked: boolean) => {
        setIsUpdatingAutoJournal(true);
        try {
            await axiosInstance.patch('/user/settings/auto-journal', { enabled: checked });
            setAutoJournalEnabled(checked);
            window.dispatchEvent(new CustomEvent('auth-change'));
            toaster.create({
                title: checked ? 'AI 건강 수첩 자동 기록이 켜졌습니다.' : 'AI 건강 수첩 자동 기록이 꺼졌습니다.',
                type: 'success',
            });
        } catch {
            toaster.create({ title: '설정 변경에 실패했습니다.', type: 'error' });
        } finally {
            setIsUpdatingAutoJournal(false);
        }
    };

    const handleUnscrapNotebook = async (notebookId: string | number, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            await axiosInstance.post(`/notebooks/${notebookId}/scrap`);
            setScrappedNotebooks((prev) => prev.filter((nb) => nb.id !== notebookId));
            toaster.create({ title: '수첩 스크랩이 해제되었습니다.', type: 'info' });
        } catch {
            toaster.create({ title: '스크랩 해제에 실패했습니다.', type: 'error' });
        }
    };

    const fetchReportedDeletedPosts = async () => {
        if (!isAuthenticated()) return;
        try {
            const res = await axiosInstance.get('/post/user/reported-deleted');
            if (res.data?.success && Array.isArray(res.data.posts)) {
                setReportedDeletedPosts(res.data.posts);
            }
        } catch {
            // 조용히 처리
        }
    };

    const handleSubmitAppeal = async (postId: string, reason: string) => {
        try {
            const res = await axiosInstance.post(`/post/${postId}/appeal`, { reason });
            const extended = Boolean(res.data?.extendedByAppeal);
            toaster.create({
                title: extended
                    ? '이의 제기가 접수되었으며 심사 기간 확보를 위해 삭제 예정일이 10일 연장되었습니다.'
                    : '이의 제기가 접수되었습니다.',
                type: 'success',
            });
            await fetchReportedDeletedPosts();
        } catch (err: any) {
            toaster.create({
                title: err?.response?.data?.message || '이의 제기 접수에 실패했습니다.',
                type: 'error',
            });
        }
    };

    const fetchActivityTabData = async (tab: 'post' | 'bookmark' | 'like' | 'draft' | 'appeal') => {
        setTabLoading(true);
        try {
            if (tab === 'post') {
                const res = await axiosInstance.get('/post/user/posts');
                setPostList(res.data || []);
            } else if (tab === 'bookmark') {
                const res = await axiosInstance.get('/post/user/bookmarks');
                setBookmarkList(res.data || []);
            } else if (tab === 'like') {
                const res = await axiosInstance.get('/post/user/likes');
                setLikeList(res.data || []);
            } else if (tab === 'draft') {
                const res = await axiosInstance.get('/post/draft');
                if (res.data?.success && Array.isArray(res.data?.drafts)) {
                    setDraftList(res.data.drafts);
                } else if (res.data?.success && res.data?.draft) {
                    setDraftList([res.data.draft]);
                } else {
                    setDraftList([]);
                }
            }
        } catch {
            // 조용히 처리
        } finally {
            setTabLoading(false);
        }
    };

    const handleDeleteDraft = async (draftId: string) => {
        if (!confirm('임시저장된 글을 삭제하시겠습니까?')) return;
        try {
            await axiosInstance.delete(`/post/draft/${draftId}`);
            toaster.create({ title: '임시저장 글이 삭제되었습니다.', type: 'info' });
            setDraftList((prev) => prev.filter((d) => String(d.id || d.postId) !== String(draftId)));
            fetchUserProfile();
        } catch {
            toaster.create({ title: '임시저장 삭제 중 오류가 발생했습니다.', type: 'error' });
        }
    };

    const handleProfileUpdated = (updatedProfile: UserProfileData) => {
        setProfile((prev) => (prev ? { ...prev, ...updatedProfile } : updatedProfile));
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('auth-change'));
        }
    };

    const handleLogout = () => {
        clearAuthSession();
        toaster.create({ title: '로그아웃되었습니다.', type: 'info' });
    };

    const handleDeleteHistory = async (historyId: string | number) => {
        if (!confirm('이 기록을 삭제하시겠습니까?')) return;
        try {
            await axiosInstance.delete(`/user/histories/${historyId}`);
            setHistories((prev) => prev.filter((h) => String(h.id) !== String(historyId)));
            toaster.create({ title: '기록이 삭제되었습니다.', type: 'info' });
            fetchPetTimelineAndJourneys(activePet?.id);
            window.dispatchEvent(new CustomEvent('history-change'));
        } catch (error: any) {
            toaster.create({
                title: error?.response?.data?.message || '기록 삭제에 실패했습니다.',
                type: 'error',
            });
        }
    };

    const handleDeletePet = async (pet: Pet) => {
        if (!confirm(`'${pet.name}' 프로필을 삭제하시겠습니까?`)) return;
        try {
            await axiosInstance.delete(`/user/pets/${pet.id}`);
            const nextPets = pets.filter((p) => p.id !== pet.id);
            setPets(nextPets);
            if (activePet?.id === pet.id) {
                setSelectedPetId(nextPets[0]?.id ? String(nextPets[0].id) : null);
            }
            toaster.create({ title: `'${pet.name}' 프로필이 삭제되었습니다.`, type: 'success' });
        } catch {
            toaster.create({ title: '반려동물 프로필 삭제에 실패했습니다.', type: 'error' });
        }
    };

    const handleDeleteJourney = async (journeyId: string | number) => {
        if (!activePet?.id) return;
        if (!confirm('이 수첩 그룹을 삭제하시겠습니까? (그룹에 속한 기록은 미분류로 남습니다)')) return;
        try {
            await axiosInstance.delete(`/user/pets/${activePet.id}/journeys/${journeyId}`);
            setJourneys((prev) => prev.filter((j) => String(j.id) !== String(journeyId)));
            toaster.create({ title: '수첩 그룹이 삭제되었습니다.', type: 'info' });
            fetchPetTimelineAndJourneys(activePet.id);
        } catch (error: any) {
            toaster.create({
                title: error?.response?.data?.message || '수첩 그룹 삭제에 실패했습니다.',
                type: 'error',
            });
        }
    };

    if (!loading && !profile && !isAuthenticated()) {
        return <MypageGuestView onOpenLogin={openLoginModal} />;
    }

    return (
        <Box
            w="100%"
            maxW="1240px"
            mx="auto"
            px={{ base: 4, md: 6, lg: '36px' }}
            pt={{ base: 4, md: 6 }}
            pb={{ base: 10, md: '44px' }}
            minW={0}
        >
            <VStack align="stretch" gap={{ base: '18px', md: '22px' }} minW={0}>
                {/* 1. 상단 프로필 & 반려동물 스위처 배너 */}
                <Flex
                    direction={{ base: 'column', lg: 'row' }}
                    justify="space-between"
                    align={{ base: 'stretch', lg: 'center' }}
                    bg="var(--waba-surface)"
                    border="1px solid"
                    borderColor="var(--waba-line)"
                    borderRadius="22px"
                    p={{ base: '18px', md: '22px 26px' }}
                    gap={5}
                    minW={0}
                >
                    {/* Left: Profile */}
                    <HStack gap={4} minW={0}>
                        <UserAvatar
                            src={profile?.profile_image_url}
                            alt={profile?.nickname || '프로필'}
                            w={{ base: '54px', md: '62px' }}
                            h={{ base: '54px', md: '62px' }}
                            iconSize={26}
                            border="2px solid"
                            borderColor="#6338A9"
                        />
                        <Box minW={0}>
                            <HStack gap={2} flexWrap="wrap" align="center">
                                <Text fontSize={{ base: '18px', md: '20px' }} fontWeight="800" color="var(--waba-ink)">
                                    {profile?.nickname || '회원'}
                                </Text>
                                {profile?.mentor_badge && (
                                    <Box
                                        bg="var(--waba-purple-soft)"
                                        color="var(--waba-purple-text)"
                                        fontSize="11px"
                                        fontWeight="700"
                                        px="10px"
                                        py="3px"
                                        borderRadius="999px"
                                    >
                                        {profile.mentor_badge}
                                    </Box>
                                )}
                                <Button
                                    size="2xs"
                                    variant="outline"
                                    rounded="full"
                                    borderColor="var(--waba-line)"
                                    color="var(--waba-ink-2)"
                                    px={2.5}
                                    h="24px"
                                    fontSize="11px"
                                    onClick={() => setEditModalOpen(true)}
                                    gap={1}
                                >
                                    <LuPencil size={11} />
                                    프로필 수정
                                </Button>
                            </HStack>
                            <Text fontSize="12px" color="var(--waba-ink-2)" mt="4px">
                                게시글 {profile?.post_count ?? postList.length} · 수첩 그룹 {journeys.length} · 스크랩 수첩 {scrappedNotebooks.length}
                            </Text>
                        </Box>
                    </HStack>

                    {/* Right: Pet Switcher + Add Pet */}
                    <HStack align="flex-start" gap="10px" minW={0}>
                        <HStack
                            gap="10px"
                            overflowX="auto"
                            pb={{ base: 1, lg: 0 }}
                            flexWrap="nowrap"
                            justifyContent="flex-start"
                            css={{
                                '&::-webkit-scrollbar': { display: 'none' },
                                '@media (min-width: 62em)': {
                                    maxWidth: '580px',
                                    overflowX: 'visible',
                                    flexWrap: 'wrap',
                                    justifyContent: 'flex-end',
                                },
                            }}
                        >
                            {pets.slice(0, 8).map((pet) => (
                                <HStack
                                    key={pet.id}
                                    w="136px"
                                    bg="var(--waba-card)"
                                    border="1px solid"
                                    borderColor="var(--waba-line)"
                                    borderRadius="14px"
                                    px="10px"
                                    py="6px"
                                    gap="8px"
                                    flexShrink={0}
                                    textAlign="left"
                                >
                                    <UserAvatar
                                        src={pet.current_avatar_url}
                                        alt={pet.name}
                                        w="28px"
                                        h="28px"
                                        iconSize={14}
                                        fallbackType="pet"
                                        border="1.5px solid"
                                        borderColor="#F6EBFB"
                                    />
                                    <Box minW={0} flex={1}>
                                        <Text fontSize="13px" fontWeight="700" color="var(--waba-ink)" title={pet.name} truncate>
                                            {formatPetShortName(pet.name)}
                                        </Text>
                                    </Box>
                                    <Menu.Root positioning={{ placement: 'bottom-end' }}>
                                        <Menu.Trigger asChild>
                                            <IconButton
                                                aria-label={`${pet.name} 메뉴`}
                                                size="2xs"
                                                variant="ghost"
                                                rounded="full"
                                                color="var(--waba-ink-3)"
                                                _hover={{ color: 'var(--waba-ink)', bg: 'var(--waba-surface)' }}
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <LuEllipsis size={14} />
                                            </IconButton>
                                        </Menu.Trigger>
                                        <Portal>
                                            <Menu.Positioner>
                                                <Menu.Content
                                                    minW="120px"
                                                    borderRadius="14px"
                                                    bg="var(--waba-card)"
                                                    border="1px solid"
                                                    borderColor="var(--waba-line)"
                                                    boxShadow="0 10px 25px rgba(0, 0, 0, 0.12)"
                                                    p={1.5}
                                                >
                                                    <Menu.Item
                                                        value="edit"
                                                        borderRadius="10px"
                                                        fontSize="13px"
                                                        fontWeight="600"
                                                        color="var(--waba-ink)"
                                                        cursor="pointer"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setEditingPet(pet);
                                                            setPetModalOpen(true);
                                                        }}
                                                    >
                                                        <LuPencil size={13} />
                                                        수정하기
                                                    </Menu.Item>
                                                    <Menu.Item
                                                        value="delete"
                                                        borderRadius="10px"
                                                        fontSize="13px"
                                                        fontWeight="600"
                                                        color="#E53E3E"
                                                        cursor="pointer"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleDeletePet(pet);
                                                        }}
                                                    >
                                                        <LuTrash2 size={13} />
                                                        삭제하기
                                                    </Menu.Item>
                                                </Menu.Content>
                                            </Menu.Positioner>
                                        </Portal>
                                    </Menu.Root>
                                </HStack>
                            ))}

                        </HStack>
                        <VStack gap="6px" flexShrink={0} align="center">
                            <Button
                                size="xs"
                                h="40px"
                                w={pets.length > 0 ? '40px' : undefined}
                                px={pets.length > 0 ? 0 : '14px'}
                                borderRadius="14px"
                                variant="outline"
                                borderColor="var(--waba-line)"
                                bg="var(--waba-card)"
                                color="var(--waba-ink-2)"
                                fontSize="12px"
                                fontWeight="700"
                                aria-label="반려동물 등록"
                                title="반려동물 등록"
                                onClick={() => {
                                    setEditingPet(null);
                                    setPetModalOpen(true);
                                }}
                                flexShrink={0}
                                gap={1}
                            >
                                <LuPlus size={pets.length > 0 ? 16 : 14} />
                                {pets.length === 0 && '반려동물 등록'}
                            </Button>
                            <Button
                                data-has-more={pets.length >= 9 ? 'true' : 'false'}
                                size="2xs"
                                h="24px"
                                px="8px"
                                borderRadius="10px"
                                variant="ghost"
                                color="var(--waba-purple-text)"
                                fontSize="11px"
                                fontWeight="700"
                                onClick={() => setAllPetsModalOpen(true)}
                                css={{
                                    '&[data-has-more="false"]': {
                                        display: 'none',
                                    },
                                }}
                            >
                                더보기
                            </Button>
                        </VStack>
                    </HStack>
                </Flex>

                {/* 2. 언더라인 3개 탭 */}
                <Box
                    borderBottom="1px solid"
                    borderColor="var(--waba-line)"
                    minW={0}
                >
                    <HStack
                        gap={{ base: 4, md: '24px' }}
                        overflowX="auto"
                        whiteSpace="nowrap"
                        css={{ '&::-webkit-scrollbar': { display: 'none' } }}
                    >
                        {[
                            { key: 'notebook' as const, label: '건강 수첩' },
                            { key: 'activity' as const, label: '내 게시글 · 스크랩' },
                            { key: 'settings' as const, label: `설정 (AI 일지 ${autoJournalEnabled ? 'ON' : 'OFF'})` },
                        ].map((tab) => {
                            const isActive = mainTab === tab.key;
                            return (
                                <Box
                                    key={tab.key}
                                    as="button"
                                    onClick={() => setMainTab(tab.key)}
                                    position="relative"
                                    fontSize="14px"
                                    fontWeight={isActive ? '800' : '600'}
                                    color={isActive ? 'var(--waba-ink)' : 'var(--waba-ink-3)'}
                                    pb="12px"
                                    cursor="pointer"
                                    flexShrink={0}
                                    _hover={{ color: 'var(--waba-ink)' }}
                                >
                                    {tab.label}
                                    {isActive && (
                                        <Box
                                            position="absolute"
                                            left={0}
                                            right={0}
                                            bottom={0}
                                            h="2.5px"
                                            bg="#6338A9"
                                            borderRadius="999px"
                                        />
                                    )}
                                </Box>
                            );
                        })}
                    </HStack>
                </Box>

                {/* 3. 탭별 컨텐츠 */}
                {mainTab === 'notebook' && (
                    <MypageNotebookTab
                        pet={activePet}
                        pets={pets}
                        histories={histories}
                        journeys={journeys}
                        autoJournalEnabled={autoJournalEnabled}
                        selectedHistoryPetIds={selectedHistoryPetIds}
                        onSelectAllHistoryPets={handleSelectAllHistoryPets}
                        onToggleHistoryPetId={handleToggleHistoryPetId}
                        onApplyHistoryPetIds={handleApplyHistoryPetIds}
                        filterMode={historyFilterMode}
                        onChangeFilterMode={handleChangeHistoryFilterMode}
                        historyTotal={historyTotal}
                        historyHasMore={historyHasMore}
                        isLoadingMoreHistories={isLoadingMoreHistories}
                        onLoadMoreHistories={handleLoadMoreHistories}
                        onOpenRecordModal={() => {
                            setEditingHistory(null);
                            setRecordModalOpen(true);
                        }}
                        onOpenManageModal={() => {
                            setEditingJourney(null);
                            setGroupModalOpen(true);
                        }}
                        onEditJourney={(journey) => {
                            setEditingJourney(journey);
                            setGroupModalOpen(true);
                        }}
                        onDeleteJourney={handleDeleteJourney}
                        onEditHistory={(item) => {
                            setEditingHistory(item);
                            setRecordModalOpen(true);
                        }}
                        onDeleteHistory={handleDeleteHistory}
                        onOpenPetRegister={() => {
                            setEditingPet(null);
                            setPetModalOpen(true);
                        }}
                    />
                )}

                {mainTab === 'activity' && (
                    <VStack align="stretch" gap="18px" minW={0}>
                        <MypageScrappedNotebooks
                            notebooks={scrappedNotebooks}
                            onUnscrap={handleUnscrapNotebook}
                        />

                        <ActivitySection
                            activeTab={activitySubTab}
                            onTabChange={setActivitySubTab}
                            postList={postList}
                            bookmarkList={bookmarkList}
                            likeList={likeList}
                            draftList={draftList}
                            onDeleteDraft={handleDeleteDraft}
                            isLoading={tabLoading}
                            postCount={profile?.post_count ?? postList.length}
                            bookmarkCount={profile?.bookmark_count ?? bookmarkList.length}
                            likeCount={profile?.like_count ?? likeList.length}
                            draftCount={profile?.draft_count ?? draftList.length}
                            reportedDeletedPosts={reportedDeletedPosts}
                            onSubmitAppeal={handleSubmitAppeal}
                            pets={pets}
                            selectedPetId={activityPetId}
                            onSelectPetId={setActivityPetId}
                        />
                    </VStack>
                )}

                {mainTab === 'settings' && (
                    <MypageSettingsTab
                        autoJournalEnabled={autoJournalEnabled}
                        isUpdatingAutoJournal={isUpdatingAutoJournal}
                        onToggleAutoJournal={handleToggleAutoJournal}
                        onOpenEditProfile={() => setEditModalOpen(true)}
                        onLogout={handleLogout}
                        userEmail={profile?.email}
                        hasLocalPassword={profile?.has_local_password}
                        primaryProvider={profile?.primary_provider}
                        identities={profile?.identities}
                        userRole={profile?.role}
                        onOpenWithdraw={() => setWithdrawModalOpen(true)}
                    />
                )}
            </VStack>

            {/* 프로필 수정 모달 */}
            <ProfileEditModal
                open={editModalOpen}
                onOpenChange={setEditModalOpen}
                currentProfile={profile}
                onProfileUpdated={handleProfileUpdated}
            />

            {/* 새 반려동물 등록 / 수정 모달 */}
            <PetRegisterModal
                open={petModalOpen}
                onOpenChange={(open) => {
                    setPetModalOpen(open);
                    if (!open) setEditingPet(null);
                }}
                existingPetsCount={pets.length}
                firstPetRewardClaimed={Boolean(profile?.first_pet_reward_claimed)}
                editingPet={editingPet}
                onPetCreated={({ pets: updatedPets, profile: updatedProfile }) => {
                    setPets(updatedPets);
                    if (updatedPets.length > 0 && !selectedPetId) {
                        setSelectedPetId(String(updatedPets[0].id));
                    }
                    if (updatedProfile) {
                        setProfile(updatedProfile);
                    }
                }}
            />

            {/* 수첩 기록 직접 추가 / 수정 모달 (새 마스터 디자인) */}
            <NotebookRecordModal
                open={recordModalOpen}
                onOpenChange={(open) => {
                    setRecordModalOpen(open);
                    if (!open) setEditingHistory(null);
                }}
                pet={activePet}
                pets={pets}
                journeys={journeys}
                editingHistory={editingHistory}
                onSaved={() => {
                    if (activePet?.id) {
                        fetchPetTimelineAndJourneys(activePet.id);
                    }
                }}
            />

            {/* 수첩 그룹 생성·수정 모달 (새 마스터 디자인) */}
            <NotebookGroupModal
                open={groupModalOpen}
                onOpenChange={(open) => {
                    setGroupModalOpen(open);
                    if (!open) setEditingJourney(null);
                }}
                pet={activePet}
                pets={pets}
                editingJourney={editingJourney}
                onSaved={() => {
                    if (activePet?.id) {
                        fetchPetTimelineAndJourneys(activePet.id);
                    }
                }}
            />

            <PetManageAllModal
                open={allPetsModalOpen}
                onOpenChange={setAllPetsModalOpen}
                pets={pets}
                onAddPet={() => {
                    setEditingPet(null);
                    setPetModalOpen(true);
                }}
                onEditPet={(pet) => {
                    setEditingPet(pet);
                    setPetModalOpen(true);
                }}
                onDeletePet={handleDeletePet}
            />

            <WithdrawAccountModal
                open={withdrawModalOpen}
                onOpenChange={setWithdrawModalOpen}
                nickname={profile?.nickname}
                hasLocalPassword={profile?.has_local_password}
                onWithdrawn={() => {
                    clearAuthSession();
                    router.replace('/');
                }}
            />
        </Box>
    );
}
