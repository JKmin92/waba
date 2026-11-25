'use client'

import { useState } from "react";
import { LuDog } from 'react-icons/lu';
import {
    Avatar,
    Badge,
    Box,
    Button,
    Flex,
    Heading,
    HStack,
    IconButton,
    Separator,
    Input,
    Text,
    Textarea,
    VStack,
} from "@chakra-ui/react";
import {
    Bookmark,
    Edit3,
    FileText,
    Heart,
    Home,
    Plus,
    Trash2,
    X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Pet, PostDetail } from "@/interface";
import { formatDate, petSpeciesLabel } from "@/utils/simpleUtils";
import BoardEqualGridCard from "../../board/[id]/board-components/BoardEqualGridCard";

interface ActivitySectionProps {
    activeTab: 'post' | 'bookmark' | 'like' | 'draft' | 'appeal';
    onTabChange: (tab: 'post' | 'bookmark' | 'like' | 'draft' | 'appeal') => void;
    postList: PostDetail[];
    bookmarkList: PostDetail[];
    likeList: PostDetail[];
    draftList: any[];
    onDeleteDraft: (draftId: string) => void;
    isLoading?: boolean;
    postCount?: number;
    bookmarkCount?: number;
    likeCount?: number;
    draftCount?: number;
    pets?: Pet[];
    selectedPetId?: string | null;
    onSelectPetId?: (petId: string | null) => void;
    reportedDeletedPosts?: any[];
    onSubmitAppeal?: (postId: string, reason: string) => Promise<void>;
}

export default function ActivitySection({
    activeTab,
    onTabChange,
    postList,
    bookmarkList,
    likeList,
    draftList,
    onDeleteDraft,
    isLoading = false,
    postCount,
    bookmarkCount,
    likeCount,
    draftCount,
    pets = [],
    selectedPetId = null,
    onSelectPetId,
    reportedDeletedPosts = [],
    onSubmitAppeal,
}: ActivitySectionProps) {
    const router = useRouter();
    const [appealPostId, setAppealPostId] = useState<string | null>(null);
    const [appealReason, setAppealReason] = useState('');
    const [isSubmittingAppeal, setIsSubmittingAppeal] = useState(false);

    const isUnassignedSelected = selectedPetId === 'unassigned';
    const selectedPet = !isUnassignedSelected ? pets.find((p) => String(p.id) === String(selectedPetId)) : null;

    // 미분류 게시글 계산 (post_pets가 없고, PET 핀도 없는 글)
    const unassignedCount = postList.filter((post) => {
        const hasPostPets = post.post_pets && post.post_pets.length > 0;
        const hasPetPins = post.product_pins && post.product_pins.some((pin) => pin.pin_type === 'PET');
        return !hasPostPets && !hasPetPins;
    }).length;

    // 펫 필터링 적용 (내 게시글)
    const displayedPostList = selectedPetId === 'unassigned'
        ? postList.filter((post) => {
            const hasPostPets = post.post_pets && post.post_pets.length > 0;
            const hasPetPins = post.product_pins && post.product_pins.some((pin) => pin.pin_type === 'PET');
            return !hasPostPets && !hasPetPins;
        })
        : selectedPetId
            ? postList.filter((post) =>
                post.post_pets?.some((p) => String(p.pet_id) === String(selectedPetId)) ||
                post.product_pins?.some((pin) => pin.pin_type === 'PET' && String(pin.pet_id) === String(selectedPetId))
            )
            : postList;

    const getSpeciesEmoji = (species: string) => {
        switch (species) {
            case 'DOG': return '🐶';
            case 'CAT': return '🐱';
            case 'RABBIT': return '🐰';
            case 'HAMSTER': return '🐹';
            case 'GUINEAPIG': return '🐹';
            case 'CHINCHILA': return '🐭';
            default: return '🐾';
        }
    };

    const calculateAge = (birthDate: string | null) => {
        if (!birthDate) return '';
        try {
            const birth = new Date(birthDate);
            const now = new Date();
            const diffMonths = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
            if (diffMonths < 12) {
                return `생후 ${Math.max(diffMonths, 1)}개월`;
            }
            const years = Math.floor(diffMonths / 12);
            const months = diffMonths % 12;
            return months > 0 ? `${years}살 ${months}개월` : `${years}살`;
        } catch {
            return '';
        }
    };

    return (
        <Box id="my-activity-section" mt={2}>
            {/* 탭 네비게이션 헤더 */}
            <HStack
                borderBottom="1px solid"
                borderColor="var(--waba-line)"
                gap={6}
                overflowX="auto"
                pb="2px"
            >
                <Box
                    as="button"
                    py={3}
                    borderBottom="2px solid"
                    borderColor={activeTab === 'post' ? '#6338A9' : 'transparent'}
                    color={activeTab === 'post' ? 'var(--waba-ink)' : 'var(--waba-ink-3)'}
                    fontWeight={activeTab === 'post' ? '700' : '500'}
                    fontSize="15px"
                    display="flex"
                    alignItems="center"
                    gap={2}
                    transition="all 0.2s"
                    onClick={() => onTabChange('post')}
                >
                    <FileText size={16} />
                    <span>내 게시글</span>
                    <Badge
                        bg={activeTab === 'post' ? '#6338A9' : 'var(--waba-surface)'}
                        color={activeTab === 'post' ? 'white' : 'var(--waba-ink-3)'}
                        rounded="full"
                        px={2}
                        fontSize="11px"
                    >
                        {selectedPetId ? displayedPostList.length : (postCount ?? postList.length)}
                    </Badge>
                </Box>

                <Box
                    as="button"
                    py={3}
                    borderBottom="2px solid"
                    borderColor={activeTab === 'bookmark' ? '#6338A9' : 'transparent'}
                    color={activeTab === 'bookmark' ? 'var(--waba-ink)' : 'var(--waba-ink-3)'}
                    fontWeight={activeTab === 'bookmark' ? '700' : '500'}
                    fontSize="15px"
                    display="flex"
                    alignItems="center"
                    gap={2}
                    transition="all 0.2s"
                    onClick={() => onTabChange('bookmark')}
                >
                    <Bookmark size={16} />
                    <span>스크랩한 공간</span>
                    <Badge
                        bg={activeTab === 'bookmark' ? '#6338A9' : 'var(--waba-surface)'}
                        color={activeTab === 'bookmark' ? 'white' : 'var(--waba-ink-3)'}
                        rounded="full"
                        px={2}
                        fontSize="11px"
                    >
                        {bookmarkCount ?? bookmarkList.length}
                    </Badge>
                </Box>

                <Box
                    as="button"
                    py={3}
                    borderBottom="2px solid"
                    borderColor={activeTab === 'like' ? '#6338A9' : 'transparent'}
                    color={activeTab === 'like' ? 'var(--waba-ink)' : 'var(--waba-ink-3)'}
                    fontWeight={activeTab === 'like' ? '700' : '500'}
                    fontSize="15px"
                    display="flex"
                    alignItems="center"
                    gap={2}
                    transition="all 0.2s"
                    onClick={() => onTabChange('like')}
                >
                    <Heart size={16} />
                    <span>좋아요한 글</span>
                    <Badge
                        bg={activeTab === 'like' ? '#6338A9' : 'var(--waba-surface)'}
                        color={activeTab === 'like' ? 'white' : 'var(--waba-ink-3)'}
                        rounded="full"
                        px={2}
                        fontSize="11px"
                    >
                        {likeCount ?? likeList.length}
                    </Badge>
                </Box>

                <Box
                    as="button"
                    py={3}
                    borderBottom="2px solid"
                    borderColor={activeTab === 'draft' ? '#6338A9' : 'transparent'}
                    color={activeTab === 'draft' ? 'var(--waba-ink)' : 'var(--waba-ink-3)'}
                    fontWeight={activeTab === 'draft' ? '700' : '500'}
                    fontSize="15px"
                    display="flex"
                    alignItems="center"
                    gap={2}
                    transition="all 0.2s"
                    onClick={() => onTabChange('draft')}
                >
                    <Edit3 size={16} />
                    <span>임시저장</span>
                    {(draftCount ?? draftList.length) > 0 && (
                        <Badge
                            bg={activeTab === 'draft' ? '#6338A9' : 'var(--waba-surface)'}
                            color={activeTab === 'draft' ? 'white' : 'var(--waba-ink-3)'}
                            rounded="full"
                            px={2}
                            fontSize="11px"
                        >
                            {draftCount ?? draftList.length}
                        </Badge>
                    )}
                </Box>
                {reportedDeletedPosts.length > 0 && (
                    <Box
                        as="button"
                        py={3}
                        borderBottom="2px solid"
                        borderColor={activeTab === 'appeal' ? '#6338A9' : 'transparent'}
                        color={activeTab === 'appeal' ? 'var(--waba-ink)' : 'var(--waba-ink-3)'}
                        fontWeight={activeTab === 'appeal' ? '700' : '500'}
                        fontSize="15px"
                        display="flex"
                        alignItems="center"
                        gap={2}
                        transition="all 0.2s"
                        flexShrink={0}
                        onClick={() => onTabChange('appeal')}
                    >
                        <span>신고 삭제 / 이의제기</span>
                        <Badge
                            bg="#EF4444"
                            color="white"
                            rounded="full"
                            px={2}
                            fontSize="11px"
                        >
                            {reportedDeletedPosts.length}
                        </Badge>
                    </Box>
                )}
            </HStack>

            {/* 탭 콘텐츠 영역 */}
            <Box pt={6}>
                {/* [탭 1: 내 게시글] */}
                {activeTab === 'post' && (
                    <Box>
                        {/* 1. 펫별 퀵 필터 칩 바 (반려동물이 1마리 이상일 때 노출) */}
                        {pets.length > 0 && (
                            <Flex align="center" gap={2} mb={5} overflowX="auto" pb={1}>
                                <Text fontSize="12px" fontWeight="700" color="var(--waba-ink-3)" mr={1} flexShrink={0}>
                                    가족별 모아보기
                                </Text>
                                {/* 전체 칩 */}
                                <Box
                                    as="button"
                                    onClick={() => onSelectPetId?.(null)}
                                    px={3.5}
                                    py={1.5}
                                    borderRadius="full"
                                    fontSize="12px"
                                    fontWeight={!selectedPetId ? '700' : '600'}
                                    bg={!selectedPetId ? '#6338A9' : 'var(--waba-card)'}
                                    color={!selectedPetId ? 'white' : 'var(--waba-ink)'}
                                    border="1px solid"
                                    borderColor={!selectedPetId ? '#6338A9' : 'var(--waba-line)'}
                                    _hover={{ opacity: 0.9 }}
                                    transition="all 0.15s"
                                    flexShrink={0}
                                >
                                    전체 ({postList.length})
                                </Box>

                                {/* 각 펫별 칩 */}
                                {pets.map((pet) => {
                                    const active = String(selectedPetId) === String(pet.id);
                                    const count = postList.filter((p) =>
                                        p.post_pets?.some((pt) => String(pt.pet_id) === String(pet.id)) ||
                                        p.product_pins?.some((pin) => pin.pin_type === 'PET' && String(pin.pet_id) === String(pet.id))
                                    ).length;

                                    return (
                                        <Box
                                            key={pet.id}
                                            as="button"
                                            onClick={() => onSelectPetId?.(active ? null : pet.id)}
                                            px={3.5}
                                            py={1.5}
                                            borderRadius="full"
                                            fontSize="12px"
                                            fontWeight={active ? '700' : '600'}
                                            bg={active ? '#6338A9' : 'var(--waba-card)'}
                                            color={active ? 'white' : 'var(--waba-ink)'}
                                            border="1px solid"
                                            borderColor={active ? '#6338A9' : 'var(--waba-line)'}
                                            boxShadow={active ? '0 2px 8px rgba(123, 92, 250, 0.25)' : 'none'}
                                            _hover={{ opacity: 0.95 }}
                                            transition="all 0.15s"
                                            flexShrink={0}
                                        >
                                            {pet.name} ({count})
                                        </Box>
                                    );
                                })}

                                {/* 미분류 칩 */}
                                <Box
                                    as="button"
                                    onClick={() => onSelectPetId?.(isUnassignedSelected ? null : 'unassigned')}
                                    px={3.5}
                                    py={1.5}
                                    borderRadius="full"
                                    fontSize="12px"
                                    fontWeight={isUnassignedSelected ? '700' : '600'}
                                    bg={isUnassignedSelected ? '#6338A9' : 'var(--waba-card)'}
                                    color={isUnassignedSelected ? 'white' : 'var(--waba-ink)'}
                                    border="1px solid"
                                    borderColor={isUnassignedSelected ? '#6338A9' : 'var(--waba-line)'}
                                    boxShadow={isUnassignedSelected ? '0 2px 8px rgba(26, 28, 30, 0.2)' : 'none'}
                                    _hover={{ opacity: 0.95 }}
                                    transition="all 0.15s"
                                    flexShrink={0}
                                >
                                    미분류 ({unassignedCount})
                                </Box>
                            </Flex>
                        )}

                        {/* 2-A. 선택된 펫 하이라이트 미니 배너 */}
                        {selectedPet && (
                            <Box
                                mb={6}
                                p={{ base: 4, md: 5 }}
                                borderRadius="24px"
                                bg="var(--waba-purple-soft)"
                                border="1px solid"
                                borderColor="rgba(123, 92, 250, 0.25)"
                                boxShadow="0 4px 20px -2px rgba(123, 92, 250, 0.08)"
                            >
                                <Flex direction={{ base: 'column', sm: 'row' }} justify="space-between" align={{ base: 'flex-start', sm: 'center' }} gap={3}>
                                    <HStack gap={3.5}>
                                        <Avatar.Root
                                            size="lg"
                                            borderRadius="full"
                                            border="2px solid"
                                            borderColor="var(--waba-purple-text)"
                                            boxShadow="0 4px 12px rgba(123, 92, 250, 0.2)"
                                        >
                                            {selectedPet.current_avatar_url ? (
                                                <Avatar.Image src={selectedPet.current_avatar_url} alt={selectedPet.name} />
                                            ) : (
                                                <Avatar.Fallback bg="var(--waba-surface)" color="var(--waba-ink-3)">
                                                    <LuDog size={24} />
                                                </Avatar.Fallback>
                                            )}
                                        </Avatar.Root>
                                        <Box>
                                            <HStack gap={2} mb={0.5}>
                                                <Heading fontSize="17px" fontWeight="800" color="var(--waba-ink)">
                                                    {selectedPet.name}의 공간 &amp; 라이프 아카이브
                                                </Heading>
                                                {selectedPet.breed && (
                                                    <Badge bg="var(--waba-card)" color="var(--waba-purple-text)" border="1px solid" borderColor="var(--waba-purple-soft)" rounded="full" px={2} fontSize="11px" fontWeight="700">
                                                        {selectedPet.breed}
                                                    </Badge>
                                                )}
                                            </HStack>
                                            <HStack gap={2} fontSize="12px" color="var(--waba-ink-3)" flexWrap="wrap">
                                                {calculateAge(selectedPet.birth_date) && (
                                                    <Text>
                                                        {calculateAge(selectedPet.birth_date)}
                                                        {selectedPet.is_birth_estimated ? ' (추정)' : ''}
                                                    </Text>
                                                )}
                                                {selectedPet.gender && (
                                                    <Text>· {selectedPet.gender === 'FEMALE' ? '여아' : selectedPet.gender === 'MALE' ? '남아' : ''}</Text>
                                                )}
                                                {selectedPet.latest_weight_kg && (
                                                    <Text>· {Number(selectedPet.latest_weight_kg).toFixed(1)}kg</Text>
                                                )}
                                                <Text color="var(--waba-purple-text)" fontWeight="700">
                                                    · 함께한 공간 이야기 {displayedPostList.length}개
                                                </Text>
                                            </HStack>
                                        </Box>
                                    </HStack>

                                    <Button
                                        size="xs"
                                        variant="ghost"
                                        color="var(--waba-ink-3)"
                                        _hover={{ color: 'var(--waba-ink)', bg: 'var(--waba-card)' }}
                                        rounded="full"
                                        onClick={() => onSelectPetId?.(null)}
                                        fontWeight="700"
                                    >
                                        전체 보기로 돌아가기
                                        <X size={13} style={{ marginLeft: '4px' }} />
                                    </Button>
                                </Flex>
                            </Box>
                        )}

                        {/* 2-B. '미분류' 선택 시 하이라이트 배너 */}
                        {isUnassignedSelected && (
                            <Box
                                mb={6}
                                p={{ base: 4, md: 5 }}
                                borderRadius="24px"
                                bg="gradient-to-r"
                                bgGradient="linear(to-r, #F4F4F6, #FAFAFC, white)"
                                border="1px solid"
                                borderColor="var(--waba-line)"
                                boxShadow="0 4px 20px -2px rgba(26, 26, 30, 0.05)"
                            >
                                <Flex direction={{ base: 'column', sm: 'row' }} justify="space-between" align={{ base: 'flex-start', sm: 'center' }} gap={3}>
                                    <HStack gap={3.5}>
                                        <Box
                                            w="48px"
                                            h="48px"
                                            borderRadius="full"
                                            bg="var(--waba-surface)"
                                            display="flex"
                                            alignItems="center"
                                            justifyContent="center"
                                            fontSize="22px"
                                            border="1px solid"
                                            borderColor="var(--waba-line)"
                                        >
                                            🏠
                                        </Box>
                                        <Box>
                                            <HStack gap={2} mb={0.5}>
                                                <Heading fontSize="17px" fontWeight="800" color="var(--waba-ink)">
                                                    반려동물 미지정 이야기
                                                </Heading>
                                                <Badge bg="var(--waba-card)" color="var(--waba-ink-3)" border="1px solid" borderColor="var(--waba-line)" rounded="full" px={2} fontSize="11px" fontWeight="700">
                                                    미분류
                                                </Badge>
                                            </HStack>
                                            <Text fontSize="12px" color="var(--waba-ink-3)">
                                                특정 반려동물이 태그되지 않은 인테리어 꿀팁이나 일상 기록입니다. ({displayedPostList.length}개)
                                            </Text>
                                        </Box>
                                    </HStack>

                                    <Button
                                        size="xs"
                                        variant="ghost"
                                        color="var(--waba-ink-3)"
                                        _hover={{ color: 'var(--waba-ink)', bg: 'var(--waba-card)' }}
                                        rounded="full"
                                        onClick={() => onSelectPetId?.(null)}
                                        fontWeight="700"
                                    >
                                        전체 보기로 돌아가기
                                        <X size={13} style={{ marginLeft: '4px' }} />
                                    </Button>
                                </Flex>
                            </Box>
                        )}

                        {/* 3. 게시글 리스트 렌더링 */}
                        {displayedPostList.length > 0 ? (
                            <BoardEqualGridCard postList={displayedPostList} />
                        ) : isUnassignedSelected ? (
                            /* 미분류 글이 없을 때의 Empty State */
                            <VStack py={14} gap={4} textAlign="center" bg="var(--waba-card)" borderRadius="24px" border="1px solid" borderColor="var(--waba-line)" p={8}>
                                <Text fontSize="42px">🏠</Text>
                                <Heading fontSize="18px" fontWeight="700" color="var(--waba-ink)">
                                    미분류된 게시글이 없습니다
                                </Heading>
                                <Text fontSize="13px" color="var(--waba-ink-3)" maxW="400px" lineHeight="1.6">
                                    모든 게시글에 반려동물이 등록되어 있습니다.
                                </Text>
                            </VStack>
                        ) : selectedPet ? (
                            /* 선택된 펫의 게시글이 0개일 때의 Empty State */
                            <VStack py={14} gap={4} textAlign="center" bg="var(--waba-card)" borderRadius="24px" border="1px solid" borderColor="var(--waba-line)" p={8}>
                                <Text fontSize="42px">🐾</Text>
                                <Heading fontSize="18px" fontWeight="700" color="var(--waba-ink)">
                                    아직 {selectedPet.name}가 태그된 공간 사진이 없어요
                                </Heading>
                                <Text fontSize="13px" color="var(--waba-ink-3)" maxW="400px" lineHeight="1.6">
                                    사진을 올릴 때 함께하는 반려동물로 &apos;{selectedPet.name}&apos;를 선택해보세요!<br />
                                    소중한 공간 이야기와 성장 앨범이 차곡차곡 기록됩니다.
                                </Text>
                                <Button
                                    bg="#6338A9"
                                    color="white"
                                    rounded="full"
                                    px={6}
                                    fontWeight="700"
                                    _hover={{ bg: 'purple.600' }}
                                    onClick={() => router.push('/post/register')}
                                    mt={2}
                                >
                                    <Plus size={16} style={{ marginRight: '4px' }} />
                                    {selectedPet.name}와 함께한 첫 공간 올리기
                                </Button>
                            </VStack>
                        ) : (
                            <VStack py={16} gap={4} textAlign="center">
                                <Text fontSize="42px">📝</Text>
                                <Heading fontSize="18px" fontWeight="700" color="var(--waba-ink)">
                                    아직 작성한 게시글이 없습니다
                                </Heading>
                                <Text fontSize="14px" color="var(--waba-ink-3)" maxW="380px">
                                    우리 아이들과 함께하는 감각적인 인테리어와 일상을 WABA에 기록해 보세요.
                                </Text>
                                <Button
                                    bg="#6338A9"
                                    color="white"
                                    rounded="full"
                                    px={6}
                                    fontWeight="600"
                                    onClick={() => router.push('/post/register')}
                                >
                                    첫 이야기 작성하기
                                </Button>
                            </VStack>
                        )}
                    </Box>
                )}

                {/* [탭 2: 스크랩한 공간] */}
                {activeTab === 'bookmark' && (
                    bookmarkList.length > 0 ? (
                        <BoardEqualGridCard postList={bookmarkList} />
                    ) : (
                        <VStack py={16} gap={4} textAlign="center">
                            <Text fontSize="42px">📌</Text>
                            <Heading fontSize="18px" fontWeight="700" color="var(--waba-ink)">
                                스크랩한 공간이 없습니다
                            </Heading>
                            <Text fontSize="14px" color="var(--waba-ink-3)" maxW="380px">
                                둘러보다 마음에 드는 룩북이나 유용한 팁이 있다면 북마크 아이콘을 눌러 저장해 보세요.
                            </Text>
                            <Button
                                variant="outline"
                                rounded="full"
                                px={6}
                                fontWeight="600"
                                color="var(--waba-ink)"
                                borderColor="var(--waba-line)"
                                bg="var(--waba-card)"
                                _hover={{ bg: 'var(--waba-surface)', borderColor: 'var(--waba-purple-border)' }}
                                onClick={() => router.push('/board/LOOKBOOK')}
                            >
                                공식 룩북 둘러보기
                            </Button>
                        </VStack>
                    )
                )}

                {/* [탭 3: 좋아요한 글] */}
                {activeTab === 'like' && (
                    likeList.length > 0 ? (
                        <BoardEqualGridCard postList={likeList} />
                    ) : (
                        <VStack py={16} gap={4} textAlign="center">
                            <Text fontSize="42px">❤️</Text>
                            <Heading fontSize="18px" fontWeight="700" color="var(--waba-ink)">
                                좋아요한 게시글이 없습니다
                            </Heading>
                            <Text fontSize="14px" color="var(--waba-ink-3)" maxW="380px">
                                사랑스러운 다른 집사들의 피드에 응원의 하트를 눌러보세요.
                            </Text>
                            <Button
                                variant="outline"
                                rounded="full"
                                px={6}
                                fontWeight="600"
                                color="var(--waba-ink)"
                                borderColor="var(--waba-line)"
                                bg="var(--waba-card)"
                                _hover={{ bg: 'var(--waba-surface)', borderColor: 'var(--waba-purple-border)' }}
                                onClick={() => router.push('/board/SNAP')}
                            >
                                일상 스냅 피드 둘러보기
                            </Button>
                        </VStack>
                    )
                )}

                {/* [탭 4: 임시저장 글] */}
                {activeTab === 'draft' && (
                    <VStack align="stretch" gap={3}>
                        <Box
                            p={3.5}
                            borderRadius="14px"
                            bg="var(--waba-purple-soft)"
                            border="1px solid"
                            borderColor="var(--waba-purple-border)"
                        >
                            <Text fontSize="12px" fontWeight="600" color="var(--waba-purple-text)">
                                임시저장 글은 마지막 저장일로부터 30일간 보관되며, 다시 수정·저장하면 30일이 자동 연장됩니다.
                            </Text>
                        </Box>
                        {draftList.length > 0 ? (
                        <VStack align="stretch" gap={3}>
                            {draftList.map((draft) => {
                                const draftId = String(draft.id || draft.postId || '');
                                return (
                                <Box
                                    key={draftId || draft.title}
                                    p={5}
                                    bg="var(--waba-card)"
                                    borderRadius="16px"
                                    border="1px solid"
                                    borderColor="var(--waba-line)"
                                    transition="all 0.2s"
                                    _hover={{ borderColor: '#6338A9', boxShadow: 'sm' }}
                                >
                                    <Flex justify="space-between" align="center">
                                        <Box
                                            cursor="pointer"
                                            flex={1}
                                            onClick={() => {
                                                if (draftId) router.push(`/post/register?draft=${encodeURIComponent(draftId)}`);
                                            }}
                                        >
                                            <Heading fontSize="16px" fontWeight="700" color="var(--waba-ink)" mb={1}>
                                                {draft.title || '제목 없음'}
                                            </Heading>
                                            <HStack gap={2} flexWrap="wrap">
                                                <Text fontSize="12px" color="var(--waba-ink-3)">
                                                    {formatDate(draft.updated_at || draft.updatedAt || draft.created_at || draft.createdAt || '')} 에 저장됨
                                                </Text>
                                                {(() => {
                                                    const rawBase = draft.updated_at || draft.updatedAt || draft.created_at || draft.createdAt;
                                                    const expDate = draft.expires_at
                                                        ? new Date(draft.expires_at)
                                                        : new Date((rawBase ? new Date(rawBase).getTime() : Date.now()) + 30 * 24 * 60 * 60 * 1000);
                                                    const dDay = typeof draft.days_remaining === 'number'
                                                        ? draft.days_remaining
                                                        : Math.max(0, Math.ceil((expDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000)));
                                                    return (
                                                        <Box
                                                            bg={dDay <= 5 ? 'rgba(239, 68, 68, 0.12)' : 'var(--waba-surface)'}
                                                            color={dDay <= 5 ? '#EF4444' : 'var(--waba-ink-2)'}
                                                            fontSize="11px"
                                                            fontWeight="700"
                                                            px={2}
                                                            py={0.5}
                                                            borderRadius="999px"
                                                        >
                                                            {formatDate(expDate.toISOString())} 자동 삭제 예정 (D-{dDay})
                                                        </Box>
                                                    );
                                                })()}
                                            </HStack>
                                        </Box>
                                        <IconButton
                                            aria-label="임시저장 삭제"
                                            variant="ghost"
                                            size="sm"
                                            color="var(--waba-ink-3)"
                                            _hover={{ color: 'red.500', bg: 'rgba(239, 68, 68, 0.12)' }}
                                            onClick={() => {
                                                if (draftId) onDeleteDraft(draftId);
                                            }}
                                        >
                                            <Trash2 size={16} />
                                        </IconButton>
                                    </Flex>
                                </Box>
                                );
                            })}
                        </VStack>
                    ) : (
                        <VStack py={16} gap={4} textAlign="center">
                            <Text fontSize="42px">📄</Text>
                            <Heading fontSize="18px" fontWeight="700" color="var(--waba-ink)">
                                보관 중인 임시저장 글이 없습니다
                            </Heading>
                            <Text fontSize="14px" color="var(--waba-ink-3)" maxW="380px">
                                작성 중에 저장해둔 글이 있다면 여기에 보관됩니다.
                            </Text>
                        </VStack>
                    )}
                    </VStack>
                )}
                {/* [탭 5: 신고 삭제 / 이의제기] */}
                {activeTab === 'appeal' && (
                    <VStack align="stretch" gap={3}>
                        {reportedDeletedPosts.map((post) => {
                            const isDeleted = post.status === 'DELETED';
                            const isRestored = post.status === 'PUBLISHED';
                            const purgeDate = post.purge_scheduled_at ? new Date(post.purge_scheduled_at) : null;
                            const dDay = purgeDate
                                ? Math.max(0, Math.ceil((purgeDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000)))
                                : null;
                            const isFormOpen = appealPostId === String(post.id);

                            return (
                                <Box
                                    key={post.id}
                                    p={5}
                                    bg="var(--waba-card)"
                                    borderRadius="16px"
                                    border="1px solid"
                                    borderColor="var(--waba-line)"
                                >
                                    <HStack gap={2} mb={1.5} flexWrap="wrap">
                                        {post.board_name && (
                                            <Badge bg="var(--waba-purple-soft)" color="var(--waba-purple-text)" rounded="full" px={2.5} py={0.5} fontSize="10.5px">
                                                {post.board_name}
                                            </Badge>
                                        )}
                                        {isRestored ? (
                                            <Badge bg="rgba(16, 185, 129, 0.12)" color="#10B981" rounded="full" px={2.5} py={0.5} fontSize="10.5px">
                                                복구 완료 (게시 중)
                                            </Badge>
                                        ) : (
                                            <Badge bg="rgba(239, 68, 68, 0.12)" color="#EF4444" rounded="full" px={2.5} py={0.5} fontSize="10.5px">
                                                신고 삭제됨
                                            </Badge>
                                        )}
                                        {post.appeal_status === 'PENDING' && (
                                            <Badge bg="rgba(245, 158, 11, 0.14)" color="#D97706" rounded="full" px={2.5} py={0.5} fontSize="10.5px">
                                                심사 중
                                            </Badge>
                                        )}
                                        {post.appeal_status === 'APPROVED' && (
                                            <Badge bg="rgba(16, 185, 129, 0.12)" color="#10B981" rounded="full" px={2.5} py={0.5} fontSize="10.5px">
                                                복구 승인
                                            </Badge>
                                        )}
                                        {post.appeal_status === 'REJECTED' && (
                                            <Badge bg="rgba(239, 68, 68, 0.12)" color="#EF4444" rounded="full" px={2.5} py={0.5} fontSize="10.5px">
                                                기각
                                            </Badge>
                                        )}
                                        {Number(post.extended_by_appeal) === 1 && (
                                            <Badge bg="var(--waba-purple-soft)" color="var(--waba-purple-text)" rounded="full" px={2.5} py={0.5} fontSize="10.5px">
                                                +10일 자동 연장 적용됨
                                            </Badge>
                                        )}
                                    </HStack>

                                    <Flex justify="space-between" align="center" gap={2} mb={1}>
                                        <Heading
                                            fontSize="15px"
                                            fontWeight="700"
                                            color="var(--waba-ink)"
                                            cursor={isRestored ? 'pointer' : undefined}
                                            _hover={isRestored ? { textDecoration: 'underline' } : undefined}
                                            onClick={() => {
                                                if (isRestored) router.push(`/post/${post.id}`);
                                            }}
                                        >
                                            {post.title || '(제목 없음)'}
                                        </Heading>
                                        {isRestored && (
                                            <Button
                                                size="2xs"
                                                variant="outline"
                                                borderColor="var(--waba-line)"
                                                color="var(--waba-purple-text)"
                                                borderRadius="999px"
                                                px={2.5}
                                                onClick={() => router.push(`/post/${post.id}`)}
                                            >
                                                게시글 보기
                                            </Button>
                                        )}
                                    </Flex>
                                    {!isRestored && (
                                        <Text fontSize="12px" color="var(--waba-ink-3)" mb={1}>
                                            삭제일: {post.deleted_at ? formatDate(post.deleted_at) : '-'}
                                            {purgeDate ? ` · 영구 삭제 예정일: ${formatDate(post.purge_scheduled_at)} (D-${dDay})` : ''}
                                        </Text>
                                    )}
                                    {post.delete_reason && (
                                        <Text fontSize="12px" color="var(--waba-ink-2)" mb={2}>
                                            삭제 사유: {post.delete_reason}
                                        </Text>
                                    )}

                                    {(() => {
                                        const appealsList: any[] =
                                            Array.isArray(post.appeals) && post.appeals.length > 0
                                                ? post.appeals
                                                : post.appeal_status
                                                    ? [
                                                          {
                                                              id: 'legacy',
                                                              attempt_no: 1,
                                                              status: post.appeal_status,
                                                              reason: post.appeal_reason,
                                                              extended_by_appeal: post.extended_by_appeal,
                                                              admin_note: post.admin_note,
                                                          },
                                                      ]
                                                    : [];
                                        const hasExtendedBefore = appealsList.some((a) => Number(a.extended_by_appeal) === 1);
                                        const canReappeal = isDeleted && post.appeal_status !== 'PENDING' && !Boolean(post.appeal_blocked);

                                        return (
                                            <>
                                                {appealsList.length > 0 && (
                                                    <VStack align="stretch" gap={2} mt={2}>
                                                        {appealsList.map((ap, idx) => (
                                                            <Box
                                                                key={ap.id || idx}
                                                                p={3}
                                                                borderRadius="12px"
                                                                bg="var(--waba-surface)"
                                                                border="1px solid"
                                                                borderColor="var(--waba-line)"
                                                            >
                                                                <HStack gap={1.5} mb={1} flexWrap="wrap">
                                                                    <Badge bg="var(--waba-card)" border="1px solid" borderColor="var(--waba-line)" color="var(--waba-ink)" rounded="full" px={2} fontSize="10px">
                                                                        {ap.attempt_no || idx + 1}차
                                                                    </Badge>
                                                                    <Badge
                                                                        bg={
                                                                            ap.status === 'APPROVED'
                                                                                ? 'rgba(16, 185, 129, 0.12)'
                                                                                : ap.status === 'REJECTED'
                                                                                    ? 'rgba(239, 68, 68, 0.12)'
                                                                                    : 'rgba(245, 158, 11, 0.14)'
                                                                        }
                                                                        color={
                                                                            ap.status === 'APPROVED'
                                                                                ? '#10B981'
                                                                                : ap.status === 'REJECTED'
                                                                                    ? '#EF4444'
                                                                                    : '#D97706'
                                                                        }
                                                                        rounded="full"
                                                                        px={2}
                                                                        fontSize="10px"
                                                                    >
                                                                        {ap.status === 'APPROVED' ? '복구 승인' : ap.status === 'REJECTED' ? '반려됨' : '심사 중'}
                                                                    </Badge>
                                                                    {Number(ap.extended_by_appeal) === 1 && (
                                                                        <Badge bg="var(--waba-purple-soft)" color="var(--waba-purple-text)" rounded="full" px={2} fontSize="10px">
                                                                            +10일 자동 연장
                                                                        </Badge>
                                                                    )}
                                                                </HStack>
                                                                <Text fontSize="12px" color="var(--waba-ink-2)">
                                                                    {ap.reason}
                                                                </Text>
                                                                {ap.status === 'APPROVED' && (
                                                                    <Box mt={1.5} p={2.5} borderRadius="10px" bg="rgba(16, 185, 129, 0.1)" border="1px solid" borderColor="rgba(16, 185, 129, 0.25)">
                                                                        <Text fontSize="11.5px" color="#10B981" fontWeight="600">
                                                                            {ap.user_notice || '승인되어 게시글이 다시 오픈되었습니다. 다만 추가로 신고가 있을 시 다시 삭제될 수 있는 점 유의 바랍니다.'}
                                                                        </Text>
                                                                    </Box>
                                                                )}
                                                                {ap.status === 'REJECTED' && ap.admin_note && (
                                                                    <Text fontSize="11.5px" color="#EF4444" mt={1.5} fontWeight="600">
                                                                        관리자 반려 답변: {ap.admin_note}
                                                                    </Text>
                                                                )}
                                                            </Box>
                                                        ))}
                                                    </VStack>
                                                )}

                                                {Boolean(post.appeal_blocked) ? (
                                                    <Box mt={2.5} p={3} borderRadius="12px" bg="rgba(239, 68, 68, 0.1)" border="1px solid" borderColor="rgba(239, 68, 68, 0.3)">
                                                        <Text fontSize="12px" fontWeight="600" color="#EF4444">
                                                            관리자 반려 처리 시 재이의 제한이 적용되어 해당 게시글에 대한 추가 이의 제기가 불가합니다.
                                                        </Text>
                                                    </Box>
                                                ) : canReappeal ? (
                                                    isFormOpen ? (
                                                        <VStack align="stretch" gap={2} mt={3} p={3} borderRadius="12px" bg="var(--waba-surface)" border="1px solid" borderColor="var(--waba-line)">
                                                            {!hasExtendedBefore && (
                                                                <Text fontSize="11.5px" color="var(--waba-purple-text)" fontWeight="600">
                                                                    영구 삭제 예정일이 10일 미만으로 남은 경우 이의 제기 접수 시 삭제 예정일이 자동으로 +10일 연장됩니다.
                                                                </Text>
                                                            )}
                                                            <Textarea
                                                                value={appealReason}
                                                                onChange={(e) => setAppealReason(e.target.value)}
                                                                placeholder="이의 제기 사유를 상세히 입력해 주세요..."
                                                                rows={3}
                                                                bg="var(--waba-card)"
                                                                border="1px solid"
                                                                borderColor="var(--waba-line)"
                                                                color="var(--waba-ink)"
                                                                fontSize="12.5px"
                                                            />
                                                            <HStack justify="flex-end" gap={2}>
                                                                <Button
                                                                    size="xs"
                                                                    variant="outline"
                                                                    borderColor="var(--waba-line)"
                                                                    color="var(--waba-ink)"
                                                                    onClick={() => {
                                                                        setAppealPostId(null);
                                                                        setAppealReason('');
                                                                    }}
                                                                >
                                                                    취소
                                                                </Button>
                                                                <Button
                                                                    size="xs"
                                                                    bg="#6338A9"
                                                                    color="#FFFFFF"
                                                                    _hover={{ bg: '#522B8F' }}
                                                                    loading={isSubmittingAppeal}
                                                                    disabled={!appealReason.trim()}
                                                                    onClick={async () => {
                                                                        if (!onSubmitAppeal || !appealReason.trim()) return;
                                                                        setIsSubmittingAppeal(true);
                                                                        try {
                                                                            await onSubmitAppeal(String(post.id), appealReason.trim());
                                                                            setAppealPostId(null);
                                                                            setAppealReason('');
                                                                        } finally {
                                                                            setIsSubmittingAppeal(false);
                                                                        }
                                                                    }}
                                                                >
                                                                    이의 제기 제출
                                                                </Button>
                                                            </HStack>
                                                        </VStack>
                                                    ) : (
                                                        <Flex justify="flex-end" mt={2}>
                                                            <Button
                                                                size="xs"
                                                                bg="#6338A9"
                                                                color="#FFFFFF"
                                                                _hover={{ bg: '#522B8F' }}
                                                                borderRadius="999px"
                                                                px={3.5}
                                                                onClick={() => {
                                                                    setAppealPostId(String(post.id));
                                                                    setAppealReason('');
                                                                }}
                                                            >
                                                                {appealsList.length > 0
                                                                    ? `다시 이의 제기하기 (${appealsList.length + 1}회차)`
                                                                    : '이의 제기하기'}
                                                            </Button>
                                                        </Flex>
                                                    )
                                                ) : null}
                                            </>
                                        );
                                    })()}
                                </Box>
                            );
                        })}
                    </VStack>
                )}
            </Box>
        </Box>
    );
}
