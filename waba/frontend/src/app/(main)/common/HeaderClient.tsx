"use client"

import { toaster } from "@/components/ui/toaster";
import {
    Badge,
    Box,
    Button,
    CloseButton,
    Dialog,
    Flex,
    HStack,
    IconButton,
    Link,
    Portal,
    Separator,
    Text,
    useDisclosure,
    VStack,
} from "@chakra-ui/react"
import { Plus, Search, ShoppingBag, Menu as MenuIcon, Home, MessageSquare, ShoppingCart, User as UserIconLucide } from "lucide-react"
import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation";
import MemberModal from "../member/MemberModal";
import SearchModal from "./SearchModal";
import { isAuthenticated, getUserInfo } from "@/utils/authUtils";
import UserIcon from "./UserIcon";

export default function HeaderClient() {
    const router = useRouter();
    const pathname = usePathname();

    const [isLogin, setIsLogin] = useState(false);
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    useEffect(() => {
        // 첫 마운트 시 로그인 여부 및 회원 정보 확인
        setIsLogin(isAuthenticated());
        setCurrentUser(getUserInfo());

        // auth-change 이벤트 수신 시 실시간으로 isLogin 및 회원정보 갱신
        const handleAuthChange = () => {
            setIsLogin(isAuthenticated());
            setCurrentUser(getUserInfo());
        };

        window.addEventListener('auth-change', handleAuthChange);
        return () => window.removeEventListener('auth-change', handleAuthChange);
    }, []);

    // GNB 활성 상태 판별
    const isHomeActive = pathname === '/';
    const isCommunityActive = pathname.startsWith('/board') || pathname.startsWith('/post');
    const isStoreActive = pathname.startsWith('/shop') || pathname.startsWith('/product');

    const handleStoreClick = (e: React.MouseEvent) => {
        e.preventDefault();
        // 아직 스토어 전용 페이지가 오픈 전인 경우 안내 토스트 후 상품 검색 뷰로 연결
        toaster.create({
            title: 'WABA 스토어(Shop) 준비 중입니다.',
            description: '현재 룩북 및 검색 페이지에서 큐레이션 상품을 만나보실 수 있습니다.',
            type: 'info',
        });
        router.push('/search?type=product');
    };

    return (
        <>
            {/* ───────────────────────────────────────────────────────────── */}
            {/* 1. 데스크톱 & 모바일 상단 Sticky 플로팅 헤더                   */}
            {/* ───────────────────────────────────────────────────────────── */}
            <Box
                as="header"
                position="fixed"
                top={{ base: 2, md: 4 }}
                left="50%"
                transform="translateX(-50%)"
                w="calc(100% - 1.5rem)"
                maxW="1280px"
                zIndex={50}
                bg="rgba(255, 255, 255, 0.92)"
                backdropFilter="blur(20px)"
                borderRadius="full"
                border="1px solid"
                borderColor="waba.border"
                boxShadow="0 12px 36px -6px rgba(26, 28, 30, 0.08), 0 0 0 1px rgba(232, 232, 238, 0.8)"
                px={{ base: 4, md: 7 }}
                py={{ base: 2.5, md: 3 }}
                transition="all 0.2s"
            >
                <Flex align="center" justify="space-between">
                    {/* Left: Brand Logo (Clean WABA + Signature Purple Dot) */}
                    <Link
                        href="/"
                        _hover={{ textDecoration: 'none' }}
                        cursor="pointer"
                    >
                        <HStack gap={1.5} align="center">
                            <Text
                                fontSize={{ base: '20px', md: '24px' }}
                                fontWeight="900"
                                letterSpacing="-0.04em"
                                color="waba.charcoal"
                                _hover={{ color: 'waba.purple' }}
                                transition="color 0.15s"
                            >
                                WABA
                            </Text>
                            <Box
                                w={{ base: '6px', md: '7px' }}
                                h={{ base: '6px', md: '7px' }}
                                borderRadius="full"
                                bg="waba.purple"
                            />
                        </HStack>
                    </Link>

                    {/* Center: 3대 핵심 메인 GNB (홈 | 커뮤니티 | 스토어) */}
                    <HStack
                        as="nav"
                        gap={8}
                        display={{ base: 'none', md: 'flex' }}
                        fontSize="14px"
                        fontWeight="700"
                    >
                        {/* 1) 홈 */}
                        <Box
                            as="button"
                            onClick={() => router.push('/')}
                            position="relative"
                            py={1}
                            color={isHomeActive ? 'waba.purple' : 'waba.muted'}
                            _hover={{ color: 'waba.charcoal' }}
                            transition="color 0.15s"
                            cursor="pointer"
                        >
                            <Text fontWeight={isHomeActive ? '800' : '600'}>홈</Text>
                            {isHomeActive && (
                                <Box
                                    position="absolute"
                                    bottom="-4px"
                                    left={0}
                                    right={0}
                                    h="2px"
                                    bg="waba.purple"
                                    borderRadius="full"
                                />
                            )}
                        </Box>

                        {/* 2) 커뮤니티 */}
                        <Box
                            as="button"
                            onClick={() => router.push('/board/all')}
                            position="relative"
                            py={1}
                            color={isCommunityActive ? 'waba.purple' : 'waba.muted'}
                            _hover={{ color: 'waba.charcoal' }}
                            transition="color 0.15s"
                            cursor="pointer"
                        >
                            <HStack gap={1.5}>
                                <Text fontWeight={isCommunityActive ? '800' : '600'}>커뮤니티</Text>
                            </HStack>
                            {isCommunityActive && (
                                <Box
                                    position="absolute"
                                    bottom="-4px"
                                    left={0}
                                    right={0}
                                    h="2px"
                                    bg="waba.purple"
                                    borderRadius="full"
                                />
                            )}
                        </Box>

                        {/* 3) 스토어 (Shop) */}
                        <Box
                            as="button"
                            onClick={handleStoreClick}
                            position="relative"
                            py={1}
                            color={isStoreActive ? 'waba.purple' : 'waba.muted'}
                            _hover={{ color: 'waba.charcoal' }}
                            transition="color 0.15s"
                            cursor="pointer"
                        >
                            <HStack gap={1.5}>
                                <Text fontWeight={isStoreActive ? '800' : '600'}>스토어</Text>
                            </HStack>
                            {isStoreActive && (
                                <Box
                                    position="absolute"
                                    bottom="-4px"
                                    left={0}
                                    right={0}
                                    h="2px"
                                    bg="waba.purple"
                                    borderRadius="full"
                                />
                            )}
                        </Box>
                    </HStack>

                    {/* Right: 유틸리티 & 액션 버튼 */}
                    <HStack gap={{ base: 1.5, md: 2.5 }}>
                        {/* 검색 버튼 (스포트라이트 모달 오픈) */}
                        <IconButton
                            aria-label="검색"
                            borderRadius="full"
                            bg="waba.subtle"
                            color="waba.charcoal"
                            size={{ base: 'sm', md: 'md' }}
                            _hover={{ bg: '#E8E8EC', color: 'waba.purple' }}
                            onClick={() => setIsSearchOpen(true)}
                        >
                            <Search size={18} />
                        </IconButton>

                        {/* 장바구니 버튼 */}
                        <Box position="relative">
                            <IconButton
                                aria-label="장바구니"
                                borderRadius="full"
                                bg="waba.subtle"
                                color="waba.charcoal"
                                size={{ base: 'sm', md: 'md' }}
                                _hover={{ bg: '#E8E8EC' }}
                                onClick={() => {
                                    toaster.create({ title: '장바구니 보관함이 열립니다.', type: 'info' });
                                }}
                            >
                                <ShoppingBag size={18} />
                            </IconButton>
                            <Box
                                position="absolute"
                                top="8px"
                                right="8px"
                                w="6px"
                                h="6px"
                                borderRadius="full"
                                bg="waba.purple"
                                ring="2px"
                                ringColor="white"
                            />
                        </Box>

                        {/* 데스크톱 CTA 버튼: 공간·룩북 올리기 */}
                        <Box display={{ base: 'none', md: 'block' }}>
                            {isLogin ? (
                                <Button
                                    onClick={() => router.push('/post/register')}
                                    bg="waba.charcoal"
                                    color="white"
                                    borderRadius="full"
                                    px={4}
                                    h="38px"
                                    fontSize="12px"
                                    fontWeight="700"
                                    _hover={{ bg: 'waba.purple' }}
                                    transition="all 0.15s"
                                    boxShadow="sm"
                                >
                                    <Plus size={14} />
                                    공간·룩북 올리기
                                </Button>
                            ) : null}
                        </Box>

                        {/* 프로필 아바타 / 로그인 버튼 */}
                        {isLogin ? (
                            <UserIcon />
                        ) : (
                            <MemberModal />
                        )}

                        {/* 모바일 햄버거 메뉴 토글 버튼 */}
                        <IconButton
                            aria-label="메뉴"
                            display={{ base: 'flex', md: 'none' }}
                            borderRadius="full"
                            bg="waba.subtle"
                            color="waba.charcoal"
                            size="sm"
                            _hover={{ bg: '#E8E8EC' }}
                            onClick={() => setMobileMenuOpen(true)}
                        >
                            <MenuIcon size={18} />
                        </IconButton>
                    </HStack>
                </Flex>
            </Box>

            {/* ───────────────────────────────────────────────────────────── */}
            {/* 2. 모바일 바텀 내비게이션 바 (Bottom GNB: 5-Button Bar)        */}
            {/* ───────────────────────────────────────────────────────────── */}
            <Box
                display={{ base: 'block', md: 'none' }}
                position="fixed"
                bottom={0}
                left={0}
                right={0}
                zIndex={40}
                bg="rgba(255, 255, 255, 0.95)"
                backdropFilter="blur(16px)"
                borderTop="1px solid"
                borderColor="waba.border"
                px={4}
                py={2}
                boxShadow="0 -4px 20px rgba(0, 0, 0, 0.05)"
            >
                <Flex align="center" justify="space-around">
                    {/* 1) 홈 */}
                    <Box
                        as="button"
                        onClick={() => router.push('/')}
                        display="flex"
                        flexDirection="column"
                        alignItems="center"
                        gap={0.5}
                        color={isHomeActive ? 'waba.purple' : 'waba.muted'}
                        flex="1"
                    >
                        <Home size={19} />
                        <Text fontSize="10px" fontWeight={isHomeActive ? '800' : '600'}>
                            홈
                        </Text>
                    </Box>

                    {/* 2) 커뮤니티 */}
                    <Box
                        as="button"
                        onClick={() => router.push('/board/all')}
                        display="flex"
                        flexDirection="column"
                        alignItems="center"
                        gap={0.5}
                        color={isCommunityActive ? 'waba.purple' : 'waba.muted'}
                        flex="1"
                    >
                        <MessageSquare size={19} />
                        <Text fontSize="10px" fontWeight={isCommunityActive ? '800' : '600'}>
                            커뮤니티
                        </Text>
                    </Box>

                    {/* 3) 중앙 글쓰기 FAB */}
                    <Box
                        as="button"
                        onClick={() => {
                            if (!isLogin) {
                                toaster.create({ title: '로그인이 필요한 서비스입니다.', type: 'error' });
                            } else {
                                router.push('/post/register');
                            }
                        }}
                        w="38px"
                        h="38px"
                        borderRadius="full"
                        bg="waba.charcoal"
                        color="white"
                        display="flex"
                        alignItems="center"
                        justifyContent="center"
                        boxShadow="0 4px 14px rgba(26, 28, 30, 0.3)"
                        _hover={{ bg: 'waba.purple' }}
                        mx={1}
                        flexShrink={0}
                    >
                        <Plus size={20} strokeWidth={2.5} />
                    </Box>

                    {/* 4) 스토어 */}
                    <Box
                        as="button"
                        onClick={handleStoreClick}
                        display="flex"
                        flexDirection="column"
                        alignItems="center"
                        gap={0.5}
                        color={isStoreActive ? 'waba.purple' : 'waba.muted'}
                        flex="1"
                    >
                        <ShoppingCart size={19} />
                        <Text fontSize="10px" fontWeight={isStoreActive ? '800' : '600'}>
                            스토어
                        </Text>
                    </Box>

                    {/* 5) 마이 */}
                    <Box
                        as="button"
                        onClick={() => {
                            if (isLogin) {
                                router.push('/member/mypage');
                            } else {
                                toaster.create({ title: '로그인이 필요합니다.', type: 'info' });
                            }
                        }}
                        display="flex"
                        flexDirection="column"
                        alignItems="center"
                        gap={0.5}
                        color={pathname.startsWith('/member') ? 'waba.purple' : 'waba.muted'}
                        flex="1"
                    >
                        <UserIconLucide size={19} />
                        <Text fontSize="10px" fontWeight={pathname.startsWith('/member') ? '800' : '600'}>
                            마이
                        </Text>
                    </Box>
                </Flex>
            </Box>

            {/* ───────────────────────────────────────────────────────────── */}
            {/* 3. 모바일 사이드 드로어 / 메뉴 다이얼로그                       */}
            {/* ───────────────────────────────────────────────────────────── */}
            <Dialog.Root open={mobileMenuOpen} onOpenChange={(e) => setMobileMenuOpen(e.open)}>
                <Portal>
                    <Dialog.Backdrop bg="blackAlpha.400" backdropFilter="blur(6px)" />
                    <Dialog.Positioner p={4}>
                        <Dialog.Content borderRadius="28px" p={5} maxW="340px">
                            <Flex justify="space-between" align="center" mb={4}>
                                <HStack gap={1.5}>
                                    <Text fontSize="18px" fontWeight="900" color="waba.charcoal">
                                        WABA
                                    </Text>
                                    <Box w="6px" h="6px" borderRadius="full" bg="waba.purple" />
                                </HStack>
                                <Dialog.CloseTrigger asChild>
                                    <CloseButton size="sm" borderRadius="full" />
                                </Dialog.CloseTrigger>
                            </Flex>

                            <VStack align="stretch" gap={3}>
                                <Button
                                    variant="ghost"
                                    justifyContent="flex-start"
                                    onClick={() => {
                                        router.push('/');
                                        setMobileMenuOpen(false);
                                    }}
                                >
                                    🏠 홈
                                </Button>
                                <Button
                                    variant="ghost"
                                    justifyContent="flex-start"
                                    onClick={() => {
                                        router.push('/board/all');
                                        setMobileMenuOpen(false);
                                    }}
                                >
                                    💬 커뮤니티 (전체 피드)
                                </Button>
                                <Button
                                    variant="ghost"
                                    justifyContent="flex-start"
                                    onClick={(e) => {
                                        setMobileMenuOpen(false);
                                        handleStoreClick(e);
                                    }}
                                >
                                    🛍️ 스토어 (큐레이션 샵)
                                </Button>
                                <Separator borderColor="waba.border" my={1} />
                                <Button
                                    bg="waba.charcoal"
                                    color="white"
                                    borderRadius="full"
                                    _hover={{ bg: 'waba.purple' }}
                                    onClick={() => {
                                        setMobileMenuOpen(false);
                                        router.push('/post/register');
                                    }}
                                >
                                    <Plus size={16} /> 공간·룩북 올리기
                                </Button>
                            </VStack>
                        </Dialog.Content>
                    </Dialog.Positioner>
                </Portal>
            </Dialog.Root>

            {/* ───────────────────────────────────────────────────────────── */}
            {/* 4. 스포트라이트 검색 오버레이 모달                             */}
            {/* ───────────────────────────────────────────────────────────── */}
            <SearchModal
                open={isSearchOpen}
                onOpenChange={setIsSearchOpen}
            />
        </>
    );
}
