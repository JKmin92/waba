'use client'

import React from 'react';
import {
    Box,
    Flex,
    Grid,
    HStack,
    Image,
    Text,
} from '@chakra-ui/react';
import { LuBookmark } from 'react-icons/lu';
import { useRouter } from 'next/navigation';
import { PostDetail, PostImage } from '@/interface/community.interface';
import SensitiveImageOverlay from '../../../common/SensitiveImageOverlay';
import UserAvatar from '../../../common/UserAvatar';

interface BoardEqualGridCardProps {
    postList: PostDetail[];
}

export default function BoardEqualGridCard({ postList }: BoardEqualGridCardProps) {
    const router = useRouter();

    return (
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
            {postList.map((item) => {
                const thumbImgObj =
                    item.post_images?.find((img: PostImage) => img.is_thumbnail) ||
                    item.post_images?.[0];
                const thumbnail = thumbImgObj?.image_url;
                const hasImage = Boolean(thumbnail);
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
                const petLabel = item.post_pets?.[0]?.name
                    ? `🐾 ${item.post_pets[0].name}`
                    : item.board?.name || '커뮤니티';

                if (hasImage) {
                    return (
                        <Box
                            key={item.post.id}
                            bg="var(--waba-card)"
                            border="1px solid"
                            borderColor="var(--waba-line)"
                            borderRadius="20px"
                            overflow="hidden"
                            display="flex"
                            flexDirection="column"
                            h="100%"
                            cursor="pointer"
                            onClick={() => router.push(`/post/${item.post.id}`)}
                            _hover={{
                                transform: 'translateY(-3px)',
                                borderColor: 'var(--waba-purple-border)',
                            }}
                            transition="all 0.2s ease"
                            minW={0}
                        >
                            {/* Top Image (220px) */}
                            <Box
                                position="relative"
                                h="220px"
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

                                <Box
                                    position="absolute"
                                    top="12px"
                                    left="12px"
                                    bg="var(--waba-glass-btn)"
                                    backdropFilter="blur(8px)"
                                    fontSize="11px"
                                    fontWeight="700"
                                    px="10px"
                                    py="4px"
                                    borderRadius="999px"
                                    color="var(--waba-ink)"
                                    maxW="70%"
                                    truncate
                                >
                                    {petLabel}
                                </Box>

                                <Box
                                    position="absolute"
                                    top="12px"
                                    right="12px"
                                    w="32px"
                                    h="32px"
                                    borderRadius="full"
                                    bg="var(--waba-glass-btn)"
                                    display="flex"
                                    alignItems="center"
                                    justifyContent="center"
                                    color="var(--waba-ink)"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        router.push(`/post/${item.post.id}`);
                                    }}
                                >
                                    <LuBookmark size={14} />
                                </Box>
                            </Box>

                            {/* Bottom Body */}
                            <Box
                                p="16px"
                                display="flex"
                                flexDirection="column"
                                justifyContent="space-between"
                                flex="1"
                                gap="10px"
                                minW={0}
                            >
                                <Text
                                    fontSize="15px"
                                    fontWeight="700"
                                    color="var(--waba-ink)"
                                    lineHeight="1.45"
                                    lineClamp={2}
                                >
                                    {item.post.title}
                                </Text>

                                <Flex
                                    align="center"
                                    justify="space-between"
                                    fontSize="12px"
                                    color="var(--waba-ink-3)"
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
                            </Box>
                        </Box>
                    );
                }

                // Text-only Card (Equal height with Image Cards)
                return (
                    <Box
                        key={item.post.id}
                        bg="var(--waba-card)"
                        border="1px solid"
                        borderColor="var(--waba-line)"
                        borderRadius="20px"
                        p="20px"
                        display="flex"
                        flexDirection="column"
                        justifyContent="space-between"
                        h="100%"
                        minH={{ base: '250px', md: '310px' }}
                        gap="12px"
                        cursor="pointer"
                        onClick={() => router.push(`/post/${item.post.id}`)}
                        _hover={{
                            transform: 'translateY(-3px)',
                            borderColor: 'var(--waba-purple-border)',
                        }}
                        transition="all 0.2s ease"
                        minW={0}
                    >
                        <Flex direction="column" gap="10px" minW={0}>
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
                                    {item.board?.name || '커뮤니티'}
                                </Box>
                                <Text fontSize="11px" color="var(--waba-ink-3)">
                                    조회 {item.post.view_count ?? 0}
                                </Text>
                            </Flex>

                            <Text
                                fontSize="16px"
                                fontWeight="800"
                                color="var(--waba-ink)"
                                lineHeight="1.4"
                                lineClamp={2}
                            >
                                {item.post.title}
                            </Text>

                            <Text
                                fontSize="13px"
                                color="var(--waba-ink-2)"
                                lineHeight="1.55"
                                lineClamp={4}
                            >
                                {firstText || '커뮤니티에서 자세한 내용을 확인해 보세요.'}
                            </Text>
                        </Flex>

                        <Flex direction="column" gap="10px" minW={0}>
                            {/* Tags / Summary Box */}
                            <Box
                                bg="var(--waba-surface)"
                                borderRadius="12px"
                                px="12px"
                                py="10px"
                                fontSize="12px"
                                color="var(--waba-ink-2)"
                            >
                                {item.tags && item.tags.length > 0 ? (
                                    <HStack gap="6px" flexWrap="wrap">
                                        {item.tags.slice(0, 3).map((tag) => (
                                            <Box
                                                key={tag}
                                                bg="var(--waba-purple-soft)"
                                                color="var(--waba-purple-text)"
                                                fontSize="11px"
                                                fontWeight="700"
                                                px="8px"
                                                py="2px"
                                                borderRadius="999px"
                                            >
                                                #{tag}
                                            </Box>
                                        ))}
                                    </HStack>
                                ) : (
                                    <Text truncate>
                                        💬 댓글 {item.post.comment_count ?? 0}개의 의견이 모여있어요
                                    </Text>
                                )}
                            </Box>

                            <Flex
                                align="center"
                                justify="space-between"
                                fontSize="12px"
                                color="var(--waba-ink-3)"
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
                        </Flex>
                    </Box>
                );
            })}
        </Grid>
    );
}
