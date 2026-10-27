'use client'

import { Avatar, Badge, Box, Button, Container, Flex, FormatNumber, Grid, GridItem, Heading, HStack, IconButton, Image, Link, Stack, Text } from "@chakra-ui/react"
import Header from "./common/Header"
import { useEffect, useState } from "react";
import { ArrowRight, Bookmark, Check, ChevronRight, ShoppingBag, Sparkles } from "lucide-react";
import { PostDetail, PostImage } from "@/interface/community.interface";
import { Product, ProductPinItem } from "@/interface";
import { toaster } from "@/components/ui/toaster";
import axiosInstance from "@/utils/api";

export default function Main() {

    const [selectedPets, setSelectedPets] = useState<string[]>([]);
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
    const [selectedSpace, setSelectedSpace] = useState<string>('전체');

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

    const togglePetFilter = (petType: string) => {
        if (petType === 'all') {
            setSelectedPets([]);
            return;
        }
        setSelectedPets((prev) =>
            prev.includes(petType) ? prev.filter((p) => p !== petType) : [...prev, petType]
        );
    };

    return (
        <Container minH="100vh" bg="waba.canvas" pb={24}>
            <Header />
            <Container maxW="1280px" pt={28} px={6}>
                <Stack direction="row" mb={8} justifyContent="center">
                    <HStack
                        gap={2}
                        p={1.5}
                        bg="white"
                        borderRadius="full"
                        border="1px solid"
                        borderColor="waba.border"
                        boxShadow="sm"
                        flexWrap="wrap"
                    >
                        <Button
                            size="sm"
                            borderRadius="full"
                            px={4}
                            bg={selectedPets.length === 0 ? 'waba.charcoal' : 'transparent'}
                            color={selectedPets.length === 0 ? 'white' : 'waba.charcoal'}
                            _hover={{ bg: selectedPets.length === 0 ? 'waba.charcoal' : 'waba.subtle' }}
                            onClick={() => togglePetFilter('all')}
                        >전체</Button>
                        {[
                            { key: 'cat', label: '🐱 고양이' },
                            { key: 'dog', label: '🐶 강아지' },
                            { key: 'rabbit', label: '🐰 토끼' },
                        ].map((pet) => {
                            const isSelected = selectedPets.includes(pet.key);
                            return (
                                <Button
                                    key={pet.key}
                                    size="sm"
                                    borderRadius="full"
                                    px={4}
                                    bg={isSelected ? 'waba.charcoal' : 'white'}
                                    color={isSelected ? 'white' : 'waba.charcoal'}
                                    border="1px solid"
                                    borderColor={isSelected ? 'waba.charcoal' : 'waba.border'}
                                    _hover={{ borderColor: 'waba.charcoal' }}
                                    onClick={() => togglePetFilter(pet.key)}
                                >
                                    {pet.label}
                                    {isSelected && <Check size={13} />}
                                </Button>
                            );
                        })}
                    </HStack>
                </Stack>
                <Grid templateColumns={{ base: '1fr', lg: 'repeat(12, 1fr)' }} gap={6} mb={16}>
                    <GridItem
                        colSpan={{ base: 12, lg: 8 }}
                        position="relative"
                        minH={{ base: '420px', lg: '540px' }}
                        borderRadius="28px"
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
                            bottom={7}
                            left={7}
                            right={{ base: 7, sm: 'auto' }}
                            zIndex={15}
                            bg="rgba(255, 255, 255, 0.90)"
                            backdropFilter="blur(16px)"
                            borderRadius="full"
                            pl={5}
                            pr={2.5}
                            py={2.5}
                            border="1px solid"
                            borderColor={activePin?.is_official ? 'waba.purple' : 'whiteAlpha.800'}
                            boxShadow="0 12px 30px rgba(0, 0, 0, 0.18)"
                            align="center"
                            justify="space-between"
                            gap={4}
                        >
                            <Box>
                                <HStack gap={2}>
                                    <Text
                                        fontSize="11px"
                                        fontWeight="700"
                                        color={activePin?.is_official ? 'waba.purple' : 'waba.muted'}
                                    >
                                        {activePin?.brand_name}
                                    </Text>
                                    <Text fontSize="11px" color="waba.muted">
                                        · {activePin?.used_pet_names}
                                    </Text>
                                </HStack>
                                <Text fontSize="13px" fontWeight="700" color="waba.charcoal" mt={0.5}>
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
                                _hover={{ opacity: 0.9 }}
                            >
                                <ArrowRight size={16} />
                            </IconButton>

                        </Flex>
                    </GridItem>

                    <GridItem colSpan={{ base: 12, lg: 4 }} display="flex" flexDirection="column" gap={6}>
                        <Flex
                            flex="1"
                            direction="column"
                            justify="space-between"
                            bg="white"
                            borderRadius="28px"
                            p={7}
                            border="1px solid"
                            borderColor="waba.border"
                            boxShadow="0 8px 32px -4px rgba(26, 28, 30, 0.04)"
                        >
                            <Box>
                                <Flex align="center" justify="space-between" mb={4}>
                                    <Text fontSize="11px" fontWeight="700" color="waba.muted" letterSpacing="0.08em">
                                        {careLounge?.tags?.join(',')}
                                    </Text>
                                    <Box w="8px" h="8px" borderRadius="full" bg="waba.purple" />
                                </Flex>
                                <HStack align="start" gap={4} mt={2}>
                                    <Image
                                        src={careLounge?.post_images?.filter((image: PostImage) => image.is_thumbnail)[0]?.image_url}
                                        alt={careLounge?.post?.title}
                                        w="80px"
                                        h="80px"
                                        borderRadius="18px"
                                        objectFit="cover"
                                        flexShrink={0}
                                    />
                                    <Box>
                                        <Heading
                                            as="h3"
                                            fontSize="17px"
                                            fontWeight="700"
                                            lineHeight="1.4"
                                            color="waba.charcoal"
                                            _hover={{ color: 'waba.purple' }}
                                            cursor="pointer"
                                        >
                                            {careLounge?.post?.title}
                                        </Heading>
                                        <Text fontSize="13px" color="waba.muted" mt={1.5} lineClamp={2}>
                                            {careLounge?.post?.title}
                                        </Text>
                                    </Box>
                                </HStack>
                            </Box>

                            <Flex
                                align="center"
                                justify="space-between"
                                pt={5}
                                mt={4}
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
                                    w="38px"
                                    h="38px"
                                    _hover={{ bg: 'waba.charcoal', color: 'white' }}
                                >
                                    <ArrowRight size={16} />
                                </IconButton>
                            </Flex>
                        </Flex>

                        <Flex
                            flex="1"
                            direction="column"
                            justify="space-between"
                            bg="waba.charcoal"
                            color="white"
                            borderRadius="28px"
                            p={7}
                            position="relative"
                            overflow="hidden"
                        >
                            <Box
                                position="absolute"
                                top="-60px"
                                right="-60px"
                                w="180px"
                                h="180px"
                                bg="waba.purple"
                                opacity={0.3}
                                filter="blur(50px)"
                                borderRadius="full"
                                pointerEvents="none"
                            />
                            <Box position="relative" zIndex={1}>
                                <HStack gap={2.5} mb={3}>
                                    <Badge bg="waba.purple" color="white" fontSize="11px" px={3} py={1} borderRadius="full">
                                        {rewardBanner.badge}
                                    </Badge>
                                    <Text fontSize="11px" fontWeight="600" color="whiteAlpha.600" letterSpacing="0.08em">
                                        {rewardBanner.subTitle}
                                    </Text>
                                </HStack>
                                <Heading as="h3" fontSize="18px" fontWeight="700" lineHeight="1.5" mt={1}>
                                    {rewardBanner.title}
                                </Heading>
                                <Text fontSize="13px" color="whiteAlpha.700" mt={2}>
                                    {rewardBanner.description}
                                </Text>
                            </Box>
                            <Box position="relative" zIndex={1} pt={5}>
                                <Button
                                    bg="white"
                                    color="waba.charcoal"
                                    borderRadius="full"
                                    size="sm"
                                    px={5}
                                    py={5}
                                    fontSize="12px"
                                    _hover={{ bg: 'waba.purpleLight', color: 'waba.purple' }}
                                >
                                    {rewardBanner.ctaText}
                                    <ChevronRight size={15} />
                                </Button>
                            </Box>
                        </Flex>
                    </GridItem>
                </Grid>

                <Box id="section-objects" mb={16}>
                    <Flex
                        direction={{ base: 'column', md: 'row' }}
                        align={{ base: 'start', md: 'flex-end' }}
                        justify="space-between"
                        mb={7}
                        gap={4}
                    >
                        <Box>
                            <Text fontSize="11px" fontWeight="700" color="waba.purple" letterSpacing="0.1em">
                                VERIFIED LIVING ESSENTIALS
                            </Text>
                            <Heading as="h2" fontSize={{ base: '24px', md: '28px' }} fontWeight="700" mt={1}>
                                지금 가장 많이 태그된 리빙 &amp; 케어 오브젝트
                            </Heading>
                            <Text fontSize="14px" color="waba.muted" mt={1}>
                                취향 있는 집사들이 공간 룩북에 기록한 실사용 검증 아이템 (자사몰 + 스마트스토어/쿠팡 통합)
                            </Text>
                        </Box>
                        <Link href="#" fontSize="13px" fontWeight="700" color="waba.charcoal">
                            <HStack gap={1}>
                                <Text>전체 오브젝트 보기</Text>
                                <ArrowRight size={16} />
                            </HStack>
                        </Link>
                    </Flex>

                    <Grid templateColumns={{ base: '1fr', md: 'repeat(3, 1fr)' }} gap={6}>
                        {productList.map((product: Product, index: number) => (
                            <Flex
                                display={index < 3 ? 'flex' : 'none'}
                                key={product.id}
                                bg="white"
                                borderRadius="26px"
                                p={4}
                                border="1px solid"
                                borderColor="waba.border"
                                align="center"
                                gap={4}
                                transition="all 0.2s"
                                _hover={{ borderColor: 'waba.purple', boxShadow: 'md' }}
                            >
                                <Image
                                    src={product.thumbnail_url}
                                    alt={product.name}
                                    w="92px"
                                    h="92px"
                                    borderRadius="18px"
                                    objectFit="cover"
                                    flexShrink={0}
                                />
                                <Box flex="1" minW={0}>
                                    <Text fontSize="16px" fontWeight="700" color="waba.charcoal" truncate mt={0.5}>
                                        {product.name}
                                    </Text>
                                    <HStack gap={2} mt={1.5}>
                                        <Text fontSize="14px" fontWeight="700" color="waba.charcoal">
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
                                    w="40px"
                                    h="40px"
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
                        mb={7}
                        gap={4}
                    >
                        <Box>
                            <Text fontSize="11px" fontWeight="700" color="waba.purple" letterSpacing="0.1em">
                                CURATED LOOKBOOK &amp; SPACES
                            </Text>
                            <Heading as="h2" fontSize={{ base: '24px', md: '28px' }} fontWeight="700" mt={1}>
                                베스트 멘토 &amp; 라이프 스냅
                            </Heading>
                            <Text fontSize="14px" color="waba.muted" mt={1}>
                                와바미 공식(AI·촬영) 룩북과 커뮤니티 기준을 통과해 승격된 집사들의 공간
                            </Text>
                        </Box>

                        <HStack gap={2}>
                            {['전체', '거실', '휴식존'].map((cat) => (
                                <Button
                                    key={cat}
                                    size="sm"
                                    borderRadius="full"
                                    px={4}
                                    bg={selectedSpace === cat ? 'waba.charcoal' : 'white'}
                                    color={selectedSpace === cat ? 'white' : 'waba.muted'}
                                    border="1px solid"
                                    borderColor={selectedSpace === cat ? 'waba.charcoal' : 'waba.border'}
                                    onClick={() => setSelectedSpace(cat)}
                                >
                                    {cat}
                                </Button>
                            ))}
                        </HStack>
                    </Flex>

                    <Grid templateColumns={{ base: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' }} gap={6}>
                        {postList.map((item: PostDetail) => (
                            <Flex
                                key={item.post.id}
                                direction="column"
                                bg="white"
                                borderRadius="26px"
                                overflow="hidden"
                                border="1px solid"
                                borderColor="waba.border"
                                boxShadow="0 8px 24px -4px rgba(26, 28, 30, 0.04)"
                                className="group"
                            >
                                <Box position="relative" aspectRatio={4 / 5} overflow="hidden" bg="waba.subtle">
                                    <Image
                                        src={item.post_images.filter((img) => img.is_thumbnail)[0].image_url}
                                        alt={item.post.title}
                                        w="100%"
                                        h="100%"
                                        objectFit="cover"
                                        transition="transform 0.5s ease"
                                        _groupHover={{ transform: 'scale(1.05)' }}
                                    />
                                    {/* <Badge
                                        position="absolute"
                                        top={4}
                                        left={4}
                                        bg="blackAlpha.700"
                                        color="white"
                                        backdropFilter="blur(6px)"
                                        fontSize="11px"
                                        px={3}
                                        py={1}
                                        borderRadius="full"
                                    >
                                        {item.post.snap_badge}
                                    </Badge> */}

                                    <IconButton
                                        aria-label="저장"
                                        position="absolute"
                                        top={4}
                                        right={4}
                                        size="sm"
                                        w="36px"
                                        h="36px"
                                        borderRadius="full"
                                        bg="whiteAlpha.900"
                                        color="waba.charcoal"
                                        _hover={{ bg: 'white', color: 'waba.purple' }}
                                    >
                                        <Bookmark size={16} />
                                    </IconButton>

                                    {/* <Badge
                                        position="absolute"
                                        bottom={3}
                                        left={4}
                                        bg={item.post.source_type === 'USER_PROMOTED' ? 'waba.purple' : 'whiteAlpha.900'}
                                        color={item.post.source_type === 'USER_PROMOTED' ? 'white' : 'waba.charcoal'}
                                        fontSize="10px"
                                        px={2.5}
                                        py={0.5}
                                        borderRadius="full"
                                    >
                                        {snap.sourceType === 'OFFICIAL_AI'
                                            ? '✨ WABA AI 룩북'
                                            : snap.sourceType === 'OFFICIAL_PHOTO'
                                            ? '📸 WABA 공식 화보'
                                            : '👑 룩북 선정 유저'}
                                    </Badge> */}
                                </Box>

                                <Box p={5}>
                                    <Text fontSize="13px" fontWeight="700" color="waba.charcoal" truncate>
                                        {item.post.title}
                                    </Text>
                                    <Text fontSize="13px" color="waba.muted" mt={1} lineClamp={1}>
                                        {item.post.title}
                                    </Text>
                                    <HStack
                                        mt={3}
                                        pt={3}
                                        borderTop="1px solid"
                                        borderColor="waba.border"
                                        justify="space-between"
                                        fontSize="11px"
                                    >
                                        <HStack gap={1} color="waba.purple" fontWeight="700" minW={0}>
                                            {/* <Tag size={12} /> */}
                                            {/* <Text truncate>{snap.taggedProduct}</Text> */}
                                        </HStack>
                                        <Text color="waba.faint" flexShrink={0}>
                                            💘 {item.post.bookmark_count || 0}
                                        </Text>
                                    </HStack>
                                </Box>
                            </Flex>
                        ))}
                    </Grid>
                </Box>
            </Container>
        </Container>
    )
}
