'use client'

import { Avatar, Box, Button, Container, Dialog, FormatNumber, Heading, HStack, IconButton, Image, Menu, Portal, Separator, Stack, StackSeparator, Text } from "@chakra-ui/react"
import Header from "../../common/Header"
import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation";
import axiosInstance from "@/utils/api";
import { PostDetail as PostDetailType, User } from "@/interface";
import { formatDate } from "@/utils/simpleUtils";
import { Bookmark, Eye, Heart, MoreHorizontal, Pencil, Share2, Trash2 } from "lucide-react";
import { toaster } from "@/components/ui/toaster";
import { isAuthenticated, getUserInfo } from "@/utils/authUtils";
import MemberModal from "../../member/MemberModal";
import ShareModal from "../../common/ShareModal";
import Comment from "./comment";
import PostImagePins from "./PostImagePins";
import PostProductPinList from "./PostProductPinList";
import { LuUserRound } from "react-icons/lu";

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
    const router = useRouter();
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const isAuthor = Boolean(
        currentUser && (currentUser.id === postDetail?.user?.id || currentUser.id === postDetail?.post?.user_id)
    );

    const handleDeletePost = async () => {
        if (isDeleting) return;
        setIsDeleting(true);
        try {
            await axiosInstance.delete(`/post/${postId}`);
            setDeleteModalOpen(false);
            toaster.create({ title: '게시글이 삭제되었습니다.', type: 'success' });
            router.push('/');
        } catch (e: any) {
            toaster.create({
                title: e?.response?.data?.message || '게시글 삭제에 실패했습니다.',
                type: 'error',
            });
        } finally {
            setIsDeleting(false);
        }
    };
    const lastFetchedPostIdRef = useRef<string | null>(null);

    useEffect(() => {
        // 동일 postId에 대해 Strict Mode 중복 마운트 시 중복 호출 방지
        if (lastFetchedPostIdRef.current !== postId) {
            lastFetchedPostIdRef.current = postId;
            getPostDetail();
        }
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

            {/* 게시글 삭제 확인 모달 */}
            <Dialog.Root
                open={deleteModalOpen}
                onOpenChange={(e) => setDeleteModalOpen(e.open)}
                placement="center"
                size="sm"
            >
                <Portal>
                    <Dialog.Backdrop />
                    <Dialog.Positioner>
                        <Dialog.Content borderRadius="24px" p={6} bg="white">
                            <Dialog.Header p={0} mb={2}>
                                <Dialog.Title fontSize="18px" fontWeight="800" color="waba.charcoal">
                                    게시글을 삭제할까요?
                                </Dialog.Title>
                            </Dialog.Header>
                            <Dialog.Body p={0} mb={6}>
                                <Text fontSize="13px" color="gray.600">
                                    삭제한 게시글은 복구할 수 없으며, 등록된 사진과 정보도 함께 삭제됩니다.
                                </Text>
                            </Dialog.Body>
                            <Dialog.Footer p={0} gap={2}>
                                <Button
                                    variant="outline"
                                    rounded="full"
                                    flex={1}
                                    onClick={() => setDeleteModalOpen(false)}
                                    disabled={isDeleting}
                                >
                                    취소
                                </Button>
                                <Button
                                    bg="red.500"
                                    color="white"
                                    _hover={{ bg: 'red.600' }}
                                    rounded="full"
                                    flex={1}
                                    onClick={handleDeletePost}
                                    loading={isDeleting}
                                >
                                    삭제
                                </Button>
                            </Dialog.Footer>
                        </Dialog.Content>
                    </Dialog.Positioner>
                </Portal>
            </Dialog.Root>

            <Container maxW="1080px" pt={32} px={6}>
                <Stack gap="10">
                    <Stack gap="4">
                        <HStack justifyContent="center">
                            <Box rounded="full" bg="bg.inverted" color="fg.inverted" px="5" fontSize="md" py="1">{postDetail?.board.name}</Box>
                        </HStack>
                        <Heading textAlign="center" fontSize="3xl">{postDetail?.post.title}</Heading>
                    </Stack>

                    <Separator borderColor="waba.border" />

                    <Stack direction="row" alignItems="center" justifyContent="space-between">
                        <Stack direction="row" alignItems="center" gap="6">
                            <Avatar.Root size="2xl">
                                {postDetail?.user.profile_image_url ? (
                                    <Avatar.Image src={postDetail?.user.profile_image_url} />
                                ) : (<LuUserRound />)}
                            </Avatar.Root>
                            <Stack gap="0">
                                <HStack gap={2} align="center">
                                    <Heading fontSize="md">@{postDetail?.user.nickname}</Heading>
                                    {isAuthor && (
                                        <>
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
                                            <Menu.Root positioning={{ placement: "bottom-start" }}>
                                                <Menu.Trigger asChild>
                                                    <IconButton
                                                        aria-label="게시글 메뉴"
                                                        variant="ghost"
                                                        size="xs"
                                                        rounded="full"
                                                        color="waba.charcoal"
                                                    >
                                                        <MoreHorizontal size={18} />
                                                    </IconButton>
                                                </Menu.Trigger>
                                                <Portal>
                                                    <Menu.Positioner>
                                                        <Menu.Content
                                                            minW="140px"
                                                            borderRadius="16px"
                                                            p={1.5}
                                                            boxShadow="0 12px 32px -4px rgba(26, 28, 30, 0.12)"
                                                            border="1px solid"
                                                            borderColor="waba.border"
                                                            bg="white"
                                                        >
                                                            <Menu.Item
                                                                value="edit"
                                                                cursor="pointer"
                                                                borderRadius="10px"
                                                                py={2}
                                                                px={3}
                                                                onClick={() => router.push(`/post/edit/${postId}`)}
                                                            >
                                                                <Pencil size={14} />
                                                                <Text fontSize="13px" fontWeight="600">수정하기</Text>
                                                            </Menu.Item>
                                                            <Menu.Item
                                                                value="delete"
                                                                cursor="pointer"
                                                                borderRadius="10px"
                                                                py={2}
                                                                px={3}
                                                                color="red.500"
                                                                _hover={{ bg: 'red.50' }}
                                                                onClick={() => setDeleteModalOpen(true)}
                                                            >
                                                                <Trash2 size={14} />
                                                                <Text fontSize="13px" fontWeight="600">삭제하기</Text>
                                                            </Menu.Item>
                                                        </Menu.Content>
                                                    </Menu.Positioner>
                                                </Portal>
                                            </Menu.Root>
                                        </>
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
                    <Separator borderColor="waba.border" />

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
                                    <PostImagePins
                                        key={index + content.image_id}
                                        imageSrc={image?.image_url || ''}
                                        pins={pins}
                                        activePinId={activePinId}
                                        onSelectPin={setActivePinId}
                                    />
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
                    {postDetail?.post_pets && postDetail.post_pets.length > 0 && (
                        <Stack gap="5">
                            <Separator borderColor="waba.border" />
                            <Stack gap="0">
                                <Text color="fg.subtle">COMPANIONS</Text>
                                <Heading>이 게시글에 태그된 반려동물</Heading>
                            </Stack>
                            <HStack gap="10">
                                {postDetail.post_pets.map((pet) => {
                                    return (
                                        <HStack key={pet.pet_id} gap="4">
                                            <Avatar.Root>
                                                {pet.avatar_url && (
                                                    <Avatar.Image src={pet.avatar_url} />
                                                )}
                                                <Avatar.Fallback>{pet.name.charAt(0).toUpperCase()}</Avatar.Fallback>
                                            </Avatar.Root>
                                            <Heading fontSize="xl">{pet.name}</Heading>
                                        </HStack>
                                    )
                                })}
                            </HStack>
                        </Stack>
                    )}

                    {/* 🏷️ 태그된 제품 목록 (실제 노출할 제품 핀이 있을 때만 Separator 및 목록 렌더링) */}
                    {postDetail?.product_pins && postDetail.product_pins.filter((p) => p.pin_type !== 'PET').length > 0 && (
                        <Stack gap="5">
                            <Separator borderColor="waba.border" />
                            <PostProductPinList pins={postDetail.product_pins} />
                        </Stack>
                    )}

                    {/* 💬 댓글 섹션 (상단 구분선 포함) */}
                    <Stack gap="5">
                        <Separator borderColor="waba.border" />
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
                </Stack>
            </Container>

        </Container>
    )
}
