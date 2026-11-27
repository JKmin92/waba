'use client'

import React, { useCallback, useEffect, useState } from 'react';
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
    Spinner,
    Text,
    VStack,
} from '@chakra-ui/react';
import { LuCopy, LuExternalLink } from 'react-icons/lu';
import axiosInstance from '@/utils/api';
import { toaster } from '@/components/ui/toaster';
import UserAvatar from '../../(main)/common/UserAvatar';
import PostReportDetailDialog from '../components/PostReportDetailDialog';
import { useAdminContext } from '../AdminContext';

interface UserDetailDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    userId: string | null;
    onUpdated: () => void;
}

type DetailTab = 'basic' | 'pets' | 'posts' | 'reports' | 'histories' | 'journeys';

export default function UserDetailDialog({
    open,
    onOpenChange,
    userId,
    onUpdated,
}: UserDetailDialogProps) {
    const { isSuperAdmin } = useAdminContext();
    const [activeTab, setActiveTab] = useState<DetailTab>('basic');
    const [loading, setLoading] = useState(false);
    const [detail, setDetail] = useState<any>(null);

    // Role / Vet / Admin form
    const [role, setRole] = useState('USER');
    const [vetLicenseNumber, setVetLicenseNumber] = useState('');
    const [vetHospitalName, setVetHospitalName] = useState('');
    const [adminTitle, setAdminTitle] = useState('');
    const [adminName, setAdminName] = useState('');
    const [savingRole, setSavingRole] = useState(false);

    // Status form
    const [status, setStatus] = useState('ACTIVE');
    const [statusReason, setStatusReason] = useState('');
    const [savingStatus, setSavingStatus] = useState(false);

    // Post moderation inline forms
    const [extendPurgePostId, setExtendPurgePostId] = useState<string | null>(null);
    const [extendDays, setExtendDays] = useState('7');
    const [extendReason, setExtendReason] = useState('');
    const [rejectAppealPostId, setRejectAppealPostId] = useState<string | null>(null);
    const [rejectAppealReason, setRejectAppealReason] = useState('');
    const [blockReappeal, setBlockReappeal] = useState(false);
    const [postActionLoading, setPostActionLoading] = useState(false);

    // PostReportDetailDialog state
    const [reportDetailPostId, setReportDetailPostId] = useState<string | null>(null);
    const [reportDetailInitialTab, setReportDetailInitialTab] = useState<'reports' | 'appeals'>('reports');
    const [reportDetailOpen, setReportDetailOpen] = useState(false);

    const fetchDetail = useCallback(async (id: string) => {
        setLoading(true);
        try {
            const res = await axiosInstance.get(`/admin/users/${id}`);
            const data = res.data;
            setDetail(data);
            const u = data?.user;
            if (u) {
                setRole(u.role || 'USER');
                setVetLicenseNumber(
                    u.vet_license_number || (u.role === 'VET' && !u.vet_hospital_name ? (u.vet_license_info || '') : '')
                );
                setVetHospitalName(u.vet_hospital_name || '');
                setAdminTitle(u.admin_title || '');
                setAdminName(u.admin_name || '');
                setStatus(u.status || 'ACTIVE');
                setStatusReason('');
            }
        } catch {
            toaster.create({ title: '회원 상세 정보를 불러오지 못했습니다.', type: 'error' });
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (open && userId) {
            setActiveTab('basic');
            fetchDetail(userId);
        } else if (!open) {
            setDetail(null);
        }
    }, [open, userId, fetchDetail]);

    const handleCopyId = () => {
        if (!detail?.user?.id) return;
        navigator.clipboard.writeText(String(detail.user.id));
        toaster.create({ title: '회원 ID가 복사되었습니다.', type: 'info' });
    };

    const handleSaveRole = async () => {
        if (!userId) return;
        setSavingRole(true);
        try {
            const payload: Record<string, any> = { role };
            if (role === 'VET') {
                payload.vet_license_number = vetLicenseNumber.trim() || null;
                payload.vet_hospital_name = vetHospitalName.trim() || null;
            } else if (role === 'ADMIN') {
                payload.admin_title = adminTitle.trim() || null;
                payload.admin_name = adminName.trim() || null;
            }
            await axiosInstance.patch(`/admin/users/${userId}`, payload);
            toaster.create({ title: '권한 정보가 저장되었습니다.', type: 'success' });
            await fetchDetail(userId);
            onUpdated();
        } catch (err: any) {
            toaster.create({
                title: err?.response?.data?.message || '권한 정보 저장에 실패했습니다.',
                type: 'error',
            });
        } finally {
            setSavingRole(false);
        }
    };

    const handleSaveStatus = async () => {
        if (!userId) return;
        setSavingStatus(true);
        try {
            await axiosInstance.patch(`/admin/users/${userId}`, {
                status,
                reason: statusReason.trim() || undefined,
            });
            toaster.create({ title: '계정 상태가 변경되었습니다.', type: 'success' });
            setStatusReason('');
            await fetchDetail(userId);
            onUpdated();
        } catch (err: any) {
            toaster.create({
                title: err?.response?.data?.message || '계정 상태 변경에 실패했습니다.',
                type: 'error',
            });
        } finally {
            setSavingStatus(false);
        }
    };

    const handleTogglePetStatus = async (pet: any) => {
        if (!userId) return;
        const nextDeleted = !Boolean(pet.is_deleted);
        try {
            await axiosInstance.patch(`/admin/pets/${pet.id}/status`, {
                is_deleted: nextDeleted,
                reason: nextDeleted ? '관리자 삭제 처리' : '관리자 복구 처리',
            });
            toaster.create({
                title: nextDeleted ? `'${pet.name}' 삭제 처리되었습니다.` : `'${pet.name}' 복구되었습니다.`,
                type: 'success',
            });
            await fetchDetail(userId);
            onUpdated();
        } catch (err: any) {
            toaster.create({
                title: err?.response?.data?.message || '반려동물 상태 변경에 실패했습니다.',
                type: 'error',
            });
        }
    };

    const handleExtendPurge = async (postId: string, maxExtend: number) => {
        if (!userId) return;
        const days = Number(extendDays);
        if (!days || days < 1 || days > maxExtend) {
            toaster.create({ title: `연장 일수는 1 ~ ${maxExtend}일 사이로 입력해주세요.`, type: 'warning' });
            return;
        }
        if (!extendReason.trim()) {
            toaster.create({ title: '연장 사유를 입력해주세요.', type: 'warning' });
            return;
        }
        setPostActionLoading(true);
        try {
            await axiosInstance.patch(`/admin/posts/${postId}/extend-purge`, {
                extendDays: days,
                reason: extendReason.trim(),
            });
            toaster.create({ title: `영구 삭제 예정일이 ${days}일 연장되었습니다.`, type: 'success' });
            setExtendPurgePostId(null);
            setExtendReason('');
            await fetchDetail(userId);
            onUpdated();
        } catch (err: any) {
            toaster.create({ title: err?.response?.data?.message || '삭제일 연장에 실패했습니다.', type: 'error' });
        } finally {
            setPostActionLoading(false);
        }
    };

    const handleRestorePost = async (postId: string) => {
        if (!userId) return;
        setPostActionLoading(true);
        try {
            await axiosInstance.patch(`/admin/posts/${postId}/restore`, {});
            toaster.create({ title: '게시글이 복구되었습니다.', type: 'success' });
            await fetchDetail(userId);
            onUpdated();
        } catch (err: any) {
            toaster.create({ title: err?.response?.data?.message || '게시글 복구에 실패했습니다.', type: 'error' });
        } finally {
            setPostActionLoading(false);
        }
    };

    const handleRejectAppeal = async (postId: string) => {
        if (!userId || !rejectAppealReason.trim()) {
            toaster.create({ title: '반려 사유를 입력해주세요.', type: 'warning' });
            return;
        }
        setPostActionLoading(true);
        try {
            await axiosInstance.patch(`/admin/posts/${postId}/appeal/reject`, {
                reason: rejectAppealReason.trim(),
                blockReappeal,
            });
            toaster.create({ title: '이의 제기가 반려되었습니다.', type: 'info' });
            setRejectAppealPostId(null);
            setRejectAppealReason('');
            setBlockReappeal(false);
            await fetchDetail(userId);
            onUpdated();
        } catch (err: any) {
            toaster.create({ title: err?.response?.data?.message || '이의 반려 처리에 실패했습니다.', type: 'error' });
        } finally {
            setPostActionLoading(false);
        }
    };

    const u = detail?.user;
    const summary = detail?.summary || {};
    const pets: any[] = detail?.pets || [];
    const posts: any[] = detail?.posts || [];
    const reportedPosts: any[] = detail?.reportedPosts || [];
    const histories: any[] = detail?.histories || [];
    const journeys: any[] = detail?.journeys || [];

    const formatDateStr = (d?: string | null) => {
        if (!d) return '-';
        const parsed = new Date(d);
        if (Number.isNaN(parsed.getTime())) return '-';
        return parsed.toLocaleString('ko-KR');
    };

    return (
        <Dialog.Root
            open={open}
            onOpenChange={(e) => onOpenChange(e.open)}
            placement="center"
            size="xl"
        >
            <Portal>
                <Dialog.Backdrop bg="blackAlpha.600" backdropFilter="blur(4px)" />
                <Dialog.Positioner p={{ base: 3, md: 4 }}>
                    <Dialog.Content
                        maxW="900px"
                        w="full"
                        borderRadius="24px"
                        bg="var(--waba-card)"
                        border="1px solid"
                        borderColor="var(--waba-line)"
                        boxShadow="0 24px 60px rgba(0,0,0,0.25)"
                        p={{ base: 4, md: 6 }}
                        maxH="90vh"
                        display="flex"
                        flexDirection="column"
                    >
                        {/* Header */}
                        <Dialog.Header p={0} pb={4} borderBottom="1px solid" borderColor="var(--waba-line)">
                            <Flex w="100%" justify="space-between" align="flex-start" gap={3}>
                                {u ? (
                                    <HStack gap={3.5} minW={0} flex={1}>
                                        <UserAvatar
                                            src={u.profile_image_url}
                                            alt={u.nickname || '회원'}
                                            size="lg"
                                            fallbackType="user"
                                        />
                                        <Box minW={0} flex={1}>
                                            <HStack gap={2} flexWrap="wrap" mb={1}>
                                                <Dialog.Title fontSize="18px" fontWeight="800" color="var(--waba-ink)">
                                                    {u.nickname || '이름 없음'}
                                                </Dialog.Title>
                                                <Box
                                                    bg="var(--waba-purple-soft)"
                                                    color="var(--waba-purple-text)"
                                                    fontSize="10.5px"
                                                    fontWeight="800"
                                                    px={2}
                                                    py={0.5}
                                                    borderRadius="999px"
                                                >
                                                    {u.role || 'USER'}
                                                </Box>
                                                <Box
                                                    bg={u.status === 'ACTIVE' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)'}
                                                    color={u.status === 'ACTIVE' ? '#10B981' : '#EF4444'}
                                                    fontSize="10.5px"
                                                    fontWeight="800"
                                                    px={2}
                                                    py={0.5}
                                                    borderRadius="999px"
                                                >
                                                    {u.status || 'ACTIVE'}
                                                </Box>
                                                <Box
                                                    bg="var(--waba-surface)"
                                                    border="1px solid"
                                                    borderColor="var(--waba-line)"
                                                    color="var(--waba-ink-2)"
                                                    fontSize="10.5px"
                                                    fontWeight="700"
                                                    px={2}
                                                    py={0.5}
                                                    borderRadius="999px"
                                                >
                                                    AI 자동일지 {u.auto_journal_enabled ? 'ON' : 'OFF'}
                                                </Box>
                                            </HStack>
                                            <HStack gap={2} flexWrap="wrap" fontSize="12px" color="var(--waba-ink-3)">
                                                <Text>{u.email}</Text>
                                                <Text>·</Text>
                                                <HStack gap={1}>
                                                    <Text>ID: {u.id}</Text>
                                                    <Button
                                                        size="2xs"
                                                        variant="ghost"
                                                        h="20px"
                                                        px={1.5}
                                                        color="var(--waba-ink-2)"
                                                        onClick={handleCopyId}
                                                    >
                                                        <LuCopy size={11} />
                                                    </Button>
                                                </HStack>
                                            </HStack>
                                            <Text fontSize="11px" color="var(--waba-ink-3)" mt={0.5}>
                                                가입일: {formatDateStr(u.created_at)} · 최근 로그인: {formatDateStr(u.last_login_at)}
                                                {u.last_ip ? ` · IP: ${u.last_ip}` : ''}
                                                {u.role === 'VET' && (u.vet_hospital_name || u.vet_license_number || u.vet_license_info)
                                                    ? ` · ${[u.vet_hospital_name, u.vet_license_number || u.vet_license_info].filter(Boolean).join(' / ')}`
                                                    : ''}
                                                {u.role === 'ADMIN' && (u.admin_title || u.admin_name)
                                                    ? ` · ${[u.admin_title, u.admin_name].filter(Boolean).join(' ')}`
                                                    : ''}
                                            </Text>
                                        </Box>
                                    </HStack>
                                ) : (
                                    <Dialog.Title fontSize="17px" fontWeight="800" color="var(--waba-ink)">
                                        회원 상세 정보
                                    </Dialog.Title>
                                )}
                                <CloseButton
                                    size="sm"
                                    rounded="full"
                                    color="var(--waba-ink)"
                                    _hover={{ bg: 'var(--waba-surface)' }}
                                    onClick={() => onOpenChange(false)}
                                />
                            </Flex>
                        </Dialog.Header>

                        {/* Segment Tabs */}
                        <HStack
                            gap={1.5}
                            py={3}
                            borderBottom="1px solid"
                            borderColor="var(--waba-line)"
                            overflowX="auto"
                            css={{ '&::-webkit-scrollbar': { display: 'none' } }}
                            flexShrink={0}
                        >
                            {[
                                { key: 'basic' as const, label: '기본정보 · 권한/제재' },
                                { key: 'pets' as const, label: `반려동물 (${pets.length})` },
                                { key: 'posts' as const, label: `작성 게시글 (${posts.length})` },
                                { key: 'reports' as const, label: `신고 리스트 (${reportedPosts.length})` },
                                { key: 'histories' as const, label: `건강 수첩 (${histories.length})` },
                                { key: 'journeys' as const, label: `수첩 그룹 (${journeys.length})` },
                            ].map((tab) => {
                                const active = activeTab === tab.key;
                                return (
                                    <Button
                                        key={tab.key}
                                        size="xs"
                                        h="30px"
                                        px={3.5}
                                        borderRadius="999px"
                                        bg={active ? 'var(--waba-ink)' : 'var(--waba-surface)'}
                                        color={active ? 'var(--waba-bg)' : 'var(--waba-ink-2)'}
                                        border="1px solid"
                                        borderColor={active ? 'var(--waba-ink)' : 'var(--waba-line)'}
                                        fontSize="12px"
                                        fontWeight={active ? '700' : '600'}
                                        flexShrink={0}
                                        onClick={() => setActiveTab(tab.key)}
                                    >
                                        {tab.label}
                                    </Button>
                                );
                            })}
                        </HStack>

                        {/* Body */}
                        <Dialog.Body p={0} pt={4} overflowY="auto" flex={1}>
                            {loading ? (
                                <Flex py={16} justify="center" align="center">
                                    <Spinner size="lg" color="#6338A9" />
                                </Flex>
                            ) : !detail ? (
                                <Flex py={16} justify="center" color="var(--waba-ink-3)" fontSize="13px">
                                    데이터를 불러올 수 없습니다.
                                </Flex>
                            ) : activeTab === 'basic' ? (
                                <VStack align="stretch" gap={5}>
                                    <Grid templateColumns={{ base: 'repeat(2, 1fr)', sm: 'repeat(4, 1fr)' }} gap={3}>
                                        {[
                                            { label: '게시글', value: summary.postCount ?? posts.length },
                                            { label: '댓글', value: summary.commentCount ?? 0 },
                                            { label: '건강 수첩', value: summary.historyCount ?? histories.length },
                                            { label: '수첩 그룹', value: summary.journeyCount ?? journeys.length },
                                        ].map((stat) => (
                                            <Box
                                                key={stat.label}
                                                bg="var(--waba-surface)"
                                                border="1px solid"
                                                borderColor="var(--waba-line)"
                                                borderRadius="14px"
                                                p={3.5}
                                            >
                                                <Text fontSize="11.5px" color="var(--waba-ink-3)" fontWeight="600">
                                                    {stat.label}
                                                </Text>
                                                <Text fontSize="20px" fontWeight="800" color="var(--waba-ink)" mt={1}>
                                                    {Number(stat.value).toLocaleString()}
                                                </Text>
                                            </Box>
                                        ))}
                                    </Grid>

                                    {/* 권한 설정 */}
                                    <Box
                                        bg="var(--waba-surface)"
                                        border="1px solid"
                                        borderColor="var(--waba-line)"
                                        borderRadius="16px"
                                        p={4}
                                    >
                                        <Text fontSize="14px" fontWeight="800" color="var(--waba-ink)" mb={3}>
                                            권한 설정
                                        </Text>
                                        <Grid
                                            templateColumns={{
                                                base: '1fr',
                                                md: role === 'VET' || role === 'ADMIN' ? 'repeat(3, 1fr)' : '240px',
                                            }}
                                            gap={3}
                                        >
                                            <Box>
                                                <Text fontSize="11.5px" fontWeight="700" color="var(--waba-ink-2)" mb={1}>
                                                    회원 권한
                                                </Text>
                                                <select
                                                    value={role}
                                                    disabled={!isSuperAdmin && detail?.user?.role === 'ADMIN'}
                                                    onChange={(e) => setRole(e.target.value)}
                                                    style={{
                                                        width: '100%',
                                                        height: '38px',
                                                        borderRadius: '10px',
                                                        border: '1px solid var(--waba-line)',
                                                        background: 'var(--waba-card)',
                                                        color: 'var(--waba-ink)',
                                                        padding: '0 10px',
                                                        fontSize: '13px',
                                                    }}
                                                >
                                                    <option value="USER">USER (일반)</option>
                                                    <option value="VET">VET (수의사)</option>
                                                    <option value="EDITOR">EDITOR (에디터)</option>
                                                    {isSuperAdmin && <option value="ADMIN">ADMIN (관리자)</option>}
                                                </select>
                                            </Box>
                                            {role === 'VET' && (
                                                <>
                                                    <Box>
                                                        <Text fontSize="11.5px" fontWeight="700" color="var(--waba-ink-2)" mb={1}>
                                                            수의사 면허번호
                                                        </Text>
                                                        <Input
                                                            value={vetLicenseNumber}
                                                            onChange={(e) => setVetLicenseNumber(e.target.value)}
                                                            placeholder="예: 제 18492호"
                                                            h="38px"
                                                            borderRadius="10px"
                                                            bg="var(--waba-card)"
                                                            border="1px solid"
                                                            borderColor="var(--waba-line)"
                                                            color="var(--waba-ink)"
                                                            fontSize="13px"
                                                        />
                                                    </Box>
                                                    <Box>
                                                        <Text fontSize="11.5px" fontWeight="700" color="var(--waba-ink-2)" mb={1}>
                                                            병원명 (선택)
                                                        </Text>
                                                        <Input
                                                            value={vetHospitalName}
                                                            onChange={(e) => setVetHospitalName(e.target.value)}
                                                            placeholder="예: 와바미 동물의료센터"
                                                            h="38px"
                                                            borderRadius="10px"
                                                            bg="var(--waba-card)"
                                                            border="1px solid"
                                                            borderColor="var(--waba-line)"
                                                            color="var(--waba-ink)"
                                                            fontSize="13px"
                                                        />
                                                    </Box>
                                                </>
                                            )}
                                            {role === 'ADMIN' && (
                                                <>
                                                    <Box>
                                                        <Text fontSize="11.5px" fontWeight="700" color="var(--waba-ink-2)" mb={1}>
                                                            직급
                                                        </Text>
                                                        <Input
                                                            value={adminTitle}
                                                            onChange={(e) => setAdminTitle(e.target.value)}
                                                            placeholder="예: 팀장 / 매니저"
                                                            h="38px"
                                                            borderRadius="10px"
                                                            bg="var(--waba-card)"
                                                            border="1px solid"
                                                            borderColor="var(--waba-line)"
                                                            color="var(--waba-ink)"
                                                            fontSize="13px"
                                                        />
                                                    </Box>
                                                    <Box>
                                                        <Text fontSize="11.5px" fontWeight="700" color="var(--waba-ink-2)" mb={1}>
                                                            이름
                                                        </Text>
                                                        <Input
                                                            value={adminName}
                                                            onChange={(e) => setAdminName(e.target.value)}
                                                            placeholder="예: 홍길동"
                                                            h="38px"
                                                            borderRadius="10px"
                                                            bg="var(--waba-card)"
                                                            border="1px solid"
                                                            borderColor="var(--waba-line)"
                                                            color="var(--waba-ink)"
                                                            fontSize="13px"
                                                        />
                                                    </Box>
                                                </>
                                            )}
                                        </Grid>
                                        {!isSuperAdmin && detail?.user?.role === 'ADMIN' && (
                                            <Box
                                                mt={3}
                                                p={2.5}
                                                borderRadius="10px"
                                                bg="rgba(245, 158, 11, 0.12)"
                                                border="1px solid"
                                                borderColor="rgba(245, 158, 11, 0.35)"
                                            >
                                                <Text fontSize="11.5px" fontWeight="700" color="#D97706">
                                                    관리자 계정의 권한 및 상태 변경은 슈퍼 관리자만 가능합니다.
                                                </Text>
                                            </Box>
                                        )}
                                        <Flex justify="flex-end" mt={3}>
                                            <Button
                                                size="sm"
                                                bg="#6338A9"
                                                color="#FFFFFF"
                                                _hover={{ bg: '#522B8F' }}
                                                borderRadius="12px"
                                                px={4}
                                                fontWeight="700"
                                                disabled={!isSuperAdmin && detail?.user?.role === 'ADMIN'}
                                                loading={savingRole}
                                                onClick={handleSaveRole}
                                            >
                                                권한 정보 저장
                                            </Button>
                                        </Flex>
                                    </Box>

                                    {/* 계정 상태 / 제재 */}
                                    <Box
                                        bg="var(--waba-surface)"
                                        border="1px solid"
                                        borderColor="var(--waba-line)"
                                        borderRadius="16px"
                                        p={4}
                                    >
                                        <Text fontSize="14px" fontWeight="800" color="var(--waba-ink)" mb={3}>
                                            계정 상태 및 제재 관리
                                        </Text>
                                        <Grid templateColumns={{ base: '1fr', md: '200px 1fr' }} gap={3}>
                                            <Box>
                                                <Text fontSize="11.5px" fontWeight="700" color="var(--waba-ink-2)" mb={1}>
                                                    계정 상태
                                                </Text>
                                                <select
                                                    value={status}
                                                    disabled={!isSuperAdmin && detail?.user?.role === 'ADMIN'}
                                                    onChange={(e) => setStatus(e.target.value)}
                                                    style={{
                                                        width: '100%',
                                                        height: '38px',
                                                        borderRadius: '10px',
                                                        border: '1px solid var(--waba-line)',
                                                        background: 'var(--waba-card)',
                                                        color: 'var(--waba-ink)',
                                                        padding: '0 10px',
                                                        fontSize: '13px',
                                                    }}
                                                >
                                                    <option value="ACTIVE">ACTIVE (정상)</option>
                                                    <option value="SUSPENDED">SUSPENDED (이용정지)</option>
                                                    <option value="WITHDRAWN">WITHDRAWN (탈퇴)</option>
                                                </select>
                                            </Box>
                                            <Box>
                                                <Text fontSize="11.5px" fontWeight="700" color="var(--waba-ink-2)" mb={1}>
                                                    변경 사유 (감사 로그 기록)
                                                </Text>
                                                <Input
                                                    value={statusReason}
                                                    disabled={!isSuperAdmin && detail?.user?.role === 'ADMIN'}
                                                    onChange={(e) => setStatusReason(e.target.value)}
                                                    placeholder="제재 또는 상태 변경 사유를 입력하세요"
                                                    h="38px"
                                                    borderRadius="10px"
                                                    bg="var(--waba-card)"
                                                    border="1px solid"
                                                    borderColor="var(--waba-line)"
                                                    color="var(--waba-ink)"
                                                    fontSize="13px"
                                                />
                                            </Box>
                                        </Grid>
                                        <Flex justify="flex-end" mt={3}>
                                            <Button
                                                size="sm"
                                                bg="var(--waba-ink)"
                                                color="var(--waba-bg)"
                                                borderRadius="12px"
                                                px={4}
                                                fontWeight="700"
                                                disabled={!isSuperAdmin && detail?.user?.role === 'ADMIN'}
                                                loading={savingStatus}
                                                onClick={handleSaveStatus}
                                            >
                                                계정 상태 적용
                                            </Button>
                                        </Flex>
                                    </Box>
                                </VStack>
                            ) : activeTab === 'pets' ? (
                                <VStack align="stretch" gap={2.5}>
                                    {pets.length === 0 ? (
                                        <Flex py={12} justify="center" color="var(--waba-ink-3)" fontSize="13px">
                                            등록된 반려동물이 없습니다.
                                        </Flex>
                                    ) : (
                                        pets.map((pet) => (
                                            <Flex
                                                key={pet.id}
                                                bg="var(--waba-surface)"
                                                border="1px solid"
                                                borderColor="var(--waba-line)"
                                                borderRadius="14px"
                                                p={3.5}
                                                justify="space-between"
                                                align="center"
                                                gap={3}
                                            >
                                                <HStack gap={3} minW={0} flex={1}>
                                                    <UserAvatar
                                                        src={pet.current_avatar_url}
                                                        alt={pet.name}
                                                        size="md"
                                                        fallbackType="pet"
                                                        boxShadow="var(--waba-avatar-shadow)"
                                                    />
                                                    <Box minW={0} flex={1}>
                                                        <HStack gap={1.5} flexWrap="wrap">
                                                            <Text fontSize="14px" fontWeight="800" color="var(--waba-ink)">
                                                                {pet.name}
                                                            </Text>
                                                            {Boolean(pet.is_primary) && (
                                                                <Box
                                                                    bg="var(--waba-purple-soft)"
                                                                    color="var(--waba-purple-text)"
                                                                    fontSize="10px"
                                                                    fontWeight="700"
                                                                    px={2}
                                                                    py="1px"
                                                                    borderRadius="999px"
                                                                >
                                                                    대표
                                                                </Box>
                                                            )}
                                                            {Boolean(pet.is_deleted) && (
                                                                <Box
                                                                    bg="rgba(239, 68, 68, 0.12)"
                                                                    color="#EF4444"
                                                                    fontSize="10px"
                                                                    fontWeight="700"
                                                                    px={2}
                                                                    py="1px"
                                                                    borderRadius="999px"
                                                                >
                                                                    삭제됨
                                                                </Box>
                                                            )}
                                                        </HStack>
                                                        <Text fontSize="12px" color="var(--waba-ink-2)">
                                                            {[pet.species, pet.breed, pet.gender, pet.is_neutered ? '중성화 O' : null, pet.latest_weight_kg ? `${pet.latest_weight_kg}kg` : null]
                                                                .filter(Boolean)
                                                                .join(' · ')}
                                                        </Text>
                                                        <Text fontSize="11px" color="var(--waba-ink-3)">
                                                            생일: {pet.birth_date || '-'} · AI 데이터 동의: {pet.ai_private_data_consent ? '동의' : '미동의'}
                                                        </Text>
                                                    </Box>
                                                </HStack>
                                                <Button
                                                    size="xs"
                                                    variant="outline"
                                                    borderColor={pet.is_deleted ? 'var(--waba-purple-border)' : 'red.400'}
                                                    color={pet.is_deleted ? 'var(--waba-purple-text)' : 'red.500'}
                                                    borderRadius="999px"
                                                    px={3}
                                                    onClick={() => handleTogglePetStatus(pet)}
                                                >
                                                    {pet.is_deleted ? '복구' : '삭제'}
                                                </Button>
                                            </Flex>
                                        ))
                                    )}
                                </VStack>
                            ) : activeTab === 'posts' ? (
                                <VStack align="stretch" gap={2}>
                                    {posts.length === 0 ? (
                                        <Flex py={12} justify="center" color="var(--waba-ink-3)" fontSize="13px">
                                            작성한 게시글이 없습니다.
                                        </Flex>
                                    ) : (
                                        posts.map((post) => {
                                            const isDeleted = post.status === 'DELETED';
                                            const maxExtend = Math.max(0, 30 - Number(post.admin_extended_days || 0));
                                            const purgeDate = post.purge_scheduled_at ? new Date(post.purge_scheduled_at) : null;
                                            const dDay = purgeDate
                                                ? Math.max(0, Math.ceil((purgeDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000)))
                                                : null;
                                            const purgeFormatted = purgeDate
                                                ? `${purgeDate.getFullYear()}.${String(purgeDate.getMonth() + 1).padStart(2, '0')}.${String(purgeDate.getDate()).padStart(2, '0')}`
                                                : '';

                                            return (
                                            <Box
                                                key={post.id}
                                                bg="var(--waba-surface)"
                                                border="1px solid"
                                                borderColor="var(--waba-line)"
                                                borderRadius="14px"
                                                p={3}
                                            >
                                                <Flex justify="space-between" align="center" gap={3}>
                                                    <Box minW={0} flex={1}>
                                                        <HStack gap={1.5} mb={0.5} flexWrap="wrap">
                                                            <Box
                                                                bg="var(--waba-purple-soft)"
                                                                color="var(--waba-purple-text)"
                                                                fontSize="10px"
                                                                fontWeight="700"
                                                                px={2}
                                                                py="1px"
                                                                borderRadius="999px"
                                                            >
                                                                {post.board_name || post.board_id}
                                                            </Box>
                                                            {post.status && post.status !== 'PUBLISHED' && (
                                                                <Box
                                                                    bg={
                                                                        post.status === 'HIDDEN'
                                                                            ? 'rgba(245, 158, 11, 0.14)'
                                                                            : post.status === 'DELETED'
                                                                                ? 'rgba(239, 68, 68, 0.12)'
                                                                                : 'var(--waba-card)'
                                                                    }
                                                                    color={
                                                                        post.status === 'HIDDEN'
                                                                            ? '#D97706'
                                                                            : post.status === 'DELETED'
                                                                                ? '#EF4444'
                                                                                : 'var(--waba-ink-2)'
                                                                    }
                                                                    fontSize="10px"
                                                                    fontWeight="700"
                                                                    px={2}
                                                                    py="1px"
                                                                    borderRadius="999px"
                                                                >
                                                                    {post.status === 'HIDDEN'
                                                                        ? '숨김'
                                                                        : post.status === 'DELETED'
                                                                            ? '삭제됨'
                                                                            : post.status}
                                                                </Box>
                                                            )}
                                                            {isDeleted && post.delete_type === 'ADMIN_REPORT' && (
                                                                <Box bg="rgba(239, 68, 68, 0.12)" color="#EF4444" fontSize="10px" fontWeight="700" px={2} py="1px" borderRadius="999px">
                                                                    신고 삭제
                                                                </Box>
                                                            )}
                                                            {isDeleted && post.appeal_status === 'PENDING' && (
                                                                <Box bg="rgba(245, 158, 11, 0.14)" color="#D97706" fontSize="10px" fontWeight="700" px={2} py="1px" borderRadius="999px">
                                                                    이의 제기 접수
                                                                </Box>
                                                            )}
                                                            {Boolean(post.has_approved_appeal) && (
                                                                <Box bg="rgba(16, 185, 129, 0.12)" color="#10B981" fontSize="10px" fontWeight="700" px={2} py="1px" borderRadius="999px">
                                                                    이의 승인 복구 이력
                                                                </Box>
                                                            )}
                                                            {Boolean(post.appeal_blocked) && (
                                                                <Box bg="rgba(239, 68, 68, 0.12)" color="#EF4444" fontSize="10px" fontWeight="700" px={2} py="1px" borderRadius="999px">
                                                                    재이의 차단됨
                                                                </Box>
                                                            )}
                                                        </HStack>
                                                        <Text
                                                            fontSize="13px"
                                                            fontWeight="700"
                                                            color="var(--waba-ink)"
                                                            truncate
                                                            cursor="pointer"
                                                            _hover={{ textDecoration: 'underline' }}
                                                            onClick={() => window.open(`/post/${post.id}`, '_blank')}
                                                        >
                                                            {post.title || '(제목 없음)'}
                                                        </Text>
                                                        <Text fontSize="11px" color="var(--waba-ink-3)">
                                                            조회 {post.view_count ?? 0} · ♥ {post.like_count ?? 0} · 💬 {post.comment_count ?? 0} · {formatDateStr(post.created_at)}
                                                        </Text>
                                                        {isDeleted && (
                                                            <VStack align="flex-start" gap={0.5} mt={1.5}>
                                                                {post.delete_reason && (
                                                                    <Text fontSize="11px" color="var(--waba-ink-2)">
                                                                        삭제 사유: {post.delete_reason}
                                                                    </Text>
                                                                )}
                                                                {purgeDate && (
                                                                    <Text fontSize="11px" color="#EF4444" fontWeight="600">
                                                                        영구 삭제 예정: {purgeFormatted} (D-{dDay})
                                                                        {Number(post.admin_extended_days || 0) > 0 ? ` · +${post.admin_extended_days}일 연장됨` : ''}
                                                                    </Text>
                                                                )}
                                                                {post.appeal_reason && (
                                                                    <Text fontSize="11px" color="var(--waba-purple-text)" fontWeight="600">
                                                                        이의 사유: {post.appeal_reason}
                                                                    </Text>
                                                                )}
                                                            </VStack>
                                                        )}
                                                    </Box>
                                                    <HStack gap={1.5} flexShrink={0}>
                                                        {isDeleted && maxExtend > 0 && (
                                                            <Button
                                                                size="2xs"
                                                                variant="outline"
                                                                borderColor="var(--waba-line)"
                                                                color="var(--waba-ink)"
                                                                borderRadius="999px"
                                                                px={2.5}
                                                                onClick={() => {
                                                                    setExtendPurgePostId(String(post.id));
                                                                    setExtendDays('7');
                                                                    setExtendReason('');
                                                                }}
                                                            >
                                                                삭제일 연장
                                                            </Button>
                                                        )}
                                                        {isDeleted && post.appeal_status === 'PENDING' && (
                                                            <Button
                                                                size="2xs"
                                                                variant="outline"
                                                                borderColor="red.400"
                                                                color="red.500"
                                                                borderRadius="999px"
                                                                px={2.5}
                                                                onClick={() => {
                                                                    setRejectAppealPostId(String(post.id));
                                                                    setRejectAppealReason('');
                                                                    setBlockReappeal(false);
                                                                }}
                                                            >
                                                                이의 반려
                                                            </Button>
                                                        )}
                                                        {isDeleted && (
                                                            <Button
                                                                size="2xs"
                                                                bg="#6338A9"
                                                                color="#FFFFFF"
                                                                _hover={{ bg: '#522B8F' }}
                                                                borderRadius="999px"
                                                                px={2.5}
                                                                loading={postActionLoading}
                                                                onClick={() => handleRestorePost(String(post.id))}
                                                            >
                                                                {post.appeal_status === 'PENDING' ? '이의 승인(복구)' : '복구'}
                                                            </Button>
                                                        )}
                                                        <Button
                                                            size="2xs"
                                                            variant="ghost"
                                                            onClick={() => window.open(`/post/${post.id}`, '_blank')}
                                                        >
                                                            <LuExternalLink size={13} />
                                                        </Button>
                                                    </HStack>
                                                </Flex>

                                                {Array.isArray(post.appeals) && post.appeals.length > 0 && (
                                                    <VStack align="stretch" gap={1} mt={2} pt={2} borderTop="1px solid" borderColor="var(--waba-line)">
                                                        {post.appeals.map((ap: any, idx: number) => (
                                                            <Text key={ap.id || idx} fontSize="11px" color="var(--waba-ink-2)">
                                                                {ap.attempt_no || idx + 1}차 [{ap.status === 'APPROVED' ? '승인' : ap.status === 'REJECTED' ? '반려' : '심사 중'}] {ap.reason}
                                                                {ap.admin_note ? ` / 관리자 메모: ${ap.admin_note}` : ''}
                                                            </Text>
                                                        ))}
                                                    </VStack>
                                                )}

                                                {rejectAppealPostId === String(post.id) && (
                                                    <VStack align="stretch" gap={2} mt={2.5} pt={2.5} borderTop="1px solid" borderColor="var(--waba-line)">
                                                        <Input
                                                            value={rejectAppealReason}
                                                            onChange={(e) => setRejectAppealReason(e.target.value)}
                                                            placeholder="이의 반려 사유 입력 (필수)..."
                                                            size="xs"
                                                            h="32px"
                                                            bg="var(--waba-card)"
                                                            borderColor="var(--waba-line)"
                                                            color="var(--waba-ink)"
                                                        />
                                                        {Number(post.appeal_attempt_no || post.appeals?.length || 1) > 3 && (
                                                            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', color: '#EF4444', fontWeight: 600, cursor: 'pointer' }}>
                                                                <input
                                                                    type="checkbox"
                                                                    checked={blockReappeal}
                                                                    onChange={(e) => setBlockReappeal(e.target.checked)}
                                                                />
                                                                추가 재이의 제기 차단 (3회 초과 반려 — 체크 후 반려 시 해당 게시글 재이의 불가)
                                                            </label>
                                                        )}
                                                        <HStack justify="flex-end" gap={2}>
                                                            <Button size="xs" variant="ghost" onClick={() => setRejectAppealPostId(null)}>
                                                                취소
                                                            </Button>
                                                            <Button
                                                                size="xs"
                                                                bg="#E53E3E"
                                                                color="#FFFFFF"
                                                                loading={postActionLoading}
                                                                onClick={() => handleRejectAppeal(String(post.id))}
                                                            >
                                                                반려 확정
                                                            </Button>
                                                        </HStack>
                                                    </VStack>
                                                )}

                                                {extendPurgePostId === String(post.id) && (
                                                    <HStack gap={2} mt={2.5} pt={2.5} borderTop="1px solid" borderColor="var(--waba-line)" flexWrap="wrap">
                                                        <Input
                                                            type="number"
                                                            min={1}
                                                            max={maxExtend}
                                                            value={extendDays}
                                                            onChange={(e) => setExtendDays(e.target.value)}
                                                            w="76px"
                                                            size="xs"
                                                            h="32px"
                                                            bg="var(--waba-card)"
                                                            borderColor="var(--waba-line)"
                                                            color="var(--waba-ink)"
                                                        />
                                                        <Input
                                                            flex={1}
                                                            minW="150px"
                                                            value={extendReason}
                                                            onChange={(e) => setExtendReason(e.target.value)}
                                                            placeholder={`연장 사유 입력 (최대 ${maxExtend}일)...`}
                                                            size="xs"
                                                            h="32px"
                                                            bg="var(--waba-card)"
                                                            borderColor="var(--waba-line)"
                                                            color="var(--waba-ink)"
                                                        />
                                                        <Button size="xs" variant="ghost" onClick={() => setExtendPurgePostId(null)}>
                                                            취소
                                                        </Button>
                                                        <Button
                                                            size="xs"
                                                            bg="#6338A9"
                                                            color="#FFFFFF"
                                                            loading={postActionLoading}
                                                            onClick={() => handleExtendPurge(String(post.id), maxExtend)}
                                                        >
                                                            연장 적용
                                                        </Button>
                                                    </HStack>
                                                )}
                                            </Box>
                                            );
                                        })
                                    )}
                                </VStack>
                            ) : activeTab === 'reports' ? (
                                <VStack align="stretch" gap={2.5}>
                                    {reportedPosts.length === 0 ? (
                                        <Flex py={12} justify="center" color="var(--waba-ink-3)" fontSize="13px">
                                            신고된 게시글이 없습니다.
                                        </Flex>
                                    ) : (
                                        reportedPosts.map((item) => {
                                            const targetPostId = String(item.post_id || item.id);
                                            return (
                                                <Flex
                                                    key={targetPostId}
                                                    bg="var(--waba-surface)"
                                                    border="1px solid"
                                                    borderColor="var(--waba-line)"
                                                    borderRadius="14px"
                                                    p={3.5}
                                                    justify="space-between"
                                                    align={{ base: 'flex-start', sm: 'center' }}
                                                    direction={{ base: 'column', sm: 'row' }}
                                                    gap={3}
                                                >
                                                    <Box minW={0} flex={1}>
                                                        <HStack gap={1.5} mb={1} flexWrap="wrap">
                                                            {item.board_name && (
                                                                <Box bg="var(--waba-purple-soft)" color="var(--waba-purple-text)" fontSize="10px" fontWeight="700" px={2} py="1px" borderRadius="999px">
                                                                    {item.board_name}
                                                                </Box>
                                                            )}
                                                            <Box
                                                                bg={item.post_status === 'DELETED' ? 'rgba(239, 68, 68, 0.12)' : item.post_status === 'HIDDEN' ? 'rgba(245, 158, 11, 0.14)' : 'rgba(16, 185, 129, 0.12)'}
                                                                color={item.post_status === 'DELETED' ? '#EF4444' : item.post_status === 'HIDDEN' ? '#D97706' : '#10B981'}
                                                                fontSize="10px"
                                                                fontWeight="700"
                                                                px={2}
                                                                py="1px"
                                                                borderRadius="999px"
                                                            >
                                                                {item.post_status === 'DELETED' ? '삭제됨' : item.post_status === 'HIDDEN' ? '숨김' : '게시 중'}
                                                            </Box>
                                                            <Box bg="var(--waba-card)" border="1px solid" borderColor="var(--waba-line)" color="var(--waba-ink)" fontSize="10px" fontWeight="700" px={2} py="1px" borderRadius="999px">
                                                                신고 {item.total_report_count ?? 1}건
                                                            </Box>
                                                            {Number(item.pending_report_count || 0) > 0 && (
                                                                <Box bg="rgba(239, 68, 68, 0.12)" color="#EF4444" fontSize="10px" fontWeight="800" px={2} py="1px" borderRadius="999px">
                                                                    대기 {item.pending_report_count}건
                                                                </Box>
                                                            )}
                                                            {Number(item.pending_appeal_count || 0) > 0 && (
                                                                <Box bg="rgba(245, 158, 11, 0.14)" color="#D97706" fontSize="10px" fontWeight="800" px={2} py="1px" borderRadius="999px">
                                                                    이의 심사 중
                                                                </Box>
                                                            )}
                                                        </HStack>
                                                        <Text fontSize="13px" fontWeight="700" color="var(--waba-ink)" truncate>
                                                            {item.post_title || `(게시글 #${targetPostId})`}
                                                        </Text>
                                                        <Text fontSize="11px" color="var(--waba-ink-3)">
                                                            최근 신고: {item.latest_reason || '-'} · {formatDateStr(item.latest_report_at || item.latest_reported_at)}
                                                        </Text>
                                                    </Box>
                                                    <HStack gap={1.5} flexShrink={0}>
                                                        <Button
                                                            size="xs"
                                                            bg="#6338A9"
                                                            color="#FFFFFF"
                                                            _hover={{ bg: '#522B8F' }}
                                                            borderRadius="999px"
                                                            px={3}
                                                            onClick={() => {
                                                                setReportDetailPostId(targetPostId);
                                                                setReportDetailInitialTab('reports');
                                                                setReportDetailOpen(true);
                                                            }}
                                                        >
                                                            신고 상세
                                                        </Button>
                                                        {Number(item.appeal_count || 0) > 0 && (
                                                            <Button
                                                                size="xs"
                                                                variant="outline"
                                                                borderColor="var(--waba-line)"
                                                                color="var(--waba-ink)"
                                                                borderRadius="999px"
                                                                px={3}
                                                                onClick={() => {
                                                                    setReportDetailPostId(targetPostId);
                                                                    setReportDetailInitialTab('appeals');
                                                                    setReportDetailOpen(true);
                                                                }}
                                                            >
                                                                이의 제기 ({item.appeal_count})
                                                            </Button>
                                                        )}
                                                    </HStack>
                                                </Flex>
                                            );
                                        })
                                    )}
                                </VStack>
                            ) : activeTab === 'histories' ? (
                                <VStack align="stretch" gap={2}>
                                    {histories.length === 0 ? (
                                        <Flex py={12} justify="center" color="var(--waba-ink-3)" fontSize="13px">
                                            건강 수첩 기록이 없습니다.
                                        </Flex>
                                    ) : (
                                        histories.map((h) => (
                                            <Flex
                                                key={h.id}
                                                bg="var(--waba-surface)"
                                                border="1px solid"
                                                borderColor="var(--waba-line)"
                                                borderRadius="14px"
                                                p={3}
                                                justify="space-between"
                                                align="center"
                                                gap={3}
                                            >
                                                <Box minW={0} flex={1}>
                                                    <HStack gap={1.5} mb={0.5} flexWrap="wrap">
                                                        <Text fontSize="11px" fontWeight="700" color="var(--waba-ink-3)">
                                                            {h.event_date || '-'}
                                                        </Text>
                                                        <Box
                                                            bg="var(--waba-card)"
                                                            border="1px solid"
                                                            borderColor="var(--waba-line)"
                                                            color="var(--waba-ink-2)"
                                                            fontSize="10px"
                                                            fontWeight="700"
                                                            px={2}
                                                            py="1px"
                                                            borderRadius="999px"
                                                        >
                                                            {h.category || 'OTHER'}
                                                        </Box>
                                                        {Number(h.is_ai_generated) === 1 && (
                                                            <Box
                                                                bg="var(--waba-purple-soft)"
                                                                color="var(--waba-purple-text)"
                                                                fontSize="10px"
                                                                fontWeight="700"
                                                                px={2}
                                                                py="1px"
                                                                borderRadius="999px"
                                                            >
                                                                AI 자동
                                                            </Box>
                                                        )}
                                                    </HStack>
                                                    <Text fontSize="13px" fontWeight="700" color="var(--waba-ink)" truncate>
                                                        {h.title}
                                                    </Text>
                                                    <Text fontSize="11px" color="var(--waba-ink-3)" truncate>
                                                        {[h.pet_names || h.pet_name, h.journey_title, h.hospital_name, h.weight_kg ? `${h.weight_kg}kg` : null]
                                                            .filter(Boolean)
                                                            .join(' · ') || '-'}
                                                    </Text>
                                                </Box>
                                            </Flex>
                                        ))
                                    )}
                                </VStack>
                            ) : (
                                <VStack align="stretch" gap={2}>
                                    {journeys.length === 0 ? (
                                        <Flex py={12} justify="center" color="var(--waba-ink-3)" fontSize="13px">
                                            수첩 그룹이 없습니다.
                                        </Flex>
                                    ) : (
                                        journeys.map((j) => (
                                            <Flex
                                                key={j.id}
                                                bg="var(--waba-surface)"
                                                border="1px solid"
                                                borderColor="var(--waba-line)"
                                                borderRadius="14px"
                                                p={3}
                                                justify="space-between"
                                                align="center"
                                                gap={3}
                                            >
                                                <Box minW={0} flex={1}>
                                                    <HStack gap={1.5} mb={0.5} flexWrap="wrap">
                                                        <Box
                                                            bg="var(--waba-purple-soft)"
                                                            color="var(--waba-purple-text)"
                                                            fontSize="10px"
                                                            fontWeight="700"
                                                            px={2}
                                                            py="1px"
                                                            borderRadius="999px"
                                                        >
                                                            {j.share_scope === 'PUBLIC' ? '전체 공개' : j.share_scope === 'LINK_ONLY' ? '링크 공유' : '비공개'}
                                                        </Box>
                                                        <Box
                                                            bg="var(--waba-card)"
                                                            border="1px solid"
                                                            borderColor="var(--waba-line)"
                                                            color="var(--waba-ink-2)"
                                                            fontSize="10px"
                                                            fontWeight="700"
                                                            px={2}
                                                            py="1px"
                                                            borderRadius="999px"
                                                        >
                                                            {j.status || 'ACTIVE'}
                                                        </Box>
                                                    </HStack>
                                                    <Text
                                                        fontSize="13px"
                                                        fontWeight="700"
                                                        color="var(--waba-ink)"
                                                        truncate
                                                        cursor="pointer"
                                                        _hover={{ textDecoration: 'underline' }}
                                                        onClick={() => window.open(`/notebook/${j.note_code || j.id}`, '_blank')}
                                                    >
                                                        {j.title}
                                                    </Text>
                                                    <Text fontSize="11px" color="var(--waba-ink-3)">
                                                        {[j.pet_names || j.pet_name, `기록 ${j.history_count ?? 0}건`, j.start_date ? `시작 ${j.start_date}` : null]
                                                            .filter(Boolean)
                                                            .join(' · ')}
                                                    </Text>
                                                </Box>
                                                <Button
                                                    size="2xs"
                                                    variant="ghost"
                                                    onClick={() => window.open(`/notebook/${j.note_code || j.id}`, '_blank')}
                                                >
                                                    <LuExternalLink size={13} />
                                                </Button>
                                            </Flex>
                                        ))
                                    )}
                                </VStack>
                            )}
                        </Dialog.Body>
                    </Dialog.Content>
                </Dialog.Positioner>
            </Portal>

            <PostReportDetailDialog
                open={reportDetailOpen}
                onOpenChange={setReportDetailOpen}
                postId={reportDetailPostId}
                initialTab={reportDetailInitialTab}
                onUpdated={() => {
                    if (userId) fetchDetail(userId);
                    onUpdated();
                }}
            />
        </Dialog.Root>
    );
}
