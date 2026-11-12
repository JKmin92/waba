'use client'

import {
    Avatar,
    Badge,
    Box,
    Button,
    CloseButton,
    Dialog,
    Flex,
    HStack,
    IconButton,
    Input,
    Portal,
    Stack,
    Text,
    Textarea,
    VStack,
} from "@chakra-ui/react";
import { Camera, Check, Sparkles, Upload, X } from "lucide-react";
import { LuSparkles, LuUser, LuUserRound } from "react-icons/lu";
import { useEffect, useRef, useState } from "react";
import axiosInstance from "@/utils/api";
import { toaster } from "@/components/ui/toaster";
import { UserProfileData } from "./ProfileSection";
import { getRefreshToken, setAuthSession } from "@/utils/authUtils";

interface ProfileEditModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    currentProfile: UserProfileData | null;
    onProfileUpdated: (updatedProfile: UserProfileData) => void;
}

export default function ProfileEditModal({
    open,
    onOpenChange,
    currentProfile,
    onProfileUpdated,
}: ProfileEditModalProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [nickname, setNickname] = useState('');
    const [bio, setBio] = useState('');
    const [isMultiSpecies, setIsMultiSpecies] = useState(false);

    const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [resetProfileImage, setResetProfileImage] = useState(false);

    const [isCheckingNickname, setIsCheckingNickname] = useState(false);
    const [nicknameStatus, setNicknameStatus] = useState<
        'idle' | 'same' | 'available' | 'duplicated' | 'invalid'
    >('same');
    const [nicknameMessage, setNicknameMessage] = useState('');

    const [isSubmitting, setIsSubmitting] = useState(false);

    // 모달 오픈 시 기존 프로필 값으로 초기화
    useEffect(() => {
        if (open && currentProfile) {
            setNickname(currentProfile.nickname || '');
            setBio(currentProfile.bio || '');
            setIsMultiSpecies(Boolean(currentProfile.is_multi_species));
            setPreviewImageUrl(currentProfile.profile_image_url || null);
            setSelectedFile(null);
            setResetProfileImage(false);
            setNicknameStatus('same');
            setNicknameMessage('');
        }
    }, [open, currentProfile]);

    // 파일 선택 핸들러 (최소 가로 150px 사전 검증)
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            toaster.create({ title: '이미지 파일만 업로드할 수 있습니다.', type: 'error' });
            return;
        }

        if (file.size > 15 * 1024 * 1024) {
            toaster.create({ title: '이미지 용량은 최대 15MB까지 가능합니다.', type: 'error' });
            return;
        }

        const objectUrl = URL.createObjectURL(file);
        const img = new window.Image();
        img.onload = () => {
            if (img.width < 150) {
                toaster.create({
                    title: '최소 가로 150px 이상의 이미지를 등록해주세요.',
                    description: `현재 선택된 이미지 너비: ${img.width}px`,
                    type: 'error'
                });
                if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                }
                return;
            }

            setSelectedFile(file);
            setResetProfileImage(false);
            setPreviewImageUrl(objectUrl);
        };
        img.onerror = () => {
            toaster.create({ title: '이미지를 불러올 수 없습니다.', type: 'error' });
        };
        img.src = objectUrl;
    };

    // 기본 이미지로 리셋
    const handleResetToDefaultImage = () => {
        setSelectedFile(null);
        setPreviewImageUrl(null);
        setResetProfileImage(true);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    // 닉네임 입력 핸들러
    const handleNicknameChange = (val: string) => {
        setNickname(val);
        const trimmed = val.trim();

        if (trimmed === (currentProfile?.nickname || '')) {
            setNicknameStatus('same');
            setNicknameMessage('');
            return;
        }

        if (trimmed.length < 2 || trimmed.length > 12) {
            setNicknameStatus('invalid');
            setNicknameMessage('닉네임은 2~12자로 입력해주세요.');
            return;
        }

        // 입력이 바뀌면 다시 중복체크 필요
        setNicknameStatus('idle');
        setNicknameMessage('');
    };

    // 닉네임 중복 확인
    const handleCheckNickname = async () => {
        const trimmed = nickname.trim();
        if (trimmed === (currentProfile?.nickname || '')) {
            setNicknameStatus('same');
            setNicknameMessage('현재 사용 중인 본인의 닉네임입니다.');
            return;
        }

        if (trimmed.length < 2 || trimmed.length > 12) {
            setNicknameStatus('invalid');
            setNicknameMessage('닉네임은 2~12자로 입력해주세요.');
            return;
        }

        setIsCheckingNickname(true);
        try {
            const res = await axiosInstance.get(`/user/checkNickname?nickname=${encodeURIComponent(trimmed)}`);
            if (res.data?.isAvailable) {
                setNicknameStatus('available');
                setNicknameMessage('사용 가능한 닉네임입니다.');
            } else {
                setNicknameStatus('duplicated');
                setNicknameMessage('이미 사용 중인 닉네임입니다.');
            }
        } catch {
            toaster.create({ title: '중복 확인 중 오류가 발생했습니다.', type: 'error' });
        } finally {
            setIsCheckingNickname(false);
        }
    };

    // 프로필 저장 제출
    const handleSubmit = async () => {
        const trimmedNickname = nickname.trim();
        if (!trimmedNickname) {
            toaster.create({ title: '닉네임을 입력해주세요.', type: 'error' });
            return;
        }

        if (nicknameStatus === 'invalid' || nicknameStatus === 'duplicated') {
            toaster.create({ title: nicknameMessage || '올바른 닉네임을 입력해주세요.', type: 'error' });
            return;
        }

        if (trimmedNickname !== (currentProfile?.nickname || '') && nicknameStatus !== 'available') {
            toaster.create({ title: '닉네임 중복 확인을 진행해주세요.', type: 'info' });
            return;
        }

        setIsSubmitting(true);
        try {
            const formData = new FormData();
            formData.append('nickname', trimmedNickname);
            formData.append('bio', bio.trim());
            formData.append('is_multi_species', String(isMultiSpecies));
            formData.append('reset_profile_image', String(resetProfileImage));

            if (selectedFile) {
                formData.append('profile_image', selectedFile);
            }

            const res = await axiosInstance.put('/user/profile', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            if (res.data?.success && res.data?.profile) {
                // 토큰 갱신 (닉네임 등 변경 반영)
                if (res.data.accessToken) {
                    const currentRefresh = getRefreshToken() || '';
                    setAuthSession(res.data.accessToken, currentRefresh);
                }

                toaster.create({ title: '프로필이 성공적으로 수정되었습니다.', type: 'success' });
                onProfileUpdated(res.data.profile);
                onOpenChange(false);
            }
        } catch (e: any) {
            const msg = e.response?.data?.message || '프로필 수정 중 오류가 발생했습니다.';
            toaster.create({ title: msg, type: 'error' });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog.Root
            open={open}
            onOpenChange={(e) => onOpenChange(e.open)}
            placement="center"
        >
            <Portal>
                <Dialog.Backdrop backdropFilter="blur(8px)" bg="blackAlpha.500" />
                <Dialog.Positioner p={4}>
                    <Dialog.Content
                        maxW="520px"
                        w="full"
                        borderRadius="28px"
                        p={{ base: 6, md: 7 }}
                        boxShadow="0 24px 48px -12px rgba(26, 28, 30, 0.2)"
                        bg="white"
                    >
                        {/* 닫기 버튼 */}
                        <Dialog.CloseTrigger asChild position="absolute" top={5} right={5}>
                            <CloseButton size="sm" borderRadius="full" bg="waba.subtle" />
                        </Dialog.CloseTrigger>

                        {/* 모달 헤더 */}
                        <Dialog.Header p={0} mb={6}>
                            <Dialog.Title fontSize="20px" fontWeight="800" color="waba.charcoal">
                                프로필 수정
                            </Dialog.Title>
                            <Text fontSize="12px" color="waba.faint" mt={0.5}>
                                WABA 커뮤니티에서 다른 집사들에게 보여질 프로필을 설정합니다
                            </Text>
                        </Dialog.Header>

                        {/* 모달 본문 */}
                        <Dialog.Body p={0}>
                            <VStack gap={6} align="stretch">

                                {/* ============================================= */}
                                {/* 1. 프로필 아바타 편집 영역                    */}
                                {/* ============================================= */}
                                <VStack gap={3} align="center" py={2}>
                                    <Box position="relative">
                                        <Avatar.Root
                                            size="2xl"
                                            w="100px"
                                            h="100px"
                                            borderRadius="full"
                                            border="3px solid"
                                            borderColor="waba.purple"
                                            shadow="md"
                                        >
                                            {previewImageUrl ? (
                                                <Avatar.Image src={previewImageUrl} alt="프로필 아바타" />
                                            ) : (
                                                <LuUserRound size={44} color="#6338A9" />
                                            )}
                                        </Avatar.Root>

                                        {/* 카메라 오버레이 버튼 */}
                                        <IconButton
                                            aria-label="사진 변경"
                                            size="xs"
                                            onClick={() => fileInputRef.current?.click()}
                                            position="absolute"
                                            bottom="0"
                                            right="0"
                                            w="32px"
                                            h="32px"
                                            borderRadius="full"
                                            bg="waba.purple"
                                            color="white"
                                            border="2px solid white"
                                            shadow="sm"
                                            transition="all 0.2s"
                                            _hover={{ transform: 'scale(1.1)', bg: 'waba.charcoal' }}
                                        >
                                            <Camera size={16} />
                                        </IconButton>

                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept="image/*"
                                            style={{ display: 'none' }}
                                            onChange={handleFileChange}
                                        />
                                    </Box>

                                    {/* 이미지 액션 버튼들 */}
                                    <HStack gap={3}>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="xs"
                                            rounded="full"
                                            px={3}
                                            h="30px"
                                            fontSize="12px"
                                            borderColor="waba.border"
                                            color="waba.charcoal"
                                            onClick={() => fileInputRef.current?.click()}
                                        >
                                            <Upload size={12} style={{ marginRight: '4px' }} />
                                            사진 변경
                                        </Button>

                                        {previewImageUrl && (
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="xs"
                                                rounded="full"
                                                px={2.5}
                                                h="30px"
                                                fontSize="12px"
                                                color="waba.faint"
                                                _hover={{ color: 'red.500', bg: 'red.50' }}
                                                onClick={handleResetToDefaultImage}
                                            >
                                                기본 이미지로 변경
                                            </Button>
                                        )}
                                    </HStack>

                                    <Text fontSize="11px" color="waba.faint" textAlign="center">
                                        최소 가로 150px 이상 · 1:1 정사각형 중앙 자동 크롭
                                    </Text>
                                </VStack>


                                {/* ============================================= */}
                                {/* 2. 닉네임 입력 섹션 (중복 확인 포함)          */}
                                {/* ============================================= */}
                                <VStack align="start" gap={1.5}>
                                    <HStack justify="space-between" w="full">
                                        <Text fontSize="13px" fontWeight="700" color="waba.charcoal">
                                            활동 닉네임 <Text as="span" color="red.500">*</Text>
                                        </Text>
                                        <Text fontSize="11px" color="waba.faint">
                                            2~12자 이내
                                        </Text>
                                    </HStack>

                                    <HStack w="full" gap={2}>
                                        <Input
                                            value={nickname}
                                            onChange={(e) => handleNicknameChange(e.target.value)}
                                            placeholder="닉네임을 입력하세요"
                                            borderRadius="16px"
                                            borderColor={
                                                nicknameStatus === 'available' ? 'green.500' :
                                                    nicknameStatus === 'duplicated' || nicknameStatus === 'invalid' ? 'red.400' :
                                                        'waba.border'
                                            }
                                            fontSize="14px"
                                            h="44px"
                                            px={4}
                                            _focus={{ borderColor: 'waba.purple' }}
                                        />

                                        <Button
                                            type="button"
                                            onClick={handleCheckNickname}
                                            loading={isCheckingNickname}
                                            disabled={nicknameStatus === 'same' || !nickname.trim()}
                                            bg={nicknameStatus === 'available' ? 'green.600' : 'waba.charcoal'}
                                            color="white"
                                            rounded="16px"
                                            h="44px"
                                            px={4}
                                            fontSize="13px"
                                            fontWeight="600"
                                            flexShrink={0}
                                        >
                                            {nicknameStatus === 'available' ? (
                                                <HStack gap={1}>
                                                    <Check size={14} />
                                                    <Text>확인됨</Text>
                                                </HStack>
                                            ) : (
                                                '중복 확인'
                                            )}
                                        </Button>
                                    </HStack>

                                    {/* 피드백 메시지 */}
                                    {nicknameMessage && (
                                        <Text
                                            fontSize="12px"
                                            fontWeight="600"
                                            color={
                                                nicknameStatus === 'available' || nicknameStatus === 'same' ? 'green.600' :
                                                    'red.500'
                                            }
                                            pl={1}
                                        >
                                            {nicknameStatus === 'available' && '✓ '}
                                            {nicknameMessage}
                                        </Text>
                                    )}
                                </VStack>


                                {/* ============================================= */}
                                {/* 3. 한 줄 소개 (Bio) 입력 섹션                 */}
                                {/* ============================================= */}
                                <VStack align="start" gap={1.5}>
                                    <HStack justify="space-between" w="full">
                                        <Text fontSize="13px" fontWeight="700" color="waba.charcoal">
                                            한 줄 소개 (Bio)
                                        </Text>
                                        <Text fontSize="11px" color={bio.length > 150 ? 'red.500' : 'waba.faint'}>
                                            {bio.length} / 150자
                                        </Text>
                                    </HStack>

                                    <Textarea
                                        value={bio}
                                        onChange={(e) => setBio(e.target.value.slice(0, 150))}
                                        placeholder="반려동물과의 소중한 일상이나 인테리어 취향을 간단히 적어보세요"
                                        borderRadius="16px"
                                        borderColor="waba.border"
                                        fontSize="14px"
                                        p={3.5}
                                        minH="88px"
                                        resize="none"
                                        _focus={{ borderColor: 'waba.purple' }}
                                    />
                                </VStack>


                                {/* ============================================= */}
                                {/* 4. 다종 합사 가구 설정 토글 카드               */}
                                {/* ============================================= */}
                                <Box
                                    as="button"
                                    onClick={() => setIsMultiSpecies(!isMultiSpecies)}
                                    p={3.5}
                                    borderRadius="18px"
                                    bg={isMultiSpecies ? 'waba.purpleLight/50' : 'waba.subtle'}
                                    border="1px solid"
                                    borderColor={isMultiSpecies ? 'waba.purple/40' : 'waba.border'}
                                    textAlign="left"
                                    w="full"
                                    transition="all 0.2s"
                                    _hover={{ borderColor: 'waba.purple' }}
                                >
                                    <HStack justify="space-between" align="center">
                                        <VStack align="start" gap={0.5}>
                                            <HStack gap={1.5}>
                                                <Text fontSize="13px" fontWeight="700" color="waba.charcoal">
                                                    ✨ 캣토(다종) 합사 가구 설정
                                                </Text>
                                                {isMultiSpecies && (
                                                    <Badge bg="waba.purple" color="white" rounded="full" px={1.5} fontSize="10px">
                                                        활성화
                                                    </Badge>
                                                )}
                                            </HStack>
                                            <Text fontSize="11px" color="waba.faint">
                                                고양이와 토끼 등 2종 이상의 반려동물과 동거 중일 경우 맞춤 배지와 리워드 가중치가 적용됩니다
                                            </Text>
                                        </VStack>

                                        <Box
                                            w="20px"
                                            h="20px"
                                            borderRadius="full"
                                            border="2px solid"
                                            borderColor={isMultiSpecies ? 'waba.purple' : 'gray.300'}
                                            bg={isMultiSpecies ? 'waba.purple' : 'transparent'}
                                            display="flex"
                                            alignItems="center"
                                            justifyContent="center"
                                            flexShrink={0}
                                        >
                                            {isMultiSpecies && <Check size={12} color="white" strokeWidth={3} />}
                                        </Box>
                                    </HStack>
                                </Box>

                            </VStack>
                        </Dialog.Body>


                        {/* ============================================= */}
                        {/* 5. 모달 하단 액션 버튼 바                     */}
                        {/* ============================================= */}
                        <HStack justify="flex-end" gap={3} mt={8} pt={4} borderTop="1px solid" borderColor="blackAlpha.50">
                            <Button
                                type="button"
                                variant="outline"
                                rounded="full"
                                px={6}
                                h="44px"
                                fontSize="14px"
                                fontWeight="600"
                                borderColor="waba.border"
                                color="waba.charcoal"
                                _hover={{ bg: 'waba.subtle' }}
                                onClick={() => onOpenChange(false)}
                            >
                                취소
                            </Button>

                            <Button
                                type="button"
                                onClick={handleSubmit}
                                loading={isSubmitting}
                                bg="waba.charcoal"
                                color="white"
                                rounded="full"
                                px={7}
                                h="44px"
                                fontSize="14px"
                                fontWeight="700"
                                _hover={{ bg: '#2D3033' }}
                            >
                                수정 완료
                            </Button>
                        </HStack>

                    </Dialog.Content>
                </Dialog.Positioner>
            </Portal>
        </Dialog.Root>
    );
}
