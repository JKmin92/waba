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
import { LuPlus, LuRefreshCw, LuSearch, LuShieldCheck } from 'react-icons/lu';
import axiosInstance from '@/utils/api';
import { toaster } from '@/components/ui/toaster';
import AffiliateDomainFormDialog from './AffiliateDomainFormDialog';

const STATUS_TABS = [
    { key: 'ALL', label: '전체' },
    { key: 'ACTIVE', label: '활성' },
    { key: 'INACTIVE', label: '비활성' },
];

export default function AdminAffiliateDomainsClient() {
    const [loading, setLoading] = useState(true);
    const [domains, setDomains] = useState<any[]>([]);
    const [kpi, setKpi] = useState<any>({});

    const [statusFilter, setStatusFilter] = useState('ALL');
    const [searchInput, setSearchInput] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    // URL Test state
    const [testUrl, setTestUrl] = useState('');
    const [testing, setTesting] = useState(false);
    const [testResult, setTestResult] = useState<any>(null);

    // Dialog state
    const [dialogOpen, setDialogOpen] = useState(false);
    const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
    const [selectedDomain, setSelectedDomain] = useState<any | null>(null);

    const fetchDomains = useCallback(async () => {
        setLoading(true);
        try {
            const res = await axiosInstance.get('/admin/affiliate-domains', {
                params: {
                    status: statusFilter === 'ALL' ? undefined : statusFilter,
                    q: searchQuery || undefined,
                },
            });
            setDomains(res.data?.domains || []);
            setKpi(res.data?.kpi || {});
        } catch {
            toaster.create({ title: '제휴 도메인 목록을 불러오지 못했습니다.', type: 'error' });
        } finally {
            setLoading(false);
        }
    }, [statusFilter, searchQuery]);

    useEffect(() => {
        fetchDomains();
    }, [fetchDomains]);

    const handleTestUrl = async () => {
        if (!testUrl.trim()) {
            toaster.create({ title: '테스트할 상품 URL을 입력해주세요.', type: 'warning' });
            return;
        }
        setTesting(true);
        try {
            const res = await axiosInstance.post('/admin/affiliate-domains/test-url', {
                url: testUrl.trim(),
            });
            setTestResult(res.data);
        } catch (err: any) {
            toaster.create({
                title: err?.response?.data?.message || 'URL 검증 테스트에 실패했습니다.',
                type: 'error',
            });
        } finally {
            setTesting(false);
        }
    };

    const formatDateShort = (d?: string | null) => {
        if (!d) return '-';
        const parsed = new Date(d);
        if (Number.isNaN(parsed.getTime())) return '-';
        const y = parsed.getFullYear();
        const m = String(parsed.getMonth() + 1).padStart(2, '0');
        const day = String(parsed.getDate()).padStart(2, '0');
        return `${y}.${m}.${day}`;
    };

    const getMatchTypeLabel = (matchType?: string, matchedSubdomain?: string) => {
        switch (matchType) {
            case 'EXACT':
                return '루트 일치';
            case 'SUBDOMAIN_ALL':
                return '전체 서브도메인 허용';
            case 'SUBDOMAIN_SPECIFIC':
                return `지정 서브도메인(${matchedSubdomain || '-'}) 일치`;
            default:
                return matchType || '-';
        }
    };

    return (
        <Box maxW="1400px" mx="auto" px={{ base: 4, md: 6 }} py={6}>
            {/* Header */}
            <Flex justify="space-between" align={{ base: 'flex-start', md: 'center' }} direction={{ base: 'column', md: 'row' }} gap={3} mb={5}>
                <Box>
                    <Heading size="xl" fontWeight="800" color="var(--waba-ink)">
                        제휴 도메인 관리
                    </Heading>
                    <Text fontSize="13.5px" color="var(--waba-ink-3)" mt={1}>
                        게시글 상품 핀에 등록 가능한 제휴 쇼핑몰 도메인 화이트리스트와 서브도메인 허용 정책을 관리합니다.
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
                        onClick={() => {
                            setDialogMode('create');
                            setSelectedDomain(null);
                            setDialogOpen(true);
                        }}
                    >
                        <LuPlus size={15} />
                        도메인 추가
                    </Button>
                    <IconButton
                        aria-label="새로고침"
                        size="sm"
                        variant="outline"
                        borderColor="var(--waba-line)"
                        color="var(--waba-ink)"
                        borderRadius="999px"
                        onClick={fetchDomains}
                    >
                        <LuRefreshCw />
                    </IconButton>
                </HStack>
            </Flex>

            {/* 4 KPI Cards */}
            <Grid templateColumns={{ base: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }} gap={3} mb={5}>
                {[
                    {
                        label: '전체 허용 도메인',
                        value: kpi.totalDomains ?? 0,
                        sub: `활성 ${kpi.activeDomains ?? 0}개 · 비활성 ${kpi.inactiveDomains ?? 0}개`,
                        color: 'var(--waba-ink)',
                    },
                    {
                        label: '활성 화이트리스트',
                        value: kpi.activeDomains ?? 0,
                        sub: `전체 ${kpi.allSubCount ?? 0} · 지정 ${kpi.specificSubCount ?? 0} · 루트만 ${kpi.noneSubCount ?? 0}`,
                        color: '#6338A9',
                    },
                    {
                        label: '연결된 상품 핀',
                        value: kpi.totalProductPins ?? 0,
                        sub: '화이트리스트 검증 통과 링크',
                        color: 'var(--waba-ink)',
                    },
                    {
                        label: 'URL 보안 정책',
                        value: '엄격 적용',
                        sub: 'http/https · XSS 스킴 차단',
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
                        <Text fontSize="24px" fontWeight="800" color={card.color} mt={1}>
                            {card.value}
                        </Text>
                        <Text fontSize="11px" color="var(--waba-ink-3)" mt={0.5}>
                            {card.sub}
                        </Text>
                    </Box>
                ))}
            </Grid>

            {/* 사전 URL 검증 테스트 카드 */}
            <Box
                p={4}
                borderRadius="20px"
                bg="var(--waba-card)"
                border="1px solid"
                borderColor="var(--waba-line)"
                mb={5}
            >
                <HStack gap={2} mb={2.5}>
                    <LuShieldCheck size={16} color="#6338A9" />
                    <Text fontSize="13.5px" fontWeight="800" color="var(--waba-ink)">
                        사전 URL 검증 테스트
                    </Text>
                </HStack>

                <Flex gap={2} flexWrap={{ base: 'wrap', sm: 'nowrap' }}>
                    <Input
                        value={testUrl}
                        onChange={(e) => setTestUrl(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') handleTestUrl();
                        }}
                        placeholder="테스트할 상품 URL을 붙여넣으세요... (예: https://m.tntnfarm.com/goods/123)"
                        size="sm"
                        h="36px"
                        borderRadius="999px"
                        bg="var(--waba-surface)"
                        borderColor="var(--waba-line)"
                        color="var(--waba-ink)"
                    />
                    <Button
                        size="sm"
                        h="36px"
                        px={5}
                        borderRadius="999px"
                        bg="#6338A9"
                        color="#FFFFFF"
                        _hover={{ bg: '#522B8F' }}
                        fontSize="12.5px"
                        fontWeight="700"
                        flexShrink={0}
                        loading={testing}
                        onClick={handleTestUrl}
                    >
                        검증 테스트
                    </Button>
                </Flex>

                {testResult && (
                    <Box
                        mt={3}
                        p={3}
                        borderRadius="12px"
                        bg={testResult.allowed ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)'}
                        border="1px solid"
                        borderColor={testResult.allowed ? 'rgba(16, 185, 129, 0.35)' : 'rgba(239, 68, 68, 0.35)'}
                    >
                        {testResult.allowed ? (
                            <Text fontSize="12.5px" fontWeight="700" color="#10B981">
                                ✓ 허용됨 — 매칭 도메인: {testResult.matchedRule?.domain} ({testResult.matchedRule?.mall_name || '-'}) ·{' '}
                                {getMatchTypeLabel(testResult.matchType, testResult.matchedSubdomain)}
                            </Text>
                        ) : (
                            <Box>
                                <Text fontSize="12.5px" fontWeight="700" color="#EF4444">
                                    ✕ 차단됨 — {testResult.reason || '허용되지 않은 도메인입니다.'}
                                </Text>
                                {Array.isArray(testResult.blockedRule?.allowed_subdomains) &&
                                    testResult.blockedRule.allowed_subdomains.length > 0 && (
                                        <Text fontSize="11.5px" color="var(--waba-ink-2)" mt={1}>
                                            허용된 서브도메인 접두사: {testResult.blockedRule.allowed_subdomains.join(', ')}
                                        </Text>
                                    )}
                            </Box>
                        )}
                    </Box>
                )}
            </Box>

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
                        {STATUS_TABS.map((tab) => (
                            <Button
                                key={tab.key}
                                size="xs"
                                h="28px"
                                px={3}
                                borderRadius="999px"
                                bg={statusFilter === tab.key ? 'var(--waba-ink)' : 'var(--waba-surface)'}
                                color={statusFilter === tab.key ? 'var(--waba-bg)' : 'var(--waba-ink-2)'}
                                border="1px solid"
                                borderColor={statusFilter === tab.key ? 'var(--waba-ink)' : 'var(--waba-line)'}
                                fontSize="11.5px"
                                fontWeight="700"
                                onClick={() => setStatusFilter(tab.key)}
                            >
                                {tab.label}
                            </Button>
                        ))}
                    </HStack>

                    <HStack gap={2} flexWrap="wrap">
                        <Input
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    setSearchQuery(searchInput.trim());
                                }
                            }}
                            placeholder="쇼핑몰명 또는 도메인 검색..."
                            size="sm"
                            w={{ base: '200px', md: '250px' }}
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
                    </HStack>
                </Flex>
            </Box>

            {/* Domains Table */}
            {loading ? (
                <Flex py={20} justify="center">
                    <Spinner size="lg" color="#6338A9" />
                </Flex>
            ) : domains.length === 0 ? (
                <Box p={12} textAlign="center" borderRadius="20px" bg="var(--waba-card)" border="1px solid" borderColor="var(--waba-line)">
                    <Text color="var(--waba-ink-3)" fontSize="14px">
                        조건에 해당하는 제휴 도메인이 없습니다.
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
                                {['상태', '쇼핑몰명', '허용 도메인', '서브도메인 정책', '등록일 / 수정일', '액션'].map((col) => (
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
                            {domains.map((item) => {
                                const policy = String(item.subdomain_policy || 'ALL').toUpperCase();
                                const subs: string[] = Array.isArray(item.allowed_subdomains) ? item.allowed_subdomains : [];

                                return (
                                    <Box
                                        as="tr"
                                        key={item.id}
                                        borderBottom="1px solid"
                                        borderColor="var(--waba-line)"
                                        _last={{ borderBottom: 'none' }}
                                        _hover={{ bg: 'var(--waba-surface)' }}
                                    >
                                        {/* 상태 */}
                                        <Box as="td" px={4} py={3.5} verticalAlign="middle" whiteSpace="nowrap">
                                            <Box
                                                display="inline-block"
                                                bg={item.is_active ? 'rgba(16, 185, 129, 0.14)' : 'rgba(239, 68, 68, 0.14)'}
                                                color={item.is_active ? '#10B981' : '#EF4444'}
                                                fontSize="10.5px"
                                                fontWeight="800"
                                                px={2.5}
                                                py={0.5}
                                                borderRadius="999px"
                                            >
                                                {item.is_active ? '활성' : '비활성'}
                                            </Box>
                                        </Box>

                                        {/* 쇼핑몰명 */}
                                        <Box as="td" px={4} py={3.5} verticalAlign="middle" whiteSpace="nowrap">
                                            <Text fontSize="13.5px" fontWeight="800" color="var(--waba-ink)">
                                                {item.mall_name || '-'}
                                            </Text>
                                        </Box>

                                        {/* 허용 도메인 */}
                                        <Box as="td" px={4} py={3.5} verticalAlign="middle" whiteSpace="nowrap">
                                            <Box
                                                display="inline-block"
                                                bg="var(--waba-surface)"
                                                color="var(--waba-ink)"
                                                border="1px solid"
                                                borderColor="var(--waba-line)"
                                                fontSize="11.5px"
                                                fontWeight="700"
                                                fontFamily="mono"
                                                px={2.5}
                                                py={0.5}
                                                borderRadius="999px"
                                            >
                                                {item.domain}
                                            </Box>
                                        </Box>

                                        {/* 서브도메인 정책 */}
                                        <Box as="td" px={4} py={3.5} verticalAlign="middle">
                                            {policy === 'ALL' ? (
                                                <Box
                                                    display="inline-block"
                                                    bg="var(--waba-purple-soft)"
                                                    color="var(--waba-purple-text)"
                                                    border="1px solid"
                                                    borderColor="var(--waba-purple-border)"
                                                    fontSize="10.5px"
                                                    fontWeight="800"
                                                    px={2.5}
                                                    py={0.5}
                                                    borderRadius="999px"
                                                >
                                                    전체 허용 (*.{item.domain})
                                                </Box>
                                            ) : policy === 'SPECIFIC' ? (
                                                <HStack gap={1.5} flexWrap="wrap">
                                                    <Box
                                                        bg="rgba(245, 158, 11, 0.14)"
                                                        color="#D97706"
                                                        fontSize="10.5px"
                                                        fontWeight="800"
                                                        px={2.5}
                                                        py={0.5}
                                                        borderRadius="999px"
                                                    >
                                                        지정만 허용
                                                    </Box>
                                                    {subs.map((sub) => (
                                                        <Box
                                                            key={sub}
                                                            bg="var(--waba-surface)"
                                                            color="var(--waba-ink-2)"
                                                            border="1px solid"
                                                            borderColor="var(--waba-line)"
                                                            fontSize="10.5px"
                                                            fontWeight="700"
                                                            fontFamily="mono"
                                                            px={2}
                                                            py="1px"
                                                            borderRadius="999px"
                                                        >
                                                            {sub}.{item.domain}
                                                        </Box>
                                                    ))}
                                                </HStack>
                                            ) : (
                                                <Box
                                                    display="inline-block"
                                                    bg="var(--waba-surface)"
                                                    color="var(--waba-ink-3)"
                                                    border="1px solid"
                                                    borderColor="var(--waba-line)"
                                                    fontSize="10.5px"
                                                    fontWeight="700"
                                                    px={2.5}
                                                    py={0.5}
                                                    borderRadius="999px"
                                                >
                                                    서브도메인 불허 (루트만)
                                                </Box>
                                            )}
                                        </Box>

                                        {/* 등록일 / 수정일 */}
                                        <Box as="td" px={4} py={3.5} verticalAlign="middle" whiteSpace="nowrap">
                                            <Text fontSize="11.5px" color="var(--waba-ink-3)">
                                                등록 {formatDateShort(item.created_at)} · 수정 {formatDateShort(item.updated_at)}
                                            </Text>
                                        </Box>

                                        {/* 액션 */}
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
                                                    setDialogMode('edit');
                                                    setSelectedDomain(item);
                                                    setDialogOpen(true);
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

            <AffiliateDomainFormDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                mode={dialogMode}
                domainItem={selectedDomain}
                onSaved={fetchDomains}
            />
        </Box>
    );
}
