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
    IconButton,
    Input,
    Portal,
    Text,
    VStack,
} from '@chakra-ui/react';
import { LuPencil, LuPlus, LuSearch, LuTrash2 } from 'react-icons/lu';
import { Pet } from '@/interface';
import UserAvatar from '../../common/UserAvatar';

interface PetManageAllModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    pets: Pet[];
    onAddPet: () => void;
    onEditPet: (pet: Pet) => void;
    onDeletePet: (pet: Pet) => void;
}

const PAGE_SIZE = 60;

export default function PetManageAllModal({
    open,
    onOpenChange,
    pets,
    onAddPet,
    onEditPet,
    onDeletePet,
}: PetManageAllModalProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

    useEffect(() => {
        if (!open) {
            setSearchQuery('');
            setVisibleCount(PAGE_SIZE);
        }
    }, [open]);

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
                        maxW="680px"
                        w="full"
                    >
                        <Dialog.Header p={0} mb={4}>
                            <Flex justify="space-between" align="center" w="100%">
                                <Dialog.Title fontSize="18px" fontWeight="800" color="var(--waba-ink)">
                                    등록된 반려동물 (총 {pets.length.toLocaleString()}마리)
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
                            <VStack gap={4} align="stretch">
                                <Flex direction={{ base: 'column', sm: 'row' }} gap={2.5} align={{ base: 'stretch', sm: 'center' }}>
                                    <HStack
                                        flex={1}
                                        bg="var(--waba-surface)"
                                        border="1px solid"
                                        borderColor="var(--waba-line)"
                                        borderRadius="14px"
                                        px={3}
                                        h="40px"
                                        gap={2}
                                    >
                                        <LuSearch size={15} color="var(--waba-ink-3)" />
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
                                        size="sm"
                                        h="40px"
                                        px={4}
                                        borderRadius="14px"
                                        bg="#6338A9"
                                        color="#FFFFFF"
                                        _hover={{ bg: '#522B8F' }}
                                        fontSize="12px"
                                        fontWeight="700"
                                        gap={1.5}
                                        flexShrink={0}
                                        onClick={() => {
                                            onOpenChange(false);
                                            onAddPet();
                                        }}
                                    >
                                        <LuPlus size={14} />
                                        새 반려동물 등록
                                    </Button>
                                </Flex>

                                <Box maxH="420px" overflowY="auto" pr={1}>
                                    {visiblePets.length === 0 ? (
                                        <Box
                                            py={12}
                                            textAlign="center"
                                            bg="var(--waba-surface)"
                                            borderRadius="16px"
                                            border="1px dashed"
                                            borderColor="var(--waba-line)"
                                        >
                                            <Text fontSize="13px" color="var(--waba-ink-3)">
                                                {searchQuery.trim()
                                                    ? '검색 조건에 맞는 반려동물이 없습니다.'
                                                    : '등록된 반려동물이 없습니다.'}
                                            </Text>
                                        </Box>
                                    ) : (
                                        <Grid
                                            templateColumns={{ base: '1fr', sm: 'repeat(2, minmax(0, 1fr))' }}
                                            gap={2.5}
                                        >
                                            {visiblePets.map((pet) => (
                                                <HStack
                                                    key={pet.id}
                                                    bg="var(--waba-surface)"
                                                    border="1px solid"
                                                    borderColor="var(--waba-line)"
                                                    borderRadius="14px"
                                                    px={3}
                                                    py={2.5}
                                                    justify="space-between"
                                                    gap={2}
                                                    minW={0}
                                                >
                                                    <HStack gap={2.5} minW={0} flex={1}>
                                                        <UserAvatar
                                                            src={pet.current_avatar_url}
                                                            alt={pet.name}
                                                            w="36px"
                                                            h="36px"
                                                            iconSize={16}
                                                            fallbackType="pet"
                                                            border="1.5px solid"
                                                            borderColor="#F6EBFB"
                                                        />
                                                        <Box minW={0} flex={1}>
                                                            <Text fontSize="13px" fontWeight="700" color="var(--waba-ink)" truncate>
                                                                {pet.name}
                                                            </Text>
                                                            <Text fontSize="11px" color="var(--waba-ink-3)" truncate>
                                                                {[
                                                                    pet.breed || pet.species,
                                                                    pet.latest_weight_kg
                                                                        ? `${Number(pet.latest_weight_kg).toFixed(1)}kg`
                                                                        : null,
                                                                ]
                                                                    .filter(Boolean)
                                                                    .join(' · ')}
                                                            </Text>
                                                        </Box>
                                                    </HStack>

                                                    <HStack gap={1} flexShrink={0}>
                                                        <IconButton
                                                            aria-label={`${pet.name} 수정`}
                                                            size="2xs"
                                                            variant="ghost"
                                                            rounded="full"
                                                            color="var(--waba-ink-2)"
                                                            _hover={{ bg: 'var(--waba-card)', color: 'var(--waba-ink)' }}
                                                            onClick={() => {
                                                                onOpenChange(false);
                                                                onEditPet(pet);
                                                            }}
                                                        >
                                                            <LuPencil size={13} />
                                                        </IconButton>
                                                        <IconButton
                                                            aria-label={`${pet.name} 삭제`}
                                                            size="2xs"
                                                            variant="ghost"
                                                            rounded="full"
                                                            color="var(--waba-ink-3)"
                                                            _hover={{ color: 'red.500', bg: 'rgba(239, 68, 68, 0.12)' }}
                                                            onClick={() => onDeletePet(pet)}
                                                        >
                                                            <LuTrash2 size={13} />
                                                        </IconButton>
                                                    </HStack>
                                                </HStack>
                                            ))}
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
                    </Dialog.Content>
                </Dialog.Positioner>
            </Portal>
        </Dialog.Root>
    );
}
