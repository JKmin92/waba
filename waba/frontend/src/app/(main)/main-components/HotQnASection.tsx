'use client'

import React from 'react';
import {
    Box,
    Flex,
    Grid,
    Heading,
    HStack,
    Text,
} from '@chakra-ui/react';
import { useRouter } from 'next/navigation';
import { PostDetail } from '@/interface/community.interface';
import UserAvatar from '../common/UserAvatar';

interface HotQnASectionProps {
    qnaPosts: PostDetail[];
}

export default function HotQnASection({ qnaPosts }: HotQnASectionProps) {
    const router = useRouter();

    if (qnaPosts.length === 0) {
        return null;
    }

    return (
        <Box as="section" minW={0}>
            <Flex justify="space-between" align="center" mb="12px" gap={2}>
                <Heading as="h3" fontSize="16px" fontWeight="800" color="var(--waba-ink)">
                    💬 지금 답변이 활발한 건강 Q&amp;A
                </Heading>
                <Text
                    as="button"
                    fontSize="12px"
                    color="var(--waba-ink-3)"
                    fontWeight="600"
                    cursor="pointer"
                    _hover={{ color: 'var(--waba-purple-text)' }}
                    onClick={() => router.push('/board/QNA')}
                    flexShrink={0}
                >
                    Q&amp;A 전체보기 →
                </Text>
            </Flex>

            <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }} gap="16px" minW={0}>
                {qnaPosts.slice(0, 2).map((item) => {
                    const firstText =
                        item.post.content?.find((c) => c.type === 'text')?.content || '';
                    const tagLabel =
                        item.tags?.[0] || item.board?.name || '건강 Q&A';

                    return (
                        <Box
                            key={item.post.id}
                            bg="var(--waba-card)"
                            border="1px solid"
                            borderColor="var(--waba-line)"
                            borderRadius="20px"
                            p={{ base: '16px', md: '18px' }}
                            display="flex"
                            flexDirection="column"
                            gap="10px"
                            cursor="pointer"
                            onClick={() => router.push(`/post/${item.post.id}`)}
                            _hover={{ borderColor: 'var(--waba-purple-border)' }}
                            transition="border-color 0.15s"
                            minW={0}
                        >
                            <Flex justify="space-between" align="center" gap={2}>
                                <Box
                                    bg="var(--waba-purple-soft)"
                                    color="var(--waba-purple-text)"
                                    fontSize="11px"
                                    fontWeight="700"
                                    px="10px"
                                    py="4px"
                                    borderRadius="999px"
                                >
                                    {tagLabel}
                                </Box>
                                <Text fontSize="11px" color="var(--waba-ink-3)">
                                    답변 {item.post.comment_count ?? 0}개 · ♥ {item.post.like_count ?? 0}
                                </Text>
                            </Flex>

                            <Text
                                fontSize="15px"
                                fontWeight="700"
                                color="var(--waba-ink)"
                                lineHeight="1.45"
                                lineClamp={2}
                            >
                                {item.post.title}
                            </Text>

                            <HStack
                                bg="var(--waba-surface)"
                                borderRadius="12px"
                                px="12px"
                                py="10px"
                                gap="10px"
                                fontSize="12px"
                                color="var(--waba-ink-2)"
                                minW={0}
                            >
                                <UserAvatar
                                    src={item.user?.profile_image_url}
                                    alt={item.user?.nickname || '프로필'}
                                    size="2xs"
                                />
                                <Text truncate>
                                    <strong
                                        style={{
                                            color: item.user?.vet_license_info
                                                ? 'var(--waba-purple-text)'
                                                : 'var(--waba-ink)',
                                        }}
                                    >
                                        {item.user?.vet_license_info ? '✓ ' : ''}
                                        @{item.user?.nickname || '집사'}:
                                    </strong>{' '}
                                    {firstText || '질문 내용을 확인하고 답변을 남겨보세요.'}
                                </Text>
                            </HStack>
                        </Box>
                    );
                })}
            </Grid>
        </Box>
    );
}
