'use client'

import {
    Avatar,
    Badge,
    Box,
    Button,
    Flex,
    Grid,
    Heading,
    HStack,
    Switch,
    Text,
    VStack,
} from "@chakra-ui/react";
import { Edit3, Plus, Sparkles } from "lucide-react";
import { LuSparkles, LuUser, LuUserRound } from "react-icons/lu";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axiosInstance from "@/utils/api";
import { toaster } from "@/components/ui/toaster";
import { User } from "@/interface";

export interface UserProfileData extends User {
    post_count: number;
    bookmark_count: number;
    like_count: number;
    draft_count: number;
    auto_journal_enabled?: boolean;
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
    const [autoJournalEnabled, setAutoJournalEnabled] = useState<boolean>(
        Boolean(profile?.auto_journal_enabled)
    );
    const [isUpdatingAutoJournal, setIsUpdatingAutoJournal] = useState(false);

    useEffect(() => {
        if (profile?.auto_journal_enabled !== undefined) {
            setAutoJournalEnabled(Boolean(profile.auto_journal_enabled));
        }
    }, [profile?.auto_journal_enabled]);

    useEffect(() => {
        let isMounted = true;
        const fetchAutoJournalSetting = async () => {
            try {
                const res = await axiosInstance.get('/user/settings/auto-journal');
                if (isMounted && res.data !== undefined) {
                    const enabledVal = res.data?.enabled ?? res.data?.auto_journal_enabled;
                    if (typeof enabledVal === 'boolean') {
                        setAutoJournalEnabled(enabledVal);
                    }
                }
            } catch {
                // ignore if endpoint not ready yet
            }
        };
        fetchAutoJournalSetting();
        return () => {
            isMounted = false;
        };
    }, []);

    const handleToggleAutoJournal = async (checked: boolean) => {
        if (isUpdatingAutoJournal) return;
        const prev = autoJournalEnabled;
        setAutoJournalEnabled(checked);
        setIsUpdatingAutoJournal(true);
        try {
            await axiosInstance.patch('/user/settings/auto-journal', { enabled: checked });
            toaster.create({
                title: checked ? '자동 수첩 기록이 켜졌습니다' : '자동 수첩 기록이 꺼졌습니다',
                type: checked ? 'success' : 'info',
            });
        } catch (err: any) {
            setAutoJournalEnabled(prev);
            toaster.create({
                title: err?.response?.data?.message || '설정 변경에 실패했습니다.',
                type: 'error',
            });
        } finally {
            setIsUpdatingAutoJournal(false);
        }
    };

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

            {/* AI 자동 수첩 기록 전역 설정 바 */}
            <Flex
                mt={6}
                pt={4}
                borderTop="1px solid"
                borderColor="blackAlpha.50"
                align={{ base: "flex-start", sm: "center" }}
                justify="space-between"
                gap={4}
                flexWrap="wrap"
            >
                <HStack gap={2.5} align="flex-start" flex={1} minW="240px">
                    <Box
                        mt={0.5}
                        w="28px"
                        h="28px"
                        borderRadius="xl"
                        bg="waba.purpleLight"
                        color="waba.purple"
                        display="flex"
                        alignItems="center"
                        justifyContent="center"
                        flexShrink={0}
                    >
                        <Sparkles size={14} />
                    </Box>
                    <Box>
                        <Text fontSize="13px" fontWeight="700" color="waba.charcoal">
                            게시글 작성 시 건강 수첩 AI 자동 기록
                        </Text>
                        <Text fontSize="12px" color="waba.faint" mt={0.5} lineHeight="relaxed">
                            ON 설정 시 게시글을 올릴 때 병원·건강 내용을 AI가 감지하면 묻지 않고 자동으로 수첩에 기록합니다. (글쓰기 화면에서 건별로 끄거나 켤 수 있습니다)
                        </Text>
                    </Box>
                </HStack>

                <Switch.Root
                    colorPalette="purple"
                    size="md"
                    checked={autoJournalEnabled}
                    disabled={isUpdatingAutoJournal}
                    onCheckedChange={(e) => handleToggleAutoJournal(e.checked)}
                >
                    <Switch.HiddenInput />
                    <Switch.Control>
                        <Switch.Thumb />
                    </Switch.Control>
                    <Switch.Label fontSize="12px" fontWeight="700" color={autoJournalEnabled ? "waba.purple" : "waba.faint"}>
                        {autoJournalEnabled ? "ON" : "OFF"}
                    </Switch.Label>
                </Switch.Root>
            </Flex>
        </Box>
    );
}
