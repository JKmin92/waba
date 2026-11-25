'use client'

import React from 'react';
import {
    Box,
    Flex,
    Grid,
    Heading,
    HStack,
    Image,
    Text,
} from '@chakra-ui/react';
import { LuBookmark } from 'react-icons/lu';
import { useRouter } from 'next/navigation';
import { PostDetail, PostImage } from '@/interface/community.interface';
import SensitiveImageOverlay from '../common/SensitiveImageOverlay';
import UserAvatar from '../common/UserAvatar';

interface LifeSnapFeedSectionProps {
    posts: PostDetail[];
}

export default function LifeSnapFeedSection({ posts }: LifeSnapFeedSectionProps) {
    const router = useRouter();

    return (
        <Box as="section" minW={0}>
            <Flex justify="space-between" align="center" mb="12px" gap={2}>
                <Heading as="h3" fontSize="16px" fontWeight="800" color="var(--waba-ink)">
                    📸 라이프 스냅
                </Heading>
                <Text
                    as="button"
                    fontSize="12px"
                    color="var(--waba-ink-3)"
                    fontWeight="600"
                    cursor="pointer"
                    _hover={{ color: 'var(--waba-purple-text)' }}
                    onClick={() => router.push('/board/SNAP')}
                    flexShrink={0}
                >
                    스냅 전체보기 →
                </Text>
            </Flex>

            {posts.length === 0 ? (
                <Box
                    bg="var(--waba-surface)"
                    border="1px solid"
                    borderColor="var(--waba-line)"
                    borderRadius="20px"
                    py={12}
                    textAlign="center"
                >
                    <Text fontSize="13px" color="var(--waba-ink-3)">
                        표시할 게시글이 아직 없습니다.
                    </Text>
                </Box>
            ) : (
                <Grid
                    templateColumns={{
                        base: 'repeat(2, 1fr)',
                        md: 'repeat(2, 1fr)',
                        lg: 'repeat(3, 1fr)',
                    }}
                    gap={{ base: '10px', md: '16px', lg: '18px' }}
                    alignItems="stretch"
                    minW={0}
                >
                    {posts.map((item) => {
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
                        const postPets = item.post_pets || [];
                        const boardLabel = item.board?.name || '스냅';

                        return (
                            <Box
                                key={item.post.id}
                                bg="var(--waba-card)"
                                border="1px solid"
                                borderColor="var(--waba-line)"
                                borderRadius={{ base: '16px', md: '20px' }}
                                overflow="hidden"
                                display="flex"
                                flexDirection="column"
                                cursor="pointer"
                                onClick={() => router.push(`/post/${item.post.id}`)}
                                _hover={{ transform: 'translateY(-3px)', borderColor: 'var(--waba-purple-border)' }}
                                transition="all 0.2s ease"
                                minW={0}
                            >
                                {/* Media Box */}
                                <Box
                                    position="relative"
                                    h={{ base: '150px', md: '200px', lg: '215px' }}
                                    overflow="hidden"
                                    flexShrink={0}
                                    bg="var(--waba-surface)"
                                >
                                    {thumbnail ? (
                                        <Image
                                            src={thumbnail}
                                            alt={item.post.title}
                                            w="100%"
                                            h="100%"
                                            objectFit="cover"
                                            display="block"
                                        />
                                    ) : (
                                        <Flex
                                            w="100%"
                                            h="100%"
                                            p={4}
                                            align="center"
                                            justify="center"
                                            bg="var(--waba-purple-soft)"
                                        >
                                            <Text
                                                fontSize="12px"
                                                color="var(--waba-purple-text)"
                                                fontWeight="600"
                                                lineClamp={3}
                                                textAlign="center"
                                            >
                                                {item.post.content?.find((c) => c.type === 'text')?.content ||
                                                    item.post.title}
                                            </Text>
                                        </Flex>
                                    )}

                                    <SensitiveImageOverlay isSensitive={isSensitive} compact />

                                    {/* Top-left Pill */}
                                    {postPets.length > 0 ? (
                                        <HStack
                                            position="absolute"
                                            top={{ base: '8px', md: '12px' }}
                                            left={{ base: '8px', md: '12px' }}
                                            gap={0}
                                            title={postPets.map((p) => p.name).join(', ')}
                                        >
                                            {postPets.slice(0, 3).map((p, idx) => (
                                                <Box
                                                    key={String(p.pet_id)}
                                                    position="relative"
                                                    zIndex={idx}
                                                    ml={idx > 0 ? '-8px' : 0}
                                                    borderRadius="full"
                                                    boxShadow="var(--waba-avatar-shadow)"
                                                    title={p.name}
                                                >
                                                    <UserAvatar
                                                        src={p.avatar_url}
                                                        alt={p.name}
                                                        w="28px"
                                                        h="28px"
                                                        iconSize={14}
                                                        fallbackType="pet"
                                                    />
                                                </Box>
                                            ))}
                                            {postPets.length > 3 && (
                                                <Flex
                                                    position="relative"
                                                    zIndex={3}
                                                    ml="-8px"
                                                    w="28px"
                                                    h="28px"
                                                    borderRadius="full"
                                                    bg="var(--waba-card)"
                                                    color="var(--waba-ink)"
                                                    boxShadow="var(--waba-avatar-shadow)"
                                                    fontSize="11px"
                                                    fontWeight="800"
                                                    align="center"
                                                    justify="center"
                                                >
                                                    +{postPets.length - 3}
                                                </Flex>
                                            )}
                                        </HStack>
                                    ) : (
                                        <Box
                                            position="absolute"
                                            top={{ base: '8px', md: '12px' }}
                                            left={{ base: '8px', md: '12px' }}
                                            bg="var(--waba-glass-btn)"
                                            backdropFilter="blur(8px)"
                                            fontSize={{ base: '10px', md: '11px' }}
                                            fontWeight="700"
                                            px={{ base: '8px', md: '10px' }}
                                            py="4px"
                                            borderRadius="999px"
                                            color="var(--waba-ink)"
                                            maxW="70%"
                                            truncate
                                        >
                                            {boardLabel}
                                        </Box>
                                    )}

                                    {/* Top-right Bookmark */}
                                    <Box
                                        position="absolute"
                                        top={{ base: '8px', md: '12px' }}
                                        right={{ base: '8px', md: '12px' }}
                                        w={{ base: '28px', md: '32px' }}
                                        h={{ base: '28px', md: '32px' }}
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

                                {/* Body */}
                                <Box
                                    p={{ base: '10px 12px', md: '14px 16px' }}
                                    display="flex"
                                    flexDirection="column"
                                    justifyContent="space-between"
                                    flex="1"
                                    gap="8px"
                                    minW={0}
                                >
                                    <Text
                                        fontSize={{ base: '13px', md: '14px' }}
                                        fontWeight="700"
                                        color="var(--waba-ink)"
                                        lineHeight="1.4"
                                        lineClamp={2}
                                    >
                                        {item.post.title}
                                    </Text>

                                    <Flex
                                        align="center"
                                        justify="space-between"
                                        fontSize={{ base: '11px', md: '12px' }}
                                        color="var(--waba-ink-3)"
                                        gap={1.5}
                                        minW={0}
                                    >
                                        <HStack gap="6px" minW={0} flex="1" color="var(--waba-ink-2)" fontWeight="600">
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
                    })}
                </Grid>
            )}
        </Box>
    );
}
