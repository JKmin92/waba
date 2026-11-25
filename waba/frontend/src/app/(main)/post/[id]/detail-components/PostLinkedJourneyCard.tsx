'use client'

import React from 'react';
import {
    Avatar,
    Box,
    Flex,
    Heading,
    HStack,
    Separator,
    Stack,
    Text,
} from '@chakra-ui/react';
import { useRouter } from 'next/navigation';
import { PostDetail as PostDetailType } from '@/interface';
// import PostProductPinList from '../PostProductPinList';
import UserAvatar from '../../../common/UserAvatar';

interface PostLinkedJourneyCardProps {
    postDetail?: PostDetailType;
}

export default function PostLinkedJourneyCard({ postDetail }: PostLinkedJourneyCardProps) {
    const router = useRouter();

    const hasPets = Boolean(postDetail?.post_pets && postDetail.post_pets.length > 0);
    const hasCareVerification = Boolean(postDetail?.care_verification);
    const linkedJourneys = postDetail?.linked_journeys || [];
    const hasLinkedJourneys = linkedJourneys.length > 0;
    // const nonPetPins = postDetail?.product_pins?.filter((p) => p.pin_type !== 'PET') || [];
    // const hasProductPins = nonPetPins.length > 0;

    if (!hasPets && !hasCareVerification && !hasLinkedJourneys) {
        return null;
    }

    return (
        <Stack gap={6} minW={0}>
            {(hasPets || hasCareVerification || hasLinkedJourneys) && (
                <>
                    <Separator borderColor="var(--waba-line)" />
                    <Flex
                        direction={{ base: 'column', sm: 'row' }}
                        align={{ base: 'flex-start', sm: 'center' }}
                        justify="space-between"
                        gap={4}
                        bg="linear-gradient(135deg, var(--waba-purple-soft) 0%, var(--waba-surface) 100%)"
                        border="1px solid"
                        borderColor="var(--waba-purple-border)"
                        borderRadius="18px"
                        p={{ base: '14px 16px', md: '16px 18px' }}
                        minW={0}
                    >
                        <Stack gap={2.5} minW={0} flex="1">
                            <HStack gap={2} flexWrap="wrap">
                                <Text fontSize="11px" fontWeight="800" color="var(--waba-purple-text)">
                                    {hasLinkedJourneys ? '✨ 연결된 건강 수첩' : '🐾 연결된 반려동물'}
                                </Text>
                                {hasCareVerification && (
                                    <Box
                                        bg="#6338A9"
                                        color="white"
                                        fontSize="10px"
                                        fontWeight="700"
                                        px={2}
                                        py={0.5}
                                        borderRadius="full"
                                    >
                                        ✓ 수의사 공식 검증{postDetail?.care_verification?.disease_name ? ` (${postDetail.care_verification.disease_name})` : ''}
                                    </Box>
                                )}
                            </HStack>

                            {hasPets && (
                                <HStack gap={4} flexWrap="wrap">
                                    {postDetail!.post_pets!.map((pet) => (
                                        <HStack key={pet.pet_id} gap={2.5}>
                                            <UserAvatar
                                                src={pet.avatar_url}
                                                alt={pet.name}
                                                size="sm"
                                                fallbackType="pet"
                                            />
                                            <Box>
                                                <Heading fontSize="14px" fontWeight="700" color="var(--waba-ink)">
                                                    {pet.name}
                                                </Heading>
                                                {(pet.breed || pet.weight_kg) && (
                                                    <Text fontSize="11px" color="var(--waba-ink-3)">
                                                        {[pet.breed, pet.weight_kg ? `${pet.weight_kg}kg` : null]
                                                            .filter(Boolean)
                                                            .join(' · ')}
                                                    </Text>
                                                )}
                                            </Box>
                                        </HStack>
                                    ))}
                                </HStack>
                            )}
                        </Stack>

                        {hasLinkedJourneys && (
                            <HStack gap={2} flexWrap="wrap" flexShrink={0}>
                                {linkedJourneys.map((journey) => (
                                    <Box
                                        key={String(journey.id)}
                                        as="button"
                                        bg="var(--waba-card)"
                                        border="1px solid"
                                        borderColor="var(--waba-purple-border)"
                                        color="var(--waba-purple-text)"
                                        fontSize="12px"
                                        fontWeight="700"
                                        px="14px"
                                        py="8px"
                                        borderRadius="999px"
                                        cursor="pointer"
                                        maxW="220px"
                                        truncate
                                        _hover={{ bg: '#6338A9', color: '#FFFFFF' }}
                                        transition="all 0.15s"
                                        onClick={() => router.push(`/notebook/${journey.note_code || journey.id}`)}
                                    >
                                        {journey.title} 보기 →
                                    </Box>
                                ))}
                            </HStack>
                        )}
                    </Flex>
                </>
            )}

            {/* {hasProductPins && (
                <>
                    <Separator borderColor="var(--waba-line)" />
                    <PostProductPinList pins={postDetail!.product_pins} />
                </>
            )} */}
        </Stack>
    );
}
