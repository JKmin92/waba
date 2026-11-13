import { PostDetail } from "@/interface";
import { Avatar, Badge, Box, Heading, HStack, Image, Stack, Text, useBreakpointValue, VStack } from "@chakra-ui/react";
import { UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LuUserRound } from "react-icons/lu";
import SensitiveImageOverlay from "../../common/SensitiveImageOverlay";

export default function PostMasonryList({ postList }: { postList: PostDetail[] }) {

    const breakpointCol = useBreakpointValue({ base: 2, md: 2, lg: 3, xl: 4 }) ?? 4;
    const [mounted, setMounted] = useState(false);
    const router = useRouter();

    useEffect(() => {
        setMounted(true);
    }, []);

    const colCount = mounted ? breakpointCol : 4;
    const columns = Array.from({ length: colCount }, () => [] as PostDetail[]);
    postList.map((item, index) => {
        columns[index % colCount].push(item);
    })

    return (
        <HStack align="start" gap={{ base: '10px', md: '16px', lg: '20px' }} w="full" minW={0}>
            {columns.map((colItems, colidx) => (
                <VStack key={colidx} flex={1} minW={0} gap={{ base: '10px', md: '16px', lg: '20px' }} align="stretch">
                    {colItems.map((item) => {
                        const hasImage = item.post_images && item.post_images.length > 0;
                        const thumbImgObj = item.post_images?.find(img => img.is_thumbnail) || item.post_images?.[0];
                        const thumbnail = thumbImgObj?.image_url;
                        const firstImgBlock = item.post.content?.find(
                            (c): c is { type: 'image'; image_id: number; is_sensitive?: boolean | number } => c.type === 'image'
                        );
                        const isSensitive = Boolean(
                            item.thumbnail_is_sensitive ||
                            item.post.thumbnail_is_sensitive ||
                            thumbImgObj?.is_sensitive ||
                            firstImgBlock?.is_sensitive
                        );

                        return (
                            <Box
                                key={item.post.id}
                                rounded="md"
                                overflow="hidden"
                                border="1px solid"
                                borderColor="border"
                                bg={hasImage ? 'white' : 'orange.50'}
                                transition="transform 0.2s"
                                _hover={{ transform: 'translateY(-4px)' }}
                                cursor="pointer"
                                onClick={() => router.push(`/post/${item.post.id}`)}
                            >
                                {hasImage && (
                                    <Box position="relative" minH={isSensitive ? "180px" : undefined}>
                                        <Image src={thumbnail} alt={item.post.title} w="full" h="auto" display="block" />
                                        <Badge position="absolute" top="12px" left="12px" rounded="full" px="3" py="1" bg="blackAlpha.700" color="white">{item.board?.name}</Badge>
                                        <SensitiveImageOverlay isSensitive={isSensitive} compact />
                                    </Box>
                                )}
                                <Stack p={{ base: '10px', md: '4' }} gap={{ base: '1.5', md: '2' }} minW={0}>
                                    {!hasImage && (
                                        <Badge alignSelf="start" rounded="full" px="2.5" py="0.5" colorPalette="orange">{item.board?.name}</Badge>
                                    )}

                                    <Heading lineClamp={2} textOverflow="ellipsis" fontSize={{ base: 'sm', md: 'lg' }} color="charcoal">{item.post.title}</Heading>
                                    {!hasImage && (
                                        <Text fontSize="13px" color="waba.muted" lineClamp={3}>
                                            {item.post.content?.find(c => c.type === 'text')?.content}
                                        </Text>
                                    )}
                                    <HStack justify="space-between" pt="2" fontSize={{ base: '11px', md: '12px' }} color="waba.faint" gap={1.5} minW={0}>
                                        <HStack minW={0} flex="1" gap={1.5}>
                                            <Avatar.Root size="xs" flexShrink={0}>
                                                {item.user?.profile_image_url ? (
                                                    <Avatar.Image src={item.user.profile_image_url} />
                                                ) : (
                                                    <LuUserRound size={16} />
                                                )}
                                            </Avatar.Root>
                                            <Text fontWeight="600" truncate>@{item.user?.nickname}</Text>
                                        </HStack>

                                        <HStack gap={{ base: '2', md: '3' }} flexShrink={0}>
                                            <Text>❤️ {item.post.like_count}</Text>
                                            <Text>💬 {item.post.comment_count}</Text>
                                        </HStack>
                                    </HStack>
                                </Stack>
                            </Box>
                        )
                    })}
                </VStack>
            ))}
        </HStack>
    )
}