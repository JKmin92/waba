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
    IconButton,
    Input,
    Portal,
    Spinner,
    Text,
    Textarea,
    VStack,
} from '@chakra-ui/react';
import { LuSearch, LuShield, LuShieldAlert } from 'react-icons/lu';
import axiosInstance from '@/utils/api';
import { toaster } from '@/components/ui/toaster';
import UserAvatar from '../../(main)/common/UserAvatar';

export interface AdminAccountItem {
    id: string;
    email: string;
    nickname: string;
    profile_image_url?: string | null;
    admin_level: 'SUPER' | 'NORMAL';
    admin_name?: string | null;
    admin_title?: string | null;
    status: 'ACTIVE' | 'SUSPENDED';
    last_login_at?: string | null;
    created_at?: string;
}

interface PromoteAdminDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSaved: () => void;
}

export function PromoteAdminDialog({
    open,
    onOpenChange,
    onSaved,
}: PromoteAdminDialogProps) {
    const [searchInput, setSearchInput] = useState('');
    const [candidates, setCandidates] = useState<any[]>([]);
    const [searching, setSearching] = useState(false);
    const [selectedUser, setSelectedUser] = useState<any | null>(null);

    const [adminLevel, setAdminLevel] = useState<'SUPER' | 'NORMAL'>('NORMAL');
    const [adminName, setAdminName] = useState('');
    const [adminTitle, setAdminTitle] = useState('');
    const [reason, setReason] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (!open) return;
        setSearchInput('');
        setCandidates([]);
        setSelectedUser(null);
        setAdminLevel('NORMAL');
        setAdminName('');
        setAdminTitle('');
        setReason('');
    }, [open]);

    const handleSearchCandidates = async () => {
        setSearching(true);
        try {
            const res = await axiosInstance.get('/admin/admins/candidates', {
                params: { q: searchInput.trim() || undefined, limit: 10 },
            });
            setCandidates(res.data?.users || []);
        } catch {
            toaster.create({ title: '후보 회원 검색에 실패했습니다.', type: 'error' });
        } finally {
            setSearching(false);
        }
    };

    const handleSubmit = async () => {
        if (!selectedUser?.id) {
            toaster.create({ title: '관리자로 등록할 회원을 선택해주세요.', type: 'warning' });
            return;
        }
        setSubmitting(true);
        try {
            await axiosInstance.post('/admin/admins', {
                userId: selectedUser.id,
                admin_level: adminLevel,
                admin_name: adminName.trim() || null,
                admin_title: adminTitle.trim() || null,
                reason: reason.trim() || null,
            });
            toaster.create({ title: '관리자가 등록되었습니다.', type: 'success' });
            onOpenChange(false);
            onSaved();
        } catch (err: any) {
            toaster.create({ title: err?.response?.data?.message || '관리자 등록에 실패했습니다.', type: 'error' });
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
                        maxW="640px"
                        w="100%"
                        maxH="90vh"
                        display="flex"
                        flexDirection="column"
                        overflow="hidden"
                    >
                        <Dialog.Header p={0} pb={4} borderBottom="1px solid" borderColor="var(--waba-line)" flexShrink={0}>
                            <Flex justify="space-between" align="flex-start" gap={4} w="100%">
                                <Box>
                                    <Dialog.Title fontSize="17px" fontWeight="800" color="var(--waba-ink)">
                                        새 관리자 등록
                                    </Dialog.Title>
                                    <Text fontSize="12px" color="var(--waba-ink-3)" mt={1}>
                                        기존 활성 회원을 검색하여 관리자 권한을 부여합니다.
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

                        <Dialog.Body p={0} pt={4} overflowY="auto" flex={1}>
                            <VStack align="stretch" gap={4}>
                                {/* Candidate Search */}
                                <Box>
                                    <Text fontSize="12px" fontWeight="800" color="var(--waba-ink-2)" mb={1.5}>
                                        회원 검색 *
                                    </Text>
                                    <HStack gap={2} mb={2.5}>
                                        <Input
                                            value={searchInput}
                                            onChange={(e) => setSearchInput(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') handleSearchCandidates();
                                            }}
                                            placeholder="닉네임 또는 이메일로 검색..."
                                            size="sm"
                                            h="36px"
                                            bg="var(--waba-surface)"
                                            borderColor="var(--waba-line)"
                                            color="var(--waba-ink)"
                                        />
                                        <IconButton
                                            aria-label="검색"
                                            size="sm"
                                            h="36px"
                                            w="36px"
                                            borderRadius="10px"
                                            bg="#6338A9"
                                            color="#FFFFFF"
                                            onClick={handleSearchCandidates}
                                        >
                                            <LuSearch size={14} />
                                        </IconButton>
                                    </HStack>

                                    {searching ? (
                                        <Flex py={4} justify="center">
                                            <Spinner size="sm" color="#6338A9" />
                                        </Flex>
                                    ) : candidates.length > 0 ? (
                                        <VStack align="stretch" gap={1.5} maxH="160px" overflowY="auto">
                                            {candidates.map((u) => {
                                                const isSelected = selectedUser?.id === u.id;
                                                return (
                                                    <Flex
                                                        key={u.id}
                                                        p={2.5}
                                                        borderRadius="12px"
                                                        bg={isSelected ? 'var(--waba-purple-soft)' : 'var(--waba-surface)'}
                                                        border="1px solid"
                                                        borderColor={isSelected ? 'var(--waba-purple-border)' : 'var(--waba-line)'}
                                                        justify="space-between"
                                                        align="center"
                                                        cursor="pointer"
                                                        onClick={() => {
                                                            setSelectedUser(u);
                                                            if (!adminName) setAdminName(u.nickname || '');
                                                        }}
                                                    >
                                                        <HStack gap={2.5}>
                                                            <UserAvatar src={u.profile_image_url} alt={u.nickname || '회원'} size="2xs" fallbackType="user" />
                                                            <Box>
                                                                <Text fontSize="12.5px" fontWeight="700" color="var(--waba-ink)">
                                                                    {u.nickname || '-'}
                                                                </Text>
                                                                <Text fontSize="11px" color="var(--waba-ink-3)">
                                                                    {u.email}
                                                                </Text>
                                                            </Box>
                                                        </HStack>
                                                        {isSelected && (
                                                            <Text fontSize="11px" fontWeight="800" color="var(--waba-purple-text)">
                                                                선택됨
                                                            </Text>
                                                        )}
                                                    </Flex>
                                                );
                                            })}
                                        </VStack>
                                    ) : null}
                                </Box>

                                {/* 2-Card Radio for Level */}
                                <Box>
                                    <Text fontSize="12px" fontWeight="800" color="var(--waba-ink-2)" mb={2}>
                                        관리자 등급 선택
                                    </Text>
                                    <Grid templateColumns={{ base: '1fr', sm: '1fr 1fr' }} gap={2.5}>
                                        {[
                                            {
                                                key: 'NORMAL' as const,
                                                title: '일반 관리자 (NORMAL)',
                                                desc: '회원·콘텐츠·신고·배너 등 일반 운영 관리',
                                            },
                                            {
                                                key: 'SUPER' as const,
                                                title: '슈퍼 관리자 (SUPER)',
                                                desc: '감사 로그 열람 + 관리자 계정 등록/변경 가능',
                                            },
                                        ].map((opt) => {
                                            const active = adminLevel === opt.key;
                                            return (
                                                <Box
                                                    key={opt.key}
                                                    p={3.5}
                                                    borderRadius="14px"
                                                    bg={active ? 'var(--waba-purple-soft)' : 'var(--waba-surface)'}
                                                    border="1px solid"
                                                    borderColor={active ? 'var(--waba-purple-border)' : 'var(--waba-line)'}
                                                    cursor="pointer"
                                                    onClick={() => setAdminLevel(opt.key)}
                                                >
                                                    <Text fontSize="12.5px" fontWeight="800" color={active ? 'var(--waba-purple-text)' : 'var(--waba-ink)'}>
                                                        {opt.title}
                                                    </Text>
                                                    <Text fontSize="11px" color="var(--waba-ink-3)" mt={1}>
                                                        {opt.desc}
                                                    </Text>
                                                </Box>
                                            );
                                        })}
                                    </Grid>
                                </Box>

                                <Grid templateColumns={{ base: '1fr', sm: '1fr 1fr' }} gap={3}>
                                    <Box>
                                        <Text fontSize="12px" fontWeight="800" color="var(--waba-ink-2)" mb={1.5}>
                                            표시 이름 (admin_name)
                                        </Text>
                                        <Input
                                            value={adminName}
                                            onChange={(e) => setAdminName(e.target.value)}
                                            placeholder="예: 홍길동"
                                            size="sm"
                                            h="36px"
                                            bg="var(--waba-surface)"
                                            borderColor="var(--waba-line)"
                                            color="var(--waba-ink)"
                                        />
                                    </Box>
                                    <Box>
                                        <Text fontSize="12px" fontWeight="800" color="var(--waba-ink-2)" mb={1.5}>
                                            직함 (admin_title)
                                        </Text>
                                        <Input
                                            value={adminTitle}
                                            onChange={(e) => setAdminTitle(e.target.value)}
                                            placeholder="예: 운영 매니저"
                                            size="sm"
                                            h="36px"
                                            bg="var(--waba-surface)"
                                            borderColor="var(--waba-line)"
                                            color="var(--waba-ink)"
                                        />
                                    </Box>
                                </Grid>

                                <Box>
                                    <Text fontSize="12px" fontWeight="800" color="var(--waba-ink-2)" mb={1.5}>
                                        등록 사유 (선택)
                                    </Text>
                                    <Textarea
                                        value={reason}
                                        onChange={(e) => setReason(e.target.value)}
                                        placeholder="관리자 등록 사유를 입력하세요..."
                                        rows={2}
                                        bg="var(--waba-surface)"
                                        borderColor="var(--waba-line)"
                                        color="var(--waba-ink)"
                                        fontSize="12.5px"
                                    />
                                </Box>
                            </VStack>
                        </Dialog.Body>

                        <Dialog.Footer p={0} pt={4} mt={4} borderTop="1px solid" borderColor="var(--waba-line)" flexShrink={0}>
                            <HStack justify="flex-end" gap={2} w="100%">
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
                                    관리자 등록
                                </Button>
                            </HStack>
                        </Dialog.Footer>
                    </Dialog.Content>
                </Dialog.Positioner>
            </Portal>
        </Dialog.Root>
    );
}

interface EditAdminDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    admin: AdminAccountItem | null;
    isSelf: boolean;
    isLastSuper: boolean;
    onSaved: () => void;
}

export function EditAdminDialog({
    open,
    onOpenChange,
    admin,
    isSelf,
    isLastSuper,
    onSaved,
}: EditAdminDialogProps) {
    const [adminLevel, setAdminLevel] = useState<'SUPER' | 'NORMAL'>('NORMAL');
    const [adminName, setAdminName] = useState('');
    const [adminTitle, setAdminTitle] = useState('');
    const [status, setStatus] = useState<'ACTIVE' | 'SUSPENDED'>('ACTIVE');
    const [reason, setReason] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const [demoteConfirmOpen, setDemoteConfirmOpen] = useState(false);
    const [demoteReason, setDemoteReason] = useState('');

    useEffect(() => {
        if (!open || !admin) return;
        setAdminLevel(admin.admin_level || 'NORMAL');
        setAdminName(admin.admin_name || '');
        setAdminTitle(admin.admin_title || '');
        setStatus(admin.status || 'ACTIVE');
        setReason('');
        setDemoteConfirmOpen(false);
        setDemoteReason('');
    }, [open, admin]);

    const protectedAccount = isSelf || isLastSuper;

    const handleSave = async () => {
        if (!admin?.id) return;
        setSubmitting(true);
        try {
            await axiosInstance.patch(`/admin/admins/${admin.id}`, {
                admin_level: adminLevel,
                admin_name: adminName.trim() || null,
                admin_title: adminTitle.trim() || null,
                status,
                reason: reason.trim() || null,
            });
            toaster.create({ title: '관리자 정보가 수정되었습니다.', type: 'success' });
            onOpenChange(false);
            onSaved();
        } catch (err: any) {
            toaster.create({ title: err?.response?.data?.message || '수정에 실패했습니다.', type: 'error' });
        } finally {
            setSubmitting(false);
        }
    };

    const handleDemote = async () => {
        if (!admin?.id) return;
        setSubmitting(true);
        try {
            await axiosInstance.delete(`/admin/admins/${admin.id}`, {
                data: { reason: demoteReason.trim() || null },
            });
            toaster.create({ title: '관리자 권한이 해제되었습니다.', type: 'success' });
            onOpenChange(false);
            onSaved();
        } catch (err: any) {
            toaster.create({ title: err?.response?.data?.message || '권한 해제에 실패했습니다.', type: 'error' });
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
                        maxW="620px"
                        w="100%"
                        maxH="90vh"
                        display="flex"
                        flexDirection="column"
                        overflow="hidden"
                    >
                        <Dialog.Header p={0} pb={4} borderBottom="1px solid" borderColor="var(--waba-line)" flexShrink={0}>
                            <Flex justify="space-between" align="flex-start" gap={4} w="100%">
                                <Box>
                                    <Dialog.Title fontSize="17px" fontWeight="800" color="var(--waba-ink)">
                                        관리자 정보 수정
                                    </Dialog.Title>
                                    <Text fontSize="12px" color="var(--waba-ink-3)" mt={1}>
                                        관리자 등급, 표시 이름, 직함 및 계정 상태를 관리합니다.
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

                        <Dialog.Body p={0} pt={4} overflowY="auto" flex={1}>
                            {admin && (
                                <VStack align="stretch" gap={4}>
                                    {/* Profile Summary */}
                                    <HStack p={3.5} borderRadius="14px" bg="var(--waba-surface)" border="1px solid" borderColor="var(--waba-line)" gap={3}>
                                        <UserAvatar src={admin.profile_image_url} alt={admin.nickname || '관리자'} size="sm" fallbackType="user" />
                                        <Box flex={1} minW={0}>
                                            <HStack gap={1.5}>
                                                <Text fontSize="13.5px" fontWeight="800" color="var(--waba-ink)">
                                                    {admin.admin_name || admin.nickname}
                                                </Text>
                                                {isSelf && (
                                                    <Box bg="var(--waba-purple-soft)" color="var(--waba-purple-text)" fontSize="10px" fontWeight="800" px={1.5} py="1px" borderRadius="999px">
                                                        나
                                                    </Box>
                                                )}
                                            </HStack>
                                            <Text fontSize="11.5px" color="var(--waba-ink-3)">
                                                {admin.email} · @{admin.nickname}
                                            </Text>
                                        </Box>
                                    </HStack>

                                    {protectedAccount && (
                                        <HStack p={3} borderRadius="12px" bg="rgba(245, 158, 11, 0.12)" border="1px solid" borderColor="rgba(245, 158, 11, 0.35)" gap={2}>
                                            <LuShieldAlert size={15} color="#D97706" />
                                            <Text fontSize="11.5px" fontWeight="700" color="#D97706">
                                                {isSelf
                                                    ? '본인 계정은 등급 강등, 정지 및 권한 해제를 할 수 없습니다.'
                                                    : '마지막 활성 슈퍼 관리자 계정은 강등, 정지 및 권한 해제를 할 수 없습니다.'}
                                            </Text>
                                        </HStack>
                                    )}

                                    <Grid templateColumns={{ base: '1fr', sm: '1fr 1fr' }} gap={3}>
                                        <Box>
                                            <Text fontSize="12px" fontWeight="800" color="var(--waba-ink-2)" mb={1.5}>
                                                관리자 등급
                                            </Text>
                                            <HStack gap={2}>
                                                {(['NORMAL', 'SUPER'] as const).map((lvl) => (
                                                    <Button
                                                        key={lvl}
                                                        size="xs"
                                                        h="32px"
                                                        flex={1}
                                                        borderRadius="999px"
                                                        disabled={protectedAccount}
                                                        bg={adminLevel === lvl ? '#6338A9' : 'var(--waba-surface)'}
                                                        color={adminLevel === lvl ? '#FFFFFF' : 'var(--waba-ink-2)'}
                                                        border="1px solid"
                                                        borderColor={adminLevel === lvl ? '#6338A9' : 'var(--waba-line)'}
                                                        fontWeight="700"
                                                        onClick={() => setAdminLevel(lvl)}
                                                    >
                                                        {lvl === 'SUPER' ? '슈퍼 관리자' : '일반 관리자'}
                                                    </Button>
                                                ))}
                                            </HStack>
                                        </Box>

                                        <Box>
                                            <Text fontSize="12px" fontWeight="800" color="var(--waba-ink-2)" mb={1.5}>
                                                계정 상태
                                            </Text>
                                            <HStack gap={2}>
                                                {(['ACTIVE', 'SUSPENDED'] as const).map((st) => (
                                                    <Button
                                                        key={st}
                                                        size="xs"
                                                        h="32px"
                                                        flex={1}
                                                        borderRadius="999px"
                                                        disabled={protectedAccount}
                                                        bg={status === st ? (st === 'ACTIVE' ? '#10B981' : '#EF4444') : 'var(--waba-surface)'}
                                                        color={status === st ? '#FFFFFF' : 'var(--waba-ink-2)'}
                                                        border="1px solid"
                                                        borderColor={status === st ? 'transparent' : 'var(--waba-line)'}
                                                        fontWeight="700"
                                                        onClick={() => setStatus(st)}
                                                    >
                                                        {st === 'ACTIVE' ? '활성' : '정지'}
                                                    </Button>
                                                ))}
                                            </HStack>
                                        </Box>
                                    </Grid>

                                    <Grid templateColumns={{ base: '1fr', sm: '1fr 1fr' }} gap={3}>
                                        <Box>
                                            <Text fontSize="12px" fontWeight="800" color="var(--waba-ink-2)" mb={1.5}>
                                                표시 이름 (admin_name)
                                            </Text>
                                            <Input
                                                value={adminName}
                                                onChange={(e) => setAdminName(e.target.value)}
                                                size="sm"
                                                h="36px"
                                                bg="var(--waba-surface)"
                                                borderColor="var(--waba-line)"
                                                color="var(--waba-ink)"
                                            />
                                        </Box>
                                        <Box>
                                            <Text fontSize="12px" fontWeight="800" color="var(--waba-ink-2)" mb={1.5}>
                                                직함 (admin_title)
                                            </Text>
                                            <Input
                                                value={adminTitle}
                                                onChange={(e) => setAdminTitle(e.target.value)}
                                                size="sm"
                                                h="36px"
                                                bg="var(--waba-surface)"
                                                borderColor="var(--waba-line)"
                                                color="var(--waba-ink)"
                                            />
                                        </Box>
                                    </Grid>

                                    <Box>
                                        <Text fontSize="12px" fontWeight="800" color="var(--waba-ink-2)" mb={1.5}>
                                            변경 사유 (선택)
                                        </Text>
                                        <Textarea
                                            value={reason}
                                            onChange={(e) => setReason(e.target.value)}
                                            placeholder="변경 사유를 입력하세요..."
                                            rows={2}
                                            bg="var(--waba-surface)"
                                            borderColor="var(--waba-line)"
                                            color="var(--waba-ink)"
                                            fontSize="12.5px"
                                        />
                                    </Box>

                                    {/* Danger Zone */}
                                    <Box p={4} borderRadius="14px" bg="rgba(239, 68, 68, 0.06)" border="1px solid" borderColor="rgba(239, 68, 68, 0.25)">
                                        <Text fontSize="12px" fontWeight="800" color="#EF4444" mb={2}>
                                            위험 구역 (Danger Zone)
                                        </Text>
                                        {!demoteConfirmOpen ? (
                                            <Button
                                                size="xs"
                                                variant="outline"
                                                borderColor="rgba(239, 68, 68, 0.45)"
                                                color="#EF4444"
                                                borderRadius="999px"
                                                disabled={protectedAccount}
                                                onClick={() => setDemoteConfirmOpen(true)}
                                            >
                                                관리자 권한 해제 (일반 회원으로 전환)
                                            </Button>
                                        ) : (
                                            <VStack align="stretch" gap={2}>
                                                <Input
                                                    value={demoteReason}
                                                    onChange={(e) => setDemoteReason(e.target.value)}
                                                    placeholder="권한 해제 사유 입력..."
                                                    size="xs"
                                                    h="32px"
                                                    bg="var(--waba-card)"
                                                    borderColor="var(--waba-line)"
                                                    color="var(--waba-ink)"
                                                />
                                                <HStack gap={2}>
                                                    <Button
                                                        size="xs"
                                                        bg="#E53E3E"
                                                        color="#FFFFFF"
                                                        borderRadius="999px"
                                                        loading={submitting}
                                                        onClick={handleDemote}
                                                    >
                                                        권한 해제 확정
                                                    </Button>
                                                    <Button
                                                        size="xs"
                                                        variant="ghost"
                                                        color="var(--waba-ink-2)"
                                                        onClick={() => setDemoteConfirmOpen(false)}
                                                    >
                                                        취소
                                                    </Button>
                                                </HStack>
                                            </VStack>
                                        )}
                                    </Box>
                                </VStack>
                            )}
                        </Dialog.Body>

                        <Dialog.Footer p={0} pt={4} mt={4} borderTop="1px solid" borderColor="var(--waba-line)" flexShrink={0}>
                            <HStack justify="flex-end" gap={2} w="100%">
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
                                    onClick={handleSave}
                                >
                                    저장
                                </Button>
                            </HStack>
                        </Dialog.Footer>
                    </Dialog.Content>
                </Dialog.Positioner>
            </Portal>
        </Dialog.Root>
    );
}
