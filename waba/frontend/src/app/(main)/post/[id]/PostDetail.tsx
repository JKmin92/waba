'use client'

import { Box, Button, Dialog, Portal, Separator, Stack, Text } from "@chakra-ui/react"
import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation";
import axiosInstance from "@/utils/api";
import { PostDetail as PostDetailType, User } from "@/interface";
import { toaster } from "@/components/ui/toaster";
import { isAuthenticated, getUserInfo } from "@/utils/authUtils";
import MemberModal from "../../member/MemberModal";
import ShareModal from "../../common/ShareModal";
import Comment from "./comment";
import PostDetailHeader from "./detail-components/PostDetailHeader";
import PostDetailBody from "./detail-components/PostDetailBody";
import PostLinkedJourneyCard from "./detail-components/PostLinkedJourneyCard";

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
        <Box minH="100vh" bg="var(--waba-bg)" pb={20} w="100%" minW={0}>
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
                        <Dialog.Content borderRadius="24px" p={6} bg="var(--waba-card)" color="var(--waba-ink)">
                            <Dialog.Header p={0} mb={2}>
                                <Dialog.Title fontSize="18px" fontWeight="800" color="var(--waba-ink)">
                                    게시글을 삭제할까요?
                                </Dialog.Title>
                            </Dialog.Header>
                            <Dialog.Body p={0} mb={6}>
                                <Text fontSize="13px" color="var(--waba-ink-2)">
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

            {/* 중앙 단일 에디토리얼 컬럼 (maxW="820px") */}
            <Box maxW="820px" w="100%" mx="auto" pt={{ base: 4, md: 8 }} px={{ base: 4, md: 6 }} minW={0}>
                <Stack gap={{ base: 6, md: 8 }} minW={0}>
                    <PostDetailHeader
                        postId={postId}
                        postDetail={postDetail}
                        isAuthor={isAuthor}
                        isLiked={isLiked}
                        likeCount={likeCount}
                        isBookmarked={isBookmarked}
                        bookmarkCount={bookmarkCount}
                        onToggleLike={toggleLike}
                        onToggleBookmark={toggleBookmark}
                        onOpenShare={() => setShareModalOpen(true)}
                        onOpenDelete={() => setDeleteModalOpen(true)}
                    />

                    <PostDetailBody
                        postDetail={postDetail}
                        activePinId={activePinId}
                        onSelectPin={setActivePinId}
                    />

                    <PostLinkedJourneyCard postDetail={postDetail} />

                    {/* 💬 댓글 섹션 (본문 아래 넓게 배치) */}
                    <Stack gap="5" minW={0}>
                        <Separator borderColor="var(--waba-line)" />
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
            </Box>
        </Box>
    )
}
