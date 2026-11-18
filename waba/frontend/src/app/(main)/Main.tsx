'use client'

import React, { useEffect, useMemo, useState } from 'react';
import { Box, VStack } from '@chakra-ui/react';
import { PostDetail } from '@/interface/community.interface';
import { toaster } from '@/components/ui/toaster';
import axiosInstance from '@/utils/api';
import { isAuthenticated } from '@/utils/authUtils';
import MainTopBar, { MainCategoryTab } from './main-components/MainTopBar';
import SpotlightHero from './main-components/SpotlightHero';
import HotQnASection from './main-components/HotQnASection';
import LifeSnapFeedSection from './main-components/LifeSnapFeedSection';

interface PetSummary {
    id: string | number;
    name: string;
    species?: string;
    breed?: string;
    latest_weight_kg?: number | string | null;
}

export default function Main() {
    const [postList, setPostList] = useState<PostDetail[]>([]);
    const [activeCategory, setActiveCategory] = useState<MainCategoryTab>('ALL');
    const [sortOrder, setSortOrder] = useState<'popular' | 'latest'>('popular');
    const [searchQuery, setSearchQuery] = useState('');

    const [isLogin, setIsLogin] = useState(false);
    const [primaryPet, setPrimaryPet] = useState<PetSummary | null>(null);

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
                setPrimaryPet(null);
                return;
            }
            try {
                const res = await axiosInstance.get('/user/pets');
                const pets: PetSummary[] = Array.isArray(res.data) ? res.data : res.data?.pets || [];
                setPrimaryPet(pets[0] || null);
            } catch {
                setPrimaryPet(null);
            }
        };

        fetchMainPosts();
        syncAuthAndPet();
        window.addEventListener('auth-change', syncAuthAndPet);
        return () => window.removeEventListener('auth-change', syncAuthAndPet);
    }, []);

    const spotlightPost = useMemo(() => {
        return (
            postList.find(
                (item) => item.post.curation_grade === 'MAIN_LOOKBOOK' && item.post.board_id === 'LOOKBOOK'
            ) ||
            postList.find((item) => item.post.board_id === 'CARE_LOUNGE') ||
            postList[0]
        );
    }, [postList]);

    const qnaPosts = useMemo(() => {
        const qna = postList.filter((item) => item.post.board_id === 'QNA');
        if (qna.length >= 2) return qna;
        const fallback = postList.filter((item) => item.post.id !== spotlightPost?.post?.id);
        return [...qna, ...fallback.filter((f) => !qna.some((q) => q.post.id === f.post.id))].slice(0, 2);
    }, [postList, spotlightPost]);

    const filteredFeedPosts = useMemo(() => {
        let list = [...postList];

        if (activeCategory === 'SNAP') {
            list = list.filter((item) => item.post.board_id === 'SNAP' || item.post.board_id === 'LOOKBOOK');
        } else if (activeCategory === 'QNA') {
            list = list.filter((item) => item.post.board_id === 'QNA');
        } else if (activeCategory === 'CARE_LOUNGE') {
            list = list.filter((item) => item.post.board_id === 'CARE_LOUNGE');
        }

        const q = searchQuery.trim().toLowerCase();
        if (q) {
            list = list.filter(
                (item) =>
                    item.post.title?.toLowerCase().includes(q) ||
                    item.user?.nickname?.toLowerCase().includes(q) ||
                    item.tags?.some((t) => t.toLowerCase().includes(q))
            );
        }

        if (sortOrder === 'popular') {
            list.sort(
                (a, b) =>
                    (b.post.like_count ?? 0) +
                    (b.post.comment_count ?? 0) -
                    ((a.post.like_count ?? 0) + (a.post.comment_count ?? 0))
            );
        } else {
            list.sort((a, b) => {
                const timeA = a.post.created_at ? new Date(a.post.created_at).getTime() : Number(a.post.id) || 0;
                const timeB = b.post.created_at ? new Date(b.post.created_at).getTime() : Number(b.post.id) || 0;
                return timeB - timeA;
            });
        }

        return list;
    }, [postList, activeCategory, searchQuery, sortOrder]);

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
                    activeCategory={activeCategory}
                    onCategoryChange={setActiveCategory}
                    sortOrder={sortOrder}
                    onToggleSort={() => setSortOrder((prev) => (prev === 'popular' ? 'latest' : 'popular'))}
                    searchQuery={searchQuery}
                    onSearchQueryChange={setSearchQuery}
                />

                {activeCategory === 'ALL' && !searchQuery.trim() && (
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
        </Box>
    );
}
