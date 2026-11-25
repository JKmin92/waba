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
import { isAuthenticated } from '@/utils/authUtils';
import axiosInstance from '@/utils/api';
import SearchModal from './SearchModal';
import MemberModal from '../member/MemberModal';
import UserAvatar from './UserAvatar';
import { toaster } from '@/components/ui/toaster';

interface PetSummary {
    id: string | number;
    name: string;
    species?: string;
    breed?: string;
    latest_weight_kg?: number | string | null;
    current_avatar_url?: string | null;
}

export default function SideBarShell({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();

    const [isLogin, setIsLogin] = useState(false);
    const [pets, setPets] = useState<PetSummary[]>([]);
    const [primaryPet, setPrimaryPet] = useState<PetSummary | null>(null);
    const [autoJournalEnabled, setAutoJournalEnabled] = useState(false);
    const [latestHistory, setLatestHistory] = useState<{
        title?: string;
        pet_id?: number | string;
        pet?: PetSummary;
        pets?: PetSummary[];
    } | null>(null);
    const [latestHistoryTitle, setLatestHistoryTitle] = useState<string | null>(null);
    const [themeMode, setThemeMode] = useState<'light' | 'dark'>('light');
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    useEffect(() => {
        const savedTheme = (typeof window !== 'undefined' && localStorage.getItem('waba_theme')) as 'light' | 'dark' | null;
        const initialTheme = savedTheme === 'dark' ? 'dark' : 'light';
        setThemeMode(initialTheme);
        document.documentElement.setAttribute('data-theme', initialTheme);

        const syncAuthAndPet = async () => {
            const authed = isAuthenticated();
            setIsLogin(authed);
            if (!authed) {
                setPets([]);
                setPrimaryPet(null);
                setAutoJournalEnabled(false);
                setLatestHistory(null);
                setLatestHistoryTitle(null);
                return;
            }
            const [petsRes, settingRes, histRes] = await Promise.allSettled([
                axiosInstance.get('/user/pets'),
                axiosInstance.get('/user/settings/auto-journal'),
                axiosInstance.get('/user/histories', { params: { limit: 1 } }),
            ]);
            let loadedPets: PetSummary[] = [];
            if (petsRes.status === 'fulfilled') {
                loadedPets = Array.isArray(petsRes.value.data) ? petsRes.value.data : petsRes.value.data?.pets || [];
                setPets(loadedPets);
                setPrimaryPet(loadedPets[0] || null);
            } else {
                setPets([]);
                setPrimaryPet(null);
            }
            if (settingRes.status === 'fulfilled') {
                const val = settingRes.value.data?.auto_journal_enabled ?? settingRes.value.data?.enabled;
                setAutoJournalEnabled(Boolean(val));
            } else {
                setAutoJournalEnabled(false);
            }
            if (histRes.status === 'fulfilled') {
                const firstHist = histRes.value.data?.histories?.[0] || null;
                setLatestHistory(firstHist);
                setLatestHistoryTitle(firstHist?.title || null);
            } else {
                setLatestHistory(null);
                setLatestHistoryTitle(null);
            }
        };

        syncAuthAndPet();
        window.addEventListener('auth-change', syncAuthAndPet);
        window.addEventListener('history-change', syncAuthAndPet);
        return () => {
            window.removeEventListener('auth-change', syncAuthAndPet);
            window.removeEventListener('history-change', syncAuthAndPet);
        };
    }, []);

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

    const PetMiniWidget = () => (
        <Box
            bg="var(--waba-surface)"
            border="1px solid"
            borderColor="var(--waba-line)"
            borderRadius="18px"
            p="14px"
            display="flex"
            flexDirection="column"
            gap="10px"
        >
            {isLogin && pets.length === 1 && primaryPet ? (
                <>
                    <HStack
                        gap="10px"
                        cursor="pointer"
                        onClick={() => handleNavClick('/member/mypage')}
                    >
                        <UserAvatar
                            src={primaryPet.current_avatar_url}
                            alt={primaryPet.name}
                            size="sm"
                            fallbackType="pet"
                            border="2px solid"
                            borderColor="var(--waba-card)"
                        />
                        <Box minW={0} flex="1">
                            <HStack gap={1.5}>
                                <Text fontSize="13px" fontWeight="800" color="var(--waba-ink)" truncate>
                                    {primaryPet.name}
                                </Text>
                                {primaryPet.latest_weight_kg ? (
                                    <Text fontSize="11px" fontWeight="600" color="var(--waba-ink-3)" flexShrink={0}>
                                        {Number(primaryPet.latest_weight_kg).toFixed(1)}kg
                                    </Text>
                                ) : null}
                            </HStack>
                            {autoJournalEnabled && (
                                <Text fontSize="11px" color="var(--waba-purple-text)" fontWeight="600" truncate>
                                    ✓ AI 건강 수첩 연동 중
                                </Text>
                            )}
                        </Box>
                    </HStack>
                    <Box
                        bg="var(--waba-card)"
                        borderRadius="10px"
                        px="10px"
                        py="7px"
                        fontSize="11px"
                        color="var(--waba-ink-2)"
                        border="1px solid"
                        borderColor="var(--waba-line)"
                        cursor="pointer"
                        onClick={() => handleNavClick('/member/mypage')}
                        truncate
                    >
                        {latestHistoryTitle ? (
                            <>최근: <strong style={{ color: 'var(--waba-ink)' }}>{latestHistoryTitle}</strong></>
                        ) : (
                            '아직 수첩 기록이 없어요'
                        )}
                    </Box>
                </>
            ) : isLogin && pets.length >= 2 ? (
                (() => {
                    const matchedByHistory = latestHistory
                        ? latestHistory.pets && latestHistory.pets.length > 0
                            ? latestHistory.pets
                            : latestHistory.pet
                                ? [latestHistory.pet]
                                : latestHistory.pet_id
                                    ? pets.filter((p) => String(p.id) === String(latestHistory.pet_id))
                                    : pets
                        : pets;
                    const displayPets = matchedByHistory.length > 0 ? matchedByHistory : pets;
                    const namesText = displayPets.map((p) => p.name).join(latestHistory ? ', ' : ' · ');

                    return (
                        <>
                            <HStack
                                gap="10px"
                                mb="10px"
                                cursor="pointer"
                                onClick={() => handleNavClick('/member/mypage')}
                            >
                                {displayPets.length === 1 ? (
                                    <UserAvatar
                                        src={displayPets[0].current_avatar_url}
                                        alt={displayPets[0].name}
                                        size="sm"
                                        fallbackType="pet"
                                        border="2px solid"
                                        borderColor="var(--waba-card)"
                                    />
                                ) : (
                                    <HStack gap={0} flexShrink={0}>
                                        {displayPets.slice(0, 3).map((p, idx) => (
                                            <Box
                                                key={String(p.id)}
                                                position="relative"
                                                zIndex={idx}
                                                ml={idx > 0 ? '-8px' : 0}
                                                w="26px"
                                                h="26px"
                                                borderRadius="full"
                                                border="2px solid var(--waba-surface)"
                                                overflow="hidden"
                                                flexShrink={0}
                                            >
                                                <UserAvatar
                                                    src={p.current_avatar_url}
                                                    alt={p.name}
                                                    size="xs"
                                                    fallbackType="pet"
                                                    w="full"
                                                    h="full"
                                                />
                                            </Box>
                                        ))}
                                    </HStack>
                                )}
                                <Box minW={0} flex="1">
                                    <Text fontSize="13px" fontWeight="800" color="var(--waba-ink)" truncate>
                                        {namesText}
                                    </Text>
                                    {autoJournalEnabled && (
                                        <Text fontSize="11px" color="var(--waba-purple-text)" fontWeight="600" truncate>
                                            ✓ AI 건강 수첩 연동 중
                                        </Text>
                                    )}
                                </Box>
                            </HStack>
                            <Box
                                bg="var(--waba-card)"
                                borderRadius="10px"
                                px="10px"
                                py="7px"
                                fontSize="11px"
                                color="var(--waba-ink-2)"
                                border="1px solid"
                                borderColor="var(--waba-line)"
                                cursor="pointer"
                                onClick={() => handleNavClick('/member/mypage')}
                                truncate
                            >
                                {latestHistory?.title ? (
                                    <>최근: <strong style={{ color: 'var(--waba-ink)' }}>{latestHistory.title}</strong></>
                                ) : (
                                    '아직 수첩 기록이 없어요'
                                )}
                            </Box>
                        </>
                    );
                })()
            ) : isLogin ? (
                <Box cursor="pointer" onClick={() => handleNavClick('/member/mypage')}>
                    <Text fontSize="12px" fontWeight="700" color="var(--waba-ink)" mb={1}>
                        🐾 내 반려동물 수첩
                    </Text>
                    <Text fontSize="11px" color="var(--waba-ink-3)" lineHeight="1.45">
                        아이를 등록하고 AI 건강 기록을 시작해 보세요.
                    </Text>
                </Box>
            ) : (
                <VStack align="stretch" gap={2}>
                    <Text fontSize="12px" fontWeight="700" color="var(--waba-ink)">
                        내 반려동물 미니 수첩
                    </Text>
                    <Text fontSize="11px" color="var(--waba-ink-3)" lineHeight="1.45">
                        로그인 후 우리 아이 건강·산책 기록을 한눈에 확인하세요.
                    </Text>
                    <Box pt={0.5}>
                        <MemberModal />
                    </Box>
                </VStack>
            )}
        </Box>
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

                {/* Bottom: Pet Mini Widget + Light/Dark Toggle */}
                <VStack align="stretch" gap="10px">
                    <PetMiniWidget />
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
                </VStack>
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
                                {item.label}
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
                            <PetMiniWidget />
                        </Dialog.Content>
                    </Dialog.Positioner>
                </Portal>
            </Dialog.Root>

            {/* 6. Search Modal */}
            <SearchModal open={isSearchOpen} onOpenChange={setIsSearchOpen} />
        </Flex>
    );
}
