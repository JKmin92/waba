'use client'

import { Box, chakra, CloseButton, FormatNumber, HStack, Image, Text } from "@chakra-ui/react";
import { ExternalLink } from "lucide-react";
import { PostDetail, ProductPinItem } from "@/interface";
import SensitiveImageOverlay from "../../common/SensitiveImageOverlay";
import UserAvatar from "../../common/UserAvatar";

export function getSafeExternalUrl(rawUrl?: string | null): string | null {
    const trimmed = rawUrl?.trim();
    if (!trimmed) return null;
    try {
        const parsed = new URL(trimmed);
        return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? parsed.href : null;
    } catch {
        if (!trimmed.includes(' ') && trimmed.includes('.')) {
            try {
                const parsed = new URL(`https://${trimmed}`);
                return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? parsed.href : null;
            } catch {
                return null;
            }
        }
        return null;
    }
}

function getDisplayHostname(safeUrl: string): string {
    try {
        return new URL(safeUrl).hostname.replace(/^www\./, '');
    } catch {
        return safeUrl;
    }
}

interface PostImagePinsProps {
    imageSrc: string;
    alt?: string;
    pins?: ProductPinItem[];
    postPets?: PostDetail['post_pets'];
    activePinId?: string;
    onSelectPin: (pinId: string) => void;
    isSensitive?: boolean | number;
}

export default function PostImagePins({ imageSrc, alt = "post image", pins = [], postPets = [], activePinId, onSelectPin, isSensitive }: PostImagePinsProps) {
    return (
        <Box position="relative" rounded="xl" overflow="hidden" my="4" minH={isSensitive ? "260px" : undefined}>
            <Image src={imageSrc} alt={alt} width="100%" rounded="xl" />
            <SensitiveImageOverlay isSensitive={isSensitive} />
            {pins.map((pin) => {
                const isActive = activePinId === pin.pin_id;
                const isPetPin = pin.pin_type === 'PET';
                const pinBg = isPetPin ? '#6338A9' : pin.is_official ? '#6338A9' : '#334155';
                const safeExternalUrl = !isPetPin ? getSafeExternalUrl(pin.external_url) : null;
                const displayHost = safeExternalUrl ? getDisplayHostname(safeExternalUrl) : '';

                const posY = Number(pin.pos_y);
                const posX = Number(pin.pos_x);
                const openBelow = posY < 35;
                const alignLeft = posX < 25;
                const alignRight = posX > 75;

                const strippedName = isPetPin && pin.product_name
                    ? pin.product_name.replace(/\s*\([^)]*\)\s*$/, '').trim()
                    : '';
                const matchedPet = isPetPin
                    ? postPets.find((p) =>
                        (pin.pet_id && String(p.pet_id) === String(pin.pet_id)) ||
                        (strippedName && p.name === strippedName)
                    )
                    : undefined;
                const petName = isPetPin ? (matchedPet?.name || strippedName) : '';
                const petAvatar = isPetPin ? matchedPet?.avatar_url || (pin as any).product_image_url : undefined;

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
                                top={openBelow ? "36px" : undefined}
                                bottom={openBelow ? undefined : "36px"}
                                left={alignLeft ? "0" : alignRight ? "auto" : "50%"}
                                right={alignRight ? "0" : undefined}
                                transform={alignLeft || alignRight ? "none" : "translateX(-50%)"}
                                bg="var(--waba-card)"
                                backdropFilter="blur(12px)"
                                p={3}
                                borderRadius="16px"
                                border="1px solid"
                                borderColor="var(--waba-line)"
                                boxShadow="0 10px 25px rgba(0,0,0,0.18)"
                                minW="210px"
                                maxW="260px"
                                whiteSpace="normal"
                                zIndex={30}
                            >
                                <CloseButton
                                    size="2xs"
                                    position="absolute"
                                    top="1"
                                    right="1"
                                    rounded="full"
                                    color="var(--waba-ink)"
                                    _hover={{ bg: 'var(--waba-surface)' }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onSelectPin('');
                                    }}
                                />
                                <HStack gap={2} mb={1} pr={6}>
                                    <Text fontSize="11px" fontWeight="700" color="var(--waba-purple-text)">
                                        {isPetPin ? '반려동물 태그' : pin.brand_name}
                                    </Text>
                                    {Boolean(pin.is_official) && (
                                        <Text fontSize="10px" color="var(--waba-ink-3)">5% 적립</Text>
                                    )}
                                </HStack>
                                {isPetPin ? (
                                    <HStack gap={2} mt={0.5}>
                                        <UserAvatar
                                            src={petAvatar}
                                            alt={petName || '반려동물'}
                                            size="xs"
                                            fallbackType="pet"
                                        />
                                        <Text fontSize="13px" fontWeight="700" color="var(--waba-ink)">
                                            {petName}
                                        </Text>
                                    </HStack>
                                ) : safeExternalUrl ? (
                                    <chakra.a
                                        href={safeExternalUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        display="inline-flex"
                                        alignItems="flex-start"
                                        gap={1}
                                        fontSize="13px"
                                        fontWeight="700"
                                        color="var(--waba-ink)"
                                        lineHeight="1.35"
                                        _hover={{ color: 'var(--waba-purple-text)', textDecoration: 'underline' }}
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        {pin.product_name}
                                    </chakra.a>
                                ) : (
                                    <Text fontSize="13px" fontWeight="700" color="var(--waba-ink)">
                                        {pin.product_name}
                                    </Text>
                                )}
                                {pin.price > 0 && (
                                    <Text fontSize="12px" fontWeight="600" color="var(--waba-ink-2)" mt={0.5}>
                                        <FormatNumber currency="KRW" style="currency" value={pin.price} />
                                    </Text>
                                )}
                                {pin.pin_option_memo && (
                                    <Text fontSize="11px" color="var(--waba-ink-3)" mt={1}>
                                        "{pin.pin_option_memo}"
                                    </Text>
                                )}
                                {!isPetPin && safeExternalUrl && (
                                    <Box mt={2} pt={2} borderTop="1px solid" borderColor="var(--waba-line)">
                                        <chakra.a
                                            href={safeExternalUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            onClick={(e) => e.stopPropagation()}
                                            display="flex"
                                            alignItems="center"
                                            justifyContent="space-between"
                                            gap={2}
                                            px={2}
                                            py={1.5}
                                            borderRadius="10px"
                                            bg="var(--waba-purple-soft)"
                                            _hover={{ opacity: 0.9 }}
                                            transition="opacity 0.15s"
                                        >
                                            <Text truncate fontSize="11px" color="var(--waba-ink-2)" minW={0}>
                                                {displayHost}
                                            </Text>
                                            <HStack gap={1} flexShrink={0} color="var(--waba-purple-text)" fontSize="11px" fontWeight="700">
                                                <Text>링크 열기</Text>
                                                <ExternalLink size={12} />
                                            </HStack>
                                        </chakra.a>
                                    </Box>
                                )}
                            </Box>
                        )}
                    </Box>
                );
            })}
        </Box>
    );
}
