'use client'

import {
    Avatar,
    Badge,
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
} from "@chakra-ui/react";
import { Camera, Check, Crown, Sparkles, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import axiosInstance from "@/utils/api";
import { toaster } from "@/components/ui/toaster";
import { Pet, PetGender, PetSpecies } from "@/interface";
import { UserProfileData } from "./ProfileSection";

interface PetRegisterModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    existingPetsCount: number;
    firstPetRewardClaimed?: boolean;
    editingPet?: Pet | null;
    onPetCreated: (result: {
        pet: Pet;
        pets: Pet[];
        profile: UserProfileData;
        rewardGranted: number;
    }) => void;
}

const SPECIES_OPTIONS: { value: PetSpecies; label: string; emoji: string; sampleName: string; sampleBreed: string }[] = [
    { value: 'DOG', label: '강아지', emoji: '🐶', sampleName: '보리', sampleBreed: '말티푸' },
    { value: 'CAT', label: '고양이', emoji: '🐱', sampleName: '구름이', sampleBreed: '랙돌 (Ragdoll)' },
    { value: 'RABBIT', label: '토끼', emoji: '🐰', sampleName: '모찌', sampleBreed: '홀랜드 롭이어' },
    { value: 'HAMSTER', label: '햄스터', emoji: '🐹', sampleName: '해바라기', sampleBreed: '골든 햄스터' },
    { value: 'GUINEAPIG', label: '기니피그', emoji: '🐹', sampleName: '땅콩이', sampleBreed: '아비시니안' },
    { value: 'CHINCHILA', label: '친칠라', emoji: '🐭', sampleName: '먼지', sampleBreed: '실버 모자이크' },
    { value: 'OTHER', label: '기타', emoji: '🐾', sampleName: '탄이', sampleBreed: '세부 품종 입력' },
];

const GENDER_OPTIONS: { value: PetGender; label: string }[] = [
    { value: 'MALE', label: '남아' },
    { value: 'FEMALE', label: '여아' },
    { value: 'UNKNOWN', label: '미상' },
];

export default function PetRegisterModal({
    open,
    onOpenChange,
    existingPetsCount,
    firstPetRewardClaimed = false,
    editingPet = null,
    onPetCreated,
}: PetRegisterModalProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const isEditMode = Boolean(editingPet);

    const [species, setSpecies] = useState<PetSpecies>('CAT');
    const [customSpecies, setCustomSpecies] = useState('');
    const [name, setName] = useState('');
    const [breed, setBreed] = useState('');
    const [birthDate, setBirthDate] = useState('');
    const [gender, setGender] = useState<PetGender>('FEMALE');
    const [isNeutered, setIsNeutered] = useState(true);
    const [weightKg, setWeightKg] = useState('');
    const [bodyLengthCm, setBodyLengthCm] = useState('');
    const [isPrimary, setIsPrimary] = useState(true);
    const [aiConsent, setAiConsent] = useState(true);

    const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [resetAvatar, setResetAvatar] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // 모달 열릴 때마다 폼 초기화 또는 수정 대상 데이터 바인딩
    useEffect(() => {
        if (!open) return;

        if (editingPet) {
            setSpecies(editingPet.species || 'CAT');
            setCustomSpecies(editingPet.custom_species || '');
            setName(editingPet.name || '');
            setBreed(editingPet.breed || '');
            setBirthDate(editingPet.birth_date ? String(editingPet.birth_date).slice(0, 10) : '');
            setGender(editingPet.gender || 'UNKNOWN');
            setIsNeutered(Boolean(editingPet.is_neutered));
            setWeightKg(editingPet.latest_weight_kg !== null && editingPet.latest_weight_kg !== undefined ? String(editingPet.latest_weight_kg) : '');
            setBodyLengthCm(editingPet.latest_body_length_cm !== null && editingPet.latest_body_length_cm !== undefined ? String(editingPet.latest_body_length_cm) : '');
            setIsPrimary(Boolean(editingPet.is_primary));
            setAiConsent(editingPet.ai_private_data_consent === undefined ? true : Boolean(editingPet.ai_private_data_consent));
            setPreviewImageUrl(editingPet.current_avatar_url || null);
            setSelectedFile(null);
            setResetAvatar(false);
        } else {
            setSpecies('CAT');
            setCustomSpecies('');
            setName('');
            setBreed('');
            setBirthDate('');
            setGender('FEMALE');
            setIsNeutered(true);
            setWeightKg('');
            setBodyLengthCm('');
            setIsPrimary(existingPetsCount === 0);
            setAiConsent(true);
            setPreviewImageUrl(null);
            setSelectedFile(null);
            setResetAvatar(false);
        }
    }, [open, editingPet, existingPetsCount]);

    const currentSpeciesMeta = SPECIES_OPTIONS.find((s) => s.value === species) || SPECIES_OPTIONS[1];
    const todayStr = new Date().toISOString().split('T')[0];

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            toaster.create({ title: '이미지 파일만 업로드할 수 있습니다.', type: 'error' });
            return;
        }
        if (file.size > 15 * 1024 * 1024) {
            toaster.create({ title: '이미지 크기는 최대 15MB 이하만 가능합니다.', type: 'error' });
            return;
        }

        const objectUrl = URL.createObjectURL(file);
        const img = new window.Image();
        img.onload = () => {
            if (img.width < 150) {
                URL.revokeObjectURL(objectUrl);
                toaster.create({
                    title: '최소 가로 150px 이상의 이미지를 업로드해주세요.',
                    description: `선택한 이미지 가로 크기: ${img.width}px`,
                    type: 'error',
                });
                if (fileInputRef.current) fileInputRef.current.value = '';
                return;
            }
            setSelectedFile(file);
            setPreviewImageUrl(objectUrl);
            setResetAvatar(false);
        };
        img.onerror = () => {
            URL.revokeObjectURL(objectUrl);
            toaster.create({ title: '유효하지 않은 이미지 파일입니다.', type: 'error' });
        };
        img.src = objectUrl;
    };

    const handleClearAvatar = () => {
        setSelectedFile(null);
        setPreviewImageUrl(null);
        setResetAvatar(true);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleSubmit = async () => {
        const trimmedName = name.trim();
        const trimmedBreed = breed.trim();
        const trimmedCustomSpecies = customSpecies.trim();

        if (species === 'OTHER' && !trimmedCustomSpecies) {
            toaster.create({ title: '동물 종류를 직접 입력해주세요.', type: 'error' });
            return;
        }

        if (!trimmedName) {
            toaster.create({ title: '반려동물 이름을 입력해주세요.', type: 'error' });
            return;
        }
        if (!trimmedBreed) {
            toaster.create({ title: '세부 품종을 입력해주세요.', type: 'error' });
            return;
        }

        if (weightKg && (isNaN(Number(weightKg)) || Number(weightKg) <= 0 || Number(weightKg) > 200)) {
            toaster.create({ title: '올바른 체중(kg)을 입력해주세요.', type: 'error' });
            return;
        }
        if (bodyLengthCm && (isNaN(Number(bodyLengthCm)) || Number(bodyLengthCm) <= 0 || Number(bodyLengthCm) > 300)) {
            toaster.create({ title: '올바른 등길이/체장(cm)을 입력해주세요.', type: 'error' });
            return;
        }

        setIsSubmitting(true);
        try {
            const formData = new FormData();
            formData.append('species', species);
            formData.append('custom_species', species === 'OTHER' ? trimmedCustomSpecies : '');
            formData.append('name', trimmedName);
            formData.append('breed', trimmedBreed);
            formData.append('birth_date', birthDate || '');
            formData.append('gender', gender);
            formData.append('is_neutered', String(isNeutered));
            formData.append('latest_weight_kg', weightKg || '');
            formData.append('latest_body_length_cm', bodyLengthCm || '');
            formData.append('is_primary', String((!isEditMode && existingPetsCount === 0) ? true : isPrimary));
            formData.append('ai_private_data_consent', String(aiConsent));

            if (selectedFile) {
                formData.append('avatar_image', selectedFile);
            } else if (isEditMode && resetAvatar) {
                formData.append('reset_avatar', 'true');
            }

            const res = isEditMode && editingPet
                ? await axiosInstance.put(`/user/pets/${editingPet.id}`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                })
                : await axiosInstance.post('/user/pets', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });

            if (res.data?.success) {
                const reward = res.data.rewardGranted || 0;
                toaster.create({
                    title: isEditMode
                        ? `${trimmedName}의 프로필이 수정되었습니다!`
                        : `${trimmedName}의 가족 프로필이 등록되었습니다! 🐾`,
                    description: reward > 0 ? `첫 반려동물 등록 리워드 +${reward.toLocaleString()}P가 지급되었습니다.` : undefined,
                    type: 'success',
                });
                onPetCreated({
                    pet: res.data.pet,
                    pets: res.data.pets || [],
                    profile: res.data.profile,
                    rewardGranted: reward,
                });
                onOpenChange(false);
            }
        } catch (err: any) {
            const msg = err.response?.data?.message || (isEditMode ? '반려동물 수정 중 오류가 발생했습니다.' : '반려동물 등록 중 오류가 발생했습니다.');
            toaster.create({ title: msg, type: 'error' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const showFirstRewardBadge = !isEditMode && !firstPetRewardClaimed && existingPetsCount === 0;

    return (
        <Dialog.Root
            open={open}
            onOpenChange={(e) => onOpenChange(e.open)}
            placement="center"
            size="md"
        >
            <Portal>
                <Dialog.Backdrop bg="blackAlpha.600" backdropFilter="blur(8px)" />
                <Dialog.Positioner p={4}>
                    <Dialog.Content
                        maxW="540px"
                        w="full"
                        maxH="90vh"
                        overflowY="auto"
                        borderRadius="28px"
                        p={{ base: 5, md: 7 }}
                        boxShadow="0 24px 48px -12px rgba(26, 28, 30, 0.22)"
                        bg="white"
                        position="relative"
                    >
                        {/* 상단 포인트 라인 */}
                        <Box
                            position="absolute"
                            top={0}
                            left={0}
                            right={0}
                            h="5px"
                            bgGradient="to-r"
                            gradientFrom="purple.300"
                            gradientVia="waba.purple"
                            gradientTo="purple.400"
                        />

                        {/* 닫기 버튼 */}
                        <Dialog.CloseTrigger asChild position="absolute" top={5} right={5}>
                            <CloseButton size="sm" borderRadius="full" bg="waba.subtle" />
                        </Dialog.CloseTrigger>

                        {/* 1. 모달 헤더 */}
                        <Dialog.Header p={0} mb={5} pr={8}>
                            <VStack align="start" gap={1}>
                                <HStack gap={2.5} wrap="wrap">
                                    <Dialog.Title fontSize="20px" fontWeight="800" color="waba.charcoal">
                                        {isEditMode ? '반려동물 프로필 수정' : '새 반려동물 등록'}
                                    </Dialog.Title>
                                    {showFirstRewardBadge && (
                                        <Badge
                                            bg="waba.purpleLight"
                                            color="waba.purple"
                                            border="1px solid"
                                            borderColor="purple.200"
                                            rounded="full"
                                            px={2.5}
                                            py={0.5}
                                            fontSize="11px"
                                            fontWeight="800"
                                        >
                                            🎁 첫 등록 +3,000P
                                        </Badge>
                                    )}
                                </HStack>
                                <Text fontSize="12px" color="waba.faint">
                                    함께하는 소중한 가족의 프로필을 등록해 주세요
                                </Text>
                            </VStack>
                        </Dialog.Header>

                        {/* 2. 모달 본문 */}
                        <Dialog.Body p={0}>
                            <VStack gap={5} align="stretch">
                                {/* 아바타 업로드 영역 */}
                                <VStack gap={2.5} align="center" py={1}>
                                    <Box
                                        position="relative"
                                        cursor="pointer"
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        <Avatar.Root
                                            size="2xl"
                                            w="92px"
                                            h="92px"
                                            borderRadius="full"
                                            border="3px solid"
                                            borderColor="waba.purple"
                                            bg="waba.purpleLight"
                                            shadow="md"
                                        >
                                            {previewImageUrl ? (
                                                <Avatar.Image src={previewImageUrl} alt="반려동물 아바타 미리보기" />
                                            ) : (
                                                <Text fontSize="38px">{currentSpeciesMeta.emoji}</Text>
                                            )}
                                        </Avatar.Root>

                                        <IconButton
                                            aria-label="아바타 사진 업로드"
                                            position="absolute"
                                            bottom={0}
                                            right={0}
                                            w="30px"
                                            h="30px"
                                            minW="30px"
                                            borderRadius="full"
                                            bg="waba.purple"
                                            color="white"
                                            border="2px solid white"
                                            shadow="md"
                                            _hover={{ bg: '#522B8F', transform: 'scale(1.05)' }}
                                        >
                                            <Camera size={14} />
                                        </IconButton>

                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept="image/*"
                                            style={{ display: 'none' }}
                                            onChange={handleFileSelect}
                                        />
                                    </Box>

                                    <HStack gap={2}>
                                        <Button
                                            size="xs"
                                            variant="outline"
                                            borderColor="waba.border"
                                            bg="waba.subtle"
                                            color="waba.charcoal"
                                            rounded="full"
                                            px={3.5}
                                            fontWeight="600"
                                            onClick={() => fileInputRef.current?.click()}
                                        >
                                            <Upload size={12} style={{ marginRight: '4px' }} />
                                            사진 업로드
                                        </Button>
                                        {previewImageUrl && (
                                            <Button
                                                size="xs"
                                                variant="ghost"
                                                color="waba.faint"
                                                rounded="full"
                                                px={2.5}
                                                fontSize="11px"
                                                _hover={{ color: 'red.500', bg: 'red.50' }}
                                                onClick={handleClearAvatar}
                                            >
                                                기본 아이콘으로 변경
                                            </Button>
                                        )}
                                    </HStack>

                                    <Text fontSize="11px" color="waba.faint">
                                        최소 가로 150px · 1:1 정사각형 중앙 크롭
                                    </Text>
                                </VStack>

                                {/* 반려동물 종류 (species) 선택 칩 */}
                                <Box>
                                    <HStack gap={1} mb={2}>
                                        <Text fontSize="13px" fontWeight="700" color="waba.charcoal">
                                            반려동물 종류
                                        </Text>
                                        <Text fontSize="13px" fontWeight="700" color="waba.purple">
                                            *
                                        </Text>
                                    </HStack>
                                    <Flex gap={1.5} wrap="wrap">
                                        {SPECIES_OPTIONS.map((item) => {
                                            const selected = species === item.value;
                                            return (
                                                <Box
                                                    key={item.value}
                                                    as="button"
                                                    px={3}
                                                    py={1.5}
                                                    borderRadius="full"
                                                    fontSize="12px"
                                                    fontWeight={selected ? '700' : '600'}
                                                    border="1.5px solid"
                                                    borderColor={selected ? 'waba.purple' : 'waba.border'}
                                                    bg={selected ? 'waba.purpleLight' : 'white'}
                                                    color={selected ? 'waba.purple' : 'waba.charcoal'}
                                                    transition="all 0.15s"
                                                    _hover={{ borderColor: 'waba.purple' }}
                                                    onClick={() => setSpecies(item.value)}
                                                >
                                                    {item.emoji} {item.label}
                                                </Box>
                                            );
                                        })}
                                    </Flex>

                                    {/* 기타 선택 시 직접 입력 필드 */}
                                    {species === 'OTHER' && (
                                        <Box
                                            mt={3}
                                            p={3.5}
                                            borderRadius="16px"
                                            bg="purple.50"
                                            border="1.5px solid"
                                            borderColor="purple.200"
                                        >
                                            <HStack justify="space-between" mb={1.5}>
                                                <HStack gap={1}>
                                                    <Text fontSize="13px" fontWeight="700" color="purple.900">
                                                        🐾 어떤 동물인가요? (동물 종류)
                                                    </Text>
                                                    <Text fontSize="13px" fontWeight="700" color="waba.purple">
                                                        *
                                                    </Text>
                                                </HStack>
                                                <Text fontSize="11px" color="purple.600" fontWeight="600">
                                                    직접 입력
                                                </Text>
                                            </HStack>
                                            <Input
                                                value={customSpecies}
                                                onChange={(e) => setCustomSpecies(e.target.value)}
                                                placeholder="예: 페럿, 도마뱀, 앵무새, 고슴도치, 슈가글라이더 등"
                                                maxLength={30}
                                                h="42px"
                                                borderRadius="12px"
                                                bg="white"
                                                border="1px solid"
                                                borderColor="purple.200"
                                                fontSize="14px"
                                                fontWeight="600"
                                                px={3.5}
                                                _focus={{
                                                    borderColor: 'waba.purple',
                                                    outline: 'none',
                                                }}
                                            />
                                        </Box>
                                    )}
                                </Box>

                                {/* 이름 & 세부 품종 (2열 그리드) */}
                                <Grid templateColumns={{ base: '1fr', sm: '1fr 1fr' }} gap={3.5}>
                                    <Box>
                                        <HStack justify="space-between" mb={1.5}>
                                            <HStack gap={1}>
                                                <Text fontSize="13px" fontWeight="700" color="waba.charcoal">
                                                    이름
                                                </Text>
                                                <Text fontSize="13px" fontWeight="700" color="waba.purple">
                                                    *
                                                </Text>
                                            </HStack>
                                            <Text fontSize="11px" color="waba.faint">최대 20자</Text>
                                        </HStack>
                                        <Input
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            placeholder={`예: ${currentSpeciesMeta.sampleName}`}
                                            maxLength={20}
                                            h="42px"
                                            borderRadius="14px"
                                            bg="waba.subtle"
                                            border="1px solid"
                                            borderColor="waba.border"
                                            fontSize="14px"
                                            fontWeight="600"
                                            px={3.5}
                                            _focus={{
                                                bg: 'white',
                                                borderColor: 'waba.purple',
                                                outline: 'none',
                                            }}
                                        />
                                    </Box>

                                    <Box>
                                        <HStack justify="space-between" mb={1.5}>
                                            <HStack gap={1}>
                                                <Text fontSize="13px" fontWeight="700" color="waba.charcoal">
                                                    세부 품종
                                                </Text>
                                                <Text fontSize="13px" fontWeight="700" color="waba.purple">
                                                    *
                                                </Text>
                                            </HStack>
                                            <Text fontSize="11px" color="waba.faint">묘종/견종 등</Text>
                                        </HStack>
                                        <Input
                                            value={breed}
                                            onChange={(e) => setBreed(e.target.value)}
                                            placeholder={`예: ${currentSpeciesMeta.sampleBreed}`}
                                            maxLength={40}
                                            h="42px"
                                            borderRadius="14px"
                                            bg="waba.subtle"
                                            border="1px solid"
                                            borderColor="waba.border"
                                            fontSize="14px"
                                            fontWeight="600"
                                            px={3.5}
                                            _focus={{
                                                bg: 'white',
                                                borderColor: 'waba.purple',
                                                outline: 'none',
                                            }}
                                        />
                                    </Box>
                                </Grid>

                                {/* 생년월일 & 성별/중성화 (2열 그리드) */}
                                <Grid templateColumns={{ base: '1fr', sm: '1fr 1fr' }} gap={3.5}>
                                    <Box>
                                        <HStack justify="space-between" mb={1.5}>
                                            <Text fontSize="13px" fontWeight="700" color="waba.charcoal">
                                                생년월일
                                            </Text>
                                            <Text fontSize="11px" color="waba.faint">선택</Text>
                                        </HStack>
                                        <Input
                                            type="date"
                                            max={todayStr}
                                            value={birthDate}
                                            onChange={(e) => setBirthDate(e.target.value)}
                                            h="42px"
                                            borderRadius="14px"
                                            bg="waba.subtle"
                                            border="1px solid"
                                            borderColor="waba.border"
                                            fontSize="13px"
                                            fontWeight="600"
                                            px={3.5}
                                            _focus={{
                                                bg: 'white',
                                                borderColor: 'waba.purple',
                                                outline: 'none',
                                            }}
                                        />
                                    </Box>

                                    <Box>
                                        <HStack justify="space-between" mb={1.5}>
                                            <Text fontSize="13px" fontWeight="700" color="waba.charcoal">
                                                성별
                                            </Text>
                                            <HStack
                                                as="button"
                                                gap={1}
                                                cursor="pointer"
                                                onClick={() => setIsNeutered(!isNeutered)}
                                            >
                                                <Flex
                                                    w="15px"
                                                    h="15px"
                                                    borderRadius="4px"
                                                    bg={isNeutered ? 'waba.purple' : 'white'}
                                                    border="1.5px solid"
                                                    borderColor={isNeutered ? 'waba.purple' : 'gray.300'}
                                                    align="center"
                                                    justify="center"
                                                    color="white"
                                                >
                                                    {isNeutered && <Check size={10} strokeWidth={3} />}
                                                </Flex>
                                                <Text fontSize="11px" fontWeight="600" color={isNeutered ? 'waba.purple' : 'waba.faint'}>
                                                    중성화 완료
                                                </Text>
                                            </HStack>
                                        </HStack>

                                        <Grid templateColumns="repeat(3, 1fr)" gap={1.5} h="42px" p={1} bg="waba.subtle" borderRadius="14px" border="1px solid" borderColor="waba.border">
                                            {GENDER_OPTIONS.map((g) => {
                                                const active = gender === g.value;
                                                return (
                                                    <Box
                                                        key={g.value}
                                                        as="button"
                                                        borderRadius="10px"
                                                        fontSize="12px"
                                                        fontWeight={active ? '700' : '600'}
                                                        bg={active ? 'white' : 'transparent'}
                                                        color={active ? 'waba.purple' : 'waba.faint'}
                                                        boxShadow={active ? '0 1px 4px rgba(0,0,0,0.08)' : 'none'}
                                                        transition="all 0.15s"
                                                        onClick={() => setGender(g.value)}
                                                    >
                                                        {g.label}
                                                    </Box>
                                                );
                                            })}
                                        </Grid>
                                    </Box>
                                </Grid>

                                {/* 체형 측정치: 체중 & 등길이 (2열 그리드 - 선택) */}
                                <Grid templateColumns={{ base: '1fr', sm: '1fr 1fr' }} gap={3.5}>
                                    <Box>
                                        <HStack justify="space-between" mb={1.5}>
                                            <Text fontSize="13px" fontWeight="700" color="waba.charcoal">
                                                현재 체중
                                            </Text>
                                            <Text fontSize="11px" color="waba.faint">선택 (성장 기록 연동)</Text>
                                        </HStack>
                                        <Box position="relative">
                                            <Input
                                                type="number"
                                                step="0.1"
                                                min="0"
                                                value={weightKg}
                                                onChange={(e) => setWeightKg(e.target.value)}
                                                placeholder="예: 4.2"
                                                h="42px"
                                                borderRadius="14px"
                                                bg="waba.subtle"
                                                border="1px solid"
                                                borderColor="waba.border"
                                                fontSize="14px"
                                                fontWeight="600"
                                                pl={3.5}
                                                pr={10}
                                                _focus={{
                                                    bg: 'white',
                                                    borderColor: 'waba.purple',
                                                    outline: 'none',
                                                }}
                                            />
                                            <Text
                                                position="absolute"
                                                right={3.5}
                                                top="50%"
                                                transform="translateY(-50%)"
                                                fontSize="12px"
                                                fontWeight="700"
                                                color="waba.faint"
                                                pointerEvents="none"
                                            >
                                                kg
                                            </Text>
                                        </Box>
                                    </Box>

                                    <Box>
                                        <HStack justify="space-between" mb={1.5}>
                                            <Text fontSize="13px" fontWeight="700" color="waba.charcoal">
                                                등길이 / 체장
                                            </Text>
                                            <Text fontSize="11px" color="waba.faint">선택 (가구 맞춤 추천)</Text>
                                        </HStack>
                                        <Box position="relative">
                                            <Input
                                                type="number"
                                                step="0.5"
                                                min="0"
                                                value={bodyLengthCm}
                                                onChange={(e) => setBodyLengthCm(e.target.value)}
                                                placeholder="예: 36.5"
                                                h="42px"
                                                borderRadius="14px"
                                                bg="waba.subtle"
                                                border="1px solid"
                                                borderColor="waba.border"
                                                fontSize="14px"
                                                fontWeight="600"
                                                pl={3.5}
                                                pr={10}
                                                _focus={{
                                                    bg: 'white',
                                                    borderColor: 'waba.purple',
                                                    outline: 'none',
                                                }}
                                            />
                                            <Text
                                                position="absolute"
                                                right={3.5}
                                                top="50%"
                                                transform="translateY(-50%)"
                                                fontSize="12px"
                                                fontWeight="700"
                                                color="waba.faint"
                                                pointerEvents="none"
                                            >
                                                cm
                                            </Text>
                                        </Box>
                                    </Box>
                                </Grid>

                                {/* 설정 토글 카드 2종 */}
                                <VStack gap={2.5} align="stretch">
                                    {/* 카드 1: 대표 반려동물 지정 */}
                                    <Box
                                        as="button"
                                        w="full"
                                        textAlign="left"
                                        p={3.5}
                                        borderRadius="16px"
                                        border="1.5px solid"
                                        borderColor={(existingPetsCount === 0 || isPrimary) ? 'waba.purple' : 'waba.border'}
                                        bg={(existingPetsCount === 0 || isPrimary) ? 'waba.purpleLight' : 'waba.subtle'}
                                        transition="all 0.2s"
                                        onClick={() => {
                                            if (existingPetsCount > 0) setIsPrimary(!isPrimary);
                                        }}
                                    >
                                        <HStack align="start" gap={3}>
                                            <Flex
                                                w="20px"
                                                h="20px"
                                                borderRadius="6px"
                                                bg={(existingPetsCount === 0 || isPrimary) ? 'waba.purple' : 'white'}
                                                border="1.5px solid"
                                                borderColor={(existingPetsCount === 0 || isPrimary) ? 'waba.purple' : 'gray.300'}
                                                align="center"
                                                justify="center"
                                                color="white"
                                                mt={0.5}
                                                flexShrink={0}
                                            >
                                                {(existingPetsCount === 0 || isPrimary) && <Check size={13} strokeWidth={3} />}
                                            </Flex>
                                            <VStack align="start" gap={0.5} flex={1}>
                                                <HStack gap={1.5}>
                                                    <Crown size={14} color="#6338A9" />
                                                    <Text fontSize="13px" fontWeight="700" color="waba.charcoal">
                                                        대표 반려동물로 지정
                                                    </Text>
                                                </HStack>
                                                <Text fontSize="11px" color="waba.faint" lineHeight="1.4">
                                                    {existingPetsCount === 0
                                                        ? '첫 번째로 등록하는 반려동물은 자동으로 대표 가족으로 지정됩니다.'
                                                        : '마이페이지 및 커뮤니티 활동 시 가장 먼저 대표 가족으로 표시됩니다.'}
                                                </Text>
                                            </VStack>
                                        </HStack>
                                    </Box>

                                    {/* 카드 2: AI 맞춤 케어·리빙 데이터 활용 동의 */}
                                    <Box
                                        as="button"
                                        w="full"
                                        textAlign="left"
                                        p={3.5}
                                        borderRadius="16px"
                                        border="1.5px solid"
                                        borderColor={aiConsent ? 'purple.200' : 'waba.border'}
                                        bg={aiConsent ? 'purple.50/50' : 'waba.subtle'}
                                        transition="all 0.2s"
                                        onClick={() => setAiConsent(!aiConsent)}
                                    >
                                        <HStack align="start" gap={3}>
                                            <Flex
                                                w="20px"
                                                h="20px"
                                                borderRadius="6px"
                                                bg={aiConsent ? 'waba.purple' : 'white'}
                                                border="1.5px solid"
                                                borderColor={aiConsent ? 'waba.purple' : 'gray.300'}
                                                align="center"
                                                justify="center"
                                                color="white"
                                                mt={0.5}
                                                flexShrink={0}
                                            >
                                                {aiConsent && <Check size={13} strokeWidth={3} />}
                                            </Flex>
                                            <VStack align="start" gap={0.5} flex={1}>
                                                <HStack gap={1.5}>
                                                    <Sparkles size={14} color="#6338A9" />
                                                    <Text fontSize="13px" fontWeight="700" color="waba.charcoal">
                                                        AI 맞춤 케어·리빙 데이터 활용 동의 (선택)
                                                    </Text>
                                                </HStack>
                                                <Text fontSize="11px" color="waba.faint" lineHeight="1.4">
                                                    체중·품종·건강 이력을 기반으로 맞춤 가구 사이즈와 케어 솔루션을 추천받습니다.
                                                </Text>
                                            </VStack>
                                        </HStack>
                                    </Box>
                                </VStack>
                            </VStack>
                        </Dialog.Body>

                        {/* 3. 모달 푸터 액션 바 */}
                        <Dialog.Footer p={0} mt={6} pt={4} borderTop="1px solid" borderColor="waba.border">
                            <HStack gap={2.5} justify="flex-end" w="full">
                                <Button
                                    variant="ghost"
                                    bg="waba.subtle"
                                    color="waba.charcoal"
                                    rounded="full"
                                    px={5}
                                    h="42px"
                                    fontSize="13px"
                                    fontWeight="600"
                                    _hover={{ bg: 'gray.200' }}
                                    onClick={() => onOpenChange(false)}
                                    disabled={isSubmitting}
                                >
                                    취소
                                </Button>
                                <Button
                                    bg="waba.charcoal"
                                    color="white"
                                    rounded="full"
                                    px={6}
                                    h="42px"
                                    fontSize="13px"
                                    fontWeight="700"
                                    _hover={{ bg: 'waba.purple' }}
                                    onClick={handleSubmit}
                                    loading={isSubmitting}
                                >
                                    {isEditMode ? '수정 완료' : '반려동물 등록 완료'}
                                </Button>
                            </HStack>
                        </Dialog.Footer>
                    </Dialog.Content>
                </Dialog.Positioner>
            </Portal>
        </Dialog.Root>
    );
}
