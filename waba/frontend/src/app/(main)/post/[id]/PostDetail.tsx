'use client'

import { Avatar, Box, Button, CloseButton, Container, FormatNumber, Heading, HStack, IconButton, Image, Separator, Stack, StackSeparator, Text } from "@chakra-ui/react"
import Header from "../../common/Header"
import { useEffect, useState } from "react"
import axiosInstance from "@/utils/api";
import { PostDetail as PostDetailType, User } from "@/interface";
import { formatDate } from "@/utils/simpleUtils";
import { ArrowUpRight, Bookmark, Eye, Heart, Share2, ShoppingCart } from "lucide-react";
import { toaster } from "@/components/ui/toaster";
import { isAuthenticated, getUserInfo } from "@/utils/authUtils";
import MemberModal from "../../member/MemberModal";
import ShareModal from "../../common/ShareModal";
import Comment from "./comment";

export default function PostDetail({ postId }: { postId: string }) {

    const [postDetail, setPostDetail] = useState<PostDetailType>();
    const [activePinId, setActivePinId] = useState<string>();
    const [isLiked, setIsLiked] = useState(false);
    const [likeCount, setLikeCount] = useState(0);
    const [isLikeLoading, setIsLikeLoading] = useState(false);
    const [isBookmarked, setIsBookmarked] = useState(false);
    const [bookmarkCount, setBookmarkCount] = useState(0);
    const [isBookmarkLoading, setIsBookmarkLoading] = useState(false);
    const [loginModalOpen, setLoginModalOpen] = useState(false);
    const [shareModalOpen, setShareModalOpen] = useState(false);

    const [currentUser, setCurrentUser] = useState<User | null>(null);

    useEffect(() => {
        getPostDetail();
        setCurrentUser(getUserInfo());

        // 로그인 / 로그아웃 상태 변경 시 인터랙션 및 유저 정보 재동기화
        const handleAuthChange = () => {
            getPostDetail();
            setCurrentUser(getUserInfo());
        };

        window.addEventListener('auth-change', handleAuthChange);
        return () => window.removeEventListener('auth-change', handleAuthChange);
    }, [postId]);

    const getPostDetail = async () => {
        try {
            const res = await axiosInstance.get(`/post/${postId}`);
            setPostDetail(res.data);
            setIsLiked(Boolean(res.data?.is_liked));
            setLikeCount(res.data?.post?.like_count || 0);
            setIsBookmarked(Boolean(res.data?.is_bookmarked));
            setBookmarkCount(res.data?.post?.bookmark_count || 0);
        } catch {
            toaster.create({ title: '오류가 발생했습니다.', type: 'error' });
        }
    }

    const toggleLike = async () => {
        // 1. 비회원인 경우: 로그인 모달 오픈
        if (!isAuthenticated()) {
            setLoginModalOpen(true);
            return;
        }

        if (isLikeLoading) return;

        // 2. 회원인 경우: 낙관적 UI 업데이트 (즉각 반영)
        const prevLiked = isLiked;
        const prevCount = likeCount;
        const nextLiked = !prevLiked;
        const nextCount = nextLiked ? prevCount + 1 : Math.max(prevCount - 1, 0);

        setIsLiked(nextLiked);
        setLikeCount(nextCount);
        setIsLikeLoading(true);

        try {
            const res = await axiosInstance.post(`/post/${postId}/like`);
            if (res.data?.success) {
                setIsLiked(res.data.is_liked);
                setLikeCount(res.data.like_count);
                setPostDetail(prev => prev && ({
                    ...prev,
                    post: { ...prev.post, like_count: res.data.like_count }
                }));
            }
        } catch {
            // 실패 시 롤백
            setIsLiked(prevLiked);
            setLikeCount(prevCount);
            toaster.create({ title: '좋아요 처리에 실패했습니다.', type: 'error' });
        } finally {
            setIsLikeLoading(false);
        }
    }

    const toggleBookmark = async () => {
        // 1. 비회원인 경우: 로그인 모달 오픈
        if (!isAuthenticated()) {
            setLoginModalOpen(true);
            return;
        }

        if (isBookmarkLoading) return;

        // 2. 회원인 경우: 낙관적 UI 업데이트
        const prevBookmarked = isBookmarked;
        const prevCount = bookmarkCount;
        const nextBookmarked = !prevBookmarked;
        const nextCount = nextBookmarked ? prevCount + 1 : Math.max(prevCount - 1, 0);

        setIsBookmarked(nextBookmarked);
        setBookmarkCount(nextCount);
        setIsBookmarkLoading(true);

        try {
            const res = await axiosInstance.post(`/post/${postId}/bookmark`);
            if (res.data?.success) {
                setIsBookmarked(res.data.is_bookmarked);
                setBookmarkCount(res.data.bookmark_count);
                setPostDetail(prev => prev && ({
                    ...prev,
                    post: { ...prev.post, bookmark_count: res.data.bookmark_count }
                }));
                toaster.create({
                    title: res.data.is_bookmarked ? '북마크에 저장되었습니다.' : '북마크 저장이 취소되었습니다.',
                    type: res.data.is_bookmarked ? 'success' : 'info'
                });
            }
        } catch {
            // 실패 시 롤백
            setIsBookmarked(prevBookmarked);
            setBookmarkCount(prevCount);
            toaster.create({ title: '북마크 처리에 실패했습니다.', type: 'error' });
        } finally {
            setIsBookmarkLoading(false);
        }
    }

    const contentCountStyle = {
        w: '92px',
        border: '1px solid',
        borderColor: 'waba.border',
        rounded: 'full',
        py: '1.5',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '2',
        boxShadow: 'sm',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
    };

    return (
        <Container minH="100vh" bg="waba.canvas" pb={24}>
            <Header />

            {/* 비회원 좋아요 클릭 시 띄울 로그인 모달 */}
            <MemberModal open={loginModalOpen} onOpenChange={setLoginModalOpen} showTrigger={false} />

            {/* 공유 모달 (카카오톡, 링크 복사) */}
            <ShareModal
                open={shareModalOpen}
                onOpenChange={setShareModalOpen}
                title={postDetail?.post.title}
                thumbnailUrl={postDetail?.post_images?.[0]?.image_url}
            />

            <Container maxW="1080px" pt={32} px={6}>
                <Stack separator={<StackSeparator />} gap="10">
                    <Stack gap="4">
                        <HStack justifyContent="center">
                            <Box rounded="full" bg="bg.inverted" color="fg.inverted" px="5" fontSize="md" py="1">{postDetail?.board.name}</Box>
                        </HStack>
                        <Heading textAlign="center" fontSize="3xl">{postDetail?.post.title}</Heading>
                    </Stack>
                    <Stack direction="row" alignItems="center" justifyContent="space-between">
                        <Stack direction="row" alignItems="center" gap="6">
                            <Avatar.Root size="2xl">
                                {postDetail?.user.profile_image_url && (
                                    <Avatar.Image src={postDetail?.user.profile_image_url} />
                                )}
                            </Avatar.Root>
                            <Stack gap="0">
                                <HStack gap={2} align="center">
                                    <Heading fontSize="md">@{postDetail?.user.nickname}</Heading>
                                    {currentUser && (currentUser.id === postDetail?.user?.id || currentUser.id === postDetail?.post?.user_id) && (
                                        <Box
                                            bg="waba.charcoal"
                                            color="white"
                                            fontSize="10px"
                                            fontWeight="800"
                                            px={2}
                                            py={0.5}
                                            borderRadius="full"
                                        >
                                            내 글
                                        </Box>
                                    )}
                                </HStack>
                                <Text fontSize="xs" letterSpacing="0.08em" color="gray.500">{formatDate(postDetail?.post.created_at || '')}</Text>
                            </Stack>
                        </Stack>
                        <Stack direction="row" alignItems="center" gap="4">
                            <Box {...contentCountStyle}>
                                <Eye size={16} />
                                <Text fontSize="sm"><FormatNumber value={postDetail?.post.view_count || 0} /></Text>
                            </Box>

                            {/* ❤️ 좋아요 버튼 (회원 토글 / 비회원 로그인 다이얼로그) */}
                            <Box
                                {...contentCountStyle}
                                cursor="pointer"
                                onClick={toggleLike}
                                borderColor={isLiked ? "red.200" : "waba.border"}
                                bg={isLiked ? "red.50" : "transparent"}
                                color={isLiked ? "red.500" : "waba.charcoal"}
                                _hover={{
                                    borderColor: isLiked ? "red.300" : "blackAlpha.400",
                                    transform: "translateY(-1px)",
                                    boxShadow: "md"
                                }}
                                _active={{ transform: "scale(0.96)" }}
                            >
                                <Heart
                                    size={16}
                                    fill={isLiked ? "#EF4444" : "none"}
                                    color={isLiked ? "#EF4444" : "currentColor"}
                                    style={{
                                        transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                                        transform: isLiked ? "scale(1.15)" : "scale(1)"
                                    }}
                                />
                                <Text fontSize="sm" fontWeight={isLiked ? "700" : "500"}>
                                    <FormatNumber value={likeCount} />
                                </Text>
                            </Box>

                            {/* 🔖 북마크 버튼 (회원 토글 / 비회원 로그인 다이얼로그) */}
                            <Box
                                {...contentCountStyle}
                                cursor="pointer"
                                onClick={toggleBookmark}
                                borderColor={isBookmarked ? "purple.200" : "waba.border"}
                                bg={isBookmarked ? "purple.50" : "white"}
                                color={isBookmarked ? "waba.purple" : "waba.charcoal"}
                                _hover={{
                                    borderColor: isBookmarked ? "purple.300" : "blackAlpha.400",
                                    transform: "translateY(-1px)",
                                    boxShadow: "md"
                                }}
                                _active={{ transform: "scale(0.96)" }}
                            >
                                <Bookmark
                                    size={16}
                                    fill={isBookmarked ? "currentColor" : "none"}
                                    color={isBookmarked ? "currentColor" : "currentColor"}
                                    style={{
                                        transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                                        transform: isBookmarked ? "scale(1.15)" : "scale(1)"
                                    }}
                                />
                                <Text fontSize="sm" fontWeight={isBookmarked ? "700" : "500"}>
                                    <FormatNumber value={bookmarkCount} />
                                </Text>
                            </Box>

                            {/* 🔗 공유 버튼 (카카오톡, 링크 복사 모달 오픈) */}
                            <Box
                                {...contentCountStyle}
                                cursor="pointer"
                                onClick={() => setShareModalOpen(true)}
                                _hover={{
                                    borderColor: "blackAlpha.400",
                                    transform: "translateY(-1px)",
                                    boxShadow: "md"
                                }}
                                _active={{ transform: "scale(0.96)" }}
                            >
                                <Share2 size={16} />
                                <Text fontSize="sm">공유</Text>
                            </Box>
                        </Stack>
                    </Stack>
                    <Stack>
                        {postDetail?.post.content.map((content, index) => {
                            if (content.type === 'text') {
                                return (
                                    <Text key={`text-${index}`}>{content.content}</Text>
                                )
                            }
                            if (content.type === 'image') {
                                const image = postDetail.post_images.filter(i => i.id === content.image_id)[0];
                                const pins = postDetail.product_pins?.filter(pp => pp.post_image_id === content.image_id);
                                return (
                                    <Box key={index + content.image_id} position="relative" rounded="xl" overflow="hidden" my="4">
                                        <Image src={image?.image_url || ''} alt="post image" width="100%" rounded="xl" />
                                        {pins?.map((pin) => {
                                            const isActive = activePinId === pin.pin_id;
                                            const pinBg = pin.pin_type === 'PET' ? 'purple.500' : pin.is_official ? 'waba.purple' : 'waba.charcoal';
                                            return (
                                                <Box key={pin.pin_id} position="absolute" left={`${pin.pos_x}%`} top={`${pin.pos_y}%`} transform="translate(-50%, -50%)" zIndex="20">
                                                    <Box
                                                        as="button"
                                                        onClick={() => setActivePinId(pin.pin_id)}
                                                        w="28px"
                                                        h="28px"
                                                        rounded="full"
                                                        bg={pinBg}
                                                        color="white"
                                                        border="2px solid white"
                                                        boxShadow="0 4px 12px rgba(0, 0, 0, 0.25)"
                                                        display="flex"
                                                        alignItems="center"
                                                        justifyContent="center"
                                                        cursor="pointer">
                                                        <Box w={isActive ? '8px' : '5px'} h={isActive ? '8px' : '5px'} rounded="full" bg="white" />
                                                    </Box>

                                                    {isActive && (
                                                        <Box
                                                            position="absolute"
                                                            bottom="36px"
                                                            left="50%"
                                                            transform="translateX(-50%)"
                                                            bg="rgba(255, 255, 255, 0.95)"
                                                            backdropFilter="blur(12px)"
                                                            p={3}
                                                            borderRadius="16px"
                                                            border="1px solid"
                                                            borderColor="waba.border"
                                                            boxShadow="0 10px 25px rgba(0,0,0,0.18)"
                                                            minW="200px"
                                                            whiteSpace="nowrap"
                                                            zIndex={30}
                                                        >
                                                            <CloseButton size="2xs" position="absolute" top="1" right="1" rounded="full" onClick={() => setActivePinId('')} />
                                                            <HStack gap={2} mb={1}>
                                                                <Text fontSize="11px" fontWeight="700" color="waba.purple">
                                                                    {pin.pin_type === 'PET' ? '반려동물 태그' : pin.brand_name}
                                                                </Text>
                                                                {pin.is_official && (
                                                                    <Text fontSize="10px" color="gray.500">5% 적립</Text>
                                                                )}
                                                            </HStack>
                                                            <Text fontSize="13px" fontWeight="700" color="waba.charcoal">
                                                                {pin.product_name}
                                                            </Text>
                                                            {pin.price > 0 && (
                                                                <Text fontSize="12px" fontWeight="600" color="gray.700" mt={0.5}>
                                                                    <FormatNumber currency="KRW" style="currency" value={pin.price} />
                                                                </Text>
                                                            )}
                                                            {pin.pin_option_memo && (
                                                                <Text fontSize="11px" color="gray.500" mt={1}>
                                                                    "{pin.pin_option_memo}"
                                                                </Text>
                                                            )}
                                                        </Box>
                                                    )}
                                                </Box>
                                            )
                                        })}
                                    </Box>
                                )
                            }
                        })}

                        {postDetail?.tags && postDetail?.tags.length > 0 && (
                            <Box>
                                <Stack mt="5" gap="5">
                                    <Separator />
                                    <HStack bg="bg" py="3" px="4" rounded="md">
                                        {postDetail?.tags?.map((tag, idx) => (
                                            <Box key={idx} bg="bg.muted" fontSize="sm" rounded="full" px="3" py="1">#{tag}</Box>
                                        ))}
                                    </HStack>
                                </Stack>
                            </Box>
                        )}
                    </Stack>
                    {postDetail?.post_pets && postDetail?.post_pets.length > 0 && (
                        <Stack gap="5">
                            <Stack gap="0">
                                <Text color="fg.subtle">COMPANIONS</Text>
                                <Heading>이 게시글에 태그된 반려동물</Heading>
                            </Stack>
                            <HStack gap="10">
                                {postDetail?.post_pets.map((pet) => {
                                    return (
                                        <Stack key={pet.pet_id} separator={<StackSeparator />}>
                                            <HStack gap="4">
                                                <Avatar.Root>
                                                    {pet.avatar_url && (
                                                        <Avatar.Image src={pet.avatar_url} />
                                                    )}
                                                    <Avatar.Fallback>{pet.name.charAt(0).toUpperCase()}</Avatar.Fallback>
                                                </Avatar.Root>
                                                <Heading fontSize="xl">{pet.name}</Heading>
                                            </HStack>
                                        </Stack>
                                    )
                                })}
                            </HStack>
                        </Stack>
                    )}

                    {postDetail?.product_pins && postDetail?.product_pins.filter(p => p.pin_type !== 'PET').length > 0 && (
                        <Stack gap="5">
                            <Stack gap="0">
                                <Text color="fg.subtle">CURATED OBJECTS</Text>
                                <Heading>태그된 전체 제품</Heading>
                            </Stack>
                            <HStack gap="6">
                                {postDetail?.product_pins?.filter(p => p.pin_type !== 'PET').map((pin) => {
                                    return (
                                        <Stack key={pin.pin_id} separator={<StackSeparator />} bg="bg" rounded="xl" p="4" gap="4">
                                            <Stack>
                                                <Image src={pin.thumbnail_url || ''} aspectRatio={1.5 / 1} w="full" rounded="xl" />
                                                <Stack gap="0">
                                                    <Box fontSize="sm">{pin.brand_name}</Box>
                                                    <Heading fontSize="md">{pin.product_name}</Heading>
                                                    <Text fontSize="sm" color="fg.muted">{pin.pin_option_memo}</Text>
                                                </Stack>
                                            </Stack>
                                            <HStack justifyContent="space-between">
                                                <Heading><FormatNumber value={pin.price} />원</Heading>
                                                {pin.external_url ? (
                                                    <IconButton rounded="full" onClick={() => window.open(pin.external_url || '', '_blank')}><ArrowUpRight /></IconButton>
                                                ) : (
                                                    <IconButton aria-label="장바구니" rounded="full"><ShoppingCart /></IconButton>
                                                )}
                                            </HStack>
                                        </Stack>
                                    )
                                })}
                            </HStack>
                        </Stack>
                    )}

                    {/* 💬 댓글 섹션 (comment.tsx 컴포넌트로 분리) */}
                    <Comment
                        postId={postId}
                        postAuthorId={postDetail?.user?.id || postDetail?.post?.user_id}
                        comments={postDetail?.comments}
                        commentCount={postDetail?.post?.comment_count}
                        currentUser={currentUser}
                        onCommentsUpdate={(updatedComments, updatedCount) => {
                            setPostDetail(prev => prev ? ({
                                ...prev,
                                comments: updatedComments,
                                post: { ...prev.post, comment_count: updatedCount }
                            }) : prev);
                        }}
                        onRequireLogin={() => setLoginModalOpen(true)}
                    />
                </Stack>
            </Container>

        </Container>
    )
}
