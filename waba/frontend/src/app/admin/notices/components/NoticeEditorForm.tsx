'use client'

import React, { useEffect, useRef, useState } from 'react';
import {
    Box,
    Button,
    Flex,
    Grid,
    Heading,
    HStack,
    IconButton,
    Image,
    Input,
    Spinner,
    Switch,
    Text,
    VStack,
} from '@chakra-ui/react';
import {
    LuArrowLeft,
    LuChevronDown,
    LuChevronUp,
    LuEye,
    LuImage,
    LuPencil,
    LuTrash2,
    LuUpload,
} from 'react-icons/lu';
import { useRouter } from 'next/navigation';
import axiosInstance from '@/utils/api';
import { toaster } from '@/components/ui/toaster';
import {
    DisplayStatus,
    fromDatetimeLocal,
    NoticeContentBlock,
    NoticeType,
    parseNoticeContentBlocks,
    resolveMediaUrl,
    toDatetimeLocal,
} from '../types';

type EditableNoticeBlock = NoticeContentBlock & { localKey: string };

interface NoticeEditorFormProps {
    mode: 'create' | 'edit';
    noticeId?: string;
}

function makeKey() {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function AutoResizeTextarea({
    value,
    onChange,
    placeholder,
    autoFocus,
}: {
    value: string;
    onChange: (val: string) => void;
    placeholder?: string;
    autoFocus?: boolean;
}) {
    const ref = useRef<HTMLTextAreaElement>(null);

    const adjustHeight = () => {
        const el = ref.current;
        if (!el) return;
        el.style.height = 'auto';
        el.style.height = `${Math.max(el.scrollHeight, 56)}px`;
    };

    useEffect(() => {
        adjustHeight();
    }, [value]);

    useEffect(() => {
        if (autoFocus && ref.current) {
            ref.current.focus();
        }
    }, [autoFocus]);

    return (
        <textarea
            ref={ref}
            value={value}
            onChange={(e) => {
                onChange(e.target.value);
                adjustHeight();
            }}
            placeholder={placeholder}
            rows={2}
            style={{
                width: '100%',
                border: 'none',
                outline: 'none',
                background: 'transparent',
                resize: 'none',
                overflow: 'hidden',
                fontSize: '16px',
                lineHeight: 1.85,
                color: 'var(--waba-ink, #141416)',
                padding: '2px 0',
                fontFamily: 'inherit',
            }}
        />
    );
}

export default function NoticeEditorForm({ mode, noticeId }: NoticeEditorFormProps) {
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [loading, setLoading] = useState(mode === 'edit');
    const [submitting, setSubmitting] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

    const [type, setType] = useState<NoticeType>('NOTICE');
    const [title, setTitle] = useState('');
    const [blocks, setBlocks] = useState<EditableNoticeBlock[]>([
        { localKey: makeKey(), type: 'text', content: '' },
    ]);
    const [editorMode, setEditorMode] = useState<'edit' | 'preview'>('edit');
    const [replaceIndex, setReplaceIndex] = useState<number | null>(null);
    const [autoFocusKey, setAutoFocusKey] = useState<string | null>(null);
    const [isPinned, setIsPinned] = useState(false);

    // Exposure status & period
    const [displayStatus, setDisplayStatus] = useState<DisplayStatus>('VISIBLE');
    const [startAt, setStartAt] = useState('');
    const [endAt, setEndAt] = useState('');
    const [noEndDate, setNoEndDate] = useState(true);

    // Event period
    const [eventStartAt, setEventStartAt] = useState('');
    const [eventEndAt, setEventEndAt] = useState('');
    const [noEventEndDate, setNoEventEndDate] = useState(true);

    useEffect(() => {
        if (mode !== 'edit' || !noticeId) return;
        setLoading(true);
        axiosInstance
            .get(`/admin/notices/${noticeId}`)
            .then((res) => {
                const n = res.data?.notice || res.data;
                if (!n) return;
                setType(n.type === 'EVENT' ? 'EVENT' : 'NOTICE');
                setTitle(n.title || '');
                const parsed = parseNoticeContentBlocks(n.content);
                setBlocks(parsed.map((b) => ({ ...b, localKey: makeKey() })));
                setIsPinned(Boolean(n.is_pinned));
                setDisplayStatus(n.display_status || 'VISIBLE');
                setStartAt(toDatetimeLocal(n.start_at));
                setEndAt(toDatetimeLocal(n.end_at));
                setNoEndDate(!n.end_at);
                setEventStartAt(toDatetimeLocal(n.event_start_at));
                setEventEndAt(toDatetimeLocal(n.event_end_at));
                setNoEventEndDate(!n.event_end_at);
            })
            .catch(() => {
                toaster.create({ title: '공지사항 정보를 불러오지 못했습니다.', type: 'error' });
            })
            .finally(() => setLoading(false));
    }, [mode, noticeId]);

    const handleTriggerImageUpload = (targetIdx: number | null) => {
        setReplaceIndex(targetIdx);
        fileInputRef.current?.click();
    };

    const handleUploadBodyImages = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;
        setUploading(true);
        try {
            const uploadedUrls: string[] = [];
            for (const file of files) {
                const fd = new FormData();
                fd.append('image', file);
                fd.append('category', 'notices');
                const res = await axiosInstance.post('/admin/marketing/upload-image', fd, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });
                const url = res.data?.url || res.data?.imageUrl || res.data?.image_url || '';
                if (url) uploadedUrls.push(url);
            }

            if (uploadedUrls.length > 0) {
                if (replaceIndex !== null) {
                    setBlocks((prev) =>
                        prev.map((b, idx) =>
                            idx === replaceIndex && b.type === 'image'
                                ? { ...b, image_url: uploadedUrls[0] }
                                : b
                        )
                    );
                } else {
                    const newBlocks: EditableNoticeBlock[] = uploadedUrls.map((url) => ({
                        localKey: makeKey(),
                        type: 'image',
                        image_url: url,
                        caption: '',
                    }));
                    setBlocks((prev) => [...prev, ...newBlocks]);
                }
                toaster.create({
                    title: `${uploadedUrls.length}개의 이미지가 본문에 삽입되었습니다.`,
                    type: 'success',
                });
            }
        } catch (err: any) {
            toaster.create({
                title: err?.response?.data?.message || '이미지 업로드에 실패했습니다.',
                type: 'error',
            });
        } finally {
            setUploading(false);
            setReplaceIndex(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleAppendTextBlockAndFocus = () => {
        const key = makeKey();
        setBlocks((prev) => [...prev, { localKey: key, type: 'text', content: '' }]);
        setAutoFocusKey(key);
    };

    const handleMoveBlock = (idx: number, dir: 'up' | 'down') => {
        const target = dir === 'up' ? idx - 1 : idx + 1;
        if (target < 0 || target >= blocks.length) return;
        setBlocks((prev) => {
            const next = [...prev];
            const [moved] = next.splice(idx, 1);
            next.splice(target, 0, moved);
            return next;
        });
    };

    const handleRemoveBlock = (idx: number) => {
        setBlocks((prev) => {
            const next = prev.filter((_, i) => i !== idx);
            if (next.length === 0) {
                return [{ localKey: makeKey(), type: 'text', content: '' }];
            }
            return next;
        });
    };

    const handleSave = async () => {
        if (!title.trim()) {
            toaster.create({ title: '제목을 입력해주세요.', type: 'warning' });
            return;
        }

        const cleanedBlocks: NoticeContentBlock[] = blocks
            .filter((b) => (b.type === 'image' ? Boolean(b.image_url) : Boolean(b.content.trim())))
            .map((b) =>
                b.type === 'image'
                    ? {
                          type: 'image',
                          image_url: b.image_url,
                          ...(b.caption?.trim() ? { caption: b.caption.trim() } : {}),
                      }
                    : {
                          type: 'text',
                          content: b.content.trim(),
                      }
            );

        if (cleanedBlocks.length === 0) {
            toaster.create({ title: '본문 내용 또는 이미지를 1개 이상 입력해주세요.', type: 'warning' });
            return;
        }

        const payload = {
            type,
            title: title.trim(),
            content: JSON.stringify(cleanedBlocks),
            thumbnail_url: null,
            is_pinned: isPinned,
            display_status: displayStatus,
            start_at: displayStatus === 'SCHEDULED' ? fromDatetimeLocal(startAt) : null,
            end_at: displayStatus === 'SCHEDULED' && !noEndDate ? fromDatetimeLocal(endAt) : null,
            event_start_at: type === 'EVENT' ? fromDatetimeLocal(eventStartAt) : null,
            event_end_at: type === 'EVENT' && !noEventEndDate ? fromDatetimeLocal(eventEndAt) : null,
        };

        setSubmitting(true);
        try {
            if (mode === 'create') {
                await axiosInstance.post('/admin/notices', payload);
                toaster.create({ title: '공지사항이 등록되었습니다.', type: 'success' });
            } else if (noticeId) {
                await axiosInstance.patch(`/admin/notices/${noticeId}`, payload);
                toaster.create({ title: '공지사항이 수정되었습니다.', type: 'success' });
            }
            router.push('/admin/notices?tab=notices');
        } catch (err: any) {
            toaster.create({ title: err?.response?.data?.message || '저장에 실패했습니다.', type: 'error' });
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!noticeId) return;
        setSubmitting(true);
        try {
            await axiosInstance.delete(`/admin/notices/${noticeId}`);
            toaster.create({ title: '공지사항이 삭제되었습니다.', type: 'success' });
            router.push('/admin/notices?tab=notices');
        } catch (err: any) {
            toaster.create({ title: err?.response?.data?.message || '삭제에 실패했습니다.', type: 'error' });
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <Flex py={24} justify="center">
                <Spinner size="lg" color="#6338A9" />
            </Flex>
        );
    }

    const totalChars = blocks.reduce(
        (acc, b) => (b.type === 'text' ? acc + b.content.trim().length : acc),
        0
    );
    const readMinutes = Math.max(1, Math.ceil(totalChars / 400));
    const imageCount = blocks.filter((b) => b.type === 'image' && Boolean(b.image_url)).length;
    const todayStr = new Date().toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    });

    return (
        <Box maxW="1240px" mx="auto" px={{ base: 4, md: 6 }} py={6}>
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple={replaceIndex === null}
                style={{ display: 'none' }}
                onChange={handleUploadBodyImages}
            />

            {/* Top Breadcrumb & Actions */}
            <Flex justify="space-between" align={{ base: 'flex-start', md: 'center' }} direction={{ base: 'column', md: 'row' }} gap={3} mb={6}>
                <Box>
                    <Button
                        size="xs"
                        variant="ghost"
                        color="var(--waba-ink-2)"
                        px={0}
                        mb={1.5}
                        gap={1}
                        onClick={() => router.push('/admin/notices?tab=notices')}
                    >
                        <LuArrowLeft size={14} />
                        목록으로 돌아가기
                    </Button>
                    <Heading size="xl" fontWeight="800" color="var(--waba-ink)">
                        {mode === 'create' ? '새 공지 · 이벤트 작성' : '공지 · 이벤트 수정'}
                    </Heading>
                </Box>

                <HStack gap={2} flexWrap="wrap">
                    {mode === 'edit' && (
                        deleteConfirmOpen ? (
                            <HStack gap={1.5}>
                                <Button
                                    size="sm"
                                    bg="#E53E3E"
                                    color="#FFFFFF"
                                    borderRadius="999px"
                                    px={4}
                                    loading={submitting}
                                    onClick={handleDelete}
                                >
                                    삭제 확정
                                </Button>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    color="var(--waba-ink-2)"
                                    onClick={() => setDeleteConfirmOpen(false)}
                                >
                                    취소
                                </Button>
                            </HStack>
                        ) : (
                            <Button
                                size="sm"
                                variant="outline"
                                borderColor="rgba(239, 68, 68, 0.4)"
                                color="#EF4444"
                                borderRadius="999px"
                                px={4}
                                gap={1}
                                onClick={() => setDeleteConfirmOpen(true)}
                            >
                                <LuTrash2 size={14} />
                                삭제
                            </Button>
                        )
                    )}
                    <Button
                        size="sm"
                        variant="outline"
                        borderColor="var(--waba-line)"
                        color="var(--waba-ink-2)"
                        borderRadius="999px"
                        px={4}
                        gap={1.5}
                        onClick={() => setEditorMode((m) => (m === 'edit' ? 'preview' : 'edit'))}
                    >
                        {editorMode === 'edit' ? <LuEye size={14} /> : <LuPencil size={14} />}
                        {editorMode === 'edit' ? '미리보기' : '편집하기'}
                    </Button>
                    <Button
                        size="sm"
                        variant="outline"
                        borderColor="var(--waba-line)"
                        color="var(--waba-ink-2)"
                        borderRadius="999px"
                        px={4}
                        onClick={() => router.push('/admin/notices?tab=notices')}
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
                        onClick={handleSave}
                    >
                        저장하기
                    </Button>
                </HStack>
            </Flex>

            {/* 2-Column Layout */}
            <Grid templateColumns={{ base: '1fr', lg: '2fr 1fr' }} gap={5} alignItems="start">
                {/* Left: Continuous Writing Canvas */}
                <Box
                    bg="var(--waba-card)"
                    rounded="24px"
                    border="1px solid"
                    borderColor="var(--waba-line)"
                    p={{ base: 5, md: 8 }}
                    minW={0}
                >
                    {/* Borderless Large Title Input */}
                    <Input
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="제목을 입력하세요..."
                        readOnly={editorMode === 'preview'}
                        fontSize={{ base: '22px', md: '26px' }}
                        fontWeight="800"
                        letterSpacing="-0.03em"
                        color="var(--waba-ink)"
                        border="none"
                        outline="none"
                        bg="transparent"
                        px={0}
                        py={1}
                        h="auto"
                        _focus={{ outline: 'none', boxShadow: 'none' }}
                    />

                    {/* Metadata Strip */}
                    <Box
                        mt={2}
                        pt={3}
                        pb={5}
                        borderTop="1px solid"
                        borderColor="var(--waba-line)"
                        fontSize="12px"
                        color="var(--waba-ink-3)"
                    >
                        {type === 'EVENT' ? '이벤트' : '공지사항'} • {todayStr} • 읽는 시간 약 {readMinutes}분 • 이미지 {imageCount}장
                    </Box>

                    {editorMode === 'edit' ? (
                        <>
                            {/* Sticky Pill Toolbar */}
                            <HStack
                                position="sticky"
                                top="16px"
                                zIndex={25}
                                bg="var(--waba-surface)"
                                border="1px solid"
                                borderColor="var(--waba-line)"
                                px={3.5}
                                py={2}
                                rounded="full"
                                mb={6}
                                maxW="fit-content"
                                gap={3}
                            >
                                <Button
                                    size="xs"
                                    h="30px"
                                    bg="#6338A9"
                                    _hover={{ bg: '#522B8F' }}
                                    color="white"
                                    rounded="full"
                                    px={3.5}
                                    fontSize="12px"
                                    fontWeight="700"
                                    gap={1.5}
                                    loading={uploading}
                                    onClick={() => handleTriggerImageUpload(null)}
                                >
                                    <LuImage size={13} />
                                    + 사진 추가
                                </Button>
                                <Text
                                    display={{ base: 'none', sm: 'block' }}
                                    fontSize="12px"
                                    color="var(--waba-ink-3)"
                                >
                                    본문 원하는 위치에 사진을 추가할 수 있습니다 (WebP · 최대 가로 1500px · 72 DPI)
                                </Text>
                            </HStack>

                            {/* Continuous Flow Blocks */}
                            <VStack gap={4} align="stretch" minW={0}>
                                {blocks.map((block, idx) => {
                                    if (block.type === 'text') {
                                        return (
                                            <AutoResizeTextarea
                                                key={block.localKey}
                                                value={block.content}
                                                autoFocus={autoFocusKey === block.localKey}
                                                placeholder={
                                                    idx === 0
                                                        ? '자유롭게 공지·이벤트 내용을 작성해보세요. 엔터를 누르면 자연스럽게 줄바꿈되며 높이가 자동 조절됩니다. 상단의 [+ 사진 추가] 버튼으로 사진을 넣을 수 있습니다.'
                                                        : '이어지는 내용을 작성해보세요...'
                                                }
                                                onChange={(val) =>
                                                    setBlocks((prev) =>
                                                        prev.map((b, i) =>
                                                            i === idx && b.type === 'text'
                                                                ? { ...b, content: val }
                                                                : b
                                                        )
                                                    )
                                                }
                                            />
                                        );
                                    }

                                    return (
                                        <Box key={block.localKey} my={4}>
                                            <Box
                                                position="relative"
                                                rounded="24px"
                                                overflow="hidden"
                                                border="1px solid"
                                                borderColor="var(--waba-line)"
                                                bg="var(--waba-surface)"
                                            >
                                                <Image
                                                    src={resolveMediaUrl(block.image_url)}
                                                    alt={block.caption || '공지 이미지'}
                                                    w="100%"
                                                    h="auto"
                                                    display="block"
                                                />

                                                {/* Floating Dark Glass Bottom-Right Toolbar */}
                                                <HStack
                                                    position="absolute"
                                                    bottom={3}
                                                    right={3}
                                                    bg="rgba(20, 20, 22, 0.85)"
                                                    backdropFilter="blur(8px)"
                                                    rounded="full"
                                                    px={2.5}
                                                    py={1}
                                                    gap={1}
                                                    zIndex={15}
                                                >
                                                    <IconButton
                                                        aria-label="위로 이동"
                                                        size="2xs"
                                                        variant="ghost"
                                                        color="white"
                                                        rounded="full"
                                                        disabled={idx === 0}
                                                        _hover={{ bg: 'whiteAlpha.200' }}
                                                        onClick={() => handleMoveBlock(idx, 'up')}
                                                    >
                                                        <LuChevronUp size={14} />
                                                    </IconButton>
                                                    <IconButton
                                                        aria-label="아래로 이동"
                                                        size="2xs"
                                                        variant="ghost"
                                                        color="white"
                                                        rounded="full"
                                                        disabled={idx === blocks.length - 1}
                                                        _hover={{ bg: 'whiteAlpha.200' }}
                                                        onClick={() => handleMoveBlock(idx, 'down')}
                                                    >
                                                        <LuChevronDown size={14} />
                                                    </IconButton>
                                                    <IconButton
                                                        aria-label="사진 교체"
                                                        size="2xs"
                                                        variant="ghost"
                                                        color="white"
                                                        rounded="full"
                                                        _hover={{ bg: 'whiteAlpha.200' }}
                                                        onClick={() => handleTriggerImageUpload(idx)}
                                                    >
                                                        <LuUpload size={13} />
                                                    </IconButton>
                                                    <IconButton
                                                        aria-label="사진 삭제"
                                                        size="2xs"
                                                        variant="ghost"
                                                        color="#FCA5A5"
                                                        rounded="full"
                                                        _hover={{ bg: 'whiteAlpha.200' }}
                                                        onClick={() => handleRemoveBlock(idx)}
                                                    >
                                                        <LuTrash2 size={13} />
                                                    </IconButton>
                                                </HStack>
                                            </Box>

                                            <Input
                                                value={block.caption || ''}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    setBlocks((prev) =>
                                                        prev.map((b, i) =>
                                                            i === idx && b.type === 'image'
                                                                ? { ...b, caption: val }
                                                                : b
                                                        )
                                                    );
                                                }}
                                                placeholder="• 사진에 대한 캡션을 입력하세요... (선택)"
                                                mt={2}
                                                px={0}
                                                border="none"
                                                outline="none"
                                                bg="transparent"
                                                fontSize="13px"
                                                color="var(--waba-ink-3)"
                                                _focus={{ outline: 'none', boxShadow: 'none' }}
                                            />
                                        </Box>
                                    );
                                })}

                                {/* Click-below-image area */}
                                {blocks[blocks.length - 1]?.type === 'image' && (
                                    <Box
                                        onClick={handleAppendTextBlockAndFocus}
                                        minH="96px"
                                        w="100%"
                                        cursor="text"
                                        borderRadius="16px"
                                        px={2}
                                        py={3}
                                        transition="background 0.15s"
                                        _hover={{ bg: 'var(--waba-surface)' }}
                                    >
                                        <Text fontSize="14px" color="var(--waba-ink-3)">
                                            여기를 클릭해 사진 아래에 이어지는 내용을 작성하세요...
                                        </Text>
                                    </Box>
                                )}
                            </VStack>
                        </>
                    ) : (
                        /* Unified Preview Mode */
                        <VStack align="stretch" gap={5}>
                            {blocks.map((block) => {
                                if (block.type === 'text') {
                                    if (!block.content.trim()) return null;
                                    return (
                                        <Text
                                            key={block.localKey}
                                            fontSize="16px"
                                            lineHeight="1.85"
                                            color="var(--waba-ink)"
                                            whiteSpace="pre-wrap"
                                        >
                                            {block.content}
                                        </Text>
                                    );
                                }
                                if (!block.image_url) return null;
                                return (
                                    <Box key={block.localKey}>
                                        <Box
                                            rounded="24px"
                                            overflow="hidden"
                                            border="1px solid"
                                            borderColor="var(--waba-line)"
                                            bg="var(--waba-surface)"
                                        >
                                            <Image
                                                src={resolveMediaUrl(block.image_url)}
                                                alt={block.caption || '공지 이미지'}
                                                w="100%"
                                                h="auto"
                                                display="block"
                                            />
                                        </Box>
                                        {block.caption && (
                                            <Text fontSize="13px" color="var(--waba-ink-3)" mt={2} px={1}>
                                                {block.caption}
                                            </Text>
                                        )}
                                    </Box>
                                );
                            })}
                        </VStack>
                    )}
                </Box>

                {/* Right: Settings Sidebar */}
                <VStack align="stretch" gap={4}>
                    {/* Type & Pin */}
                    <Box p={5} borderRadius="20px" bg="var(--waba-card)" border="1px solid" borderColor="var(--waba-line)">
                        <Text fontSize="13px" fontWeight="800" color="var(--waba-ink)" mb={3}>
                            유형 및 고정 설정
                        </Text>

                        <HStack gap={2} mb={4}>
                            {[
                                { key: 'NOTICE' as NoticeType, label: '공지' },
                                { key: 'EVENT' as NoticeType, label: '이벤트' },
                            ].map((opt) => (
                                <Button
                                    key={opt.key}
                                    size="xs"
                                    h="32px"
                                    flex={1}
                                    borderRadius="999px"
                                    bg={type === opt.key ? '#6338A9' : 'var(--waba-surface)'}
                                    color={type === opt.key ? '#FFFFFF' : 'var(--waba-ink-2)'}
                                    border="1px solid"
                                    borderColor={type === opt.key ? '#6338A9' : 'var(--waba-line)'}
                                    fontWeight="700"
                                    onClick={() => setType(opt.key)}
                                >
                                    {opt.label}
                                </Button>
                            ))}
                        </HStack>

                        <Flex justify="space-between" align="center" pt={3} borderTop="1px solid" borderColor="var(--waba-line)">
                            <Text fontSize="12.5px" fontWeight="700" color="var(--waba-ink)">
                                상단 고정 (PIN)
                            </Text>
                            <Switch.Root
                                checked={isPinned}
                                onCheckedChange={(e) => setIsPinned(e.checked)}
                                colorPalette="purple"
                            >
                                <Switch.HiddenInput />
                                <Switch.Control />
                            </Switch.Root>
                        </Flex>
                    </Box>

                    {/* Event Period */}
                    {type === 'EVENT' && (
                        <Box p={5} borderRadius="20px" bg="var(--waba-card)" border="1px solid" borderColor="var(--waba-line)">
                            <Text fontSize="13px" fontWeight="800" color="var(--waba-ink)" mb={3}>
                                이벤트 진행 기간
                            </Text>
                            <VStack align="stretch" gap={2.5}>
                                <Box>
                                    <Text fontSize="11.5px" fontWeight="700" color="var(--waba-ink-3)" mb={1}>
                                        시작 일시
                                    </Text>
                                    <Input
                                        type="datetime-local"
                                        value={eventStartAt}
                                        onChange={(e) => setEventStartAt(e.target.value)}
                                        size="sm"
                                        bg="var(--waba-surface)"
                                        borderColor="var(--waba-line)"
                                        color="var(--waba-ink)"
                                    />
                                </Box>
                                <Box>
                                    <Text fontSize="11.5px" fontWeight="700" color="var(--waba-ink-3)" mb={1}>
                                        종료 일시
                                    </Text>
                                    <Input
                                        type="datetime-local"
                                        value={eventEndAt}
                                        disabled={noEventEndDate}
                                        onChange={(e) => setEventEndAt(e.target.value)}
                                        size="sm"
                                        bg="var(--waba-surface)"
                                        borderColor="var(--waba-line)"
                                        color="var(--waba-ink)"
                                    />
                                </Box>
                                <HStack gap={2} cursor="pointer" onClick={() => setNoEventEndDate((p) => !p)}>
                                    <input
                                        type="checkbox"
                                        checked={noEventEndDate}
                                        onChange={(e) => setNoEventEndDate(e.target.checked)}
                                    />
                                    <Text fontSize="12px" color="var(--waba-ink-2)">
                                        종료일 없음 (상시 진행)
                                    </Text>
                                </HStack>
                            </VStack>
                        </Box>
                    )}

                    {/* Exposure Status & Period */}
                    <Box p={5} borderRadius="20px" bg="var(--waba-card)" border="1px solid" borderColor="var(--waba-line)">
                        <Text fontSize="13px" fontWeight="800" color="var(--waba-ink)" mb={3}>
                            노출 상태 및 기간
                        </Text>

                        <HStack gap={1.5} mb={3} flexWrap="wrap">
                            {[
                                { key: 'VISIBLE' as DisplayStatus, label: '노출(상시)' },
                                { key: 'HIDDEN' as DisplayStatus, label: '미노출' },
                                { key: 'SCHEDULED' as DisplayStatus, label: '노출기간 설정' },
                            ].map((opt) => (
                                <Button
                                    key={opt.key}
                                    size="xs"
                                    h="30px"
                                    px={3}
                                    borderRadius="999px"
                                    bg={displayStatus === opt.key ? '#6338A9' : 'var(--waba-surface)'}
                                    color={displayStatus === opt.key ? '#FFFFFF' : 'var(--waba-ink-2)'}
                                    border="1px solid"
                                    borderColor={displayStatus === opt.key ? '#6338A9' : 'var(--waba-line)'}
                                    fontWeight="700"
                                    onClick={() => setDisplayStatus(opt.key)}
                                >
                                    {opt.label}
                                </Button>
                            ))}
                        </HStack>

                        {displayStatus === 'SCHEDULED' && (
                            <VStack align="stretch" gap={2.5} pt={2} borderTop="1px solid" borderColor="var(--waba-line)">
                                <Box>
                                    <Text fontSize="11.5px" fontWeight="700" color="var(--waba-ink-3)" mb={1}>
                                        노출 시작 일시
                                    </Text>
                                    <Input
                                        type="datetime-local"
                                        value={startAt}
                                        onChange={(e) => setStartAt(e.target.value)}
                                        size="sm"
                                        bg="var(--waba-surface)"
                                        borderColor="var(--waba-line)"
                                        color="var(--waba-ink)"
                                    />
                                </Box>
                                <Box>
                                    <Text fontSize="11.5px" fontWeight="700" color="var(--waba-ink-3)" mb={1}>
                                        노출 종료 일시
                                    </Text>
                                    <Input
                                        type="datetime-local"
                                        value={endAt}
                                        disabled={noEndDate}
                                        onChange={(e) => setEndAt(e.target.value)}
                                        size="sm"
                                        bg="var(--waba-surface)"
                                        borderColor="var(--waba-line)"
                                        color="var(--waba-ink)"
                                    />
                                </Box>
                                <HStack gap={2} cursor="pointer" onClick={() => setNoEndDate((p) => !p)}>
                                    <input
                                        type="checkbox"
                                        checked={noEndDate}
                                        onChange={(e) => setNoEndDate(e.target.checked)}
                                    />
                                    <Text fontSize="12px" color="var(--waba-ink-2)">
                                        종료일 없음
                                    </Text>
                                </HStack>
                            </VStack>
                        )}
                    </Box>
                </VStack>
            </Grid>
        </Box>
    );
}
