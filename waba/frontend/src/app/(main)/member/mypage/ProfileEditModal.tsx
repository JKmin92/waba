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
import { Camera, Check, Eye, EyeOff, Sparkles, Upload, X } from "lucide-react";
import { LuArrowLeft, LuChevronRight, LuSparkles, LuUser, LuUserRound } from "react-icons/lu";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import axiosInstance from "@/utils/api";
import { toaster } from "@/components/ui/toaster";
import { UserProfileData } from "./ProfileSection";
import UserAvatar from "../../common/UserAvatar";
import PasswordStrengthInput from "../../common/PasswordStrengthInput";
import { evaluatePasswordStrength } from "@/utils/passwordPolicy";
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

    // 화면 전환 및 비밀번호 변경 상태
    const [activeView, setActiveView] = useState<'profile' | 'password'>('profile');
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [newPasswordConfirm, setNewPasswordConfirm] = useState('');
    const [showCurrentPw, setShowCurrentPw] = useState(false);
    const [isChangingPassword, setIsChangingPassword] = useState(false);

    // 모달 오픈 시 기존 프로필 값으로 초기화
    useEffect(() => {
        setActiveView('profile');
        setCurrentPassword('');
        setNewPassword('');
        setNewPasswordConfirm('');
        setShowCurrentPw(false);
        setIsChangingPassword(false);
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

    const handleChangePassword = async () => {
        if (!currentPassword) {
            toaster.create({ title: '현재 비밀번호를 입력해주세요.', type: 'warning' });
            return;
        }
        const pwEval = evaluatePasswordStrength(newPassword, currentProfile?.email);
        if (!pwEval.isValid) {
            toaster.create({ title: pwEval.errorMessage || '새 비밀번호 정책을 확인해주세요.', type: 'error' });
            return;
        }
        if (newPassword !== newPasswordConfirm) {
            toaster.create({ title: '새 비밀번호가 일치하지 않습니다.', type: 'error' });
            return;
        }
        setIsChangingPassword(true);
        try {
            await axiosInstance.put('/user/password', {
                currentPassword,
                newPassword,
            });
            toaster.create({ title: '비밀번호가 성공적으로 변경되었습니다.', type: 'success' });
            setActiveView('profile');
            setCurrentPassword('');
            setNewPassword('');
            setNewPasswordConfirm('');
            setShowCurrentPw(false);
        } catch (err: any) {
            toaster.create({
                title: err?.response?.data?.message || '비밀번호 변경에 실패했습니다.',
                type: 'error',
            });
        } finally {
            setIsChangingPassword(false);
        }
    };

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
                        maxH="90vh"
                        display="flex"
                        flexDirection="column"
                        overflow="hidden"
                        p={0}
                        borderRadius="28px"
                        boxShadow="0 24px 48px -12px rgba(26, 28, 30, 0.2)"
                        bg="var(--waba-card)"
                    >
                        {/* 닫기 버튼 */}
                        <Dialog.CloseTrigger asChild position="absolute" top={5} right={5} zIndex={2}>
                            <CloseButton size="sm" borderRadius="full" bg="var(--waba-surface)" color="var(--waba-ink)" _hover={{ bg: 'var(--waba-line)' }} />
                        </Dialog.CloseTrigger>

                        {/* 모달 헤더 (상단 고정) */}
                        <Dialog.Header flexShrink={0} px={{ base: 6, md: 7 }} pt={{ base: 6, md: 7 }} pb={4}>
                            {activeView === 'password' ? (
                                <Box pr={8}>
                                    <Button
                                        type="button"
                                        size="xs"
                                        variant="ghost"
                                        color="var(--waba-ink-2)"
                                        px={0}
                                        mb={1}
                                        gap={1}
                                        onClick={() => {
                                            setActiveView('profile');
                                            setCurrentPassword('');
                                            setNewPassword('');
                                            setNewPasswordConfirm('');
                                            setShowCurrentPw(false);
                                        }}
                                    >
                                        <LuArrowLeft size={14} />
                                        프로필로 돌아가기
                                    </Button>
                                    <Dialog.Title fontSize="20px" fontWeight="800" color="var(--waba-ink)">
                                        비밀번호 변경
                                    </Dialog.Title>
                                    <Text fontSize="12px" color="var(--waba-ink-3)" mt={0.5}>
                                        현재 비밀번호를 확인한 뒤 새 비밀번호를 설정합니다.
                                    </Text>
                                </Box>
                            ) : (
                                <Box pr={8}>
                                    <Dialog.Title fontSize="20px" fontWeight="800" color="var(--waba-ink)">
                                        프로필 수정
                                    </Dialog.Title>
                                    <Text fontSize="12px" color="var(--waba-ink-3)" mt={0.5}>
                                        WABA 커뮤니티에서 다른 집사들에게 보여질 프로필을 설정합니다
                                    </Text>
                                </Box>
                            )}
                        </Dialog.Header>

                        {/* 모달 본문 (스크롤바 숨김) */}
                        <Dialog.Body
                            flex={1}
                            minH={0}
                            overflowY="auto"
                            overflowX="hidden"
                            px={{ base: 6, md: 7 }}
                            py={2}
                            css={{
                                scrollbarWidth: 'none',
                                msOverflowStyle: 'none',
                                '&::-webkit-scrollbar': { display: 'none' },
                            }}
                        >
                            <AnimatePresence mode="wait" initial={false}>
                                {activeView === 'profile' ? (
                                    <motion.div
                                        key="profile"
                                        initial={{ opacity: 0, x: -12 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: 12 }}
                                        transition={{ duration: 0.18 }}
                                    >
                                        <VStack gap={4.5} align="stretch">
                                            {/* 1. 프로필 아바타 편집 영역 */}
                                            <VStack gap={2.5} align="center" py={1}>
                                                <Box position="relative">
                                                    <UserAvatar
                                                        src={previewImageUrl}
                                                        alt="프로필 아바타"
                                                        w="88px"
                                                        h="88px"
                                                        iconSize={38}
                                                        color="#6338A9"
                                                        border="3px solid"
                                                        borderColor="var(--waba-purple-text)"
                                                        boxShadow="md"
                                                    />

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
                                            bg="#6338A9"
                                            color="white"
                                            border="2px solid" borderColor="var(--waba-card)"
                                            shadow="sm"
                                            transition="all 0.2s"
                                            _hover={{ transform: 'scale(1.1)', bg: 'var(--waba-ink)' }}
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
                                            borderColor="var(--waba-line)"
                                            color="var(--waba-ink)"
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
                                                color="var(--waba-ink-3)"
                                                _hover={{ color: 'red.500', bg: 'rgba(239, 68, 68, 0.12)' }}
                                                onClick={handleResetToDefaultImage}
                                            >
                                                기본 이미지로 변경
                                            </Button>
                                        )}
                                    </HStack>

                                    <Text fontSize="11px" color="var(--waba-ink-3)" textAlign="center">
                                        최소 가로 150px 이상 · 1:1 정사각형 중앙 자동 크롭
                                    </Text>
                                </VStack>


                                {/* ============================================= */}
                                {/* 비활성화된 이메일 주소                        */}
                                {/* ============================================= */}
                                <VStack align="start" gap={1.5}>
                                    <HStack justify="space-between" w="full">
                                        <Text fontSize="13px" fontWeight="700" color="var(--waba-ink)">
                                            이메일 주소
                                        </Text>
                                        <Text fontSize="11px" color="var(--waba-ink-3)">
                                            변경 불가
                                        </Text>
                                    </HStack>
                                    <Input
                                        value={currentProfile?.email || ''}
                                        disabled
                                        readOnly
                                        borderRadius="16px"
                                        h="42px"
                                        px={4}
                                        fontSize="13.5px"
                                        bg="var(--waba-surface)"
                                        border="1px solid"
                                        borderColor="var(--waba-line)"
                                        color="var(--waba-ink-3)"
                                        _disabled={{ opacity: 0.85, cursor: 'not-allowed' }}
                                    />
                                </VStack>

                                {/* ============================================= */}
                                {/* 2. 닉네임 입력 섹션 (중복 확인 포함)          */}
                                {/* ============================================= */}
                                <VStack align="start" gap={1.5}>
                                    <HStack justify="space-between" w="full">
                                        <Text fontSize="13px" fontWeight="700" color="var(--waba-ink)">
                                            활동 닉네임 <Text as="span" color="red.500">*</Text>
                                        </Text>
                                        <Text fontSize="11px" color="var(--waba-ink-3)">
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
                                                        'var(--waba-line)'
                                            }
                                            fontSize="14px"
                                            h="44px"
                                            px={4}
                                            _focus={{ borderColor: '#6338A9' }}
                                        />

                                        <Button
                                            type="button"
                                            onClick={handleCheckNickname}
                                            loading={isCheckingNickname}
                                            disabled={nicknameStatus === 'same' || !nickname.trim()}
                                            bg={nicknameStatus === 'available' ? 'green.600' : '#6338A9'}
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
                                        <Text fontSize="13px" fontWeight="700" color="var(--waba-ink)">
                                            한 줄 소개 (Bio)
                                        </Text>
                                        <Text fontSize="11px" color={bio.length > 150 ? 'red.500' : 'var(--waba-ink-3)'}>
                                            {bio.length} / 150자
                                        </Text>
                                    </HStack>

                                                <Textarea
                                                    value={bio}
                                                    onChange={(e) => setBio(e.target.value.slice(0, 150))}
                                                    placeholder="반려동물과의 소중한 일상이나 인테리어 취향을 간단히 적어보세요"
                                                    borderRadius="16px"
                                                    borderColor="var(--waba-line)"
                                                    fontSize="14px"
                                                    p={3.5}
                                                    minH="80px"
                                                    resize="none"
                                                    _focus={{ borderColor: '#6338A9' }}
                                                />
                                            </VStack>

                                            {/* 4. 비밀번호 변경 진입 카드 */}
                                            <Box
                                                p={4}
                                                borderRadius="18px"
                                                bg="var(--waba-surface)"
                                                border="1px solid"
                                                borderColor="var(--waba-line)"
                                            >
                                                {currentProfile?.has_local_password === false ? (
                                                    <Box>
                                                        <Text fontSize="13px" fontWeight="700" color="var(--waba-ink)">
                                                            비밀번호 변경
                                                        </Text>
                                                        <Text fontSize="12px" color="var(--waba-ink-3)" mt={1}>
                                                            소셜 간편 로그인 계정으로 별도의 비밀번호를 사용하지 않습니다.
                                                        </Text>
                                                    </Box>
                                                ) : (
                                                    <Flex
                                                        justify="space-between"
                                                        align="center"
                                                        cursor="pointer"
                                                        onClick={() => {
                                                            setCurrentPassword('');
                                                            setNewPassword('');
                                                            setNewPasswordConfirm('');
                                                            setShowCurrentPw(false);
                                                            setActiveView('password');
                                                        }}
                                                    >
                                                        <Box>
                                                            <Text fontSize="13px" fontWeight="700" color="var(--waba-ink)">
                                                                비밀번호 변경
                                                            </Text>
                                                            <Text fontSize="11.5px" color="var(--waba-ink-3)" mt={0.5}>
                                                                주기적인 비밀번호 변경으로 계정을 안전하게 보호하세요
                                                            </Text>
                                                        </Box>
                                                        <HStack gap={1} color="var(--waba-purple-text)" fontSize="12.5px" fontWeight="700" flexShrink={0}>
                                                            <Text>변경하기</Text>
                                                            <LuChevronRight size={15} />
                                                        </HStack>
                                                    </Flex>
                                                )}
                                            </Box>
                                        </VStack>
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        key="password"
                                        initial={{ opacity: 0, x: 12 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -12 }}
                                        transition={{ duration: 0.18 }}
                                    >
                                        <VStack align="stretch" gap={4} py={1}>
                                            <Box>
                                                <Text fontSize="12px" fontWeight="700" color="var(--waba-ink-2)" mb={1.5}>
                                                    현재 비밀번호
                                                </Text>
                                                <Box position="relative">
                                                    <Input
                                                        type={showCurrentPw ? 'text' : 'password'}
                                                        value={currentPassword}
                                                        onChange={(e) => setCurrentPassword(e.target.value)}
                                                        placeholder="현재 비밀번호 입력"
                                                        h="44px"
                                                        borderRadius="16px"
                                                        bg="var(--waba-surface)"
                                                        borderColor="var(--waba-line)"
                                                        color="var(--waba-ink)"
                                                        pr={11}
                                                        fontSize="14px"
                                                        autoComplete="current-password"
                                                    />
                                                    <IconButton
                                                        type="button"
                                                        aria-label={showCurrentPw ? '비밀번호 숨기기' : '비밀번호 보기'}
                                                        variant="ghost"
                                                        size="sm"
                                                        position="absolute"
                                                        right={2}
                                                        top="50%"
                                                        transform="translateY(-50%)"
                                                        color="var(--waba-ink-3)"
                                                        onClick={() => setShowCurrentPw((v) => !v)}
                                                    >
                                                        {showCurrentPw ? <EyeOff size={16} /> : <Eye size={16} />}
                                                    </IconButton>
                                                </Box>
                                            </Box>

                                            <Box>
                                                <Text fontSize="12px" fontWeight="700" color="var(--waba-ink-2)" mb={1.5}>
                                                    새 비밀번호
                                                </Text>
                                                <PasswordStrengthInput
                                                    value={newPassword}
                                                    onChange={setNewPassword}
                                                    email={currentProfile?.email || ''}
                                                    inputVariant="profile"
                                                    autoComplete="new-password"
                                                />
                                            </Box>

                                            <Box>
                                                <Text fontSize="12px" fontWeight="700" color="var(--waba-ink-2)" mb={1.5}>
                                                    새 비밀번호 확인
                                                </Text>
                                                <Input
                                                    type="password"
                                                    value={newPasswordConfirm}
                                                    onChange={(e) => setNewPasswordConfirm(e.target.value)}
                                                    placeholder="새 비밀번호를 한 번 더 입력해주세요"
                                                    h="44px"
                                                    borderRadius="16px"
                                                    bg="var(--waba-surface)"
                                                    borderColor="var(--waba-line)"
                                                    color="var(--waba-ink)"
                                                    fontSize="14px"
                                                    autoComplete="new-password"
                                                />
                                                {newPasswordConfirm.length > 0 && (
                                                    <Text
                                                        fontSize="11.5px"
                                                        fontWeight="600"
                                                        color={newPassword === newPasswordConfirm ? '#10B981' : '#EF4444'}
                                                        mt={1}
                                                        pl={1}
                                                    >
                                                        {newPassword === newPasswordConfirm
                                                            ? '✓ 새 비밀번호가 일치합니다.'
                                                            : '새 비밀번호가 일치하지 않습니다.'}
                                                    </Text>
                                                )}
                                            </Box>
                                        </VStack>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </Dialog.Body>

                        {/* 5. 모달 하단 액션 버튼 바 (하단 고정) */}
                        <HStack
                            flexShrink={0}
                            justify="flex-end"
                            gap={3}
                            px={{ base: 6, md: 7 }}
                            pb={{ base: 5, md: 6 }}
                            pt={4}
                            borderTop="1px solid"
                            borderColor="var(--waba-line)"
                        >
                            {activeView === 'password' ? (
                                <>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        rounded="full"
                                        px={6}
                                        h="44px"
                                        fontSize="14px"
                                        fontWeight="600"
                                        borderColor="var(--waba-line)"
                                        color="var(--waba-ink)"
                                        _hover={{ bg: 'var(--waba-surface)' }}
                                        onClick={() => {
                                            setActiveView('profile');
                                            setCurrentPassword('');
                                            setNewPassword('');
                                            setNewPasswordConfirm('');
                                            setShowCurrentPw(false);
                                        }}
                                    >
                                        이전으로
                                    </Button>
                                    <Button
                                        type="button"
                                        rounded="full"
                                        px={6}
                                        h="44px"
                                        bg="#6338A9"
                                        color="#FFFFFF"
                                        _hover={{ bg: '#522B8F' }}
                                        fontSize="14px"
                                        fontWeight="700"
                                        loading={isChangingPassword}
                                        onClick={handleChangePassword}
                                    >
                                        비밀번호 변경 적용
                                    </Button>
                                </>
                            ) : (
                                <>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        rounded="full"
                                        px={6}
                                        h="44px"
                                        fontSize="14px"
                                        fontWeight="600"
                                        borderColor="var(--waba-line)"
                                        color="var(--waba-ink)"
                                        _hover={{ bg: 'var(--waba-surface)' }}
                                        onClick={() => onOpenChange(false)}
                                    >
                                        취소
                                    </Button>

                            <Button
                                type="button"
                                onClick={handleSubmit}
                                loading={isSubmitting}
                                bg="#6338A9"
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
                                </>
                            )}
                        </HStack>

                    </Dialog.Content>
                </Dialog.Positioner>
            </Portal>
        </Dialog.Root>
    );
}
