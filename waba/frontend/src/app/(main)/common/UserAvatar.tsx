'use client'

import React, { useEffect, useState } from 'react';
import { Box, Image } from '@chakra-ui/react';
import { LuDog, LuUserRound } from 'react-icons/lu';

export type UserAvatarSize = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

const SIZE_MAP: Record<UserAvatarSize, { box: string; icon: number }> = {
    '2xs': { box: '20px', icon: 11 },
    xs: { box: '24px', icon: 13 },
    sm: { box: '32px', icon: 16 },
    md: { box: '40px', icon: 20 },
    lg: { box: '48px', icon: 24 },
    xl: { box: '64px', icon: 30 },
    '2xl': { box: '80px', icon: 36 },
};

interface UserAvatarProps {
    src?: string | null;
    alt?: string;
    size?: UserAvatarSize;
    iconSize?: number;
    w?: any;
    h?: any;
    border?: string;
    borderColor?: string;
    boxShadow?: string;
    bg?: string;
    color?: string;
    fallbackType?: 'user' | 'pet';
}

export default function UserAvatar({
    src,
    alt = '프로필',
    size = 'sm',
    iconSize,
    w,
    h,
    border,
    borderColor,
    boxShadow,
    bg = 'var(--waba-surface, #F6EBFB)',
    color = 'var(--waba-ink-3, #6338A9)',
    fallbackType = 'user',
}: UserAvatarProps) {
    const [imgError, setImgError] = useState(false);

    useEffect(() => {
        setImgError(false);
    }, [src]);

    const preset = SIZE_MAP[size] || SIZE_MAP.sm;
    const showImage = Boolean(src && src.trim() && !imgError);

    return (
        <Box
            w={w ?? preset.box}
            h={h ?? preset.box}
            borderRadius="full"
            overflow="hidden"
            flexShrink={0}
            display="flex"
            alignItems="center"
            justifyContent="center"
            bg={bg}
            color={color}
            border={border}
            borderColor={borderColor}
            boxShadow={boxShadow}
        >
            {showImage ? (
                <Image
                    src={src!}
                    alt={alt}
                    w="100%"
                    h="100%"
                    objectFit="cover"
                    display="block"
                    onError={() => setImgError(true)}
                />
            ) : fallbackType === 'pet' ? (
                <LuDog size={iconSize ?? preset.icon} />
            ) : (
                <LuUserRound size={iconSize ?? preset.icon} />
            )}
        </Box>
    );
}
