"use client"

import { toaster } from "@/components/ui/toaster";
import { Board } from "@/interface";
import axiosInstance from "@/utils/api";
import {
    Badge,
    Box,
    Button,
    CloseButton,
    Dialog,
    Flex,
    HStack,
    IconButton,
    Input,
    Link,
    Portal,
    Text,
    useDisclosure,
    VStack,
} from "@chakra-ui/react"
import { Plus, Search, ShoppingBag } from "lucide-react"
import { useEffect, useState } from "react"

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export default function HeaderClient() {
    const [data, setData] = useState<any>(null);
    const { open, onOpen, onClose, setOpen } = useDisclosure();
    const [uploadSourceType, setUploadSourceType] = useState<'OFFICIAL_AI' | 'USER_COMMUNITY'>('OFFICIAL_AI');
    const [externalUrl, setExternalUrl] = useState('https://smartstore.naver.com/petliving/products/99281');
    const [parsedProduct, setParsedProduct] = useState<any>(null);
    const [newSnapTitle, setNewSnapTitle] = useState('');
    const [isParsing, setIsParsing] = useState(false);
    const [boardList, setBoardList] = useState<Board[]>([]);

    useEffect(() => {
        getBoardList();
    }, []);

    const getBoardList = async () => {
        try {
            const res = await axiosInstance.get(`/post/boards`);
            setBoardList(res.data);
        } catch (error) {
            console.error('Error fetching board list:', error);
        }
    };

    const handleCreateLookbook = async () => {
        try {
            const res = await fetch(`${API_BASE}/api/lookbook`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sourceType: uploadSourceType,
                    petBadge: '🐱 랙돌 4.8kg · 🐰 롭이어 2.1kg 합사',
                    petTypes: ['cat', 'rabbit'],
                    spaceCategory: '거실',
                    authorHandle: uploadSourceType === 'OFFICIAL_AI' ? 'WABA OFFICIAL LOOKBOOK' : '@waba_member · 성수동 하우스',
                    title: newSnapTitle || '감각적인 합사 거실 패브릭 소파 & 매트 스타일링',
                    taggedProduct: parsedProduct?.productName || '와바미 헤어볼 케어 스틱 (28,900원)',
                }),
            });
            const created = await res.json();
            if (created.success && data) {
                setData({
                    ...data,
                    curatedSpaces: [created.snap, ...data.curatedSpaces],
                });
                toaster.create({
                    title: uploadSourceType === 'OFFICIAL_AI' ? '공식 AI 룩북이 등록되었습니다.' : '커뮤니티 스냅이 등록되었습니다.',
                    type: 'success',
                });
                onClose();
                setNewSnapTitle('');
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleParseUrl = async () => {
        setIsParsing(true);
        try {
            const res = await fetch(`${API_BASE}/api/pins/parse-url`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: externalUrl }),
            });
            const result = await res.json();
            setParsedProduct(result);
            toaster.create({
                title: '상품 정보 추출 완료',
                description: result.productName,
                type: 'success',
            });
        } catch (e) {
            toaster.create({
                title: '추출 실패',
                type: 'error',
            });
        } finally {
            setIsParsing(false);
        }
    };

    return (
        <>
            <Box
                as="header"
                position="fixed"
                top={4}
                left="50%"
                transform="translateX(-50%)"
                w="calc(100% - 2rem)"
                maxW="1280px"
                zIndex={50}
                bg="rgba(255, 255, 255, 0.85)"
                backdropFilter="blur(20px)"
                borderRadius="full"
                border="1px solid"
                borderColor="waba.border"
                boxShadow="0 12px 36px -6px rgba(26, 28, 30, 0.06)"
                px={6}
                py={3}
            >
                <Flex align="center" justify="space-between">
                    <Link href="/" _hover={{ textDecoration: 'none' }}>
                        <HStack gap={2}>
                            <Text fontSize="22px" fontWeight="800" letterSpacing="-0.03em" color="waba.charcoal">WABA</Text>
                            <Box w="6px" h="6px" borderRadius="full" bg="waba.purple" />
                            <Text fontSize="11px" fontWeight="600" color="waba.faint" display={{ base: 'none', sm: 'inline' }}>by WABAMI</Text>
                        </HStack>
                    </Link>

                    <HStack gap={8} display={{ base: 'none', md: 'flex' }} fontSize="13px" fontWeight="600">
                        <Link href="/" color="waba.purple" fontWeight="700">홈</Link>
                        {boardList.map((board) => (
                            <Link key={board.id} href={`/board/${board.id.toLowerCase()}`} color="waba.muted" _hover={{ color: 'waba.charcoal' }}>
                                {board.name}
                            </Link>
                        ))}
                    </HStack>

                    <HStack gap={2.5}>
                        <IconButton
                            aria-label="검색"
                            borderRadius="full"
                            bg="waba.subtle"
                            color="waba.charcoal"
                            size="md"
                            _hover={{ bg: '#E8E8EC' }}
                        >
                            <Search size={18} />
                        </IconButton>
                        <Box position="relative">
                            <IconButton
                                aria-label="장바구니"
                                borderRadius="full"
                                bg="waba.subtle"
                                color="waba.charcoal"
                                size="md"
                                _hover={{ bg: '#E8E8EC' }}
                            >
                                <ShoppingBag size={18} />
                            </IconButton>
                            <Box
                                position="absolute"
                                top="9px"
                                right="9px"
                                w="6px"
                                h="6px"
                                borderRadius="full"
                                bg="waba.purple"
                            />
                        </Box>
                        <Button
                            onClick={onOpen}
                            bg="waba.charcoal"
                            color="white"
                            borderRadius="full"
                            px={5}
                            h="40px"
                            fontSize="13px"
                            _hover={{ bg: 'waba.purple' }}
                        >
                            <Plus size={15} />
                            공간·룩북 올리기
                        </Button>
                    </HStack>
                </Flex>
            </Box>

            <Dialog.Root open={open} onOpenChange={(e) => setOpen(e.open)} placement="center" size="lg">
                <Portal>
                    <Dialog.Backdrop backdropFilter="blur(8px)" bg="blackAlpha.400" />
                    <Dialog.Positioner>
                        <Dialog.Content borderRadius="28px" p={2}>
                            <Dialog.Header>
                                <Dialog.Title fontSize="18px" fontWeight="800">
                                    📌 WABA 룩북 &amp; 상품 핀 등록하기
                                </Dialog.Title>
                            </Dialog.Header>
                            <Dialog.CloseTrigger asChild position="absolute" top={4} right={4}>
                                <CloseButton size="sm" borderRadius="full" />
                            </Dialog.CloseTrigger>
                            <Dialog.Body pb={6}>
                                <VStack gap={4} align="stretch">
                                    <Box>
                                        <Text fontSize="12px" fontWeight="700" color="waba.muted" mb={2}>
                                            1. 업로드 유형 선택 (하이브리드 룩북 시스템)
                                        </Text>
                                        <HStack gap={2}>
                                            <Button
                                                flex="1"
                                                size="sm"
                                                borderRadius="full"
                                                bg={uploadSourceType === 'OFFICIAL_AI' ? 'waba.purple' : 'waba.subtle'}
                                                color={uploadSourceType === 'OFFICIAL_AI' ? 'white' : 'waba.charcoal'}
                                                onClick={() => setUploadSourceType('OFFICIAL_AI')}
                                            >
                                                ✨ 와바미 공식 AI/촬영 룩북
                                            </Button>
                                            <Button
                                                flex="1"
                                                size="sm"
                                                borderRadius="full"
                                                bg={uploadSourceType === 'USER_COMMUNITY' ? 'waba.charcoal' : 'waba.subtle'}
                                                color={uploadSourceType === 'USER_COMMUNITY' ? 'white' : 'waba.charcoal'}
                                                onClick={() => setUploadSourceType('USER_COMMUNITY')}
                                            >
                                                🏡 일반 유저 커뮤니티 스냅
                                            </Button>
                                        </HStack>
                                    </Box>

                                    <Box>
                                        <Text fontSize="12px" fontWeight="700" color="waba.muted" mb={1.5}>
                                            2. 공간 룩북 한줄 제목
                                        </Text>
                                        <Input
                                            placeholder="예: 고양이와 토끼가 함께 지내는 거실 안 뜯기는 소파 & 매트 세팅"
                                            borderRadius="full"
                                            fontSize="13px"
                                            value={newSnapTitle}
                                            onChange={(e) => setNewSnapTitle(e.target.value)}
                                        />
                                    </Box>

                                    <Box p={4} bg="waba.canvas" borderRadius="20px" border="1px solid" borderColor="waba.border">
                                        <Text fontSize="12px" fontWeight="700" color="waba.charcoal" mb={1.5}>
                                            3. 사진 속 상품 핀(Pin) 연동 (스마트스토어 · 쿠팡 · 와바미 URL)
                                        </Text>
                                        <HStack gap={2}>
                                            <Input
                                                bg="white"
                                                borderRadius="full"
                                                fontSize="12px"
                                                value={externalUrl}
                                                onChange={(e) => setExternalUrl(e.target.value)}
                                            />
                                            <Button
                                                size="sm"
                                                px={5}
                                                borderRadius="full"
                                                bg="waba.charcoal"
                                                color="white"
                                                loading={isParsing}
                                                onClick={handleParseUrl}
                                            >
                                                상품명 자동추출
                                            </Button>
                                        </HStack>
                                        {parsedProduct && (
                                            <HStack mt={3} p={2.5} bg="white" borderRadius="16px" border="1px solid" borderColor="waba.purple">
                                                <Badge bg="waba.purpleLight" color="waba.purple">
                                                    추출성공
                                                </Badge>
                                                <Text fontSize="12px" fontWeight="700" truncate>
                                                    {parsedProduct.productName}
                                                </Text>
                                            </HStack>
                                        )}
                                    </Box>

                                    <Button
                                        mt={2}
                                        w="100%"
                                        h="46px"
                                        borderRadius="full"
                                        bg="waba.purple"
                                        color="white"
                                        _hover={{ bg: 'waba.purpleHover' }}
                                        onClick={handleCreateLookbook}
                                    >
                                        WABA 룩북 피드에 등록하기
                                    </Button>
                                </VStack>
                            </Dialog.Body>
                        </Dialog.Content>
                    </Dialog.Positioner>
                </Portal>
            </Dialog.Root>
        </>
    )
}
