'use client'

import { Box, CloseButton, FormatNumber, HStack, Image, Text } from "@chakra-ui/react";
import { ProductPinItem } from "@/interface";

interface PostImagePinsProps {
    imageSrc: string;
    alt?: string;
    pins?: ProductPinItem[];
    activePinId?: string;
    onSelectPin: (pinId: string) => void;
}

export default function PostImagePins({ imageSrc, alt = "post image", pins = [], activePinId, onSelectPin }: PostImagePinsProps) {
    return (
        <Box position="relative" rounded="xl" overflow="hidden" my="4">
            <Image src={imageSrc} alt={alt} width="100%" rounded="xl" />
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
                            rounded="full"
                            bg={pinBg}
                            color="white"
                            border="2px solid white"
                            boxShadow="0 4px 12px rgba(0, 0, 0, 0.25)"
                            display="flex"
                            alignItems="center"
                            justifyContent="center"
                            cursor="pointer"
                            transition="transform 0.15s"
                            _hover={{ transform: 'scale(1.12)' }}
                        >
                            <Box w={isActive ? '8px' : '5px'} h={isActive ? '8px' : '5px'} rounded="full" bg="white" />
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
