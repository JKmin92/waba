'use client'

import { Avatar, Badge, Box, Button, Container, Flex, FormatNumber, Grid, GridItem, Heading, HStack, IconButton, Image, Link, Stack, Text } from "@chakra-ui/react"
import Header from "./common/Header"
import { useEffect, useState } from "react";
import { ArrowRight, Bookmark, ChevronRight, ShoppingBag, Sparkles } from "lucide-react";
import { PostDetail, PostImage } from "@/interface/community.interface";
import { Product, ProductPinItem } from "@/interface";
import { toaster } from "@/components/ui/toaster";
import axiosInstance from "@/utils/api";
import PostMasonryList from "./board/[id]/PostMasonryList";
import SensitiveImageOverlay from "./common/SensitiveImageOverlay";
import { useRouter } from "next/navigation";

export default function Main() {
    const router = useRouter();

    const [postList, setPostList] = useState<PostDetail[]>([]);
    const [mainPost, setMainPost] = useState<PostDetail>();
    const [activeHeroPinIndex, setActiveHeroPinIndex] = useState<number>(0);
    const [activePin, setActivePin] = useState<ProductPinItem>();

    const [careLounge, setCareLounge] = useState<PostDetail>();

    const rewardBanner = {
        badge: '5% 리워드 적립',
        subTitle: 'WABA REWARD',
        title: '내 공간에 와바미 제품을 태그하면 구매 발생 시 포인트가 쌓입니다',
        description: '공간을 기록하는 것만으로 리빙 크리에이터가 되는 가장 감각적인 방법.',
        ctaText: '크리에이터 체험단 보기'
    }

    const [productList, setProductList] = useState<Product[]>([]);

    useEffect(() => {
        getMainPost();
        getProductList();
    }, []);

    const getMainPost = async () => {
        try {
            const res = await axiosInstance.get('/post/main');
            if (res.data.length > 0) {
                setPostList(res.data);
                res.data.map((item: PostDetail) => {
                    if (item.post.curation_grade === 'MAIN_LOOKBOOK' && item.post.board_id === 'LOOKBOOK') {
                        setMainPost(item);
                        if (item.product_pins && item.product_pins.length > 0) {
                            const pin = item.product_pins[activeHeroPinIndex] || item.product_pins[0];
                            setActivePin(pin);
                        }
                    }
                });
                setCareLounge(res.data[1]);
            }
        } catch {
            toaster.create({ title: '오류가 발생했습니다.', type: 'error' });
        }
    }

    const getProductList = async () => {
        try {
            const res = await axiosInstance.get('/product/main');
            if (res.data.length > 0) {
                setProductList(res.data);
            }
        } catch {
            toaster.create({ title: '오류가 발생했습니다.', type: 'error' });
        }
    }

    const mainThumbnail = mainPost?.post_images?.find((img: PostImage) => img.is_thumbnail) || mainPost?.post_images?.[0];
    const heroPins = mainPost?.product_pins?.filter((pin: ProductPinItem) => pin.post_image_id === mainThumbnail?.id) || [];

    useEffect(() => {
        if (heroPins.length > 0) {
            const pin = heroPins[activeHeroPinIndex] || heroPins[0];
            setActivePin(pin);
        }
    }, [activeHeroPinIndex, mainPost]);

    return (
        <Container minH="100vh" maxW="100%" overflowX="hidden" bg="waba.canvas" pb={{ base: 24, md: 24 }}>
            <Header />
            <Container maxW="1280px" pt={{ base: 20, md: 24, lg: 28 }} px={{ base: '16px', md: '24px', xl: 6 }}>
                <Grid
                    templateColumns={{ base: '1fr', lg: 'repeat(12, 1fr)' }}
                    gap={{ base: '14px', md: 5, lg: '18px', xl: 6 }}
                    mb={{ base: 10, md: 12, lg: 16 }}
                >
                    <GridItem
                        colSpan={{ base: 1, lg: 8 }}
                        minW={0}
                        position="relative"
                        minH={{ base: '360px', md: '400px', lg: '460px', xl: '540px' }}
                        borderRadius={{ base: '24px', md: '28px' }}
                        overflow="hidden"
                        border="1px solid"
                        borderColor="waba.border"
                        boxShadow="0 8px 32px -4px rgba(26, 28, 30, 0.05)"
                        className="group"
                    >

                        <Image
                            src={mainThumbnail?.image_url}
                            alt={mainPost?.post.title}
                            w="100%"
                            h="100%"
                            objectFit="cover"
                            position="absolute"
                            inset={0}
                            transition="transform 0.7s ease"
                            _groupHover={{ transform: 'scale(1.03)' }}
                        />
                        <SensitiveImageOverlay
                            isSensitive={Boolean(mainPost?.thumbnail_is_sensitive || mainPost?.post?.thumbnail_is_sensitive || mainThumbnail?.is_sensitive)}
                        />

                        <Box
                            position="absolute"
                            inset={0}
                            bgGradient="to-t"
                            gradientFrom="blackAlpha.600"
                            gradientVia="blackAlpha.100"
                            gradientTo="transparent"
                            pointerEvents="none"
                        />

                        <HStack
                            position="absolute"
                            top={6}
                            right={6}
                            bg="rgba(255,255,255,0.85)"
                            backdropFilter="blur(12px)"
                            px={3.5}
                            py={1.5}
                            borderRadius="full"
                            gap={1.5}
                        >
                            <Sparkles size={13} color="#6338A9" />
                            <Text fontSize="11px" fontWeight="700" color="waba.charcoal" letterSpacing="0.04em">
                                {mainThumbnail?.is_ai_generated ? 'AI 연출 이미지' : 'WABA LOOKBOOK'}
                            </Text>
                        </HStack>

                        <HStack position="absolute" top={6} left={6} gap={2} flexWrap="wrap">
                            {mainPost?.post_pets?.map((p) => (
                                <Badge
                                    key={p.pet_id}
                                    bg="blackAlpha.700"
                                    color="white"
                                    backdropFilter="blur(8px)"
                                    fontSize="11px"
                                    px={3}
                                    py={1}
                                    borderRadius="full"
                                >
                                    {p.name}
                                </Badge>
                            ))}
                        </HStack>

                        {heroPins.map((pin: ProductPinItem, idx: number) => {
                            const isSelectedPin = activeHeroPinIndex === idx;
                            return (
                                <Box
                                    key={pin.pin_id}
                                    as="button"
                                    onClick={() => setActiveHeroPinIndex(idx)}
                                    position="absolute"
                                    left={`${pin.pos_x}%`}
                                    top={`${pin.pos_y}%`}
                                    transform="translate(-50%, -50%)"
                                    zIndex={20}
                                    w="32px"
                                    h="32px"
                                    borderRadius="full"
                                    bg={pin.is_official ? 'waba.purple' : 'waba.charcoal'}
                                    color="white"
                                    border="2px solid white"
                                    boxShadow="0 4px 16px rgba(0,0,0,0.3)"
                                    display="flex"
                                    alignItems="center"
                                    justifyContent="center"
                                    transition="all 0.2s"
                                    _hover={{ transform: 'translate(-50%, -50%) scale(1.15)' }}
                                >
                                    <Box
                                        w={isSelectedPin ? '10px' : '6px'}
                                        h={isSelectedPin ? '10px' : '6px'}
                                        borderRadius="full"
                                        bg="white"
                                    />
                                </Box>
                            );
                        })}

                        <Flex
                            position="absolute"
                            bottom={{ base: 3.5, md: 5, lg: 7 }}
                            left={{ base: 3.5, md: 5, lg: 7 }}
                            right={{ base: 3.5, md: 'auto' }}
                            maxW={{ base: 'calc(100% - 28px)', md: '420px' }}
                            zIndex={15}
                            bg="rgba(255, 255, 255, 0.90)"
                            backdropFilter="blur(16px)"
                            borderRadius="full"
                            pl={{ base: 4, md: 5 }}
                            pr={2.5}
                            py={{ base: 2, md: 2.5 }}
                            border="1px solid"
                            borderColor={activePin?.is_official ? 'waba.purple' : 'whiteAlpha.800'}
                            boxShadow="0 12px 30px rgba(0, 0, 0, 0.18)"
                            align="center"
                            justify="space-between"
                            gap={{ base: 2.5, md: 4 }}
                        >
                            <Box flex="1" minW={0}>
                                <HStack gap={2} minW={0}>
                                    <Text
                                        fontSize="11px"
                                        fontWeight="700"
                                        color={activePin?.is_official ? 'waba.purple' : 'waba.muted'}
                                        flexShrink={0}
                                    >
                                        {activePin?.brand_name}
                                    </Text>
                                    <Text fontSize="11px" color="waba.muted" truncate>
                                        · {activePin?.used_pet_names}
                                    </Text>
                                </HStack>
                                <Text fontSize={{ base: '12px', md: '13px' }} fontWeight="700" color="waba.charcoal" mt={0.5} truncate>
                                    {activePin?.product_name} · {activePin?.price ? <FormatNumber currency="KRW" style="currency" value={activePin.price} /> : ''}
                                </Text>
                            </Box>
                            <IconButton
                                aria-label="상품 보러가기"
                                borderRadius="full"
                                bg={activePin?.is_official ? 'waba.purple' : 'waba.charcoal'}
                                color="white"
                                size="sm"
                                w="36px"
                                h="36px"
                                flexShrink={0}
                                _hover={{ opacity: 0.9 }}
                            >
                                <ArrowRight size={16} />
                            </IconButton>

                        </Flex>
                    </GridItem>

                    <GridItem
                        colSpan={{ base: 1, lg: 4 }}
                        minW={0}
                        display={{ base: 'flex', md: 'grid', lg: 'flex' }}
                        gridTemplateColumns={{ md: '1.35fr 1fr' }}
                        flexDirection={{ base: 'column', lg: 'column' }}
                        gap={{ base: '14px', md: 5, lg: 4, xl: 5 }}
                    >
                        {/* 상단 careLounge 카드 (약 2/3 비율, 매거진 커버 이미지 + 오버레이 텍스트) */}
                        <Flex
                            flex="2"
                            minW={0}
                            h={{ md: '245px', lg: 'auto' }}
                            direction="column"
                            bg="white"
                            borderRadius="28px"
                            overflow="hidden"
                            border="1px solid"
                            borderColor="waba.border"
                            boxShadow="0 8px 32px -4px rgba(26, 28, 30, 0.04)"
                            cursor={careLounge?.post?.id ? 'pointer' : 'default'}
                            className="group"
                            onClick={() => {
                                if (careLounge?.post?.id) {
                                    router.push(`/post/${careLounge.post.id}`);
                                }
                            }}
                        >
                            {/* 작성자 영역 위쪽 전체 커버 이미지 + 그라데이션 오버레이 */}
                            <Box position="relative" flex="1" minH={{ base: '220px', md: '175px', lg: '210px', xl: '260px' }} overflow="hidden" bg="waba.charcoal">
                                <Image
                                    src={
                                        careLounge?.post_images?.filter((image: PostImage) => image.is_thumbnail)[0]?.image_url ||
                                        careLounge?.post_images?.[0]?.image_url
                                    }
                                    alt={careLounge?.post?.title || 'WABA 큐레이션'}
                                    w="100%"
                                    h="100%"
                                    objectFit="cover"
                                    transition="transform 0.4s ease"
                                    _groupHover={{ transform: 'scale(1.03)' }}
                                />
                                <SensitiveImageOverlay
                                    isSensitive={Boolean(
                                        careLounge?.thumbnail_is_sensitive ||
                                        careLounge?.post?.thumbnail_is_sensitive ||
                                        careLounge?.post_images?.filter((image: PostImage) => image.is_thumbnail)[0]?.is_sensitive ||
                                        careLounge?.post_images?.[0]?.is_sensitive
                                    )}
                                    compact
                                />

                                {/* 가독성 강화 어두운 그라데이션 오버레이 */}
                                <Box
                                    position="absolute"
                                    inset={0}
                                    bg="linear-gradient(to top, rgba(16, 18, 20, 0.88) 0%, rgba(16, 18, 20, 0.35) 55%, rgba(16, 18, 20, 0.15) 100%)"
                                />

                                {/* 오버레이 텍스트 (상단 태그 + 하단 제목/본문) */}
                                <Flex
                                    position="absolute"
                                    inset={0}
                                    p={6}
                                    direction="column"
                                    justify="space-between"
                                >
                                    <Flex align="center" justify="space-between">
                                        <Badge
                                            bg="rgba(255, 255, 255, 0.18)"
                                            backdropFilter="blur(8px)"
                                            color="white"
                                            fontSize="11px"
                                            fontWeight="700"
                                            px={3}
                                            py={1}
                                            borderRadius="full"
                                            border="1px solid"
                                            borderColor="rgba(255, 255, 255, 0.25)"
                                            letterSpacing="0.04em"
                                        >
                                            {careLounge?.tags?.length ? careLounge.tags.slice(0, 3).map((t) => `#${t}`).join(' ') : 'CARE LOUNGE'}
                                        </Badge>
                                        <Box w="8px" h="8px" borderRadius="full" bg="waba.purple" boxShadow="0 0 10px rgba(123, 92, 250, 0.8)" />
                                    </Flex>

                                    <Box>
                                        <Heading
                                            as="h3"
                                            fontSize={{ base: '18px', md: '20px' }}
                                            fontWeight="800"
                                            lineHeight="1.35"
                                            color="white"
                                            lineClamp={2}
                                        >
                                            {careLounge?.post?.title}
                                        </Heading>
                                        <Text fontSize="13px" whiteSpace="nowrap" textOverflow="ellipsis" overflow="hidden" color="whiteAlpha.800" mt={2} lineHeight="1.5">
                                            {careLounge?.post?.title}
                                        </Text>
                                    </Box>
                                </Flex>
                            </Box>

                            {/* 하단 작성자 영역 */}
                            <Flex
                                align="center"
                                justify="space-between"
                                px={6}
                                py={2}
                                bg="white"
                                borderTop="1px solid"
                                borderColor="waba.border"
                            >
                                <HStack gap={3}>
                                    <Avatar.Root size="sm">
                                        <Avatar.Fallback name={careLounge?.user.nickname} />
                                        <Avatar.Image src={careLounge?.user.profile_image_url ?? ''} />
                                    </Avatar.Root>
                                    <Box>
                                        <HStack gap={1.5}>
                                            <Text fontSize="12px" fontWeight="700" color="waba.charcoal">
                                                {careLounge?.user.nickname}
                                            </Text>
                                            {careLounge?.user.vet_license_info && (
                                                <Badge bg="waba.purpleLight" color="waba.purple" fontSize="10px" px={2} py={0.5}>
                                                    ✓ 수의사 공식 검증
                                                </Badge>
                                            )}
                                        </HStack>
                                        <Text fontSize="11px" color="waba.faint">
                                            {careLounge?.user?.mentor_badge}
                                        </Text>
                                    </Box>
                                </HStack>
                                <IconButton
                                    aria-label="칼럼 읽기"
                                    borderRadius="full"
                                    bg="waba.subtle"
                                    color="waba.charcoal"
                                    size="sm"
                                    w="36px"
                                    h="36px"
                                    _hover={{ bg: 'waba.charcoal', color: 'white' }}
                                >
                                    <ArrowRight size={16} />
                                </IconButton>
                            </Flex>
                        </Flex>

                        {/* 하단 rewardBanner 카드 (약 1/3 비율) */}
                        <Flex
                            flex="1"
                            minW={0}
                            h={{ md: '245px', lg: 'auto' }}
                            direction="column"
                            justify="space-between"
                            bg="waba.charcoal"
                            color="white"
                            borderRadius="28px"
                            p={{ base: 5, md: 5 }}
                            position="relative"
                            overflow="hidden"
                        >
                            <Box
                                position="absolute"
                                top="-60px"
                                right="-60px"
                                w="160px"
                                h="160px"
                                bg="waba.purple"
                                opacity={0.3}
                                filter="blur(50px)"
                                borderRadius="full"
                                pointerEvents="none"
                            />
                            <Box position="relative" zIndex={1}>
                                <HStack gap={2} mb={2}>
                                    <Badge bg="waba.purple" color="white" fontSize="10px" px={2.5} py={0.5} borderRadius="full">
                                        {rewardBanner.badge}
                                    </Badge>
                                    <Text fontSize="10px" fontWeight="600" color="whiteAlpha.600" letterSpacing="0.08em">
                                        {rewardBanner.subTitle}
                                    </Text>
                                </HStack>
                                <Heading as="h3" fontSize="16px" fontWeight="700" lineHeight="1.4" mt={0.5}>
                                    {rewardBanner.title}
                                </Heading>
                                <Text fontSize="12px" color="whiteAlpha.700" mt={1.5} lineClamp={2}>
                                    {rewardBanner.description}
                                </Text>
                            </Box>
                            <Box position="relative" zIndex={1} pt={3}>
                                <Button
                                    bg="white"
                                    color="waba.charcoal"
                                    borderRadius="full"
                                    size="sm"
                                    px={4}
                                    h="34px"
                                    fontSize="12px"
                                    fontWeight="700"
                                    _hover={{ bg: 'waba.purpleLight', color: 'waba.purple' }}
                                >
                                    {rewardBanner.ctaText}
                                    <ChevronRight size={15} />
                                </Button>
                            </Box>
                        </Flex>
                    </GridItem>
                </Grid>

                <Box id="section-objects" mb={{ base: 12, md: 14, lg: 16 }}>
                    <Flex
                        direction={{ base: 'column', md: 'row' }}
                        align={{ base: 'start', md: 'flex-end' }}
                        justify="space-between"
                        mb={{ base: 5, md: 7 }}
                        gap={4}
                    >
                        <Box>
                            <Text fontSize="11px" fontWeight="700" color="waba.purple" letterSpacing="0.1em">
                                VERIFIED LIVING ESSENTIALS
                            </Text>
                            <Heading as="h2" fontSize={{ base: '20px', md: '24px', lg: '28px' }} fontWeight="700" mt={1}>
                                지금 가장 많이 태그된 리빙 &amp; 케어 오브젝트
                            </Heading>
                            <Text fontSize={{ base: '13px', md: '14px' }} color="waba.muted" mt={1}>
                                취향 있는 집사들이 공간 룩북에 기록한 실사용 검증 아이템 (자사몰 + 스마트스토어/쿠팡 통합)
                            </Text>
                        </Box>
                        <Link href="#" fontSize="13px" fontWeight="700" color="waba.charcoal" flexShrink={0}>
                            <HStack gap={1}>
                                <Text>전체 오브젝트 보기</Text>
                                <ArrowRight size={16} />
                            </HStack>
                        </Link>
                    </Flex>

                    <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }} gap={{ base: 3, md: 4, lg: 5, xl: 6 }}>
                        {productList.map((product: Product, index: number) => (
                            <Flex
                                display={index < 3 ? 'flex' : 'none'}
                                key={product.id}
                                minW={0}
                                bg="white"
                                borderRadius={{ base: '22px', md: '26px' }}
                                p={{ base: 3, md: 3.5, lg: 4 }}
                                border="1px solid"
                                borderColor="waba.border"
                                align="center"
                                gap={{ base: 3, md: 3.5, lg: 4 }}
                                transition="all 0.2s"
                                _hover={{ borderColor: 'waba.purple', boxShadow: 'md' }}
                            >
                                <Image
                                    src={product.thumbnail_url}
                                    alt={product.name}
                                    w={{ base: '72px', md: '72px', lg: '64px', xl: '92px' }}
                                    h={{ base: '72px', md: '72px', lg: '64px', xl: '92px' }}
                                    borderRadius={{ base: '14px', md: '18px' }}
                                    objectFit="cover"
                                    flexShrink={0}
                                />
                                <Box flex="1" minW={0}>
                                    <Text fontSize={{ base: '14px', md: '15px', xl: '16px' }} fontWeight="700" color="waba.charcoal" truncate mt={0.5}>
                                        {product.name}
                                    </Text>
                                    <HStack gap={2} mt={1.5} flexWrap="wrap">
                                        <Text fontSize={{ base: '13px', md: '14px' }} fontWeight="700" color="waba.charcoal">
                                            <FormatNumber currency="KRW" style="currency" value={product.sale_price ?? 0} />
                                        </Text>
                                        <Badge bg="waba.purpleLight" color="waba.purple" fontSize="11px" px={2.5} py={0.5}>
                                            🏷 태그 {product.pin_count}회
                                        </Badge>
                                    </HStack>
                                </Box>
                                <IconButton
                                    aria-label="장바구니"
                                    borderRadius="full"
                                    bg="waba.subtle"
                                    color="waba.charcoal"
                                    w={{ base: '36px', md: '40px' }}
                                    h={{ base: '36px', md: '40px' }}
                                    flexShrink={0}
                                    _hover={{ bg: 'waba.charcoal', color: 'white' }}
                                >
                                    <ShoppingBag size={18} />
                                </IconButton>
                            </Flex>
                        ))}
                    </Grid>
                </Box>

                <Box id="section-spaces">
                    <Flex
                        direction={{ base: 'column', md: 'row' }}
                        align={{ base: 'start', md: 'flex-end' }}
                        justify="space-between"
                        mb={{ base: 5, md: 7 }}
                        gap={4}
                    >
                        <Box>
                            <Text fontSize="11px" fontWeight="700" color="waba.purple" letterSpacing="0.1em">
                                CURATED LOOKBOOK &amp; SPACES
                            </Text>
                            <Heading as="h2" fontSize={{ base: '20px', md: '24px', lg: '28px' }} fontWeight="700" mt={1}>
                                베스트 멘토 &amp; 라이프 스냅
                            </Heading>
                            <Text fontSize={{ base: '13px', md: '14px' }} color="waba.muted" mt={1}>
                                와바미 공식(AI·촬영) 룩북과 커뮤니티 기준을 통과해 승격된 집사들의 공간
                            </Text>
                        </Box>
                    </Flex>

                    <PostMasonryList postList={postList} />
                </Box>
            </Container>
        </Container>
    )
}
