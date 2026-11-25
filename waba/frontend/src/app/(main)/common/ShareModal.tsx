'use client';

import { useCallback, useEffect, useRef, useState } from "react";
import {
    Box,
    Button,
    CloseButton,
    Dialog,
    Flex,
    HStack,
    Image,
    Input,
    Portal,
    Stack,
    Text,
    VStack
} from "@chakra-ui/react";
import { Check, Copy, Link2 } from "lucide-react";
import axiosInstance from "@/utils/api";
import { toaster } from "@/components/ui/toaster";

declare global {
    interface Window {
        Kakao?: any;
    }
}

interface ShareModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title?: string;
    description?: string;
    thumbnailUrl?: string;
}

export default function ShareModal({
    open,
    onOpenChange,
    title,
    description,
    thumbnailUrl
}: ShareModalProps) {
    const [currentUrl, setCurrentUrl] = useState('');
    const [isCopied, setIsCopied] = useState(false);
    const shortUrlCacheRef = useRef<Record<string, string>>({});

    const getShortUrl = useCallback(async (channel: 'SHARE_COPY' | 'SHARE_KAKAO') => {
        if (typeof window === 'undefined') return '';
        const pathname = window.location.pathname || '/';
        const cacheKey = `${pathname}::${channel}`;
        const cached = shortUrlCacheRef.current[cacheKey];
        if (cached) return cached;

        try {
            const res = await axiosInstance.post('/public/short-links', {
                targetPath: pathname,
                channel,
            });
            const code = res.data?.code;
            if (code) {
                const shortUrl = `${window.location.origin}/s/${code}`;
                shortUrlCacheRef.current[cacheKey] = shortUrl;
                return shortUrl;
            }
        } catch {
            // 단축 URL 발급 실패 시 원본 URL 폴백
        }
        return window.location.href;
    }, []);

    useEffect(() => {
        if (typeof window !== 'undefined' && !window.Kakao) {
            const script = document.createElement('script');
            script.src = 'https://t1.kakaocdn.net/kakao_js_sdk/2.7.2/kakao.min.js';
            script.integrity = 'sha384-TiCUE00h649CAMonG018J2mOGnr6go3Ex0228poQEYs5GtTXV50WuOX8HR+JAjk';
            script.crossOrigin = 'anonymous';
            script.async = true;
            script.onload = () => {
                const kakaoKey = process.env.NEXT_PUBLIC_KAKAO_JS_KEY;
                if (window.Kakao && !window.Kakao.isInitialized() && kakaoKey) {
                    window.Kakao.init(kakaoKey);
                }
            };
            document.head.appendChild(script);
        }
    }, []);

    useEffect(() => {
        if (!open || typeof window === 'undefined') return;
        let cancelled = false;
        setIsCopied(false);
        setCurrentUrl(window.location.href);

        getShortUrl('SHARE_COPY').then((shortUrl) => {
            if (!cancelled && shortUrl) {
                setCurrentUrl(shortUrl);
            }
        });

        return () => {
            cancelled = true;
        };
    }, [open, getShortUrl]);

    // 1. 링크 복사 핸들러
    const handleCopyLink = async () => {
        const url = currentUrl.includes('/s/')
            ? currentUrl
            : await getShortUrl('SHARE_COPY');
        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(url);
            } else {
                const textArea = document.createElement('textarea');
                textArea.value = url;
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
            }

            setCurrentUrl(url);
            setIsCopied(true);
            toaster.create({
                title: '링크가 복사되었습니다.',
                description: '원하는 곳에 붙여넣기(Ctrl+V)하여 공유해보세요.',
                type: 'success'
            });

            setTimeout(() => setIsCopied(false), 2500);
        } catch {
            toaster.create({
                title: '링크 복사에 실패했습니다.',
                type: 'error'
            });
        }
    };

    // 2. 카카오톡 공유 핸들러
    const handleKakaoShare = async () => {
        const shareUrl = await getShortUrl('SHARE_KAKAO');
        const shareTitle = title || 'WABA 커뮤니티 룩북 & 케어 라이프';
        const shareDesc = description || '반려동물과 함께하는 감각적인 공간과 이야기';

        if (window.Kakao && window.Kakao.isInitialized()) {
            try {
                window.Kakao.Share.sendDefault({
                    objectType: 'feed',
                    content: {
                        title: shareTitle,
                        description: shareDesc,
                        imageUrl: thumbnailUrl || 'https://images.unsplash.com/photo-1548767797-d8c844163c4c?w=800&auto=format&fit=crop&q=80',
                        link: {
                            mobileWebUrl: shareUrl,
                            webUrl: shareUrl,
                        },
                    },
                    buttons: [
                        {
                            title: 'WABA에서 보기',
                            link: {
                                mobileWebUrl: shareUrl,
                                webUrl: shareUrl,
                            },
                        },
                    ],
                });
                toaster.create({
                    title: '카카오톡 공유창을 열었습니다.',
                    type: 'info'
                });
                return;
            } catch (e) {
                console.warn('Kakao Share API error, falling back to web sharer:', e);
            }
        }

        // 카카오 JS 키가 아직 없거나 모바일/웹 팝업 폴백
        const kakaoWebSharer = `https://sharer.kakao.com/talk/friends/picker/link?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareTitle)}`;
        window.open(kakaoWebSharer, 'kakao-share-popup', 'width=480,height=620,scrollbars=yes');
        toaster.create({
            title: '카카오톡 공유창을 열었습니다.',
            type: 'info'
        });
    };

    return (
        <Dialog.Root
            open={open}
            onOpenChange={(e) => onOpenChange(e.open)}
            placement="center"
        >
            <Portal>
                <Dialog.Backdrop backdropFilter="blur(8px)" bg="blackAlpha.500" />
                <Dialog.Positioner p={4}>
                    <Dialog.Content
                        maxW="420px"
                        w="full"
                        borderRadius="28px"
                        p={6}
                        boxShadow="0 20px 40px -8px rgba(26, 28, 30, 0.16)"
                        bg="var(--waba-card)"
                    >
                        {/* 닫기 버튼 */}
                        <Dialog.CloseTrigger asChild position="absolute" top={4} right={4}>
                            <CloseButton size="sm" borderRadius="full" bg="var(--waba-surface)" color="var(--waba-ink)" _hover={{ bg: 'var(--waba-line)' }} />
                        </Dialog.CloseTrigger>

                        {/* 헤더 */}
                        <Dialog.Header p={0} mb={4}>
                            <Dialog.Title fontSize="18px" fontWeight="800" color="var(--waba-ink)">
                                공유하기
                            </Dialog.Title>
                            <Text fontSize="12px" color="var(--waba-ink-3)" mt={0.5}>
                                친구들과 감각적인 반려동물 공간을 함께 나눠보세요
                            </Text>
                        </Dialog.Header>

                        <Dialog.Body p={0}>
                            {/* 공유 대상 포스트 미니 프리뷰 */}
                            {title && (
                                <HStack
                                    p={3}
                                    borderRadius="18px"
                                    bg="var(--waba-surface)"
                                    gap={3}
                                    mb={6}
                                >
                                    {thumbnailUrl && (
                                        <Image
                                            src={thumbnailUrl}
                                            alt={title}
                                            w="52px"
                                            h="52px"
                                            borderRadius="12px"
                                            objectFit="cover"
                                            flexShrink={0}
                                        />
                                    )}
                                    <VStack align="start" gap={0.5} overflow="hidden">
                                        <Text
                                            fontSize="10px"
                                            fontWeight="800"
                                            color="var(--waba-purple-text)"
                                            letterSpacing="0.08em"
                                        >
                                            WABA CURATED
                                        </Text>
                                        <Text
                                            fontSize="13px"
                                            fontWeight="700"
                                            color="var(--waba-ink)"
                                            lineClamp={2}
                                        >
                                            {title}
                                        </Text>
                                    </VStack>
                                </HStack>
                            )}

                            {/* 주요 공유 채널 버튼 그리드 */}
                            <HStack justify="center" gap={8} py={2} mb={6}>
                                {/* 1. 카카오톡 */}
                                <VStack
                                    as="button"
                                    onClick={handleKakaoShare}
                                    cursor="pointer"
                                    gap={2}
                                    transition="all 0.2s"
                                    _hover={{ transform: 'translateY(-2px)' }}
                                >
                                    <Flex
                                        w="58px"
                                        h="58px"
                                        borderRadius="20px"
                                        bg="#FEE500"
                                        align="center"
                                        justify="center"
                                        boxShadow="0 6px 16px rgba(254, 229, 0, 0.4)"
                                    >
                                        {/* 공식 카카오 말풍선 SVG 아이콘 */}
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="#191919">
                                            <path d="M12 3C6.477 3 2 6.477 2 10.764c0 2.766 1.875 5.187 4.707 6.544l-.958 3.55a.44.44 0 0 0 .61.503l4.24-2.802c.453.053.918.083 1.401.083 5.523 0 10-3.477 10-7.764C22 6.477 17.523 3 12 3z" />
                                        </svg>
                                    </Flex>
                                    <Text fontSize="12px" fontWeight="700" color="var(--waba-ink)">
                                        카카오톡
                                    </Text>
                                </VStack>

                                {/* 2. 링크 복사 */}
                                <VStack
                                    as="button"
                                    onClick={handleCopyLink}
                                    cursor="pointer"
                                    gap={2}
                                    transition="all 0.2s"
                                    _hover={{ transform: 'translateY(-2px)' }}
                                >
                                    <Flex
                                        w="58px"
                                        h="58px"
                                        borderRadius="20px"
                                        bg={isCopied ? "green.500" : "var(--waba-surface)"}
                                        color={isCopied ? "white" : "var(--waba-ink)"}
                                        align="center"
                                        justify="center"
                                        boxShadow="0 6px 16px rgba(26, 28, 30, 0.08)"
                                        transition="all 0.2s"
                                    >
                                        {isCopied ? <Check size={22} /> : <Link2 size={22} />}
                                    </Flex>
                                    <Text fontSize="12px" fontWeight="700" color="var(--waba-ink)">
                                        {isCopied ? "복사 완료!" : "링크 복사"}
                                    </Text>
                                </VStack>
                            </HStack>

                            {/* 하단 URL 복사 인풋 바 */}
                            <HStack
                                bg="var(--waba-surface)"
                                p="6px"
                                pl={3}
                                borderRadius="full"
                                border="1px solid"
                                borderColor="var(--waba-line)"
                            >
                                <Text
                                    flex="1"
                                    fontSize="12px"
                                    color="var(--waba-ink-2)"
                                    truncate
                                >
                                    {currentUrl}
                                </Text>
                                <Button
                                    size="xs"
                                    borderRadius="full"
                                    px={4}
                                    h="32px"
                                    bg={isCopied ? "green.500" : "#6338A9"}
                                    color="white"
                                    fontSize="12px"
                                    fontWeight="700"
                                    _hover={{ bg: isCopied ? "green.600" : "#532d91" }}
                                    onClick={handleCopyLink}
                                    gap={1.5}
                                >
                                    {isCopied ? (
                                        <>
                                            <Check size={13} />
                                            <span>복사됨</span>
                                        </>
                                    ) : (
                                        <>
                                            <Copy size={13} />
                                            <span>복사</span>
                                        </>
                                    )}
                                </Button>
                            </HStack>
                        </Dialog.Body>
                    </Dialog.Content>
                </Dialog.Positioner>
            </Portal>
        </Dialog.Root>
    );
}
