'use client'

import React, { useEffect, useState } from 'react';
import {
    Box,
    Button,
    CloseButton,
    Dialog,
    Flex,
    Grid,
    HStack,
    Input,
    Portal,
    Text,
    Textarea,
    VStack,
} from '@chakra-ui/react';
import axiosInstance from '@/utils/api';
import { toaster } from '@/components/ui/toaster';

const WRITE_ROLE_OPTIONS = [
    { key: 'USER', label: '일반 유저' },
    { key: 'VET', label: '수의사' },
    { key: 'EDITOR', label: '에디터' },
    { key: 'ADMIN', label: '관리자' },
] as const;

interface BoardFormDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    mode: 'create' | 'edit';
    board?: any | null;
    defaultSortOrder?: number;
    onSaved?: () => void;
}

export default function BoardFormDialog({
    open,
    onOpenChange,
    mode,
    board,
    defaultSortOrder = 1,
    onSaved,
}: BoardFormDialogProps) {
    const [boardId, setBoardId] = useState('');
    const [name, setName] = useState('');
    const [sortOrder, setSortOrder] = useState('1');
    const [description, setDescription] = useState('');
    const [minWriteRole, setMinWriteRole] = useState('USER');
    const [allowProductPins, setAllowProductPins] = useState(false);
    const [allowVetVerify, setAllowVetVerify] = useState(false);
    const [isActive, setIsActive] = useState(true);

    const [submitting, setSubmitting] = useState(false);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

    useEffect(() => {
        if (!open) return;
        setDeleteConfirmOpen(false);
        if (mode === 'edit' && board) {
            setBoardId(String(board.id || ''));
            setName(String(board.name || ''));
            setSortOrder(String(board.sort_order ?? 1));
            setDescription(String(board.description || ''));
            setMinWriteRole(String(board.min_write_role || 'USER').toUpperCase());
            setAllowProductPins(Boolean(board.allow_product_pins));
            setAllowVetVerify(Boolean(board.allow_vet_verify));
            setIsActive(board.is_active === undefined ? true : Boolean(board.is_active));
        } else {
            setBoardId('');
            setName('');
            setSortOrder(String(defaultSortOrder));
            setDescription('');
            setMinWriteRole('USER');
            setAllowProductPins(false);
            setAllowVetVerify(false);
            setIsActive(true);
        }
    }, [open, mode, board, defaultSortOrder]);

    const formatDateStr = (d?: string | null) => {
        if (!d) return '-';
        const parsed = new Date(d);
        if (Number.isNaN(parsed.getTime())) return '-';
        return parsed.toLocaleDateString('ko-KR');
    };

    const handleSubmit = async () => {
        const trimmedName = name.trim();
        const parsedSort = Number(sortOrder);
        if (!trimmedName) {
            toaster.create({ title: '게시판 이름을 입력해주세요.', type: 'warning' });
            return;
        }
        if (!parsedSort || parsedSort < 1) {
            toaster.create({ title: '노출 순서는 1 이상의 숫자여야 합니다.', type: 'warning' });
            return;
        }

        if (mode === 'create') {
            const trimmedId = boardId.trim().toUpperCase();
            if (!/^[A-Z0-9_]{2,30}$/.test(trimmedId)) {
                toaster.create({
                    title: '게시판 코드(ID)는 영문 대문자·숫자·밑줄(_) 2~30자로 입력해주세요.',
                    type: 'warning',
                });
                return;
            }
            setSubmitting(true);
            try {
                await axiosInstance.post('/admin/boards', {
                    id: trimmedId,
                    name: trimmedName,
                    sort_order: parsedSort,
                    description: description.trim() || null,
                    min_write_role: minWriteRole,
                    allow_product_pins: allowProductPins,
                    allow_vet_verify: allowVetVerify,
                });
                toaster.create({ title: '새 게시판이 생성되었습니다.', type: 'success' });
                onOpenChange(false);
                onSaved?.();
            } catch (err: any) {
                toaster.create({ title: err?.response?.data?.message || '게시판 생성에 실패했습니다.', type: 'error' });
            } finally {
                setSubmitting(false);
            }
        } else if (board?.id) {
            setSubmitting(true);
            try {
                await axiosInstance.patch(`/admin/boards/${board.id}`, {
                    name: trimmedName,
                    sort_order: parsedSort,
                    description: description.trim() || null,
                    min_write_role: minWriteRole,
                    allow_product_pins: allowProductPins,
                    allow_vet_verify: allowVetVerify,
                    is_active: isActive,
                });
                toaster.create({ title: '게시판 설정이 저장되었습니다.', type: 'success' });
                onOpenChange(false);
                onSaved?.();
            } catch (err: any) {
                toaster.create({ title: err?.response?.data?.message || '게시판 수정에 실패했습니다.', type: 'error' });
            } finally {
                setSubmitting(false);
            }
        }
    };

    const handleDelete = async () => {
        if (!board?.id) return;
        setSubmitting(true);
        try {
            await axiosInstance.delete(`/admin/boards/${board.id}`);
            toaster.create({ title: '게시판이 삭제되었습니다.', type: 'success' });
            onOpenChange(false);
            onSaved?.();
        } catch (err: any) {
            toaster.create({ title: err?.response?.data?.message || '게시판 삭제에 실패했습니다.', type: 'error' });
        } finally {
            setSubmitting(false);
        }
    };

    const canDelete = mode === 'edit' && board && !board.is_core && Number(board.total_post_count || 0) === 0;

    return (
        <Dialog.Root open={open} onOpenChange={(e) => onOpenChange(e.open)} size="lg" placement="center">
            <Portal>
                <Dialog.Backdrop bg="blackAlpha.600" backdropFilter="blur(4px)" zIndex={1400} />
                <Dialog.Positioner zIndex={1401} p={4}>
                    <Dialog.Content
                        bg="var(--waba-card)"
                        borderRadius="24px"
                        border="1px solid"
                        borderColor="var(--waba-line)"
                        p={{ base: 5, md: 6 }}
                        maxW="680px"
                        w="100%"
                        maxH="90vh"
                        display="flex"
                        flexDirection="column"
                        overflow="hidden"
                    >
                        {/* Header */}
                        <Dialog.Header p={0} pb={4} borderBottom="1px solid" borderColor="var(--waba-line)" flexShrink={0}>
                            <Flex justify="space-between" align="flex-start" gap={4} w="100%">
                                {mode === 'edit' && board ? (
                                    <Box flex={1} minW={0}>
                                        <HStack gap={2} mb={1.5} flexWrap="wrap">
                                            <Dialog.Title fontSize="17px" fontWeight="800" color="var(--waba-ink)">
                                                {board.name}
                                            </Dialog.Title>
                                            <Box
                                                bg="var(--waba-surface)"
                                                color="var(--waba-ink-2)"
                                                border="1px solid"
                                                borderColor="var(--waba-line)"
                                                fontSize="11px"
                                                fontWeight="700"
                                                fontFamily="mono"
                                                px={2}
                                                py="1px"
                                                borderRadius="999px"
                                            >
                                                {board.id}
                                            </Box>
                                            <Box
                                                bg={board.is_active ? 'rgba(16, 185, 129, 0.14)' : 'rgba(239, 68, 68, 0.14)'}
                                                color={board.is_active ? '#10B981' : '#EF4444'}
                                                fontSize="10.5px"
                                                fontWeight="800"
                                                px={2}
                                                py="1px"
                                                borderRadius="999px"
                                            >
                                                {board.is_active ? '활성' : '비활성'}
                                            </Box>
                                        </HStack>
                                        <Text fontSize="12px" color="var(--waba-ink-3)">
                                            생성일 {formatDateStr(board.created_at)} · 등록 게시글 {board.total_post_count ?? 0}건 (게시 중 {board.published_post_count ?? 0}건)
                                        </Text>
                                    </Box>
                                ) : (
                                    <Box flex={1} minW={0}>
                                        <Dialog.Title fontSize="17px" fontWeight="800" color="var(--waba-ink)">
                                            새 게시판 추가
                                        </Dialog.Title>
                                        <Text fontSize="12px" color="var(--waba-ink-3)" mt={1}>
                                            새로운 커뮤니티 게시판을 생성하고 권한과 기능을 설정합니다.
                                        </Text>
                                    </Box>
                                )}
                                <CloseButton
                                    size="sm"
                                    rounded="full"
                                    color="var(--waba-ink)"
                                    flexShrink={0}
                                    _hover={{ bg: 'var(--waba-surface)' }}
                                    onClick={() => onOpenChange(false)}
                                />
                            </Flex>
                        </Dialog.Header>

                        {/* Body */}
                        <Dialog.Body p={0} pt={4} overflowY="auto" flex={1}>
                            <VStack align="stretch" gap={4}>
                                {mode === 'create' && (
                                    <Box>
                                        <Text fontSize="12px" fontWeight="800" color="var(--waba-ink-2)" mb={1.5}>
                                            게시판 코드 (ID) *
                                        </Text>
                                        <Input
                                            value={boardId}
                                            onChange={(e) => setBoardId(e.target.value.toUpperCase())}
                                            placeholder="PET_LIVING_TIP"
                                            size="sm"
                                            h="36px"
                                            fontFamily="mono"
                                            bg="var(--waba-surface)"
                                            borderColor="var(--waba-line)"
                                            color="var(--waba-ink)"
                                        />
                                        <Text fontSize="11px" color="var(--waba-ink-3)" mt={1}>
                                            영문 대문자·숫자·밑줄(_) 2~30자, 생성 후 변경 불가
                                        </Text>
                                    </Box>
                                )}

                                <Grid templateColumns={{ base: '1fr', sm: '2fr 1fr' }} gap={3}>
                                    <Box>
                                        <Text fontSize="12px" fontWeight="800" color="var(--waba-ink-2)" mb={1.5}>
                                            게시판 이름 *
                                        </Text>
                                        <Input
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            placeholder="예: 반려생활 팁"
                                            size="sm"
                                            h="36px"
                                            bg="var(--waba-surface)"
                                            borderColor="var(--waba-line)"
                                            color="var(--waba-ink)"
                                        />
                                    </Box>
                                    <Box>
                                        <Text fontSize="12px" fontWeight="800" color="var(--waba-ink-2)" mb={1.5}>
                                            노출 순서 *
                                        </Text>
                                        <Input
                                            type="number"
                                            min={1}
                                            value={sortOrder}
                                            onChange={(e) => setSortOrder(e.target.value)}
                                            size="sm"
                                            h="36px"
                                            bg="var(--waba-surface)"
                                            borderColor="var(--waba-line)"
                                            color="var(--waba-ink)"
                                        />
                                    </Box>
                                </Grid>

                                <Box>
                                    <Text fontSize="12px" fontWeight="800" color="var(--waba-ink-2)" mb={1.5}>
                                        게시판 설명
                                    </Text>
                                    <Textarea
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        placeholder="게시판 용도와 안내 문구를 입력하세요..."
                                        rows={2}
                                        bg="var(--waba-surface)"
                                        borderColor="var(--waba-line)"
                                        color="var(--waba-ink)"
                                        fontSize="13px"
                                    />
                                </Box>

                                <Box>
                                    <Text fontSize="12px" fontWeight="800" color="var(--waba-ink-2)" mb={2}>
                                        최소 작성 권한
                                    </Text>
                                    <HStack gap={2} flexWrap="wrap">
                                        {WRITE_ROLE_OPTIONS.map((opt) => {
                                            const active = minWriteRole === opt.key;
                                            return (
                                                <Button
                                                    key={opt.key}
                                                    size="xs"
                                                    h="32px"
                                                    px={3.5}
                                                    borderRadius="999px"
                                                    bg={active ? '#6338A9' : 'var(--waba-surface)'}
                                                    color={active ? '#FFFFFF' : 'var(--waba-ink-2)'}
                                                    border="1px solid"
                                                    borderColor={active ? '#6338A9' : 'var(--waba-line)'}
                                                    fontSize="12px"
                                                    fontWeight="700"
                                                    onClick={() => setMinWriteRole(opt.key)}
                                                >
                                                    {opt.label}
                                                </Button>
                                            );
                                        })}
                                    </HStack>
                                </Box>

                                <Box>
                                    <Text fontSize="12px" fontWeight="800" color="var(--waba-ink-2)" mb={2}>
                                        기능 옵션
                                    </Text>
                                    <VStack align="stretch" gap={2.5}>
                                        {[
                                            {
                                                key: 'allow_product_pins',
                                                title: '상품 핀 태그 허용',
                                                desc: '게시글 작성 시 추천 상품 핀 연결 허용',
                                                checked: allowProductPins,
                                                onToggle: () => setAllowProductPins((p) => !p),
                                            },
                                            {
                                                key: 'allow_vet_verify',
                                                title: '수의사 검증 허용',
                                                desc: '수의사 검수 배지 부여 대상 게시판으로 표시',
                                                checked: allowVetVerify,
                                                onToggle: () => setAllowVetVerify((p) => !p),
                                            },
                                        ].map((item) => (
                                            <Flex
                                                key={item.key}
                                                p={3.5}
                                                borderRadius="14px"
                                                bg="var(--waba-surface)"
                                                border="1px solid"
                                                borderColor={item.checked ? 'var(--waba-purple-border)' : 'var(--waba-line)'}
                                                justify="space-between"
                                                align="center"
                                                gap={3}
                                                cursor="pointer"
                                                onClick={item.onToggle}
                                            >
                                                <Box>
                                                    <Text fontSize="13px" fontWeight="700" color="var(--waba-ink)">
                                                        {item.title}
                                                    </Text>
                                                    <Text fontSize="11.5px" color="var(--waba-ink-3)" mt={0.5}>
                                                        {item.desc}
                                                    </Text>
                                                </Box>
                                                <Box
                                                    px={3}
                                                    py={1}
                                                    borderRadius="999px"
                                                    fontSize="11px"
                                                    fontWeight="800"
                                                    bg={item.checked ? '#6338A9' : 'var(--waba-card)'}
                                                    color={item.checked ? '#FFFFFF' : 'var(--waba-ink-3)'}
                                                    border="1px solid"
                                                    borderColor={item.checked ? '#6338A9' : 'var(--waba-line)'}
                                                    flexShrink={0}
                                                >
                                                    {item.checked ? '허용' : '미사용'}
                                                </Box>
                                            </Flex>
                                        ))}
                                    </VStack>
                                </Box>

                                {mode === 'edit' && (
                                    <Box>
                                        <Text fontSize="12px" fontWeight="800" color="var(--waba-ink-2)" mb={2}>
                                            활성 상태 (활성 / 비활성)
                                        </Text>
                                        <Flex
                                            p={3.5}
                                            borderRadius="14px"
                                            bg="var(--waba-surface)"
                                            border="1px solid"
                                            borderColor={isActive ? 'rgba(16, 185, 129, 0.35)' : 'rgba(239, 68, 68, 0.35)'}
                                            justify="space-between"
                                            align="center"
                                            gap={3}
                                            cursor="pointer"
                                            onClick={() => setIsActive((p) => !p)}
                                        >
                                            <Box>
                                                <Text fontSize="13px" fontWeight="700" color="var(--waba-ink)">
                                                    {isActive ? '게시판 활성화됨' : '게시판 비활성화됨'}
                                                </Text>
                                                <Text fontSize="11.5px" color="var(--waba-ink-3)" mt={0.5}>
                                                    비활성화 시 커뮤니티 탭 및 글쓰기에서 숨겨지며, 기존 게시글은 유지됩니다.
                                                </Text>
                                            </Box>
                                            <Box
                                                px={3}
                                                py={1}
                                                borderRadius="999px"
                                                fontSize="11px"
                                                fontWeight="800"
                                                bg={isActive ? 'rgba(16, 185, 129, 0.14)' : 'rgba(239, 68, 68, 0.14)'}
                                                color={isActive ? '#10B981' : '#EF4444'}
                                                flexShrink={0}
                                            >
                                                {isActive ? '활성' : '비활성'}
                                            </Box>
                                        </Flex>
                                    </Box>
                                )}
                            </VStack>
                        </Dialog.Body>

                        {/* Footer */}
                        <Dialog.Footer p={0} pt={4} mt={4} borderTop="1px solid" borderColor="var(--waba-line)" flexShrink={0}>
                            <Flex justify="space-between" align="center" w="100%" gap={3} flexWrap="wrap">
                                <Box flex={1} minW="200px">
                                    {mode === 'edit' && (
                                        canDelete ? (
                                            deleteConfirmOpen ? (
                                                <HStack gap={1.5}>
                                                    <Button
                                                        size="xs"
                                                        bg="#E53E3E"
                                                        color="#FFFFFF"
                                                        borderRadius="999px"
                                                        loading={submitting}
                                                        onClick={handleDelete}
                                                    >
                                                        삭제 확정
                                                    </Button>
                                                    <Button
                                                        size="xs"
                                                        variant="ghost"
                                                        color="var(--waba-ink-2)"
                                                        onClick={() => setDeleteConfirmOpen(false)}
                                                    >
                                                        취소
                                                    </Button>
                                                </HStack>
                                            ) : (
                                                <Button
                                                    size="xs"
                                                    variant="outline"
                                                    borderColor="rgba(239, 68, 68, 0.4)"
                                                    color="#EF4444"
                                                    borderRadius="999px"
                                                    onClick={() => setDeleteConfirmOpen(true)}
                                                >
                                                    게시판 삭제
                                                </Button>
                                            )
                                        ) : (
                                            <Text fontSize="11px" color="var(--waba-ink-3)">
                                                * 기본 게시판 또는 게시글이 존재하는 게시판은 데이터 보호를 위해 비활성화로 관리됩니다.
                                            </Text>
                                        )
                                    )}
                                </Box>

                                <HStack gap={2}>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        borderColor="var(--waba-line)"
                                        color="var(--waba-ink-2)"
                                        borderRadius="999px"
                                        px={4}
                                        onClick={() => onOpenChange(false)}
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
                                        onClick={handleSubmit}
                                    >
                                        {mode === 'edit' ? '변경 사항 저장' : '게시판 생성'}
                                    </Button>
                                </HStack>
                            </Flex>
                        </Dialog.Footer>
                    </Dialog.Content>
                </Dialog.Positioner>
            </Portal>
        </Dialog.Root>
    );
}
