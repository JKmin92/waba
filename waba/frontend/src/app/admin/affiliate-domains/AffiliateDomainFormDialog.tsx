'use client'

import React, { useEffect, useState } from 'react';
import {
    Box,
    Button,
    CloseButton,
    Dialog,
    Flex,
    Grid,
    HStack,
    Input,
    Portal,
    Text,
    VStack,
} from '@chakra-ui/react';
import axiosInstance from '@/utils/api';
import { toaster } from '@/components/ui/toaster';

type SubdomainPolicy = 'ALL' | 'SPECIFIC' | 'NONE';

const SUBDOMAIN_POLICY_OPTIONS: { key: SubdomainPolicy; label: string }[] = [
    { key: 'ALL', label: '모든 서브도메인 허용 (*.domain)' },
    { key: 'SPECIFIC', label: '지정 서브도메인만 허용' },
    { key: 'NONE', label: '서브도메인 불허 (루트만)' },
];

function normalizeDomainPreview(raw: string): string {
    const trimmed = raw.trim().toLowerCase();
    if (!trimmed) return '';
    return trimmed
        .replace(/^https?:\/\//, '')
        .split('/')[0]
        .split('?')[0]
        .split('#')[0]
        .split(':')[0]
        .replace(/^\.+|\.+$/g, '');
}

interface AffiliateDomainFormDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    mode: 'create' | 'edit';
    domainItem?: any | null;
    onSaved?: () => void;
}

export default function AffiliateDomainFormDialog({
    open,
    onOpenChange,
    mode,
    domainItem,
    onSaved,
}: AffiliateDomainFormDialogProps) {
    const [mallName, setMallName] = useState('');
    const [domain, setDomain] = useState('');
    const [subdomainPolicy, setSubdomainPolicy] = useState<SubdomainPolicy>('ALL');
    const [allowedSubdomains, setAllowedSubdomains] = useState<string[]>([]);
    const [subdomainInput, setSubdomainInput] = useState('');
    const [isActive, setIsActive] = useState(true);

    const [submitting, setSubmitting] = useState(false);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

    useEffect(() => {
        if (!open) return;
        setDeleteConfirmOpen(false);
        setSubdomainInput('');
        if (mode === 'edit' && domainItem) {
            setMallName(String(domainItem.mall_name || ''));
            setDomain(String(domainItem.domain || ''));
            const policy = String(domainItem.subdomain_policy || 'ALL').toUpperCase();
            setSubdomainPolicy(
                policy === 'SPECIFIC' || policy === 'NONE' ? policy : 'ALL'
            );
            setAllowedSubdomains(
                Array.isArray(domainItem.allowed_subdomains)
                    ? domainItem.allowed_subdomains.map((s: any) => String(s).toLowerCase())
                    : []
            );
            setIsActive(domainItem.is_active === undefined ? true : Boolean(domainItem.is_active));
        } else {
            setMallName('');
            setDomain('');
            setSubdomainPolicy('ALL');
            setAllowedSubdomains([]);
            setIsActive(true);
        }
    }, [open, mode, domainItem]);

    const normalizedDomain = normalizeDomainPreview(domain);

    const handleAddSubdomain = () => {
        let sub = subdomainInput.trim().toLowerCase();
        if (!sub) return;
        if (normalizedDomain && sub.endsWith(`.${normalizedDomain}`)) {
            sub = sub.slice(0, -(normalizedDomain.length + 1));
        }
        sub = sub.replace(/^\.+|\.+$/g, '');
        if (!sub) return;
        if (!allowedSubdomains.includes(sub)) {
            setAllowedSubdomains((prev) => [...prev, sub]);
        }
        setSubdomainInput('');
    };

    const handleRemoveSubdomain = (sub: string) => {
        setAllowedSubdomains((prev) => prev.filter((item) => item !== sub));
    };

    const handleSubmit = async () => {
        if (!mallName.trim()) {
            toaster.create({ title: '쇼핑몰명을 입력해주세요.', type: 'warning' });
            return;
        }
        if (!normalizedDomain) {
            toaster.create({ title: '허용 도메인을 입력해주세요.', type: 'warning' });
            return;
        }
        if (subdomainPolicy === 'SPECIFIC' && allowedSubdomains.length === 0) {
            toaster.create({ title: '지정 서브도메인을 1개 이상 추가해주세요.', type: 'warning' });
            return;
        }

        const payload = {
            mall_name: mallName.trim(),
            domain: normalizedDomain,
            subdomain_policy: subdomainPolicy,
            allowed_subdomains: subdomainPolicy === 'SPECIFIC' ? allowedSubdomains : [],
            is_active: isActive,
        };

        setSubmitting(true);
        try {
            if (mode === 'create') {
                await axiosInstance.post('/admin/affiliate-domains', payload);
                toaster.create({ title: '새 제휴 도메인이 등록되었습니다.', type: 'success' });
            } else if (domainItem?.id) {
                await axiosInstance.patch(`/admin/affiliate-domains/${domainItem.id}`, payload);
                toaster.create({ title: '제휴 도메인 설정이 저장되었습니다.', type: 'success' });
            }
            onOpenChange(false);
            onSaved?.();
        } catch (err: any) {
            toaster.create({
                title: err?.response?.data?.message || '제휴 도메인 저장에 실패했습니다.',
                type: 'error',
            });
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!domainItem?.id) return;
        setSubmitting(true);
        try {
            await axiosInstance.delete(`/admin/affiliate-domains/${domainItem.id}`);
            toaster.create({ title: '제휴 도메인이 삭제되었습니다.', type: 'success' });
            onOpenChange(false);
            onSaved?.();
        } catch (err: any) {
            toaster.create({
                title: err?.response?.data?.message || '제휴 도메인 삭제에 실패했습니다.',
                type: 'error',
            });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog.Root open={open} onOpenChange={(e) => onOpenChange(e.open)} size="lg" placement="center">
            <Portal>
                <Dialog.Backdrop bg="blackAlpha.600" backdropFilter="blur(4px)" zIndex={1400} />
                <Dialog.Positioner zIndex={1401} p={4}>
                    <Dialog.Content
                        bg="var(--waba-card)"
                        borderRadius="24px"
                        border="1px solid"
                        borderColor="var(--waba-line)"
                        p={{ base: 5, md: 6 }}
                        maxW="680px"
                        w="100%"
                        maxH="90vh"
                        display="flex"
                        flexDirection="column"
                        overflow="hidden"
                    >
                        {/* Header */}
                        <Dialog.Header p={0} pb={4} borderBottom="1px solid" borderColor="var(--waba-line)" flexShrink={0}>
                            <Flex justify="space-between" align="flex-start" gap={4} w="100%">
                                <Box flex={1} minW={0}>
                                    <Dialog.Title fontSize="17px" fontWeight="800" color="var(--waba-ink)">
                                        {mode === 'edit' && domainItem
                                            ? `${domainItem.mall_name || '제휴 도메인'} 설정`
                                            : '새 제휴 도메인 추가'}
                                    </Dialog.Title>
                                    <Text fontSize="12px" color="var(--waba-ink-3)" mt={1}>
                                        {mode === 'edit' && domainItem
                                            ? `허용 도메인(${domainItem.domain}) 및 서브도메인 화이트리스트 정책을 수정합니다.`
                                            : '상품 핀에 등록 가능한 제휴 쇼핑몰 도메인과 서브도메인 허용 정책을 등록합니다.'}
                                    </Text>
                                </Box>
                                <CloseButton
                                    size="sm"
                                    rounded="full"
                                    color="var(--waba-ink)"
                                    flexShrink={0}
                                    _hover={{ bg: 'var(--waba-surface)' }}
                                    onClick={() => onOpenChange(false)}
                                />
                            </Flex>
                        </Dialog.Header>

                        {/* Body */}
                        <Dialog.Body p={0} pt={4} overflowY="auto" flex={1}>
                            <VStack align="stretch" gap={4}>
                                <Grid templateColumns={{ base: '1fr', sm: '1fr 1fr' }} gap={3}>
                                    <Box>
                                        <Text fontSize="12px" fontWeight="800" color="var(--waba-ink-2)" mb={1.5}>
                                            쇼핑몰명 *
                                        </Text>
                                        <Input
                                            value={mallName}
                                            onChange={(e) => setMallName(e.target.value)}
                                            placeholder="예: 튼튼팜"
                                            size="sm"
                                            h="36px"
                                            bg="var(--waba-surface)"
                                            borderColor="var(--waba-line)"
                                            color="var(--waba-ink)"
                                        />
                                    </Box>
                                    <Box>
                                        <Text fontSize="12px" fontWeight="800" color="var(--waba-ink-2)" mb={1.5}>
                                            허용 도메인 *
                                        </Text>
                                        <Input
                                            value={domain}
                                            onChange={(e) => setDomain(e.target.value)}
                                            placeholder="예: tntnfarm.com"
                                            size="sm"
                                            h="36px"
                                            fontFamily="mono"
                                            bg="var(--waba-surface)"
                                            borderColor="var(--waba-line)"
                                            color="var(--waba-ink)"
                                        />
                                        <Text fontSize="11px" color="var(--waba-ink-3)" mt={1}>
                                            전체 URL을 붙여넣어도 도메인만 자동 추출됩니다.
                                        </Text>
                                    </Box>
                                </Grid>

                                {/* 서브도메인 허용 정책 */}
                                <Box>
                                    <Text fontSize="12px" fontWeight="800" color="var(--waba-ink-2)" mb={2}>
                                        서브도메인 허용 정책
                                    </Text>
                                    <HStack gap={2} flexWrap="wrap">
                                        {SUBDOMAIN_POLICY_OPTIONS.map((opt) => {
                                            const active = subdomainPolicy === opt.key;
                                            return (
                                                <Button
                                                    key={opt.key}
                                                    size="xs"
                                                    h="32px"
                                                    px={3.5}
                                                    borderRadius="999px"
                                                    bg={active ? '#6338A9' : 'var(--waba-surface)'}
                                                    color={active ? '#FFFFFF' : 'var(--waba-ink-2)'}
                                                    border="1px solid"
                                                    borderColor={active ? '#6338A9' : 'var(--waba-line)'}
                                                    fontSize="11.5px"
                                                    fontWeight="700"
                                                    onClick={() => setSubdomainPolicy(opt.key)}
                                                >
                                                    {opt.label}
                                                </Button>
                                            );
                                        })}
                                    </HStack>

                                    {subdomainPolicy === 'SPECIFIC' && (
                                        <VStack
                                            align="stretch"
                                            gap={3}
                                            mt={3}
                                            p={3.5}
                                            borderRadius="14px"
                                            bg="var(--waba-surface)"
                                            border="1px solid"
                                            borderColor="var(--waba-purple-border)"
                                        >
                                            <HStack gap={2}>
                                                <Input
                                                    value={subdomainInput}
                                                    onChange={(e) => setSubdomainInput(e.target.value)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            e.preventDefault();
                                                            handleAddSubdomain();
                                                        }
                                                    }}
                                                    placeholder="예: m 또는 m.tntnfarm.com 입력"
                                                    size="sm"
                                                    h="34px"
                                                    bg="var(--waba-card)"
                                                    borderColor="var(--waba-line)"
                                                    color="var(--waba-ink)"
                                                />
                                                <Button
                                                    size="xs"
                                                    h="34px"
                                                    px={4}
                                                    borderRadius="999px"
                                                    bg="#6338A9"
                                                    color="#FFFFFF"
                                                    _hover={{ bg: '#522B8F' }}
                                                    onClick={handleAddSubdomain}
                                                >
                                                    추가
                                                </Button>
                                            </HStack>

                                            {allowedSubdomains.length > 0 && (
                                                <HStack gap={1.5} flexWrap="wrap">
                                                    {allowedSubdomains.map((sub) => (
                                                        <Button
                                                            key={sub}
                                                            size="2xs"
                                                            variant="outline"
                                                            borderColor="var(--waba-purple-border)"
                                                            bg="var(--waba-purple-soft)"
                                                            color="var(--waba-purple-text)"
                                                            borderRadius="999px"
                                                            px={2.5}
                                                            fontFamily="mono"
                                                            onClick={() => handleRemoveSubdomain(sub)}
                                                        >
                                                            {sub}.{normalizedDomain || 'domain'} ×
                                                        </Button>
                                                    ))}
                                                </HStack>
                                            )}

                                            <Box
                                                p={3}
                                                borderRadius="10px"
                                                bg="var(--waba-card)"
                                                border="1px solid"
                                                borderColor="var(--waba-line)"
                                            >
                                                <Text fontSize="11.5px" fontWeight="700" color="#10B981">
                                                    ✓ 허용: {normalizedDomain || '도메인'}
                                                    {allowedSubdomains.length > 0
                                                        ? `, ${allowedSubdomains.map((s) => `${s}.${normalizedDomain || '도메인'}`).join(', ')}`
                                                        : ' (지정 서브도메인을 추가하세요)'}
                                                </Text>
                                                <Text fontSize="11.5px" fontWeight="700" color="#EF4444" mt={1}>
                                                    ✕ 차단: 그 외 모든 서브도메인 (예: www.{normalizedDomain || '도메인'}, shop.{normalizedDomain || '도메인'})
                                                </Text>
                                            </Box>
                                        </VStack>
                                    )}
                                </Box>

                                {/* 활성 상태 토글 */}
                                <Box>
                                    <Text fontSize="12px" fontWeight="800" color="var(--waba-ink-2)" mb={2}>
                                        {mode === 'edit' ? '활성 상태 (활성 / 비활성)' : '즉시 활성화'}
                                    </Text>
                                    <Flex
                                        p={3.5}
                                        borderRadius="14px"
                                        bg="var(--waba-surface)"
                                        border="1px solid"
                                        borderColor={isActive ? 'rgba(16, 185, 129, 0.35)' : 'rgba(239, 68, 68, 0.35)'}
                                        justify="space-between"
                                        align="center"
                                        gap={3}
                                        cursor="pointer"
                                        onClick={() => setIsActive((p) => !p)}
                                    >
                                        <Box>
                                            <Text fontSize="13px" fontWeight="700" color="var(--waba-ink)">
                                                {isActive ? '도메인 활성화됨' : '도메인 비활성화됨'}
                                            </Text>
                                            <Text fontSize="11.5px" color="var(--waba-ink-3)" mt={0.5}>
                                                비활성화 시 신규 상품 핀 등록·수정에서 즉시 차단되며, 기존 게시글 핀은 유지됩니다.
                                            </Text>
                                        </Box>
                                        <Box
                                            px={3}
                                            py={1}
                                            borderRadius="999px"
                                            fontSize="11px"
                                            fontWeight="800"
                                            bg={isActive ? 'rgba(16, 185, 129, 0.14)' : 'rgba(239, 68, 68, 0.14)'}
                                            color={isActive ? '#10B981' : '#EF4444'}
                                            flexShrink={0}
                                        >
                                            {isActive ? '활성' : '비활성'}
                                        </Box>
                                    </Flex>
                                </Box>
                            </VStack>
                        </Dialog.Body>

                        {/* Footer */}
                        <Dialog.Footer p={0} pt={4} mt={4} borderTop="1px solid" borderColor="var(--waba-line)" flexShrink={0}>
                            <Flex justify="space-between" align="center" w="100%" gap={3} flexWrap="wrap">
                                <Box>
                                    {mode === 'edit' && domainItem && (
                                        deleteConfirmOpen ? (
                                            <HStack gap={1.5}>
                                                <Button
                                                    size="xs"
                                                    bg="#E53E3E"
                                                    color="#FFFFFF"
                                                    borderRadius="999px"
                                                    loading={submitting}
                                                    onClick={handleDelete}
                                                >
                                                    삭제 확정
                                                </Button>
                                                <Button
                                                    size="xs"
                                                    variant="ghost"
                                                    color="var(--waba-ink-2)"
                                                    onClick={() => setDeleteConfirmOpen(false)}
                                                >
                                                    취소
                                                </Button>
                                            </HStack>
                                        ) : (
                                            <Button
                                                size="xs"
                                                variant="outline"
                                                borderColor="rgba(239, 68, 68, 0.4)"
                                                color="#EF4444"
                                                borderRadius="999px"
                                                onClick={() => setDeleteConfirmOpen(true)}
                                            >
                                                도메인 삭제
                                            </Button>
                                        )
                                    )}
                                </Box>

                                <HStack gap={2}>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        borderColor="var(--waba-line)"
                                        color="var(--waba-ink-2)"
                                        borderRadius="999px"
                                        px={4}
                                        onClick={() => onOpenChange(false)}
                                    >
                                        취소
                                    </Button>
                                    <Button
                                        size="sm"
                                        bg="#6338A9"
                                        color="#FFFFFF"
                                        _hover={{ bg: '#522B8F' }}
                                        borderRadius="999px"
                                        px={5}
                                        loading={submitting}
                                        onClick={handleSubmit}
                                    >
                                        {mode === 'edit' ? '변경 사항 저장' : '도메인 등록'}
                                    </Button>
                                </HStack>
                            </Flex>
                        </Dialog.Footer>
                    </Dialog.Content>
                </Dialog.Positioner>
            </Portal>
        </Dialog.Root>
    );
}
