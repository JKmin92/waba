'use client'

import React, { useRef, useEffect } from 'react';
import {
    Box,
    Button,
    CloseButton,
    Flex,
    HStack,
    IconButton,
    Image,
    Input,
    Text,
    VStack,
} from '@chakra-ui/react';
import {
    ChevronDown,
    ChevronUp,
    Trash2,
} from 'lucide-react';
import { EditorBlock } from './types';

function AutoResizeTextarea({
    value,
    onChange,
    placeholder,
}: {
    value: string;
    onChange: (val: string) => void;
    placeholder?: string;
}) {
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const resize = () => {
        const el = textareaRef.current;
        if (!el) return;
        el.style.height = 'auto';
        el.style.height = `${el.scrollHeight}px`;
    };

    useEffect(() => {
        resize();
    }, [value]);

    return (
        <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => {
                onChange(e.target.value);
                resize();
            }}
            placeholder={placeholder}
            rows={1}
            style={{
                width: '100%',
                height: 'auto',
                overflow: 'hidden',
                resize: 'none',
                border: 'none',
                outline: 'none',
                background: 'transparent',
                fontSize: '16px',
                fontWeight: 400,
                lineHeight: 1.85,
                color: '#141416',
                padding: '4px 0',
                margin: 0,
                display: 'block',
                fontFamily: 'inherit',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
            }}
        />
    );
}

interface EditorBlockListProps {
    blocks: EditorBlock[];
    activePinId: string | null;
    onSetActivePinId: React.Dispatch<React.SetStateAction<string | null>>;
    onUpdateTextBlock: (id: string, content: string) => void;
    onUpdateImageCaption: (id: string, caption: string) => void;
    onMoveImageBlock: (index: number, direction: 'up' | 'down') => void;
    onRemoveImageBlock: (id: string) => void;
    onImageClickToPin: (e: React.MouseEvent<HTMLDivElement>, blockId: string) => void;
    onRemovePinFromImage: (blockId: string, pinId: string, e: React.MouseEvent) => void;
}

export default function EditorBlockList({
    blocks,
    activePinId,
    onSetActivePinId,
    onUpdateTextBlock,
    onUpdateImageCaption,
    onMoveImageBlock,
    onRemoveImageBlock,
    onImageClickToPin,
    onRemovePinFromImage,
}: EditorBlockListProps) {
    return (
        <VStack gap={4} align="stretch">
            {blocks.map((block, index) => {
                if (block.type === 'text') {
                    return (
                        <Box key={block.id} position="relative" w="100%">
                            <AutoResizeTextarea
                                value={block.content}
                                onChange={(val) => onUpdateTextBlock(block.id, val)}
                                placeholder={
                                    index === 0
                                        ? "자유롭게 이야기를 시작해보세요. 엔터를 누르면 자연스럽게 줄바꿈되며 높이가 자동 조절됩니다. 상단의 [+ 사진 삽입] 버튼으로 사진과 상품 핀을 넣을 수 있습니다."
                                        : "이어지는 이야기를 작성해보세요..."
                                }
                            />
                        </Box>
                    );
                }

                if (block.type === 'image') {
                    return (
                        <Box key={block.id} my={4}>
                            <Box
                                position="relative"
                                rounded="24px"
                                overflow="hidden"
                                border="1px solid"
                                borderColor="waba.border"
                                bg="waba.subtle"
                                cursor="crosshair"
                                role="group"
                                onClick={(e) => onImageClickToPin(e, block.id)}
                            >
                                {/* Uploaded Image */}
                                <Image
                                    src={block.previewUrl}
                                    alt="에디터 삽입 이미지"
                                    w="100%"
                                    h="auto"
                                    display="block"
                                />

                                {/* Click-to-Pin Guide Pill */}
                                <Box
                                    position="absolute"
                                    top={4}
                                    left={4}
                                    bg="rgba(255, 255, 255, 0.92)"
                                    backdropFilter="blur(8px)"
                                    color="waba.charcoal"
                                    fontSize="11px"
                                    fontWeight="700"
                                    px={3}
                                    py={1}
                                    rounded="full"
                                    boxShadow="sm"
                                    pointerEvents="none"
                                >
                                    📍 사진을 클릭하여 상품/반려동물 핀(+)을 태그하세요
                                </Box>

                                {/* Dropped Pins */}
                                {block.pins.map((pin, pinIdx) => {
                                    const isPet = pin.pin_type === 'PET';
                                    const pinBg = isPet ? '#7046B7' : pin.is_official ? '#6338A9' : '#141416';
                                    const isActive = activePinId === pin.pin_id;

                                    // 4방향 경계 감지 스마트 배치 (Smart Adaptive Placement)
                                    const isTopArea = pin.pos_y < 24;
                                    const isRightArea = pin.pos_x > 68;
                                    const isLeftArea = pin.pos_x < 32;

                                    return (
                                        <Box
                                            key={pin.pin_id}
                                            position="absolute"
                                            left={`${pin.pos_x}%`}
                                            top={`${pin.pos_y}%`}
                                            transform="translate(-50%, -50%)"
                                            zIndex={isActive ? 35 : 20}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onSetActivePinId((prev) => (prev === pin.pin_id ? null : pin.pin_id));
                                            }}
                                        >
                                            {/* Numbered Pin Circle Button */}
                                            <Box
                                                as="button"
                                                w="30px"
                                                h="30px"
                                                rounded="full"
                                                bg={pinBg}
                                                color="white"
                                                fontSize="12px"
                                                fontWeight="800"
                                                display="flex"
                                                alignItems="center"
                                                justifyContent="center"
                                                border="2.5px solid white"
                                                boxShadow={
                                                    isActive
                                                        ? '0 0 0 3px rgba(99, 56, 169, 0.45), 0 6px 18px rgba(0,0,0,0.35)'
                                                        : '0 4px 14px rgba(0,0,0,0.3)'
                                                }
                                                cursor="pointer"
                                                transition="all 0.15s cubic-bezier(0.4, 0, 0.2, 1)"
                                                transform={isActive ? 'scale(1.18)' : 'scale(1)'}
                                                _hover={{ transform: 'scale(1.15)' }}
                                            >
                                                {pinIdx + 1}
                                            </Box>

                                            {/* Smart Adaptive Popover Card (클릭 시에만 뜸) */}
                                            {isActive && (
                                                <Box
                                                    position="absolute"
                                                    top={isTopArea ? '36px' : 'auto'}
                                                    bottom={!isTopArea ? '36px' : 'auto'}
                                                    left={isRightArea ? 'auto' : isLeftArea ? '0' : '50%'}
                                                    right={isRightArea ? '0' : 'auto'}
                                                    transform={!isRightArea && !isLeftArea ? 'translateX(-50%)' : 'none'}
                                                    bg="rgba(255, 255, 255, 0.96)"
                                                    backdropFilter="blur(16px)"
                                                    p={3.5}
                                                    rounded="18px"
                                                    border="1px solid"
                                                    borderColor="waba.border"
                                                    boxShadow="0 12px 32px rgba(0,0,0,0.22)"
                                                    minW="210px"
                                                    maxW="260px"
                                                    zIndex={40}
                                                    cursor="default"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    {/* Header: Type Label + Close */}
                                                    <Flex justify="space-between" align="center" mb={1.5}>
                                                        <HStack gap={1.5}>
                                                            <Box
                                                                w="16px"
                                                                h="16px"
                                                                rounded="full"
                                                                bg={pinBg}
                                                                color="white"
                                                                fontSize="9px"
                                                                fontWeight="800"
                                                                display="flex"
                                                                alignItems="center"
                                                                justifyContent="center"
                                                            >
                                                                {pinIdx + 1}
                                                            </Box>
                                                            <Text fontSize="11px" fontWeight="700" color="waba.purple">
                                                                {isPet ? '반려동물 태그' : pin.brand_name || (pin.is_official ? '와바미 공식' : '외부 제휴')}
                                                            </Text>
                                                            {pin.is_official && (
                                                                <Box bg="waba.purple" color="white" fontSize="9px" fontWeight="800" px={1.5} py={0.2} rounded="full">
                                                                    5% 적립
                                                                </Box>
                                                            )}
                                                        </HStack>
                                                        <CloseButton
                                                            size="2xs"
                                                            rounded="full"
                                                            color="gray.400"
                                                            _hover={{ color: 'red.500', bg: 'red.50' }}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                onSetActivePinId(null);
                                                            }}
                                                        />
                                                    </Flex>

                                                    {/* Product / Pet Name */}
                                                    <Text fontSize="13px" fontWeight="700" color="waba.charcoal" lineClamp={2} mb={1}>
                                                        {pin.product_name}
                                                    </Text>

                                                    {/* Price if available */}
                                                    {pin.price !== undefined && pin.price > 0 && (
                                                        <Text fontSize="12px" fontWeight="700" color="waba.purple" mb={2}>
                                                            {Number(pin.price).toLocaleString()}원
                                                        </Text>
                                                    )}

                                                    {/* Delete Action Button */}
                                                    <Button
                                                        size="xs"
                                                        w="100%"
                                                        mt={1.5}
                                                        variant="subtle"
                                                        color="red.600"
                                                        bg="red.50"
                                                        _hover={{ bg: 'red.100' }}
                                                        rounded="full"
                                                        fontSize="11px"
                                                        fontWeight="700"
                                                        h="28px"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            onRemovePinFromImage(block.id, pin.pin_id, e);
                                                            onSetActivePinId(null);
                                                        }}
                                                    >
                                                        <Trash2 size={12} style={{ marginRight: 4 }} />
                                                        핀 삭제하기
                                                    </Button>
                                                </Box>
                                            )}
                                        </Box>
                                    );
                                })}

                                {/* Hover Toolbar: Order & Delete */}
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
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <IconButton
                                        aria-label="위로 이동"
                                        size="xs"
                                        variant="ghost"
                                        color="white"
                                        _hover={{ bg: 'whiteAlpha.300' }}
                                        onClick={() => onMoveImageBlock(index, 'up')}
                                        disabled={index === 0}
                                    >
                                        <ChevronUp size={14} />
                                    </IconButton>
                                    <IconButton
                                        aria-label="아래로 이동"
                                        size="xs"
                                        variant="ghost"
                                        color="white"
                                        _hover={{ bg: 'whiteAlpha.300' }}
                                        onClick={() => onMoveImageBlock(index, 'down')}
                                        disabled={index === blocks.length - 1}
                                    >
                                        <ChevronDown size={14} />
                                    </IconButton>
                                    <IconButton
                                        aria-label="사진 삭제"
                                        size="xs"
                                        variant="ghost"
                                        color="red.300"
                                        _hover={{ bg: 'whiteAlpha.300', color: 'red.400' }}
                                        onClick={() => onRemoveImageBlock(block.id)}
                                    >
                                        <Trash2 size={14} />
                                    </IconButton>
                                </HStack>
                            </Box>

                            {/* Tagged Pins Chip List below the image */}
                            {block.pins.length > 0 && (
                                <Box mt={2.5} px={1}>
                                    <Flex align="center" gap={1.5} flexWrap="wrap">
                                        <Text fontSize="11px" fontWeight="700" color="waba.muted" mr={1}>
                                            사진 속 태그 ({block.pins.length}):
                                        </Text>
                                        {block.pins.map((pin, pIdx) => {
                                            const isSelected = activePinId === pin.pin_id;
                                            const isPet = pin.pin_type === 'PET';
                                            const chipBg = isPet ? '#7046B7' : pin.is_official ? '#6338A9' : '#141416';
                                            return (
                                                <HStack
                                                    key={pin.pin_id}
                                                    bg={isSelected ? 'purple.50' : 'white'}
                                                    border="1px solid"
                                                    borderColor={isSelected ? 'purple.300' : 'waba.border'}
                                                    px={2.5}
                                                    py={1}
                                                    rounded="full"
                                                    gap={1.5}
                                                    fontSize="11px"
                                                    fontWeight="600"
                                                    cursor="pointer"
                                                    transition="all 0.15s ease"
                                                    boxShadow="xs"
                                                    _hover={{ borderColor: 'purple.300', bg: 'purple.50' }}
                                                    onClick={() => onSetActivePinId(isSelected ? null : pin.pin_id)}
                                                >
                                                    <Box
                                                        w="16px"
                                                        h="16px"
                                                        rounded="full"
                                                        bg={chipBg}
                                                        color="white"
                                                        fontSize="9px"
                                                        fontWeight="800"
                                                        display="flex"
                                                        alignItems="center"
                                                        justifyContent="center"
                                                        flexShrink={0}
                                                    >
                                                        {pIdx + 1}
                                                    </Box>
                                                    <Text color="waba.charcoal" maxW="160px" truncate>
                                                        {pin.product_name}
                                                    </Text>
                                                    <CloseButton
                                                        size="2xs"
                                                        rounded="full"
                                                        color="gray.400"
                                                        _hover={{ color: 'red.500', bg: 'red.100' }}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            onRemovePinFromImage(block.id, pin.pin_id, e);
                                                            if (activePinId === pin.pin_id) onSetActivePinId(null);
                                                        }}
                                                    />
                                                </HStack>
                                            );
                                        })}
                                    </Flex>
                                </Box>
                            )}

                            {/* Caption Input */}
                            <Flex justify="space-between" align="center" mt={2} px={1}>
                                <Input
                                    value={block.caption || ''}
                                    onChange={(e) => onUpdateImageCaption(block.id, e.target.value)}
                                    placeholder="• 사진에 대한 캡션을 입력하세요..."
                                    fontSize="13px"
                                    color="waba.muted"
                                    border="none"
                                    outline="none"
                                    px={0}
                                    _focus={{ outline: 'none' }}
                                />
                                <Text fontSize="12px" color="waba.faint" whiteSpace="nowrap">
                                    핀 {block.pins.length}개 연동됨
                                </Text>
                            </Flex>
                        </Box>
                    );
                }
                return null;
            })}
        </VStack>
    );
}
