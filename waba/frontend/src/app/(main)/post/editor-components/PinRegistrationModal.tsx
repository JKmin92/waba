'use client'

import React from 'react';
import {
    Avatar,
    Box,
    Button,
    CloseButton,
    Dialog,
    Flex,
    HStack,
    IconButton,
    Image,
    Input,
    Portal,
    Text,
    VStack,
} from '@chakra-ui/react';
import {
    AlertCircle,
    CheckCircle,
    CheckCircle2,
    Link as LinkIcon,
    Search,
} from 'lucide-react';
import { ParsedExternalMetadata } from './types';

interface PinRegistrationModalProps {
    open: boolean;
    onClose: () => void;
    pinCoords: { x: number; y: number };
    pinTypeTab: 'INTERNAL_PRODUCT' | 'EXTERNAL_PRODUCT' | 'PET';
    onPinTypeTabChange: (tab: 'INTERNAL_PRODUCT' | 'EXTERNAL_PRODUCT' | 'PET') => void;
    // Official Product Search
    productSearchKeyword: string;
    onProductSearchKeywordChange: (keyword: string) => void;
    onFetchOfficialProducts: (keyword: string) => void;
    isSearchingProducts: boolean;
    officialProducts: any[];
    selectedOfficialProduct: any | null;
    onSelectOfficialProduct: (product: any) => void;
    // External URL
    externalUrlInput: string;
    onExternalUrlInputChange: (url: string) => void;
    analyzedExternalUrl: string;
    isParsingUrl: boolean;
    onParseExternalUrl: () => void;
    parsedMetadata: ParsedExternalMetadata | null;
    onParsedMetadataChange: (metadata: ParsedExternalMetadata | null) => void;
    manualExternalFallback: boolean;
    onManualExternalFallbackChange: (fallback: boolean) => void;
    // Pet Tag
    userPetsList: any[];
    selectedPetForPin: any | null;
    onSelectPetForPin: (pet: any) => void;
    // Memo & Save
    pinOptionMemo: string;
    onPinOptionMemoChange: (memo: string) => void;
    onSavePin: () => void;
}

export default function PinRegistrationModal({
    open,
    onClose,
    pinCoords,
    pinTypeTab,
    onPinTypeTabChange,
    productSearchKeyword,
    onProductSearchKeywordChange,
    onFetchOfficialProducts,
    isSearchingProducts,
    officialProducts,
    selectedOfficialProduct,
    onSelectOfficialProduct,
    externalUrlInput,
    onExternalUrlInputChange,
    analyzedExternalUrl,
    isParsingUrl,
    onParseExternalUrl,
    parsedMetadata,
    onParsedMetadataChange,
    manualExternalFallback,
    onManualExternalFallbackChange,
    userPetsList,
    selectedPetForPin,
    onSelectPetForPin,
    pinOptionMemo,
    onPinOptionMemoChange,
    onSavePin,
}: PinRegistrationModalProps) {
    const isExternalUrlInvalid =
        !analyzedExternalUrl || externalUrlInput.trim() !== analyzedExternalUrl;

    return (
        <Dialog.Root
            open={open}
            onOpenChange={(e) => {
                if (!e.open) {
                    onClose();
                }
            }}
            placement="center"
            size="md"
        >
            <Portal>
                <Dialog.Backdrop backdropFilter="blur(10px)" bg="blackAlpha.500" />
                <Dialog.Positioner>
                    <Dialog.Content rounded="28px" p={6} bg="white">
                        <Dialog.Header p={0} mb={4}>
                            <Flex justify="space-between" align="center">
                                <Dialog.Title fontSize="18px" fontWeight="800" color="waba.charcoal">
                                    📌 사진 위 상품 / 반려동물 핀 태깅
                                </Dialog.Title>
                                <CloseButton
                                    size="sm"
                                    rounded="full"
                                    onClick={onClose}
                                />
                            </Flex>
                            <Text fontSize="12px" color="waba.muted" mt={1}>
                                선택한 위치 (가로: {pinCoords.x}%, 세로: {pinCoords.y}%)
                            </Text>
                        </Dialog.Header>

                        <Dialog.Body p={0}>
                            <VStack gap={4} align="stretch">
                                {/* Tab Selector */}
                                <Box>
                                    <Text fontSize="12px" fontWeight="700" color="waba.muted" mb={2}>
                                        핀 유형 선택
                                    </Text>
                                    <HStack gap={2}>
                                        <Button
                                            flex="1"
                                            size="sm"
                                            rounded="full"
                                            fontSize="12px"
                                            fontWeight="700"
                                            bg={pinTypeTab === 'INTERNAL_PRODUCT' ? 'waba.purple' : 'waba.subtle'}
                                            color={pinTypeTab === 'INTERNAL_PRODUCT' ? 'white' : 'waba.charcoal'}
                                            onClick={() => onPinTypeTabChange('INTERNAL_PRODUCT')}
                                        >
                                            ✨ 와바미 공식 (5% 적립)
                                        </Button>
                                        <Button
                                            flex="1"
                                            size="sm"
                                            rounded="full"
                                            fontSize="12px"
                                            fontWeight="600"
                                            bg={pinTypeTab === 'EXTERNAL_PRODUCT' ? 'waba.charcoal' : 'waba.subtle'}
                                            color={pinTypeTab === 'EXTERNAL_PRODUCT' ? 'white' : 'waba.charcoal'}
                                            onClick={() => onPinTypeTabChange('EXTERNAL_PRODUCT')}
                                        >
                                            🔗 외부 쇼핑몰 제휴
                                        </Button>
                                        <Button
                                            flex="1"
                                            size="sm"
                                            rounded="full"
                                            fontSize="12px"
                                            fontWeight="600"
                                            bg={pinTypeTab === 'PET' ? 'purple.700' : 'waba.subtle'}
                                            color={pinTypeTab === 'PET' ? 'white' : 'waba.charcoal'}
                                            onClick={() => onPinTypeTabChange('PET')}
                                        >
                                            🐾 반려동물 태그
                                        </Button>
                                    </HStack>
                                </Box>

                                {/* TAB 1: 와바미 공식 상품 */}
                                {pinTypeTab === 'INTERNAL_PRODUCT' && (
                                    <Box>
                                        <Text fontSize="12px" fontWeight="700" color="waba.muted" mb={2}>
                                            와바미 상품 검색 &amp; 선택
                                        </Text>
                                        <HStack gap={2} mb={3}>
                                            <Input
                                                value={productSearchKeyword}
                                                onChange={(e) => {
                                                    onProductSearchKeywordChange(e.target.value);
                                                    onFetchOfficialProducts(e.target.value);
                                                }}
                                                placeholder="와바미 상품명 또는 키워드 검색 (예: 워터볼, 매트, 캣폴...)"
                                                fontSize="13px"
                                                rounded="full"
                                                borderColor="waba.border"
                                            />
                                            <IconButton
                                                aria-label="상품 검색"
                                                size="sm"
                                                rounded="full"
                                                bg="waba.purple"
                                                color="white"
                                                onClick={() => onFetchOfficialProducts(productSearchKeyword)}
                                                loading={isSearchingProducts}
                                            >
                                                <Search size={15} />
                                            </IconButton>
                                        </HStack>

                                        <VStack gap={1.5} align="stretch" maxH="220px" overflowY="auto" pr={1}>
                                            {officialProducts.length === 0 ? (
                                                <Text fontSize="12px" color="waba.faint" textAlign="center" py={4}>
                                                    검색된 와바미 상품이 없습니다.
                                                </Text>
                                            ) : (
                                                officialProducts.map((p) => {
                                                    const isSelected = selectedOfficialProduct?.id === p.id;
                                                    return (
                                                        <Box
                                                            key={p.id}
                                                            as="button"
                                                            onClick={() => onSelectOfficialProduct(p)}
                                                            display="flex"
                                                            justifyContent="space-between"
                                                            alignItems="center"
                                                            p={2.5}
                                                            bg={isSelected ? 'purple.50' : 'waba.subtle'}
                                                            border="1px solid"
                                                            borderColor={isSelected ? 'waba.purple' : 'transparent'}
                                                            rounded="14px"
                                                            fontSize="12px"
                                                            textAlign="left"
                                                            _hover={{ bg: 'purple.50' }}
                                                        >
                                                            <HStack gap={2.5} overflow="hidden">
                                                                {p.thumbnail_url && (
                                                                    <Image
                                                                        src={p.thumbnail_url}
                                                                        alt={p.name}
                                                                        w="36px"
                                                                        h="36px"
                                                                        rounded="8px"
                                                                        objectFit="cover"
                                                                    />
                                                                )}
                                                                <Box>
                                                                    <Text fontWeight="700" color="waba.charcoal" truncate>
                                                                        {p.name}
                                                                    </Text>
                                                                    <Text fontSize="11px" color="waba.muted" truncate>
                                                                        {p.summary || '와바미 라이프스타일 셀렉션'}
                                                                    </Text>
                                                                </Box>
                                                            </HStack>
                                                            <HStack gap={2} flexShrink={0}>
                                                                <Text fontWeight="800" color="waba.purple">
                                                                    {Number(p.sale_price).toLocaleString()}원
                                                                </Text>
                                                                {isSelected && <CheckCircle size={16} color="#6338A9" />}
                                                            </HStack>
                                                        </Box>
                                                    );
                                                })
                                            )}
                                        </VStack>
                                    </Box>
                                )}

                                {/* TAB 2: 외부 쇼핑몰 제휴 */}
                                {pinTypeTab === 'EXTERNAL_PRODUCT' && (
                                    <Box>
                                        <Text fontSize="12px" fontWeight="700" color="waba.muted" mb={2}>
                                            외부 쇼핑몰 URL 입력 및 메타데이터 가져오기
                                        </Text>
                                        <HStack gap={2} mb={3}>
                                            <Input
                                                value={externalUrlInput}
                                                onChange={(e) => onExternalUrlInputChange(e.target.value)}
                                                placeholder="예: https://smartstore.naver.com/... 또는 쿠팡 링크"
                                                fontSize="13px"
                                                rounded="full"
                                                borderColor="waba.border"
                                            />
                                            <Button
                                                size="sm"
                                                bg="waba.charcoal"
                                                color="white"
                                                _hover={{ bg: 'waba.charcoalHover' }}
                                                rounded="full"
                                                px={4}
                                                fontSize="12px"
                                                fontWeight="700"
                                                onClick={onParseExternalUrl}
                                                loading={isParsingUrl}
                                                flexShrink={0}
                                            >
                                                <LinkIcon size={14} />
                                                URL 분석
                                            </Button>
                                        </HStack>

                                        {isExternalUrlInvalid && (
                                            <HStack gap={1.5} color="orange.600" fontSize="12px" fontWeight="600" mb={3}>
                                                <AlertCircle size={14} />
                                                <Text>외부 링크 입력 후 &apos;URL 분석&apos;을 먼저 완료해주세요.</Text>
                                            </HStack>
                                        )}

                                        {parsedMetadata && !manualExternalFallback && (
                                            <Box p={3.5} bg="purple.50/50" rounded="16px" border="1px solid" borderColor="purple.200" mb={3}>
                                                <Flex justify="space-between" align="center" mb={2}>
                                                    <HStack gap={1.5} color="waba.purple" fontSize="12px" fontWeight="700">
                                                        <CheckCircle2 size={15} />
                                                        <Text>메타데이터 자동 추출 완료</Text>
                                                    </HStack>
                                                    <Button
                                                        size="2xs"
                                                        variant="ghost"
                                                        color="waba.muted"
                                                        onClick={() => onManualExternalFallbackChange(true)}
                                                    >
                                                        직접 수정
                                                    </Button>
                                                </Flex>
                                                <HStack gap={3}>
                                                    {parsedMetadata.thumbnail_url && (
                                                        <Image
                                                            src={parsedMetadata.thumbnail_url}
                                                            alt={parsedMetadata.product_name}
                                                            w="48px"
                                                            h="48px"
                                                            rounded="10px"
                                                            objectFit="cover"
                                                        />
                                                    )}
                                                    <Box overflow="hidden">
                                                        <Text fontSize="13px" fontWeight="700" color="waba.charcoal" truncate>
                                                            {parsedMetadata.product_name}
                                                        </Text>
                                                        <HStack gap={2} fontSize="12px" color="waba.muted">
                                                            <Text>{parsedMetadata.brand_name}</Text>
                                                            {parsedMetadata.price > 0 && (
                                                                <Text fontWeight="700" color="waba.charcoal">
                                                                    {parsedMetadata.price.toLocaleString()}원
                                                                </Text>
                                                            )}
                                                        </HStack>
                                                    </Box>
                                                </HStack>
                                            </Box>
                                        )}

                                        {(!parsedMetadata || manualExternalFallback) && (
                                            <VStack gap={3} align="stretch" p={3.5} bg="waba.subtle" rounded="16px">
                                                <Box>
                                                    <Text fontSize="12px" fontWeight="700" color="waba.muted" mb={1}>
                                                        상품명 (직접 입력)
                                                    </Text>
                                                    <Input
                                                        value={parsedMetadata?.product_name || ''}
                                                        onChange={(e) =>
                                                            onParsedMetadataChange({
                                                                ...parsedMetadata,
                                                                product_name: e.target.value,
                                                                brand_name: parsedMetadata?.brand_name || '외부 제휴',
                                                                price: parsedMetadata?.price || 0,
                                                            })
                                                        }
                                                        placeholder="예: 방수 스크래치프루프 라운드 소파"
                                                        fontSize="13px"
                                                        bg="white"
                                                        rounded="12px"
                                                    />
                                                </Box>
                                                <HStack gap={2}>
                                                    <Box flex="1">
                                                        <Text fontSize="12px" fontWeight="700" color="waba.muted" mb={1}>
                                                            브랜드 / 판매처
                                                        </Text>
                                                        <Input
                                                            value={parsedMetadata?.brand_name || ''}
                                                            onChange={(e) =>
                                                                onParsedMetadataChange({
                                                                    ...parsedMetadata,
                                                                    product_name: parsedMetadata?.product_name || '',
                                                                    brand_name: e.target.value,
                                                                    price: parsedMetadata?.price || 0,
                                                                })
                                                            }
                                                            placeholder="예: 쿠팡, 오늘의집"
                                                            fontSize="13px"
                                                            bg="white"
                                                            rounded="12px"
                                                        />
                                                    </Box>
                                                    <Box flex="1">
                                                        <Text fontSize="12px" fontWeight="700" color="waba.muted" mb={1}>
                                                            가격 (원)
                                                        </Text>
                                                        <Input
                                                            type="number"
                                                            value={parsedMetadata?.price || ''}
                                                            onChange={(e) =>
                                                                onParsedMetadataChange({
                                                                    ...parsedMetadata,
                                                                    product_name: parsedMetadata?.product_name || '',
                                                                    brand_name: parsedMetadata?.brand_name || '외부 제휴',
                                                                    price: Number(e.target.value) || 0,
                                                                })
                                                            }
                                                            placeholder="0"
                                                            fontSize="13px"
                                                            bg="white"
                                                            rounded="12px"
                                                        />
                                                    </Box>
                                                </HStack>
                                            </VStack>
                                        )}
                                    </Box>
                                )}

                                {/* TAB 3: 반려동물 태그 */}
                                {pinTypeTab === 'PET' && (
                                    <Box>
                                        <Text fontSize="12px" fontWeight="700" color="waba.muted" mb={2}>
                                            나의 등록된 반려동물 선택
                                        </Text>
                                        {userPetsList.length === 0 ? (
                                            <Box p={4} bg="waba.subtle" rounded="16px" textAlign="center">
                                                <Text fontSize="12px" color="waba.muted">
                                                    등록된 반려동물이 없습니다. 마이페이지에서 먼저 아이를 등록해주세요.
                                                </Text>
                                            </Box>
                                        ) : (
                                            <VStack gap={2} align="stretch">
                                                {userPetsList.map((pet) => {
                                                    const isSelected = selectedPetForPin?.id === pet.id;
                                                    const speciesIcon = pet.species === 'CAT' ? '🐱' : pet.species === 'DOG' ? '🐶' : pet.species === 'RABBIT' ? '🐰' : '🐾';
                                                    return (
                                                        <Box
                                                            key={pet.id}
                                                            as="button"
                                                            onClick={() => onSelectPetForPin(pet)}
                                                            display="flex"
                                                            justifyContent="space-between"
                                                            alignItems="center"
                                                            p={3}
                                                            bg={isSelected ? 'purple.50' : 'waba.subtle'}
                                                            border="1px solid"
                                                            borderColor={isSelected ? 'purple.400' : 'transparent'}
                                                            rounded="16px"
                                                            textAlign="left"
                                                            _hover={{ bg: 'purple.50' }}
                                                        >
                                                            <HStack gap={3}>
                                                                <Avatar.Root size="sm">
                                                                    {pet.current_avatar_url ? (
                                                                        <Avatar.Image src={pet.current_avatar_url} />
                                                                    ) : (
                                                                        <Avatar.Fallback>{speciesIcon}</Avatar.Fallback>
                                                                    )}
                                                                </Avatar.Root>
                                                                <Box>
                                                                    <HStack gap={1.5}>
                                                                        <Text fontSize="13px" fontWeight="700" color="waba.charcoal">
                                                                            {pet.name}
                                                                        </Text>
                                                                        <Text fontSize="11px" color="waba.purple" fontWeight="600">
                                                                            {pet.species}
                                                                        </Text>
                                                                    </HStack>
                                                                    <Text fontSize="12px" color="waba.muted">
                                                                        {pet.breed}
                                                                        {pet.latest_weight_kg !== null && pet.latest_weight_kg !== undefined && Number(pet.latest_weight_kg) > 0
                                                                            ? ` · ${Number(pet.latest_weight_kg).toFixed(1)}kg`
                                                                            : ''}
                                                                    </Text>
                                                                </Box>
                                                            </HStack>
                                                            {isSelected && <CheckCircle size={18} color="#6338A9" />}
                                                        </Box>
                                                    );
                                                })}
                                            </VStack>
                                        )}
                                    </Box>
                                )}

                                {/* Common Pin Memo */}
                                <Box pt={2}>
                                    <Text fontSize="12px" fontWeight="700" color="waba.muted" mb={1.5}>
                                        사용자 팁 / 코멘트 (선택)
                                    </Text>
                                    <Input
                                        value={pinOptionMemo}
                                        onChange={(e) => onPinOptionMemoChange(e.target.value)}
                                        placeholder="예: 4.8kg 아이도 흔들림 없이 편안하게 쉬어요"
                                        rounded="14px"
                                        fontSize="13px"
                                        borderColor="waba.border"
                                    />
                                </Box>
                            </VStack>
                        </Dialog.Body>

                        <Dialog.Footer p={0} mt={6}>
                            <HStack justify="flex-end" w="100%" gap={2}>
                                <Button
                                    variant="outline"
                                    rounded="full"
                                    size="sm"
                                    borderColor="waba.border"
                                    onClick={onClose}
                                >
                                    취소
                                </Button>
                                <Button
                                    bg="waba.purple"
                                    color="white"
                                    _hover={{ bg: 'waba.purpleHover' }}
                                    rounded="full"
                                    size="sm"
                                    px={5}
                                    fontWeight="700"
                                    onClick={onSavePin}
                                    disabled={pinTypeTab === 'EXTERNAL_PRODUCT' && isExternalUrlInvalid}
                                >
                                    핀 등록 완료
                                </Button>
                            </HStack>
                        </Dialog.Footer>
                    </Dialog.Content>
                </Dialog.Positioner>
            </Portal>
        </Dialog.Root>
    );
}
