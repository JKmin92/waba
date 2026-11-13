'use client'

import React, { useState } from 'react';
import { Box, Button, Text, VStack } from '@chakra-ui/react';
import { Eye, EyeOff } from 'lucide-react';

interface SensitiveImageOverlayProps {
    /** 민감한 이미지 여부 */
    isSensitive?: boolean | number | null;
    /** 좁은 카드(피드/검색 등)용 컴팩트 레이아웃 여부 */
    compact?: boolean;
}

export default function SensitiveImageOverlay({
    isSensitive,
    compact = false,
}: SensitiveImageOverlayProps) {
    const [revealed, setRevealed] = useState(false);

    if (!isSensitive) {
        return null;
    }

    const handleReveal = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setRevealed(true);
    };

    const handleHideAgain = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setRevealed(false);
    };

    const handleBlockClick = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
    };

    if (revealed) {
        return (
            <Button
                position="absolute"
                top={compact ? 2.5 : 3.5}
                right={compact ? 2.5 : 3.5}
                zIndex={25}
                size="xs"
                h="auto"
                py={compact ? 1 : 1.5}
                px={compact ? 2.5 : 3}
                bg="rgba(15, 17, 23, 0.72)"
                backdropFilter="blur(8px)"
                color="white"
                border="1px solid rgba(255, 255, 255, 0.22)"
                rounded="full"
                fontSize={compact ? '11px' : '12px'}
                fontWeight="700"
                gap={1}
                _hover={{ bg: 'rgba(15, 17, 23, 0.92)' }}
                transition="all 0.2s"
                onClick={handleHideAgain}
            >
                <EyeOff size={compact ? 11 : 13} />
                다시 가리기
            </Button>
        );
    }

    return (
        <Box
            position="absolute"
            inset={0}
            zIndex={25}
            bg="rgba(22, 24, 28, 0.94)"
            backdropFilter="blur(24px)"
            display="flex"
            alignItems="center"
            justifyContent="center"
            p={compact ? 3 : 6}
            textAlign="center"
            onClick={handleBlockClick}
            userSelect="none"
        >
            <VStack gap={compact ? 2.5 : 3.5} maxW="240px">
                <Box
                    w={compact ? '34px' : '44px'}
                    h={compact ? '34px' : '44px'}
                    borderRadius="full"
                    bg="rgba(255, 255, 255, 0.12)"
                    border="1px solid rgba(255, 255, 255, 0.18)"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    color="whiteAlpha.900"
                >
                    <EyeOff size={compact ? 16 : 20} />
                </Box>

                <Text
                    fontSize={compact ? '12px' : '14px'}
                    fontWeight="700"
                    color="white"
                    lineHeight="1.45"
                    letterSpacing="-0.01em"
                >
                    혐오감이 있을 수 있는 이미지입니다
                </Text>

                <Button
                    size={compact ? 'xs' : 'sm'}
                    bg="rgba(255, 255, 255, 0.18)"
                    color="white"
                    border="1px solid rgba(255, 255, 255, 0.3)"
                    rounded="full"
                    px={compact ? 3.5 : 5}
                    fontWeight="700"
                    fontSize={compact ? '11px' : '12px'}
                    _hover={{ bg: 'white', color: 'waba.charcoal' }}
                    transition="all 0.2s"
                    onClick={handleReveal}
                >
                    <Eye size={compact ? 12 : 14} style={{ marginRight: '5px' }} />
                    표시하기
                </Button>
            </VStack>
        </Box>
    );
}
