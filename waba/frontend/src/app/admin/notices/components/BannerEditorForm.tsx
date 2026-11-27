'use client'

import React, { useEffect, useRef, useState } from 'react';
import {
    Box,
    Button,
    Flex,
    Grid,
    Heading,
    HStack,
    IconButton,
    Image,
    Input,
    Spinner,
    Switch,
    Text,
    VStack,
} from '@chakra-ui/react';
import {
    LuArrowDown,
    LuArrowLeft,
    LuArrowUp,
    LuCopy,
    LuPlus,
    LuTrash2,
    LuUpload,
} from 'react-icons/lu';
import { useRouter } from 'next/navigation';
import axiosInstance from '@/utils/api';
import { toaster } from '@/components/ui/toaster';
import {
    AdminBannerItem,
    BannerType,
    DisplayStatus,
    fromDatetimeLocal,
    resolveMediaUrl,
    toDatetimeLocal,
} from '../types';

type DeviceTab = 'common' | 'pc' | 'tablet' | 'mobile';

interface BannerEditorFormProps {
    mode: 'create' | 'edit';
    bannerId?: string;
}

function createEmptySlide(sortOrder: number): AdminBannerItem {
    return {
        localKey: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        sort_order: sortOrder,
        title: '',
        image_url: '',
        pc_image_url: '',
        tablet_image_url: '',
        mobile_image_url: '',
        link_url: '',
        link_target: '_self',
        display_status: 'VISIBLE',
        start_at: null,
        end_at: null,
    };
}

export default function BannerEditorForm({ mode, bannerId }: BannerEditorFormProps) {
    const router = useRouter();
    const uploadInputRef = useRef<HTMLInputElement>(null);

    const [loading, setLoading] = useState(mode === 'edit');
    const [submitting, setSubmitting] = useState(false);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

    // Basic banner fields
    const [title, setTitle] = useState('');
    const [bannerKey, setBannerKey] = useState('');
    const [bannerType, setBannerType] = useState<BannerType>('SINGLE');
    const [autoplayEnabled, setAutoplayEnabled] = useState(true);
    const [autoplaySec, setAutoplaySec] = useState('4');
    const [showIndicators, setShowIndicators] = useState(true);

    // Overall banner status & period
    const [displayStatus, setDisplayStatus] = useState<DisplayStatus>('VISIBLE');
    const [startAt, setStartAt] = useState('');
    const [endAt, setEndAt] = useState('');
    const [noEndDate, setNoEndDate] = useState(true);

    // Stats (edit mode)
    const [totalClicks, setTotalClicks] = useState(0);

    // Slides
    const [slides, setSlides] = useState<AdminBannerItem[]>([createEmptySlide(1)]);
    const [deviceTabBySlide, setDeviceTabBySlide] = useState<Record<number, DeviceTab>>({});
    const [uploadTarget, setUploadTarget] = useState<{ index: number; device: DeviceTab } | null>(null);
    const [uploadingIdx, setUploadingIdx] = useState<number | null>(null);

    useEffect(() => {
        if (mode !== 'edit' || !bannerId) return;
        setLoading(true);
        axiosInstance
            .get(`/admin/banners/${bannerId}`)
            .then((res) => {
                const b = res.data?.banner || res.data;
                if (!b) return;
                setTitle(b.title || '');
                setBannerKey(b.banner_key || '');
                setBannerType((b.banner_type as BannerType) || 'SINGLE');
                setAutoplayEnabled(b.autoplay_enabled === undefined ? true : Boolean(b.autoplay_enabled));
                setAutoplaySec(String(Math.max(1, Math.round(Number(b.autoplay_interval_ms || 4000) / 1000))));
                setShowIndicators(b.show_indicators === undefined ? true : Boolean(b.show_indicators));
                setDisplayStatus(b.display_status || 'VISIBLE');
                setStartAt(toDatetimeLocal(b.start_at));
                setEndAt(toDatetimeLocal(b.end_at));
                setNoEndDate(!b.end_at);
                setTotalClicks(Number(b.click_count ?? 0));

                const rawItems: AdminBannerItem[] = Array.isArray(res.data?.items)
                    ? res.data.items
                    : Array.isArray(b.items)
                        ? b.items
                        : [];
                if (rawItems.length > 0) {
                    setSlides(
                        rawItems.map((it, idx) => ({
                            ...it,
                            localKey: String(it.id || idx),
                            sort_order: it.sort_order ?? idx + 1,
                            link_target: it.link_target === '_blank' ? '_blank' : '_self',
                            display_status: it.display_status || 'VISIBLE',
                        }))
                    );
                }
            })
            .catch(() => {
                toaster.create({ title: '배너 정보를 불러오지 못했습니다.', type: 'error' });
            })
            .finally(() => setLoading(false));
    }, [mode, bannerId]);

    const handleAutoSlug = () => {
        const slug = title
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9\s_-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '');
        setBannerKey(slug || `banner-${Date.now().toString().slice(-5)}`);
    };

    const handleCopyCode = async () => {
        const code = `<WabaBanner bannerKey="${bannerKey.trim() || 'my-banner'}" />`;
        try {
            await navigator.clipboard.writeText(code);
            toaster.create({ title: '삽입 코드가 복사되었습니다.', type: 'success' });
        } catch {
            toaster.create({ title: '복사에 실패했습니다.', type: 'error' });
        }
    };

    const updateSlide = (idx: number, patch: Partial<AdminBannerItem>) => {
        setSlides((prev) => prev.map((s, i) => (i === idx ? { ...s, ...patch } : s)));
    };

    const handleTriggerUpload = (idx: number, device: DeviceTab) => {
        setUploadTarget({ index: idx, device });
        uploadInputRef.current?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !uploadTarget) return;
        const { index, device } = uploadTarget;
        setUploadingIdx(index);
        try {
            const fd = new FormData();
            fd.append('image', file);
            fd.append('category', 'banners');
            const res = await axiosInstance.post('/admin/marketing/upload-image', fd, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            const url = res.data?.url || res.data?.imageUrl || res.data?.image_url || '';
            if (url) {
                const fieldMap: Record<DeviceTab, keyof AdminBannerItem> = {
                    common: 'image_url',
                    pc: 'pc_image_url',
                    tablet: 'tablet_image_url',
                    mobile: 'mobile_image_url',
                };
                updateSlide(index, { [fieldMap[device]]: url });
                toaster.create({ title: '이미지가 업로드되었습니다.', type: 'success' });
            }
        } catch (err: any) {
            toaster.create({ title: err?.response?.data?.message || '이미지 업로드에 실패했습니다.', type: 'error' });
        } finally {
            setUploadingIdx(null);
            setUploadTarget(null);
            if (uploadInputRef.current) uploadInputRef.current.value = '';
        }
    };

    const handleMoveSlide = (idx: number, dir: 'up' | 'down') => {
        const target = dir === 'up' ? idx - 1 : idx + 1;
        if (target < 0 || target >= slides.length) return;
        const next = [...slides];
        const [moved] = next.splice(idx, 1);
        next.splice(target, 0, moved);
        setSlides(next.map((s, i) => ({ ...s, sort_order: i + 1 })));
    };

    const handleSave = async () => {
        if (!title.trim()) {
            toaster.create({ title: '배너명을 입력해주세요.', type: 'warning' });
            return;
        }
        const cleanKey = bannerKey.trim();
        if (!/^[a-z0-9_-]{2,60}$/.test(cleanKey)) {
            toaster.create({
                title: 'banner_key는 영문 소문자·숫자·-·_ 조합 2~60자로 입력해주세요.',
                type: 'warning',
            });
            return;
        }

        const effectiveSlides = bannerType === 'SINGLE' ? slides.slice(0, 1) : slides;
        const hasAnyImage = effectiveSlides.every(
            (s) => Boolean(s.image_url || s.pc_image_url || s.tablet_image_url || s.mobile_image_url)
        );
        if (!hasAnyImage) {
            toaster.create({ title: '모든 슬라이드에 최소 1개 이상의 이미지를 등록해주세요.', type: 'warning' });
            return;
        }

        const payload = {
            title: title.trim(),
            banner_key: cleanKey,
            banner_type: bannerType,
            autoplay_enabled: autoplayEnabled,
            autoplay_interval_ms: Math.max(1000, Number(autoplaySec || 4) * 1000),
            show_indicators: showIndicators,
            display_status: displayStatus,
            start_at: displayStatus === 'SCHEDULED' ? fromDatetimeLocal(startAt) : null,
            end_at: displayStatus === 'SCHEDULED' && !noEndDate ? fromDatetimeLocal(endAt) : null,
            items: effectiveSlides.map((s, idx) => ({
                id: s.id,
                sort_order: idx + 1,
                title: s.title || null,
                image_url: s.image_url || s.pc_image_url || null,
                pc_image_url: s.pc_image_url || null,
                tablet_image_url: s.tablet_image_url || null,
                mobile_image_url: s.mobile_image_url || null,
                link_url: s.link_url?.trim() || null,
                link_target: s.link_target === '_blank' ? '_blank' : '_self',
                display_status: bannerType === 'SINGLE' ? 'VISIBLE' : s.display_status,
                start_at:
                    bannerType !== 'SINGLE' && s.display_status === 'SCHEDULED' && s.start_at
                        ? fromDatetimeLocal(s.start_at) || s.start_at
                        : null,
                end_at:
                    bannerType !== 'SINGLE' && s.display_status === 'SCHEDULED' && s.end_at
                        ? fromDatetimeLocal(s.end_at) || s.end_at
                        : null,
            })),
        };

        setSubmitting(true);
        try {
            if (mode === 'create') {
                await axiosInstance.post('/admin/banners', payload);
                toaster.create({ title: '배너가 생성되었습니다.', type: 'success' });
            } else if (bannerId) {
                await axiosInstance.patch(`/admin/banners/${bannerId}`, payload);
                toaster.create({ title: '배너가 저장되었습니다.', type: 'success' });
            }
            router.push('/admin/notices?tab=banners');
        } catch (err: any) {
            toaster.create({ title: err?.response?.data?.message || '배너 저장에 실패했습니다.', type: 'error' });
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!bannerId) return;
        setSubmitting(true);
        try {
            await axiosInstance.delete(`/admin/banners/${bannerId}`);
            toaster.create({ title: '배너가 삭제되었습니다.', type: 'success' });
            router.push('/admin/notices?tab=banners');
        } catch (err: any) {
            toaster.create({ title: err?.response?.data?.message || '배너 삭제에 실패했습니다.', type: 'error' });
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <Flex py={24} justify="center">
                <Spinner size="lg" color="#6338A9" />
            </Flex>
        );
    }

    const visibleSlides = bannerType === 'SINGLE' ? slides.slice(0, 1) : slides;

    return (
        <Box maxW="1240px" mx="auto" px={{ base: 4, md: 6 }} py={6}>
            <input
                ref={uploadInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleFileChange}
            />

            {/* Top Breadcrumb & Actions */}
            <Flex justify="space-between" align={{ base: 'flex-start', md: 'center' }} direction={{ base: 'column', md: 'row' }} gap={3} mb={6}>
                <Box>
                    <Button
                        size="xs"
                        variant="ghost"
                        color="var(--waba-ink-2)"
                        px={0}
                        mb={1.5}
                        gap={1}
                        onClick={() => router.push('/admin/notices?tab=banners')}
                    >
                        <LuArrowLeft size={14} />
                        목록으로 돌아가기
                    </Button>
                    <Heading size="xl" fontWeight="800" color="var(--waba-ink)">
                        {mode === 'create' ? '새 배너 생성' : '배너 상세 관리'}
                    </Heading>
                </Box>

                <HStack gap={2} flexWrap="wrap">
                    {mode === 'edit' && (
                        deleteConfirmOpen ? (
                            <HStack gap={1.5}>
                                <Button
                                    size="sm"
                                    bg="#E53E3E"
                                    color="#FFFFFF"
                                    borderRadius="999px"
                                    px={4}
                                    loading={submitting}
                                    onClick={handleDelete}
                                >
                                    삭제 확정
                                </Button>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    color="var(--waba-ink-2)"
                                    onClick={() => setDeleteConfirmOpen(false)}
                                >
                                    취소
                                </Button>
                            </HStack>
                        ) : (
                            <Button
                                size="sm"
                                variant="outline"
                                borderColor="rgba(239, 68, 68, 0.4)"
                                color="#EF4444"
                                borderRadius="999px"
                                px={4}
                                gap={1}
                                onClick={() => setDeleteConfirmOpen(true)}
                            >
                                <LuTrash2 size={14} />
                                삭제
                            </Button>
                        )
                    )}
                    <Button
                        size="sm"
                        variant="outline"
                        borderColor="var(--waba-line)"
                        color="var(--waba-ink-2)"
                        borderRadius="999px"
                        px={4}
                        onClick={() => router.push('/admin/notices?tab=banners')}
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
                        저장하기
                    </Button>
                </HStack>
            </Flex>

            {/* 2-Column Layout */}
            <Grid templateColumns={{ base: '1fr', lg: '2fr 1fr' }} gap={5} alignItems="start">
                {/* Left: Main Config & Slides */}
                <VStack align="stretch" gap={5}>
                    {/* ① 배너 기본 설정 */}
                    <Box p={5} borderRadius="20px" bg="var(--waba-card)" border="1px solid" borderColor="var(--waba-line)">
                        <Text fontSize="14px" fontWeight="800" color="var(--waba-ink)" mb={4}>
                            ① 배너 기본 설정
                        </Text>

                        <VStack align="stretch" gap={4}>
                            <Grid templateColumns={{ base: '1fr', sm: '1fr 1fr' }} gap={3}>
                                <Box>
                                    <Text fontSize="12px" fontWeight="800" color="var(--waba-ink-2)" mb={1.5}>
                                        배너명 *
                                    </Text>
                                    <Input
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        placeholder="예: 메인 상단 웰컴 배너"
                                        size="sm"
                                        h="38px"
                                        borderRadius="12px"
                                        bg="var(--waba-surface)"
                                        borderColor="var(--waba-line)"
                                        color="var(--waba-ink)"
                                    />
                                </Box>
                                <Box>
                                    <Flex justify="space-between" align="center" mb={1.5}>
                                        <Text fontSize="12px" fontWeight="800" color="var(--waba-ink-2)">
                                            banner_key *
                                        </Text>
                                        <Button
                                            size="2xs"
                                            variant="ghost"
                                            color="var(--waba-purple-text)"
                                            onClick={handleAutoSlug}
                                        >
                                            자동 생성
                                        </Button>
                                    </Flex>
                                    <Input
                                        value={bannerKey}
                                        onChange={(e) => setBannerKey(e.target.value.toLowerCase())}
                                        placeholder="main-hero-banner"
                                        size="sm"
                                        h="38px"
                                        fontFamily="mono"
                                        borderRadius="12px"
                                        bg="var(--waba-surface)"
                                        borderColor="var(--waba-line)"
                                        color="var(--waba-ink)"
                                    />
                                    <Text fontSize="11px" color="var(--waba-ink-3)" mt={1}>
                                        영문 소문자/숫자/-/_
                                    </Text>
                                </Box>
                            </Grid>

                            <Box>
                                <Text fontSize="12px" fontWeight="800" color="var(--waba-ink-2)" mb={2}>
                                    배너 타입
                                </Text>
                                <HStack gap={2} flexWrap="wrap">
                                    {[
                                        { key: 'SINGLE' as BannerType, label: '단일 이미지' },
                                        { key: 'SWIPER' as BannerType, label: '스와이퍼' },
                                        { key: 'RANDOM' as BannerType, label: '랜덤' },
                                    ].map((opt) => (
                                        <Button
                                            key={opt.key}
                                            size="xs"
                                            h="32px"
                                            px={4}
                                            borderRadius="999px"
                                            bg={bannerType === opt.key ? '#6338A9' : 'var(--waba-surface)'}
                                            color={bannerType === opt.key ? '#FFFFFF' : 'var(--waba-ink-2)'}
                                            border="1px solid"
                                            borderColor={bannerType === opt.key ? '#6338A9' : 'var(--waba-line)'}
                                            fontWeight="700"
                                            onClick={() => setBannerType(opt.key)}
                                        >
                                            {opt.label}
                                        </Button>
                                    ))}
                                </HStack>
                                {bannerType === 'RANDOM' && (
                                    <Text fontSize="11.5px" color="var(--waba-purple-text)" mt={2} fontWeight="600">
                                        등록된 활성 이미지 중 접속 시 1장을 무작위로 노출합니다.
                                    </Text>
                                )}
                            </Box>

                            {bannerType === 'SWIPER' && (
                                <Flex
                                    p={3.5}
                                    borderRadius="14px"
                                    bg="var(--waba-surface)"
                                    border="1px solid"
                                    borderColor="var(--waba-line)"
                                    gap={4}
                                    flexWrap="wrap"
                                    align="center"
                                >
                                    <HStack gap={2}>
                                        <Text fontSize="12px" fontWeight="700" color="var(--waba-ink)">
                                            자동 재생
                                        </Text>
                                        <Switch.Root
                                            checked={autoplayEnabled}
                                            onCheckedChange={(e) => setAutoplayEnabled(e.checked)}
                                            colorPalette="purple"
                                        >
                                            <Switch.HiddenInput />
                                            <Switch.Control />
                                        </Switch.Root>
                                    </HStack>

                                    <HStack gap={2}>
                                        <Text fontSize="12px" fontWeight="700" color="var(--waba-ink)">
                                            전환 간격(초)
                                        </Text>
                                        <Input
                                            type="number"
                                            min={1}
                                            max={30}
                                            value={autoplaySec}
                                            onChange={(e) => setAutoplaySec(e.target.value)}
                                            w="64px"
                                            size="xs"
                                            h="30px"
                                            bg="var(--waba-card)"
                                            borderColor="var(--waba-line)"
                                            color="var(--waba-ink)"
                                        />
                                    </HStack>

                                    <HStack gap={2}>
                                        <Text fontSize="12px" fontWeight="700" color="var(--waba-ink)">
                                            인디케이터 표시
                                        </Text>
                                        <Switch.Root
                                            checked={showIndicators}
                                            onCheckedChange={(e) => setShowIndicators(e.checked)}
                                            colorPalette="purple"
                                        >
                                            <Switch.HiddenInput />
                                            <Switch.Control />
                                        </Switch.Root>
                                    </HStack>
                                </Flex>
                            )}
                        </VStack>
                    </Box>

                    {/* ② 이미지 슬라이드별 설정 */}
                    <Box p={5} borderRadius="20px" bg="var(--waba-card)" border="1px solid" borderColor="var(--waba-line)">
                        <Flex justify="space-between" align="center" mb={4} flexWrap="wrap" gap={2}>
                            <Text fontSize="14px" fontWeight="800" color="var(--waba-ink)">
                                ② 이미지 슬라이드별 설정 ({visibleSlides.length}장)
                            </Text>
                            {bannerType !== 'SINGLE' && (
                                <Button
                                    size="xs"
                                    h="30px"
                                    px={3.5}
                                    borderRadius="999px"
                                    bg="#6338A9"
                                    color="#FFFFFF"
                                    _hover={{ bg: '#522B8F' }}
                                    gap={1}
                                    onClick={() =>
                                        setSlides((prev) => [...prev, createEmptySlide(prev.length + 1)])
                                    }
                                >
                                    <LuPlus size={13} />
                                    이미지 슬라이드 추가
                                </Button>
                            )}
                        </Flex>

                        <VStack align="stretch" gap={4}>
                            {visibleSlides.map((slide, idx) => {
                                const activeDevice: DeviceTab = deviceTabBySlide[idx] || 'common';
                                const currentDeviceUrl =
                                    activeDevice === 'pc'
                                        ? slide.pc_image_url
                                        : activeDevice === 'tablet'
                                            ? slide.tablet_image_url
                                            : activeDevice === 'mobile'
                                                ? slide.mobile_image_url
                                                : slide.image_url;

                                return (
                                    <Box
                                        key={slide.localKey || idx}
                                        p={4}
                                        borderRadius="16px"
                                        bg="var(--waba-surface)"
                                        border="1px solid"
                                        borderColor="var(--waba-line)"
                                    >
                                        <Flex justify="space-between" align="center" mb={3} gap={2} flexWrap="wrap">
                                            <Text fontSize="13px" fontWeight="800" color="var(--waba-ink)">
                                                슬라이드 #{idx + 1}
                                            </Text>
                                            {bannerType !== 'SINGLE' && (
                                                <HStack gap={1.5}>
                                                    {bannerType === 'SWIPER' && (
                                                        <>
                                                            <IconButton
                                                                aria-label="위로"
                                                                size="2xs"
                                                                variant="outline"
                                                                borderColor="var(--waba-line)"
                                                                color="var(--waba-ink-2)"
                                                                rounded="full"
                                                                disabled={idx === 0}
                                                                onClick={() => handleMoveSlide(idx, 'up')}
                                                            >
                                                                <LuArrowUp size={12} />
                                                            </IconButton>
                                                            <IconButton
                                                                aria-label="아래로"
                                                                size="2xs"
                                                                variant="outline"
                                                                borderColor="var(--waba-line)"
                                                                color="var(--waba-ink-2)"
                                                                rounded="full"
                                                                disabled={idx === visibleSlides.length - 1}
                                                                onClick={() => handleMoveSlide(idx, 'down')}
                                                            >
                                                                <LuArrowDown size={12} />
                                                            </IconButton>
                                                        </>
                                                    )}
                                                    {visibleSlides.length > 1 && (
                                                        <IconButton
                                                            aria-label="삭제"
                                                            size="2xs"
                                                            variant="ghost"
                                                            color="#EF4444"
                                                            rounded="full"
                                                            onClick={() =>
                                                                setSlides((prev) => prev.filter((_, i) => i !== idx))
                                                            }
                                                        >
                                                            <LuTrash2 size={13} />
                                                        </IconButton>
                                                    )}
                                                </HStack>
                                            )}
                                        </Flex>

                                        {/* Device Image Tabs */}
                                        <Flex justify="space-between" align="center" mb={2.5} flexWrap="wrap" gap={2}>
                                            <HStack gap={1.5}>
                                                {[
                                                    { key: 'common' as DeviceTab, label: '공통(기본)' },
                                                    { key: 'pc' as DeviceTab, label: 'PC' },
                                                    { key: 'tablet' as DeviceTab, label: '태블릿' },
                                                    { key: 'mobile' as DeviceTab, label: '모바일' },
                                                ].map((d) => (
                                                    <Button
                                                        key={d.key}
                                                        size="2xs"
                                                        h="26px"
                                                        px={2.5}
                                                        borderRadius="999px"
                                                        bg={activeDevice === d.key ? 'var(--waba-ink)' : 'var(--waba-card)'}
                                                        color={activeDevice === d.key ? 'var(--waba-bg)' : 'var(--waba-ink-2)'}
                                                        border="1px solid"
                                                        borderColor={activeDevice === d.key ? 'var(--waba-ink)' : 'var(--waba-line)'}
                                                        fontWeight="700"
                                                        onClick={() =>
                                                            setDeviceTabBySlide((prev) => ({ ...prev, [idx]: d.key }))
                                                        }
                                                    >
                                                        {d.label}
                                                    </Button>
                                                ))}
                                            </HStack>
                                            <Text fontSize="10.5px" color="var(--waba-ink-3)">
                                                미등록 시 PC/공통 자동 폴백
                                            </Text>
                                        </Flex>

                                        {/* Upload & Preview */}
                                        <HStack gap={2} mb={2.5} flexWrap="wrap">
                                            <Button
                                                size="xs"
                                                variant="outline"
                                                borderColor="var(--waba-line)"
                                                color="var(--waba-ink)"
                                                borderRadius="999px"
                                                px={3.5}
                                                gap={1.5}
                                                loading={uploadingIdx === idx}
                                                onClick={() => handleTriggerUpload(idx, activeDevice)}
                                            >
                                                <LuUpload size={13} />
                                                이미지 업로드
                                            </Button>
                                            <Text fontSize="10.5px" color="var(--waba-purple-text)" fontWeight="700">
                                                WebP 자동 변환 · 최대 가로 1500px · 72 DPI
                                            </Text>
                                        </HStack>

                                        {currentDeviceUrl && (
                                            <Box mb={3} borderRadius="12px" overflow="hidden" border="1px solid" borderColor="var(--waba-line)" maxW="320px">
                                                <Image
                                                    src={resolveMediaUrl(currentDeviceUrl)}
                                                    alt={`슬라이드 ${idx + 1}`}
                                                    w="100%"
                                                    maxH="160px"
                                                    objectFit="cover"
                                                />
                                            </Box>
                                        )}

                                        {/* Link URL & Target */}
                                        <Flex gap={2} mb={bannerType !== 'SINGLE' ? 3 : 0} flexWrap={{ base: 'wrap', sm: 'nowrap' }}>
                                            <Input
                                                value={slide.link_url || ''}
                                                onChange={(e) => updateSlide(idx, { link_url: e.target.value })}
                                                placeholder="클릭 시 이동할 URL (예: /post/123 또는 https://...)"
                                                size="sm"
                                                h="34px"
                                                bg="var(--waba-card)"
                                                borderColor="var(--waba-line)"
                                                color="var(--waba-ink)"
                                            />
                                            <HStack gap={1} flexShrink={0}>
                                                {[
                                                    { key: '_self' as const, label: '현재창' },
                                                    { key: '_blank' as const, label: '새창' },
                                                ].map((t) => (
                                                    <Button
                                                        key={t.key}
                                                        size="xs"
                                                        h="34px"
                                                        px={3}
                                                        whiteSpace="nowrap"
                                                        borderRadius="999px"
                                                        bg={slide.link_target === t.key ? '#6338A9' : 'var(--waba-card)'}
                                                        color={slide.link_target === t.key ? '#FFFFFF' : 'var(--waba-ink-2)'}
                                                        border="1px solid"
                                                        borderColor={slide.link_target === t.key ? '#6338A9' : 'var(--waba-line)'}
                                                        fontWeight="700"
                                                        onClick={() => updateSlide(idx, { link_target: t.key })}
                                                    >
                                                        {t.label}
                                                    </Button>
                                                ))}
                                            </HStack>
                                        </Flex>

                                        {/* Per-slide display_status for SWIPER / RANDOM */}
                                        {bannerType !== 'SINGLE' && (
                                            <Box pt={3} borderTop="1px solid" borderColor="var(--waba-line)">
                                                <HStack gap={1.5} mb={slide.display_status === 'SCHEDULED' ? 2.5 : 0} flexWrap="wrap">
                                                    <Text fontSize="11.5px" fontWeight="700" color="var(--waba-ink-2)" mr={1}>
                                                        슬라이드 노출:
                                                    </Text>
                                                    {[
                                                        { key: 'VISIBLE' as DisplayStatus, label: '노출' },
                                                        { key: 'HIDDEN' as DisplayStatus, label: '미노출' },
                                                        { key: 'SCHEDULED' as DisplayStatus, label: '기간 설정' },
                                                    ].map((st) => (
                                                        <Button
                                                            key={st.key}
                                                            size="2xs"
                                                            h="26px"
                                                            px={2.5}
                                                            borderRadius="999px"
                                                            bg={slide.display_status === st.key ? '#6338A9' : 'var(--waba-card)'}
                                                            color={slide.display_status === st.key ? '#FFFFFF' : 'var(--waba-ink-2)'}
                                                            border="1px solid"
                                                            borderColor={slide.display_status === st.key ? '#6338A9' : 'var(--waba-line)'}
                                                            fontWeight="700"
                                                            onClick={() => updateSlide(idx, { display_status: st.key })}
                                                        >
                                                            {st.label}
                                                        </Button>
                                                    ))}
                                                </HStack>

                                                {slide.display_status === 'SCHEDULED' && (
                                                    <Grid templateColumns={{ base: '1fr', sm: '1fr 1fr' }} gap={2}>
                                                        <Input
                                                            type="datetime-local"
                                                            value={toDatetimeLocal(slide.start_at)}
                                                            onChange={(e) =>
                                                                updateSlide(idx, { start_at: fromDatetimeLocal(e.target.value) })
                                                            }
                                                            size="xs"
                                                            h="32px"
                                                            bg="var(--waba-card)"
                                                            borderColor="var(--waba-line)"
                                                            color="var(--waba-ink)"
                                                        />
                                                        <Input
                                                            type="datetime-local"
                                                            value={toDatetimeLocal(slide.end_at)}
                                                            onChange={(e) =>
                                                                updateSlide(idx, { end_at: fromDatetimeLocal(e.target.value) })
                                                            }
                                                            size="xs"
                                                            h="32px"
                                                            bg="var(--waba-card)"
                                                            borderColor="var(--waba-line)"
                                                            color="var(--waba-ink)"
                                                        />
                                                    </Grid>
                                                )}
                                            </Box>
                                        )}
                                    </Box>
                                );
                            })}
                        </VStack>
                    </Box>
                </VStack>

                {/* Right: Sidebar */}
                <VStack align="stretch" gap={4}>
                    {/* Next.js 삽입 코드 */}
                    <Box p={5} borderRadius="20px" bg="var(--waba-card)" border="1px solid" borderColor="var(--waba-line)">
                        <Text fontSize="13px" fontWeight="800" color="var(--waba-ink)" mb={2.5}>
                            Next.js 삽입 코드
                        </Text>
                        <Box
                            p={3}
                            borderRadius="12px"
                            bg="var(--waba-surface)"
                            border="1px solid"
                            borderColor="var(--waba-line)"
                            fontFamily="mono"
                            fontSize="11.5px"
                            color="var(--waba-ink)"
                            mb={2.5}
                            wordBreak="break-all"
                        >
                            {`<WabaBanner bannerKey="${bannerKey.trim() || 'my-banner'}" />`}
                        </Box>
                        <Button
                            size="xs"
                            w="100%"
                            h="32px"
                            borderRadius="999px"
                            bg="var(--waba-purple-soft)"
                            color="var(--waba-purple-text)"
                            border="1px solid"
                            borderColor="var(--waba-purple-border)"
                            fontWeight="800"
                            gap={1.5}
                            onClick={handleCopyCode}
                        >
                            <LuCopy size={13} />
                            코드 복사
                        </Button>
                        <Text fontSize="10.5px" color="var(--waba-ink-3)" mt={2} fontFamily="mono">
                            {`import WabaBanner from '@/app/(main)/common/WabaBanner'`}
                        </Text>
                    </Box>

                    {/* 배너 전체 노출 상태 · 기간 */}
                    <Box p={5} borderRadius="20px" bg="var(--waba-card)" border="1px solid" borderColor="var(--waba-line)">
                        <Text fontSize="13px" fontWeight="800" color="var(--waba-ink)" mb={3}>
                            배너 전체 노출 상태 · 기간
                        </Text>

                        <HStack gap={1.5} mb={3} flexWrap="wrap">
                            {[
                                { key: 'VISIBLE' as DisplayStatus, label: '노출(상시)' },
                                { key: 'HIDDEN' as DisplayStatus, label: '미노출' },
                                { key: 'SCHEDULED' as DisplayStatus, label: '노출기간 설정' },
                            ].map((opt) => (
                                <Button
                                    key={opt.key}
                                    size="xs"
                                    h="30px"
                                    px={3}
                                    borderRadius="999px"
                                    bg={displayStatus === opt.key ? '#6338A9' : 'var(--waba-surface)'}
                                    color={displayStatus === opt.key ? '#FFFFFF' : 'var(--waba-ink-2)'}
                                    border="1px solid"
                                    borderColor={displayStatus === opt.key ? '#6338A9' : 'var(--waba-line)'}
                                    fontWeight="700"
                                    onClick={() => setDisplayStatus(opt.key)}
                                >
                                    {opt.label}
                                </Button>
                            ))}
                        </HStack>

                        {displayStatus === 'SCHEDULED' && (
                            <VStack align="stretch" gap={2.5} mb={3} pt={2} borderTop="1px solid" borderColor="var(--waba-line)">
                                <Input
                                    type="datetime-local"
                                    value={startAt}
                                    onChange={(e) => setStartAt(e.target.value)}
                                    size="sm"
                                    bg="var(--waba-surface)"
                                    borderColor="var(--waba-line)"
                                    color="var(--waba-ink)"
                                />
                                <Input
                                    type="datetime-local"
                                    value={endAt}
                                    disabled={noEndDate}
                                    onChange={(e) => setEndAt(e.target.value)}
                                    size="sm"
                                    bg="var(--waba-surface)"
                                    borderColor="var(--waba-line)"
                                    color="var(--waba-ink)"
                                />
                                <HStack gap={2} cursor="pointer" onClick={() => setNoEndDate((p) => !p)}>
                                    <input
                                        type="checkbox"
                                        checked={noEndDate}
                                        onChange={(e) => setNoEndDate(e.target.checked)}
                                    />
                                    <Text fontSize="12px" color="var(--waba-ink-2)">
                                        종료일 없음
                                    </Text>
                                </HStack>
                            </VStack>
                        )}

                        <Text fontSize="11px" color="var(--waba-ink-3)">
                            전체 상태가 미노출이거나 기간 외이면 모든 슬라이드가 노출되지 않습니다.
                        </Text>
                    </Box>

                    {mode === 'edit' && (
                        <Box p={5} borderRadius="20px" bg="var(--waba-card)" border="1px solid" borderColor="var(--waba-line)">
                            <Text fontSize="13px" fontWeight="800" color="var(--waba-ink)" mb={2}>
                                운영 현황
                            </Text>
                            <Text fontSize="12.5px" color="var(--waba-ink-2)">
                                누적 클릭 수: <b>{totalClicks}회</b>
                            </Text>
                        </Box>
                    )}
                </VStack>
            </Grid>
        </Box>
    );
}
