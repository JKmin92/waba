'use client'

import React, { useEffect, useMemo, useState } from 'react';
import { Box, VStack } from '@chakra-ui/react';
import { PostDetail } from '@/interface/community.interface';
import { toaster } from '@/components/ui/toaster';
import axiosInstance from '@/utils/api';
import { isAuthenticated } from '@/utils/authUtils';
import MainTopBar from './main-components/MainTopBar';
import SpotlightHero from './main-components/SpotlightHero';
import HotQnASection from './main-components/HotQnASection';
import LifeSnapFeedSection from './main-components/LifeSnapFeedSection';
import MainPopupModal from './common/MainPopupModal';

interface PetSummary {
    id: string | number;
    name: string;
    species?: string;
    breed?: string;
    latest_weight_kg?: number | string | null;
}

const VALID_CURATION_SPECIES = ['DOG', 'CAT', 'RABBIT', 'HAMSTER', 'GUINEAPIG', 'CHINCHILA'];

function getPostTargetSpecies(item: PostDetail): string[] {
    const raw = item.post.curation_target_species;
    if (raw !== null && raw !== undefined) {
        let arr: unknown[] = [];
        if (Array.isArray(raw)) {
            arr = raw;
        } else if (typeof raw === 'string') {
            try {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) arr = parsed;
            } catch {
                arr = raw.split(',').map((s) => s.trim()).filter(Boolean);
            }
        }
        return arr.map((s) => String(s).toUpperCase());
    }
    const petSpecies = (item.post_pets || [])
        .map((p) => String(p.species || '').toUpperCase())
        .filter((s) => VALID_CURATION_SPECIES.includes(s));
    return Array.from(new Set(petSpecies));
}

export default function Main() {
    const [postList, setPostList] = useState<PostDetail[]>([]);
    const [searchQuery, setSearchQuery] = useState('');

    const [authReady, setAuthReady] = useState(false);
    const [isLogin, setIsLogin] = useState(false);
    const [userPets, setUserPets] = useState<PetSummary[]>([]);
    const primaryPet = userPets[0] || null;
    const [spotlightPost, setSpotlightPost] = useState<PostDetail | undefined>(undefined);

    useEffect(() => {
        const fetchMainPosts = async () => {
            try {
                const res = await axiosInstance.get('/post/main');
                if (Array.isArray(res.data)) {
                    setPostList(res.data);
                }
            } catch {
                toaster.create({ title: '메인 피드를 불러오는 중 오류가 발생했습니다.', type: 'error' });
            }
        };

        const syncAuthAndPet = async () => {
            const authed = isAuthenticated();
            setIsLogin(authed);
            if (!authed) {
                setUserPets([]);
                setAuthReady(true);
                return;
            }
            try {
                const res = await axiosInstance.get('/user/pets');
                const pets: PetSummary[] = Array.isArray(res.data) ? res.data : res.data?.pets || [];
                setUserPets(pets);
            } catch {
                setUserPets([]);
            } finally {
                setAuthReady(true);
            }
        };

        fetchMainPosts();
        syncAuthAndPet();
        window.addEventListener('auth-change', syncAuthAndPet);
        return () => window.removeEventListener('auth-change', syncAuthAndPet);
    }, []);

    useEffect(() => {
        if (!authReady || postList.length === 0) {
            setSpotlightPost(undefined);
            return;
        }

        const mainLookbookPool = postList.filter((item) => item.post.curation_grade === 'MAIN_LOOKBOOK');
        if (mainLookbookPool.length === 0) {
            setSpotlightPost(
                postList.find((item) => item.post.board_id === 'CARE_LOUNGE') || postList[0]
            );
            return;
        }

        const userSpecies = userPets
            .map((p) => String(p.species || '').toUpperCase())
            .filter((s) => VALID_CURATION_SPECIES.includes(s));

        let pool = mainLookbookPool;
        if (isLogin && userSpecies.length > 0) {
            const matched = mainLookbookPool.filter((item) => {
                const targets = getPostTargetSpecies(item);
                return targets.some((t) => userSpecies.includes(t));
            });
            if (matched.length > 0) {
                pool = matched;
            } else {
                const common = mainLookbookPool.filter((item) => getPostTargetSpecies(item).includes('ALL'));
                pool = common.length > 0 ? common : mainLookbookPool;
            }
        }

        const lastId = typeof window !== 'undefined' ? sessionStorage.getItem('waba_last_spotlight_post_id') : null;
        const filtered = pool.length >= 2 && lastId ? pool.filter((item) => String(item.post.id) !== lastId) : pool;
        const candidates = filtered.length > 0 ? filtered : pool;
        const chosen = candidates[Math.floor(Math.random() * candidates.length)];

        if (chosen && typeof window !== 'undefined') {
            sessionStorage.setItem('waba_last_spotlight_post_id', String(chosen.post.id));
        }
        setSpotlightPost(chosen);
    }, [postList, authReady, isLogin, userPets]);

    const qnaPosts = useMemo(() => {
        const qna = postList.filter((item) => item.post.board_id === 'QNA');
        if (qna.length >= 2) return qna;
        const fallback = postList.filter((item) => item.post.id !== spotlightPost?.post?.id);
        return [...qna, ...fallback.filter((f) => !qna.some((q) => q.post.id === f.post.id))].slice(0, 2);
    }, [postList, spotlightPost]);

    const filteredFeedPosts = useMemo(() => {
        let list = [...postList];

        const q = searchQuery.trim().toLowerCase();
        if (q) {
            list = list.filter(
                (item) =>
                    item.post.title?.toLowerCase().includes(q) ||
                    item.user?.nickname?.toLowerCase().includes(q) ||
                    item.tags?.some((t) => t.toLowerCase().includes(q))
            );
        }

        list.sort(
            (a, b) =>
                (b.post.like_count ?? 0) +
                (b.post.comment_count ?? 0) -
                ((a.post.like_count ?? 0) + (a.post.comment_count ?? 0))
        );

        return list;
    }, [postList, searchQuery]);

    return (
        <Box
            w="100%"
            maxW="1240px"
            mx="auto"
            px={{ base: 4, md: 6, lg: '36px' }}
            pt={{ base: 4, md: 6 }}
            pb={{ base: 8, md: '44px' }}
            minW={0}
        >
            <VStack align="stretch" gap={{ base: '18px', md: '22px' }} minW={0}>
                <MainTopBar
                    searchQuery={searchQuery}
                    onSearchQueryChange={setSearchQuery}
                />

                {!searchQuery.trim() && (
                    <>
                        <SpotlightHero
                            spotlightPost={spotlightPost}
                            hotQaPost={qnaPosts[0]}
                            isLogin={isLogin}
                            primaryPet={primaryPet}
                        />
                        <HotQnASection qnaPosts={qnaPosts} />
                    </>
                )}

                <LifeSnapFeedSection posts={filteredFeedPosts} />
            </VStack>
            <MainPopupModal />
        </Box>
    );
}
