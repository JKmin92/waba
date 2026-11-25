'use client'

import { Box, chakra, FormatNumber, Heading, HStack, IconButton, Image, Stack, StackSeparator, Text } from "@chakra-ui/react";
import { ArrowUpRight, ShoppingCart } from "lucide-react";
import { ProductPinItem } from "@/interface";
import { getSafeExternalUrl } from "./PostImagePins";

interface PostProductPinListProps {
    pins?: ProductPinItem[];
}

export default function PostProductPinList({ pins = [] }: PostProductPinListProps) {
    const productPins = pins.filter((p) => p.pin_type !== 'PET');
    if (productPins.length === 0) return null;

    return (
        <Stack gap="5">
            <Stack gap="0">
                <Text color="fg.subtle">CURATED OBJECTS</Text>
                <Heading>태그된 전체 제품</Heading>
            </Stack>
            <HStack gap="6" overflowX="auto" pb={2}>
                {productPins.map((pin) => {
                    const safeExternalUrl = getSafeExternalUrl(pin.external_url);
                    return (
                        <Stack key={pin.pin_id} separator={<StackSeparator />} bg="bg" rounded="xl" p="4" gap="4" minW="220px">
                            <Stack>
                                <Image
                                    src={pin.thumbnail_url || ''}
                                    alt={pin.product_name}
                                    aspectRatio={1.5 / 1}
                                    w="full"
                                    rounded="xl"
                                    objectFit="cover"
                                />
                                <Stack gap="0">
                                    <Box fontSize="sm">{pin.brand_name}</Box>
                                    {safeExternalUrl ? (
                                        <chakra.a
                                            href={safeExternalUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            fontSize="md"
                                            fontWeight="700"
                                            _hover={{ color: 'var(--waba-purple-text)', textDecoration: 'underline' }}
                                        >
                                            {pin.product_name}
                                        </chakra.a>
                                    ) : (
                                        <Heading fontSize="md">{pin.product_name}</Heading>
                                    )}
                                    {pin.pin_option_memo && (
                                        <Text fontSize="sm" color="fg.muted">{pin.pin_option_memo}</Text>
                                    )}
                                </Stack>
                            </Stack>
                            <HStack justifyContent="space-between">
                                <Heading><FormatNumber value={pin.price} />원</Heading>
                                {safeExternalUrl ? (
                                    <IconButton
                                        aria-label="외부몰 링크 이동"
                                        rounded="full"
                                        onClick={() => window.open(safeExternalUrl, '_blank', 'noopener,noreferrer')}
                                    >
                                        <ArrowUpRight size={18} />
                                    </IconButton>
                                ) : (
                                    <IconButton aria-label="장바구니" rounded="full">
                                        <ShoppingCart size={18} />
                                    </IconButton>
                                )}
                            </HStack>
                        </Stack>
                    );
                })}
            </HStack>
        </Stack>
    );
}
