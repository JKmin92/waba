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
import { LuPlus, LuRefreshCw, LuRotateCcw, LuSearch, LuShield, LuShieldCheck } from 'react-icons/lu';
import axiosInstance from '@/utils/api';
import { toaster } from '@/components/ui/toaster';
import UserAvatar from '../../(main)/common/UserAvatar';
import { useAdminContext } from '../AdminContext';
import {
    AdminAccountItem,
    EditAdminDialog,
    PromoteAdminDialog,
} from './AdminAccountDialogs';

const LEVEL_TABS = [
    { key: 'ALL', label: '전체' },
    { key: 'SUPER', label: '슈퍼 관리자' },
    { key: 'NORMAL', label: '일반 관리자' },
];

const STATUS_TABS = [
    { key: 'ALL', label: '전체' },
    { key: 'ACTIVE', label: '활성' },
    { key: 'SUSPENDED', label: '정지' },
];

export default function AdminAdminsClient() {
    const { adminUser: currentAdminUser } = useAdminContext();

    const [loading, setLoading] = useState(true);
    const [admins, setAdmins] = useState<AdminAccountItem[]>([]);
    const [summary, setSummary] = useState<any>({});

    const [levelFilter, setLevelFilter] = useState('ALL');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [searchInput, setSearchInput] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    // Dialogs
    const [promoteOpen, setPromoteOpen] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [selectedAdmin, setSelectedAdmin] = useState<AdminAccountItem | null>(null);

    const fetchAdmins = useCallback(async () => {
        setLoading(true);
        try {
            const res = await axiosInstance.get('/admin/admins', {
                params: {
                    level: levelFilter,
                    status: statusFilter,
                    q: searchQuery || undefined,
                },
            });
            setAdmins(res.data?.admins || []);
            setSummary(res.data?.summary || {});
        } catch {
            toaster.create({ title: '관리자 목록을 불러오지 못했습니다.', type: 'error' });
        } finally {
            setLoading(false);
        }
    }, [levelFilter, statusFilter, searchQuery]);

    useEffect(() => {
        fetchAdmins();
    }, [fetchAdmins]);

    const formatDateStr = (d?: string | null) => {
        if (!d) return '-';
        const parsed = new Date(d);
        if (Number.isNaN(parsed.getTime())) return '-';
        return parsed.toLocaleString('ko-KR');
    };

    const activeSuperCount = admins.filter(
        (a) => a.admin_level === 'SUPER' && a.status === 'ACTIVE'
    ).length;

    return (
        <Box maxW="1400px" mx="auto" px={{ base: 4, md: 6 }} py={6}>
            {/* Header */}
            <Flex
                justify="space-between"
                align={{ base: 'flex-start', md: 'center' }}
                direction={{ base: 'column', md: 'row' }}
                gap={3}
                mb={5}
            >
                <Box>
                    <Heading size="xl" fontWeight="800" color="var(--waba-ink)">
                        관리자 계정 관리
                    </Heading>
                    <Text fontSize="13.5px" color="var(--waba-ink-3)" mt={1}>
                        슈퍼 관리자(SUPER) 및 일반 관리자(NORMAL) 계정의 권한, 직함 및 상태를 관리합니다.
                    </Text>
                </Box>

                <HStack gap={2}>
                    <Button
                        size="sm"
                        h="34px"
                        px={4}
                        borderRadius="999px"
                        bg="#6338A9"
                        color="#FFFFFF"
                        _hover={{ bg: '#522B8F' }}
                        fontSize="12.5px"
                        fontWeight="700"
                        gap={1.5}
                        onClick={() => setPromoteOpen(true)}
                    >
                        <LuPlus size={15} />
                        관리자 등록
                    </Button>
                    <IconButton
                        aria-label="새로고침"
                        size="sm"
                        variant="outline"
                        borderColor="var(--waba-line)"
                        color="var(--waba-ink)"
                        borderRadius="999px"
                        onClick={fetchAdmins}
                    >
                        <LuRefreshCw />
                    </IconButton>
                </HStack>
            </Flex>

            {/* 4 KPI Cards */}
            <Grid templateColumns={{ base: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }} gap={3} mb={5}>
                {[
                    {
                        label: '전체 관리자',
                        value: summary.total ?? 0,
                        sub: `활성 ${summary.active ?? 0} · 정지 ${summary.suspended ?? 0}`,
                        color: 'var(--waba-ink)',
                    },
                    {
                        label: '슈퍼 관리자 (SUPER)',
                        value: summary.superCount ?? 0,
                        sub: '전체 권한 + 감사 로그/계정 관리',
                        color: '#6338A9',
                    },
                    {
                        label: '일반 관리자 (NORMAL)',
                        value: summary.normalCount ?? 0,
                        sub: '커뮤니티·신고·배너 운영 관리',
                        color: '#10B981',
                    },
                    {
                        label: '최근 7일 권한 변경',
                        value: summary.recentChanges7d ?? 0,
                        sub: '등록/수정/권한 해제 이력',
                        color: '#D97706',
                    },
                ].map((card) => (
                    <Box
                        key={card.label}
                        p={4}
                        borderRadius="18px"
                        bg="var(--waba-card)"
                        border="1px solid"
                        borderColor="var(--waba-line)"
                    >
                        <Text fontSize="12px" color="var(--waba-ink-3)" fontWeight="600">
                            {card.label}
                        </Text>
                        <Text fontSize="24px" fontWeight="800" color={card.color} mt={1}>
                            {card.value}
                        </Text>
                        <Text fontSize="11px" color="var(--waba-ink-3)" mt={0.5}>
                            {card.sub}
                        </Text>
                    </Box>
                ))}
            </Grid>

            {/* 2-Column Role Summary */}
            <Grid templateColumns={{ base: '1fr', md: '1fr 1fr' }} gap={3} mb={5}>
                <Box p={4} borderRadius="18px" bg="var(--waba-purple-soft)" border="1px solid" borderColor="var(--waba-purple-border)">
                    <HStack gap={2} mb={1}>
                        <LuShieldCheck size={16} color="#6338A9" />
                        <Text fontSize="13px" fontWeight="800" color="var(--waba-purple-text)">
                            슈퍼 관리자 (SUPER)
                        </Text>
                    </HStack>
                    <Text fontSize="12px" color="var(--waba-ink-2)">
                        모든 운영 기능과 더불어 감사 로그 열람, 관리자 계정 등록·등급 변경·권한 해제 권한을 가집니다.
                    </Text>
                </Box>
                <Box p={4} borderRadius="18px" bg="var(--waba-card)" border="1px solid" borderColor="var(--waba-line)">
                    <HStack gap={2} mb={1}>
                        <LuShield size={16} color="#10B981" />
                        <Text fontSize="13px" fontWeight="800" color="var(--waba-ink)">
                            일반 관리자 (NORMAL)
                        </Text>
                    </HStack>
                    <Text fontSize="12px" color="var(--waba-ink-3)">
                        회원·게시글·신고·수첩·게시판·공지/배너를 관리할 수 있으나, 감사 로그 및 관리자 계정 관리는 제한됩니다.
                    </Text>
                </Box>
            </Grid>

            {/* Filter Bar */}
            <Box
                p={4}
                borderRadius="20px"
                bg="var(--waba-card)"
                border="1px solid"
                borderColor="var(--waba-line)"
                mb={4}
            >
                <Flex justify="space-between" align="center" gap={3} flexWrap="wrap">
                    <HStack gap={1.5} flexWrap="wrap">
                        {LEVEL_TABS.map((tab) => (
                            <Button
                                key={tab.key}
                                size="xs"
                                h="28px"
                                px={3}
                                borderRadius="999px"
                                bg={levelFilter === tab.key ? 'var(--waba-ink)' : 'var(--waba-surface)'}
                                color={levelFilter === tab.key ? 'var(--waba-bg)' : 'var(--waba-ink-2)'}
                                border="1px solid"
                                borderColor={levelFilter === tab.key ? 'var(--waba-ink)' : 'var(--waba-line)'}
                                fontSize="11.5px"
                                fontWeight="700"
                                onClick={() => setLevelFilter(tab.key)}
                            >
                                {tab.label}
                            </Button>
                        ))}
                    </HStack>

                    <HStack gap={1.5} flexWrap="wrap">
                        {STATUS_TABS.map((tab) => (
                            <Button
                                key={tab.key}
                                size="xs"
                                h="28px"
                                px={3}
                                borderRadius="999px"
                                bg={statusFilter === tab.key ? '#6338A9' : 'var(--waba-surface)'}
                                color={statusFilter === tab.key ? '#FFFFFF' : 'var(--waba-ink-2)'}
                                border="1px solid"
                                borderColor={statusFilter === tab.key ? '#6338A9' : 'var(--waba-line)'}
                                fontSize="11.5px"
                                fontWeight="700"
                                onClick={() => setStatusFilter(tab.key)}
                            >
                                {tab.label}
                            </Button>
                        ))}
                    </HStack>

                    <HStack gap={1.5}>
                        <Input
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') setSearchQuery(searchInput.trim());
                            }}
                            placeholder="이름, 닉네임, 이메일 검색..."
                            size="sm"
                            w={{ base: '180px', md: '230px' }}
                            h="32px"
                            borderRadius="999px"
                            bg="var(--waba-surface)"
                            borderColor="var(--waba-line)"
                            color="var(--waba-ink)"
                        />
                        <IconButton
                            aria-label="검색"
                            size="sm"
                            h="32px"
                            w="32px"
                            borderRadius="999px"
                            bg="#6338A9"
                            color="#FFFFFF"
                            onClick={() => setSearchQuery(searchInput.trim())}
                        >
                            <LuSearch size={14} />
                        </IconButton>
                        <IconButton
                            aria-label="초기화"
                            size="sm"
                            h="32px"
                            w="32px"
                            variant="outline"
                            borderColor="var(--waba-line)"
                            color="var(--waba-ink-2)"
                            borderRadius="999px"
                            onClick={() => {
                                setLevelFilter('ALL');
                                setStatusFilter('ALL');
                                setSearchInput('');
                                setSearchQuery('');
                            }}
                        >
                            <LuRotateCcw size={13} />
                        </IconButton>
                    </HStack>
                </Flex>
            </Box>

            {/* Admins Table */}
            {loading ? (
                <Flex py={20} justify="center">
                    <Spinner size="lg" color="#6338A9" />
                </Flex>
            ) : admins.length === 0 ? (
                <Box p={12} textAlign="center" borderRadius="20px" bg="var(--waba-card)" border="1px solid" borderColor="var(--waba-line)">
                    <Text color="var(--waba-ink-3)" fontSize="14px">
                        조건에 해당하는 관리자가 없습니다.
                    </Text>
                </Box>
            ) : (
                <Box
                    borderRadius="20px"
                    bg="var(--waba-card)"
                    border="1px solid"
                    borderColor="var(--waba-line)"
                    overflowX="auto"
                >
                    <Box as="table" w="100%" minW="920px" borderCollapse="collapse">
                        <Box as="thead" bg="var(--waba-surface)" borderBottom="1px solid" borderColor="var(--waba-line)">
                            <Box as="tr">
                                {['관리자', '등급', '직함', '상태', '최근 로그인', '액션'].map((col) => (
                                    <Box
                                        as="th"
                                        key={col}
                                        textAlign="left"
                                        px={4}
                                        py={3}
                                        fontSize="11.5px"
                                        fontWeight="800"
                                        color="var(--waba-ink-3)"
                                        whiteSpace="nowrap"
                                    >
                                        {col}
                                    </Box>
                                ))}
                            </Box>
                        </Box>
                        <Box as="tbody">
                            {admins.map((admin) => {
                                const isSelf = String(admin.id) === String(currentAdminUser?.id);
                                const isSuper = admin.admin_level === 'SUPER';

                                return (
                                    <Box
                                        as="tr"
                                        key={admin.id}
                                        borderBottom="1px solid"
                                        borderColor="var(--waba-line)"
                                        _last={{ borderBottom: 'none' }}
                                        _hover={{ bg: 'var(--waba-surface)' }}
                                    >
                                        <Box as="td" px={4} py={3.5} verticalAlign="middle">
                                            <HStack gap={2.5}>
                                                <UserAvatar
                                                    src={admin.profile_image_url}
                                                    alt={admin.admin_name || admin.nickname || '관리자'}
                                                    size="xs"
                                                    fallbackType="user"
                                                />
                                                <Box>
                                                    <HStack gap={1.5}>
                                                        <Text fontSize="13px" fontWeight="800" color="var(--waba-ink)">
                                                            {admin.admin_name || admin.nickname}
                                                        </Text>
                                                        {isSelf && (
                                                            <Box
                                                                bg="var(--waba-purple-soft)"
                                                                color="var(--waba-purple-text)"
                                                                fontSize="10px"
                                                                fontWeight="800"
                                                                px={1.5}
                                                                py="1px"
                                                                borderRadius="999px"
                                                            >
                                                                나
                                                            </Box>
                                                        )}
                                                    </HStack>
                                                    <Text fontSize="11.5px" color="var(--waba-ink-3)">
                                                        {admin.email}
                                                    </Text>
                                                </Box>
                                            </HStack>
                                        </Box>

                                        <Box as="td" px={4} py={3.5} verticalAlign="middle" whiteSpace="nowrap">
                                            <Box
                                                display="inline-block"
                                                bg={isSuper ? 'var(--waba-purple-soft)' : 'var(--waba-surface)'}
                                                color={isSuper ? 'var(--waba-purple-text)' : 'var(--waba-ink-2)'}
                                                border="1px solid"
                                                borderColor={isSuper ? 'var(--waba-purple-border)' : 'var(--waba-line)'}
                                                fontSize="10.5px"
                                                fontWeight="800"
                                                px={2.5}
                                                py={0.5}
                                                borderRadius="999px"
                                            >
                                                {isSuper ? '슈퍼 관리자' : '일반 관리자'}
                                            </Box>
                                        </Box>

                                        <Box as="td" px={4} py={3.5} verticalAlign="middle" whiteSpace="nowrap">
                                            <Text fontSize="12.5px" color="var(--waba-ink-2)">
                                                {admin.admin_title || '-'}
                                            </Text>
                                        </Box>

                                        <Box as="td" px={4} py={3.5} verticalAlign="middle" whiteSpace="nowrap">
                                            <Box
                                                display="inline-block"
                                                bg={admin.status === 'ACTIVE' ? 'rgba(16, 185, 129, 0.14)' : 'rgba(239, 68, 68, 0.14)'}
                                                color={admin.status === 'ACTIVE' ? '#10B981' : '#EF4444'}
                                                fontSize="10.5px"
                                                fontWeight="800"
                                                px={2.5}
                                                py={0.5}
                                                borderRadius="999px"
                                            >
                                                {admin.status === 'ACTIVE' ? '활성' : '정지'}
                                            </Box>
                                        </Box>

                                        <Box as="td" px={4} py={3.5} verticalAlign="middle" whiteSpace="nowrap">
                                            <Text fontSize="12px" color="var(--waba-ink-3)">
                                                {formatDateStr(admin.last_login_at)}
                                            </Text>
                                        </Box>

                                        <Box as="td" px={4} py={3.5} verticalAlign="middle" whiteSpace="nowrap">
                                            <Button
                                                size="xs"
                                                h="30px"
                                                px={3.5}
                                                borderRadius="999px"
                                                bg="#6338A9"
                                                color="#FFFFFF"
                                                _hover={{ bg: '#522B8F' }}
                                                onClick={() => {
                                                    setSelectedAdmin(admin);
                                                    setEditOpen(true);
                                                }}
                                            >
                                                상세 관리
                                            </Button>
                                        </Box>
                                    </Box>
                                );
                            })}
                        </Box>
                    </Box>
                </Box>
            )}

            <PromoteAdminDialog
                open={promoteOpen}
                onOpenChange={setPromoteOpen}
                onSaved={fetchAdmins}
            />

            <EditAdminDialog
                open={editOpen}
                onOpenChange={setEditOpen}
                admin={selectedAdmin}
                isSelf={Boolean(selectedAdmin && String(selectedAdmin.id) === String(currentAdminUser?.id))}
                isLastSuper={Boolean(
                    selectedAdmin &&
                        selectedAdmin.admin_level === 'SUPER' &&
                        selectedAdmin.status === 'ACTIVE' &&
                        activeSuperCount <= 1
                )}
                onSaved={fetchAdmins}
            />
        </Box>
    );
}
