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
    LuArrowLeft,
    LuChevronLeft,
    LuChevronRight,
    LuTrash2,
    LuUpload,
} from 'react-icons/lu';
import { useRouter } from 'next/navigation';
import axiosInstance from '@/utils/api';
import { toaster } from '@/components/ui/toaster';
import {
    AdminPopupSlide,
    DismissPolicy,
    DisplayStatus,
    fromDatetimeLocal,
    MobileDisplayMode,
    resolveMediaUrl,
    toDatetimeLocal,
} from '../types';

interface PopupEditorFormProps {
    mode: 'create' | 'edit';
    slideId?: string;
}

const DISMISS_LABELS: Record<DismissPolicy, string> = {
    DAY: '오늘 하루 보지 않기',
    WEEK: '7일간 보지 않기',
    NONE: '닫기만',
};

export default function PopupEditorForm({ mode, slideId }: PopupEditorFormProps) {
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

    // Slide fields
    const [sortOrder, setSortOrder] = useState('1');
    const [title, setTitle] = useState('');
    const [imageUrl, setImageUrl] = useState('');
    const [linkUrl, setLinkUrl] = useState('');
    const [linkTarget, setLinkTarget] = useState<'_self' | '_blank'>('_self');
    const [displayStatus, setDisplayStatus] = useState<DisplayStatus>('VISIBLE');
    const [startAt, setStartAt] = useState('');
    const [endAt, setEndAt] = useState('');
    const [noEndDate, setNoEndDate] = useState(true);

    // Common popup settings
    const [isEnabled, setIsEnabled] = useState(true);
    const [dismissPolicy, setDismissPolicy] = useState<DismissPolicy>('DAY');
    const [showPc, setShowPc] = useState(true);
    const [showTablet, setShowTablet] = useState(true);
    const [showMobile, setShowMobile] = useState(true);
    const [mobileDisplayMode, setMobileDisplayMode] = useState<MobileDisplayMode>('MODAL');

    // All slides for preview
    const [allSlides, setAllSlides] = useState<AdminPopupSlide[]>([]);
    const [previewIdx, setPreviewIdx] = useState(0);

    useEffect(() => {
        setLoading(true);
        axiosInstance
            .get('/admin/popups')
            .then((res) => {
                const s = res.data?.settings;
                if (s) {
                    setIsEnabled(Boolean(s.is_enabled));
                    setDismissPolicy((s.dismiss_policy as DismissPolicy) || 'DAY');
                    setShowPc(Boolean(s.show_pc));
                    setShowTablet(Boolean(s.show_tablet));
                    setShowMobile(Boolean(s.show_mobile));
                    setMobileDisplayMode((s.mobile_display_mode as MobileDisplayMode) || 'MODAL');
                }
                const slides: AdminPopupSlide[] = res.data?.slides || [];
                setAllSlides(slides);

                if (mode === 'edit' && slideId) {
                    const foundIdx = slides.findIndex((sl) => String(sl.id) === String(slideId));
                    const found = foundIdx >= 0 ? slides[foundIdx] : null;
                    if (found) {
                        setPreviewIdx(foundIdx);
                        setSortOrder(String(found.sort_order ?? 1));
                        setTitle(found.title || '');
                        setImageUrl(found.image_url || '');
                        setLinkUrl(found.link_url || '');
                        setLinkTarget(found.link_target === '_blank' ? '_blank' : '_self');
                        setDisplayStatus(found.display_status || 'VISIBLE');
                        setStartAt(toDatetimeLocal(found.start_at));
                        setEndAt(toDatetimeLocal(found.end_at));
                        setNoEndDate(!found.end_at);
                    }
                } else {
                    setSortOrder(String(slides.length + 1));
                }
            })
            .catch(() => {
                toaster.create({ title: '팝업 정보를 불러오지 못했습니다.', type: 'error' });
            })
            .finally(() => setLoading(false));
    }, [mode, slideId]);

    const handleUploadImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(true);
        try {
            const fd = new FormData();
            fd.append('image', file);
            fd.append('category', 'popups');
            const res = await axiosInstance.post('/admin/marketing/upload-image', fd, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            const url = res.data?.url || res.data?.imageUrl || res.data?.image_url || '';
            if (url) {
                setImageUrl(url);
                toaster.create({ title: '팝업 이미지가 업로드되었습니다.', type: 'success' });
            }
        } catch (err: any) {
            toaster.create({ title: err?.response?.data?.message || '이미지 업로드에 실패했습니다.', type: 'error' });
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleSave = async () => {
        if (!imageUrl.trim()) {
            toaster.create({ title: '팝업 이미지를 업로드해주세요.', type: 'warning' });
            return;
        }

        const slidePayload = {
            sort_order: Math.max(1, Number(sortOrder || 1)),
            title: title.trim() || null,
            image_url: imageUrl.trim(),
            link_url: linkUrl.trim() || null,
            link_target: linkTarget,
            display_status: displayStatus,
            start_at: displayStatus === 'SCHEDULED' ? fromDatetimeLocal(startAt) : null,
            end_at: displayStatus === 'SCHEDULED' && !noEndDate ? fromDatetimeLocal(endAt) : null,
        };

        const settingsPayload = {
            is_enabled: isEnabled,
            dismiss_policy: dismissPolicy,
            show_pc: showPc,
            show_tablet: showTablet,
            show_mobile: showMobile,
            mobile_display_mode: mobileDisplayMode,
        };

        setSubmitting(true);
        try {
            if (mode === 'create') {
                await axiosInstance.post('/admin/popups/slides', slidePayload);
            } else if (slideId) {
                await axiosInstance.patch(`/admin/popups/slides/${slideId}`, slidePayload);
            }
            await axiosInstance.patch('/admin/popups/settings', settingsPayload);
            toaster.create({ title: '팝업 슬라이드 및 정책이 저장되었습니다.', type: 'success' });
            router.push('/admin/notices?tab=popups');
        } catch (err: any) {
            toaster.create({ title: err?.response?.data?.message || '저장에 실패했습니다.', type: 'error' });
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!slideId) return;
        setSubmitting(true);
        try {
            await axiosInstance.delete(`/admin/popups/slides/${slideId}`);
            toaster.create({ title: '팝업 슬라이드가 삭제되었습니다.', type: 'success' });
            router.push('/admin/notices?tab=popups');
        } catch (err: any) {
            toaster.create({ title: err?.response?.data?.message || '삭제에 실패했습니다.', type: 'error' });
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

    const previewSlides =
        mode === 'create'
            ? [...allSlides, { id: 'new', image_url: imageUrl, title, link_url: linkUrl } as AdminPopupSlide]
            : allSlides.map((s) =>
                  String(s.id) === String(slideId)
                      ? { ...s, image_url: imageUrl, title, link_url: linkUrl }
                      : s
              );
    const activePreviewSlide = previewSlides[previewIdx] || previewSlides[0] || { image_url: imageUrl, title, link_url: linkUrl };

    return (
        <Box maxW="1240px" mx="auto" px={{ base: 4, md: 6 }} py={6}>
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleUploadImage}
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
                        onClick={() => router.push('/admin/notices?tab=popups')}
                    >
                        <LuArrowLeft size={14} />
                        목록으로 돌아가기
                    </Button>
                    <Heading size="xl" fontWeight="800" color="var(--waba-ink)">
                        {mode === 'create' ? '새 팝업 슬라이드 추가' : '팝업 슬라이드 · 정책 편집'}
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
                        onClick={() => router.push('/admin/notices?tab=popups')}
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
                {/* Left: Slide Detail + Common Policy */}
                <VStack align="stretch" gap={5}>
                    {/* 팝업 슬라이드 상세 */}
                    <Box p={5} borderRadius="20px" bg="var(--waba-card)" border="1px solid" borderColor="var(--waba-line)">
                        <Text fontSize="14px" fontWeight="800" color="var(--waba-ink)" mb={4}>
                            팝업 슬라이드 상세
                        </Text>

                        <VStack align="stretch" gap={4}>
                            <Grid templateColumns={{ base: '1fr', sm: '120px 1fr' }} gap={3}>
                                <Box>
                                    <Text fontSize="12px" fontWeight="800" color="var(--waba-ink-2)" mb={1.5}>
                                        노출 순서
                                    </Text>
                                    <Input
                                        type="number"
                                        min={1}
                                        value={sortOrder}
                                        onChange={(e) => setSortOrder(e.target.value)}
                                        size="sm"
                                        h="38px"
                                        borderRadius="12px"
                                        bg="var(--waba-surface)"
                                        borderColor="var(--waba-line)"
                                        color="var(--waba-ink)"
                                    />
                                </Box>
                                <Box>
                                    <Text fontSize="12px" fontWeight="800" color="var(--waba-ink-2)" mb={1.5}>
                                        관리용 제목 (선택)
                                    </Text>
                                    <Input
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        placeholder="예: 12월 신규 가입 이벤트 팝업"
                                        size="sm"
                                        h="38px"
                                        borderRadius="12px"
                                        bg="var(--waba-surface)"
                                        borderColor="var(--waba-line)"
                                        color="var(--waba-ink)"
                                    />
                                </Box>
                            </Grid>

                            <Box>
                                <Flex justify="space-between" align="center" mb={2} flexWrap="wrap" gap={2}>
                                    <Text fontSize="12px" fontWeight="800" color="var(--waba-ink-2)">
                                        팝업 이미지 (4:5 권장) *
                                    </Text>
                                    <Text fontSize="11px" color="var(--waba-purple-text)" fontWeight="700">
                                        WebP 자동 변환 · 최대 가로 1500px · 72 DPI
                                    </Text>
                                </Flex>

                                <Button
                                    size="xs"
                                    variant="outline"
                                    borderColor="var(--waba-line)"
                                    color="var(--waba-ink)"
                                    borderRadius="999px"
                                    px={3.5}
                                    gap={1.5}
                                    loading={uploading}
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <LuUpload size={13} />
                                    이미지 업로드
                                </Button>
                            </Box>

                            <Box>
                                <Text fontSize="12px" fontWeight="800" color="var(--waba-ink-2)" mb={1.5}>
                                    클릭 이동 URL
                                </Text>
                                <Flex gap={2} flexWrap={{ base: 'wrap', sm: 'nowrap' }}>
                                    <Input
                                        value={linkUrl}
                                        onChange={(e) => setLinkUrl(e.target.value)}
                                        placeholder="예: /post/123 또는 https://..."
                                        size="sm"
                                        h="36px"
                                        bg="var(--waba-surface)"
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
                                                h="36px"
                                                px={3}
                                                whiteSpace="nowrap"
                                                borderRadius="999px"
                                                bg={linkTarget === t.key ? '#6338A9' : 'var(--waba-surface)'}
                                                color={linkTarget === t.key ? '#FFFFFF' : 'var(--waba-ink-2)'}
                                                border="1px solid"
                                                borderColor={linkTarget === t.key ? '#6338A9' : 'var(--waba-line)'}
                                                fontWeight="700"
                                                onClick={() => setLinkTarget(t.key)}
                                            >
                                                {t.label}
                                            </Button>
                                        ))}
                                    </HStack>
                                </Flex>
                            </Box>

                            <Box pt={2} borderTop="1px solid" borderColor="var(--waba-line)">
                                <Text fontSize="12px" fontWeight="800" color="var(--waba-ink-2)" mb={2}>
                                    개별 슬라이드 노출 상태
                                </Text>
                                <HStack gap={1.5} mb={displayStatus === 'SCHEDULED' ? 3 : 0} flexWrap="wrap">
                                    {[
                                        { key: 'VISIBLE' as DisplayStatus, label: '노출(상시)' },
                                        { key: 'HIDDEN' as DisplayStatus, label: '미노출' },
                                        { key: 'SCHEDULED' as DisplayStatus, label: '기간 설정' },
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
                                    <VStack align="stretch" gap={2}>
                                        <Grid templateColumns={{ base: '1fr', sm: '1fr 1fr' }} gap={2.5}>
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
                                        </Grid>
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
                            </Box>
                        </VStack>
                    </Box>

                    {/* 메인 팝업 공통 노출 정책 */}
                    <Box p={5} borderRadius="20px" bg="var(--waba-card)" border="1px solid" borderColor="var(--waba-line)">
                        <Text fontSize="14px" fontWeight="800" color="var(--waba-ink)" mb={4}>
                            메인 팝업 공통 노출 정책
                        </Text>

                        <VStack align="stretch" gap={4}>
                            <Flex justify="space-between" align="center">
                                <Text fontSize="13px" fontWeight="700" color="var(--waba-ink)">
                                    전체 팝업 노출 활성화
                                </Text>
                                <Switch.Root
                                    checked={isEnabled}
                                    onCheckedChange={(e) => setIsEnabled(e.checked)}
                                    colorPalette="purple"
                                >
                                    <Switch.HiddenInput />
                                    <Switch.Control />
                                </Switch.Root>
                            </Flex>

                            <Box>
                                <Text fontSize="12px" fontWeight="800" color="var(--waba-ink-2)" mb={2}>
                                    닫기(다시 보지 않기) 정책
                                </Text>
                                <HStack gap={1.5} flexWrap="wrap">
                                    {(['DAY', 'WEEK', 'NONE'] as DismissPolicy[]).map((p) => (
                                        <Button
                                            key={p}
                                            size="xs"
                                            h="30px"
                                            px={3}
                                            borderRadius="999px"
                                            bg={dismissPolicy === p ? '#6338A9' : 'var(--waba-surface)'}
                                            color={dismissPolicy === p ? '#FFFFFF' : 'var(--waba-ink-2)'}
                                            border="1px solid"
                                            borderColor={dismissPolicy === p ? '#6338A9' : 'var(--waba-line)'}
                                            fontWeight="700"
                                            onClick={() => setDismissPolicy(p)}
                                        >
                                            {DISMISS_LABELS[p]}
                                        </Button>
                                    ))}
                                </HStack>
                            </Box>

                            <Box>
                                <Text fontSize="12px" fontWeight="800" color="var(--waba-ink-2)" mb={2}>
                                    디바이스별 노출
                                </Text>
                                <HStack gap={4} flexWrap="wrap">
                                    {[
                                        { label: 'PC', checked: showPc, onChange: setShowPc },
                                        { label: '태블릿', checked: showTablet, onChange: setShowTablet },
                                        { label: '모바일', checked: showMobile, onChange: setShowMobile },
                                    ].map((d) => (
                                        <HStack key={d.label} gap={2}>
                                            <Text fontSize="12.5px" color="var(--waba-ink)">{d.label}</Text>
                                            <Switch.Root
                                                checked={d.checked}
                                                onCheckedChange={(e) => d.onChange(e.checked)}
                                                colorPalette="purple"
                                            >
                                                <Switch.HiddenInput />
                                                <Switch.Control />
                                            </Switch.Root>
                                        </HStack>
                                    ))}
                                </HStack>
                            </Box>

                            <Box>
                                <Text fontSize="12px" fontWeight="800" color="var(--waba-ink-2)" mb={2}>
                                    모바일 표시 방식
                                </Text>
                                <HStack gap={2}>
                                    {[
                                        { key: 'MODAL' as MobileDisplayMode, label: '중앙 모달' },
                                        { key: 'BOTTOM_SHEET' as MobileDisplayMode, label: '하단 바텀시트' },
                                    ].map((m) => (
                                        <Button
                                            key={m.key}
                                            size="xs"
                                            h="30px"
                                            px={3.5}
                                            borderRadius="999px"
                                            bg={mobileDisplayMode === m.key ? '#6338A9' : 'var(--waba-surface)'}
                                            color={mobileDisplayMode === m.key ? '#FFFFFF' : 'var(--waba-ink-2)'}
                                            border="1px solid"
                                            borderColor={mobileDisplayMode === m.key ? '#6338A9' : 'var(--waba-line)'}
                                            fontWeight="700"
                                            onClick={() => setMobileDisplayMode(m.key)}
                                        >
                                            {m.label}
                                        </Button>
                                    ))}
                                </HStack>
                            </Box>
                        </VStack>
                    </Box>
                </VStack>

                {/* Right Sidebar: 4:5 Live Preview */}
                <Box p={5} borderRadius="20px" bg="var(--waba-card)" border="1px solid" borderColor="var(--waba-line)">
                    <Flex justify="space-between" align="center" mb={3}>
                        <Text fontSize="13px" fontWeight="800" color="var(--waba-ink)">
                            실시간 메인 팝업 미리보기 (4:5)
                        </Text>
                        <Text fontSize="11px" color="var(--waba-purple-text)" fontWeight="700">
                            {previewSlides.length > 0 ? `${previewIdx + 1} / ${previewSlides.length}` : '0 / 0'}
                        </Text>
                    </Flex>

                    <Box
                        borderRadius="18px"
                        overflow="hidden"
                        border="1px solid"
                        borderColor="var(--waba-line)"
                        bg="var(--waba-surface)"
                    >
                        <Box position="relative" w="100%" aspectRatio={4 / 5}>
                            {activePreviewSlide?.image_url ? (
                                <Image
                                    src={resolveMediaUrl(activePreviewSlide.image_url)}
                                    alt={activePreviewSlide.title || '미리보기'}
                                    w="100%"
                                    h="100%"
                                    objectFit="cover"
                                />
                            ) : (
                                <Flex h="100%" align="center" justify="center" color="var(--waba-ink-3)" fontSize="12.5px">
                                    이미지를 업로드하면 미리보기가 표시됩니다.
                                </Flex>
                            )}

                            {previewSlides.length > 1 && (
                                <>
                                    <IconButton
                                        aria-label="이전"
                                        size="xs"
                                        rounded="full"
                                        position="absolute"
                                        left={2}
                                        top="50%"
                                        transform="translateY(-50%)"
                                        bg="blackAlpha.600"
                                        color="white"
                                        onClick={() =>
                                            setPreviewIdx((p) => (p - 1 + previewSlides.length) % previewSlides.length)
                                        }
                                    >
                                        <LuChevronLeft size={14} />
                                    </IconButton>
                                    <IconButton
                                        aria-label="다음"
                                        size="xs"
                                        rounded="full"
                                        position="absolute"
                                        right={2}
                                        top="50%"
                                        transform="translateY(-50%)"
                                        bg="blackAlpha.600"
                                        color="white"
                                        onClick={() =>
                                            setPreviewIdx((p) => (p + 1) % previewSlides.length)
                                        }
                                    >
                                        <LuChevronRight size={14} />
                                    </IconButton>
                                </>
                            )}
                        </Box>

                        <Flex
                            justify="space-between"
                            px={3.5}
                            py={2.5}
                            bg="var(--waba-card)"
                            borderTop="1px solid"
                            borderColor="var(--waba-line)"
                            fontSize="11.5px"
                            color="var(--waba-ink-2)"
                        >
                            <Text>{DISMISS_LABELS[dismissPolicy]}</Text>
                            <Text fontWeight="700" color="var(--waba-ink)">닫기</Text>
                        </Flex>
                    </Box>

                    {linkUrl && (
                        <Text fontSize="11px" color="var(--waba-ink-3)" mt={2.5} truncate>
                            연결 링크: {linkUrl}
                        </Text>
                    )}
                </Box>
            </Grid>
        </Box>
    );
}
