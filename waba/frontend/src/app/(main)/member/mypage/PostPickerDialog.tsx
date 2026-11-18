'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    Box,
    CloseButton,
    Dialog,
    Flex,
    HStack,
    Image,
    Input,
    Portal,
    Spinner,
    Text,
    VStack,
} from '@chakra-ui/react';
import { LuCheck, LuImage, LuSearch, LuX } from 'react-icons/lu';
import axiosInstance from '@/utils/api';

export interface SimplePostOption {
    id: string;
    title: string;
    thumbnail_url?: string | null;
    created_at?: string | null;
}

interface PostPickerDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    selectedPostId?: string;
    onSelect: (post: SimplePostOption) => void;
}

export default function PostPickerDialog({
    open,
    onOpenChange,
    selectedPostId,
    onSelect,
}: PostPickerDialogProps) {
    const [searchInput, setSearchInput] = useState('');
    const [debouncedQuery, setDebouncedQuery] = useState('');
    const [posts, setPosts] = useState<SimplePostOption[]>([]);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingMore, setIsLoadingMore] = useState(false);

    const requestSeqRef = useRef(0);

    // 모달 열릴 때 검색어 초기화
    useEffect(() => {
        if (!open) return;
        setSearchInput('');
        setDebouncedQuery('');
        setPosts([]);
        setPage(1);
        setHasMore(true);
    }, [open]);

    // 검색어 디바운스
    useEffect(() => {
        if (!open) return;
        const timer = setTimeout(() => {
            setDebouncedQuery(searchInput.trim());
        }, 250);
        return () => clearTimeout(timer);
    }, [searchInput, open]);

    const fetchPosts = useCallback(async (targetPage: number, query: string, append: boolean) => {
        const reqSeq = ++requestSeqRef.current;
        if (append) {
            setIsLoadingMore(true);
        } else {
            setIsLoading(true);
        }

        try {
            const res = await axiosInstance.get('/user/my-posts-simple', {
                params: {
                    page: targetPage,
                    limit: 10,
                    q: query,
                },
            });

            if (reqSeq !== requestSeqRef.current) return;

            const rawList = Array.isArray(res.data?.posts)
                ? res.data.posts
                : Array.isArray(res.data?.data)
                    ? res.data.data
                    : Array.isArray(res.data)
                        ? res.data
                        : [];

            const mapped: SimplePostOption[] = rawList
                .map((item: any) => ({
                    id: String(item.id || item.post_id || ''),
                    title: String(item.title || '제목 없음'),
                    thumbnail_url: item.thumbnail_url || item.thumbnail || item.image_url || item.images?.[0] || null,
                    created_at: item.created_at || item.createdAt || null,
                }))
                .filter((p: SimplePostOption) => Boolean(p.id));

            let addedCount = mapped.length;
            if (append) {
                setPosts((prev) => {
                    const seen = new Set(prev.map((p) => p.id));
                    const nextItems = mapped.filter((p) => !seen.has(p.id));
                    addedCount = nextItems.length;
                    return [...prev, ...nextItems];
                });
            } else {
                setPosts(mapped);
            }

            const explicitHasMore =
                res.data?.hasMore ??
                res.data?.has_more ??
                res.data?.pagination?.hasMore;

            if (typeof explicitHasMore === 'boolean') {
                setHasMore(explicitHasMore);
            } else {
                setHasMore(mapped.length === 10 && addedCount > 0);
            }
            setPage(targetPage);
        } catch {
            if (reqSeq !== requestSeqRef.current) return;
            if (!append) setPosts([]);
            setHasMore(false);
        } finally {
            if (reqSeq === requestSeqRef.current) {
                setIsLoading(false);
                setIsLoadingMore(false);
            }
        }
    }, []);

    useEffect(() => {
        if (!open) return;
        fetchPosts(1, debouncedQuery, false);
    }, [open, debouncedQuery, fetchPosts]);

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        if (!hasMore || isLoading || isLoadingMore) return;
        const el = e.currentTarget;
        if (el.scrollTop + el.clientHeight >= el.scrollHeight - 40) {
            fetchPosts(page + 1, debouncedQuery, true);
        }
    };

    return (
        <Dialog.Root open={open} onOpenChange={(e) => onOpenChange(e.open)} placement="center" size="md">
            <Portal>
                <Dialog.Backdrop bg="rgba(16, 17, 26, 0.56)" backdropFilter="blur(4px)" zIndex={1500} />
                <Dialog.Positioner zIndex={1501} px={4}>
                    <Dialog.Content
                        bg="var(--waba-card)"
                        color="var(--waba-ink)"
                        border="1px solid"
                        borderColor="var(--waba-line)"
                        borderRadius="22px"
                        overflow="hidden"
                        boxShadow="0 24px 60px rgba(0, 0, 0, 0.24)"
                        maxW="480px"
                        w="100%"
                    >
                        {/* 헤더 */}
                        <Flex
                            align="center"
                            justify="space-between"
                            px={5}
                            py={4}
                            borderBottom="1px solid"
                            borderColor="var(--waba-line)"
                        >
                            <Box>
                                <Text fontSize="15px" fontWeight="800" color="var(--waba-ink)">
                                    내가 쓴 게시글 선택
                                </Text>
                                <Text fontSize="11px" color="var(--waba-ink-3)" mt="2px">
                                    수첩 기록에 연결할 게시글을 선택하세요.
                                </Text>
                            </Box>
                            <CloseButton
                                size="sm"
                                rounded="full"
                                color="var(--waba-ink-3)"
                                onClick={() => onOpenChange(false)}
                            >
                                <LuX />
                            </CloseButton>
                        </Flex>

                        {/* 검색 입력창 */}
                        <Box px={5} pt={4} pb={3} borderBottom="1px solid" borderColor="var(--waba-line)">
                            <Flex
                                align="center"
                                gap={2}
                                px={3}
                                h="38px"
                                borderRadius="12px"
                                bg="var(--waba-surface)"
                                border="1px solid"
                                borderColor="var(--waba-line)"
                            >
                                <LuSearch size={15} color="var(--waba-ink-3)" />
                                <Input
                                    value={searchInput}
                                    onChange={(e) => setSearchInput(e.target.value)}
                                    placeholder="게시글 제목으로 검색"
                                    variant="flushed"
                                    border="none"
                                    h="100%"
                                    fontSize="13px"
                                    color="var(--waba-ink)"
                                    _focus={{ boxShadow: 'none', outline: 'none' }}
                                />
                            </Flex>
                        </Box>

                        {/* 리스트 (10개씩 무한 스크롤) */}
                        <Box
                            px={4}
                            py={3}
                            maxH="360px"
                            minH="220px"
                            overflowY="auto"
                            onScroll={handleScroll}
                        >
                            {isLoading ? (
                                <Flex justify="center" align="center" py={14}>
                                    <Spinner size="sm" color="#6338A9" />
                                </Flex>
                            ) : posts.length === 0 ? (
                                <Flex justify="center" align="center" py={14} textAlign="center">
                                    <Text fontSize="13px" color="var(--waba-ink-3)">
                                        {debouncedQuery
                                            ? '검색어와 일치하는 게시글이 없습니다.'
                                            : '작성한 게시글이 없습니다.'}
                                    </Text>
                                </Flex>
                            ) : (
                                <VStack align="stretch" gap={2}>
                                    {posts.map((post) => {
                                        const isSelected = selectedPostId === post.id;
                                        const formattedDate = post.created_at
                                            ? new Date(post.created_at).toLocaleDateString('ko-KR')
                                            : '';

                                        return (
                                            <Flex
                                                key={post.id}
                                                as="button"
                                                w="100%"
                                                textAlign="left"
                                                align="center"
                                                gap={3}
                                                p={2.5}
                                                borderRadius="14px"
                                                border="1px solid"
                                                borderColor={isSelected ? 'var(--waba-purple-border)' : 'var(--waba-line)'}
                                                bg={isSelected ? 'var(--waba-purple-soft)' : 'var(--waba-surface)'}
                                                _hover={{
                                                    borderColor: 'var(--waba-purple-border)',
                                                    bg: 'var(--waba-purple-soft)',
                                                }}
                                                cursor="pointer"
                                                onClick={() => {
                                                    onSelect(post);
                                                    onOpenChange(false);
                                                }}
                                            >
                                                {post.thumbnail_url ? (
                                                    <Image
                                                        src={post.thumbnail_url}
                                                        alt={post.title}
                                                        w="44px"
                                                        h="44px"
                                                        borderRadius="10px"
                                                        objectFit="cover"
                                                        flexShrink={0}
                                                    />
                                                ) : (
                                                    <Flex
                                                        w="44px"
                                                        h="44px"
                                                        borderRadius="10px"
                                                        bg="var(--waba-card)"
                                                        border="1px solid"
                                                        borderColor="var(--waba-line)"
                                                        align="center"
                                                        justify="center"
                                                        color="var(--waba-ink-3)"
                                                        flexShrink={0}
                                                    >
                                                        <LuImage size={16} />
                                                    </Flex>
                                                )}

                                                <Box flex={1} minW={0}>
                                                    <Text
                                                        fontSize="13px"
                                                        fontWeight="700"
                                                        color="var(--waba-ink)"
                                                        truncate
                                                    >
                                                        {post.title}
                                                    </Text>
                                                    {formattedDate && (
                                                        <Text fontSize="11px" color="var(--waba-ink-3)" mt="2px">
                                                            {formattedDate}
                                                        </Text>
                                                    )}
                                                </Box>

                                                {isSelected && (
                                                    <HStack color="var(--waba-purple-text)" flexShrink={0}>
                                                        <LuCheck size={16} />
                                                    </HStack>
                                                )}
                                            </Flex>
                                        );
                                    })}

                                    {isLoadingMore && (
                                        <Flex justify="center" py={3}>
                                            <Spinner size="sm" color="#6338A9" />
                                        </Flex>
                                    )}
                                </VStack>
                            )}
                        </Box>
                    </Dialog.Content>
                </Dialog.Positioner>
            </Portal>
        </Dialog.Root>
    );
}
