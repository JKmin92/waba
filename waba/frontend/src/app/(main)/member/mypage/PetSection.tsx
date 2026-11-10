'use client'

import {
    Avatar,
    Badge,
    Box,
    Button,
    Dialog,
    Grid,
    Heading,
    HStack,
    IconButton,
    Menu,
    Portal,
    Text,
    VStack,
} from "@chakra-ui/react";
import { MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Pet } from "@/interface";
import { petSpeciesLabel } from "@/utils/simpleUtils";
import { toaster } from "@/components/ui/toaster";

interface PetSectionProps {
    pets: Pet[];
    onAddPet?: () => void;
    onEditPet?: (pet: Pet) => void;
    onDeletePet?: (petId: string) => Promise<void> | void;
}

export default function PetSection({ pets, onAddPet, onEditPet, onDeletePet }: PetSectionProps) {
    const [deleteTargetPet, setDeleteTargetPet] = useState<Pet | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const handleAddPet = () => {
        if (onAddPet) {
            onAddPet();
        } else {
            toaster.create({ title: '반려동물 추가 등록 모달이 곧 제공됩니다.', type: 'info' });
        }
    };

    const handleConfirmDelete = async () => {
        if (!deleteTargetPet || !onDeletePet || isDeleting) return;
        setIsDeleting(true);
        try {
            await onDeletePet(deleteTargetPet.id);
            setDeleteTargetPet(null);
        } finally {
            setIsDeleting(false);
        }
    };

    const calculateAge = (birthDate: string | null) => {
        if (!birthDate) return '나이 정보 없음';
        try {
            const birth = new Date(birthDate);
            const now = new Date();
            const diffMonths = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
            if (diffMonths < 12) {
                return `생후 ${Math.max(diffMonths, 1)}개월`;
            }
            const years = Math.floor(diffMonths / 12);
            const months = diffMonths % 12;
            return months > 0 ? `${years}살 ${months}개월` : `${years}살`;
        } catch {
            return '나이 정보 없음';
        }
    };

    const getSpeciesEmoji = (species: string) => {
        switch (species) {
            case 'DOG': return '🐶';
            case 'CAT': return '🐱';
            case 'RABBIT': return '🐰';
            case 'HAMSTER': return '🐹';
            case 'GUINEAPIG': return '🐹';
            case 'CHINCHILA': return '🐭';
            default: return '🐾';
        }
    };

    const getPetDisplayText = (pet: Pet) => {
        if (pet.species === 'OTHER' && pet.custom_species) {
            if (pet.breed && pet.breed !== pet.custom_species && pet.breed !== '기타') {
                return `${pet.custom_species} · ${pet.breed}`;
            }
            return pet.custom_species;
        }
        return pet.breed || petSpeciesLabel(pet.species, pet.custom_species);
    };

    return (
        <Box>
            <HStack justify="space-between" mb={4}>
                <HStack gap={2}>
                    <Heading fontSize="18px" fontWeight="700" color="waba.charcoal">
                        함께하는 가족
                    </Heading>
                    <Badge bg="waba.purpleLight" color="waba.purple" rounded="full" px={2} fontSize="12px" fontWeight="700">
                        {pets.length}
                    </Badge>
                </HStack>

                <Button
                    variant="ghost"
                    size="sm"
                    color="waba.purple"
                    fontSize="13px"
                    fontWeight="600"
                    _hover={{ bg: 'waba.purpleLight' }}
                    rounded="full"
                    onClick={handleAddPet}
                >
                    <Plus size={15} style={{ marginRight: '4px' }} />
                    새 반려동물 등록
                </Button>
            </HStack>

            {/* 반려동물 삭제 확인 모달 */}
            <Dialog.Root
                open={Boolean(deleteTargetPet)}
                onOpenChange={(e) => {
                    if (!e.open) setDeleteTargetPet(null);
                }}
                placement="center"
                size="sm"
            >
                <Portal>
                    <Dialog.Backdrop />
                    <Dialog.Positioner>
                        <Dialog.Content borderRadius="24px" p={6} bg="white">
                            <Dialog.Header p={0} mb={2}>
                                <Dialog.Title fontSize="18px" fontWeight="800" color="waba.charcoal">
                                    {deleteTargetPet?.name}의 프로필을 삭제할까요?
                                </Dialog.Title>
                            </Dialog.Header>
                            <Dialog.Body p={0} mb={6}>
                                <Text fontSize="13px" color="gray.600">
                                    삭제한 반려동물 프로필과 아바타 사진은 복구할 수 없습니다.
                                </Text>
                            </Dialog.Body>
                            <Dialog.Footer p={0} gap={2}>
                                <Button
                                    variant="outline"
                                    rounded="full"
                                    flex={1}
                                    onClick={() => setDeleteTargetPet(null)}
                                    disabled={isDeleting}
                                >
                                    취소
                                </Button>
                                <Button
                                    bg="red.500"
                                    color="white"
                                    _hover={{ bg: 'red.600' }}
                                    rounded="full"
                                    flex={1}
                                    onClick={handleConfirmDelete}
                                    loading={isDeleting}
                                >
                                    삭제
                                </Button>
                            </Dialog.Footer>
                        </Dialog.Content>
                    </Dialog.Positioner>
                </Portal>
            </Dialog.Root>

            <Grid templateColumns={{ base: "1fr", sm: "repeat(2, 1fr)", md: "repeat(3, 1fr)", lg: "repeat(4, 1fr)" }} gap={4}>
                {pets.map((pet) => (
                    <Box
                        key={pet.id}
                        bg="white"
                        borderRadius="20px"
                        p={4}
                        border="1px solid"
                        borderColor="waba.border"
                        transition="all 0.2s"
                        _hover={{ transform: 'translateY(-2px)', shadow: '0 8px 24px -4px rgba(26,28,30,0.06)' }}
                        position="relative"
                    >
                        {/* 우측 상단 ... 메뉴 (수정 / 삭제) */}
                        <Box position="absolute" top={2.5} right={2.5} zIndex={2}>
                            <Menu.Root positioning={{ placement: "bottom-end" }}>
                                <Menu.Trigger asChild>
                                    <IconButton
                                        aria-label="반려동물 메뉴"
                                        variant="ghost"
                                        size="2xs"
                                        rounded="full"
                                        color="waba.faint"
                                        _hover={{ color: 'waba.charcoal', bg: 'waba.subtle' }}
                                    >
                                        <MoreHorizontal size={16} />
                                    </IconButton>
                                </Menu.Trigger>
                                <Portal>
                                    <Menu.Positioner>
                                        <Menu.Content
                                            minW="130px"
                                            borderRadius="16px"
                                            p={1.5}
                                            boxShadow="0 12px 32px -4px rgba(26, 28, 30, 0.12)"
                                            border="1px solid"
                                            borderColor="waba.border"
                                            bg="white"
                                        >
                                            <Menu.Item
                                                value="edit"
                                                cursor="pointer"
                                                borderRadius="10px"
                                                py={2}
                                                px={3}
                                                onClick={() => onEditPet?.(pet)}
                                            >
                                                <Pencil size={14} />
                                                <Text fontSize="13px" fontWeight="600">수정하기</Text>
                                            </Menu.Item>
                                            <Menu.Item
                                                value="delete"
                                                cursor="pointer"
                                                borderRadius="10px"
                                                py={2}
                                                px={3}
                                                color="red.500"
                                                _hover={{ bg: 'red.50' }}
                                                onClick={() => setDeleteTargetPet(pet)}
                                            >
                                                <Trash2 size={14} />
                                                <Text fontSize="13px" fontWeight="600">삭제하기</Text>
                                            </Menu.Item>
                                        </Menu.Content>
                                    </Menu.Positioner>
                                </Portal>
                            </Menu.Root>
                        </Box>

                        <HStack gap={3.5} align="center" pr={5}>
                            <Avatar.Root
                                size="lg"
                                borderRadius="full"
                                border="2px solid"
                                borderColor={pet.is_primary ? 'waba.purple' : 'waba.border'}
                            >
                                {pet.current_avatar_url ? (
                                    <Avatar.Image src={pet.current_avatar_url} alt={pet.name} />
                                ) : (
                                    <Text fontSize="22px">{getSpeciesEmoji(pet.species)}</Text>
                                )}
                            </Avatar.Root>

                            <VStack align="start" gap={0.5} flex={1}>
                                <HStack gap={1.5}>
                                    <Text fontSize="15px" fontWeight="700" color="waba.charcoal">
                                        {pet.name}
                                    </Text>
                                    {pet.is_primary ? (
                                        <Badge bg="waba.purple" color="white" rounded="full" px={1.5} py={0.2} fontSize="10px" fontWeight="700">
                                            대표
                                        </Badge>
                                    ) : null}
                                </HStack>

                                <Text fontSize="12px" color="waba.faint">
                                    {getPetDisplayText(pet)}
                                </Text>

                                <HStack gap={2} fontSize="11px" color="waba.charcoal" mt={1}>
                                    {pet.latest_weight_kg !== null && pet.latest_weight_kg !== undefined && Number(pet.latest_weight_kg) > 0 && (
                                        <Text fontWeight="600">{pet.latest_weight_kg}kg</Text>
                                    )}
                                    {pet.latest_weight_kg !== null && pet.latest_weight_kg !== undefined && Number(pet.latest_weight_kg) > 0 && pet.birth_date && (
                                        <Text color="gray.300">•</Text>
                                    )}
                                    {pet.birth_date && (
                                        <Text>{calculateAge(pet.birth_date)}</Text>
                                    )}
                                </HStack>
                            </VStack>
                        </HStack>
                    </Box>
                ))}

                {/* 반려동물 추가 카드 */}
                <Box
                    as="button"
                    onClick={handleAddPet}
                    bg="whiteAlpha.600"
                    borderRadius="20px"
                    p={4}
                    border="1px dashed"
                    borderColor="waba.border"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    gap={2}
                    color="waba.faint"
                    transition="all 0.2s"
                    _hover={{ borderColor: 'waba.purple', color: 'waba.purple', bg: 'waba.purpleLight/30' }}
                    minH="82px"
                >
                    <Plus size={18} />
                    <Text fontSize="13px" fontWeight="600">반려동물 추가</Text>
                </Box>
            </Grid>
        </Box>
    );
}
