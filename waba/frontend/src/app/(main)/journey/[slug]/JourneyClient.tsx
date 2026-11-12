'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
    Avatar,
    Badge,
    Box,
    Button,
    Container,
    Flex,
    Heading,
    HStack,
    IconButton,
    Separator,
    Spinner,
    Text,
    VStack,
} from '@chakra-ui/react';
import {
    Activity,
    Calendar,
    ChevronLeft,
    Clock,
    ExternalLink,
    Heart,
    Layers,
    Share2,
    ShieldCheck,
    Sparkles,
    Stethoscope,
    Syringe,
    ArrowLeft,
    Check,
} from 'lucide-react';
import axiosInstance from '@/utils/api';
import { toaster } from '@/components/ui/toaster';

interface LinkedPost {
    id: string;
    title: string;
    thumbnail_url?: string;
    board_name?: string;
    created_at?: string;
}

interface JourneyHistoryItem {
    id: string;
    category: string;
    date: string;
    title: string;
    description?: string;
    hospital_name?: string;
    weight_kg?: number | null;
    posts?: LinkedPost[];
}

interface PublicJourneyData {
    id: number | string;
    title: string;
    description?: string;
    start_date: string;
    end_date?: string | null;
    is_ongoing: boolean | number;
    share_slug: string;
    created_at?: string;
    pet: {
        id: string;
        name: string;
        species: string;
        breed?: string;
        birth_date?: string;
        is_birth_estimated?: boolean;
        current_avatar_url?: string;
        latest_weight_kg?: number | null;
    };
    author: {
        id: string;
        nickname: string;
        avatar_url?: string;
    };
    histories: JourneyHistoryItem[];
    cheer_count?: number;
}

const CATEGORY_STYLE: Record<string, { label: string; icon: any; color: string; bg: string }> = {
    SURGERY: { label: '수술 · 치료', icon: Activity, color: '#7B5CFA', bg: '#F3EFFF' },
    VACCINE: { label: '예방접종', icon: Syringe, color: '#0EA5E9', bg: '#E0F2FE' },
    CHECKUP: { label: '정기검진', icon: Stethoscope, color: '#10B981', bg: '#D1FAE5' },
    WEIGHT: { label: '체중 측정', icon: Sparkles, color: '#F59E0B', bg: '#FEF3C7' },
    EVENT: { label: '생애 이벤트', icon: Calendar, color: '#EC4899', bg: '#FCE7F3' },
    OTHER: { label: '기타 기록', icon: Clock, color: '#6E6E78', bg: '#F4F4F6' },
};

export default function JourneyClient({ slug }: { slug: string }) {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [journey, setJourney] = useState<PublicJourneyData | null>(null);
    const [cheers, setCheers] = useState(128);
    const [hasCheered, setHasCheered] = useState(false);
    const [copied, setCopied] = useState(false);

    // 실제 진료 일자(date) 기준 최신순(내림차순) 정렬된 타임라인
    const sortedHistories = useMemo(() => {
        if (!journey?.histories) return [];
        return [...journey.histories].sort((a, b) => {
            const timeA = new Date(a.date).getTime();
            const timeB = new Date(b.date).getTime();
            if (timeB !== timeA) return timeB - timeA;
            return String(b.id).localeCompare(String(a.id));
        });
    }, [journey?.histories]);

    useEffect(() => {
        let isMounted = true;

        const fetchJourney = async () => {
            try {
                // 1. 공용 API 호출 시도
                const res = await axiosInstance.get(`/public/journey/${slug}`);
                const raw = res?.data?.journey || res?.data;
                if (raw && isMounted) {
                    const normalized: PublicJourneyData = {
                        id: raw.id,
                        title: raw.title,
                        description: raw.description,
                        start_date: raw.start_date ? String(raw.start_date).slice(0, 10) : '',
                        end_date: raw.end_date ? String(raw.end_date).slice(0, 10) : null,
                        is_ongoing: Boolean(raw.is_ongoing),
                        share_slug: raw.share_slug || slug,
                        created_at: raw.created_at,
                        cheer_count: raw.cheer_count || 128,
                        pet: {
                            id: raw.pet?.id || '',
                            name: raw.pet?.name || '반려동물',
                            species: raw.pet?.species || 'DOG',
                            breed: raw.pet?.breed || '',
                            birth_date: raw.pet?.birth_date,
                            is_birth_estimated: raw.pet?.is_birth_estimated,
                            current_avatar_url: raw.pet?.current_avatar_url,
                            latest_weight_kg: raw.pet?.latest_weight_kg,
                        },
                        author: {
                            id: raw.author?.id || raw.user?.id || '',
                            nickname: raw.author?.nickname || raw.user?.nickname || '집사',
                            avatar_url: raw.author?.avatar_url || raw.user?.avatar_url,
                        },
                        histories: (raw.histories || []).map((h: any) => ({
                            id: String(h.id),
                            category: h.category || 'OTHER',
                            date: h.date || h.event_date || (h.created_at ? String(h.created_at).slice(0, 10) : ''),
                            title: h.title,
                            description: h.description || h.notes || '',
                            hospital_name: h.hospital_name || '',
                            weight_kg: h.weight_kg !== undefined ? h.weight_kg : null,
                            posts: h.posts || [],
                        })),
                    };
                    setJourney(normalized);
                    setCheers(normalized.cheer_count || 128);
                    setLoading(false);
                    return;
                }
            } catch (err: any) {
                console.warn('Failed to fetch public journey from DB:', err);
            }

            if (isMounted) {
                setJourney(null);
                setLoading(false);
            }
        };

        fetchJourney();
        return () => {
            isMounted = false;
        };
    }, [slug]);

    // D-Day 계산
    const calculateDays = (startDate: string) => {
        const start = new Date(startDate);
        const now = new Date();
        const diff = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        return Math.max(1, diff);
    };

    // 링크 복사 핸들러
    const handleShare = () => {
        const url = typeof window !== 'undefined' ? window.location.href : `https://waba.kr/journey/${slug}`;
        if (navigator.share) {
            navigator.share({
                title: `${journey?.pet.name}의 치료기 - ${journey?.title}`,
                text: journey?.description || `${journey?.pet.name}의 건강 & 치료 여정을 확인해 보세요.`,
                url,
            }).catch(() => null);
        } else if (navigator.clipboard) {
            navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
            toaster.create({
                title: '공유 링크가 복사되었습니다!',
                description: '클립보드에 링크가 복사되었습니다. 원하는 곳에 붙여넣어 공유하세요.',
                type: 'success',
            });
        }
    };

    // 응원하기 핸들러
    const handleCheer = () => {
        if (hasCheered) {
            toaster.create({ title: '이미 응원을 보내주셨습니다! 🤍', type: 'info' });
            return;
        }
        setCheers((prev) => prev + 1);
        setHasCheered(true);
        toaster.create({
            title: `따뜻한 응원이 ${journey?.pet.name}와 집사님께 전달되었습니다! 🐾`,
            type: 'success',
        });
    };

    if (loading) {
        return (
            <Box minH="100vh" bg="#FAFAFC" display="flex" alignItems="center" justifyContent="center">
                <VStack gap={3}>
                    <Spinner size="xl" color="waba.purple" />
                    <Text fontSize="13px" fontWeight="semibold" color="fg.subtle">
                        치료 여정을 불러오는 중입니다...
                    </Text>
                </VStack>
            </Box>
        );
    }

    if (!journey) {
        return (
            <Box minH="100vh" bg="#FAFAFC" display="flex" alignItems="center" justifyContent="center" p={4}>
                <VStack gap={4} maxW="400px" textAlign="center">
                    <Text fontSize="48px">🔍</Text>
                    <Heading fontSize="20px" fontWeight="800" color="charcoal">
                        치료기를 찾을 수 없습니다
                    </Heading>
                    <Text fontSize="13px" color="fg.subtle">
                        비공개 상태이거나 삭제된 치료기일 수 있습니다.
                    </Text>
                    <Button asChild bg="charcoal" color="white" rounded="full" px={6} size="sm">
                        <Link href="/">WABA 홈으로 이동</Link>
                    </Button>
                </VStack>
            </Box>
        );
    }

    const isOngoing = Boolean(journey.is_ongoing);
    const dayCount = calculateDays(journey.start_date);

    return (
        <Box minH="100vh" bg="#FAFAFC" pb={24}>
            {/* 1. 상단 글로벌 네비게이션 헤더 */}
            <Box
                position="sticky"
                top={0}
                zIndex={40}
                bg="rgba(255, 255, 255, 0.85)"
                backdropFilter="blur(16px)"
                borderBottom="1px solid"
                borderColor="rgba(232, 232, 238, 0.8)"
            >
                <Container maxW="880px" px={{ base: 4, md: 6 }} py={3}>
                    <Flex align="center" justify="space-between">
                        <HStack gap={3}>
                            <Button
                                size="xs"
                                variant="ghost"
                                rounded="full"
                                color="fg.subtle"
                                _hover={{ bg: 'gray.100', color: 'charcoal' }}
                                onClick={() => router.push('/')}
                            >
                                <ArrowLeft size={16} style={{ marginRight: '4px' }} />
                                <span>WABA 홈</span>
                            </Button>
                            <Separator orientation="vertical" h="16px" borderColor="#E8E8EE" />
                            <HStack gap={1.5}>
                                <Box
                                    w="22px"
                                    h="22px"
                                    bg="waba.purple"
                                    rounded="lg"
                                    color="white"
                                    fontWeight="900"
                                    fontSize="12px"
                                    display="flex"
                                    alignItems="center"
                                    justifyContent="center"
                                >
                                    W
                                </Box>
                                <Text fontSize="14px" fontWeight="800" color="charcoal" letterSpacing="-0.02em">
                                    WABA
                                </Text>
                            </HStack>
                        </HStack>

                        <HStack gap={2}>
                            <Button
                                size="xs"
                                variant="outline"
                                rounded="full"
                                borderColor="#E8E8EE"
                                color="charcoal"
                                fontWeight="bold"
                                onClick={handleShare}
                                _hover={{ bg: 'gray.50' }}
                            >
                                {copied ? <Check size={13} style={{ marginRight: '4px' }} /> : <Share2 size={13} style={{ marginRight: '4px' }} />}
                                <span>{copied ? '복사됨' : '공유하기'}</span>
                            </Button>
                            <Button
                                asChild
                                size="xs"
                                bg="charcoal"
                                color="white"
                                rounded="full"
                                fontWeight="bold"
                                px={3.5}
                                _hover={{ bg: 'waba.purple' }}
                            >
                                <Link href="/member/join">수첩 시작하기</Link>
                            </Button>
                        </HStack>
                    </Flex>
                </Container>
            </Box>

            {/* 2. 메인 컨텐츠 영역 */}
            <Container maxW="880px" px={{ base: 4, md: 6 }} pt={{ base: 6, md: 10 }}>
                {/* 2-1. 치료기 히어로 카드 */}
                <Box
                    bg="white"
                    borderRadius="28px"
                    p={{ base: 6, md: 8 }}
                    border="1px solid"
                    borderColor="#E8E8EE"
                    boxShadow="0 15px 40px -10px rgba(26, 26, 30, 0.08)"
                    mb={8}
                >
                    {/* 상단 뱃지 & 공유 일자 */}
                    <Flex align="center" justify="space-between" flexWrap="wrap" gap={2} mb={4}>
                        <HStack gap={2}>
                            {isOngoing ? (
                                <Badge
                                    bg="waba.purpleLight"
                                    color="waba.purple"
                                    rounded="full"
                                    px={3}
                                    py={1}
                                    fontSize="12px"
                                    fontWeight="800"
                                    display="inline-flex"
                                    alignItems="center"
                                    gap={1.5}
                                >
                                    <Box w="6px" h="6px" rounded="full" bg="waba.purple" />
                                    <span>현재 치료 진행 중 · D+{dayCount}일 차</span>
                                </Badge>
                            ) : (
                                <Badge
                                    bg="#E6F4EA"
                                    color="#137333"
                                    rounded="full"
                                    px={3}
                                    py={1}
                                    fontSize="12px"
                                    fontWeight="800"
                                    display="inline-flex"
                                    alignItems="center"
                                    gap={1.5}
                                >
                                    <ShieldCheck size={14} />
                                    <span>치료 완료 (완치)</span>
                                </Badge>
                            )}

                            <Badge bg="#F4F4F6" color="#6E6E78" rounded="full" px={2.5} py={1} fontSize="11px" fontWeight="700">
                                공개 치료기
                            </Badge>
                        </HStack>

                        <Text fontSize="12px" color="fg.subtle">
                            시작일: {journey.start_date} {journey.end_date ? `~ ${journey.end_date}` : ''}
                        </Text>
                    </Flex>

                    {/* 치료기 제목 */}
                    <Heading fontSize={{ base: '20px', md: '26px' }} fontWeight="900" color="charcoal" letterSpacing="-0.03em" lineHeight="1.3" mb={3}>
                        {journey.title}
                    </Heading>

                    {/* 치료기 설명 */}
                    {journey.description && (
                        <Text fontSize="14px" color="#4A4A54" lineHeight="1.7" mb={6} whiteSpace="pre-line">
                            {journey.description}
                        </Text>
                    )}

                    <Separator borderColor="#F0F0F4" my={5} />

                    {/* 펫 & 보호자 프로필 요약 카드 */}
                    <Flex
                        align="center"
                        justify="space-between"
                        flexWrap="wrap"
                        gap={4}
                        bg="#F8F8FA"
                        p={4}
                        rounded="2xl"
                        border="1px solid"
                        borderColor="#E8E8EE"
                    >
                        <HStack gap={3.5}>
                            <Avatar.Root size="lg" borderRadius="full" border="2px solid white" shadow="sm">
                                {journey.pet.current_avatar_url ? (
                                    <Avatar.Image src={journey.pet.current_avatar_url} alt={journey.pet.name} />
                                ) : (
                                    <Avatar.Fallback>{journey.pet.name.charAt(0)}</Avatar.Fallback>
                                )}
                            </Avatar.Root>
                            <Box>
                                <HStack gap={2}>
                                    <Text fontSize="16px" fontWeight="800" color="charcoal">
                                        {journey.pet.name}
                                    </Text>
                                    <Badge bg="white" color="#6E6E78" rounded="full" px={2} py={0.5} fontSize="11px" fontWeight="700" border="1px solid" borderColor="#E8E8EE">
                                        {journey.pet.breed || journey.pet.species}
                                    </Badge>
                                </HStack>
                                <Text fontSize="12px" color="fg.subtle" mt={0.5}>
                                    보호자: <strong>{journey.author.nickname}</strong> · 최근 체중: {journey.pet.latest_weight_kg ? `${journey.pet.latest_weight_kg}kg` : '-'}
                                </Text>
                            </Box>
                        </HStack>

                        {/* 통계 요약 뱃지 */}
                        <HStack gap={3}>
                            <Box textAlign="center" bg="white" px={3.5} py={2} rounded="xl" border="1px solid" borderColor="#E8E8EE">
                                <Text fontSize="10px" fontWeight="bold" color="fg.subtle">누적 기록</Text>
                                <Text fontSize="15px" fontWeight="900" color="charcoal">{journey.histories.length}건</Text>
                            </Box>
                            <Box textAlign="center" bg="white" px={3.5} py={2} rounded="xl" border="1px solid" borderColor="#E8E8EE">
                                <Text fontSize="10px" fontWeight="bold" color="fg.subtle">따뜻한 응원</Text>
                                <Text fontSize="15px" fontWeight="900" color="waba.purple">{cheers}</Text>
                            </Box>
                        </HStack>
                    </Flex>
                </Box>

                {/* 2-2. 타임라인 섹션 헤더 */}
                <Flex align="center" justify="space-between" mb={5} px={2}>
                    <HStack gap={2}>
                        <Layers size={18} color="#7B5CFA" />
                        <Heading fontSize="18px" fontWeight="800" color="charcoal">
                            치료 및 회복 타임라인
                        </Heading>
                    </HStack>
                    <Text fontSize="12px" color="fg.subtle">
                        최신순 정렬
                    </Text>
                </Flex>

                {/* 2-3. 타임라인 목록 */}
                <Box position="relative" pl={{ base: 4, md: 6 }} ml={{ base: 2, md: 4 }} borderLeft="2px solid" borderColor="#E8E8EE" mb={12}>
                    <VStack gap={6} align="stretch">
                        {sortedHistories.map((item, idx) => {
                            const cat = CATEGORY_STYLE[item.category] || CATEGORY_STYLE.OTHER;
                            const IconComponent = cat.icon;

                            return (
                                <Box key={item.id || idx} position="relative">
                                    {/* 타임라인 마디 점 */}
                                    <Box
                                        position="absolute"
                                        left={{ base: '-23px', md: '-31px' }}
                                        top="18px"
                                        w="14px"
                                        h="14px"
                                        rounded="full"
                                        bg={idx === 0 ? 'waba.purple' : 'white'}
                                        border="3px solid"
                                        borderColor={idx === 0 ? 'waba.purpleLight' : '#C4C4CC'}
                                        boxShadow="0 0 0 2px white"
                                    />

                                    {/* 기록 카드 */}
                                    <Box
                                        bg="white"
                                        borderRadius="24px"
                                        p={{ base: 5, md: 6 }}
                                        border="1px solid"
                                        borderColor="#E8E8EE"
                                        boxShadow="0 4px 20px -2px rgba(26, 26, 30, 0.04)"
                                        transition="all 0.2s"
                                        _hover={{ shadow: '0 8px 25px -4px rgba(26, 26, 30, 0.08)' }}
                                    >
                                        {/* 카드 헤더: 일자, 카테고리, 체중 */}
                                        <Flex align="center" justify="space-between" flexWrap="wrap" gap={2} mb={2.5}>
                                            <HStack gap={2}>
                                                <Text fontSize="14px" fontWeight="800" color="charcoal">
                                                    {item.date}
                                                </Text>
                                                <Badge
                                                    bg={cat.bg}
                                                    color={cat.color}
                                                    rounded="full"
                                                    px={2.5}
                                                    py={0.5}
                                                    fontSize="11px"
                                                    fontWeight="700"
                                                    display="inline-flex"
                                                    alignItems="center"
                                                    gap={1}
                                                >
                                                    <IconComponent size={12} />
                                                    <span>{cat.label}</span>
                                                </Badge>
                                            </HStack>

                                            {item.weight_kg !== null && item.weight_kg !== undefined && (
                                                <Badge bg="#F4F4F6" color="#6E6E78" rounded="full" px={2} py={0.5} fontSize="11px" fontWeight="700">
                                                    체중 {item.weight_kg}kg
                                                </Badge>
                                            )}
                                        </Flex>

                                        {/* 기록 타이틀 */}
                                        <Text fontSize="15px" fontWeight="800" color="charcoal" mb={1.5} lineHeight="1.4">
                                            {item.title}
                                        </Text>

                                        {/* 기록 상세 설명 */}
                                        {item.description && (
                                            <Text fontSize="13px" color="#5A5A66" lineHeight="1.6" mb={3} whiteSpace="pre-line">
                                                {item.description}
                                            </Text>
                                        )}

                                        {/* 병원명 태그 */}
                                        {item.hospital_name && (
                                            <Text fontSize="11px" color="fg.subtle" fontWeight="medium" mb={3}>
                                                🏥 {item.hospital_name}
                                            </Text>
                                        )}

                                        {/* 연결된 커뮤니티 룩북 포스트 카드 (인라인) */}
                                        {item.posts && item.posts.length > 0 && (
                                            <Box mt={3} pt={3} borderTop="1px solid" borderColor="#F4F4F6">
                                                <Text fontSize="11px" fontWeight="bold" color="fg.subtle" mb={2}>
                                                    📎 연결된 집사의 커뮤니티 글
                                                </Text>
                                                <VStack gap={2} align="stretch">
                                                    {item.posts.map((post) => (
                                                        <Link key={post.id} href={`/post/${post.id}`} target="_blank" rel="noopener noreferrer">
                                                            <Flex
                                                                p={2.5}
                                                                rounded="xl"
                                                                bg="#F9F9FB"
                                                                border="1px solid"
                                                                borderColor="#E8E8EE"
                                                                align="center"
                                                                justify="space-between"
                                                                gap={3}
                                                                transition="all 0.2s"
                                                                _hover={{ bg: 'waba.purpleLight', borderColor: 'waba.purple' }}
                                                            >
                                                                <HStack gap={3} flex={1} minW={0}>
                                                                    {post.thumbnail_url ? (
                                                                        <Box w="40px" h="40px" rounded="lg" overflow="hidden" flexShrink={0} bg="gray.100">
                                                                            <img src={post.thumbnail_url} alt="" className="w-full h-full object-cover" />
                                                                        </Box>
                                                                    ) : (
                                                                        <Box w="40px" h="40px" rounded="lg" bg="gray.100" display="flex" alignItems="center" justifyContent="center" flexShrink={0} color="gray.400">
                                                                            <Layers size={18} />
                                                                        </Box>
                                                                    )}
                                                                    <Box flex={1} minW={0}>
                                                                        <Text fontSize="12px" fontWeight="bold" color="charcoal" truncate>
                                                                            {post.title}
                                                                        </Text>
                                                                        <HStack gap={1.5} mt={0.5}>
                                                                            {post.board_name && (
                                                                                <Badge size="xs" fontSize="9px" px={1.5} py={0} bg="white" color="fg.subtle" border="1px solid" borderColor="#E8E8EE">
                                                                                    {post.board_name}
                                                                                </Badge>
                                                                            )}
                                                                            <Text fontSize="10px" color="fg.subtle">
                                                                                커뮤니티 글 바로가기
                                                                            </Text>
                                                                        </HStack>
                                                                    </Box>
                                                                </HStack>
                                                                <ExternalLink size={14} color="#9E9EA8" />
                                                            </Flex>
                                                        </Link>
                                                    ))}
                                                </VStack>
                                            </Box>
                                        )}
                                    </Box>
                                </Box>
                            );
                        })}
                    </VStack>
                </Box>

                {/* 2-4. 응원하기 인터랙션 & 응원 배너 */}
                <Box
                    bg="white"
                    borderRadius="28px"
                    p={{ base: 6, md: 8 }}
                    border="1px solid"
                    borderColor="#E8E8EE"
                    textAlign="center"
                    boxShadow="0 15px 40px -10px rgba(26, 26, 30, 0.08)"
                    mb={8}
                >
                    <VStack gap={4} maxW="480px" mx="auto">
                        <Box
                            w="56px"
                            h="56px"
                            rounded="full"
                            bg={hasCheered ? 'waba.purple' : 'waba.purpleLight'}
                            color={hasCheered ? 'white' : 'waba.purple'}
                            display="flex"
                            alignItems="center"
                            justifyContent="center"
                            shadow="md"
                            transition="all 0.3s"
                        >
                            <Heart size={28} fill={hasCheered ? 'white' : '#7B5CFA'} />
                        </Box>

                        <Box>
                            <Heading fontSize="18px" fontWeight="900" color="charcoal" mb={1}>
                                {journey.pet.name}의 건강한 회복을 응원해 주세요!
                            </Heading>
                            <Text fontSize="13px" color="fg.subtle" lineHeight="relaxed">
                                같은 증상과 치료를 겪는 수많은 반려동물과 집사님들에게 소중한 나눔과 용기가 됩니다.
                            </Text>
                        </Box>

                        <Button
                            size="lg"
                            bg={hasCheered ? '#4CAF50' : 'waba.purple'}
                            color="white"
                            rounded="full"
                            px={8}
                            fontWeight="bold"
                            fontSize="15px"
                            shadow="lg"
                            onClick={handleCheer}
                            _hover={{ bg: hasCheered ? '#43A047' : '#6845E8' }}
                            display="flex"
                            alignItems="center"
                            gap={2}
                        >
                            <Heart size={18} fill="white" />
                            <span>{hasCheered ? '응원 완료!' : '따뜻한 응원 보내기'}</span>
                            <Badge ml={1} bg="whiteAlpha.300" color="white" rounded="full" px={2} py={0.5} fontSize="12px">
                                {cheers}
                            </Badge>
                        </Button>
                    </VStack>
                </Box>

                {/* 2-5. WABA 서비스 안내 CTA 배너 */}
                <Box
                    bg="#1A1A1E"
                    color="white"
                    borderRadius="28px"
                    p={{ base: 6, md: 8 }}
                    position="relative"
                    overflow="hidden"
                >
                    <Flex
                        direction={{ base: 'column', md: 'row' }}
                        align={{ base: 'flex-start', md: 'center' }}
                        justify="space-between"
                        gap={4}
                    >
                        <Box>
                            <HStack gap={2} mb={1}>
                                <Sparkles size={16} color="#A78BFA" />
                                <Text fontSize="12px" fontWeight="bold" color="#A78BFA">
                                    WABA 펫 건강 수첩
                                </Text>
                            </HStack>
                            <Heading fontSize={{ base: '18px', md: '20px' }} fontWeight="900" mb={1}>
                                우리 아이의 모든 치료와 건강 여정을 무료로 기록하세요
                            </Heading>
                            <Text fontSize="13px" color="rgba(255, 255, 255, 0.7)">
                                복잡한 입력 없이 간편하게, 필요한 순간 이웃과 안심하고 공유할 수 있습니다.
                            </Text>
                        </Box>

                        <Button
                            asChild
                            bg="waba.purple"
                            color="white"
                            rounded="full"
                            px={6}
                            size="md"
                            fontWeight="bold"
                            _hover={{ bg: '#6845E8' }}
                            flexShrink={0}
                        >
                            <Link href="/member/join">지금 시작하기</Link>
                        </Button>
                    </Flex>
                </Box>
            </Container>
        </Box>
    );
}
