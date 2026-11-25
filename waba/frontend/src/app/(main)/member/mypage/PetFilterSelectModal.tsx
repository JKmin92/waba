'use client'

import React, { useEffect, useMemo, useState } from 'react';
import {
    Box,
    Button,
    CloseButton,
    Dialog,
    Flex,
    Grid,
    HStack,
    Input,
    Portal,
    Text,
    VStack,
} from '@chakra-ui/react';
import { LuCheck, LuSearch, LuX } from 'react-icons/lu';
import { Pet } from '@/interface';
import UserAvatar from '../../common/UserAvatar';

interface PetFilterSelectModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    pets: Pet[];
    selectedPetIds: string[];
    onApply: (petIds: string[]) => void;
    title?: string;
}

const PAGE_SIZE = 60;

export default function PetFilterSelectModal({
    open,
    onOpenChange,
    pets,
    selectedPetIds,
    onApply,
    title = '반려동물 필터 선택',
}: PetFilterSelectModalProps) {
    const [draftIds, setDraftIds] = useState<string[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

    useEffect(() => {
        if (open) {
            setDraftIds(selectedPetIds);
            setSearchQuery('');
            setVisibleCount(PAGE_SIZE);
        }
    }, [open, selectedPetIds]);

    useEffect(() => {
        setVisibleCount(PAGE_SIZE);
    }, [searchQuery]);

    const filteredPets = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        if (!q) return pets;
        return pets.filter(
            (p) =>
                p.name?.toLowerCase().includes(q) ||
                p.breed?.toLowerCase().includes(q) ||
                p.species?.toLowerCase().includes(q)
        );
    }, [pets, searchQuery]);

    const visiblePets = filteredPets.slice(0, visibleCount);
    const hasMore = visibleCount < filteredPets.length;

    const toggleDraftId = (id: string) => {
        setDraftIds((prev) =>
            prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
        );
    };

    const selectedPetsList = useMemo(
        () => pets.filter((p) => draftIds.includes(String(p.id))),
        [pets, draftIds]
    );

    return (
        <Dialog.Root
            open={open}
            onOpenChange={(e) => onOpenChange(e.open)}
            placement="center"
            size="lg"
        >
            <Portal>
                <Dialog.Backdrop bg="blackAlpha.600" backdropFilter="blur(4px)" />
                <Dialog.Positioner p={{ base: 3, md: 4 }}>
                    <Dialog.Content
                        borderRadius="24px"
                        bg="var(--waba-card)"
                        border="1px solid"
                        borderColor="var(--waba-line)"
                        boxShadow="0 20px 50px rgba(0, 0, 0, 0.25)"
                        p={{ base: 4, md: 6 }}
                        maxW="640px"
                        w="full"
                    >
                        <Dialog.Header p={0} mb={4}>
                            <Flex w="100%" justify="space-between" align="center">
                                <Dialog.Title fontSize="17px" fontWeight="800" color="var(--waba-ink)">
                                    {title} ({draftIds.length > 0 ? `${draftIds.length}마리 선택됨` : '전체'})
                                </Dialog.Title>
                                <CloseButton
                                    size="sm"
                                    rounded="full"
                                    color="var(--waba-ink)"
                                    _hover={{ bg: 'var(--waba-surface)' }}
                                    onClick={() => onOpenChange(false)}
                                />
                            </Flex>
                        </Dialog.Header>

                        <Dialog.Body p={0}>
                            <VStack gap={3.5} align="stretch">
                                <Flex gap={2} align="center">
                                    <HStack
                                        flex={1}
                                        bg="var(--waba-surface)"
                                        border="1px solid"
                                        borderColor="var(--waba-line)"
                                        borderRadius="14px"
                                        px={3}
                                        h="38px"
                                        gap={2}
                                    >
                                        <LuSearch size={14} color="var(--waba-ink-3)" />
                                        <Input
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            placeholder="이름 또는 품종으로 검색..."
                                            border="none"
                                            bg="transparent"
                                            color="var(--waba-ink)"
                                            fontSize="13px"
                                            px={0}
                                            _focus={{ outline: 'none', boxShadow: 'none' }}
                                        />
                                    </HStack>
                                    <Button
                                        size="xs"
                                        h="38px"
                                        px={3}
                                        borderRadius="14px"
                                        variant="outline"
                                        borderColor="var(--waba-line)"
                                        color="var(--waba-ink-2)"
                                        fontSize="12px"
                                        fontWeight="600"
                                        flexShrink={0}
                                        onClick={() => setDraftIds([])}
                                    >
                                        선택 초기화
                                    </Button>
                                </Flex>

                                {selectedPetsList.length > 0 && (
                                    <Box maxH="84px" overflowY="auto" pr={1}>
                                        <HStack gap={1.5} flexWrap="wrap">
                                            {selectedPetsList.map((p) => (
                                                <Button
                                                    key={p.id}
                                                    size="2xs"
                                                    h="26px"
                                                    px={2.5}
                                                    rounded="full"
                                                    bg="var(--waba-purple-soft)"
                                                    border="1px solid"
                                                    borderColor="var(--waba-purple-border)"
                                                    color="var(--waba-purple-text)"
                                                    fontSize="11px"
                                                    fontWeight="700"
                                                    gap={1}
                                                    onClick={() => toggleDraftId(String(p.id))}
                                                >
                                                    <Text>{p.name}</Text>
                                                    <LuX size={11} />
                                                </Button>
                                            ))}
                                        </HStack>
                                    </Box>
                                )}

                                <Box maxH="340px" overflowY="auto" pr={1}>
                                    {visiblePets.length === 0 ? (
                                        <Box
                                            py={10}
                                            textAlign="center"
                                            bg="var(--waba-surface)"
                                            borderRadius="16px"
                                            border="1px dashed"
                                            borderColor="var(--waba-line)"
                                        >
                                            <Text fontSize="13px" color="var(--waba-ink-3)">
                                                검색 조건에 맞는 반려동물이 없습니다.
                                            </Text>
                                        </Box>
                                    ) : (
                                        <Grid
                                            templateColumns={{ base: '1fr', sm: 'repeat(2, minmax(0, 1fr))' }}
                                            gap={2}
                                        >
                                            {visiblePets.map((p) => {
                                                const isSelected = draftIds.includes(String(p.id));
                                                return (
                                                    <HStack
                                                        key={p.id}
                                                        as="button"
                                                        onClick={() => toggleDraftId(String(p.id))}
                                                        bg={isSelected ? 'var(--waba-purple-soft)' : 'var(--waba-surface)'}
                                                        border="1.5px solid"
                                                        borderColor={isSelected ? '#6338A9' : 'var(--waba-line)'}
                                                        borderRadius="14px"
                                                        px={3}
                                                        py={2}
                                                        justify="space-between"
                                                        gap={2.5}
                                                        textAlign="left"
                                                        cursor="pointer"
                                                        minW={0}
                                                    >
                                                        <HStack gap={2.5} minW={0} flex={1}>
                                                            <UserAvatar
                                                                src={p.current_avatar_url}
                                                                alt={p.name}
                                                                size="sm"
                                                                fallbackType="pet"
                                                                border="1.5px solid"
                                                                borderColor="#F6EBFB"
                                                            />
                                                            <Box minW={0} flex={1}>
                                                                <Text
                                                                    fontSize="13px"
                                                                    fontWeight="700"
                                                                    color={isSelected ? 'var(--waba-purple-text)' : 'var(--waba-ink)'}
                                                                    truncate
                                                                >
                                                                    {p.name}
                                                                </Text>
                                                                <Text fontSize="11px" color="var(--waba-ink-3)" truncate>
                                                                    {p.breed || p.species}
                                                                </Text>
                                                            </Box>
                                                        </HStack>
                                                        <Flex
                                                            w="18px"
                                                            h="18px"
                                                            rounded="full"
                                                            bg={isSelected ? '#6338A9' : 'transparent'}
                                                            border="1.5px solid"
                                                            borderColor={isSelected ? '#6338A9' : 'var(--waba-line)'}
                                                            color="white"
                                                            align="center"
                                                            justify="center"
                                                            flexShrink={0}
                                                        >
                                                            {isSelected && <LuCheck size={11} />}
                                                        </Flex>
                                                    </HStack>
                                                );
                                            })}
                                        </Grid>
                                    )}

                                    {hasMore && (
                                        <Flex justify="center" pt={3}>
                                            <Button
                                                size="xs"
                                                variant="outline"
                                                borderColor="var(--waba-line)"
                                                color="var(--waba-ink)"
                                                bg="var(--waba-surface)"
                                                rounded="full"
                                                px={5}
                                                onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}
                                            >
                                                더 보기 ({(filteredPets.length - visibleCount).toLocaleString()}마리 남음)
                                            </Button>
                                        </Flex>
                                    )}
                                </Box>
                            </VStack>
                        </Dialog.Body>

                        <Dialog.Footer p={0} pt={4}>
                            <HStack justify="flex-end" gap={2} w="full">
                                <Button
                                    size="sm"
                                    variant="outline"
                                    borderColor="var(--waba-line)"
                                    color="var(--waba-ink)"
                                    rounded="full"
                                    px={4}
                                    onClick={() => onOpenChange(false)}
                                >
                                    취소
                                </Button>
                                <Button
                                    size="sm"
                                    bg="#6338A9"
                                    color="#FFFFFF"
                                    _hover={{ bg: '#522B8F' }}
                                    rounded="full"
                                    px={5}
                                    fontWeight="700"
                                    onClick={() => {
                                        onApply(draftIds);
                                        onOpenChange(false);
                                    }}
                                >
                                    {draftIds.length > 0 ? `${draftIds.length}마리 필터 적용` : '전체 보기 적용'}
                                </Button>
                            </HStack>
                        </Dialog.Footer>
                    </Dialog.Content>
                </Dialog.Positioner>
            </Portal>
        </Dialog.Root>
    );
}
