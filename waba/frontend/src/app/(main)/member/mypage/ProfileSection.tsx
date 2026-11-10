'use client'

import {
    Avatar,
    Badge,
    Box,
    Button,
    Grid,
    Heading,
    HStack,
    Text,
    VStack,
} from "@chakra-ui/react";
import { Edit3, Plus } from "lucide-react";
import { LuSparkles, LuUser, LuUserRound } from "react-icons/lu";
import { useRouter } from "next/navigation";
import { toaster } from "@/components/ui/toaster";
import { User } from "@/interface";

export interface UserProfileData extends User {
    post_count: number;
    bookmark_count: number;
    like_count: number;
    draft_count: number;
}

interface ProfileSectionProps {
    profile: UserProfileData | null;
    activeTab: 'post' | 'bookmark' | 'like' | 'draft';
    onSelectTab: (tab: 'post' | 'bookmark' | 'like' | 'draft') => void;
    postCount: number;
    bookmarkCount: number;
    likeCount: number;
    draftCount: number;
    isMultiSpecies: boolean;
    onOpenEditProfile: () => void;
}

export default function ProfileSection({
    profile,
    activeTab,
    onSelectTab,
    postCount,
    bookmarkCount,
    likeCount,
    draftCount,
    isMultiSpecies,
    onOpenEditProfile,
}: ProfileSectionProps) {
    const router = useRouter();

    return (
        <Box
            bg="white"
            borderRadius="28px"
            p={{ base: 6, md: 8 }}
            border="1px solid"
            borderColor="waba.border"
            shadow="0 8px 32px -4px rgba(26,28,30,0.04)"
        >
            <Grid templateColumns={{ base: "1fr", lg: "1fr auto" }} gap={8} alignItems="center">
                {/* 좌측: 아바타 및 회원 프로필 정보 */}
                <HStack gap={{ base: 4, md: 6 }} align="start">
                    <Avatar.Root
                        size={{ base: "xl", md: "2xl" }}
                        borderRadius="full"
                        border="3px solid"
                        borderColor="waba.purple"
                        shadow="md"
                    >
                        {profile?.profile_image_url ? (
                            <Avatar.Image src={profile.profile_image_url} alt={profile.nickname} />
                        ) : (
                            <LuUserRound size={26} />
                        )}
                    </Avatar.Root>

                    <VStack align="start" gap={2} flex={1}>
                        <HStack gap={2} flexWrap="wrap">
                            <Heading fontSize={{ base: "20px", md: "24px" }} fontWeight="700" color="waba.charcoal">
                                {profile?.nickname || '회원'}
                            </Heading>

                            {profile?.mentor_badge && profile.mentor_badge !== 'NONE' && (
                                <Badge
                                    bg="waba.purpleLight"
                                    color="waba.purple"
                                    px={2.5}
                                    py={1}
                                    borderRadius="full"
                                    fontSize="11px"
                                    fontWeight="700"
                                    border="1px solid"
                                    borderColor="waba.purple/20"
                                >
                                    STYLE MENTOR
                                </Badge>
                            )}

                            {isMultiSpecies && (
                                <Badge
                                    bg="orange.50"
                                    color="orange.700"
                                    px={2.5}
                                    py={1}
                                    borderRadius="full"
                                    fontSize="11px"
                                    fontWeight="600"
                                    border="1px solid"
                                    borderColor="orange.200"
                                >
                                    ✨ 다종 합사 가구
                                </Badge>
                            )}
                        </HStack>

                        <Text fontSize="13px" color="waba.faint">
                            {profile?.email}
                        </Text>

                        <Text fontSize="14px" color="waba.charcoal" mt={1} maxW="600px">
                            {profile?.bio || '소개글이 아직 없습니다. 내 아이들과의 공간을 기록해보세요.'}
                        </Text>

                        {/* 활동 아카이브 지표 (팔로워 대신 노출) */}
                        <HStack gap={4} mt={3} pt={3} borderTop="1px solid" w="full" borderColor="blackAlpha.50" flexWrap="wrap">
                            <Box
                                as="button"
                                onClick={() => onSelectTab('post')}
                                cursor="pointer"
                                fontSize="13px"
                                color={activeTab === 'post' ? 'waba.purple' : 'waba.charcoal'}
                                fontWeight={activeTab === 'post' ? '700' : '500'}
                                transition="all 0.2s"
                                _hover={{ color: 'waba.purple' }}
                            >
                                작성한 글 <Text as="span" fontWeight="700" ml={1}>{postCount}</Text>
                            </Box>
                            <Text color="gray.300">•</Text>
                            <Box
                                as="button"
                                onClick={() => onSelectTab('bookmark')}
                                cursor="pointer"
                                fontSize="13px"
                                color={activeTab === 'bookmark' ? 'waba.purple' : 'waba.charcoal'}
                                fontWeight={activeTab === 'bookmark' ? '700' : '500'}
                                transition="all 0.2s"
                                _hover={{ color: 'waba.purple' }}
                            >
                                스크랩 <Text as="span" fontWeight="700" ml={1}>{bookmarkCount}</Text>
                            </Box>
                            <Text color="gray.300">•</Text>
                            <Box
                                as="button"
                                onClick={() => onSelectTab('like')}
                                cursor="pointer"
                                fontSize="13px"
                                color={activeTab === 'like' ? 'waba.purple' : 'waba.charcoal'}
                                fontWeight={activeTab === 'like' ? '700' : '500'}
                                transition="all 0.2s"
                                _hover={{ color: 'waba.purple' }}
                            >
                                좋아요 <Text as="span" fontWeight="700" ml={1}>{likeCount}</Text>
                            </Box>
                            {draftCount > 0 && (
                                <>
                                    <Text color="gray.300">•</Text>
                                    <Box
                                        as="button"
                                        onClick={() => onSelectTab('draft')}
                                        cursor="pointer"
                                        fontSize="13px"
                                        color={activeTab === 'draft' ? 'waba.purple' : 'orange.600'}
                                        fontWeight="700"
                                        transition="all 0.2s"
                                        _hover={{ color: 'waba.purple' }}
                                    >
                                        임시저장 <Text as="span" ml={1}>{draftCount}</Text>
                                    </Box>
                                </>
                            )}
                        </HStack>
                    </VStack>
                </HStack>

                {/* 우측: 리워드 포인트 카드 & 액션 버튼 */}
                <HStack gap={3} alignSelf={{ base: "stretch", lg: "center" }} justify={{ base: "space-between", lg: "flex-end" }}>
                    <Box
                        p={4}
                        borderRadius="20px"
                        bg="linear-gradient(135deg, #F3EDFF 0%, #FAF7FF 100%)"
                        border="1px solid"
                        borderColor="waba.purple/20"
                        minW="180px"
                    >
                        <HStack justify="space-between" mb={1}>
                            <Text fontSize="11px" fontWeight="700" color="waba.purple" letterSpacing="0.05em">
                                WABA REWARD
                            </Text>
                            <LuSparkles size={14} color="#6338A9" />
                        </HStack>
                        <Text fontSize="22px" fontWeight="800" color="waba.charcoal">
                            {(profile?.reward_points ?? 0).toLocaleString()} <Text as="span" fontSize="14px" fontWeight="600" color="waba.purple">P</Text>
                        </Text>
                        <Text fontSize="11px" color="waba.faint" mt={0.5}>
                            핀 태그 구매 리워드
                        </Text>
                    </Box>

                    <VStack gap={2} align="stretch">
                        <Button
                            variant="outline"
                            size="sm"
                            rounded="full"
                            borderColor="waba.border"
                            color="waba.charcoal"
                            px={4}
                            fontSize="12px"
                            fontWeight="600"
                            _hover={{ bg: 'waba.subtle', borderColor: 'waba.charcoal' }}
                            onClick={onOpenEditProfile}
                        >
                            <Edit3 size={13} style={{ marginRight: '4px' }} />
                            프로필 수정
                        </Button>

                        <Button
                            bg="waba.charcoal"
                            color="white"
                            size="sm"
                            rounded="full"
                            px={4}
                            fontSize="12px"
                            fontWeight="600"
                            _hover={{ bg: '#2D3033' }}
                            onClick={() => router.push('/post/register')}
                        >
                            <Plus size={13} style={{ marginRight: '4px' }} />
                            새 이야기 쓰기
                        </Button>
                    </VStack>
                </HStack>
            </Grid>
        </Box>
    );
}
