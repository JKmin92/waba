'use client'

import React, { useEffect, useState } from 'react';
import {
    Box,
    Button,
    CloseButton,
    Dialog,
    Flex,
    HStack,
    IconButton,
    Input,
    NativeSelect,
    Portal,
    Text,
    VStack,
} from '@chakra-ui/react';
import { Eye, EyeOff } from 'lucide-react';
import { LuShieldAlert } from 'react-icons/lu';
import axiosInstance from '@/utils/api';
import { toaster } from '@/components/ui/toaster';

interface WithdrawAccountModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    nickname?: string | null;
    email?: string | null;
    hasLocalPassword?: boolean;
    onWithdrawn: () => void;
}

export default function WithdrawAccountModal({
    open,
    onOpenChange,
    nickname,
    email,
    hasLocalPassword = true,
    onWithdrawn,
}: WithdrawAccountModalProps) {
    const [deleteContent, setDeleteContent] = useState(false);
    const [reason, setReason] = useState('');
    const [currentPassword, setCurrentPassword] = useState('');
    const [confirmText, setConfirmText] = useState('');
    const [showPw, setShowPw] = useState(false);
    const [agreed, setAgreed] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (open) {
            setDeleteContent(false);
            setReason('');
            setCurrentPassword('');
            setConfirmText('');
            setShowPw(false);
            setAgreed(false);
            setSubmitting(false);
        }
    }, [open]);

    const displayNickname = nickname || '회원';

    const handleWithdraw = async () => {
        if (!agreed) {
            toaster.create({ title: '안내 사항 및 영구 파기에 동의해주세요.', type: 'warning' });
            return;
        }
        if (hasLocalPassword !== false) {
            if (!currentPassword) {
                toaster.create({ title: '현재 비밀번호를 입력해주세요.', type: 'warning' });
                return;
            }
        } else {
            if (confirmText.trim() !== '탈퇴합니다') {
                toaster.create({ title: '"탈퇴합니다"를 정확히 입력해주세요.', type: 'warning' });
                return;
            }
        }

        setSubmitting(true);
        try {
            await axiosInstance.post('/user/withdraw', {
                currentPassword: hasLocalPassword !== false ? currentPassword : undefined,
                confirmText: hasLocalPassword === false ? confirmText.trim() : undefined,
                deleteContent,
                reason: reason || undefined,
            });
            onOpenChange(false);
            onWithdrawn();
        } catch (err: any) {
            toaster.create({
                title: err?.response?.data?.message || '회원 탈퇴 처리에 실패했습니다.',
                type: 'error',
            });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog.Root open={open} onOpenChange={(e) => onOpenChange(e.open)} placement="center">
            <Portal>
                <Dialog.Backdrop bg="blackAlpha.600" backdropFilter="blur(6px)" zIndex={1400} />
                <Dialog.Positioner zIndex={1401} p={4}>
                    <Dialog.Content
                        maxW="520px"
                        w="full"
                        maxH="90vh"
                        display="flex"
                        flexDirection="column"
                        overflow="hidden"
                        p={0}
                        borderRadius="28px"
                        bg="var(--waba-card)"
                        border="1px solid"
                        borderColor="var(--waba-line)"
                        boxShadow="0 24px 48px -12px rgba(26, 28, 30, 0.25)"
                    >
                        <Dialog.CloseTrigger asChild position="absolute" top={5} right={5} zIndex={2}>
                            <CloseButton
                                size="sm"
                                rounded="full"
                                bg="var(--waba-surface)"
                                color="var(--waba-ink)"
                                _hover={{ bg: 'var(--waba-line)' }}
                            />
                        </Dialog.CloseTrigger>

                        {/* Header */}
                        <Dialog.Header flexShrink={0} px={{ base: 6, md: 7 }} pt={{ base: 6, md: 7 }} pb={4}>
                            <Box pr={8}>
                                <Dialog.Title fontSize="20px" fontWeight="800" color="var(--waba-ink)">
                                    회원 탈퇴
                                </Dialog.Title>
                                <Text fontSize="12px" color="var(--waba-ink-3)" mt={0.5}>
                                    {email ? `${email} 계정의 ` : ''}탈퇴 전 아래 안내 사항을 꼭 확인해주세요.
                                </Text>
                            </Box>
                        </Dialog.Header>

                        {/* Body */}
                        <Dialog.Body
                            flex={1}
                            minH={0}
                            overflowY="auto"
                            overflowX="hidden"
                            px={{ base: 6, md: 7 }}
                            py={2}
                            css={{
                                scrollbarWidth: 'none',
                                msOverflowStyle: 'none',
                                '&::-webkit-scrollbar': { display: 'none' },
                            }}
                        >
                            <VStack align="stretch" gap={4}>
                                {/* 30일 유예 & 영구 파기 안내 */}
                                <Box
                                    p={4}
                                    borderRadius="16px"
                                    bg="rgba(239, 68, 68, 0.08)"
                                    border="1px solid"
                                    borderColor="rgba(239, 68, 68, 0.28)"
                                >
                                    <HStack gap={2} mb={2} color="#EF4444">
                                        <LuShieldAlert size={16} />
                                        <Text fontSize="12.5px" fontWeight="800">
                                            30일 유예 및 영구 파기 안내
                                        </Text>
                                    </HStack>
                                    <VStack align="stretch" gap={1.5} fontSize="12px" color="var(--waba-ink-2)" lineHeight="1.55">
                                        <Text>
                                            • 탈퇴 후 30일 동안은 복구 신청이 가능하며, 해당 기간 내 동일 이메일로 재가입할 수 없습니다.
                                        </Text>
                                        <Text>
                                            • 30일이 지나면 이메일·닉네임·프로필 이미지·반려동물·수첩 및 관련 이미지 파일이 서버에서 영구 삭제됩니다.
                                        </Text>
                                    </VStack>
                                </Box>

                                {/* 작성한 게시글 · 댓글 처리 선택 */}
                                <Box>
                                    <Text fontSize="12.5px" fontWeight="800" color="var(--waba-ink)" mb={2}>
                                        작성한 게시글 · 댓글 처리
                                    </Text>
                                    <VStack align="stretch" gap={2.5}>
                                        {[
                                            {
                                                value: false,
                                                title: '게시글 · 댓글 유지',
                                                desc: `작성한 글을 남깁니다. (0~30일 '${displayNickname} [탈퇴한 회원]' → 30일 후 '탈퇴회원_XXXX' 표시)`,
                                            },
                                            {
                                                value: true,
                                                title: '게시글 · 댓글 함께 삭제',
                                                desc: '탈퇴 즉시 글을 숨김(접속 차단) 처리하며, 30일 후 글·댓글·첨부 이미지를 서버에서 영구 삭제합니다.',
                                            },
                                        ].map((opt) => {
                                            const active = deleteContent === opt.value;
                                            return (
                                                <Box
                                                    key={String(opt.value)}
                                                    p={3.5}
                                                    borderRadius="14px"
                                                    bg={active ? 'var(--waba-purple-soft)' : 'var(--waba-surface)'}
                                                    border="1px solid"
                                                    borderColor={active ? 'var(--waba-purple-border)' : 'var(--waba-line)'}
                                                    cursor="pointer"
                                                    onClick={() => setDeleteContent(opt.value)}
                                                >
                                                    <HStack gap={2} mb={1}>
                                                        <Box
                                                            w="16px"
                                                            h="16px"
                                                            borderRadius="full"
                                                            border="2px solid"
                                                            borderColor={active ? '#6338A9' : 'var(--waba-ink-3)'}
                                                            display="flex"
                                                            alignItems="center"
                                                            justifyContent="center"
                                                        >
                                                            {active && <Box w="8px" h="8px" borderRadius="full" bg="#6338A9" />}
                                                        </Box>
                                                        <Text fontSize="13px" fontWeight="800" color="var(--waba-ink)">
                                                            {opt.title}
                                                        </Text>
                                                    </HStack>
                                                    <Text fontSize="11.5px" color="var(--waba-ink-3)" pl="24px" lineHeight="1.5">
                                                        {opt.desc}
                                                    </Text>
                                                </Box>
                                            );
                                        })}
                                    </VStack>
                                </Box>

                                {/* 탈퇴 사유 */}
                                <Box>
                                    <Text fontSize="12.5px" fontWeight="800" color="var(--waba-ink)" mb={1.5}>
                                        탈퇴 사유 (선택)
                                    </Text>
                                    <NativeSelect.Root size="sm">
                                        <NativeSelect.Field
                                            value={reason}
                                            onChange={(e) => setReason(e.target.value)}
                                            h="40px"
                                            borderRadius="14px"
                                            bg="var(--waba-surface)"
                                            borderColor="var(--waba-line)"
                                            color="var(--waba-ink)"
                                            fontSize="13px"
                                        >
                                            <option value="">선택 안 함</option>
                                            <option value="LOW_USAGE">서비스 이용 빈도가 낮음</option>
                                            <option value="PRIVACY">개인정보 보호 우려</option>
                                            <option value="REJOIN">새 계정으로 재가입 희망</option>
                                            <option value="OTHER">기타</option>
                                        </NativeSelect.Field>
                                    </NativeSelect.Root>
                                </Box>

                                {/* 본인 확인 입력 */}
                                {hasLocalPassword !== false ? (
                                    <Box>
                                        <Text fontSize="12.5px" fontWeight="800" color="var(--waba-ink)" mb={1.5}>
                                            현재 비밀번호 확인 *
                                        </Text>
                                        <Box position="relative">
                                            <Input
                                                type={showPw ? 'text' : 'password'}
                                                value={currentPassword}
                                                onChange={(e) => setCurrentPassword(e.target.value)}
                                                placeholder="현재 비밀번호를 입력하세요"
                                                h="42px"
                                                borderRadius="14px"
                                                bg="var(--waba-surface)"
                                                borderColor="var(--waba-line)"
                                                color="var(--waba-ink)"
                                                pr={11}
                                                fontSize="13.5px"
                                                autoComplete="current-password"
                                            />
                                            <IconButton
                                                type="button"
                                                aria-label={showPw ? '비밀번호 숨기기' : '비밀번호 보기'}
                                                variant="ghost"
                                                size="sm"
                                                position="absolute"
                                                right={2}
                                                top="50%"
                                                transform="translateY(-50%)"
                                                color="var(--waba-ink-3)"
                                                onClick={() => setShowPw((v) => !v)}
                                            >
                                                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                                            </IconButton>
                                        </Box>
                                    </Box>
                                ) : (
                                    <Box>
                                        <Text fontSize="12.5px" fontWeight="800" color="var(--waba-ink)" mb={1.5}>
                                            본인 확인 문구 입력 (&quot;탈퇴합니다&quot;) *
                                        </Text>
                                        <Input
                                            value={confirmText}
                                            onChange={(e) => setConfirmText(e.target.value)}
                                            placeholder="탈퇴합니다"
                                            h="42px"
                                            borderRadius="14px"
                                            bg="var(--waba-surface)"
                                            borderColor="var(--waba-line)"
                                            color="var(--waba-ink)"
                                            fontSize="13.5px"
                                        />
                                    </Box>
                                )}

                                {/* 필수 동의 */}
                                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                                    <input
                                        type="checkbox"
                                        checked={agreed}
                                        onChange={(e) => setAgreed(e.target.checked)}
                                        style={{ width: 16, height: 16, accentColor: '#EF4444', cursor: 'pointer' }}
                                    />
                                    <Text fontSize="12.5px" fontWeight="700" color="var(--waba-ink)">
                                        위 안내와 30일 후 영구 파기에 동의합니다.
                                    </Text>
                                </label>
                            </VStack>
                        </Dialog.Body>

                        {/* Footer */}
                        <HStack
                            flexShrink={0}
                            justify="flex-end"
                            gap={3}
                            px={{ base: 6, md: 7 }}
                            pb={{ base: 5, md: 6 }}
                            pt={4}
                            borderTop="1px solid"
                            borderColor="var(--waba-line)"
                        >
                            <Button
                                type="button"
                                variant="outline"
                                rounded="full"
                                px={6}
                                h="42px"
                                fontSize="13.5px"
                                fontWeight="600"
                                borderColor="var(--waba-line)"
                                color="var(--waba-ink)"
                                _hover={{ bg: 'var(--waba-surface)' }}
                                onClick={() => onOpenChange(false)}
                            >
                                취소
                            </Button>
                            <Button
                                type="button"
                                rounded="full"
                                px={6}
                                h="42px"
                                bg="#EF4444"
                                color="#FFFFFF"
                                _hover={{ bg: '#DC2626' }}
                                fontSize="13.5px"
                                fontWeight="700"
                                loading={submitting}
                                onClick={handleWithdraw}
                            >
                                회원 탈퇴 진행
                            </Button>
                        </HStack>
                    </Dialog.Content>
                </Dialog.Positioner>
            </Portal>
        </Dialog.Root>
    );
}
