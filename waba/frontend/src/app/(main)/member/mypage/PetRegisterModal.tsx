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
import UserAvatar from "../../common/UserAvatar";

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

const SPECIES_OPTIONS: { value: PetSpecies; label: string; sampleName: string; sampleBreed: string }[] = [
    { value: 'DOG', label: '강아지', sampleName: '보리', sampleBreed: '말티푸' },
    { value: 'CAT', label: '고양이', sampleName: '구름이', sampleBreed: '랙돌 (Ragdoll)' },
    { value: 'RABBIT', label: '토끼', sampleName: '모찌', sampleBreed: '홀랜드 롭이어' },
    { value: 'HAMSTER', label: '햄스터', sampleName: '해바라기', sampleBreed: '골든 햄스터' },
    { value: 'GUINEAPIG', label: '기니피그', sampleName: '땅콩이', sampleBreed: '아비시니안' },
    { value: 'CHINCHILA', label: '친칠라', sampleName: '먼지', sampleBreed: '실버 모자이크' },
    { value: 'OTHER', label: '기타', sampleName: '탄이', sampleBreed: '세부 품종 입력' },
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

    const [species, setSpecies] = useState<PetSpecies | ''>('');
    const [customSpecies, setCustomSpecies] = useState('');
    const [name, setName] = useState('');
    const [breed, setBreed] = useState('');
    const [birthDate, setBirthDate] = useState('');
    const [isBirthEstimated, setIsBirthEstimated] = useState(false);
    const [gender, setGender] = useState<PetGender>('FEMALE');
    const [isNeutered, setIsNeutered] = useState(true);
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
            setIsBirthEstimated(Boolean(editingPet.is_birth_estimated));
            setGender(editingPet.gender || 'UNKNOWN');
            setIsNeutered(Boolean(editingPet.is_neutered));
            setIsPrimary(Boolean(editingPet.is_primary));
            setAiConsent(editingPet.ai_private_data_consent === undefined ? true : Boolean(editingPet.ai_private_data_consent));
            setPreviewImageUrl(editingPet.current_avatar_url || null);
            setSelectedFile(null);
            setResetAvatar(false);
        } else {
            setSpecies('');
            setCustomSpecies('');
            setName('');
            setBreed('');
            setBirthDate('');
            setIsBirthEstimated(false);
            setGender('FEMALE');
            setIsNeutered(true);
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
        if (!species) {
            toaster.create({ title: '반려동물 종류를 선택해주세요.', type: 'warning' });
            return;
        }
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

        setIsSubmitting(true);
        try {
            const formData = new FormData();
            formData.append('species', species);
            formData.append('custom_species', species === 'OTHER' ? trimmedCustomSpecies : '');
            formData.append('name', trimmedName);
            formData.append('breed', trimmedBreed);
            formData.append('birth_date', birthDate || '');
            formData.append('is_birth_estimated', String(isBirthEstimated));
            formData.append('gender', gender);
            formData.append('is_neutered', String(isNeutered));
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
                        : `${trimmedName}의 가족 프로필이 등록되었습니다.`,
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
                        bg="var(--waba-card)"
                        position="relative"
                        css={{
                            scrollbarWidth: 'none',
                            '&::-webkit-scrollbar': { display: 'none' },
                        }}
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
                            gradientVia="#6338A9"
                            gradientTo="purple.400"
                        />

                        {/* 닫기 버튼 */}
                        <Dialog.CloseTrigger asChild position="absolute" top={5} right={5}>
                            <CloseButton size="sm" borderRadius="full" bg="var(--waba-surface)" color="var(--waba-ink)" _hover={{ bg: 'var(--waba-line)' }} />
                        </Dialog.CloseTrigger>

                        {/* 1. 모달 헤더 */}
                        <Dialog.Header p={0} mb={5} pr={8}>
                            <VStack align="start" gap={1}>
                                <HStack gap={2.5} wrap="wrap">
                                    <Dialog.Title fontSize="20px" fontWeight="800" color="var(--waba-ink)">
                                        {isEditMode ? '반려동물 프로필 수정' : '새 반려동물 등록'}
                                    </Dialog.Title>
                                    {showFirstRewardBadge && (
                                        <Badge
                                            bg="var(--waba-purple-soft)"
                                            color="var(--waba-purple-text)"
                                            border="1px solid"
                                            borderColor="var(--waba-purple-border)"
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
                                <Text fontSize="12px" color="var(--waba-ink-3)">
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
                                        <UserAvatar
                                            src={previewImageUrl}
                                            alt="반려동물 아바타 미리보기"
                                            w="92px"
                                            h="92px"
                                            iconSize={34}
                                            fallbackType="pet"
                                            bg="var(--waba-purple-soft)"
                                            color="var(--waba-purple-text)"
                                            border="3px solid"
                                            borderColor="var(--waba-purple-text)"
                                            boxShadow="md"
                                        />

                                        <IconButton
                                            aria-label="아바타 사진 업로드"
                                            position="absolute"
                                            bottom={0}
                                            right={0}
                                            w="30px"
                                            h="30px"
                                            minW="30px"
                                            borderRadius="full"
                                            bg="#6338A9"
                                            color="white"
                                            border="2px solid" borderColor="var(--waba-card)"
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
                                            borderColor="var(--waba-line)"
                                            bg="var(--waba-surface)"
                                            color="var(--waba-ink)"
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
                                                color="var(--waba-ink-3)"
                                                rounded="full"
                                                px={2.5}
                                                fontSize="11px"
                                                _hover={{ color: 'red.500', bg: 'rgba(239, 68, 68, 0.12)' }}
                                                onClick={handleClearAvatar}
                                            >
                                                기본 아이콘으로 변경
                                            </Button>
                                        )}
                                    </HStack>

                                    <Text fontSize="11px" color="var(--waba-ink-3)">
                                        최소 가로 150px · 1:1 정사각형 중앙 크롭
                                    </Text>
                                </VStack>

                                {/* 반려동물 종류 (species) 선택 칩 */}
                                <Box>
                                    <HStack gap={1} mb={2}>
                                        <Text fontSize="13px" fontWeight="700" color="var(--waba-ink)">
                                            반려동물 종류
                                        </Text>
                                        <Text fontSize="13px" fontWeight="700" color="var(--waba-purple-text)">
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
                                                    borderColor={selected ? '#6338A9' : 'var(--waba-line)'}
                                                    bg={selected ? 'var(--waba-purple-soft)' : 'var(--waba-surface)'}
                                                    color={selected ? '#6338A9' : 'var(--waba-ink)'}
                                                    transition="all 0.15s"
                                                    _hover={{ borderColor: '#6338A9' }}
                                                    onClick={() => setSpecies(item.value)}
                                                >
                                                    {item.label}
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
                                            bg="var(--waba-purple-soft)"
                                            border="1.5px solid"
                                            borderColor="var(--waba-purple-border)"
                                        >
                                            <HStack justify="space-between" mb={1.5}>
                                                <HStack gap={1}>
                                                    <Text fontSize="13px" fontWeight="700" color="var(--waba-ink)">
                                                        어떤 동물인가요? (동물 종류)
                                                    </Text>
                                                    <Text fontSize="13px" fontWeight="700" color="var(--waba-purple-text)">
                                                        *
                                                    </Text>
                                                </HStack>
                                                <Text fontSize="11px" color="var(--waba-purple-text)" fontWeight="600">
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
                                                bg="var(--waba-card)"
                                                border="1px solid"
                                                borderColor="var(--waba-purple-border)"
                                                fontSize="14px"
                                                fontWeight="600"
                                                px={3.5}
                                                _focus={{
                                                    borderColor: '#6338A9',
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
                                                <Text fontSize="13px" fontWeight="700" color="var(--waba-ink)">
                                                    이름
                                                </Text>
                                                <Text fontSize="13px" fontWeight="700" color="var(--waba-purple-text)">
                                                    *
                                                </Text>
                                            </HStack>
                                            <Text fontSize="11px" color="var(--waba-ink-3)">최대 20자</Text>
                                        </HStack>
                                        <Input
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            placeholder={`예: ${currentSpeciesMeta.sampleName}`}
                                            maxLength={20}
                                            h="42px"
                                            borderRadius="14px"
                                            bg="var(--waba-surface)"
                                            border="1px solid"
                                            borderColor="var(--waba-line)"
                                            fontSize="14px"
                                            fontWeight="600"
                                            px={3.5}
                                            _focus={{
                                                bg: 'var(--waba-card)',
                                                borderColor: '#6338A9',
                                                outline: 'none',
                                            }}
                                        />
                                    </Box>

                                    <Box>
                                        <HStack justify="space-between" mb={1.5}>
                                            <Text fontSize="13px" fontWeight="700" color="var(--waba-ink)">
                                                세부 품종
                                            </Text>
                                            <Text fontSize="11px" color="var(--waba-ink-3)">선택 · 묘종/견종 등</Text>
                                        </HStack>
                                        <Input
                                            value={breed}
                                            onChange={(e) => setBreed(e.target.value)}
                                            placeholder={`예: ${currentSpeciesMeta.sampleBreed}`}
                                            maxLength={40}
                                            h="42px"
                                            borderRadius="14px"
                                            bg="var(--waba-surface)"
                                            border="1px solid"
                                            borderColor="var(--waba-line)"
                                            fontSize="14px"
                                            fontWeight="600"
                                            px={3.5}
                                            _focus={{
                                                bg: 'var(--waba-card)',
                                                borderColor: '#6338A9',
                                                outline: 'none',
                                            }}
                                        />
                                    </Box>
                                </Grid>

                                {/* 생년월일 & 성별/중성화 (2열 그리드) */}
                                <Grid templateColumns={{ base: '1fr', sm: '1fr 1fr' }} gap={3.5}>
                                    <Box>
                                        <HStack justify="space-between" mb={1.5}>
                                            <Text fontSize="13px" fontWeight="700" color="var(--waba-ink)">
                                                생년월일
                                            </Text>
                                            <HStack
                                                as="button"
                                                gap={1}
                                                cursor="pointer"
                                                onClick={() => setIsBirthEstimated(!isBirthEstimated)}
                                            >
                                                <Flex
                                                    w="14px"
                                                    h="14px"
                                                    borderRadius="4px"
                                                    border="1.5px solid"
                                                    borderColor={isBirthEstimated ? '#6338A9' : 'var(--waba-line)'}
                                                    bg={isBirthEstimated ? '#6338A9' : 'var(--waba-card)'}
                                                    align="center"
                                                    justify="center"
                                                    color="white"
                                                    fontSize="10px"
                                                >
                                                    {isBirthEstimated && <Check size={10} strokeWidth={3} />}
                                                </Flex>
                                                <Text fontSize="11px" fontWeight="600" color={isBirthEstimated ? '#6338A9' : 'var(--waba-ink-3)'}>
                                                    추정 (정확한 생일을 모름)
                                                </Text>
                                            </HStack>
                                        </HStack>
                                        <Input
                                            type="date"
                                            max={todayStr}
                                            value={birthDate}
                                            onChange={(e) => setBirthDate(e.target.value)}
                                            h="42px"
                                            borderRadius="14px"
                                            bg="var(--waba-surface)"
                                            border="1px solid"
                                            borderColor="var(--waba-line)"
                                            fontSize="13px"
                                            fontWeight="600"
                                            px={3.5}
                                            _focus={{
                                                bg: 'var(--waba-card)',
                                                borderColor: '#6338A9',
                                                outline: 'none',
                                            }}
                                        />
                                    </Box>

                                    <Box>
                                        <HStack justify="space-between" mb={1.5}>
                                            <Text fontSize="13px" fontWeight="700" color="var(--waba-ink)">
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
                                                    bg={isNeutered ? '#6338A9' : 'var(--waba-card)'}
                                                    border="1.5px solid"
                                                    borderColor={isNeutered ? '#6338A9' : 'var(--waba-line)'}
                                                    align="center"
                                                    justify="center"
                                                    color="white"
                                                >
                                                    {isNeutered && <Check size={10} strokeWidth={3} />}
                                                </Flex>
                                                <Text fontSize="11px" fontWeight="600" color={isNeutered ? '#6338A9' : 'var(--waba-ink-3)'}>
                                                    중성화 완료
                                                </Text>
                                            </HStack>
                                        </HStack>

                                        <Grid templateColumns="repeat(3, 1fr)" gap={1.5} h="42px" p={1} bg="var(--waba-surface)" borderRadius="14px" border="1px solid" borderColor="var(--waba-line)">
                                            {GENDER_OPTIONS.map((g) => {
                                                const active = gender === g.value;
                                                return (
                                                    <Box
                                                        key={g.value}
                                                        as="button"
                                                        borderRadius="10px"
                                                        fontSize="12px"
                                                        fontWeight={active ? '700' : '600'}
                                                        bg={active ? 'var(--waba-card)' : 'transparent'}
                                                        color={active ? '#6338A9' : 'var(--waba-ink-3)'}
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
                            </VStack>
                        </Dialog.Body>

                        {/* 3. 모달 푸터 액션 바 */}
                        <Dialog.Footer p={0} mt={6} pt={4} borderTop="1px solid" borderColor="var(--waba-line)">
                            <HStack gap={2.5} justify="flex-end" w="full">
                                <Button
                                    variant="ghost"
                                    bg="var(--waba-surface)"
                                    color="var(--waba-ink)"
                                    rounded="full"
                                    px={5}
                                    h="42px"
                                    fontSize="13px"
                                    fontWeight="600"
                                    _hover={{ bg: 'var(--waba-line)' }}
                                    onClick={() => onOpenChange(false)}
                                    disabled={isSubmitting}
                                >
                                    취소
                                </Button>
                                <Button
                                    bg="#6338A9" color="white"
                                    rounded="full"
                                    px={6}
                                    h="42px"
                                    fontSize="13px"
                                    fontWeight="700"
                                    _hover={{ bg: '#6338A9' }}
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
