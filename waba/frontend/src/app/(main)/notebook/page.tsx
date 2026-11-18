'use client'

import React, { useEffect, useMemo, useState } from 'react';
import { Box, Grid, Spinner, Text, VStack } from '@chakra-ui/react';
import axiosInstance from '@/utils/api';
import { isAuthenticated } from '@/utils/authUtils';
import { toaster } from '@/components/ui/toaster';
import NotebookListHeader, {
    NotebookStatusFilter,
    NotebookTabKey,
} from './notebook-components/NotebookListHeader';
import NotebookCard from './notebook-components/NotebookCard';
import { getNotebookCategoryLabel, NotebookItem } from './notebook-components/types';

export default function NotebookListPage() {
    const [notebooks, setNotebooks] = useState<NotebookItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<NotebookTabKey>('ALL');
    const [selectedCategory, setSelectedCategory] = useState('ALL');
    const [statusFilter, setStatusFilter] = useState<NotebookStatusFilter>('ALL');
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        const fetchNotebooks = async () => {
            setLoading(true);
            try {
                const res = await axiosInstance.get('/notebooks');
                const rawList: any[] = Array.isArray(res.data)
                    ? res.data
                    : res.data?.notebooks || res.data?.journeys || res.data?.data || [];
                const list: NotebookItem[] = rawList.map((nb) => ({
                    ...nb,
                    status: nb.status || (nb.is_ongoing ? 'ACTIVE' : 'CURED'),
                    user: nb.user || nb.owner || null,
                }));
                setNotebooks(list);
            } catch {
                setNotebooks([]);
            } finally {
                setLoading(false);
            }
        };

        fetchNotebooks();
    }, []);

    const handleToggleScrap = async (notebookId: string | number, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!isAuthenticated()) {
            toaster.create({ title: '로그인이 필요한 서비스입니다.', type: 'info' });
            return;
        }
        try {
            const res = await axiosInstance.post(`/notebooks/${notebookId}/scrap`);
            const scrapped = res.data?.is_scrapped;
            setNotebooks((prev) =>
                prev.map((nb) => {
                    if (nb.id !== notebookId) return nb;
                    const nextScrapped = typeof scrapped === 'boolean' ? scrapped : !nb.is_scrapped;
                    const diff = nextScrapped ? 1 : -1;
                    return {
                        ...nb,
                        is_scrapped: nextScrapped,
                        scrap_count: Math.max(0, (nb.scrap_count ?? 0) + diff),
                    };
                })
            );
        } catch {
            toaster.create({ title: '스크랩 처리에 실패했습니다.', type: 'error' });
        }
    };

    const filteredNotebooks = useMemo(() => {
        let list = [...notebooks];

        if (activeTab === 'SCRAPPED') {
            list = list.filter((nb) => Boolean(nb.is_scrapped));
        }

        if (selectedCategory !== 'ALL') {
            const targetLabel = getNotebookCategoryLabel(selectedCategory);
            list = list.filter(
                (nb) =>
                    nb.category?.toUpperCase() === selectedCategory.toUpperCase() ||
                    getNotebookCategoryLabel(nb.category) === targetLabel
            );
        }

        if (statusFilter !== 'ALL') {
            list = list.filter((nb) => nb.status === statusFilter);
        }

        const q = searchQuery.trim().toLowerCase();
        if (q) {
            list = list.filter(
                (nb) =>
                    nb.title?.toLowerCase().includes(q) ||
                    nb.category?.toLowerCase().includes(q) ||
                    nb.pet?.name?.toLowerCase().includes(q) ||
                    nb.pet?.breed?.toLowerCase().includes(q) ||
                    nb.user?.nickname?.toLowerCase().includes(q)
            );
        }

        if (activeTab === 'POPULAR') {
            list.sort(
                (a, b) =>
                    (b.scrap_count ?? 0) +
                    (b.like_count ?? 0) -
                    ((a.scrap_count ?? 0) + (a.like_count ?? 0))
            );
        }

        return list;
    }, [notebooks, activeTab, selectedCategory, statusFilter, searchQuery]);

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
                <NotebookListHeader
                    activeTab={activeTab}
                    onTabChange={setActiveTab}
                    selectedCategory={selectedCategory}
                    onCategoryChange={setSelectedCategory}
                    statusFilter={statusFilter}
                    onStatusFilterChange={setStatusFilter}
                    searchQuery={searchQuery}
                    onSearchQueryChange={setSearchQuery}
                    totalCount={filteredNotebooks.length}
                />

                {loading ? (
                    <VStack py={20} gap={3}>
                        <Spinner size="lg" color="#6338A9" />
                        <Text fontSize="13px" color="var(--waba-ink-3)">
                            공유 건강 수첩을 불러오는 중...
                        </Text>
                    </VStack>
                ) : filteredNotebooks.length === 0 ? (
                    <Box
                        bg="var(--waba-surface)"
                        border="1px dashed"
                        borderColor="var(--waba-line)"
                        borderRadius="20px"
                        py={16}
                        px={6}
                        textAlign="center"
                    >
                        <Text fontSize="15px" fontWeight="700" color="var(--waba-ink)" mb={1}>
                            표시할 건강 수첩이 없습니다
                        </Text>
                        <Text fontSize="13px" color="var(--waba-ink-3)">
                            조건을 변경하거나 마이페이지에서 첫 건강 수첩을 시작해 보세요.
                        </Text>
                    </Box>
                ) : (
                    <Grid
                        templateColumns={{
                            base: '1fr',
                            md: 'repeat(2, 1fr)',
                            lg: 'repeat(3, 1fr)',
                        }}
                        gap="18px"
                        alignItems="stretch"
                        minW={0}
                    >
                        {filteredNotebooks.map((item) => (
                            <NotebookCard
                                key={item.id}
                                item={item}
                                onToggleScrap={handleToggleScrap}
                            />
                        ))}
                    </Grid>
                )}
            </VStack>
        </Box>
    );
}
