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
    NativeSelect,
    Spinner,
    Text,
    VStack,
} from '@chakra-ui/react';
import { LuDownload, LuRefreshCw, LuRotateCcw, LuSearch } from 'react-icons/lu';
import axiosInstance from '@/utils/api';
import { toaster } from '@/components/ui/toaster';
import UserAvatar from '../../(main)/common/UserAvatar';
import AuditLogDetailDrawer, { AuditLogItem } from './AuditLogDetailDrawer';

const DOMAIN_GROUP_TABS = [
    { key: 'ALL', label: '전체' },
    { key: 'USER_PET', label: '회원 · 반려동물' },
    { key: 'POST_COMMENT', label: '게시물 · 댓글' },
    { key: 'REPORT', label: '신고 처리' },
    { key: 'NOTEBOOK', label: '수첩 · 이력' },
    { key: 'BOARD_AFFILIATE', label: '게시판 · 제휴' },
    { key: 'MARKETING', label: '공지 · 배너 · 팝업' },
];

const SEVERITY_TABS = [
    { key: 'ALL', label: '전체' },
    { key: 'CREATE', label: '생성/복원' },
    { key: 'UPDATE', label: '수정/변경' },
    { key: 'DANGER', label: '삭제/제재/거부' },
];

const PERIOD_TABS = [
    { key: 'all', label: '전체 기간' },
    { key: 'today', label: '오늘' },
    { key: '7d', label: '최근 7일' },
    { key: '30d', label: '최근 30일' },
];

const SEVERITY_BADGE: Record<string, { label: string; bg: string; color: string }> = {
    CREATE: { label: '생성/복원', bg: 'rgba(16, 185, 129, 0.14)', color: '#10B981' },
    UPDATE: { label: '수정/변경', bg: 'rgba(245, 158, 11, 0.14)', color: '#D97706' },
    DANGER: { label: '삭제/제재', bg: 'rgba(239, 68, 68, 0.14)', color: '#EF4444' },
};

export default function AdminAuditLogsClient() {
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [exporting, setExporting] = useState(false);

    const [logs, setLogs] = useState<AuditLogItem[]>([]);
    const [summary, setSummary] = useState<any>({});
    const [admins, setAdmins] = useState<Array<{ id: string; name: string | null; title: string | null; email: string | null }>>([]);
    const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0, totalPages: 1 });

    // Filters
    const [groupFilter, setGroupFilter] = useState('ALL');
    const [severityFilter, setSeverityFilter] = useState('ALL');
    const [periodFilter, setPeriodFilter] = useState('all');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [adminIdFilter, setAdminIdFilter] = useState('');
    const [searchInput, setSearchInput] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [page, setPage] = useState(1);

    // Drawer
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);

    const fetchLogs = useCallback(async () => {
        setLoading(true);
        setErrorMsg(null);
        try {
            const res = await axiosInstance.get('/admin/audit-logs', {
                params: {
                    group: groupFilter,
                    severity: severityFilter,
                    period: periodFilter,
                    startDate: startDate || undefined,
                    endDate: endDate || undefined,
                    adminId: adminIdFilter || undefined,
                    q: searchQuery || undefined,
                    page,
                    pageSize: 20,
                },
            });
            setLogs(res.data?.logs || []);
            setSummary(res.data?.summary || {});
            setAdmins(res.data?.admins || []);
            setPagination(res.data?.pagination || { page: 1, pageSize: 20, total: 0, totalPages: 1 });
        } catch (err: any) {
            const msg = err?.response?.data?.message || '감사 로그를 불러오지 못했습니다.';
            setErrorMsg(msg);
            toaster.create({ title: msg, type: 'error' });
        } finally {
            setLoading(false);
        }
    }, [groupFilter, severityFilter, periodFilter, startDate, endDate, adminIdFilter, searchQuery, page]);

    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);

    const handleResetFilters = () => {
        setGroupFilter('ALL');
        setSeverityFilter('ALL');
        setPeriodFilter('all');
        setStartDate('');
        setEndDate('');
        setAdminIdFilter('');
        setSearchInput('');
        setSearchQuery('');
        setPage(1);
    };

    const handleExportCsv = async () => {
        setExporting(true);
        try {
            const res = await axiosInstance.get('/admin/audit-logs/export', {
                params: {
                    group: groupFilter,
                    severity: severityFilter,
                    period: periodFilter,
                    startDate: startDate || undefined,
                    endDate: endDate || undefined,
                    adminId: adminIdFilter || undefined,
                    q: searchQuery || undefined,
                },
                responseType: 'blob',
            });
            const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8;' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `waba-audit-logs-${new Date().toISOString().slice(0, 10)}.csv`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
            toaster.create({ title: 'CSV 파일이 다운로드되었습니다.', type: 'success' });
        } catch {
            toaster.create({ title: 'CSV 내보내기에 실패했습니다.', type: 'error' });
        } finally {
            setExporting(false);
        }
    };

    const formatDateStr = (d?: string | null) => {
        if (!d) return '-';
        const parsed = new Date(d);
        if (Number.isNaN(parsed.getTime())) return '-';
        return parsed.toLocaleString('ko-KR');
    };

    const totalCount = pagination.total ?? 0;
    const startIdx = totalCount === 0 ? 0 : (pagination.page - 1) * pagination.pageSize + 1;
    const endIdx = Math.min(totalCount, pagination.page * pagination.pageSize);

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
                        감사 로그
                    </Heading>
                    <Text fontSize="13.5px" color="var(--waba-ink-3)" mt={1}>
                        관리자 콘솔에서 수행된 모든 주요 변경, 제재 및 삭제 이력을 추적합니다.
                    </Text>
                </Box>

                <HStack gap={2}>
                    <Button
                        size="sm"
                        h="34px"
                        px={4}
                        borderRadius="999px"
                        variant="outline"
                        borderColor="var(--waba-line)"
                        color="var(--waba-ink)"
                        fontSize="12.5px"
                        fontWeight="700"
                        gap={1.5}
                        loading={exporting}
                        onClick={handleExportCsv}
                    >
                        <LuDownload size={14} />
                        CSV 내보내기
                    </Button>
                    <IconButton
                        aria-label="새로고침"
                        size="sm"
                        variant="outline"
                        borderColor="var(--waba-line)"
                        color="var(--waba-ink)"
                        borderRadius="999px"
                        onClick={fetchLogs}
                    >
                        <LuRefreshCw />
                    </IconButton>
                </HStack>
            </Flex>

            {/* 4 KPI Cards */}
            <Grid templateColumns={{ base: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }} gap={3} mb={5}>
                {[
                    {
                        label: '전체 감사 로그',
                        value: summary.total ?? 0,
                        sub: '누적 기록 (수정·삭제 불가)',
                        color: 'var(--waba-ink)',
                    },
                    {
                        label: '최근 7일 / 오늘 활동',
                        value: summary.last_7d ?? 0,
                        sub: `오늘 ${summary.today ?? 0}건 · 활동 관리자 ${summary.active_admins_7d ?? 0}명`,
                        color: '#6338A9',
                    },
                    {
                        label: '위험 · 제재 · 삭제 액션',
                        value: summary.danger_count ?? 0,
                        sub: '삭제, 정지, 비공개 전환 등',
                        color: '#EF4444',
                    },
                    {
                        label: '최다 발생 도메인',
                        value: summary.top_group?.label || '-',
                        sub: `${summary.top_group?.count ?? 0}건 (${summary.top_group?.percent ?? 0}%)`,
                        color: '#10B981',
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
                        <Text fontSize="22px" fontWeight="800" color={card.color} mt={1} truncate>
                            {card.value}
                        </Text>
                        <Text fontSize="11px" color="var(--waba-ink-3)" mt={0.5} truncate>
                            {card.sub}
                        </Text>
                    </Box>
                ))}
            </Grid>

            {/* 2-Row Filter & Search Bar */}
            <Box
                p={4}
                borderRadius="20px"
                bg="var(--waba-card)"
                border="1px solid"
                borderColor="var(--waba-line)"
                mb={4}
            >
                <VStack align="stretch" gap={3}>
                    {/* Row 1: Domain Group Tabs */}
                    <HStack gap={1.5} flexWrap="wrap">
                        {DOMAIN_GROUP_TABS.map((tab) => (
                            <Button
                                key={tab.key}
                                size="xs"
                                h="28px"
                                px={3}
                                borderRadius="999px"
                                bg={groupFilter === tab.key ? 'var(--waba-ink)' : 'var(--waba-surface)'}
                                color={groupFilter === tab.key ? 'var(--waba-bg)' : 'var(--waba-ink-2)'}
                                border="1px solid"
                                borderColor={groupFilter === tab.key ? 'var(--waba-ink)' : 'var(--waba-line)'}
                                fontSize="11.5px"
                                fontWeight="700"
                                onClick={() => {
                                    setGroupFilter(tab.key);
                                    setPage(1);
                                }}
                            >
                                {tab.label}
                            </Button>
                        ))}
                    </HStack>

                    {/* Row 2: Severity, Period, Custom Date, Admin Dropdown, Search, Reset */}
                    <Flex justify="space-between" align="center" gap={2.5} flexWrap="wrap">
                        <HStack gap={1.5} flexWrap="wrap">
                            {SEVERITY_TABS.map((tab) => (
                                <Button
                                    key={tab.key}
                                    size="xs"
                                    h="28px"
                                    px={2.5}
                                    borderRadius="999px"
                                    bg={severityFilter === tab.key ? '#6338A9' : 'var(--waba-surface)'}
                                    color={severityFilter === tab.key ? '#FFFFFF' : 'var(--waba-ink-2)'}
                                    border="1px solid"
                                    borderColor={severityFilter === tab.key ? '#6338A9' : 'var(--waba-line)'}
                                    fontSize="11px"
                                    fontWeight="700"
                                    onClick={() => {
                                        setSeverityFilter(tab.key);
                                        setPage(1);
                                    }}
                                >
                                    {tab.label}
                                </Button>
                            ))}
                        </HStack>

                        <HStack gap={1.5} flexWrap="wrap">
                            {PERIOD_TABS.map((tab) => (
                                <Button
                                    key={tab.key}
                                    size="xs"
                                    h="28px"
                                    px={2.5}
                                    borderRadius="999px"
                                    bg={periodFilter === tab.key && !startDate && !endDate ? 'var(--waba-purple-soft)' : 'var(--waba-surface)'}
                                    color={periodFilter === tab.key && !startDate && !endDate ? 'var(--waba-purple-text)' : 'var(--waba-ink-3)'}
                                    border="1px solid"
                                    borderColor={periodFilter === tab.key && !startDate && !endDate ? 'var(--waba-purple-border)' : 'var(--waba-line)'}
                                    fontSize="11px"
                                    fontWeight="700"
                                    onClick={() => {
                                        setPeriodFilter(tab.key);
                                        setStartDate('');
                                        setEndDate('');
                                        setPage(1);
                                    }}
                                >
                                    {tab.label}
                                </Button>
                            ))}
                        </HStack>

                        <HStack gap={1.5} flexWrap="wrap">
                            <Input
                                type="date"
                                value={startDate}
                                onChange={(e) => {
                                    setStartDate(e.target.value);
                                    setPage(1);
                                }}
                                size="xs"
                                h="30px"
                                w="130px"
                                bg="var(--waba-surface)"
                                borderColor="var(--waba-line)"
                                color="var(--waba-ink)"
                            />
                            <Text fontSize="11px" color="var(--waba-ink-3)">~</Text>
                            <Input
                                type="date"
                                value={endDate}
                                onChange={(e) => {
                                    setEndDate(e.target.value);
                                    setPage(1);
                                }}
                                size="xs"
                                h="30px"
                                w="130px"
                                bg="var(--waba-surface)"
                                borderColor="var(--waba-line)"
                                color="var(--waba-ink)"
                            />
                        </HStack>

                        <NativeSelect.Root size="xs" w="150px">
                            <NativeSelect.Field
                                value={adminIdFilter}
                                onChange={(e) => {
                                    setAdminIdFilter(e.target.value);
                                    setPage(1);
                                }}
                                h="30px"
                                bg="var(--waba-surface)"
                                borderColor="var(--waba-line)"
                                color="var(--waba-ink)"
                                borderRadius="999px"
                                fontSize="11.5px"
                            >
                                <option value="">전체 관리자</option>
                                {admins.map((a) => (
                                    <option key={a.id} value={a.id}>
                                        {a.name || a.email || a.id}
                                    </option>
                                ))}
                            </NativeSelect.Field>
                        </NativeSelect.Root>

                        <HStack gap={1.5}>
                            <Input
                                value={searchInput}
                                onChange={(e) => setSearchInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        setSearchQuery(searchInput.trim());
                                        setPage(1);
                                    }
                                }}
                                placeholder="요약, 액션, 대상 ID 검색..."
                                size="xs"
                                h="30px"
                                w="190px"
                                borderRadius="999px"
                                bg="var(--waba-surface)"
                                borderColor="var(--waba-line)"
                                color="var(--waba-ink)"
                            />
                            <IconButton
                                aria-label="검색"
                                size="xs"
                                h="30px"
                                w="30px"
                                borderRadius="999px"
                                bg="#6338A9"
                                color="#FFFFFF"
                                onClick={() => {
                                    setSearchQuery(searchInput.trim());
                                    setPage(1);
                                }}
                            >
                                <LuSearch size={13} />
                            </IconButton>
                            <IconButton
                                aria-label="초기화"
                                size="xs"
                                h="30px"
                                w="30px"
                                variant="outline"
                                borderColor="var(--waba-line)"
                                color="var(--waba-ink-2)"
                                borderRadius="999px"
                                title="필터 초기화"
                                onClick={handleResetFilters}
                            >
                                <LuRotateCcw size={13} />
                            </IconButton>
                        </HStack>
                    </Flex>
                </VStack>
            </Box>

            {/* Error Banner */}
            {errorMsg && (
                <Flex
                    p={4}
                    mb={4}
                    borderRadius="16px"
                    bg="rgba(239, 68, 68, 0.1)"
                    border="1px solid"
                    borderColor="rgba(239, 68, 68, 0.35)"
                    justify="space-between"
                    align="center"
                >
                    <Text fontSize="13px" fontWeight="700" color="#EF4444">
                        {errorMsg}
                    </Text>
                    <Button size="xs" bg="#EF4444" color="#FFFFFF" borderRadius="999px" onClick={fetchLogs}>
                        재시도
                    </Button>
                </Flex>
            )}

            {/* Table */}
            {loading ? (
                <Flex py={20} justify="center">
                    <Spinner size="lg" color="#6338A9" />
                </Flex>
            ) : logs.length === 0 ? (
                <Box p={12} textAlign="center" borderRadius="20px" bg="var(--waba-card)" border="1px solid" borderColor="var(--waba-line)">
                    <Text color="var(--waba-ink-3)" fontSize="14px">
                        조건에 해당하는 감사 로그가 없습니다.
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
                    <Box as="table" w="100%" minW="1040px" borderCollapse="collapse">
                        <Box as="thead" bg="var(--waba-surface)" borderBottom="1px solid" borderColor="var(--waba-line)">
                            <Box as="tr">
                                {['시각', '관리자', '액션 / 위험도', '대상', '작업 요약', 'IP 주소', '상세'].map((col) => (
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
                            {logs.map((log) => {
                                const sev = SEVERITY_BADGE[log.severity] || SEVERITY_BADGE.UPDATE;
                                return (
                                    <Box
                                        as="tr"
                                        key={log.id}
                                        borderBottom="1px solid"
                                        borderColor="var(--waba-line)"
                                        _last={{ borderBottom: 'none' }}
                                        _hover={{ bg: 'var(--waba-surface)' }}
                                        cursor="pointer"
                                        onClick={() => {
                                            setSelectedLog(log);
                                            setDrawerOpen(true);
                                        }}
                                    >
                                        <Box as="td" px={4} py={3.5} verticalAlign="middle" whiteSpace="nowrap">
                                            <Text fontSize="12px" color="var(--waba-ink-2)">
                                                {formatDateStr(log.created_at)}
                                            </Text>
                                        </Box>

                                        <Box as="td" px={4} py={3.5} verticalAlign="middle" whiteSpace="nowrap">
                                            <HStack gap={2}>
                                                <UserAvatar
                                                    src={log.admin_profile_image_url}
                                                    alt={log.admin_name || '관리자'}
                                                    size="2xs"
                                                    fallbackType="user"
                                                />
                                                <Box>
                                                    <Text fontSize="12.5px" fontWeight="700" color="var(--waba-ink)">
                                                        {log.admin_name || '-'}
                                                    </Text>
                                                    <Text fontSize="10.5px" color="var(--waba-ink-3)" fontFamily="mono">
                                                        {log.admin_user_id}
                                                    </Text>
                                                </Box>
                                            </HStack>
                                        </Box>

                                        <Box as="td" px={4} py={3.5} verticalAlign="middle" whiteSpace="nowrap">
                                            <HStack gap={1.5}>
                                                <Box
                                                    bg={sev.bg}
                                                    color={sev.color}
                                                    fontSize="10px"
                                                    fontWeight="800"
                                                    px={2}
                                                    py="1px"
                                                    borderRadius="999px"
                                                >
                                                    {sev.label}
                                                </Box>
                                                <Text fontSize="11px" fontFamily="mono" color="var(--waba-ink-2)">
                                                    {log.action}
                                                </Text>
                                            </HStack>
                                        </Box>

                                        <Box as="td" px={4} py={3.5} verticalAlign="middle" whiteSpace="nowrap">
                                            <Text fontSize="12px" fontWeight="700" color="var(--waba-ink)">
                                                {log.target_type}
                                                {log.target_id ? ` #${log.target_id}` : ''}
                                            </Text>
                                        </Box>

                                        <Box as="td" px={4} py={3.5} verticalAlign="middle" maxW="300px">
                                            <Text fontSize="12.5px" color="var(--waba-ink)" truncate title={log.summary}>
                                                {log.summary}
                                            </Text>
                                        </Box>

                                        <Box as="td" px={4} py={3.5} verticalAlign="middle" whiteSpace="nowrap">
                                            <Text fontSize="11.5px" fontFamily="mono" color="var(--waba-ink-3)">
                                                {log.ip_address || '-'}
                                            </Text>
                                        </Box>

                                        <Box as="td" px={4} py={3.5} verticalAlign="middle" whiteSpace="nowrap">
                                            <Button
                                                size="xs"
                                                h="28px"
                                                px={3}
                                                borderRadius="999px"
                                                bg="#6338A9"
                                                color="#FFFFFF"
                                                _hover={{ bg: '#522B8F' }}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedLog(log);
                                                    setDrawerOpen(true);
                                                }}
                                            >
                                                상세
                                            </Button>
                                        </Box>
                                    </Box>
                                );
                            })}
                        </Box>
                    </Box>
                </Box>
            )}

            {/* Pagination Footer */}
            <Flex justify="space-between" align="center" mt={5} flexWrap="wrap" gap={3}>
                <Text fontSize="12px" color="var(--waba-ink-3)">
                    총 {totalCount}건 중 {startIdx}–{endIdx} 표시
                </Text>

                {pagination.totalPages > 1 && (
                    <HStack gap={2}>
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
                        <Text fontSize="12.5px" color="var(--waba-ink-2)" fontWeight="700">
                            {page} / {pagination.totalPages}
                        </Text>
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
                    </HStack>
                )}
            </Flex>

            <AuditLogDetailDrawer
                open={drawerOpen}
                onOpenChange={setDrawerOpen}
                log={selectedLog}
            />
        </Box>
    );
}
