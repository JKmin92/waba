'use client'

import React from 'react';
import {
    Badge,
    Box,
    Flex,
    FormatNumber,
    Heading,
    HStack,
    IconButton,
    Menu,
    Portal,
    Separator,
    Stack,
    Text,
} from '@chakra-ui/react';
import {
    LuBookmark,
    LuChevronRight,
    LuEllipsis,
    LuEye,
    LuFlag,
    LuPencil,
    LuShare2,
    LuTrash2,
} from 'react-icons/lu';
import { useRouter } from 'next/navigation';
import { PostDetail as PostDetailType } from '@/interface';
import { formatDate } from '@/utils/simpleUtils';
import UserAvatar from '../../../common/UserAvatar';
import LikeBurstButton from '../../../common/LikeBurstButton';

interface PostDetailHeaderProps {
    postId: string;
    postDetail?: PostDetailType;
    isAuthor: boolean;
    isLiked: boolean;
    likeCount: number;
    isBookmarked: boolean;
    bookmarkCount: number;
    onToggleLike: () => void;
    onToggleBookmark: () => void;
    onOpenShare: () => void;
    onOpenReport?: () => void;
    onOpenDelete: () => void;
}

export default function PostDetailHeader({
    postId,
    postDetail,
    isAuthor,
    isLiked,
    likeCount,
    isBookmarked,
    bookmarkCount,
    onToggleLike,
    onToggleBookmark,
    onOpenShare,
    onOpenReport,
    onOpenDelete,
}: PostDetailHeaderProps) {
    const router = useRouter();

    const actionPillStyle = {
        px: { base: '10px', md: '12px' },
        h: '34px',
        bg: 'var(--waba-card)',
        border: '1px solid',
        borderColor: 'var(--waba-line)',
        borderRadius: '999px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '6px',
        fontSize: '12px',
        fontWeight: '600',
        color: 'var(--waba-ink-2)',
        transition: 'all 0.15s ease',
        flexShrink: 0,
    };

    const boardIdLower = postDetail?.board?.id?.toLowerCase() || 'all';

    return (
        <Stack gap={4} minW={0}>
            {/* Top Breadcrumb + Action Pills */}
            <Flex
                direction={{ base: 'column', sm: 'row' }}
                justify="space-between"
                align={{ base: 'flex-start', sm: 'center' }}
                gap={3}
                minW={0}
            >
                <HStack gap={1.5} fontSize="12px" fontWeight="600" color="var(--waba-ink-3)" flexWrap="wrap">
                    <Text
                        as="button"
                        cursor="pointer"
                        _hover={{ color: 'var(--waba-purple-text)' }}
                        onClick={() => router.push('/board/all')}
                    >
                        커뮤니티
                    </Text>
                    <LuChevronRight size={13} />
                    <Box
                        as="button"
                        bg="var(--waba-purple-soft)"
                        color="var(--waba-purple-text)"
                        px="10px"
                        py="3px"
                        borderRadius="999px"
                        fontSize="11px"
                        fontWeight="700"
                        cursor="pointer"
                        onClick={() => router.push(`/board/${boardIdLower}`)}
                    >
                        {postDetail?.board?.name || '게시판'}
                    </Box>
                </HStack>

                <HStack gap={2} flexWrap="wrap">
                    <Box {...actionPillStyle}>
                        <LuEye size={14} />
                        <Text>
                            <FormatNumber value={postDetail?.post.view_count || 0} />
                        </Text>
                    </Box>

                    <LikeBurstButton
                        variant="pill"
                        size="md"
                        isLiked={isLiked}
                        likeCount={likeCount}
                        onToggle={onToggleLike}
                        ariaLabel={isLiked ? '게시글 좋아요 취소' : '게시글 좋아요'}
                    />

                    <Box
                        {...actionPillStyle}
                        as="button"
                        cursor="pointer"
                        onClick={onToggleBookmark}
                        borderColor={isBookmarked ? 'var(--waba-purple-border)' : 'var(--waba-line)'}
                        bg={isBookmarked ? 'var(--waba-purple-soft)' : 'var(--waba-card)'}
                        color={isBookmarked ? 'var(--waba-purple-text)' : 'var(--waba-ink-2)'}
                    >
                        <LuBookmark
                            size={14}
                            fill={isBookmarked ? 'currentColor' : 'none'}
                        />
                        <Text fontWeight={isBookmarked ? '700' : '600'}>
                            <FormatNumber value={bookmarkCount} />
                        </Text>
                    </Box>

                    <Box
                        {...actionPillStyle}
                        as="button"
                        cursor="pointer"
                        onClick={onOpenShare}
                    >
                        <LuShare2 size={14} />
                        <Text>공유</Text>
                    </Box>

                    {!isAuthor && onOpenReport && (
                        <Box
                            {...actionPillStyle}
                            as="button"
                            cursor="pointer"
                            onClick={onOpenReport}
                        >
                            <LuFlag size={14} />
                            <Text>신고</Text>
                        </Box>
                    )}
                </HStack>
            </Flex>

            {/* Title */}
            <Heading
                as="h1"
                fontSize={{ base: '22px', md: '28px' }}
                fontWeight="800"
                lineHeight="1.35"
                color="var(--waba-ink)"
                wordBreak="break-word"
            >
                {postDetail?.post.title}
            </Heading>

            {/* Author + Pet Tags + Date */}
            <Flex
                direction={{ base: 'column', sm: 'row' }}
                justify="space-between"
                align={{ base: 'flex-start', sm: 'center' }}
                gap={3}
                py={1}
                minW={0}
            >
                <HStack gap={3} minW={0}>
                    <UserAvatar
                        src={postDetail?.user.profile_image_url}
                        alt={postDetail?.user.nickname || '프로필'}
                        size="md"
                    />
                    <Box minW={0}>
                        <HStack gap={2} align="center" flexWrap="wrap">
                            <Text fontSize="14px" fontWeight="700" color="var(--waba-ink)">
                                @{postDetail?.user.nickname}
                            </Text>
                            {postDetail?.user?.status === 'WITHDRAWN' && !postDetail?.user?.withdrawn_purged_at && (
                                <Box
                                    bg="var(--waba-surface)"
                                    color="var(--waba-ink-3)"
                                    border="1px solid"
                                    borderColor="var(--waba-line)"
                                    fontSize="10px"
                                    fontWeight="700"
                                    px={2}
                                    py="1px"
                                    borderRadius="999px"
                                >
                                    탈퇴한 회원
                                </Box>
                            )}
                            {isAuthor && (
                                <>
                                    <Badge
                                        bg="#6338A9"
                                        color="white"
                                        fontSize="10px"
                                        fontWeight="800"
                                        px={2}
                                        py={0.5}
                                        borderRadius="full"
                                    >
                                        내 글
                                    </Badge>
                                    <Menu.Root positioning={{ placement: 'bottom-start' }}>
                                        <Menu.Trigger asChild>
                                            <IconButton
                                                aria-label="게시글 메뉴"
                                                variant="ghost"
                                                size="xs"
                                                rounded="full"
                                                color="var(--waba-ink-2)"
                                            >
                                                <LuEllipsis size={16} />
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
                                                    borderColor="var(--waba-line)"
                                                    bg="var(--waba-card)"
                                                >
                                                    <Menu.Item
                                                        value="edit"
                                                        cursor="pointer"
                                                        borderRadius="10px"
                                                        py={2}
                                                        px={3}
                                                        color="var(--waba-ink)"
                                                        _hover={{ bg: 'var(--waba-surface)' }} _highlighted={{ bg: 'var(--waba-surface)' }}
                                                        onClick={() => router.push(`/post/edit/${postId}`)}
                                                    >
                                                        <LuPencil size={14} />
                                                        <Text fontSize="13px" fontWeight="600">수정하기</Text>
                                                    </Menu.Item>
                                                    <Menu.Item
                                                        value="delete"
                                                        cursor="pointer"
                                                        borderRadius="10px"
                                                        py={2}
                                                        px={3}
                                                        color="red.500"
                                                        _hover={{ bg: 'rgba(239, 68, 68, 0.12)' }} _highlighted={{ bg: 'rgba(239, 68, 68, 0.12)' }}
                                                        onClick={onOpenDelete}
                                                    >
                                                        <LuTrash2 size={14} />
                                                        <Text fontSize="13px" fontWeight="600">삭제하기</Text>
                                                    </Menu.Item>
                                                </Menu.Content>
                                            </Menu.Positioner>
                                        </Portal>
                                    </Menu.Root>
                                </>
                            )}
                        </HStack>
                        <Text fontSize="12px" color="var(--waba-ink-3)">
                            {formatDate(postDetail?.post.created_at || '')}
                        </Text>
                    </Box>
                </HStack>

                {/* Tagged Pets Mini Badges */}
                {postDetail?.post_pets && postDetail.post_pets.length > 0 && (
                    <HStack gap={1.5} flexWrap="wrap">
                        {postDetail.post_pets.map((pet) => (
                            <Badge
                                key={pet.pet_id}
                                display="inline-flex"
                                alignItems="center"
                                gap={1.5}
                                bg="var(--waba-surface)"
                                border="1px solid"
                                borderColor="var(--waba-line)"
                                color="var(--waba-ink-2)"
                                fontSize="11px"
                                fontWeight="600"
                                pl={1.5}
                                pr={2.5}
                                py={1}
                                borderRadius="full"
                            >
                                <UserAvatar
                                    src={pet.avatar_url}
                                    alt={pet.name}
                                    w="18px"
                                    h="18px"
                                    iconSize={11}
                                    fallbackType="pet"
                                />
                                {pet.name}
                            </Badge>
                        ))}
                    </HStack>
                )}
            </Flex>

            <Separator borderColor="var(--waba-line)" />
        </Stack>
    );
}
