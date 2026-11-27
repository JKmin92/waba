'use client'

import React, { useState } from 'react';
import {
    Box,
    Button,
    CloseButton,
    Dialog,
    Flex,
    HStack,
    Portal,
    Text,
    VStack,
} from '@chakra-ui/react';
import { AnimatePresence, motion } from 'framer-motion';
import { LuChevronDown, LuLink2, LuMail } from 'react-icons/lu';
import { toaster } from '@/components/ui/toaster';
import { UserIdentityInfo } from './ProfileSection';

type ProviderKey = 'LOCAL' | 'KAKAO' | 'NAVER' | 'GOOGLE' | 'APPLE';

const PROVIDER_META: Record<ProviderKey, { name: string; shortName: string }> = {
    LOCAL: { name: '일반 이메일', shortName: '이메일' },
    KAKAO: { name: '카카오', shortName: '카카오' },
    NAVER: { name: '네이버', shortName: '네이버' },
    GOOGLE: { name: 'Google', shortName: 'Google' },
    APPLE: { name: 'Apple', shortName: 'Apple' },
};

interface SocialAccountsAccordionProps {
    email?: string | null;
    hasLocalPassword?: boolean;
    primaryProvider?: string | null;
    identities?: UserIdentityInfo[];
    onOpenEditProfile: () => void;
}

function ProviderIcon({ provider }: { provider: ProviderKey }) {
    if (provider === 'LOCAL') {
        return (
            <Flex
                w="36px"
                h="36px"
                borderRadius="full"
                bg="var(--waba-purple-soft)"
                color="var(--waba-purple-text)"
                align="center"
                justify="center"
                flexShrink={0}
            >
                <LuMail size={17} />
            </Flex>
        );
    }
    if (provider === 'KAKAO') {
        return (
            <Flex
                w="36px"
                h="36px"
                borderRadius="full"
                bg="#FEE500"
                color="#191919"
                align="center"
                justify="center"
                flexShrink={0}
            >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 3C6.48 3 2 6.58 2 11c0 2.84 1.87 5.33 4.68 6.74l-.95 3.49c-.08.3.26.54.52.37l4.14-2.75c.53.07 1.07.11 1.61.11 5.52 0 10-3.58 10-8s-4.48-8-10-8z" />
                </svg>
            </Flex>
        );
    }
    if (provider === 'NAVER') {
        return (
            <Flex
                w="36px"
                h="36px"
                borderRadius="full"
                bg="#03C75A"
                color="#FFFFFF"
                align="center"
                justify="center"
                flexShrink={0}
            >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M16.273 12.845L7.376 0H0v24h7.727V11.155L16.624 24H24V0h-7.727v12.845z" />
                </svg>
            </Flex>
        );
    }
    if (provider === 'GOOGLE') {
        return (
            <Flex
                w="36px"
                h="36px"
                borderRadius="full"
                bg="#FFFFFF"
                border="1px solid"
                borderColor="var(--waba-line)"
                align="center"
                justify="center"
                flexShrink={0}
            >
                <svg width="16" height="16" viewBox="0 0 24 24">
                    <path
                        fill="#4285F4"
                        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                    />
                    <path
                        fill="#34A853"
                        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24z"
                    />
                    <path
                        fill="#FBBC05"
                        d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14z"
                    />
                    <path
                        fill="#EA4335"
                        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96z"
                    />
                </svg>
            </Flex>
        );
    }
    return (
        <Flex
            w="36px"
            h="36px"
            borderRadius="full"
            bg="#141416"
            color="#FFFFFF"
            align="center"
            justify="center"
            flexShrink={0}
        >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
            </svg>
        </Flex>
    );
}

function formatConnectedDate(iso?: string | null): string {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}.${m}.${day}`;
}

export default function SocialAccountsAccordion({
    email,
    hasLocalPassword,
    primaryProvider,
    identities = [],
    onOpenEditProfile,
}: SocialAccountsAccordionProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [connectTarget, setConnectTarget] = useState<ProviderKey | null>(null);
    const [disconnectTarget, setDisconnectTarget] = useState<ProviderKey | null>(null);

    const resolvedPrimary = (
        primaryProvider ||
        (hasLocalPassword ? 'LOCAL' : identities?.[0]?.provider || 'LOCAL')
    ).toUpperCase() as ProviderKey;

    const isLocalAccount = resolvedPrimary === 'LOCAL' || Boolean(hasLocalPassword);
    const visibleProviders: ProviderKey[] = isLocalAccount
        ? ['LOCAL', 'KAKAO', 'NAVER', 'GOOGLE', 'APPLE']
        : ['KAKAO', 'NAVER', 'GOOGLE', 'APPLE'];

    const identityMap = new Map<string, UserIdentityInfo>();
    for (const id of identities) {
        if (id?.provider) {
            identityMap.set(id.provider.toUpperCase(), id);
        }
    }
    if (isLocalAccount && !identityMap.has('LOCAL')) {
        identityMap.set('LOCAL', { provider: 'LOCAL', provider_email: email });
    }

    const connectedCount = visibleProviders.filter((p) => identityMap.has(p)).length;

    const handleConfirmConnect = () => {
        if (!connectTarget) return;
        const name = PROVIDER_META[connectTarget].name;
        toaster.create({
            title: `${name} 소셜 연동 API 연결 준비 중입니다.`,
            description: 'OAuth 연동이 활성화되면 인증된 소셜 계정이 바로 연결됩니다.',
            type: 'info',
        });
        setConnectTarget(null);
    };

    const handleConfirmDisconnect = () => {
        if (!disconnectTarget) return;
        const name = PROVIDER_META[disconnectTarget].name;
        toaster.create({
            title: `${name} 소셜 연동 API 연결 준비 중입니다.`,
            description: 'OAuth 연동이 활성화되면 해당 소셜 연결이 해제됩니다.',
            type: 'info',
        });
        setDisconnectTarget(null);
    };

    return (
        <>
            <Box
                bg="var(--waba-card)"
                border="1px solid"
                borderColor="var(--waba-line)"
                borderRadius="20px"
                overflow="hidden"
            >
                {/* Accordion Header (Collapsed by default) */}
                <Flex
                    as="button"
                    w="100%"
                    p={{ base: '18px', md: '22px 24px' }}
                    align="center"
                    justify="space-between"
                    gap={3}
                    textAlign="left"
                    cursor="pointer"
                    onClick={() => setIsExpanded((prev) => !prev)}
                    _hover={{ bg: 'var(--waba-surface)' }}
                    transition="background-color 0.15s ease"
                >
                    <HStack gap={3} align="center" flex={1} minW={0}>
                        <Box
                            w="34px"
                            h="34px"
                            borderRadius="12px"
                            bg="var(--waba-purple-soft)"
                            color="var(--waba-purple-text)"
                            display="flex"
                            alignItems="center"
                            justifyContent="center"
                            flexShrink={0}
                        >
                            <LuLink2 size={16} />
                        </Box>
                        <Box minW={0} flex={1}>
                            <Text fontSize="14px" fontWeight="800" color="var(--waba-ink)">
                                로그인 수단 및 계정 연결
                            </Text>
                            <Text fontSize="12px" color="var(--waba-ink-3)" mt="2px" truncate>
                                {email || '-'} · 연결된 소셜 계정으로 간편 로그인
                            </Text>
                        </Box>
                    </HStack>

                    <HStack gap={2.5} flexShrink={0}>
                        <Box
                            bg="var(--waba-purple-soft)"
                            color="var(--waba-purple-text)"
                            fontSize="11px"
                            fontWeight="800"
                            px={2.5}
                            py={0.5}
                            borderRadius="999px"
                        >
                            {connectedCount} / {visibleProviders.length} 연결됨
                        </Box>
                        <Box
                            color="var(--waba-ink-3)"
                            transform={isExpanded ? 'rotate(180deg)' : 'rotate(0deg)'}
                            transition="transform 0.2s ease"
                        >
                            <LuChevronDown size={18} />
                        </Box>
                    </HStack>
                </Flex>

                {/* Accordion Body */}
                <AnimatePresence initial={false}>
                    {isExpanded && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.22 }}
                            style={{ overflow: 'hidden' }}
                        >
                            <Box px={{ base: '18px', md: '24px' }} pb={{ base: '18px', md: '22px' }} pt={1}>
                                {/* 기준 이메일 안내 배너 */}
                                <Box
                                    p={3.5}
                                    mb={4}
                                    borderRadius="14px"
                                    bg="var(--waba-purple-soft)"
                                    border="1px solid"
                                    borderColor="var(--waba-purple-border)"
                                >
                                    <Text fontSize="12px" fontWeight="800" color="var(--waba-purple-text)" mb={1}>
                                        내 계정 이메일: {email || '-'}
                                    </Text>
                                    <Text fontSize="11.5px" color="var(--waba-ink-2)" lineHeight="1.5">
                                        소셜 계정을 연결해 두면 여러 로그인 수단으로 간편하게 접속할 수 있습니다. 미리 연결하지 않은 소셜 계정으로 기존 가입 이메일과 동일한 로그인·가입을 시도하면 보안상 차단됩니다.
                                    </Text>
                                </Box>

                                {/* Provider Rows */}
                                <VStack align="stretch" gap={2.5}>
                                    {visibleProviders.map((provider) => {
                                        const meta = PROVIDER_META[provider];
                                        const identity = identityMap.get(provider);
                                        const isConnected = Boolean(identity);
                                        const isPrimary = provider === resolvedPrimary;
                                        const dateStr = formatConnectedDate(identity?.created_at);

                                        return (
                                            <Flex
                                                key={provider}
                                                p={3.5}
                                                borderRadius="16px"
                                                bg="var(--waba-surface)"
                                                border="1px solid"
                                                borderColor="var(--waba-line)"
                                                justify="space-between"
                                                align={{ base: 'flex-start', sm: 'center' }}
                                                direction={{ base: 'column', sm: 'row' }}
                                                gap={3}
                                            >
                                                <HStack gap={3} flex={1} minW={0}>
                                                    <ProviderIcon provider={provider} />
                                                    <Box minW={0} flex={1}>
                                                        <HStack gap={1.5} flexWrap="wrap" mb={0.5}>
                                                            <Text fontSize="13.5px" fontWeight="800" color="var(--waba-ink)">
                                                                {meta.name}
                                                            </Text>
                                                            {isPrimary && (
                                                                <Box
                                                                    bg="var(--waba-purple-soft)"
                                                                    color="var(--waba-purple-text)"
                                                                    fontSize="10px"
                                                                    fontWeight="800"
                                                                    px={2}
                                                                    py="1px"
                                                                    borderRadius="999px"
                                                                >
                                                                    최초 가입 수단
                                                                </Box>
                                                            )}
                                                            {isConnected ? (
                                                                <Box
                                                                    bg="rgba(16, 185, 129, 0.14)"
                                                                    color="#10B981"
                                                                    fontSize="10px"
                                                                    fontWeight="800"
                                                                    px={2}
                                                                    py="1px"
                                                                    borderRadius="999px"
                                                                >
                                                                    연결됨
                                                                </Box>
                                                            ) : (
                                                                <Box
                                                                    bg="var(--waba-card)"
                                                                    color="var(--waba-ink-3)"
                                                                    border="1px solid"
                                                                    borderColor="var(--waba-line)"
                                                                    fontSize="10px"
                                                                    fontWeight="700"
                                                                    px={2}
                                                                    py="1px"
                                                                    borderRadius="999px"
                                                                >
                                                                    미연결
                                                                </Box>
                                                            )}
                                                        </HStack>

                                                        <Text fontSize="11.5px" color="var(--waba-ink-3)" truncate>
                                                            {isConnected
                                                                ? `${identity?.provider_email || email || '-'}${dateStr ? ` · ${dateStr} 연결` : ''}`
                                                                : '연결 시 이 계정으로 간편 로그인할 수 있습니다.'}
                                                        </Text>
                                                    </Box>
                                                </HStack>

                                                <Box flexShrink={0}>
                                                    {provider === 'LOCAL' ? (
                                                        <Button
                                                            size="xs"
                                                            variant="outline"
                                                            borderColor="var(--waba-line)"
                                                            color="var(--waba-ink)"
                                                            borderRadius="999px"
                                                            px={3.5}
                                                            onClick={onOpenEditProfile}
                                                        >
                                                            비밀번호 변경
                                                        </Button>
                                                    ) : isPrimary ? (
                                                        <Button
                                                            size="xs"
                                                            variant="outline"
                                                            borderColor="var(--waba-line)"
                                                            color="var(--waba-ink-3)"
                                                            borderRadius="999px"
                                                            px={3.5}
                                                            disabled
                                                            opacity={0.6}
                                                            title="최초 가입 수단은 연결을 해제할 수 없습니다"
                                                        >
                                                            해제 불가
                                                        </Button>
                                                    ) : isConnected ? (
                                                        <Button
                                                            size="xs"
                                                            variant="outline"
                                                            borderColor="rgba(239, 68, 68, 0.4)"
                                                            color="#EF4444"
                                                            borderRadius="999px"
                                                            px={3.5}
                                                            onClick={() => setDisconnectTarget(provider)}
                                                        >
                                                            연결 해제
                                                        </Button>
                                                    ) : (
                                                        <Button
                                                            size="xs"
                                                            bg="#6338A9"
                                                            color="#FFFFFF"
                                                            _hover={{ bg: '#522B8F' }}
                                                            borderRadius="999px"
                                                            px={3.5}
                                                            onClick={() => setConnectTarget(provider)}
                                                        >
                                                            연결하기
                                                        </Button>
                                                    )}
                                                </Box>
                                            </Flex>
                                        );
                                    })}
                                </VStack>

                                <Text fontSize="11px" color="var(--waba-ink-3)" mt={3}>
                                    • 최초 가입 시 사용한 로그인 수단은 계정 보호를 위해 연결을 해제할 수 없습니다.
                                </Text>
                            </Box>
                        </motion.div>
                    )}
                </AnimatePresence>
            </Box>

            {/* 소셜 연결 확인 모달 */}
            <Dialog.Root open={Boolean(connectTarget)} onOpenChange={(e) => !e.open && setConnectTarget(null)} placement="center">
                <Portal>
                    <Dialog.Backdrop bg="blackAlpha.600" backdropFilter="blur(4px)" zIndex={1400} />
                    <Dialog.Positioner zIndex={1401} p={4}>
                        <Dialog.Content
                            bg="var(--waba-card)"
                            borderRadius="24px"
                            border="1px solid"
                            borderColor="var(--waba-line)"
                            p={6}
                            maxW="420px"
                            w="100%"
                        >
                            <Dialog.Header p={0} pb={3}>
                                <Flex justify="space-between" align="center" w="100%">
                                    <Dialog.Title fontSize="17px" fontWeight="800" color="var(--waba-ink)">
                                        {connectTarget ? `${PROVIDER_META[connectTarget].name} 계정 연결` : ''}
                                    </Dialog.Title>
                                    <CloseButton size="sm" rounded="full" color="var(--waba-ink)" onClick={() => setConnectTarget(null)} />
                                </Flex>
                            </Dialog.Header>

                            <Dialog.Body p={0} py={2}>
                                <VStack align="stretch" gap={3}>
                                    <Box p={3} borderRadius="12px" bg="var(--waba-surface)" border="1px solid" borderColor="var(--waba-line)" textAlign="center">
                                        <Text fontSize="12.5px" fontWeight="700" color="var(--waba-ink)">
                                            {email || '-'} ↔ {connectTarget ? PROVIDER_META[connectTarget].name : ''}
                                        </Text>
                                    </Box>
                                    <Text fontSize="13px" color="var(--waba-ink-2)" lineHeight="1.55">
                                        인증한 {connectTarget ? PROVIDER_META[connectTarget].name : ''} 계정이 현재 WABA 계정(
                                        <b>{email || '-'}</b>)에 연결됩니다.
                                    </Text>
                                    <Box p={3} borderRadius="12px" bg="var(--waba-purple-soft)" border="1px solid" borderColor="var(--waba-purple-border)">
                                        <Text fontSize="12px" fontWeight="700" color="var(--waba-purple-text)">
                                            이미 다른 WABA 계정에 연결된 소셜 계정은 중복 연결할 수 없습니다.
                                        </Text>
                                    </Box>
                                </VStack>
                            </Dialog.Body>

                            <Dialog.Footer p={0} pt={4} gap={2}>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    borderColor="var(--waba-line)"
                                    color="var(--waba-ink-2)"
                                    borderRadius="999px"
                                    flex={1}
                                    onClick={() => setConnectTarget(null)}
                                >
                                    취소
                                </Button>
                                <Button
                                    size="sm"
                                    bg="#6338A9"
                                    color="#FFFFFF"
                                    _hover={{ bg: '#522B8F' }}
                                    borderRadius="999px"
                                    flex={1}
                                    onClick={handleConfirmConnect}
                                >
                                    {connectTarget ? `${PROVIDER_META[connectTarget].name}로 인증하고 연결` : '연결'}
                                </Button>
                            </Dialog.Footer>
                        </Dialog.Content>
                    </Dialog.Positioner>
                </Portal>
            </Dialog.Root>

            {/* 소셜 연결 해제 확인 모달 */}
            <Dialog.Root open={Boolean(disconnectTarget)} onOpenChange={(e) => !e.open && setDisconnectTarget(null)} placement="center">
                <Portal>
                    <Dialog.Backdrop bg="blackAlpha.600" backdropFilter="blur(4px)" zIndex={1400} />
                    <Dialog.Positioner zIndex={1401} p={4}>
                        <Dialog.Content
                            bg="var(--waba-card)"
                            borderRadius="24px"
                            border="1px solid"
                            borderColor="var(--waba-line)"
                            p={6}
                            maxW="420px"
                            w="100%"
                        >
                            <Dialog.Header p={0} pb={3}>
                                <Flex justify="space-between" align="center" w="100%">
                                    <Dialog.Title fontSize="17px" fontWeight="800" color="var(--waba-ink)">
                                        {disconnectTarget ? `${PROVIDER_META[disconnectTarget].name} 연결 해제` : ''}
                                    </Dialog.Title>
                                    <CloseButton size="sm" rounded="full" color="var(--waba-ink)" onClick={() => setDisconnectTarget(null)} />
                                </Flex>
                            </Dialog.Header>

                            <Dialog.Body p={0} py={2}>
                                <Text fontSize="13px" color="var(--waba-ink-2)" lineHeight="1.55">
                                    해제 이후 {disconnectTarget ? PROVIDER_META[disconnectTarget].name : ''} 계정으로 현재 WABA 계정(
                                    <b>{email || '-'}</b>)에 로그인할 수 없습니다.
                                </Text>
                            </Dialog.Body>

                            <Dialog.Footer p={0} pt={4} gap={2}>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    borderColor="var(--waba-line)"
                                    color="var(--waba-ink-2)"
                                    borderRadius="999px"
                                    flex={1}
                                    onClick={() => setDisconnectTarget(null)}
                                >
                                    취소
                                </Button>
                                <Button
                                    size="sm"
                                    bg="#E53E3E"
                                    color="#FFFFFF"
                                    _hover={{ bg: '#C53030' }}
                                    borderRadius="999px"
                                    flex={1}
                                    onClick={handleConfirmDisconnect}
                                >
                                    연결 해제
                                </Button>
                            </Dialog.Footer>
                        </Dialog.Content>
                    </Dialog.Positioner>
                </Portal>
            </Dialog.Root>
        </>
    );
}
