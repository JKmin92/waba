'use client'

import { Container, Stack } from "@chakra-ui/react";
import Header from "../../common/Header";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import axiosInstance from "@/utils/api";
import { isAuthenticated } from "@/utils/authUtils";
import { toaster } from "@/components/ui/toaster";
import { Pet, PostDetail } from "@/interface";
import MypageGuestView from "./MypageGuestView";
import ProfileSection, { UserProfileData } from "./ProfileSection";
import PetSection from "./PetSection";
import ActivitySection from "./ActivitySection";
import ProfileEditModal from "./ProfileEditModal";
import PetRegisterModal from "./PetRegisterModal";

export default function MypageClient() {
    const searchParams = useSearchParams();
    const initialTab = searchParams.get('tab') || 'post';

    const [activeTab, setActiveTab] = useState<'post' | 'bookmark' | 'like' | 'draft'>(
        ['post', 'bookmark', 'like', 'draft'].includes(initialTab) ? (initialTab as any) : 'post'
    );

    const [profile, setProfile] = useState<UserProfileData | null>(null);
    const [pets, setPets] = useState<Pet[]>([]);
    const [postList, setPostList] = useState<PostDetail[]>([]);
    const [bookmarkList, setBookmarkList] = useState<PostDetail[]>([]);
    const [likeList, setLikeList] = useState<PostDetail[]>([]);
    const [draftList, setDraftList] = useState<any[]>([]);

    const [loading, setLoading] = useState(true);
    const [tabLoading, setTabLoading] = useState(false);
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [petModalOpen, setPetModalOpen] = useState(false);
    const [editingPet, setEditingPet] = useState<Pet | null>(null);

    const openLoginModal = () => {
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('open-login-modal'));
        }
    };

    useEffect(() => {
        if (!isAuthenticated()) {
            setLoading(false);
            openLoginModal();
            return;
        }

        fetchUserProfile();
        fetchTabData(activeTab);

        const handleAuthChange = () => {
            if (isAuthenticated()) {
                fetchUserProfile();
                fetchTabData(activeTab);
            } else {
                setProfile(null);
                openLoginModal();
            }
        };

        window.addEventListener('auth-change', handleAuthChange);
        return () => window.removeEventListener('auth-change', handleAuthChange);
    }, []);

    useEffect(() => {
        if (isAuthenticated()) {
            fetchTabData(activeTab);
        }
    }, [activeTab]);

    const fetchUserProfile = async () => {
        try {
            const res = await axiosInstance.get('/user/profile');
            if (res.data?.success && res.data?.profile) {
                setProfile(res.data.profile);
                if (res.data.profile.pets) {
                    setPets(res.data.profile.pets);
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

    const fetchTabData = async (tab: 'post' | 'bookmark' | 'like' | 'draft') => {
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
                if (res.data?.success && res.data?.draft) {
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
            setDraftList([]);
            fetchUserProfile();
        } catch {
            toaster.create({ title: '임시저장 삭제 중 오류가 발생했습니다.', type: 'error' });
        }
    };

    const handleProfileUpdated = (updatedProfile: UserProfileData) => {
        setProfile(prev => prev ? ({ ...prev, ...updatedProfile }) : updatedProfile);
        // 헤더 프로필 연동을 위해 auth-change 이벤트 발생
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('auth-change'));
        }
    };

    const handleDeletePet = async (petId: string) => {
        try {
            const res = await axiosInstance.delete(`/user/pets/${petId}`);
            if (res.data?.success) {
                setPets(res.data.pets || []);
                if (res.data.profile) {
                    setProfile(res.data.profile);
                }
                toaster.create({ title: '반려동물 프로필이 삭제되었습니다.', type: 'info' });
            }
        } catch (err: any) {
            toaster.create({
                title: err.response?.data?.message || '반려동물 삭제 중 오류가 발생했습니다.',
                type: 'error',
            });
        }
    };

    // 비로그인 상태 안내 화면
    if (!loading && !profile && !isAuthenticated()) {
        return (
            <Container minH="100vh" bg="waba.canvas" pb={24}>
                <Header />
                <MypageGuestView onOpenLogin={openLoginModal} />
            </Container>
        );
    }

    return (
        <Container minH="100vh" bg="waba.canvas" pb={24}>
            <Header />

            <Container maxW="1280px" pt={28} px={{ base: 4, md: 6 }}>
                <Stack gap={10}>
                    {/* 1. 상단 프로필 & 리워드 요약 섹션 */}
                    <ProfileSection
                        profile={profile}
                        activeTab={activeTab}
                        onSelectTab={setActiveTab}
                        postCount={profile?.post_count ?? postList.length}
                        bookmarkCount={profile?.bookmark_count ?? bookmarkList.length}
                        likeCount={profile?.like_count ?? likeList.length}
                        draftCount={profile?.draft_count ?? draftList.length}
                        isMultiSpecies={Boolean(profile?.is_multi_species || pets.length >= 2)}
                        onOpenEditProfile={() => setEditModalOpen(true)}
                    />

                    {/* 2. 내 반려동물 카드 섹션 (My Pets) */}
                    <PetSection
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

                    {/* 3. 콘텐츠 활동 탭 바 & 목록 섹션 */}
                    <ActivitySection
                        activeTab={activeTab}
                        onTabChange={setActiveTab}
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
                    />
                </Stack>
            </Container>

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
                    if (updatedProfile) {
                        setProfile(updatedProfile);
                    }
                }}
            />
        </Container>
    );
}
