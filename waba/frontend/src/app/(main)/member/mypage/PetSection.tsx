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
    Input,
    Menu,
    Portal,
    Text,
    VStack,
} from "@chakra-ui/react";
import { BookOpen, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Pet } from "@/interface";
import { petSpeciesLabel } from "@/utils/simpleUtils";
import { toaster } from "@/components/ui/toaster";
import PetHistoryModal from "./PetHistoryModal";

interface PetSectionProps {
    pets: Pet[];
    selectedPetId?: string | null;
    onSelectPet?: (petId: string | null) => void;
    onAddPet?: () => void;
    onEditPet?: (pet: Pet) => void;
    onDeletePet?: (petId: string, authData?: { password?: string; confirm_name?: string }) => Promise<void> | void;
}

export default function PetSection({
    pets,
    selectedPetId,
    onSelectPet,
    onAddPet,
    onEditPet,
    onDeletePet,
}: PetSectionProps) {
    const [deleteTargetPet, setDeleteTargetPet] = useState<Pet | null>(null);
    const [deleteConfirmText, setDeleteConfirmText] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);
    const [historyPet, setHistoryPet] = useState<Pet | null>(null);

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
            await onDeletePet(deleteTargetPet.id, {
                confirm_name: deleteConfirmText.trim()
            });
            setDeleteTargetPet(null);
            setDeleteConfirmText('');
        } catch {
            // error is handled in parent
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

            {/* 반려동물 삭제 확인 모달 (6개월 안전 보관 & 본인 인증) */}
            <Dialog.Root
                open={Boolean(deleteTargetPet)}
                onOpenChange={(e) => {
                    if (!e.open) {
                        setDeleteTargetPet(null);
                        setDeleteConfirmText('');
                    }
                }}
                placement="center"
                size="md"
            >
                <Portal>
                    <Dialog.Backdrop bg="rgba(15, 17, 23, 0.45)" backdropFilter="blur(8px)" />
                    <Dialog.Positioner>
                        <Dialog.Content borderRadius="28px" p={6} bg="white" maxW="440px">
                            <Dialog.Header p={0} mb={3}>
                                <Dialog.Title fontSize="18px" fontWeight="800" color="charcoal">
                                    {deleteTargetPet?.name}의 프로필을 보관/삭제할까요?
                                </Dialog.Title>
                            </Dialog.Header>
                            <Dialog.Body p={0} mb={5}>
                                <VStack gap={3.5} align="stretch">
                                    <Box bg="#F4F4F6" p={3.5} rounded="2xl" border="1px solid" borderColor="#E8E8EE">
                                        <Text fontSize="12px" fontWeight="800" color="charcoal" mb={1}>
                                            🛡️ 6개월(180일) 안전 보관 정책 안내
                                        </Text>
                                        <Text fontSize="12px" color="fg.subtle" lineHeight="relaxed">
                                            삭제 시 마이페이지와 커뮤니티에서 즉시 숨겨지며, 아이와의 모든 사진, 룩북 태그, 건강 수첩 기록은 <strong>6개월간 안전하게 동결 보관</strong>됩니다.
                                        </Text>
                                        <Text fontSize="11px" color="waba.purple" fontWeight="bold" mt={1}>
                                            ※ 6개월 이내 고객센터 문의 시 언제든 원상태로 100% 복구할 수 있습니다.
                                        </Text>
                                    </Box>

                                    <Box>
                                        <Text fontSize="12px" fontWeight="bold" color="charcoal" mb={1.5}>
                                            실수 방지를 위해 반려동물 이름 <strong>&ldquo;{deleteTargetPet?.name}&rdquo;</strong>을(를) 입력해주세요:
                                        </Text>
                                        <Input
                                            size="sm"
                                            rounded="xl"
                                            placeholder={deleteTargetPet?.name || ''}
                                            value={deleteConfirmText}
                                            onChange={(e: any) => setDeleteConfirmText(e.target.value)}
                                        />
                                    </Box>
                                </VStack>
                            </Dialog.Body>
                            <Dialog.Footer p={0} gap={2}>
                                <Button
                                    variant="outline"
                                    rounded="full"
                                    flex={1}
                                    onClick={() => {
                                        setDeleteTargetPet(null);
                                        setDeleteConfirmText('');
                                    }}
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
                                    disabled={isDeleting || deleteConfirmText.trim() !== deleteTargetPet?.name}
                                >
                                    보관 및 삭제
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
                                            minW="165px"
                                            borderRadius="16px"
                                            p={1.5}
                                            boxShadow="0 12px 32px -4px rgba(26, 28, 30, 0.12)"
                                            border="1px solid"
                                            borderColor="waba.border"
                                            bg="white"
                                        >
                                            <Menu.Item
                                                value="diary"
                                                cursor="pointer"
                                                borderRadius="10px"
                                                py={2}
                                                px={3}
                                                color="waba.charcoal"
                                                _hover={{ bg: 'waba.subtle' }}
                                                onClick={() => setHistoryPet(pet)}
                                            >
                                                <BookOpen size={14} />
                                                <Text fontSize="13px" fontWeight="600">건강 &amp; 진료 수첩</Text>
                                            </Menu.Item>
                                            <Menu.Item
                                                value="history"
                                                cursor="pointer"
                                                borderRadius="10px"
                                                py={2}
                                                px={3}
                                                color="waba.purple"
                                                _hover={{ bg: '#F3EFFF' }}
                                                onClick={() => {
                                                    onSelectPet?.(pet.id);
                                                    setTimeout(() => {
                                                        document.getElementById('my-activity-section')?.scrollIntoView({ behavior: 'smooth' });
                                                    }, 100);
                                                }}
                                            >
                                                <Text fontSize="13px" fontWeight="700">🐾 {pet.name}의 기록 모아보기</Text>
                                            </Menu.Item>
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
                                        <HStack gap={1}>
                                            <Text>{calculateAge(pet.birth_date)}</Text>
                                            {pet.is_birth_estimated ? (
                                                <Badge bg="waba.subtle" color="waba.muted" px={1} py={0} fontSize="10px" fontWeight="600" borderRadius="sm">
                                                    추정
                                                </Badge>
                                            ) : null}
                                        </HStack>
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

            {/* 펫 건강 & 진료 수첩 모달 */}
            <PetHistoryModal
                open={Boolean(historyPet)}
                onOpenChange={(open) => {
                    if (!open) setHistoryPet(null);
                }}
                pet={historyPet}
            />
        </Box>
    );
}
