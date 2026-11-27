'use client'

import React, { useEffect, useState } from 'react';
import { Box, Flex, IconButton, Image } from '@chakra-ui/react';
import { LuChevronLeft, LuChevronRight } from 'react-icons/lu';
import { useRouter } from 'next/navigation';
import axiosInstance from '@/utils/api';
import { resolveMediaUrl } from '@/app/admin/notices/types';

export interface WabaBannerProps {
    bannerKey: string;
    borderRadius?: string;
    maxW?: string;
    mb?: number | string;
}

function getSafeLink(raw?: string | null): { href: string; isInternal: boolean } | null {
    if (!raw) return null;
    const trimmed = raw.trim();
    if (!trimmed) return null;
    if (trimmed.startsWith('/')) {
        return { href: trimmed, isInternal: true };
    }
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

export function WabaBanner({
    bannerKey,
    borderRadius = '16px',
    maxW = '100%',
    mb = 0,
}: WabaBannerProps) {
    const router = useRouter();
    const [banner, setBanner] = useState<any>(null);
    const [items, setItems] = useState<any[]>([]);
    const [activeIndex, setActiveIndex] = useState(0);
    const [hovered, setHovered] = useState(false);
    const [deviceType, setDeviceType] = useState<'pc' | 'tablet' | 'mobile'>('pc');

    useEffect(() => {
        const updateDevice = () => {
            const w = window.innerWidth;
            if (w < 768) setDeviceType('mobile');
            else if (w < 1024) setDeviceType('tablet');
            else setDeviceType('pc');
        };
        updateDevice();
        window.addEventListener('resize', updateDevice);
        return () => window.removeEventListener('resize', updateDevice);
    }, []);

    useEffect(() => {
        if (!bannerKey) return;
        let cancelled = false;
        axiosInstance
            .get(`/public/banners/${encodeURIComponent(bannerKey)}`)
            .then((res) => {
                if (cancelled) return;
                const b = res.data?.banner || null;
                const list: any[] = Array.isArray(res.data?.items)
                    ? res.data.items
                    : Array.isArray(b?.items)
                        ? b.items
                        : [];
                if (!b || list.length === 0) {
                    setBanner(null);
                    setItems([]);
                    return;
                }
                setBanner(b);
                if (b.banner_type === 'RANDOM') {
                    const picked = list[Math.floor(Math.random() * list.length)];
                    setItems(picked ? [picked] : []);
                    setActiveIndex(0);
                } else {
                    setItems(list);
                    setActiveIndex(0);
                }
            })
            .catch(() => {
                if (!cancelled) {
                    setBanner(null);
                    setItems([]);
                }
            });
        return () => {
            cancelled = true;
        };
    }, [bannerKey]);

    useEffect(() => {
        if (!banner || banner.banner_type !== 'SWIPER' || items.length <= 1) return;
        if (!banner.autoplay_enabled || hovered) return;
        const intervalMs = Math.max(1500, Number(banner.autoplay_interval_ms || 4000));
        const timer = setInterval(() => {
            setActiveIndex((prev) => (prev + 1) % items.length);
        }, intervalMs);
        return () => clearInterval(timer);
    }, [banner, items.length, hovered]);

    if (!banner || items.length === 0) return null;

    const currentItem = items[activeIndex] || items[0];
    if (!currentItem) return null;

    const getDeviceImage = (item: any) => {
        if (deviceType === 'mobile') {
            return resolveMediaUrl(item.mobile_image_url || item.image_url || item.pc_image_url);
        }
        if (deviceType === 'tablet') {
            return resolveMediaUrl(item.tablet_image_url || item.pc_image_url || item.image_url);
        }
        return resolveMediaUrl(item.pc_image_url || item.image_url);
    };

    const imgSrc = getDeviceImage(currentItem);
    if (!imgSrc) return null;

    const safeLink = getSafeLink(currentItem.link_url);

    const handleBannerClick = () => {
        if (!safeLink) return;
        axiosInstance
            .post(`/public/banners/${encodeURIComponent(bannerKey)}/click`, {
                itemId: currentItem.id,
            })
            .catch(() => {});

        if (currentItem.link_target === '_blank') {
            window.open(safeLink.href, '_blank', 'noopener,noreferrer');
        } else if (safeLink.isInternal) {
            router.push(safeLink.href);
        } else {
            window.location.href = safeLink.href;
        }
    };

    const isSwiper = banner.banner_type === 'SWIPER' && items.length > 1;
    const showIndicators = Boolean(banner.show_indicators ?? true);

    return (
        <Box
            position="relative"
            w="100%"
            maxW={maxW}
            mb={mb}
            borderRadius={borderRadius}
            overflow="hidden"
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
        >
            <Box
                cursor={safeLink ? 'pointer' : 'default'}
                onClick={handleBannerClick}
                w="100%"
            >
                <Image
                    src={imgSrc}
                    alt={currentItem.title || banner.title || bannerKey}
                    w="100%"
                    h="auto"
                    display="block"
                    objectFit="cover"
                />
            </Box>

            {isSwiper && (
                <>
                    <IconButton
                        aria-label="이전 배너"
                        size="xs"
                        rounded="full"
                        position="absolute"
                        left={2.5}
                        top="50%"
                        transform="translateY(-50%)"
                        bg="blackAlpha.600"
                        color="white"
                        opacity={hovered ? 1 : 0}
                        transition="opacity 0.2s ease"
                        _hover={{ bg: 'blackAlpha.800' }}
                        onClick={(e) => {
                            e.stopPropagation();
                            setActiveIndex((prev) => (prev - 1 + items.length) % items.length);
                        }}
                    >
                        <LuChevronLeft size={16} />
                    </IconButton>

                    <IconButton
                        aria-label="다음 배너"
                        size="xs"
                        rounded="full"
                        position="absolute"
                        right={2.5}
                        top="50%"
                        transform="translateY(-50%)"
                        bg="blackAlpha.600"
                        color="white"
                        opacity={hovered ? 1 : 0}
                        transition="opacity 0.2s ease"
                        _hover={{ bg: 'blackAlpha.800' }}
                        onClick={(e) => {
                            e.stopPropagation();
                            setActiveIndex((prev) => (prev + 1) % items.length);
                        }}
                    >
                        <LuChevronRight size={16} />
                    </IconButton>

                    {showIndicators && (
                        <Flex
                            position="absolute"
                            bottom={2.5}
                            left="50%"
                            transform="translateX(-50%)"
                            gap={1.5}
                            px={2.5}
                            py={1}
                            borderRadius="999px"
                            bg="blackAlpha.500"
                        >
                            {items.map((_, idx) => (
                                <Box
                                    key={idx}
                                    as="button"
                                    w={idx === activeIndex ? '16px' : '6px'}
                                    h="6px"
                                    borderRadius="999px"
                                    bg={idx === activeIndex ? 'white' : 'whiteAlpha.600'}
                                    transition="all 0.2s ease"
                                    cursor="pointer"
                                    onClick={(e: React.MouseEvent) => {
                                        e.stopPropagation();
                                        setActiveIndex(idx);
                                    }}
                                />
                            ))}
                        </Flex>
                    )}
                </>
            )}
        </Box>
    );
}

export default WabaBanner;
