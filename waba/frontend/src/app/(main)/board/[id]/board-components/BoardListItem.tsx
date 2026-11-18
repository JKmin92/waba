'use client'

import React from 'react';
import {
    Box,
    Flex,
    HStack,
    Image,
    Text,
    VStack,
} from '@chakra-ui/react';
import { useRouter } from 'next/navigation';
import { PostDetail, PostImage } from '@/interface/community.interface';
import SensitiveImageOverlay from '../../../common/SensitiveImageOverlay';
import UserAvatar from '../../../common/UserAvatar';

interface BoardListItemProps {
    postList: PostDetail[];
}

export default function BoardListItem({ postList }: BoardListItemProps) {
    const router = useRouter();

    return (
        <VStack align="stretch" gap="12px" minW={0}>
            {postList.map((item) => {
                const thumbImgObj =
                    item.post_images?.find((img: PostImage) => img.is_thumbnail) ||
                    item.post_images?.[0];
                const thumbnail = thumbImgObj?.image_url;
                const firstImgBlock = item.post.content?.find(
                    (c): c is { type: 'image'; image_id: number; is_sensitive?: boolean | number } =>
                        c.type === 'image'
                );
                const isSensitive = Boolean(
                    item.thumbnail_is_sensitive ||
                    item.post.thumbnail_is_sensitive ||
                    thumbImgObj?.is_sensitive ||
                    firstImgBlock?.is_sensitive
                );
                const firstText =
                    item.post.content?.find((c) => c.type === 'text')?.content || '';

                return (
                    <Flex
                        key={item.post.id}
                        bg="var(--waba-card)"
                        border="1px solid"
                        borderColor="var(--waba-line)"
                        borderRadius="18px"
                        p={{ base: '14px', md: '18px' }}
                        align="center"
                        justify="space-between"
                        gap={{ base: '12px', md: '18px' }}
                        cursor="pointer"
                        onClick={() => router.push(`/post/${item.post.id}`)}
                        _hover={{ borderColor: 'var(--waba-purple-border)' }}
                        transition="border-color 0.15s"
                        minW={0}
                    >
                        <VStack align="stretch" gap="8px" flex="1" minW={0}>
                            <HStack gap="8px" flexWrap="wrap">
                                <Box
                                    bg="var(--waba-purple-soft)"
                                    color="var(--waba-purple-text)"
                                    fontSize="11px"
                                    fontWeight="700"
                                    px="10px"
                                    py="3px"
                                    borderRadius="999px"
                                >
                                    {item.board?.name || '커뮤니티'}
                                </Box>
                                {item.tags?.slice(0, 2).map((tag) => (
                                    <Text key={tag} fontSize="11px" color="var(--waba-ink-3)" fontWeight="600">
                                        #{tag}
                                    </Text>
                                ))}
                            </HStack>

                            <Text
                                fontSize={{ base: '15px', md: '16px' }}
                                fontWeight="800"
                                color="var(--waba-ink)"
                                lineClamp={1}
                            >
                                {item.post.title}
                            </Text>

                            {firstText && (
                                <Text
                                    fontSize="13px"
                                    color="var(--waba-ink-2)"
                                    lineHeight="1.5"
                                    lineClamp={2}
                                >
                                    {firstText}
                                </Text>
                            )}

                            <Flex
                                align="center"
                                justify="space-between"
                                fontSize="12px"
                                color="var(--waba-ink-3)"
                                pt="2px"
                                gap={2}
                                minW={0}
                            >
                                <HStack gap="7px" minW={0} flex="1" color="var(--waba-ink-2)" fontWeight="600">
                                    <UserAvatar
                                        src={item.user?.profile_image_url}
                                        alt={item.user?.nickname || '프로필'}
                                        size="2xs"
                                    />
                                    <Text truncate>@{item.user?.nickname || '집사'}</Text>
                                </HStack>

                                <Text flexShrink={0}>
                                    ♥ {item.post.like_count ?? 0} · 💬 {item.post.comment_count ?? 0}
                                </Text>
                            </Flex>
                        </VStack>

                        {thumbnail && (
                            <Box
                                position="relative"
                                w={{ base: '84px', md: '112px' }}
                                h={{ base: '84px', md: '112px' }}
                                borderRadius="14px"
                                overflow="hidden"
                                flexShrink={0}
                                bg="var(--waba-surface)"
                            >
                                <Image
                                    src={thumbnail}
                                    alt={item.post.title}
                                    w="100%"
                                    h="100%"
                                    objectFit="cover"
                                    display="block"
                                />
                                <SensitiveImageOverlay isSensitive={isSensitive} compact />
                            </Box>
                        )}
                    </Flex>
                );
            })}
        </VStack>
    );
}
