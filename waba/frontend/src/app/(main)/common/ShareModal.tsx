'use client';

import { useEffect, useState } from "react";
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

    useEffect(() => {
        if (typeof window !== 'undefined') {
            setCurrentUrl(window.location.href);

            // 카카오 SDK 스크립트 동적 로드 (미로드 시)
            if (!window.Kakao) {
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
        }
    }, []);

    // 1. 링크 복사 핸들러
    const handleCopyLink = async () => {
        const url = currentUrl || (typeof window !== 'undefined' ? window.location.href : '');
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
    const handleKakaoShare = () => {
        const shareUrl = currentUrl || (typeof window !== 'undefined' ? window.location.href : '');
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
                        bg="white"
                    >
                        {/* 닫기 버튼 */}
                        <Dialog.CloseTrigger asChild position="absolute" top={4} right={4}>
                            <CloseButton size="sm" borderRadius="full" bg="waba.subtle" />
                        </Dialog.CloseTrigger>

                        {/* 헤더 */}
                        <Dialog.Header p={0} mb={4}>
                            <Dialog.Title fontSize="18px" fontWeight="800" color="waba.charcoal">
                                공유하기
                            </Dialog.Title>
                            <Text fontSize="12px" color="waba.faint" mt={0.5}>
                                친구들과 감각적인 반려동물 공간을 함께 나눠보세요
                            </Text>
                        </Dialog.Header>

                        <Dialog.Body p={0}>
                            {/* 공유 대상 포스트 미니 프리뷰 */}
                            {title && (
                                <HStack
                                    p={3}
                                    borderRadius="18px"
                                    bg="waba.subtle"
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
                                            color="waba.purple"
                                            letterSpacing="0.08em"
                                        >
                                            WABA CURATED
                                        </Text>
                                        <Text
                                            fontSize="13px"
                                            fontWeight="700"
                                            color="waba.charcoal"
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
                                    <Text fontSize="12px" fontWeight="700" color="waba.charcoal">
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
                                        bg={isCopied ? "green.500" : "waba.subtle"}
                                        color={isCopied ? "white" : "waba.charcoal"}
                                        align="center"
                                        justify="center"
                                        boxShadow="0 6px 16px rgba(26, 28, 30, 0.08)"
                                        transition="all 0.2s"
                                    >
                                        {isCopied ? <Check size={22} /> : <Link2 size={22} />}
                                    </Flex>
                                    <Text fontSize="12px" fontWeight="700" color="waba.charcoal">
                                        {isCopied ? "복사 완료!" : "링크 복사"}
                                    </Text>
                                </VStack>
                            </HStack>

                            {/* 하단 URL 복사 인풋 바 */}
                            <HStack
                                bg="waba.subtle"
                                p="6px"
                                pl={3}
                                borderRadius="full"
                                border="1px solid"
                                borderColor="blackAlpha.100"
                            >
                                <Text
                                    flex="1"
                                    fontSize="12px"
                                    color="waba.muted"
                                    truncate
                                >
                                    {currentUrl}
                                </Text>
                                <Button
                                    size="xs"
                                    borderRadius="full"
                                    px={4}
                                    h="32px"
                                    bg={isCopied ? "green.500" : "waba.charcoal"}
                                    color="white"
                                    fontSize="12px"
                                    fontWeight="700"
                                    _hover={{ bg: isCopied ? "green.600" : "waba.purple" }}
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
