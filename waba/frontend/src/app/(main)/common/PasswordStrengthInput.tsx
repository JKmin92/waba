'use client'

import React, { useState } from 'react';
import { Box, Flex, HStack, IconButton, Input, Text } from '@chakra-ui/react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Check, X } from 'lucide-react';
import { evaluatePasswordStrength } from '@/utils/passwordPolicy';

interface PasswordStrengthInputProps {
    value: string;
    onChange: (val: string) => void;
    email?: string | null;
    placeholder?: string;
    required?: boolean;
    autoComplete?: string;
    inputVariant?: 'join' | 'profile';
    disabled?: boolean;
}

export default function PasswordStrengthInput({
    value,
    onChange,
    email,
    placeholder = '영문, 숫자, 특수문자 조합 8자 이상',
    required = false,
    autoComplete = 'new-password',
    inputVariant = 'join',
    disabled = false,
}: PasswordStrengthInputProps) {
    const [showPw, setShowPw] = useState(false);
    const prefersReducedMotion = useReducedMotion();

    const strength = evaluatePasswordStrength(value, email);
    const isJoin = inputVariant === 'join';
    const hasEmailOverlapError = value.length > 0 && !strength.checks.noEmailOverlap;

    const rules = [
        { key: 'minLength', label: '8자 이상', ok: strength.checks.minLength, isOverlap: false },
        { key: 'hasLetter', label: '영문', ok: strength.checks.hasLetter, isOverlap: false },
        { key: 'hasNumber', label: '숫자', ok: strength.checks.hasNumber, isOverlap: false },
        { key: 'hasSpecial', label: '특수문자', ok: strength.checks.hasSpecial, isOverlap: false },
        { key: 'noEmailOverlap', label: '아이디(이메일) 5자 중복 불가', ok: strength.checks.noEmailOverlap, isOverlap: true },
    ];

    return (
        <Box w="full">
            <Box position="relative" w="full">
                <Input
                    type={showPw ? 'text' : 'password'}
                    placeholder={placeholder}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    required={required}
                    autoComplete={autoComplete}
                    disabled={disabled}
                    {...(isJoin
                        ? {
                              h: '48px',
                              borderRadius: '16px',
                              bg: 'var(--waba-surface)',
                              color: 'var(--waba-ink)',
                              _placeholder: { color: 'var(--waba-ink-3)' },
                              border: '1px solid',
                              borderColor: hasEmailOverlapError ? 'red.400' : 'var(--waba-line)',
                              px: 5,
                              pr: 12,
                              fontSize: '14px',
                              _focus: {
                                  borderColor: hasEmailOverlapError ? 'red.500' : '#6338A9',
                                  bg: 'var(--waba-card)',
                                  outline: 'none',
                              },
                          }
                        : {
                              h: '44px',
                              borderRadius: '16px',
                              bg: 'var(--waba-surface)',
                              border: '1px solid',
                              borderColor: hasEmailOverlapError ? 'red.400' : 'var(--waba-line)',
                              px: 4,
                              pr: 11,
                              fontSize: '14px',
                              color: 'var(--waba-ink)',
                              _placeholder: { color: 'var(--waba-ink-3)' },
                              _focus: {
                                  borderColor: hasEmailOverlapError ? 'red.500' : '#6338A9',
                                  outline: 'none',
                              },
                          })}
                />
                <IconButton
                    type="button"
                    aria-label={showPw ? '비밀번호 숨기기' : '비밀번호 보기'}
                    variant="ghost"
                    size="sm"
                    position="absolute"
                    right={isJoin ? 3 : 2}
                    top="50%"
                    transform="translateY(-50%)"
                    color="var(--waba-ink-3)"
                    _hover={{ color: 'var(--waba-ink)' }}
                    onClick={() => setShowPw((v) => !v)}
                    disabled={disabled}
                >
                    <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <path d="M2 12s3.5-6.5 10-6.5S22 12 22 12s-3.5 6.5-10 6.5S2 12 2 12Z" />
                        <motion.circle
                            cx="12"
                            cy="12"
                            r="2.8"
                            style={{ transformOrigin: '12px 12px' }}
                            initial={false}
                            animate={{ scale: showPw ? 1 : 0.5 }}
                            transition={
                                prefersReducedMotion
                                    ? { duration: 0 }
                                    : { type: 'spring', stiffness: 300, damping: 24 }
                            }
                        />
                        <motion.path
                            d="M4.5 4.5l15 15"
                            strokeDasharray="22"
                            initial={false}
                            animate={{ strokeDashoffset: showPw ? 22 : 0 }}
                            transition={
                                prefersReducedMotion
                                    ? { duration: 0 }
                                    : { type: 'spring', stiffness: 300, damping: 24 }
                            }
                        />
                    </svg>
                </IconButton>
            </Box>

            {/* 4-Segment Staggered Spring Meter Bars */}
            <Flex gap="6px" mt="10px">
                {[0, 1, 2, 3].map((i) => (
                    <Box
                        key={i}
                        flex={1}
                        h="5px"
                        borderRadius="3px"
                        bg="rgba(148, 163, 184, 0.22)"
                        overflow="hidden"
                    >
                        <motion.div
                            style={{ height: '100%', borderRadius: '3px' }}
                            initial={false}
                            animate={{
                                width: i < strength.score ? '100%' : '0%',
                                backgroundColor: strength.color,
                            }}
                            transition={
                                prefersReducedMotion
                                    ? { duration: 0 }
                                    : {
                                          width: {
                                              type: 'spring',
                                              stiffness: 260,
                                              damping: 24,
                                              delay: i * 0.06,
                                          },
                                          backgroundColor: { duration: 0.2 },
                                      }
                            }
                        />
                    </Box>
                ))}
            </Flex>

            {/* Footer Row */}
            <Flex justify="space-between" align="center" mt="8px" fontSize="12px" minH="18px">
                <Box>
                    <AnimatePresence mode="wait" initial={false}>
                        <motion.span
                            key={strength.label || 'empty'}
                            style={{
                                display: 'inline-block',
                                color: strength.color,
                                fontWeight: 700,
                            }}
                            initial={prefersReducedMotion ? false : { opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={prefersReducedMotion ? undefined : { opacity: 0, y: -4 }}
                            transition={
                                prefersReducedMotion
                                    ? { duration: 0 }
                                    : { type: 'spring', stiffness: 300, damping: 24 }
                            }
                        >
                            {strength.label}
                        </motion.span>
                    </AnimatePresence>
                </Box>
                <Text fontSize="11px" color="var(--waba-ink-3)">
                    8자 이상 · 영문·숫자·특수문자
                </Text>
            </Flex>

            {/* Compact Live Rule Pills */}
            <Flex flexWrap="wrap" gap="6px" mt="8px">
                {rules.map((rule) => {
                    const active = value.length > 0;
                    const violatedOverlap = active && rule.isOverlap && !rule.ok;
                    const satisfied = active && rule.ok;

                    const bg = violatedOverlap
                        ? 'rgba(239, 68, 68, 0.12)'
                        : satisfied
                            ? 'rgba(34, 197, 94, 0.12)'
                            : 'var(--waba-surface)';
                    const color = violatedOverlap
                        ? '#EF4444'
                        : satisfied
                            ? '#16A34A'
                            : 'var(--waba-ink-3)';
                    const borderColor = violatedOverlap
                        ? 'rgba(239, 68, 68, 0.35)'
                        : satisfied
                            ? 'rgba(34, 197, 94, 0.3)'
                            : 'transparent';

                    return (
                        <HStack
                            key={rule.key}
                            gap={1}
                            px={2}
                            py="2px"
                            borderRadius="999px"
                            bg={bg}
                            color={color}
                            border="1px solid"
                            borderColor={borderColor}
                            fontSize="10.5px"
                            fontWeight="700"
                            transition="all 0.15s ease"
                        >
                            {violatedOverlap ? (
                                <X size={11} />
                            ) : satisfied ? (
                                <Check size={11} />
                            ) : null}
                            <Text>{rule.label}</Text>
                        </HStack>
                    );
                })}
            </Flex>
        </Box>
    );
}
