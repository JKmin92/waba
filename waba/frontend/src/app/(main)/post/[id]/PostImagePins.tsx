'use client'

import { Box, CloseButton, FormatNumber, HStack, Image, Text } from "@chakra-ui/react";
import { ProductPinItem } from "@/interface";
import SensitiveImageOverlay from "../../common/SensitiveImageOverlay";

interface PostImagePinsProps {
    imageSrc: string;
    alt?: string;
    pins?: ProductPinItem[];
    activePinId?: string;
    onSelectPin: (pinId: string) => void;
    isSensitive?: boolean | number;
}

export default function PostImagePins({ imageSrc, alt = "post image", pins = [], activePinId, onSelectPin, isSensitive }: PostImagePinsProps) {
    return (
        <Box position="relative" rounded="xl" overflow="hidden" my="4" minH={isSensitive ? "260px" : undefined}>
            <Image src={imageSrc} alt={alt} width="100%" rounded="xl" />
            <SensitiveImageOverlay isSensitive={isSensitive} />
            {pins.map((pin) => {
                const isActive = activePinId === pin.pin_id;
                const isPetPin = pin.pin_type === 'PET';
                const pinBg = isPetPin ? 'purple.500' : pin.is_official ? 'waba.purple' : 'waba.charcoal';

                // 반려동물 핀의 경우 체중이 0 또는 미입력(0.0kg)일 때 표시하지 않도록 클렌징
                const cleanProductName = isPetPin && pin.product_name
                    ? pin.product_name
                        .replace(/[,·\s]*0(\.0+)?kg/gi, '')
                        .replace(/\(\s*,?\s*\)/g, '')
                        .replace(/\s{2,}/g, ' ')
                        .trim()
                    : pin.product_name;

                return (
                    <Box
                        key={pin.pin_id}
                        position="absolute"
                        left={`${pin.pos_x}%`}
                        top={`${pin.pos_y}%`}
                        transform="translate(-50%, -50%)"
                        zIndex="20"
                    >
                        {/* 핀 포인트 버튼 */}
                        <Box
                            as="button"
                            onClick={() => onSelectPin(isActive ? '' : pin.pin_id)}
                            w="28px"
                            h="28px"
                            p={0}
                            m={0}
                            lineHeight="1"
                            position="relative"
                            outline="none"
                            flexShrink={0}
                            rounded="full"
                            bg={pinBg}
                            color="white"
                            border="2px solid white"
                            boxShadow="0 4px 12px rgba(0, 0, 0, 0.25)"
                            cursor="pointer"
                            transition="transform 0.15s cubic-bezier(0.4, 0, 0.2, 1)"
                            _hover={{ transform: 'scale(1.12)' }}
                        >
                            <Box
                                position="absolute"
                                top="50%"
                                left="50%"
                                transform="translate(-50%, -50%)"
                                w={isActive ? '8px' : '6px'}
                                h={isActive ? '8px' : '6px'}
                                rounded="full"
                                bg="white"
                                flexShrink={0}
                                transition="width 0.15s, height 0.15s"
                            />
                        </Box>

                        {/* 활성 핀 상세 팝오버 툴팁 */}
                        {isActive && (
                            <Box
                                position="absolute"
                                bottom="36px"
                                left="50%"
                                transform="translateX(-50%)"
                                bg="rgba(255, 255, 255, 0.95)"
                                backdropFilter="blur(12px)"
                                p={3}
                                borderRadius="16px"
                                border="1px solid"
                                borderColor="waba.border"
                                boxShadow="0 10px 25px rgba(0,0,0,0.18)"
                                minW="200px"
                                whiteSpace="nowrap"
                                zIndex={30}
                            >
                                <CloseButton
                                    size="2xs"
                                    position="absolute"
                                    top="1"
                                    right="1"
                                    rounded="full"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onSelectPin('');
                                    }}
                                />
                                <HStack gap={2} mb={1}>
                                    <Text fontSize="11px" fontWeight="700" color="waba.purple">
                                        {isPetPin ? '반려동물 태그' : pin.brand_name}
                                    </Text>
                                    {Boolean(pin.is_official) && (
                                        <Text fontSize="10px" color="gray.500">5% 적립</Text>
                                    )}
                                </HStack>
                                <Text fontSize="13px" fontWeight="700" color="waba.charcoal">
                                    {cleanProductName}
                                </Text>
                                {pin.price > 0 && (
                                    <Text fontSize="12px" fontWeight="600" color="gray.700" mt={0.5}>
                                        <FormatNumber currency="KRW" style="currency" value={pin.price} />
                                    </Text>
                                )}
                                {pin.pin_option_memo && (
                                    <Text fontSize="11px" color="gray.500" mt={1}>
                                        "{pin.pin_option_memo}"
                                    </Text>
                                )}
                            </Box>
                        )}
                    </Box>
                );
            })}
        </Box>
    );
}
