'use client'

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    Box,
    Button,
    CloseButton,
    Drawer,
    Flex,
    HStack,
    IconButton,
    Input,
    Portal,
    Spinner,
    Text,
    VStack,
} from '@chakra-ui/react';
import {
    LuActivity,
    LuArrowUpRight,
    LuBookOpen,
    LuClipboardList,
    LuFileText,
    LuFlag,
    LuGlobe,
    LuLayoutDashboard,
    LuLogOut,
    LuMegaphone,
    LuMenu,
    LuMoon,
    LuShieldAlert,
    LuShieldCheck,
    LuSun,
    LuUserCog,
    LuUsers,
} from 'react-icons/lu';
import axiosInstance from '@/utils/api';
import { clearAuthSession, isAuthenticated, setAuthSession } from '@/utils/authUtils';
import { toaster } from '@/components/ui/toaster';
import UserAvatar from '../(main)/common/UserAvatar';
import { AdminContext, AdminUser } from './AdminContext';

interface AdminShellProps {
    children: React.ReactNode;
}

const MENU_GROUPS = [
    {
        group: '운영 현황',
        items: [
            { label: '대시보드 총괄', href: '/admin', icon: LuLayoutDashboard },
        ],
    },
    {
        group: '커뮤니티 관리',
        items: [
            { label: '회원 · 반려동물', href: '/admin/users', icon: LuUsers },
            { label: '게시글 · 댓글 · 큐레이션', href: '/admin/posts', icon: LuFileText },
            { label: '건강 수첩 · AI 분석', href: '/admin/notebooks', icon: LuBookOpen },
            { label: '신고 센터', href: '/admin/reports', icon: LuFlag, badgeKey: 'reports' as const },
            { label: '수의사 검증 · 질병', href: '/admin/verifications', icon: LuShieldCheck },
        ],
    },
    {
        group: '운영 설정',
        items: [
            { label: '게시판 관리', href: '/admin/boards', icon: LuActivity },
            { label: '제휴 도메인 관리', href: '/admin/affiliate-domains', icon: LuGlobe },
            { label: '공지 · 배너', href: '/admin/notices', icon: LuMegaphone },
            { label: '감사 로그', href: '/admin/audit-logs', icon: LuClipboardList, superOnly: true },
            { label: '관리자 계정 관리', href: '/admin/admins', icon: LuUserCog, superOnly: true },
        ],
    },
];

export default function AdminShell({ children }: AdminShellProps) {
    const pathname = usePathname();
    const [authState, setAuthState] = useState<'loading' | 'authorized' | 'unauthenticated' | 'forbidden'>('loading');
    const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
    const [pendingReportCount, setPendingReportCount] = useState(0);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [themeMode, setThemeMode] = useState<'light' | 'dark'>('light');

    // Login form state
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loginLoading, setLoginLoading] = useState(false);

    const verifyAdmin = async () => {
        if (!isAuthenticated()) {
            setAuthState('unauthenticated');
            return;
        }
        setAuthState('loading');
        try {
            const res = await axiosInstance.get('/admin/me');
            setAdminUser(res.data?.admin || res.data?.user || null);
            setPendingReportCount(Number(res.data?.pendingReportCount ?? 0));
            setAuthState('authorized');
        } catch (err: any) {
            const status = err?.response?.status;
            if (status === 403) {
                setAuthState('forbidden');
            } else {
                setAuthState('unauthenticated');
            }
        }
    };

    useEffect(() => {
        const savedTheme = (typeof window !== 'undefined' && localStorage.getItem('waba_theme')) as 'light' | 'dark' | null;
        const initialTheme = savedTheme === 'dark' ? 'dark' : 'light';
        setThemeMode(initialTheme);
        document.documentElement.setAttribute('data-theme', initialTheme);

        verifyAdmin();
    }, []);

    const toggleTheme = () => {
        const nextTheme = themeMode === 'dark' ? 'light' : 'dark';
        setThemeMode(nextTheme);
        document.documentElement.setAttribute('data-theme', nextTheme);
        if (typeof window !== 'undefined') {
            localStorage.setItem('waba_theme', nextTheme);
        }
    };

    const handleLogout = () => {
        clearAuthSession();
        setAdminUser(null);
        setAuthState('unauthenticated');
        setEmail('');
        setPassword('');
    };

    const handleAdminLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim() || !password) {
            toaster.create({ title: '이메일과 비밀번호를 입력해주세요.', type: 'warning' });
            return;
        }
        setLoginLoading(true);
        try {
            const res = await axiosInstance.post('/user/login', {
                email: email.trim(),
                password,
            });
            const accessToken = res.data?.accessToken;
            const refreshToken = res.data?.refreshToken;
            const user = res.data?.user;
            if (accessToken && user) {
                setAuthSession(accessToken, refreshToken, user);
                await verifyAdmin();
            } else {
                toaster.create({ title: '로그인 응답이 올바르지 않습니다.', type: 'error' });
            }
        } catch (err: any) {
            toaster.create({
                title: err?.response?.data?.message || '로그인에 실패했습니다.',
                type: 'error',
            });
        } finally {
            setLoginLoading(false);
        }
    };

    if (authState === 'loading') {
        return (
            <Flex minH="100vh" bg="var(--waba-surface)" align="center" justify="center" direction="column" gap={3}>
                <Spinner size="lg" color="#6338A9" />
                <Text fontSize="13px" fontWeight="600" color="var(--waba-ink-3)">
                    관리자 세션을 확인하고 있습니다...
                </Text>
            </Flex>
        );
    }

    if (authState === 'unauthenticated') {
        return (
            <Flex minH="100vh" bg="var(--waba-surface)" align="center" justify="center" p={4}>
                <Box
                    w="full"
                    maxW="400px"
                    bg="var(--waba-card)"
                    border="1px solid"
                    borderColor="var(--waba-line)"
                    borderRadius="24px"
                    p={{ base: 6, md: 8 }}
                    boxShadow="0 16px 40px rgba(0, 0, 0, 0.08)"
                >
                    <VStack align="stretch" gap={5}>
                        <HStack justify="space-between" align="center">
                            <HStack gap={2}>
                                <Text fontSize="22px" fontWeight="900" letterSpacing="-0.04em" color="var(--waba-ink)">
                                    WABA.
                                </Text>
                                <Box
                                    bg="var(--waba-purple-soft)"
                                    color="var(--waba-purple-text)"
                                    fontSize="10px"
                                    fontWeight="800"
                                    px={2.5}
                                    py={0.5}
                                    borderRadius="999px"
                                >
                                    ADMIN
                                </Box>
                            </HStack>
                            <IconButton
                                aria-label="테마 전환"
                                size="xs"
                                variant="ghost"
                                rounded="full"
                                onClick={toggleTheme}
                            >
                                {themeMode === 'dark' ? <LuSun size={15} /> : <LuMoon size={15} />}
                            </IconButton>
                        </HStack>

                        <Box>
                            <Text fontSize="17px" fontWeight="800" color="var(--waba-ink)">
                                관리자 로그인
                            </Text>
                            <Text fontSize="12.5px" color="var(--waba-ink-3)" mt={1}>
                                WABA 운영 대시보드 접근을 위해 관리자 계정으로 로그인하세요.
                            </Text>
                        </Box>

                        <form onSubmit={handleAdminLogin}>
                            <VStack gap={3} align="stretch">
                                <Box>
                                    <Text fontSize="12px" fontWeight="700" color="var(--waba-ink-2)" mb={1}>
                                        이메일
                                    </Text>
                                    <Input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="admin@wabami.com"
                                        h="42px"
                                        borderRadius="14px"
                                        bg="var(--waba-surface)"
                                        border="1px solid"
                                        borderColor="var(--waba-line)"
                                        color="var(--waba-ink)"
                                        fontSize="13px"
                                    />
                                </Box>
                                <Box>
                                    <Text fontSize="12px" fontWeight="700" color="var(--waba-ink-2)" mb={1}>
                                        비밀번호
                                    </Text>
                                    <Input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="••••••••"
                                        h="42px"
                                        borderRadius="14px"
                                        bg="var(--waba-surface)"
                                        border="1px solid"
                                        borderColor="var(--waba-line)"
                                        color="var(--waba-ink)"
                                        fontSize="13px"
                                    />
                                </Box>
                                <Button
                                    type="submit"
                                    h="44px"
                                    mt={2}
                                    borderRadius="14px"
                                    bg="#6338A9"
                                    color="#FFFFFF"
                                    _hover={{ bg: '#522B8F' }}
                                    fontSize="14px"
                                    fontWeight="700"
                                    loading={loginLoading}
                                >
                                    관리자 로그인
                                </Button>
                            </VStack>
                        </form>

                        <Link href="/">
                            <Button
                                w="full"
                                size="sm"
                                variant="ghost"
                                color="var(--waba-ink-3)"
                                fontSize="12px"
                            >
                                서비스 홈으로 돌아가기
                            </Button>
                        </Link>
                    </VStack>
                </Box>
            </Flex>
        );
    }

    if (authState === 'forbidden') {
        return (
            <Flex minH="100vh" bg="var(--waba-surface)" align="center" justify="center" p={4}>
                <Box
                    w="full"
                    maxW="420px"
                    bg="var(--waba-card)"
                    border="1px solid"
                    borderColor="var(--waba-line)"
                    borderRadius="24px"
                    p={{ base: 6, md: 8 }}
                    textAlign="center"
                >
                    <Flex
                        w="52px"
                        h="52px"
                        mx="auto"
                        mb={4}
                        borderRadius="full"
                        bg="rgba(239, 68, 68, 0.12)"
                        color="#EF4444"
                        align="center"
                        justify="center"
                    >
                        <LuShieldAlert size={24} />
                    </Flex>
                    <Text fontSize="18px" fontWeight="800" color="var(--waba-ink)" mb={2}>
                        접근 권한이 없습니다
                    </Text>
                    <Text fontSize="13px" color="var(--waba-ink-3)" mb={6}>
                        관리자 권한(ADMIN)이 필요한 페이지입니다.
                    </Text>
                    <VStack gap={2.5} align="stretch">
                        <Link href="/">
                            <Button
                                w="full"
                                h="42px"
                                borderRadius="14px"
                                bg="#6338A9"
                                color="#FFFFFF"
                                _hover={{ bg: '#522B8F' }}
                                fontWeight="700"
                            >
                                홈으로 돌아가기
                            </Button>
                        </Link>
                        <Button
                            w="full"
                            h="42px"
                            borderRadius="14px"
                            variant="outline"
                            borderColor="var(--waba-line)"
                            color="var(--waba-ink)"
                            fontWeight="700"
                            onClick={handleLogout}
                        >
                            다른 계정으로 로그인
                        </Button>
                    </VStack>
                </Box>
            </Flex>
        );
    }

    const isSuperAdmin = String(adminUser?.admin_level || '').toUpperCase() === 'SUPER';
    const isSuperOnlyRoute =
        pathname?.startsWith('/admin/admins') || pathname?.startsWith('/admin/audit-logs');

    const SidebarContent = (
        <Flex direction="column" h="100%" justify="space-between" p={4} gap={4}>
            <Box>
                <Flex align="center" justify="space-between" px={2} mb={6}>
                    <Link href="/admin" onClick={() => setMobileMenuOpen(false)}>
                        <HStack gap={2}>
                            <Text fontSize="20px" fontWeight="900" letterSpacing="-0.04em" color="var(--waba-ink)">
                                WABA.
                            </Text>
                            <Box
                                bg="var(--waba-purple-soft)"
                                color="var(--waba-purple-text)"
                                fontSize="10px"
                                fontWeight="800"
                                px={2}
                                py={0.5}
                                borderRadius="999px"
                            >
                                ADMIN
                            </Box>
                        </HStack>
                    </Link>
                </Flex>

                <VStack align="stretch" gap={5}>
                    {MENU_GROUPS.map((group) => (
                        <Box key={group.group}>
                            <Text
                                fontSize="11px"
                                fontWeight="700"
                                color="var(--waba-ink-3)"
                                px={2.5}
                                mb={1.5}
                            >
                                {group.group}
                            </Text>
                            <VStack align="stretch" gap={1}>
                                {group.items
                                    .filter((item: any) => !item.superOnly || isSuperAdmin)
                                    .map((item: any) => {
                                    const isActive =
                                        item.href === '/admin'
                                            ? pathname === '/admin'
                                            : pathname?.startsWith(item.href);
                                    const IconComp = item.icon;
                                    const showBadge = item.badgeKey === 'reports' && pendingReportCount > 0;
                                    return (
                                        <Link
                                            key={item.href}
                                            href={item.href}
                                            onClick={() => setMobileMenuOpen(false)}
                                        >
                                            <Flex
                                                align="center"
                                                justify="space-between"
                                                px={3}
                                                py="9px"
                                                borderRadius="12px"
                                                bg={isActive ? 'var(--waba-ink)' : 'transparent'}
                                                color={isActive ? 'var(--waba-bg)' : 'var(--waba-ink-2)'}
                                                _hover={
                                                    isActive
                                                        ? undefined
                                                        : { bg: 'var(--waba-surface)', color: 'var(--waba-ink)' }
                                                }
                                                transition="all 0.15s"
                                                fontSize="13px"
                                                fontWeight={isActive ? '700' : '600'}
                                            >
                                                <HStack gap={2.5} minW={0}>
                                                    <IconComp size={15} />
                                                    <Text truncate>{item.label}</Text>
                                                </HStack>
                                                {showBadge && (
                                                    <Box
                                                        bg="#EF4444"
                                                        color="white"
                                                        fontSize="10px"
                                                        fontWeight="800"
                                                        px={1.5}
                                                        py="1px"
                                                        borderRadius="999px"
                                                        lineHeight="1.2"
                                                    >
                                                        {pendingReportCount}
                                                    </Box>
                                                )}
                                                {item.superOnly && isSuperAdmin && (
                                                    <Box
                                                        bg={isActive ? 'whiteAlpha.300' : 'var(--waba-purple-soft)'}
                                                        color={isActive ? 'white' : 'var(--waba-purple-text)'}
                                                        fontSize="9px"
                                                        fontWeight="800"
                                                        px={1.5}
                                                        py="1px"
                                                        borderRadius="999px"
                                                        lineHeight="1.2"
                                                    >
                                                        SUPER
                                                    </Box>
                                                )}
                                            </Flex>
                                        </Link>
                                    );
                                })}
                            </VStack>
                        </Box>
                    ))}
                </VStack>
            </Box>

            <VStack align="stretch" gap={2.5} pt={3} borderTop="1px solid" borderColor="var(--waba-line)">
                <Link href="/">
                    <Flex
                        align="center"
                        justify="space-between"
                        px={3}
                        py={2}
                        borderRadius="12px"
                        bg="var(--waba-surface)"
                        border="1px solid"
                        borderColor="var(--waba-line)"
                        color="var(--waba-ink-2)"
                        _hover={{ color: 'var(--waba-ink)', borderColor: 'var(--waba-purple-border)' }}
                        fontSize="12px"
                        fontWeight="700"
                    >
                        <Text>서비스 바로가기</Text>
                        <LuArrowUpRight size={14} />
                    </Flex>
                </Link>

                <HStack
                    p={2.5}
                    borderRadius="14px"
                    bg="var(--waba-surface)"
                    border="1px solid"
                    borderColor="var(--waba-line)"
                    justify="space-between"
                    gap={2}
                >
                    <HStack gap={2.5} minW={0} flex={1}>
                        <UserAvatar
                            src={adminUser?.profile_image_url}
                            alt={adminUser?.nickname || '관리자'}
                            size="xs"
                            fallbackType="user"
                        />
                        <Box minW={0} flex={1}>
                            <Text fontSize="12px" fontWeight="700" color="var(--waba-ink)" truncate>
                                {adminUser?.nickname || '관리자'}
                            </Text>
                            <Text fontSize="10.5px" color="var(--waba-ink-3)" truncate>
                                {adminUser?.email || ''}
                            </Text>
                        </Box>
                    </HStack>
                    <HStack gap={1}>
                        <IconButton
                            aria-label="테마 전환"
                            size="xs"
                            variant="ghost"
                            rounded="full"
                            onClick={toggleTheme}
                        >
                            {themeMode === 'dark' ? <LuSun size={14} /> : <LuMoon size={14} />}
                        </IconButton>
                        <IconButton
                            aria-label="로그아웃"
                            size="xs"
                            variant="ghost"
                            rounded="full"
                            color="var(--waba-ink-3)"
                            _hover={{ color: '#EF4444', bg: 'var(--waba-card)' }}
                            onClick={handleLogout}
                        >
                            <LuLogOut size={14} />
                        </IconButton>
                    </HStack>
                </HStack>
            </VStack>
        </Flex>
    );

    return (
        <Flex minH="100vh" bg="var(--waba-surface)" direction={{ base: 'column', lg: 'row' }}>
            {/* Desktop Fixed Sidebar */}
            <Box
                display={{ base: 'none', lg: 'block' }}
                w="240px"
                flexShrink={0}
                bg="var(--waba-card)"
                borderRight="1px solid"
                borderColor="var(--waba-line)"
                position="sticky"
                top={0}
                h="100vh"
                overflowY="auto"
            >
                {SidebarContent}
            </Box>

            {/* Mobile Top Header */}
            <Flex
                display={{ base: 'flex', lg: 'none' }}
                align="center"
                justify="space-between"
                px={4}
                py={3}
                bg="var(--waba-card)"
                borderBottom="1px solid"
                borderColor="var(--waba-line)"
                position="sticky"
                top={0}
                zIndex={30}
            >
                <Link href="/admin">
                    <HStack gap={2}>
                        <Text fontSize="18px" fontWeight="900" letterSpacing="-0.04em" color="var(--waba-ink)">
                            WABA.
                        </Text>
                        <Box
                            bg="var(--waba-purple-soft)"
                            color="var(--waba-purple-text)"
                            fontSize="10px"
                            fontWeight="800"
                            px={2}
                            py={0.5}
                            borderRadius="999px"
                        >
                            ADMIN
                        </Box>
                    </HStack>
                </Link>
                <HStack gap={1.5}>
                    <IconButton aria-label="테마 전환" size="sm" variant="ghost" rounded="full" onClick={toggleTheme}>
                        {themeMode === 'dark' ? <LuSun size={16} /> : <LuMoon size={16} />}
                    </IconButton>
                    <IconButton aria-label="메뉴 열기" size="sm" variant="ghost" rounded="full" onClick={() => setMobileMenuOpen(true)}>
                        <LuMenu size={18} />
                    </IconButton>
                </HStack>
            </Flex>

            {/* Mobile Drawer */}
            <Drawer.Root open={mobileMenuOpen} onOpenChange={(e) => setMobileMenuOpen(e.open)} placement="start">
                <Portal>
                    <Drawer.Backdrop bg="blackAlpha.600" />
                    <Drawer.Positioner>
                        <Drawer.Content bg="var(--waba-card)" w="260px" maxW="80vw">
                            <Box position="absolute" top={3} right={3} zIndex={2}>
                                <CloseButton size="sm" rounded="full" color="var(--waba-ink)" onClick={() => setMobileMenuOpen(false)} />
                            </Box>
                            {SidebarContent}
                        </Drawer.Content>
                    </Drawer.Positioner>
                </Portal>
            </Drawer.Root>

            {/* Main Content */}
            <Box flex={1} minW={0} p={{ base: 4, md: 6, xl: 8 }}>
                <AdminContext.Provider value={{ adminUser, isSuperAdmin, refreshAdminMe: verifyAdmin }}>
                    {authState === 'authorized' && !isSuperAdmin && isSuperOnlyRoute ? (
                        <Flex py={20} justify="center" align="center">
                            <Box
                                maxW="440px"
                                w="full"
                                p={7}
                                borderRadius="24px"
                                bg="var(--waba-card)"
                                border="1px solid"
                                borderColor="var(--waba-line)"
                                textAlign="center"
                            >
                                <Flex
                                    w="48px"
                                    h="48px"
                                    mx="auto"
                                    mb={3}
                                    borderRadius="full"
                                    bg="rgba(239, 68, 68, 0.12)"
                                    color="#EF4444"
                                    align="center"
                                    justify="center"
                                >
                                    <LuShieldAlert size={22} />
                                </Flex>
                                <Text fontSize="17px" fontWeight="800" color="var(--waba-ink)">
                                    슈퍼 관리자 전용 페이지입니다 (403)
                                </Text>
                                <Text fontSize="13px" color="var(--waba-ink-3)" mt={1.5} mb={5}>
                                    이 메뉴는 SUPER 등급 관리자만 접근할 수 있습니다.
                                </Text>
                                <Link href="/admin">
                                    <Button
                                        size="sm"
                                        bg="#6338A9"
                                        color="#FFFFFF"
                                        _hover={{ bg: '#522B8F' }}
                                        borderRadius="999px"
                                        px={5}
                                    >
                                        대시보드로 돌아가기
                                    </Button>
                                </Link>
                            </Box>
                        </Flex>
                    ) : (
                        children
                    )}
                </AdminContext.Provider>
            </Box>
        </Flex>
    );
}
