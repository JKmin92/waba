'use client'

import React from 'react';
import {
    Badge,
    Box,
    Flex,
    Grid,
    Heading,
    HStack,
    Image,
    Text,
} from '@chakra-ui/react';
import { useRouter } from 'next/navigation';
import { PostDetail, PostImage } from '@/interface/community.interface';
import SensitiveImageOverlay from '../common/SensitiveImageOverlay';

interface PetSummary {
    id: string | number;
    name: string;
    species?: string;
    breed?: string;
    latest_weight_kg?: number | string | null;
}

interface SpotlightHeroProps {
    spotlightPost?: PostDetail;
    hotQaPost?: PostDetail;
    isLogin: boolean;
    primaryPet: PetSummary | null;
}

export default function SpotlightHero({
    spotlightPost,
    hotQaPost,
    isLogin,
    primaryPet,
}: SpotlightHeroProps) {
    const router = useRouter();

    const spotlightThumbnail =
        spotlightPost?.post_images?.find((img: PostImage) => img.is_thumbnail) ||
        spotlightPost?.post_images?.[0];

    const isSpotlightSensitive = Boolean(
        spotlightPost?.thumbnail_is_sensitive ||
        spotlightPost?.post?.thumbnail_is_sensitive ||
        spotlightThumbnail?.is_sensitive
    );

    const handleSpotlightClick = () => {
        if (spotlightPost?.post?.id) {
            router.push(`/post/${spotlightPost.post.id}`);
        } else {
            router.push('/board/CARE_LOUNGE');
        }
    };

    const handleHotQaClick = () => {
        if (hotQaPost?.post?.id) {
            router.push(`/post/${hotQaPost.post.id}`);
        } else {
            router.push('/board/QNA');
        }
    };

    return (
        <Grid
            templateColumns={{ base: '1fr', lg: '1.85fr 1fr' }}
            gap={{ base: '14px', md: '16px', lg: '18px' }}
            h={{ base: 'auto', lg: '320px' }}
            minW={0}
        >
            {/* Left: Full-bleed Cinematic Spotlight Card */}
            <Box
                position="relative"
                borderRadius="24px"
                overflow="hidden"
                minH={{ base: '270px', md: '300px', lg: '320px' }}
                h={{ base: '270px', md: '300px', lg: '320px' }}
                bg="#14161D"
                cursor="pointer"
                onClick={handleSpotlightClick}
                className="group"
                minW={0}
            >
                {spotlightThumbnail?.image_url ? (
                    <Image
                        src={spotlightThumbnail.image_url}
                        alt={spotlightPost?.post?.title || 'WABA 스포트라이트'}
                        w="100%"
                        h="100%"
                        objectFit="cover"
                        display="block"
                        transition="transform 0.5s ease"
                        _groupHover={{ transform: 'scale(1.03)' }}
                    />
                ) : (
                    <Box
                        w="100%"
                        h="100%"
                        bg="linear-gradient(135deg, #261A3A 0%, #14161D 100%)"
                    />
                )}

                <SensitiveImageOverlay isSensitive={isSpotlightSensitive} />

                {/* Cinematic Gradient */}
                <Box
                    position="absolute"
                    inset={0}
                    bg="linear-gradient(180deg, rgba(15,16,20,0.08) 0%, rgba(15,16,20,0.85) 100%)"
                    pointerEvents="none"
                />

                {/* Top Badges */}
                <Flex
                    position="absolute"
                    top={{ base: '14px', md: '18px' }}
                    left={{ base: '14px', md: '20px' }}
                    right={{ base: '14px', md: '20px' }}
                    justify="space-between"
                    align="center"
                    zIndex={2}
                    gap={2}
                >
                    <Badge
                        bg="#6338A9"
                        color="#FFFFFF"
                        fontSize="11px"
                        fontWeight="700"
                        px="12px"
                        py="5px"
                        borderRadius="999px"
                    >
                        {spotlightPost?.board?.name ? `TODAY'S SPOTLIGHT · ${spotlightPost.board.name}` : "TODAY'S SPOTLIGHT"}
                    </Badge>
                    <Badge
                        bg="rgba(255,255,255,0.2)"
                        backdropFilter="blur(10px)"
                        color="#FFFFFF"
                        fontSize="11px"
                        fontWeight="700"
                        px="12px"
                        py="5px"
                        borderRadius="999px"
                    >
                        {spotlightThumbnail?.is_ai_generated ? 'AI 큐레이션' : 'WABA LOOKBOOK'}
                    </Badge>
                </Flex>

                {/* Bottom Title & CTA */}
                <Flex
                    position="absolute"
                    left={{ base: '16px', md: '22px' }}
                    right={{ base: '16px', md: '22px' }}
                    bottom={{ base: '16px', md: '20px' }}
                    zIndex={2}
                    align={{ base: 'flex-start', sm: 'flex-end' }}
                    justify="space-between"
                    direction={{ base: 'column', sm: 'row' }}
                    gap={{ base: 3, sm: 4 }}
                    color="#FFFFFF"
                >
                    <Box minW={0} flex="1">
                        <Heading
                            as="h2"
                            fontSize={{ base: '19px', md: '23px' }}
                            fontWeight="800"
                            lineHeight="1.3"
                            lineClamp={2}
                        >
                            {spotlightPost?.post?.title || '반려동물과 함께하는 건강한 라이프스타일 기록'}
                        </Heading>
                        <Text fontSize="12px" opacity={0.9} mt="8px" truncate>
                            {spotlightPost?.user?.nickname
                                ? `@${spotlightPost.user.nickname} · ♥ ${spotlightPost.post.like_count ?? 0} · 💬 ${spotlightPost.post.comment_count ?? 0}`
                                : 'WABA 큐레이션 스포트라이트'}
                        </Text>
                    </Box>

                    <Box
                        bg="#FFFFFF"
                        color="#111115"
                        fontSize="12px"
                        fontWeight="700"
                        px="16px"
                        py="9px"
                        borderRadius="999px"
                        flexShrink={0}
                        whiteSpace="nowrap"
                    >
                        스토리 보기 →
                    </Box>
                </Flex>
            </Box>

            {/* Right Stack: 내 펫 AI 수첩 + 실시간 핫 Q&A */}
            <Grid
                templateColumns={{ base: '1fr', md: '1fr 1fr', lg: '1fr' }}
                gap="14px"
                h={{ base: 'auto', lg: '320px' }}
                minW={0}
            >
                {/* 1) 내 펫 AI 수첩 */}
                <Flex
                    direction="column"
                    justify="space-between"
                    bg="linear-gradient(145deg, var(--waba-card) 0%, var(--waba-purple-soft) 100%)"
                    border="1px solid"
                    borderColor="var(--waba-purple-border)"
                    borderRadius="20px"
                    px="18px"
                    py="16px"
                    minH={{ base: '136px', lg: '0' }}
                    cursor="pointer"
                    onClick={() => router.push('/member/mypage')}
                    _hover={{ borderColor: '#6338A9' }}
                    transition="border-color 0.15s"
                    minW={0}
                >
                    <Flex justify="space-between" align="center" gap={2}>
                        <Text fontSize="11px" fontWeight="800" color="var(--waba-purple-text)">
                            내 펫 AI 수첩
                        </Text>
                        <Text fontSize="11px" color="var(--waba-ink-3)">
                            {isLogin && primaryPet ? '연동 완료' : 'AI 케어'}
                        </Text>
                    </Flex>

                    <Text fontSize="16px" fontWeight="800" lineHeight="1.35" color="var(--waba-ink)" lineClamp={2} my={1}>
                        {isLogin && primaryPet
                            ? `${primaryPet.name} · ${
                                  primaryPet.latest_weight_kg
                                      ? `${Number(primaryPet.latest_weight_kg).toFixed(1)}kg 건강 관리 중`
                                      : `${primaryPet.breed || primaryPet.species || '반려동물'} 수첩`
                              }`
                            : '우리 아이 건강·산책 기록을 AI 수첩으로 관리해 보세요'}
                    </Text>

                    <Flex justify="space-between" align="center" fontSize="12px">
                        <Text color="var(--waba-ink-2)" truncate>
                            {isLogin ? '진료·체중·접종 자동 기록' : '로그인 후 바로 시작 가능'}
                        </Text>
                        <Text fontWeight="700" color="var(--waba-purple-text)" flexShrink={0}>
                            기록하기 →
                        </Text>
                    </Flex>
                </Flex>

                {/* 2) 실시간 핫 Q&A */}
                <Flex
                    direction="column"
                    justify="space-between"
                    bg="var(--waba-surface)"
                    border="1px solid"
                    borderColor="var(--waba-line)"
                    borderRadius="20px"
                    px="18px"
                    py="16px"
                    minH={{ base: '136px', lg: '0' }}
                    cursor="pointer"
                    onClick={handleHotQaClick}
                    _hover={{ borderColor: 'var(--waba-purple-border)' }}
                    transition="border-color 0.15s"
                    minW={0}
                >
                    <Flex justify="space-between" align="center" gap={2}>
                        <Text fontSize="11px" fontWeight="800" color="var(--waba-ink)">
                            🔥 실시간 핫 Q&amp;A
                        </Text>
                        <Text fontSize="11px" color="var(--waba-purple-text)" fontWeight="700">
                            {hotQaPost ? `답변 ${hotQaPost.post.comment_count ?? 0}개` : 'Q&A 보기'}
                        </Text>
                    </Flex>

                    <Text fontSize="14px" fontWeight="700" lineHeight="1.4" color="var(--waba-ink)" lineClamp={2} my={1}>
                        {hotQaPost?.post?.title || '반려동물 건강·행동 궁금증을 수의사 & 집사들과 나눠보세요'}
                    </Text>

                    <Text fontSize="11px" color="var(--waba-ink-3)" truncate>
                        {hotQaPost?.user?.nickname
                            ? `@${hotQaPost.user.nickname} · ♥ ${hotQaPost.post.like_count ?? 0}`
                            : '건강 Q&A 라운지 바로가기 →'}
                    </Text>
                </Flex>
            </Grid>
        </Grid>
    );
}
