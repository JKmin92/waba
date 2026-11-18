'use client'

import React from 'react';
import {
    Box,
    HStack,
    Stack,
    Text,
} from '@chakra-ui/react';
import { PostDetail as PostDetailType } from '@/interface';
import PostImagePins from '../PostImagePins';

interface PostDetailBodyProps {
    postDetail?: PostDetailType;
    activePinId?: string;
    onSelectPin: (pinId: string | undefined) => void;
}

export default function PostDetailBody({
    postDetail,
    activePinId,
    onSelectPin,
}: PostDetailBodyProps) {
    return (
        <Stack gap={6} minW={0}>
            {postDetail?.post.content.map((content, index) => {
                if (content.type === 'text') {
                    return (
                        <Text
                            key={`text-${index}`}
                            fontSize={{ base: '15px', md: '16px' }}
                            lineHeight="1.85"
                            color="var(--waba-ink)"
                            whiteSpace="pre-wrap"
                            wordBreak="break-word"
                        >
                            {content.content}
                        </Text>
                    );
                }
                if (content.type === 'image') {
                    const image = postDetail.post_images.filter((i) => i.id === content.image_id)[0];
                    const pins = postDetail.product_pins?.filter((pp) => pp.post_image_id === content.image_id);

                    return (
                        <PostImagePins
                            key={index + content.image_id}
                            imageSrc={image?.image_url || ''}
                            pins={pins}
                            activePinId={activePinId}
                            onSelectPin={onSelectPin}
                            isSensitive={Boolean(content.is_sensitive || image?.is_sensitive)}
                        />
                    );
                }
                return null;
            })}

            {postDetail?.tags && postDetail.tags.length > 0 && (
                <HStack gap={2} flexWrap="wrap" pt={2}>
                    {postDetail.tags.map((tag, idx) => (
                        <Box
                            key={idx}
                            bg="var(--waba-surface)"
                            border="1px solid"
                            borderColor="var(--waba-line)"
                            color="var(--waba-ink-2)"
                            fontSize="12px"
                            fontWeight="600"
                            borderRadius="full"
                            px="12px"
                            py="5px"
                        >
                            #{tag}
                        </Box>
                    ))}
                </HStack>
            )}
        </Stack>
    );
}
