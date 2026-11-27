'use client'

import React, { useEffect, useState } from 'react';
import {
    Box,
    Button,
    CloseButton,
    Dialog,
    Flex,
    HStack,
    IconButton,
    Portal,
    Separator,
    Text,
    VStack,
} from '@chakra-ui/react';
import {
    LuHouse,
    LuLogOut,
    LuMegaphone,
    LuMenu,
    LuMessageSquare,
    LuMoon,
    LuNotebookPen,
    LuPlus,
    LuSearch,
    LuSun,
    LuUser,
} from 'react-icons/lu';
import { usePathname, useRouter } from 'next/navigation';
import { clearAuthSession, getUserInfo, isAuthenticated } from '@/utils/authUtils';
import axiosInstance from '@/utils/api';
import SearchModal from './SearchModal';
import MemberModal from '../member/MemberModal';
import UserAvatar from './UserAvatar';
import { toaster } from '@/components/ui/toaster';

export default function SideBarShell({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();

    const [isLogin, setIsLogin] = useState(false);
    const [userProfile, setUserProfile] = useState<{
        nickname?: string;
        email?: string;
        profile_image_url?: string | null;
        role?: string;
    } | null>(null);
    const [themeMode, setThemeMode] = useState<'light' | 'dark'>('light');
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    useEffect(() => {
        const savedTheme = (typeof window !== 'undefined' && localStorage.getItem('waba_theme')) as 'light' | 'dark' | null;
        const initialTheme = savedTheme === 'dark' ? 'dark' : 'light';
        setThemeMode(initialTheme);
        document.documentElement.setAttribute('data-theme', initialTheme);

        const syncAuth = async () => {
            const authed = isAuthenticated();
            setIsLogin(authed);
            if (!authed) {
                setUserProfile(null);
                return;
            }
            const cached = getUserInfo();
            setUserProfile(cached || null);
            try {
                const res = await axiosInstance.get('/user/profile');
                const profile = res.data?.profile ?? res.data?.user;
                setUserProfile(profile || cached || null);
            } catch {
                // keep cached
            }
        };

        syncAuth();
        window.addEventListener('auth-change', syncAuth);
        return () => {
            window.removeEventListener('auth-change', syncAuth);
        };
    }, []);

    const handleLogout = () => {
        clearAuthSession();
        setMobileMenuOpen(false);
        toaster.create({ title: '로그아웃되었습니다.', type: 'info' });
    };

    const toggleTheme = () => {
        const nextTheme = themeMode === 'light' ? 'dark' : 'light';
        setThemeMode(nextTheme);
        document.documentElement.setAttribute('data-theme', nextTheme);
        if (typeof window !== 'undefined') {
            localStorage.setItem('waba_theme', nextTheme);
        }
    };

    const navItems = [
        {
            key: 'home',
            label: '홈',
            href: '/',
            icon: LuHouse,
            active: pathname === '/',
        },
        {
            key: 'comm',
            label: '커뮤니티',
            href: '/board/all',
            icon: LuMessageSquare,
            active:
                pathname.startsWith('/board') ||
                pathname.startsWith('/post') ||
                pathname.startsWith('/search'),
        },
        {
            key: 'book',
            label: '건강 수첩',
            href: '/notebook',
            icon: LuNotebookPen,
            active: pathname.startsWith('/notebook'),
        },
        {
            key: 'notices',
            label: '공지 · 이벤트',
            mobileLabel: '공지',
            href: '/notices',
            icon: LuMegaphone,
            active: pathname.startsWith('/notices'),
        },
        {
            key: 'user',
            label: '마이페이지',
            href: '/member/mypage',
            icon: LuUser,
            active: pathname.startsWith('/member'),
        },
    ];

    const handleNavClick = (href: string) => {
        setMobileMenuOpen(false);
        router.push(href);
    };

    const handleUploadClick = () => {
        setMobileMenuOpen(false);
        if (!isLogin) {
            toaster.create({ title: '로그인이 필요한 서비스입니다.', type: 'info' });
            return;
        }
        router.push('/post/register');
    };

    const UserFooterCard = () => (
        <VStack align="stretch" gap={2.5} pt={3} borderTop="1px solid" borderColor="var(--waba-line)">
            <Button
                size="sm"
                variant="outline"
                borderRadius="full"
                borderColor="var(--waba-line)"
                bg="var(--waba-surface)"
                color="var(--waba-ink-2)"
                fontSize="12px"
                fontWeight="700"
                h="34px"
                onClick={toggleTheme}
                gap={1.5}
            >
                {themeMode === 'light' ? <LuMoon size={14} /> : <LuSun size={14} />}
                {themeMode === 'light' ? '다크 모드' : '라이트 모드'}
            </Button>

            {isLogin ? (
                <HStack
                    p={2.5}
                    borderRadius="14px"
                    bg="var(--waba-surface)"
                    border="1px solid"
                    borderColor="var(--waba-line)"
                    justify="space-between"
                    gap={2}
                >
                    <HStack
                        gap={2.5}
                        minW={0}
                        flex={1}
                        cursor="pointer"
                        onClick={() => handleNavClick('/member/mypage')}
                    >
                        <UserAvatar
                            src={userProfile?.profile_image_url}
                            alt={userProfile?.nickname || '회원'}
                            size="xs"
                            fallbackType="user"
                        />
                        <Box minW={0} flex={1}>
                            <Text fontSize="12px" fontWeight="700" color="var(--waba-ink)" truncate>
                                {userProfile?.nickname || '회원'}
                            </Text>
                            <Text fontSize="10.5px" color="var(--waba-ink-3)" truncate>
                                {userProfile?.email || ''}
                            </Text>
                        </Box>
                    </HStack>
                    <IconButton
                        aria-label="로그아웃"
                        size="xs"
                        variant="ghost"
                        rounded="full"
                        flexShrink={0}
                        color="var(--waba-ink-3)"
                        _hover={{ color: '#EF4444', bg: 'var(--waba-card)' }}
                        onClick={handleLogout}
                    >
                        <LuLogOut size={14} />
                    </IconButton>
                </HStack>
            ) : (
                <Box
                    p={2.5}
                    borderRadius="14px"
                    bg="var(--waba-surface)"
                    border="1px solid"
                    borderColor="var(--waba-line)"
                >
                    <MemberModal />
                </Box>
            )}
        </VStack>
    );

    return (
        <Flex
            minH="100vh"
            w="100%"
            maxW="100%"
            overflowX="clip"
            bg="var(--waba-bg)"
            color="var(--waba-ink)"
            direction={{ base: 'column', lg: 'row' }}
        >
            {/* 1. Desktop / Tablet Landscape Left Sidebar (lg+) */}
            <Box
                as="aside"
                display={{ base: 'none', lg: 'flex' }}
                w="236px"
                flexShrink={0}
                h="100vh"
                position="sticky"
                top={0}
                borderRight="1px solid"
                borderColor="var(--waba-line)"
                bg="var(--waba-bg)"
                px="18px"
                pt="26px"
                pb="22px"
                flexDirection="column"
                justifyContent="space-between"
                zIndex={30}
            >
                <Box>
                    {/* Logo WABA. */}
                    <HStack
                        gap="6px"
                        px="10px"
                        cursor="pointer"
                        onClick={() => handleNavClick('/')}
                    >
                        <Text
                            fontSize="22px"
                            fontWeight="800"
                            letterSpacing="-0.04em"
                            color="var(--waba-ink)"
                        >
                            WABA
                        </Text>
                        <Box w="7px" h="7px" borderRadius="full" bg="#6338A9" />
                    </HStack>

                    {/* 5 Navigation Items */}
                    <VStack as="nav" align="stretch" gap="4px" mt="26px">
                        {navItems.map((item) => {
                            const IconComp = item.icon;
                            return (
                                <HStack
                                    key={item.key}
                                    as="button"
                                    onClick={() => handleNavClick(item.href)}
                                    px="12px"
                                    py="11px"
                                    borderRadius="13px"
                                    gap="11px"
                                    fontSize="14px"
                                    fontWeight={item.active ? '700' : '600'}
                                    bg={item.active ? 'var(--waba-purple-soft)' : 'transparent'}
                                    color={item.active ? 'var(--waba-purple-text)' : '#4E4E58'}
                                    _hover={{
                                        bg: item.active ? 'var(--waba-purple-soft)' : 'var(--waba-surface)',
                                    }}
                                    transition="all 0.15s ease"
                                    cursor="pointer"
                                    textAlign="left"
                                >
                                    <IconComp size={18} />
                                    <Text color={item.active ? 'var(--waba-purple-text)' : 'var(--waba-ink-2)'}>
                                        {item.label}
                                    </Text>
                                </HStack>
                            );
                        })}
                    </VStack>

                    {/* + 올리기 CTA */}
                    <Button
                        w="100%"
                        mt="18px"
                        h="44px"
                        borderRadius="14px"
                        bg="#6338A9"
                        color="#FFFFFF"
                        fontSize="14px"
                        fontWeight="700"
                        boxShadow="0 8px 20px rgba(99, 56, 169, 0.28)"
                        _hover={{ bg: '#522B8F' }}
                        onClick={handleUploadClick}
                        gap="6px"
                    >
                        <LuPlus size={16} />
                        올리기
                    </Button>
                </Box>

                {/* Bottom: User Footer Card */}
                <UserFooterCard />
            </Box>

            {/* 2. Mobile & Tablet Portrait Top Bar (base ~ md) */}
            <Flex
                as="header"
                display={{ base: 'flex', lg: 'none' }}
                position="sticky"
                top={0}
                zIndex={45}
                h="56px"
                px={{ base: 4, md: 6 }}
                align="center"
                justify="space-between"
                bg="var(--waba-bg)"
                borderBottom="1px solid"
                borderColor="var(--waba-line)"
                w="100%"
                minW={0}
            >
                <HStack gap="6px" cursor="pointer" onClick={() => handleNavClick('/')} flexShrink={0}>
                    <Text fontSize="20px" fontWeight="800" letterSpacing="-0.04em" color="var(--waba-ink)">
                        WABA
                    </Text>
                    <Box w="6px" h="6px" borderRadius="full" bg="#6338A9" />
                </HStack>

                <HStack gap={1.5} flexShrink={0}>
                    <IconButton
                        aria-label="검색"
                        size="sm"
                        borderRadius="full"
                        variant="ghost"
                        color="var(--waba-ink-2)"
                        onClick={() => setIsSearchOpen(true)}
                    >
                        <LuSearch size={18} />
                    </IconButton>
                    <IconButton
                        aria-label="테마 전환"
                        size="sm"
                        borderRadius="full"
                        variant="ghost"
                        color="var(--waba-ink-2)"
                        onClick={toggleTheme}
                    >
                        {themeMode === 'light' ? <LuMoon size={18} /> : <LuSun size={18} />}
                    </IconButton>
                    <Button
                        size="xs"
                        h="32px"
                        px={3}
                        borderRadius="full"
                        bg="#6338A9"
                        color="white"
                        fontSize="12px"
                        fontWeight="700"
                        onClick={handleUploadClick}
                        gap={1}
                    >
                        <LuPlus size={14} />
                        올리기
                    </Button>
                    <IconButton
                        aria-label="메뉴 열기"
                        size="sm"
                        borderRadius="full"
                        variant="ghost"
                        color="var(--waba-ink)"
                        onClick={() => setMobileMenuOpen(true)}
                    >
                        <LuMenu size={20} />
                    </IconButton>
                </HStack>
            </Flex>

            {/* 3. Main Content Area */}
            <Box
                as="main"
                flex="1"
                minW={0}
                w="100%"
                bg="var(--waba-bg)"
                pb={{ base: '72px', md: 0 }}
            >
                {children}
            </Box>

            {/* 4. Mobile Fixed Bottom Tab Bar (base only) */}
            <Flex
                display={{ base: 'flex', md: 'none' }}
                position="fixed"
                bottom={0}
                left={0}
                right={0}
                zIndex={40}
                h="60px"
                bg="var(--waba-bg)"
                borderTop="1px solid"
                borderColor="var(--waba-line)"
                align="center"
                justify="space-around"
                px={2}
            >
                {navItems.map((item) => {
                    const IconComp = item.icon;
                    return (
                        <VStack
                            key={item.key}
                            as="button"
                            gap="2px"
                            flex="1"
                            py={1}
                            color={item.active ? 'var(--waba-purple-text)' : 'var(--waba-ink-3)'}
                            onClick={() => handleNavClick(item.href)}
                            cursor="pointer"
                        >
                            <IconComp size={18} />
                            <Text fontSize="10px" fontWeight={item.active ? '800' : '600'}>
                                {'mobileLabel' in item && item.mobileLabel ? item.mobileLabel : item.label}
                            </Text>
                        </VStack>
                    );
                })}
            </Flex>

            {/* 5. Mobile & Tablet Drawer Menu */}
            <Dialog.Root open={mobileMenuOpen} onOpenChange={(e) => setMobileMenuOpen(e.open)}>
                <Portal>
                    <Dialog.Backdrop bg="blackAlpha.500" backdropFilter="blur(6px)" />
                    <Dialog.Positioner p={4}>
                        <Dialog.Content borderRadius="24px" p={5} maxW="340px" bg="var(--waba-card)" color="var(--waba-ink)">
                            <Flex justify="space-between" align="center" mb={4}>
                                <HStack gap="6px">
                                    <Text fontSize="20px" fontWeight="800" letterSpacing="-0.04em">
                                        WABA
                                    </Text>
                                    <Box w="6px" h="6px" borderRadius="full" bg="#6338A9" />
                                </HStack>
                                <Dialog.CloseTrigger asChild>
                                    <CloseButton size="sm" borderRadius="full" color="var(--waba-ink)" _hover={{ bg: 'var(--waba-line)' }} />
                                </Dialog.CloseTrigger>
                            </Flex>

                            <VStack align="stretch" gap={1.5} mb={4}>
                                {navItems.map((item) => {
                                    const IconComp = item.icon;
                                    return (
                                        <HStack
                                            key={item.key}
                                            as="button"
                                            onClick={() => handleNavClick(item.href)}
                                            px="12px"
                                            py="10px"
                                            borderRadius="12px"
                                            gap="10px"
                                            fontSize="14px"
                                            fontWeight={item.active ? '700' : '600'}
                                            bg={item.active ? 'var(--waba-purple-soft)' : 'transparent'}
                                            color={item.active ? 'var(--waba-purple-text)' : 'var(--waba-ink-2)'}
                                            textAlign="left"
                                        >
                                            <IconComp size={18} />
                                            <Text>{item.label}</Text>
                                        </HStack>
                                    );
                                })}
                            </VStack>

                            <Separator borderColor="var(--waba-line)" mb={4} />
                            <UserFooterCard />
                        </Dialog.Content>
                    </Dialog.Positioner>
                </Portal>
            </Dialog.Root>

            {/* 6. Search Modal */}
            <SearchModal open={isSearchOpen} onOpenChange={setIsSearchOpen} />
        </Flex>
    );
}
