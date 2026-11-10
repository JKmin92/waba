'use client'

import {
    Badge,
    Box,
    Button,
    Heading,
    HStack,
    IconButton,
    Text,
    VStack,
} from "@chakra-ui/react";
import {
    Bookmark,
    Edit3,
    FileText,
    Heart,
    Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { PostDetail } from "@/interface";
import { formatDate } from "@/utils/simpleUtils";
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
}: ActivitySectionProps) {
    const router = useRouter();

    return (
        <Box mt={2}>
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
                    <Text>내 게시글</Text>
                    <Text fontSize="12px" color={activeTab === 'post' ? 'waba.purple' : 'waba.faint'}>
                        {postCount ?? postList.length}
                    </Text>
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
                    <Text>스크랩한 공간</Text>
                    <Text fontSize="12px" color={activeTab === 'bookmark' ? 'waba.purple' : 'waba.faint'}>
                        {bookmarkCount ?? bookmarkList.length}
                    </Text>
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
                    <Text>좋아요한 글</Text>
                    <Text fontSize="12px" color={activeTab === 'like' ? 'waba.purple' : 'waba.faint'}>
                        {likeCount ?? likeList.length}
                    </Text>
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
                    <Text>임시저장</Text>
                    {(draftCount ?? draftList.length) > 0 && (
                        <Badge bg="orange.500" color="white" rounded="full" px={1.5} fontSize="11px">
                            {draftCount ?? draftList.length}
                        </Badge>
                    )}
                </Box>
            </HStack>

            {/* 탭 콘텐츠 영역 */}
            <Box pt={8}>
                {/* [탭 1: 내 게시글] */}
                {activeTab === 'post' && (
                    postList.length > 0 ? (
                        <PostMasonryList postList={postList} />
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
                    )
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
                                일상 스냅 보러가기
                            </Button>
                        </VStack>
                    )
                )}

                {/* [탭 4: 임시저장 글] */}
                {activeTab === 'draft' && (
                    draftList.length > 0 ? (
                        <VStack gap={4} align="stretch">
                            {draftList.map((draft) => (
                                <Box
                                    key={draft.id || draft.post?.id}
                                    bg="white"
                                    borderRadius="20px"
                                    p={6}
                                    border="1px solid"
                                    borderColor="waba.border"
                                    display="flex"
                                    alignItems="center"
                                    justifyContent="space-between"
                                    shadow="sm"
                                >
                                    <VStack align="start" gap={1.5}>
                                        <HStack gap={2}>
                                            <Badge bg="orange.50" color="orange.700" rounded="full" px={2.5} fontSize="11px" fontWeight="700">
                                                임시저장
                                            </Badge>
                                            <Text fontSize="12px" color="waba.faint">
                                                {formatDate(draft.updated_at || draft.created_at || new Date().toISOString())}
                                            </Text>
                                        </HStack>
                                        <Heading fontSize="16px" fontWeight="700" color="waba.charcoal">
                                            {draft.title || draft.post?.title || '제목 없는 임시저장 글'}
                                        </Heading>
                                    </VStack>

                                    <HStack gap={2}>
                                        <Button
                                            bg="waba.charcoal"
                                            color="white"
                                            size="sm"
                                            rounded="full"
                                            px={4}
                                            fontWeight="600"
                                            onClick={() => router.push('/post/register')}
                                        >
                                            이어서 쓰기
                                        </Button>
                                        <IconButton
                                            aria-label="임시저장 삭제"
                                            variant="ghost"
                                            size="sm"
                                            rounded="full"
                                            color="red.500"
                                            _hover={{ bg: 'red.50' }}
                                            onClick={() => onDeleteDraft(draft.id || draft.post?.id)}
                                        >
                                            <Trash2 size={16} />
                                        </IconButton>
                                    </HStack>
                                </Box>
                            ))}
                        </VStack>
                    ) : (
                        <VStack py={16} gap={4} textAlign="center">
                            <Text fontSize="42px">✍️</Text>
                            <Heading fontSize="18px" fontWeight="700" color="waba.charcoal">
                                임시저장된 글이 없습니다
                            </Heading>
                            <Text fontSize="14px" color="waba.faint">
                                글을 쓰다가 중간에 나가더라도 언제든 자동으로 안전하게 보관됩니다.
                            </Text>
                        </VStack>
                    )
                )}
            </Box>
        </Box>
    );
}
