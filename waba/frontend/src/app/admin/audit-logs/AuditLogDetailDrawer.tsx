'use client'

import React from 'react';
import {
    Box,
    Button,
    CloseButton,
    Drawer,
    Flex,
    HStack,
    Portal,
    Text,
    VStack,
} from '@chakra-ui/react';
import { LuCopy, LuExternalLink, LuShieldAlert } from 'react-icons/lu';
import { useRouter } from 'next/navigation';
import { toaster } from '@/components/ui/toaster';
import UserAvatar from '../../(main)/common/UserAvatar';

export interface AuditLogItem {
    id: number;
    admin_user_id: string;
    admin_name: string | null;
    admin_title: string | null;
    admin_email: string | null;
    admin_profile_image_url: string | null;
    action: string;
    severity: 'CREATE' | 'UPDATE' | 'DANGER';
    target_type: string;
    target_id: string | null;
    summary: string;
    detail: Record<string, unknown> | unknown[] | null;
    ip_address: string | null;
    created_at: string;
}

const SEVERITY_BADGE: Record<string, { label: string; bg: string; color: string }> = {
    CREATE: { label: '생성/복원', bg: 'rgba(16, 185, 129, 0.14)', color: '#10B981' },
    UPDATE: { label: '수정/변경', bg: 'rgba(245, 158, 11, 0.14)', color: '#D97706' },
    DANGER: { label: '삭제/제재', bg: 'rgba(239, 68, 68, 0.14)', color: '#EF4444' },
};

const TARGET_ROUTE_MAP: Record<string, string> = {
    USER: '/admin/users',
    PET: '/admin/users',
    ADMIN: '/admin/admins',
    POST: '/admin/posts',
    COMMENT: '/admin/posts',
    REPORT: '/admin/reports',
    HISTORY: '/admin/notebooks',
    NOTEBOOK: '/admin/notebooks',
    BOARD: '/admin/boards',
    AFFILIATE_DOMAIN: '/admin/affiliate-domains',
    NOTICE: '/admin/notices?tab=notices',
    BANNER: '/admin/notices?tab=banners',
    POPUP: '/admin/notices?tab=popups',
};

interface AuditLogDetailDrawerProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    log: AuditLogItem | null;
}

export default function AuditLogDetailDrawer({
    open,
    onOpenChange,
    log,
}: AuditLogDetailDrawerProps) {
    const router = useRouter();

    const formatDateStr = (d?: string | null) => {
        if (!d) return '-';
        const parsed = new Date(d);
        if (Number.isNaN(parsed.getTime())) return '-';
        return parsed.toLocaleString('ko-KR');
    };

    const handleCopyJson = async () => {
        if (!log) return;
        try {
            await navigator.clipboard.writeText(JSON.stringify(log.detail ?? {}, null, 2));
            toaster.create({ title: '상세 JSON이 클립보드에 복사되었습니다.', type: 'success' });
        } catch {
            toaster.create({ title: 'JSON 복사에 실패했습니다.', type: 'error' });
        }
    };

    const sev = log ? SEVERITY_BADGE[log.severity] || SEVERITY_BADGE.UPDATE : SEVERITY_BADGE.UPDATE;
    const targetRoute = log ? TARGET_ROUTE_MAP[String(log.target_type || '').toUpperCase()] : undefined;

    const renderStructuredDetail = (detail: AuditLogItem['detail']) => {
        if (!detail || (typeof detail === 'object' && Object.keys(detail).length === 0)) {
            return (
                <Text fontSize="12px" color="var(--waba-ink-3)">
                    기록된 상세 변경 데이터가 없습니다.
                </Text>
            );
        }

        if (Array.isArray(detail)) {
            return (
                <VStack align="stretch" gap={1.5}>
                    {detail.map((item, idx) => (
                        <Box key={idx} p={2.5} borderRadius="10px" bg="var(--waba-card)" border="1px solid" borderColor="var(--waba-line)" fontSize="12px" color="var(--waba-ink)">
                            {typeof item === 'object' ? JSON.stringify(item) : String(item)}
                        </Box>
                    ))}
                </VStack>
            );
        }

        const obj = detail as Record<string, unknown>;
        const beforeVal = obj.before ?? obj.oldStatus ?? obj.prev;
        const afterVal = obj.after ?? obj.newStatus ?? obj.next;
        const hasDiff = beforeVal !== undefined || afterVal !== undefined;

        return (
            <VStack align="stretch" gap={2.5}>
                {hasDiff && (
                    <Flex gap={2.5} direction={{ base: 'column', sm: 'row' }}>
                        <Box flex={1} p={3} borderRadius="12px" bg="rgba(239, 68, 68, 0.08)" border="1px solid" borderColor="rgba(239, 68, 68, 0.25)">
                            <Text fontSize="10.5px" fontWeight="800" color="#EF4444" mb={1}>
                                변경 전 (Before)
                            </Text>
                            <Text fontSize="12px" color="var(--waba-ink)" wordBreak="break-word">
                                {typeof beforeVal === 'object' ? JSON.stringify(beforeVal) : String(beforeVal ?? '-')}
                            </Text>
                        </Box>
                        <Box flex={1} p={3} borderRadius="12px" bg="rgba(16, 185, 129, 0.08)" border="1px solid" borderColor="rgba(16, 185, 129, 0.25)">
                            <Text fontSize="10.5px" fontWeight="800" color="#10B981" mb={1}>
                                변경 후 (After)
                            </Text>
                            <Text fontSize="12px" color="var(--waba-ink)" wordBreak="break-word">
                                {typeof afterVal === 'object' ? JSON.stringify(afterVal) : String(afterVal ?? '-')}
                            </Text>
                        </Box>
                    </Flex>
                )}

                <VStack align="stretch" gap={1.5}>
                    {Object.entries(obj)
                        .filter(([k]) => !['before', 'after', 'oldStatus', 'newStatus', 'prev', 'next'].includes(k))
                        .map(([key, val]) => (
                            <Flex
                                key={key}
                                justify="space-between"
                                align="flex-start"
                                gap={3}
                                p={2.5}
                                borderRadius="10px"
                                bg="var(--waba-card)"
                                border="1px solid"
                                borderColor="var(--waba-line)"
                            >
                                <Text fontSize="11.5px" fontWeight="700" color="var(--waba-ink-3)" fontFamily="mono" flexShrink={0}>
                                    {key}
                                </Text>
                                <Text fontSize="12px" color="var(--waba-ink)" textAlign="right" wordBreak="break-all">
                                    {typeof val === 'object' ? JSON.stringify(val) : String(val ?? '-')}
                                </Text>
                            </Flex>
                        ))}
                </VStack>
            </VStack>
        );
    };

    return (
        <Drawer.Root open={open} onOpenChange={(e) => onOpenChange(e.open)} placement="end" size="lg">
            <Portal>
                <Drawer.Backdrop bg="blackAlpha.600" backdropFilter="blur(4px)" zIndex={1400} />
                <Drawer.Positioner zIndex={1401}>
                    <Drawer.Content
                        bg="var(--waba-card)"
                        borderLeft="1px solid"
                        borderColor="var(--waba-line)"
                        display="flex"
                        flexDirection="column"
                        maxW="560px"
                        w="100%"
                    >
                        <Drawer.Header p={5} borderBottom="1px solid" borderColor="var(--waba-line)">
                            <Flex justify="space-between" align="flex-start" gap={3} w="100%">
                                {log ? (
                                    <Box flex={1} minW={0}>
                                        <HStack gap={2} mb={1.5} flexWrap="wrap">
                                            <Box
                                                bg={sev.bg}
                                                color={sev.color}
                                                fontSize="10.5px"
                                                fontWeight="800"
                                                px={2.5}
                                                py={0.5}
                                                borderRadius="999px"
                                            >
                                                {sev.label}
                                            </Box>
                                            <Box
                                                bg="var(--waba-surface)"
                                                color="var(--waba-ink-2)"
                                                border="1px solid"
                                                borderColor="var(--waba-line)"
                                                fontSize="10.5px"
                                                fontFamily="mono"
                                                fontWeight="700"
                                                px={2}
                                                py="1px"
                                                borderRadius="999px"
                                            >
                                                {log.action}
                                            </Box>
                                        </HStack>
                                        <Drawer.Title fontSize="17px" fontWeight="800" color="var(--waba-ink)">
                                            감사 로그 #{log.id}
                                        </Drawer.Title>
                                        <Text fontSize="12px" color="var(--waba-ink-3)" mt={0.5}>
                                            {formatDateStr(log.created_at)}
                                        </Text>
                                    </Box>
                                ) : (
                                    <Drawer.Title fontSize="17px" fontWeight="800" color="var(--waba-ink)">
                                        감사 로그 상세
                                    </Drawer.Title>
                                )}
                                <CloseButton
                                    size="sm"
                                    rounded="full"
                                    color="var(--waba-ink)"
                                    flexShrink={0}
                                    _hover={{ bg: 'var(--waba-surface)' }}
                                    onClick={() => onOpenChange(false)}
                                />
                            </Flex>
                        </Drawer.Header>

                        <Drawer.Body p={5} overflowY="auto" flex={1}>
                            {log && (
                                <VStack align="stretch" gap={4}>
                                    {/* 읽기 전용 안내 배너 */}
                                    <HStack
                                        p={3}
                                        borderRadius="12px"
                                        bg="var(--waba-purple-soft)"
                                        border="1px solid"
                                        borderColor="var(--waba-purple-border)"
                                        gap={2}
                                    >
                                        <LuShieldAlert size={15} color="#6338A9" />
                                        <Text fontSize="11.5px" fontWeight="700" color="var(--waba-purple-text)">
                                            이 감사 로그는 보안 및 규정 준수를 위해 수정·삭제할 수 없습니다.
                                        </Text>
                                    </HStack>

                                    {/* 수행 관리자 정보 */}
                                    <Box p={4} borderRadius="16px" bg="var(--waba-surface)" border="1px solid" borderColor="var(--waba-line)">
                                        <Text fontSize="12px" fontWeight="800" color="var(--waba-ink-2)" mb={2.5}>
                                            수행 관리자 정보
                                        </Text>
                                        <HStack gap={3}>
                                            <UserAvatar
                                                src={log.admin_profile_image_url}
                                                alt={log.admin_name || '관리자'}
                                                size="sm"
                                                fallbackType="user"
                                            />
                                            <Box flex={1} minW={0}>
                                                <Text fontSize="13.5px" fontWeight="800" color="var(--waba-ink)">
                                                    {log.admin_name || '알 수 없음'}{' '}
                                                    {log.admin_title ? `(${log.admin_title})` : ''}
                                                </Text>
                                                <Text fontSize="11.5px" color="var(--waba-ink-3)" truncate>
                                                    ID: {log.admin_user_id} · {log.admin_email || '-'}
                                                </Text>
                                                <Text fontSize="11.5px" color="var(--waba-ink-3)" fontFamily="mono">
                                                    IP: {log.ip_address || '-'}
                                                </Text>
                                            </Box>
                                        </HStack>
                                    </Box>

                                    {/* 대상 리소스 */}
                                    <Box p={4} borderRadius="16px" bg="var(--waba-surface)" border="1px solid" borderColor="var(--waba-line)">
                                        <Flex justify="space-between" align="center" mb={2} gap={2} flexWrap="wrap">
                                            <Text fontSize="12px" fontWeight="800" color="var(--waba-ink-2)">
                                                대상 리소스
                                            </Text>
                                            {targetRoute && (
                                                <Button
                                                    size="2xs"
                                                    variant="outline"
                                                    borderColor="var(--waba-purple-border)"
                                                    color="var(--waba-purple-text)"
                                                    borderRadius="999px"
                                                    px={2.5}
                                                    gap={1}
                                                    onClick={() => {
                                                        onOpenChange(false);
                                                        router.push(targetRoute);
                                                    }}
                                                >
                                                    대상 화면 이동
                                                    <LuExternalLink size={11} />
                                                </Button>
                                            )}
                                        </Flex>
                                        <HStack gap={2} mb={2}>
                                            <Box
                                                bg="var(--waba-card)"
                                                color="var(--waba-ink)"
                                                border="1px solid"
                                                borderColor="var(--waba-line)"
                                                fontSize="11px"
                                                fontWeight="700"
                                                px={2}
                                                py="1px"
                                                borderRadius="999px"
                                            >
                                                {log.target_type}
                                            </Box>
                                            {log.target_id && (
                                                <Text fontSize="12px" fontWeight="700" fontFamily="mono" color="var(--waba-ink-2)">
                                                    #{log.target_id}
                                                </Text>
                                            )}
                                        </HStack>
                                        <Text fontSize="13px" fontWeight="700" color="var(--waba-ink)">
                                            {log.summary}
                                        </Text>
                                    </Box>

                                    {/* 구조화된 변경 상세 */}
                                    <Box p={4} borderRadius="16px" bg="var(--waba-surface)" border="1px solid" borderColor="var(--waba-line)">
                                        <Text fontSize="12px" fontWeight="800" color="var(--waba-ink-2)" mb={2.5}>
                                            변경 상세 내용
                                        </Text>
                                        {renderStructuredDetail(log.detail)}
                                    </Box>

                                    {/* 원본 JSON */}
                                    <Box p={4} borderRadius="16px" bg="var(--waba-surface)" border="1px solid" borderColor="var(--waba-line)">
                                        <Flex justify="space-between" align="center" mb={2}>
                                            <Text fontSize="12px" fontWeight="800" color="var(--waba-ink-2)">
                                                원본 detail_json
                                            </Text>
                                            <Button
                                                size="2xs"
                                                variant="outline"
                                                borderColor="var(--waba-line)"
                                                color="var(--waba-ink)"
                                                borderRadius="999px"
                                                px={2.5}
                                                gap={1}
                                                onClick={handleCopyJson}
                                            >
                                                <LuCopy size={11} />
                                                JSON 복사
                                            </Button>
                                        </Flex>
                                        <Box
                                            as="pre"
                                            p={3}
                                            borderRadius="12px"
                                            bg="var(--waba-card)"
                                            border="1px solid"
                                            borderColor="var(--waba-line)"
                                            fontSize="11px"
                                            fontFamily="mono"
                                            color="var(--waba-ink-2)"
                                            overflowX="auto"
                                            maxH="220px"
                                        >
                                            {JSON.stringify(log.detail ?? {}, null, 2)}
                                        </Box>
                                    </Box>
                                </VStack>
                            )}
                        </Drawer.Body>
                    </Drawer.Content>
                </Drawer.Positioner>
            </Portal>
        </Drawer.Root>
    );
}
