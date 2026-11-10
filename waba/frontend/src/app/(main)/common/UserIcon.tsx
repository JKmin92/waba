'use client';

import { useEffect, useState } from "react";
import { Avatar, Box, HStack, Icon, Menu, Portal, Text } from "@chakra-ui/react";
import { LuLogOut, LuSparkles, LuUser, LuBookmark, LuUserRound } from "react-icons/lu";
import { User } from "@/interface";
import { clearAuthSession, getUserInfo } from "@/utils/authUtils";
import { toaster } from "@/components/ui/toaster";
import Link from "next/link";

export default function UserIcon() {
    const [currentUser, setCurrentUser] = useState<User | null>(null);

    useEffect(() => {
        // 첫 마운트 시 쿠키에서 로그인 회원 정보 로드
        setCurrentUser(getUserInfo());

        // auth-change 이벤트 수신 시 실시간 동기화
        const handleAuthChange = () => {
            setCurrentUser(getUserInfo());
        };

        window.addEventListener('auth-change', handleAuthChange);
        return () => window.removeEventListener('auth-change', handleAuthChange);
    }, []);

    const handleLogout = () => {
        clearAuthSession();
        toaster.create({
            title: '로그아웃되었습니다.',
            type: 'info'
        });
    };

    return (
        <Menu.Root positioning={{ placement: "bottom-end" }}>
            <Menu.Trigger asChild>
                <Box
                    as="button"
                    cursor="pointer"
                    outline="none"
                    borderRadius="full"
                    p="2px"
                    transition="all 0.2s"
                    _hover={{ transform: 'scale(1.05)' }}
                >
                    <Avatar.Root
                        size="sm"
                        borderRadius="full"
                        border="2px solid"
                        borderColor="waba.purpleLight"
                    >
                        {currentUser?.profile_image_url ? (
                            <Avatar.Image
                                src={currentUser.profile_image_url}
                                alt={currentUser.nickname || '프로필'}
                            />
                        ) : (<LuUserRound />)}
                    </Avatar.Root>
                </Box>
            </Menu.Trigger>

            <Portal>
                <Menu.Positioner>
                    <Menu.Content
                        minW="220px"
                        borderRadius="20px"
                        p={2}
                        boxShadow="0 12px 32px -4px rgba(26, 28, 30, 0.12)"
                        border="1px solid"
                        borderColor="waba.border"
                        bg="white"
                    >
                        {/* 회원 요약 프로필 */}
                        <Box px={3} py={2.5} mb={1} borderBottom="1px solid" borderColor="blackAlpha.50">
                            <Text fontSize="13px" fontWeight="700" color="waba.charcoal" truncate>
                                {currentUser?.nickname || '회원'}님
                            </Text>
                            <Text fontSize="11px" color="waba.faint" truncate mb={1.5}>
                                {currentUser?.email || ''}
                            </Text>
                            <HStack
                                bg="waba.purpleLight"
                                color="waba.purple"
                                px={2.5}
                                py={1}
                                borderRadius="full"
                                fontSize="11px"
                                fontWeight="700"
                                w="fit-content"
                            >
                                <LuSparkles size={12} />
                                <Text>{(currentUser?.reward_points ?? 0).toLocaleString()} P</Text>
                            </HStack>
                        </Box>

                        <Menu.Item value="mypage" cursor="pointer" borderRadius="12px" py={2} px={3} asChild>
                            <Link href="/member/mypage" style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <LuUser size={15} />
                                <Text fontSize="13px" fontWeight="600">마이페이지</Text>
                            </Link>
                        </Menu.Item>

                        <Menu.Item value="saved" cursor="pointer" borderRadius="12px" py={2} px={3} asChild>
                            <Link href="/member/mypage?tab=bookmark" style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <LuBookmark size={15} />
                                <Text fontSize="13px" fontWeight="600">저장한 공간·룩북</Text>
                            </Link>
                        </Menu.Item>

                        <Menu.Separator my={1} />

                        <Menu.Item
                            value="logout"
                            cursor="pointer"
                            borderRadius="12px"
                            py={2}
                            px={3}
                            color="red.500"
                            _hover={{ bg: 'red.50' }}
                            onClick={handleLogout}
                        >
                            <HStack gap={2} w="full">
                                <LuLogOut size={15} />
                                <Text fontSize="13px" fontWeight="600">로그아웃</Text>
                            </HStack>
                        </Menu.Item>
                    </Menu.Content>
                </Menu.Positioner>
            </Portal>
        </Menu.Root>
    );
}