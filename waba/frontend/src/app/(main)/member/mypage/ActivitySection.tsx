'use client'

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
    Text,
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
import PostMasonryList from "../../board/[id]/PostMasonryList";

interface ActivitySectionProps {
    activeTab: 'post' | 'bookmark' | 'like' | 'draft';
    onTabChange: (tab: 'post' | 'bookmark' | 'like' | 'draft') => void;
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
}: ActivitySectionProps) {
    const router = useRouter();

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
                borderColor="waba.border"
                gap={6}
                overflowX="auto"
                pb="2px"
            >
                <Box
                    as="button"
                    py={3}
                    borderBottom="2px solid"
                    borderColor={activeTab === 'post' ? 'waba.purple' : 'transparent'}
                    color={activeTab === 'post' ? 'waba.charcoal' : 'waba.faint'}
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
                        bg={activeTab === 'post' ? 'waba.purple' : 'waba.subtle'}
                        color={activeTab === 'post' ? 'white' : 'waba.faint'}
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
                    borderColor={activeTab === 'bookmark' ? 'waba.purple' : 'transparent'}
                    color={activeTab === 'bookmark' ? 'waba.charcoal' : 'waba.faint'}
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
                        bg={activeTab === 'bookmark' ? 'waba.purple' : 'waba.subtle'}
                        color={activeTab === 'bookmark' ? 'white' : 'waba.faint'}
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
                    borderColor={activeTab === 'like' ? 'waba.purple' : 'transparent'}
                    color={activeTab === 'like' ? 'waba.charcoal' : 'waba.faint'}
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
                        bg={activeTab === 'like' ? 'waba.purple' : 'waba.subtle'}
                        color={activeTab === 'like' ? 'white' : 'waba.faint'}
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
                    borderColor={activeTab === 'draft' ? 'waba.purple' : 'transparent'}
                    color={activeTab === 'draft' ? 'waba.charcoal' : 'waba.faint'}
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
                            bg={activeTab === 'draft' ? 'waba.purple' : 'waba.subtle'}
                            color={activeTab === 'draft' ? 'white' : 'waba.faint'}
                            rounded="full"
                            px={2}
                            fontSize="11px"
                        >
                            {draftCount ?? draftList.length}
                        </Badge>
                    )}
                </Box>
            </HStack>

            {/* 탭 콘텐츠 영역 */}
            <Box pt={6}>
                {/* [탭 1: 내 게시글] */}
                {activeTab === 'post' && (
                    <Box>
                        {/* 1. 펫별 퀵 필터 칩 바 (반려동물이 1마리 이상일 때 노출) */}
                        {pets.length > 0 && (
                            <Flex align="center" gap={2} mb={5} overflowX="auto" pb={1}>
                                <Text fontSize="12px" fontWeight="700" color="waba.muted" mr={1} flexShrink={0}>
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
                                    bg={!selectedPetId ? 'waba.charcoal' : 'white'}
                                    color={!selectedPetId ? 'white' : 'waba.charcoal'}
                                    border="1px solid"
                                    borderColor={!selectedPetId ? 'waba.charcoal' : 'waba.border'}
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
                                            bg={active ? 'waba.purple' : 'white'}
                                            color={active ? 'white' : 'waba.charcoal'}
                                            border="1px solid"
                                            borderColor={active ? 'waba.purple' : 'waba.border'}
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
                                    bg={isUnassignedSelected ? 'waba.charcoal' : 'white'}
                                    color={isUnassignedSelected ? 'white' : 'waba.charcoal'}
                                    border="1px solid"
                                    borderColor={isUnassignedSelected ? 'waba.charcoal' : 'waba.border'}
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
                                bg="gradient-to-r"
                                bgGradient="linear(to-r, #F3EFFF, #F8F6FF, white)"
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
                                            borderColor="waba.purple"
                                            boxShadow="0 4px 12px rgba(123, 92, 250, 0.2)"
                                        >
                                            {selectedPet.current_avatar_url ? (
                                                <Avatar.Image src={selectedPet.current_avatar_url} alt={selectedPet.name} />
                                            ) : (
                                                <Text fontSize="24px">{getSpeciesEmoji(selectedPet.species)}</Text>
                                            )}
                                        </Avatar.Root>
                                        <Box>
                                            <HStack gap={2} mb={0.5}>
                                                <Heading fontSize="17px" fontWeight="800" color="waba.charcoal">
                                                    {selectedPet.name}의 공간 &amp; 라이프 아카이브
                                                </Heading>
                                                {selectedPet.breed && (
                                                    <Badge bg="white" color="waba.purple" border="1px solid" borderColor="waba.purpleLight" rounded="full" px={2} fontSize="11px" fontWeight="700">
                                                        {selectedPet.breed}
                                                    </Badge>
                                                )}
                                            </HStack>
                                            <HStack gap={2} fontSize="12px" color="waba.muted" flexWrap="wrap">
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
                                                <Text color="waba.purple" fontWeight="700">
                                                    · 함께한 공간 이야기 {displayedPostList.length}개
                                                </Text>
                                            </HStack>
                                        </Box>
                                    </HStack>

                                    <Button
                                        size="xs"
                                        variant="ghost"
                                        color="waba.muted"
                                        _hover={{ color: 'waba.charcoal', bg: 'white' }}
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
                                borderColor="waba.border"
                                boxShadow="0 4px 20px -2px rgba(26, 26, 30, 0.05)"
                            >
                                <Flex direction={{ base: 'column', sm: 'row' }} justify="space-between" align={{ base: 'flex-start', sm: 'center' }} gap={3}>
                                    <HStack gap={3.5}>
                                        <Box
                                            w="48px"
                                            h="48px"
                                            borderRadius="full"
                                            bg="waba.subtle"
                                            display="flex"
                                            alignItems="center"
                                            justifyContent="center"
                                            fontSize="22px"
                                            border="1px solid"
                                            borderColor="waba.border"
                                        >
                                            🏠
                                        </Box>
                                        <Box>
                                            <HStack gap={2} mb={0.5}>
                                                <Heading fontSize="17px" fontWeight="800" color="waba.charcoal">
                                                    반려동물 미지정 이야기
                                                </Heading>
                                                <Badge bg="white" color="waba.muted" border="1px solid" borderColor="waba.border" rounded="full" px={2} fontSize="11px" fontWeight="700">
                                                    미분류
                                                </Badge>
                                            </HStack>
                                            <Text fontSize="12px" color="waba.muted">
                                                특정 반려동물이 태그되지 않은 인테리어 꿀팁이나 일상 기록입니다. ({displayedPostList.length}개)
                                            </Text>
                                        </Box>
                                    </HStack>

                                    <Button
                                        size="xs"
                                        variant="ghost"
                                        color="waba.muted"
                                        _hover={{ color: 'waba.charcoal', bg: 'white' }}
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
                            <PostMasonryList postList={displayedPostList} />
                        ) : isUnassignedSelected ? (
                            /* 미분류 글이 없을 때의 Empty State */
                            <VStack py={14} gap={4} textAlign="center" bg="white" borderRadius="24px" border="1px solid" borderColor="waba.border" p={8}>
                                <Text fontSize="42px">🏠</Text>
                                <Heading fontSize="18px" fontWeight="700" color="waba.charcoal">
                                    미분류된 게시글이 없습니다
                                </Heading>
                                <Text fontSize="13px" color="waba.faint" maxW="400px" lineHeight="1.6">
                                    모든 게시글에 반려동물이 등록되어 있습니다.
                                </Text>
                            </VStack>
                        ) : selectedPet ? (
                            /* 선택된 펫의 게시글이 0개일 때의 Empty State */
                            <VStack py={14} gap={4} textAlign="center" bg="white" borderRadius="24px" border="1px solid" borderColor="waba.border" p={8}>
                                <Text fontSize="42px">🐾</Text>
                                <Heading fontSize="18px" fontWeight="700" color="waba.charcoal">
                                    아직 {selectedPet.name}가 태그된 공간 사진이 없어요
                                </Heading>
                                <Text fontSize="13px" color="waba.faint" maxW="400px" lineHeight="1.6">
                                    사진을 올릴 때 함께하는 반려동물로 &apos;{selectedPet.name}&apos;를 선택해보세요!<br />
                                    소중한 공간 이야기와 성장 앨범이 차곡차곡 기록됩니다.
                                </Text>
                                <Button
                                    bg="waba.purple"
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
                                <Heading fontSize="18px" fontWeight="700" color="waba.charcoal">
                                    아직 작성한 게시글이 없습니다
                                </Heading>
                                <Text fontSize="14px" color="waba.faint" maxW="380px">
                                    우리 아이들과 함께하는 감각적인 인테리어와 일상을 WABA에 기록해 보세요.
                                </Text>
                                <Button
                                    bg="waba.charcoal"
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
                        <PostMasonryList postList={bookmarkList} />
                    ) : (
                        <VStack py={16} gap={4} textAlign="center">
                            <Text fontSize="42px">📌</Text>
                            <Heading fontSize="18px" fontWeight="700" color="waba.charcoal">
                                스크랩한 공간이 없습니다
                            </Heading>
                            <Text fontSize="14px" color="waba.faint" maxW="380px">
                                둘러보다 마음에 드는 룩북이나 유용한 팁이 있다면 북마크 아이콘을 눌러 저장해 보세요.
                            </Text>
                            <Button
                                variant="outline"
                                rounded="full"
                                px={6}
                                fontWeight="600"
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
                        <PostMasonryList postList={likeList} />
                    ) : (
                        <VStack py={16} gap={4} textAlign="center">
                            <Text fontSize="42px">❤️</Text>
                            <Heading fontSize="18px" fontWeight="700" color="waba.charcoal">
                                좋아요한 게시글이 없습니다
                            </Heading>
                            <Text fontSize="14px" color="waba.faint" maxW="380px">
                                사랑스러운 다른 집사들의 피드에 응원의 하트를 눌러보세요.
                            </Text>
                            <Button
                                variant="outline"
                                rounded="full"
                                px={6}
                                fontWeight="600"
                                onClick={() => router.push('/board/SNAP')}
                            >
                                일상 스냅 피드 둘러보기
                            </Button>
                        </VStack>
                    )
                )}

                {/* [탭 4: 임시저장 글] */}
                {activeTab === 'draft' && (
                    draftList.length > 0 ? (
                        <VStack align="stretch" gap={3}>
                            {draftList.map((draft) => (
                                <Box
                                    key={draft.id}
                                    p={5}
                                    bg="white"
                                    borderRadius="16px"
                                    border="1px solid"
                                    borderColor="waba.border"
                                    transition="all 0.2s"
                                    _hover={{ borderColor: 'waba.purple', boxShadow: 'sm' }}
                                >
                                    <Flex justify="space-between" align="center">
                                        <Box
                                            cursor="pointer"
                                            flex={1}
                                            onClick={() => router.push(`/post/register?draft=${draft.id}`)}
                                        >
                                            <Heading fontSize="16px" fontWeight="700" color="waba.charcoal" mb={1}>
                                                {draft.title || '제목 없음'}
                                            </Heading>
                                            <Text fontSize="12px" color="waba.faint">
                                                {formatDate(draft.updated_at || draft.created_at)} 에 저장됨
                                            </Text>
                                        </Box>
                                        <IconButton
                                            aria-label="임시저장 삭제"
                                            variant="ghost"
                                            size="sm"
                                            color="waba.faint"
                                            _hover={{ color: 'red.500', bg: 'red.50' }}
                                            onClick={() => onDeleteDraft(draft.id)}
                                        >
                                            <Trash2 size={16} />
                                        </IconButton>
                                    </Flex>
                                </Box>
                            ))}
                        </VStack>
                    ) : (
                        <VStack py={16} gap={4} textAlign="center">
                            <Text fontSize="42px">📄</Text>
                            <Heading fontSize="18px" fontWeight="700" color="waba.charcoal">
                                보관 중인 임시저장 글이 없습니다
                            </Heading>
                            <Text fontSize="14px" color="waba.faint" maxW="380px">
                                작성 중에 저장해둔 글이 있다면 여기에 보관됩니다.
                            </Text>
                        </VStack>
                    )
                )}
            </Box>
        </Box>
    );
}
