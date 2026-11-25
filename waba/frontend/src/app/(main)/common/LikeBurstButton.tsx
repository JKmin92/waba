'use client'

import React, { useEffect, useRef, useState } from 'react';
import { Box, chakra } from '@chakra-ui/react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { LuHeart } from 'react-icons/lu';

const BURST_COLORS = [
    '#6338A9',
    '#EF4444',
    '#8B5CF6',
    '#FF4D6D',
    '#C69BFF',
    '#FF7A99',
    '#7C3AED',
    '#F43F5E',
];

const BURST_ANGLES = Array.from({ length: 8 }, (_, i) => (i / 8) * Math.PI * 2 + 0.2);

interface LikeBurstButtonProps {
    isLiked: boolean;
    likeCount: number;
    onToggle: () => void;
    variant?: 'pill' | 'ghost';
    size?: 'md' | 'sm';
    disabled?: boolean;
    ariaLabel?: string;
}

export default function LikeBurstButton({
    isLiked,
    likeCount,
    onToggle,
    variant = 'pill',
    size = 'md',
    disabled = false,
    ariaLabel,
}: LikeBurstButtonProps) {
    const prefersReducedMotion = useReducedMotion();

    const [burstKey, setBurstKey] = useState(0);
    const [heartAnim, setHeartAnim] = useState<'none' | 'like' | 'unlike'>('none');
    const [rollDir, setRollDir] = useState<1 | -1>(1);

    const pendingUserActionRef = useRef(false);
    const pendingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const prevLikedRef = useRef(isLiked);
    const prevCountRef = useRef(likeCount);
    const hasMountedRef = useRef(false);

    useEffect(() => {
        return () => {
            if (pendingTimerRef.current) {
                clearTimeout(pendingTimerRef.current);
            }
        };
    }, []);

    useEffect(() => {
        if (!hasMountedRef.current) {
            hasMountedRef.current = true;
            prevLikedRef.current = isLiked;
            prevCountRef.current = likeCount;
            return;
        }

        if (likeCount !== prevCountRef.current) {
            setRollDir(likeCount > prevCountRef.current ? 1 : -1);
            prevCountRef.current = likeCount;
        }

        const prevLiked = prevLikedRef.current;
        if (isLiked !== prevLiked) {
            prevLikedRef.current = isLiked;

            if (pendingUserActionRef.current) {
                pendingUserActionRef.current = false;
                if (pendingTimerRef.current) {
                    clearTimeout(pendingTimerRef.current);
                    pendingTimerRef.current = null;
                }

                if (!prefersReducedMotion) {
                    if (!prevLiked && isLiked) {
                        setBurstKey((k) => k + 1);
                        setHeartAnim('like');
                    } else if (prevLiked && !isLiked) {
                        setHeartAnim('unlike');
                    }
                }
            }
        }
    }, [isLiked, likeCount, prefersReducedMotion]);

    const handleClick = () => {
        if (disabled) return;
        pendingUserActionRef.current = true;
        if (pendingTimerRef.current) {
            clearTimeout(pendingTimerRef.current);
        }
        pendingTimerRef.current = setTimeout(() => {
            pendingUserActionRef.current = false;
            pendingTimerRef.current = null;
        }, 400);
        onToggle();
    };

    const isPill = variant === 'pill';
    const iconSize = isPill ? 14 : 13;
    const formattedCount = new Intl.NumberFormat('ko-KR').format(likeCount);

    const heartAnimate =
        prefersReducedMotion || heartAnim === 'none'
            ? { scale: 1, scaleX: 1, scaleY: 1 }
            : heartAnim === 'like'
                ? { scaleX: [1, 1.24, 0.9, 1.05, 1], scaleY: [1, 0.62, 1.18, 0.96, 1] }
                : { scale: [1, 0.84, 1] };

    const heartTransition =
        heartAnim === 'like'
            ? { duration: 0.42, ease: [0.22, 1, 0.36, 1] as const }
            : { duration: 0.22, ease: 'easeOut' as const };

    return (
        <chakra.button
            type="button"
            aria-label={ariaLabel}
            aria-pressed={isLiked}
            disabled={disabled}
            onClick={handleClick}
            position="relative"
            overflow="visible"
            display="inline-flex"
            alignItems="center"
            justifyContent="center"
            flexShrink={0}
            cursor={disabled ? 'not-allowed' : 'pointer'}
            opacity={disabled ? 0.65 : 1}
            transition="background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease"
            {...(isPill
                ? {
                      h: '34px',
                      px: { base: '10px', md: '12px' },
                      borderRadius: '999px',
                      border: '1px solid',
                      gap: '6px',
                      fontSize: '12px',
                      bg: isLiked ? 'rgba(239, 68, 68, 0.1)' : 'var(--waba-card)',
                      borderColor: isLiked ? 'red.300' : 'var(--waba-line)',
                      color: isLiked ? 'red.500' : 'var(--waba-ink-2)',
                      fontWeight: isLiked ? '700' : '600',
                  }
                : {
                      h: '24px',
                      px: '6px',
                      borderRadius: '999px',
                      gap: '4px',
                      fontSize: 'xs',
                      bg: isLiked ? 'rgba(239, 68, 68, 0.08)' : 'transparent',
                      color: isLiked ? 'red.500' : 'var(--waba-ink-3)',
                      fontWeight: isLiked ? '700' : '500',
                      _hover: isLiked
                          ? { bg: 'rgba(239, 68, 68, 0.14)' }
                          : { bg: 'var(--waba-surface)', color: 'var(--waba-ink-2)' },
                  })}
        >
            {/* Heart Icon + 8-dot Burst Ring */}
            <Box position="relative" display="inline-flex" alignItems="center" justifyContent="center">
                <motion.span
                    style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                    animate={heartAnimate}
                    transition={heartTransition}
                    onAnimationComplete={() => setHeartAnim('none')}
                >
                    <LuHeart
                        size={iconSize}
                        fill={isLiked ? '#EF4444' : 'none'}
                        color={isLiked ? '#EF4444' : 'currentColor'}
                    />
                </motion.span>

                {!prefersReducedMotion && (
                    <AnimatePresence>
                        {burstKey > 0 && (
                            <Box
                                key={burstKey}
                                position="absolute"
                                top="50%"
                                left="50%"
                                pointerEvents="none"
                                zIndex={20}
                            >
                                {BURST_ANGLES.map((angle, i) => {
                                    const r =
                                        size === 'md'
                                            ? i % 2 === 0
                                                ? 24
                                                : 30
                                            : i % 2 === 0
                                                ? 15
                                                : 19;
                                    const dotSize =
                                        size === 'md'
                                            ? i % 2 === 0
                                                ? 5
                                                : 4
                                            : i % 2 === 0
                                                ? 4
                                                : 3;
                                    const tx = Math.cos(angle) * r;
                                    const ty = Math.sin(angle) * r;
                                    return (
                                        <motion.span
                                            key={i}
                                            style={{
                                                position: 'absolute',
                                                width: `${dotSize}px`,
                                                height: `${dotSize}px`,
                                                marginLeft: `${-dotSize / 2}px`,
                                                marginTop: `${-dotSize / 2}px`,
                                                borderRadius: '9999px',
                                                backgroundColor: BURST_COLORS[i],
                                            }}
                                            initial={{ x: 0, y: 0, scale: 1, opacity: 1 }}
                                            animate={{ x: tx, y: ty, scale: 0.3, opacity: 0 }}
                                            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                                        />
                                    );
                                })}
                            </Box>
                        )}
                    </AnimatePresence>
                )}
            </Box>

            {/* Rolling Counter */}
            <Box
                as="span"
                display="inline-flex"
                alignItems="center"
                overflow="hidden"
                fontVariantNumeric="tabular-nums"
                lineHeight="1.2"
            >
                {prefersReducedMotion ? (
                    <span>{formattedCount}</span>
                ) : (
                    <AnimatePresence mode="popLayout" initial={false}>
                        <motion.span
                            key={likeCount}
                            style={{ display: 'inline-block' }}
                            initial={{ y: rollDir > 0 ? 12 : -12, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: rollDir > 0 ? -12 : 12, opacity: 0 }}
                            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                        >
                            {formattedCount}
                        </motion.span>
                    </AnimatePresence>
                )}
            </Box>
        </chakra.button>
    );
}
