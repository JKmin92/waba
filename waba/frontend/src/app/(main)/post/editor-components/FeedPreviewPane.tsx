'use client'

import React from 'react';
import {
    Box,
    CloseButton,
    Dialog,
    Flex,
    Heading,
    HStack,
    Image,
    Portal,
    Text,
    VStack,
} from '@chakra-ui/react';
import {
    CheckCircle2,
    Circle,
    Coins,
    Eye,
    Image as ImageIcon,
    Layers,
    Sparkles,
} from 'lucide-react';
import { EditorBlock, EditorImagePin } from './types';

interface FeedPreviewPaneProps {
    boardId: string;
    title: string;
    currentUser: any;
    firstImagePreview: string | null;
    allProductPins: EditorImagePin[];
    productPinsCount: number;
    totalImagesCount: number;
    calculatedPoints: number;
    isMultiSpecies: boolean;
    readinessPercentage: number;
    isTitleValid: boolean;
    isContentValid: boolean;
    isImageValid: boolean;
    isPinValid: boolean;
}

export function FeedPreviewPane({
    boardId,
    title,
    currentUser,
    firstImagePreview,
    allProductPins,
    productPinsCount,
    totalImagesCount,
    calculatedPoints,
    isMultiSpecies,
    readinessPercentage,
    isTitleValid,
    isContentValid,
    isImageValid,
    isPinValid,
}: FeedPreviewPaneProps) {
    return (
        <>
            {/* 1) Live Feed Preview */}
            <Box
                bg="white"
                rounded="24px"
                border="1px solid"
                borderColor="waba.border"
                p={5}
                boxShadow="0 8px 32px -4px rgba(26,28,30,0.04)"
            >
                <Flex justify="space-between" align="center" mb={4}>
                    <HStack gap={2}>
                        <Layers size={17} color="#6338A9" />
                        <Heading fontSize="15px" fontWeight="700" color="waba.charcoal">
                            피드 실시간 미리보기
                        </Heading>
                    </HStack>
                    <Text fontSize="11px" fontWeight="800" color="waba.muted" letterSpacing="0.08em">
                        100% SYNC
                    </Text>
                </Flex>

                <Box rounded="20px" border="1px solid" borderColor="waba.border" overflow="hidden" bg="#FAFAFC">
                    {/* Thumbnail Container */}
                    <Box
                        position="relative"
                        h="190px"
                        w="100%"
                        bg="waba.subtle"
                        display="flex"
                        alignItems="center"
                        justifyContent="center"
                        overflow="hidden"
                    >
                        {firstImagePreview ? (
                            <Image
                                src={firstImagePreview}
                                alt="미리보기 썸네일"
                                w="100%"
                                h="100%"
                                objectFit="cover"
                            />
                        ) : (
                            <VStack gap={2} color="waba.faint" py={6}>
                                <ImageIcon size={32} />
                                <Text fontSize="12px" fontWeight="600">
                                    사진을 추가하면 대표 썸네일로 표시됩니다
                                </Text>
                            </VStack>
                        )}
                        <HStack position="absolute" top={3} left={3} gap={1.5}>
                            <Box
                                bg="rgba(20, 20, 22, 0.8)"
                                backdropFilter="blur(6px)"
                                color="white"
                                fontSize="11px"
                                fontWeight="700"
                                px={2.5}
                                py={0.8}
                                rounded="full"
                            >
                                {boardId === 'SNAP'
                                    ? '일상 스냅'
                                    : boardId === 'LOOKBOOK'
                                        ? '공식 룩북'
                                        : boardId === 'CARE_LOUNGE'
                                            ? '케어 라운지'
                                            : '궁금증 Q&A'}
                            </Box>
                            {productPinsCount > 0 && (
                                <Box
                                    bg="rgba(99, 56, 169, 0.85)"
                                    backdropFilter="blur(6px)"
                                    color="white"
                                    fontSize="11px"
                                    fontWeight="700"
                                    px={2}
                                    py={0.8}
                                    rounded="full"
                                >
                                    상품 {productPinsCount}개
                                </Box>
                            )}
                        </HStack>
                    </Box>

                    {/* Meta Info & Title */}
                    <Box p={4} bg="white">
                        <Flex justify="space-between" align="center" mb={2}>
                            <HStack gap={2}>
                                <Box
                                    w="24px"
                                    h="24px"
                                    rounded="full"
                                    bg="waba.purpleLight"
                                    color="waba.purple"
                                    fontSize="11px"
                                    fontWeight="800"
                                    display="flex"
                                    alignItems="center"
                                    justifyContent="center"
                                >
                                    {currentUser?.nickname ? currentUser.nickname[0].toUpperCase() : 'W'}
                                </Box>
                                <Text fontSize="12px" fontWeight="600" color="waba.charcoal">
                                    @{currentUser?.nickname || '크리에이터'}
                                </Text>
                            </HStack>
                            <Box
                                bg="waba.purpleLight"
                                color="waba.purple"
                                fontSize="10px"
                                fontWeight="800"
                                px={2}
                                py={0.5}
                                rounded="full"
                            >
                                STYLE MENTOR
                            </Box>
                        </Flex>
                        <Heading
                            fontSize="15px"
                            fontWeight="700"
                            color="waba.charcoal"
                            lineClamp={2}
                            mb={3}
                        >
                            {title || '제목을 입력하면 여기에 실시간으로 반영됩니다'}
                        </Heading>

                        {/* Point 2: Tagged Items List STRICTLY EXCLUDES PETS! */}
                        <Box pt={3} borderTop="1px solid" borderColor="waba.subtle">
                            <Text fontSize="11px" fontWeight="600" color="waba.muted" mb={2}>
                                연동 상품 ({productPinsCount})
                            </Text>
                            {productPinsCount === 0 ? (
                                <Text fontSize="11px" color="waba.faint" fontStyle="italic">
                                    사진 위를 클릭해 상품 핀을 추가해보세요
                                </Text>
                            ) : (
                                <VStack gap={1.5} align="stretch">
                                    {allProductPins.slice(0, 3).map((pin, i) => (
                                        <Flex
                                            key={pin.pin_id}
                                            justify="space-between"
                                            align="center"
                                            p={2}
                                            bg="waba.subtle"
                                            rounded="12px"
                                            fontSize="12px"
                                        >
                                            <HStack gap={2} overflow="hidden">
                                                <Box
                                                    w="18px"
                                                    h="18px"
                                                    rounded="full"
                                                    bg={pin.is_official ? 'waba.purple' : 'waba.charcoal'}
                                                    color="white"
                                                    fontSize="10px"
                                                    fontWeight="800"
                                                    display="flex"
                                                    alignItems="center"
                                                    justifyContent="center"
                                                    flexShrink={0}
                                                >
                                                    {i + 1}
                                                </Box>
                                                <Text fontWeight="600" color="waba.charcoal" truncate>
                                                    {pin.product_name}
                                                </Text>
                                            </HStack>
                                            <Text
                                                fontSize="11px"
                                                fontWeight="700"
                                                color={pin.is_official ? 'waba.purple' : 'waba.muted'}
                                                flexShrink={0}
                                            >
                                                {pin.is_official ? '5% 적립' : '제휴 링크'}
                                            </Text>
                                        </Flex>
                                    ))}
                                </VStack>
                            )}
                        </Box>
                    </Box>
                </Box>
            </Box>

            {/* 2) Creator Reward Calculator Card */}
            <Box
                bg="white"
                rounded="24px"
                border="1px solid"
                borderColor="waba.border"
                p={5}
                boxShadow="0 8px 32px -4px rgba(26,28,30,0.04)"
            >
                <Flex justify="space-between" align="center" mb={4}>
                    <HStack gap={2}>
                        <Coins size={18} color="#6338A9" />
                        <Heading fontSize="15px" fontWeight="700" color="waba.charcoal">
                            리워드 혜택 계산기
                        </Heading>
                    </HStack>
                    <Box
                        bg="waba.purpleLight"
                        color="waba.purple"
                        fontSize="10px"
                        fontWeight="800"
                        px={2}
                        py={0.5}
                        rounded="full"
                    >
                        실시간 적립
                    </Box>
                </Flex>

                <Box bg="purple.50/40" p={4} rounded="18px" border="1px solid" borderColor="purple.100" mb={4}>
                    <Text fontSize="12px" color="waba.muted" mb={1}>
                        현재 예상 적립 포인트
                    </Text>
                    <HStack align="baseline" gap={1} color="waba.purple">
                        <Text fontSize="32px" fontWeight="800" letterSpacing="-0.03em">
                            +{calculatedPoints.toLocaleString()}
                        </Text>
                        <Text fontSize="18px" fontWeight="700">
                            P
                        </Text>
                    </HStack>
                </Box>

                <VStack gap={2.5} fontSize="13px" mb={4}>
                    <Flex justify="space-between" w="100%" color="waba.muted">
                        <Text>기본 에디토리얼 작성</Text>
                        <Text fontWeight="700" color="waba.charcoal">
                            +{totalImagesCount >= 1 ? '500' : '0'}P
                        </Text>
                    </Flex>
                    <Flex justify="space-between" w="100%" color="waba.muted">
                        <Text>연동 상품 {productPinsCount}개 태그 완료</Text>
                        <Text fontWeight="700" color="waba.charcoal">
                            +{(productPinsCount * 200).toLocaleString()}P
                        </Text>
                    </Flex>
                    {isMultiSpecies && (
                        <Flex justify="space-between" w="100%" color="waba.muted">
                            <Text>다종 합사 가중치 (+20%)</Text>
                            <Text fontWeight="700" color="waba.purple">
                                +600P
                            </Text>
                        </Flex>
                    )}
                </VStack>

                <Box p={3} bg="waba.subtle" rounded="14px" display="flex" gap={2.5} alignItems="center">
                    <Sparkles size={16} color="#6338A9" />
                    <Text fontSize="12px" color="waba.muted" lineHeight="1.4">
                        공식 룩북 승격 시 <strong style={{ color: '#141416' }}>+10,000P</strong> 및 앰버서더 배지가 지급됩니다.
                    </Text>
                </Box>
            </Box>

            {/* 3) Publish Readiness Checklist Card */}
            <Box
                bg="white"
                rounded="24px"
                border="1px solid"
                borderColor="waba.border"
                p={5}
                boxShadow="0 8px 32px -4px rgba(26,28,30,0.04)"
            >
                <Flex justify="space-between" align="center" mb={3}>
                    <Heading fontSize="15px" fontWeight="700" color="waba.charcoal">
                        발행 준비 완료도
                    </Heading>
                    <Text fontSize="15px" fontWeight="800" color="waba.purple">
                        {readinessPercentage}%
                    </Text>
                </Flex>

                <Box w="100%" bg="waba.subtle" h="8px" rounded="full" overflow="hidden" mb={4}>
                    <Box
                        bg="waba.purple"
                        h="100%"
                        rounded="full"
                        transition="width 0.4s ease"
                        w={`${readinessPercentage}%`}
                    />
                </Box>

                <VStack gap={2.5} align="stretch" fontSize="13px">
                    <HStack gap={2} color={isTitleValid ? 'waba.charcoal' : 'waba.muted'}>
                        {isTitleValid ? (
                            <CheckCircle2 size={16} color="#10B981" />
                        ) : (
                            <Circle size={16} color="#9E9DA6" />
                        )}
                        <Text fontWeight={isTitleValid ? '600' : '400'}>제목 5자 이상 입력</Text>
                    </HStack>

                    <HStack gap={2} color={isContentValid ? 'waba.charcoal' : 'waba.muted'}>
                        {isContentValid ? (
                            <CheckCircle2 size={16} color="#10B981" />
                        ) : (
                            <Circle size={16} color="#9E9DA6" />
                        )}
                        <Text fontWeight={isContentValid ? '600' : '400'}>본문 내용 30자 이상 충족</Text>
                    </HStack>

                    <HStack gap={2} color={isImageValid ? 'waba.charcoal' : 'waba.muted'}>
                        {isImageValid ? (
                            <CheckCircle2 size={16} color="#10B981" />
                        ) : (
                            <Circle size={16} color="#9E9DA6" />
                        )}
                        <Text fontWeight={isImageValid ? '600' : '400'}>고화질 사진 1장 이상 첨부</Text>
                    </HStack>

                    <HStack gap={2} color={isPinValid ? 'waba.charcoal' : 'waba.muted'}>
                        {isPinValid ? (
                            <CheckCircle2 size={16} color="#10B981" />
                        ) : (
                            <Circle size={16} color="#9E9DA6" />
                        )}
                        <Text fontWeight={isPinValid ? '600' : '400'}>상품 핀 최소 1개 이상 태깅</Text>
                    </HStack>
                </VStack>
            </Box>
        </>
    );
}

interface FullPreviewModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    blocks: EditorBlock[];
}

export function FullPreviewModal({
    open,
    onOpenChange,
    title,
    blocks,
}: FullPreviewModalProps) {
    return (
        <Dialog.Root open={open} onOpenChange={(e) => onOpenChange(e.open)} placement="center" size="xl">
            <Portal>
                <Dialog.Backdrop backdropFilter="blur(12px)" bg="blackAlpha.600" />
                <Dialog.Positioner>
                    <Dialog.Content rounded="28px" maxW="900px" maxH="90vh" overflowY="auto" p={8} bg="white">
                        <Flex justify="space-between" align="center" mb={6}>
                            <HStack gap={2}>
                                <Eye size={18} color="#6338A9" />
                                <Heading fontSize="18px" fontWeight="800">
                                    에디토리얼 미리보기
                                </Heading>
                            </HStack>
                            <CloseButton size="sm" rounded="full" onClick={() => onOpenChange(false)} />
                        </Flex>

                        <Heading fontSize="26px" fontWeight="800" color="waba.charcoal" mb={4}>
                            {title || '제목 없음'}
                        </Heading>

                        <VStack gap={6} align="stretch">
                            {blocks.map((b, idx) => {
                                if (b.type === 'text') {
                                    if (!b.content.trim()) return null;
                                    return (
                                        <Text
                                            key={`prev-${idx}`}
                                            fontSize="15px"
                                            lineHeight="1.85"
                                            color="waba.charcoal"
                                            whiteSpace="pre-wrap"
                                        >
                                            {b.content}
                                        </Text>
                                    );
                                }
                                if (b.type === 'image') {
                                    return (
                                        <Box key={`prev-img-${idx}`} rounded="20px" overflow="hidden">
                                            <Image src={b.previewUrl} alt="미리보기 사진" w="100%" rounded="20px" />
                                            {b.caption && (
                                                <Text fontSize="12px" color="waba.muted" mt={2} fontStyle="italic">
                                                    • {b.caption}
                                                </Text>
                                            )}
                                        </Box>
                                    );
                                }
                                return null;
                            })}
                        </VStack>
                    </Dialog.Content>
                </Dialog.Positioner>
            </Portal>
        </Dialog.Root>
    );
}
