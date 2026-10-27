'use client'

import { Avatar, Box, Button, CloseButton, Container, FormatNumber, Heading, HStack, Icon, IconButton, Image, Separator, Stack, StackSeparator, Text, Textarea } from "@chakra-ui/react"
import Header from "../../common/Header"
import { useEffect, useState } from "react"
import axiosInstance from "@/utils/api";
import { PostDetail as PostDetailType } from "@/interface";
import { formatDate, formatRelativeTime } from "@/utils/simpleUtils";
import { ArrowUpRight, Eye, Heart, Share2, ShoppingCart, UserRound } from "lucide-react";

export default function PostDetail({ postId }: { postId: string }) {

    const [postDetail, setPostDetail] = useState<PostDetailType>();
    const [activePinId, setActivePinId] = useState<string>();

    useEffect(() => {
        getPostDetail();
    }, []);

    const getPostDetail = async () => {
        try {
            const res = await axiosInstance.get(`/post/${postId}`);
            setPostDetail(res.data);
        } catch (e) {
            console.log(e);
        }
    }

    const contentCountStyle = { w: '92px', border: '1px solid #000', borderColor: 'waba.border', rounded: 'full', py: '1', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '2', boxShadow: 'lg' };

    return (
        <Container minH="100vh" bg="waba.canvas" pb={24}>
            <Header />

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
                                <Heading fontSize="md">@{postDetail?.user.nickname}</Heading>
                                <Text fontSize="xs" letterSpacing="0.08em" color="gray.500">{formatDate(postDetail?.post.promoted_at || '')}</Text>
                            </Stack>
                        </Stack>
                        <Stack direction="row" alignItems="center" gap="4">
                            <Box {...contentCountStyle}>
                                <Icon><Eye /></Icon>
                                <Text fontSize="sm"><FormatNumber value={postDetail?.post.view_count || 0} /></Text>
                            </Box>

                            <Box {...contentCountStyle} cursor="pointer">
                                <Icon><Heart /></Icon>
                                <Text fontSize="sm"><FormatNumber value={postDetail?.post.like_count || 0} /></Text>
                            </Box>

                            <Box {...contentCountStyle} cursor="pointer">
                                <Icon><Share2 /></Icon>
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
                    </Stack>
                    <Stack gap="5">
                        <Stack gap="0">
                            <Text>COMPANIONS</Text>
                            <Heading>이 게시글에 태그된 반려동물</Heading>
                        </Stack>
                        <HStack gap="10">
                            {postDetail?.product_pins?.filter(p => p.pin_type === 'PET').map((pin) => {
                                return (
                                    <Stack key={pin.pin_id} separator={<StackSeparator />}>
                                        <HStack gap="4">
                                            <Avatar.Root>
                                                {pin.thumbnail_url && (
                                                    <Avatar.Image src={pin.thumbnail_url} />
                                                )}
                                            </Avatar.Root>
                                            <Heading fontSize="xl">{pin.product_name}</Heading>
                                        </HStack>
                                    </Stack>
                                )
                            })}
                        </HStack>
                    </Stack>
                    <Stack gap="5">
                        <Stack gap="0">
                            <Text>CURATED OBJECTS</Text>
                            <Heading>태그된 전체 제품</Heading>
                        </Stack>
                        <HStack gap="6">
                            {postDetail?.product_pins?.filter(p => p.pin_type !== 'PET').map((pin) => {
                                return (
                                    <Stack key={pin.pin_id} separator={<StackSeparator />} bg="bg" rounded="xl" p="4" gap="4">
                                        <Stack>
                                            <Image src={pin.thumbnail_url || ''} w="full" rounded="xl" />
                                            <Stack gap="0">
                                                <Box>{pin.brand_name}</Box>
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
                    <Stack gap="5">
                        <HStack justifyContent="space-between">
                            <Heading>댓글 {postDetail?.comments?.length}</Heading>
                            <HStack>
                                <Button size="xs" variant="ghost" fontWeight="bold">최신순</Button>
                                <Text>·</Text>
                                <Button size="xs" variant="ghost" fontWeight="light">추천순</Button>
                            </HStack>
                        </HStack>
                        <Stack direction="row" rounded="xl" borderWidth="1px" borderColor="border" bg="bg" p="4">
                            <Avatar.Root>
                                <UserRound />
                            </Avatar.Root>
                            <Stack separator={<StackSeparator />} w='full' gap="4">
                                <Textarea border="none" h="28" resize="none" w="full" placeholder="반려동물과 함께하는 공간에 대해 따뜻한 이야기를 남겨주세요." />
                                <HStack justifyContent="end">
                                    <IconButton size="sm" px="6" rounded="full">등록</IconButton>
                                </HStack>
                            </Stack>
                        </Stack>
                        <Stack>
                            {postDetail?.comments?.map((comment) => (
                                <Stack key={comment.id} bg="bg" borderWidth="1px" borderColor="border" p="4" gap="4" rounded="xl">
                                    <HStack justifyContent="space-between">
                                        <HStack alignItems="center" gap="4">
                                            <Avatar.Root>
                                                {comment.author?.profile_image_url ? (
                                                    <Avatar.Image src={comment.author.profile_image_url} />
                                                ) : (
                                                    <Avatar.Fallback>
                                                        <UserRound />
                                                    </Avatar.Fallback>
                                                )}
                                            </Avatar.Root>
                                            <Stack gap="0">
                                                <Heading fontSize="sm">@{comment.author?.nickname}</Heading>
                                                <Text fontSize="xs">{formatRelativeTime(comment.created_at)}</Text>
                                            </Stack>
                                        </HStack>
                                        <HStack gap="0">
                                            <IconButton size="xs" rounded="full" variant="ghost">
                                                <Heart />
                                            </IconButton>
                                            <Text fontSize="xs"><FormatNumber value={comment.like_count || 0} /></Text>
                                        </HStack>
                                    </HStack>
                                    <Text>{comment.content}</Text>
                                </Stack>
                            ))}
                        </Stack>
                    </Stack>
                </Stack>
            </Container>

        </Container>
    )
}