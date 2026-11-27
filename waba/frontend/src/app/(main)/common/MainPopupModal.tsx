'use client'

import React, { useEffect, useState } from 'react';
import {
    Box,
    Button,
    Dialog,
    Flex,
    HStack,
    IconButton,
    Image,
    Portal,
    Text,
} from '@chakra-ui/react';
import { LuChevronLeft, LuChevronRight } from 'react-icons/lu';
import { useRouter } from 'next/navigation';
import axiosInstance from '@/utils/api';
import { resolveMediaUrl } from '@/app/admin/notices/types';

const DISMISS_STORAGE_KEY = 'waba_main_popup_dismiss_until';

function getSafeLink(raw?: string | null): { href: string; isInternal: boolean } | null {
    if (!raw) return null;
    const trimmed = raw.trim();
    if (!trimmed) return null;
    if (trimmed.startsWith('/')) return { href: trimmed, isInternal: true };
    try {
        const parsed = new URL(trimmed);
        if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
            return { href: parsed.href, isInternal: false };
        }
    } catch {
        return null;
    }
    return null;
}

export default function MainPopupModal() {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [settings, setSettings] = useState<any>(null);
    const [slides, setSlides] = useState<any[]>([]);
    const [activeIndex, setActiveIndex] = useState(0);
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const dismissUntil = Number(localStorage.getItem(DISMISS_STORAGE_KEY) || 0);
        if (dismissUntil > Date.now()) return;

        let cancelled = false;
        axiosInstance
            .get('/public/popups/main')
            .then((res) => {
                if (cancelled) return;
                const s = res.data?.settings || null;
                const list: any[] = Array.isArray(res.data?.slides) ? res.data.slides : [];
                if (!s || !s.is_enabled || list.length === 0) return;

                const w = window.innerWidth;
                const deviceOk =
                    w < 768
                        ? Boolean(s.show_mobile)
                        : w < 1024
                            ? Boolean(s.show_tablet)
                            : Boolean(s.show_pc);
                if (!deviceOk) return;

                setSettings(s);
                setSlides(list);
                setActiveIndex(0);
                setOpen(true);
            })
            .catch(() => {});

        return () => {
            cancelled = true;
        };
    }, []);

    if (!open || !settings || slides.length === 0) return null;

    const currentSlide = slides[activeIndex] || slides[0];
    const imgSrc = resolveMediaUrl(currentSlide?.image_url);
    const safeLink = getSafeLink(currentSlide?.link_url);
    const isBottomSheet = isMobile && settings.mobile_display_mode === 'BOTTOM_SHEET';

    const handleSlideClick = () => {
        if (!safeLink) return;
        if (currentSlide?.id) {
            axiosInstance.post(`/public/popups/slides/${currentSlide.id}/click`).catch(() => {});
        }
        if (currentSlide.link_target === '_blank') {
            window.open(safeLink.href, '_blank', 'noopener,noreferrer');
        } else if (safeLink.isInternal) {
            setOpen(false);
            router.push(safeLink.href);
        } else {
            window.location.href = safeLink.href;
        }
    };

    const handleDismiss = (days: number) => {
        if (typeof window !== 'undefined') {
            const until = Date.now() + days * 24 * 60 * 60 * 1000;
            localStorage.setItem(DISMISS_STORAGE_KEY, String(until));
        }
        setOpen(false);
    };

    return (
        <Dialog.Root
            open={open}
            onOpenChange={(e) => setOpen(e.open)}
            placement={isBottomSheet ? 'bottom' : 'center'}
        >
            <Portal>
                <Dialog.Backdrop bg="blackAlpha.600" backdropFilter="blur(4px)" zIndex={1400} />
                <Dialog.Positioner
                    zIndex={1401}
                    p={isBottomSheet ? 0 : 4}
                    alignItems={isBottomSheet ? 'flex-end' : 'center'}
                >
                    <Dialog.Content
                        bg="var(--waba-card)"
                        borderRadius={isBottomSheet ? '24px 24px 0 0' : '24px'}
                        border="1px solid"
                        borderColor="var(--waba-line)"
                        overflow="hidden"
                        maxW={isBottomSheet ? '100%' : '420px'}
                        w="100%"
                        p={0}
                        boxShadow="0 24px 48px rgba(0, 0, 0, 0.28)"
                    >
                        {/* 4:5 Image Area */}
                        <Box position="relative" w="100%" aspectRatio={4 / 5} bg="var(--waba-surface)">
                            {imgSrc && (
                                <Image
                                    src={imgSrc}
                                    alt={currentSlide?.title || '메인 팝업'}
                                    w="100%"
                                    h="100%"
                                    objectFit="cover"
                                    cursor={safeLink ? 'pointer' : 'default'}
                                    onClick={handleSlideClick}
                                />
                            )}

                            {slides.length > 1 && (
                                <>
                                    <IconButton
                                        aria-label="이전 팝업"
                                        size="xs"
                                        rounded="full"
                                        position="absolute"
                                        left={2.5}
                                        top="50%"
                                        transform="translateY(-50%)"
                                        bg="blackAlpha.600"
                                        color="white"
                                        _hover={{ bg: 'blackAlpha.800' }}
                                        onClick={() =>
                                            setActiveIndex((prev) => (prev - 1 + slides.length) % slides.length)
                                        }
                                    >
                                        <LuChevronLeft size={16} />
                                    </IconButton>

                                    <IconButton
                                        aria-label="다음 팝업"
                                        size="xs"
                                        rounded="full"
                                        position="absolute"
                                        right={2.5}
                                        top="50%"
                                        transform="translateY(-50%)"
                                        bg="blackAlpha.600"
                                        color="white"
                                        _hover={{ bg: 'blackAlpha.800' }}
                                        onClick={() => setActiveIndex((prev) => (prev + 1) % slides.length)}
                                    >
                                        <LuChevronRight size={16} />
                                    </IconButton>

                                    <Box
                                        position="absolute"
                                        bottom={3}
                                        right={3}
                                        px={2.5}
                                        py={0.5}
                                        borderRadius="999px"
                                        bg="blackAlpha.650"
                                        color="white"
                                        fontSize="11px"
                                        fontWeight="700"
                                    >
                                        {activeIndex + 1} / {slides.length}
                                    </Box>
                                </>
                            )}
                        </Box>

                        {/* Footer */}
                        <Flex
                            justify="space-between"
                            align="center"
                            px={4}
                            py={3}
                            bg="var(--waba-card)"
                            borderTop="1px solid"
                            borderColor="var(--waba-line)"
                        >
                            {settings.dismiss_policy === 'DAY' ? (
                                <Button
                                    size="xs"
                                    variant="ghost"
                                    color="var(--waba-ink-2)"
                                    fontSize="12.5px"
                                    fontWeight="600"
                                    onClick={() => handleDismiss(1)}
                                >
                                    오늘 하루 보지 않기
                                </Button>
                            ) : settings.dismiss_policy === 'WEEK' ? (
                                <Button
                                    size="xs"
                                    variant="ghost"
                                    color="var(--waba-ink-2)"
                                    fontSize="12.5px"
                                    fontWeight="600"
                                    onClick={() => handleDismiss(7)}
                                >
                                    7일간 보지 않기
                                </Button>
                            ) : (
                                <Box />
                            )}

                            <HStack gap={2}>
                                <Button
                                    size="xs"
                                    variant="ghost"
                                    color="var(--waba-ink)"
                                    fontSize="12.5px"
                                    fontWeight="700"
                                    onClick={() => setOpen(false)}
                                >
                                    닫기
                                </Button>
                            </HStack>
                        </Flex>
                    </Dialog.Content>
                </Dialog.Positioner>
            </Portal>
        </Dialog.Root>
    );
}
