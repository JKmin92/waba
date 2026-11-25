'use client'

import React, { useCallback, useEffect, useState } from 'react';
import {
    Box,
    Button,
    Flex,
    Grid,
    Heading,
    HStack,
    IconButton,
    Input,
    Spinner,
    Text,
    VStack,
} from '@chakra-ui/react';
import { LuDownload, LuRefreshCw, LuSearch } from 'react-icons/lu';
import axiosInstance from '@/utils/api';
import { toaster } from '@/components/ui/toaster';
import UserAvatar from '../../(main)/common/UserAvatar';
import UserDetailDialog from './UserDetailDialog';

interface PetSummary {
    id: string | number;
    name: string;
    species?: string;
    breed?: string;
    current_avatar_url?: string | null;
    is_primary?: boolean | number;
}

interface AdminUserRow {
    id: string;
    email: string;
    nickname: string;
    profile_image_url?: string | null;
    role: string;
    vet_license_info?: string | null;
    vet_license_number?: string | null;
    vet_hospital_name?: string | null;
    admin_title?: string | null;
    admin_name?: string | null;
    auto_journal_enabled?: boolean | number;
    report_count?: number;
    status: string;
    last_login_at?: string | null;
    created_at?: string | null;
    post_count?: number;
    history_count?: number;
    journey_count?: number;
    pet_count?: number;
    pets?: PetSummary[];
}

export default function AdminUsersClient() {
    const [q, setQ] = useState('');
    const [role, setRole] = useState('ALL');
    const [status, setStatus] = useState('ALL');
    const [sort, setSort] = useState('latest');
    const [page, setPage] = useState(1);

    const [loading, setLoading] = useState(true);
    const [kpi, setKpi] = useState<any>({});
    const [users, setUsers] = useState<AdminUserRow[]>([]);
    const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });

    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
    const [detailOpen, setDetailOpen] = useState(false);

    // Hover tooltip state for pet avatar stack (fixed positioning to avoid overflow clipping)
    const [hoveredTargetKey, setHoveredTargetKey] = useState<string | null>(null);
    const [hoveredTooltip, setHoveredTooltip] = useState<{ label: string; top: number; left: number } | null>(null);

    const fetchUsers = useCallback(async (targetPage = page) => {
        setLoading(true);
        try {
            const res = await axiosInstance.get('/admin/users', {
                params: {
                    q: q.trim(),
                    role,
                    status,
                    sort,
                    page: targetPage,
                    limit: 20,
                },
            });
            setKpi(res.data?.kpi || {});
            setUsers(res.data?.users || []);
            setPagination(res.data?.pagination || { page: targetPage, limit: 20, total: 0, totalPages: 1 });
        } catch {
            toaster.create({ title: '회원 목록을 불러오지 못했습니다.', type: 'error' });
        } finally {
            setLoading(false);
        }
    }, [q, role, status, sort, page]);

    useEffect(() => {
        fetchUsers(page);
    }, [role, status, sort, page]);

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setPage(1);
        fetchUsers(1);
    };

    const handleExportCsv = () => {
        if (users.length === 0) {
            toaster.create({ title: '내보낼 회원 데이터가 없습니다.', type: 'info' });
            return;
        }
        const header = 'ID,닉네임,이메일,권한,상태,반려동물수,게시글,수첩,신고,가입일\n';
        const rows = users
            .map((u) =>
                [
                    u.id,
                    `"${(u.nickname || '').replace(/"/g, '""')}"`,
                    u.email,
                    u.role,
                    u.status,
                    u.pet_count ?? (u.pets?.length || 0),
                    u.post_count ?? 0,
                    u.history_count ?? 0,
                    u.report_count ?? 0,
                    u.created_at || '',
                ].join(',')
            )
            .join('\n');
        const blob = new Blob(['\uFEFF' + header + rows], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `waba_users_page_${page}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const formatDateShort = (d?: string | null) => {
        if (!d) return '-';
        const parsed = new Date(d);
        if (Number.isNaN(parsed.getTime())) return '-';
        return parsed.toLocaleDateString('ko-KR');
    };

    return (
        <VStack align="stretch" gap={5} maxW="1400px" mx="auto">
            {/* Top Header */}
            <Flex
                direction={{ base: 'column', sm: 'row' }}
                justify="space-between"
                align={{ base: 'flex-start', sm: 'center' }}
                gap={3}
            >
                <Box>
                    <Heading as="h1" fontSize={{ base: '20px', md: '24px' }} fontWeight="900" color="var(--waba-ink)">
                        회원 · 반려동물 관리
                    </Heading>
                    <Text fontSize="13px" color="var(--waba-ink-3)" mt={0.5}>
                        가입 회원 권한·상태 제어 및 보유 반려동물·활동 내역을 조회합니다.
                    </Text>
                </Box>
                <HStack gap={2}>
                    <Button
                        size="sm"
                        variant="outline"
                        borderColor="var(--waba-line)"
                        bg="var(--waba-card)"
                        color="var(--waba-ink)"
                        borderRadius="999px"
                        px={4}
                        fontSize="12px"
                        fontWeight="700"
                        gap={1.5}
                        onClick={handleExportCsv}
                    >
                        <LuDownload size={13} />
                        CSV 내보내기
                    </Button>
                    <IconButton
                        aria-label="새로고침"
                        size="sm"
                        variant="outline"
                        rounded="full"
                        bg="var(--waba-card)"
                        borderColor="var(--waba-line)"
                        onClick={() => fetchUsers(page)}
                        loading={loading}
                    >
                        <LuRefreshCw size={14} />
                    </IconButton>
                </HStack>
            </Flex>

            {/* 4 KPI Cards */}
            <Grid templateColumns={{ base: '1fr', sm: 'repeat(2, 1fr)', xl: 'repeat(4, 1fr)' }} gap={4}>
                <Box bg="var(--waba-card)" border="1px solid" borderColor="var(--waba-line)" borderRadius="20px" p={5}>
                    <Text fontSize="12.5px" fontWeight="700" color="var(--waba-ink-2)" mb={2}>
                        전체 회원
                    </Text>
                    <Text fontSize="28px" fontWeight="900" color="var(--waba-ink)">
                        {(kpi.totalUsers ?? 0).toLocaleString()}명
                    </Text>
                    <Text fontSize="11.5px" color="var(--waba-ink-3)" mt={2}>
                        활성 {kpi.activeUsers ?? 0} · 정지 {kpi.suspendedUsers ?? 0} · 탈퇴 {kpi.withdrawnUsers ?? 0}
                    </Text>
                </Box>

                <Box bg="var(--waba-card)" border="1px solid" borderColor="var(--waba-line)" borderRadius="20px" p={5}>
                    <Text fontSize="12.5px" fontWeight="700" color="var(--waba-ink-2)" mb={2}>
                        전문가 · 운영진
                    </Text>
                    <Text fontSize="28px" fontWeight="900" color="var(--waba-purple-text)">
                        {(kpi.expertTotal ?? 0).toLocaleString()}명
                    </Text>
                    <Text fontSize="11.5px" color="var(--waba-ink-3)" mt={2}>
                        VET {kpi.vetCount ?? 0} · EDITOR {kpi.editorCount ?? 0} · ADMIN {kpi.adminCount ?? 0}
                    </Text>
                </Box>

                <Box bg="var(--waba-card)" border="1px solid" borderColor="var(--waba-line)" borderRadius="20px" p={5}>
                    <Text fontSize="12.5px" fontWeight="700" color="var(--waba-ink-2)" mb={2}>
                        신고 · 정지 주의 회원
                    </Text>
                    <Text fontSize="28px" fontWeight="900" color="#EF4444">
                        {(kpi.warningUsers ?? 0).toLocaleString()}명
                    </Text>
                    <Text fontSize="11.5px" color="var(--waba-ink-3)" mt={2}>
                        누적 신고 1건+ 또는 이용정지
                    </Text>
                </Box>

                <Box bg="var(--waba-card)" border="1px solid" borderColor="var(--waba-line)" borderRadius="20px" p={5}>
                    <Text fontSize="12.5px" fontWeight="700" color="var(--waba-ink-2)" mb={2}>
                        등록 반려동물
                    </Text>
                    <Text fontSize="28px" fontWeight="900" color="var(--waba-ink)">
                        {(kpi.totalActivePets ?? 0).toLocaleString()}마리
                    </Text>
                    <Text fontSize="11.5px" color="var(--waba-ink-3)" mt={2}>
                        강아지 {kpi.dogCount ?? 0} · 고양이 {kpi.catCount ?? 0} · 소동물 {kpi.smallPetCount ?? 0}
                    </Text>
                </Box>
            </Grid>

            {/* Filter & Search Toolbar */}
            <Flex
                bg="var(--waba-card)"
                border="1px solid"
                borderColor="var(--waba-line)"
                borderRadius="18px"
                p={3.5}
                gap={2.5}
                flexWrap="wrap"
                align="center"
                justify="space-between"
            >
                <form onSubmit={handleSearchSubmit} style={{ flex: 1, minWidth: '220px' }}>
                    <HStack
                        bg="var(--waba-surface)"
                        border="1px solid"
                        borderColor="var(--waba-line)"
                        borderRadius="12px"
                        px={3}
                        h="38px"
                        gap={2}
                    >
                        <LuSearch size={14} color="var(--waba-ink-3)" />
                        <Input
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                            placeholder="닉네임, 이메일, 회원 ID, 반려동물명 검색..."
                            border="none"
                            bg="transparent"
                            color="var(--waba-ink)"
                            fontSize="13px"
                            px={0}
                            _focus={{ outline: 'none', boxShadow: 'none' }}
                        />
                    </HStack>
                </form>

                <HStack gap={2} flexWrap="wrap">
                    <select
                        value={role}
                        onChange={(e) => {
                            setRole(e.target.value);
                            setPage(1);
                        }}
                        style={{
                            height: '38px',
                            borderRadius: '12px',
                            border: '1px solid var(--waba-line)',
                            background: 'var(--waba-surface)',
                            color: 'var(--waba-ink)',
                            padding: '0 10px',
                            fontSize: '12.5px',
                            fontWeight: 600,
                        }}
                    >
                        <option value="ALL">권한: 전체</option>
                        <option value="USER">USER</option>
                        <option value="VET">VET</option>
                        <option value="EDITOR">EDITOR</option>
                        <option value="ADMIN">ADMIN</option>
                    </select>

                    <select
                        value={status}
                        onChange={(e) => {
                            setStatus(e.target.value);
                            setPage(1);
                        }}
                        style={{
                            height: '38px',
                            borderRadius: '12px',
                            border: '1px solid var(--waba-line)',
                            background: 'var(--waba-surface)',
                            color: 'var(--waba-ink)',
                            padding: '0 10px',
                            fontSize: '12.5px',
                            fontWeight: 600,
                        }}
                    >
                        <option value="ALL">상태: 전체</option>
                        <option value="ACTIVE">ACTIVE</option>
                        <option value="SUSPENDED">SUSPENDED</option>
                        <option value="WITHDRAWN">WITHDRAWN</option>
                    </select>

                    <select
                        value={sort}
                        onChange={(e) => {
                            setSort(e.target.value);
                            setPage(1);
                        }}
                        style={{
                            height: '38px',
                            borderRadius: '12px',
                            border: '1px solid var(--waba-line)',
                            background: 'var(--waba-surface)',
                            color: 'var(--waba-ink)',
                            padding: '0 10px',
                            fontSize: '12.5px',
                            fontWeight: 600,
                        }}
                    >
                        <option value="latest">최신 가입순</option>
                        <option value="last_login">최근 로그인순</option>
                        <option value="reports">신고 많은순</option>
                        <option value="pets">반려동물 많은순</option>
                    </select>
                </HStack>
            </Flex>

            {/* Users Table */}
            <Box
                bg="var(--waba-card)"
                border="1px solid"
                borderColor="var(--waba-line)"
                borderRadius="20px"
                overflow="visible"
            >
                <Box overflowX="auto" overflowY="visible">
                    <Box as="table" w="100%" borderCollapse="collapse" minW="920px">
                        <Box as="thead" bg="var(--waba-surface)" borderBottom="1px solid" borderColor="var(--waba-line)">
                            <Box as="tr">
                                {['회원 정보', '권한', '등록 반려동물', '활동 요약', '상태', '가입 / 최근 로그인', '관리'].map((col) => (
                                    <Box
                                        key={col}
                                        as="th"
                                        textAlign="left"
                                        px={4}
                                        py={3}
                                        fontSize="11.5px"
                                        fontWeight="700"
                                        color="var(--waba-ink-3)"
                                    >
                                        {col}
                                    </Box>
                                ))}
                            </Box>
                        </Box>
                        <Box as="tbody">
                            {loading ? (
                                <Box as="tr">
                                    <td colSpan={7} style={{ padding: '64px 0', textAlign: 'center' }}>
                                        <Spinner size="md" color="#6338A9" />
                                    </td>
                                </Box>
                            ) : users.length === 0 ? (
                                <Box as="tr">
                                    <td colSpan={7} style={{ padding: '64px 0', textAlign: 'center' }}>
                                        <Text fontSize="13px" color="var(--waba-ink-3)">
                                            조건에 맞는 회원이 없습니다.
                                        </Text>
                                    </td>
                                </Box>
                            ) : (
                                users.map((u) => {
                                    const userPets = u.pets || [];
                                    const hiddenPets = userPets.slice(3);
                                    const moreKey = `${u.id}-more`;
                                    return (
                                        <Box
                                            key={u.id}
                                            as="tr"
                                            borderBottom="1px solid"
                                            borderColor="var(--waba-line)"
                                            _hover={{ bg: 'var(--waba-surface)' }}
                                            cursor="pointer"
                                            onClick={() => {
                                                setSelectedUserId(u.id);
                                                setDetailOpen(true);
                                            }}
                                        >
                                            {/* 회원 정보 */}
                                            <Box as="td" px={4} py={3.5}>
                                                <HStack gap={2.5}>
                                                    <UserAvatar
                                                        src={u.profile_image_url}
                                                        alt={u.nickname || '회원'}
                                                        size="sm"
                                                        fallbackType="user"
                                                    />
                                                    <Box minW={0}>
                                                        <Text fontSize="13px" fontWeight="700" color="var(--waba-ink)">
                                                            {u.nickname || '이름 없음'}
                                                        </Text>
                                                        <Text fontSize="11.5px" color="var(--waba-ink-3)">
                                                            {u.email}
                                                        </Text>
                                                        <Text fontSize="10.5px" color="var(--waba-ink-3)">
                                                            ID: {u.id}
                                                        </Text>
                                                    </Box>
                                                </HStack>
                                            </Box>

                                            {/* 권한 */}
                                            <Box as="td" px={4} py={3.5}>
                                                <VStack align="flex-start" gap={1}>
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
                                                    {u.role === 'VET' && (u.vet_hospital_name || u.vet_license_number || u.vet_license_info) && (
                                                        <Text fontSize="10.5px" color="var(--waba-ink-2)" fontWeight="600">
                                                            {u.vet_hospital_name || u.vet_license_number || u.vet_license_info}
                                                        </Text>
                                                    )}
                                                    {u.role === 'ADMIN' && (u.admin_title || u.admin_name) && (
                                                        <Text fontSize="10.5px" color="var(--waba-ink-2)" fontWeight="600">
                                                            {[u.admin_title, u.admin_name].filter(Boolean).join(' · ')}
                                                        </Text>
                                                    )}
                                                </VStack>
                                            </Box>

                                            {/* 등록 반려동물: 겹치는 원형 아바타 스택 + Hover 툴팁 */}
                                            <Box as="td" px={4} py={3.5} overflow="visible">
                                                {userPets.length === 0 ? (
                                                    <Text fontSize="12px" color="var(--waba-ink-3)">
                                                        -
                                                    </Text>
                                                ) : (
                                                    <HStack gap={0} align="center" overflow="visible">
                                                        {userPets.slice(0, 3).map((pet, idx) => {
                                                            const petKey = `${u.id}-${pet.id}`;
                                                            const isHovered = hoveredTargetKey === petKey;
                                                            return (
                                                                <Box
                                                                    key={String(pet.id)}
                                                                    position="relative"
                                                                    ml={idx === 0 ? 0 : '-10px'}
                                                                    zIndex={isHovered ? 20 : idx}
                                                                    transform={isHovered ? 'translateY(-2px)' : undefined}
                                                                    transition="transform 0.15s ease"
                                                                    onMouseEnter={(e) => {
                                                                        const rect = e.currentTarget.getBoundingClientRect();
                                                                        setHoveredTargetKey(petKey);
                                                                        setHoveredTooltip({
                                                                            label: pet.breed ? `${pet.name} · ${pet.breed}` : pet.name,
                                                                            top: rect.top - 8,
                                                                            left: rect.left + rect.width / 2,
                                                                        });
                                                                    }}
                                                                    onMouseLeave={() => {
                                                                        setHoveredTargetKey(null);
                                                                        setHoveredTooltip(null);
                                                                    }}
                                                                >
                                                                    <Box
                                                                        w="34px"
                                                                        h="34px"
                                                                        borderRadius="full"
                                                                        border="2px solid var(--waba-card)"
                                                                        boxShadow="var(--waba-avatar-shadow)"
                                                                        overflow="hidden"
                                                                        bg="var(--waba-surface)"
                                                                    >
                                                                        <UserAvatar
                                                                            src={pet.current_avatar_url}
                                                                            alt={pet.name}
                                                                            w="100%"
                                                                            h="100%"
                                                                            iconSize={15}
                                                                            fallbackType="pet"
                                                                        />
                                                                    </Box>
                                                                </Box>
                                                            );
                                                        })}

                                                        {hiddenPets.length > 0 && (
                                                            <Box
                                                                position="relative"
                                                                ml="-10px"
                                                                zIndex={hoveredTargetKey === moreKey ? 20 : 3}
                                                                transform={hoveredTargetKey === moreKey ? 'translateY(-2px)' : undefined}
                                                                transition="transform 0.15s ease"
                                                                onMouseEnter={(e) => {
                                                                    const rect = e.currentTarget.getBoundingClientRect();
                                                                    setHoveredTargetKey(moreKey);
                                                                    setHoveredTooltip({
                                                                        label: hiddenPets.map((p) => p.name).join(', '),
                                                                        top: rect.top - 8,
                                                                        left: rect.left + rect.width / 2,
                                                                    });
                                                                }}
                                                                onMouseLeave={() => {
                                                                    setHoveredTargetKey(null);
                                                                    setHoveredTooltip(null);
                                                                }}
                                                            >
                                                                <Flex
                                                                    w="34px"
                                                                    h="34px"
                                                                    borderRadius="full"
                                                                    bg="var(--waba-bg)"
                                                                    border="2px solid var(--waba-line)"
                                                                    boxShadow="var(--waba-avatar-shadow)"
                                                                    color="var(--waba-ink)"
                                                                    fontSize="11px"
                                                                    fontWeight="800"
                                                                    align="center"
                                                                    justify="center"
                                                                >
                                                                    +{hiddenPets.length}
                                                                </Flex>
                                                            </Box>
                                                        )}
                                                    </HStack>
                                                )}
                                            </Box>

                                            {/* 활동 요약 */}
                                            <Box as="td" px={4} py={3.5}>
                                                <Text fontSize="12px" color="var(--waba-ink-2)">
                                                    글 {u.post_count ?? 0} · 수첩 {u.history_count ?? 0} · 그룹 {u.journey_count ?? 0}
                                                </Text>
                                                <Text
                                                    fontSize="11px"
                                                    color={(u.report_count ?? 0) > 0 ? '#EF4444' : 'var(--waba-ink-3)'}
                                                    fontWeight={(u.report_count ?? 0) > 0 ? '700' : '500'}
                                                >
                                                    신고 {u.report_count ?? 0}건
                                                </Text>
                                            </Box>

                                            {/* 상태 */}
                                            <Box as="td" px={4} py={3.5}>
                                                <Box
                                                    display="inline-block"
                                                    bg={u.status === 'ACTIVE' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)'}
                                                    color={u.status === 'ACTIVE' ? '#10B981' : '#EF4444'}
                                                    fontSize="10.5px"
                                                    fontWeight="800"
                                                    px={2.5}
                                                    py={0.5}
                                                    borderRadius="999px"
                                                >
                                                    {u.status || 'ACTIVE'}
                                                </Box>
                                            </Box>

                                            {/* 가입 / 최근 로그인 */}
                                            <Box as="td" px={4} py={3.5}>
                                                <Text fontSize="11.5px" color="var(--waba-ink-2)">
                                                    가입: {formatDateShort(u.created_at)}
                                                </Text>
                                                <Text fontSize="11px" color="var(--waba-ink-3)">
                                                    로그인: {formatDateShort(u.last_login_at)}
                                                </Text>
                                            </Box>

                                            {/* 관리 */}
                                            <Box as="td" px={4} py={3.5}>
                                                <Button
                                                    size="xs"
                                                    variant="outline"
                                                    borderColor="var(--waba-line)"
                                                    color="var(--waba-ink)"
                                                    borderRadius="999px"
                                                    px={3}
                                                    fontWeight="700"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedUserId(u.id);
                                                        setDetailOpen(true);
                                                    }}
                                                >
                                                    상세 보기
                                                </Button>
                                            </Box>
                                        </Box>
                                    );
                                })
                            )}
                        </Box>
                    </Box>
                </Box>
            </Box>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
                <Flex justify="center" align="center" gap={2} pt={2}>
                    <Button
                        size="xs"
                        variant="outline"
                        borderColor="var(--waba-line)"
                        color="var(--waba-ink)"
                        disabled={page <= 1}
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                        이전
                    </Button>
                    {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                        .slice(Math.max(0, page - 3), page + 2)
                        .map((pNum) => (
                            <Button
                                key={pNum}
                                size="xs"
                                borderRadius="full"
                                bg={pNum === page ? 'var(--waba-ink)' : 'var(--waba-card)'}
                                color={pNum === page ? 'var(--waba-bg)' : 'var(--waba-ink-2)'}
                                border="1px solid"
                                borderColor={pNum === page ? 'var(--waba-ink)' : 'var(--waba-line)'}
                                onClick={() => setPage(pNum)}
                            >
                                {pNum}
                            </Button>
                        ))}
                    <Button
                        size="xs"
                        variant="outline"
                        borderColor="var(--waba-line)"
                        color="var(--waba-ink)"
                        disabled={page >= pagination.totalPages}
                        onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                    >
                        다음
                    </Button>
                </Flex>
            )}

            <UserDetailDialog
                open={detailOpen}
                onOpenChange={setDetailOpen}
                userId={selectedUserId}
                onUpdated={() => fetchUsers(page)}
            />

            {hoveredTooltip && (
                <Box
                    position="fixed"
                    top={`${hoveredTooltip.top}px`}
                    left={`${hoveredTooltip.left}px`}
                    transform="translate(-50%, -100%)"
                    bg="var(--waba-ink)"
                    color="var(--waba-bg)"
                    fontSize="11px"
                    fontWeight="700"
                    px={2.5}
                    py={1}
                    borderRadius="8px"
                    whiteSpace="nowrap"
                    boxShadow="0 6px 16px rgba(0,0,0,0.22)"
                    pointerEvents="none"
                    zIndex={1500}
                >
                    {hoveredTooltip.label}
                </Box>
            )}
        </VStack>
    );
}
