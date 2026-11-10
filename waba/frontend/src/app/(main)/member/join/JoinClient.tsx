'use client'

import { toaster } from "@/components/ui/toaster"
import axiosInstance from "@/utils/api"
import { Box, Button, Dialog, Field, Flex, Heading, HStack, IconButton, Image, Input, Span, Text, VStack } from "@chakra-ui/react"
import { ArrowRight, Eye, EyeOff } from "lucide-react"
import { useState } from "react"

export default function JoinClient({ setModalType, setOpen }: { setModalType: (modalType: 'login' | 'join') => void, setOpen: (open: boolean) => void }) {
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [passwordConfirm, setPasswordConfirm] = useState("")
    const [nickname, setNickname] = useState("")
    const [showPw, setShowPw] = useState(false);
    const [checkedNickname, setCheckedNickname] = useState(false);

    // 약관 동의 상태
    const [agreeAge, setAgreeAge] = useState(false)
    const [agreeTerms, setAgreeTerms] = useState(false)
    const [agreeMarketing, setAgreeMarketing] = useState(false)

    const isAllChecked = agreeAge && agreeTerms && agreeMarketing
    const handleAgreeAll = (checked: boolean) => {
        setAgreeAge(checked)
        setAgreeTerms(checked)
        setAgreeMarketing(checked)
    }

    const handleJoinSubmit = async () => {
        try {
            if (!agreeAge || !agreeTerms) {
                toaster.create({ title: '필수 이용약관에 동의해주세요.', type: 'error' });
                return;
            }
            if (password !== passwordConfirm) {
                toaster.create({ title: '비밀번호가 일치하지 않습니다.', type: 'error' });
                return;
            }

            if (!checkedNickname) {
                toaster.create({ title: '닉네임 중복확인을 해주세요.', type: 'error' });
                return;
            }

            const userData = { email, password, nickname, agreeMarketing };
            const res = await axiosInstance.post("/user/join", userData);
            if (res.data.email) {
                toaster.create({ title: '가입완료!', description: '저희 와바에 가입해주셔서 감사합니다.', type: 'success' });
                setOpen(false);
            }

        } catch (e: any) {
            if (e.response?.status === 409) {
                const errorMessage = e.response.data?.message || '이미 가입된 정보가 존재합니다.';
                toaster.create({ title: errorMessage, type: 'error' });
                return;
            }
            toaster.create({ title: '오류가 발생했습니다.', type: 'error' });
        }

    }

    const checkNickname = async () => {
        try {
            const res = await axiosInstance.get(`/user/checkNickname?nickname=${nickname}`);
            const result = res.data.isAvailable;

            if (!result) {
                toaster.create({ title: '이미 사용 중인 닉네임입니다.', type: 'error' });
            } else {
                setCheckedNickname(true);
                toaster.create({ title: '사용 가능한 닉네임입니다.', type: 'success' });
            }
        } catch {
            toaster.create({ title: '오류가 발생했습니다.', type: 'error' });
        }
    }

    const inputStyle = {
        h: "48px",
        borderRadius: "16px",
        bg: "waba.subtle",
        border: "1px solid",
        borderColor: "transparent",
        px: 5,
        fontSize: "14px",
        _focus: { borderColor: "waba.purple", bg: "white", outline: "none" },
    }

    return (
        <Flex flex="1" direction="column" justify="center" px={{ base: 6, md: 12 }} py={{ base: 10, md: 8 }}>
            <Box maxW="520px" mx="auto" w="full">

                {/* 1. Header Block */}
                <Box mb={6}>
                    <HStack
                        display="inline-flex"
                        alignItems="center"
                        gap={2}
                        px={3}
                        py={1}
                        borderRadius="full"
                        bg="waba.purpleLight"
                        color="waba.purple"
                        fontSize="11px"
                        fontWeight="700"
                        letterSpacing="0.05em"
                        mb={3}
                    >
                        <Box w="6px" h="6px" borderRadius="full" bg="waba.purple" />
                        <Text>WELCOME TO WABA</Text>
                    </HStack>

                    <Dialog.Title asChild>
                        <Heading fontSize={{ base: "26px", md: "28px" }} fontWeight="900" mb={1.5} color="waba.charcoal">
                            함께해서 반가워요, 집사님!
                        </Heading>
                    </Dialog.Title>
                    <Dialog.Description fontSize="13px" color="waba.muted">
                        간편 계정 연동으로 3초 만에 시작하거나 이메일로 가입하세요.
                    </Dialog.Description>
                </Box>

                {/* 2. Social Quick Sign-in Section (스티치 구조: 카카오 전체 폭 + 네이버/애플 2열) */}
                <VStack gap={2.5} align="stretch" mb={6}>
                    <HStack>
                        <Button
                            flex="1"
                            h="48px"
                            borderRadius="full"
                            bg="#FEE500"
                            color="#191919"
                            fontSize="14px"
                            fontWeight="700"
                            boxShadow="xs"
                        >
                            <Image src="/image/member/login/kakao.svg" w="4" h="4" />
                            카카오로 시작하기
                        </Button>
                        <Button
                            flex="1"
                            h="48px"
                            rounded="full"
                            bg="#03C75A"
                            color="white"
                            fontSize="13px"
                            fontWeight="700"
                            boxShadow="xs"
                        >
                            <Image src="/image/member/login/naver.svg" w="3.5" h="3.5" />
                            네이버로 시작하기
                        </Button>
                    </HStack>
                    {/* Naver & Apple Grid */}
                    <HStack gap={2.5}>
                        <Button
                            flex="1"
                            h="48px"
                            rounded="full"
                            bg="white"
                            color="waba.charcoal"
                            border="1px solid"
                            borderColor="blackAlpha.200"
                            fontSize="13px"
                            fontWeight="700"
                            boxShadow="xs"
                        >
                            <Image src="/image/member/login/google.svg" w="3.5" h="3.5" />
                            google로 시작하기
                        </Button>
                        <Button
                            flex="1"
                            h="48px"
                            rounded="full"
                            bg="white"
                            color="waba.charcoal"
                            border="1px solid"
                            borderColor="blackAlpha.200"
                            fontSize="13px"
                            fontWeight="700"
                            boxShadow="xs"
                        >
                            <Image src="/image/member/login/apple.svg" w="3.5" h="3.5" />
                            Apple로 시작하기
                        </Button>
                    </HStack>
                </VStack>

                {/* 3. Divider */}
                <Flex align="center" justify="center" position="relative" my={6}>
                    <Box w="full" h="1px" bg="blackAlpha.100" />
                    <Text
                        position="absolute"
                        bg="white"
                        px={3}
                        fontSize="12px"
                        color="waba.muted"
                        fontWeight="600"
                    >
                        또는 이메일로 직접 가입
                    </Text>
                </Flex>

                {/* 4. Structured Form (이메일, 비밀번호, 비밀번호 확인, 닉네임) */}
                <VStack
                    gap={3.5}
                    align="stretch"
                    as="form"
                    onSubmit={(e: React.FormEvent) => {
                        e.preventDefault()
                        handleJoinSubmit()
                    }}
                >
                    {/* 이메일 계정 */}
                    <Field.Root>
                        <Field.Label fontSize="12px" fontWeight="700" color="waba.charcoal">이메일 계정</Field.Label>
                        <Input
                            type="email"
                            placeholder="name@wabami.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            {...inputStyle}
                        />
                    </Field.Root>

                    {/* 비밀번호 */}
                    <Field.Root>
                        <Field.Label fontSize="12px" fontWeight="700" color="waba.charcoal">비밀번호</Field.Label>
                        <Box position="relative" w="full">
                            <Input
                                type={showPw ? "text" : "password"}
                                placeholder="영문, 숫자, 특수문자 조합 8자 이상"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                pr={12}
                                required
                                {...inputStyle}
                            />
                            <IconButton
                                aria-label="비밀번호 보기"
                                variant="ghost"
                                size="sm"
                                position="absolute"
                                right={3}
                                top="50%"
                                transform="translateY(-50%)"
                                color="waba.muted"
                                _hover={{ color: "waba.charcoal" }}
                                onClick={() => setShowPw((v) => !v)}
                            >
                                {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                            </IconButton>
                        </Box>
                    </Field.Root>

                    {/* 비밀번호 확인 */}
                    <Field.Root>
                        <Field.Label fontSize="12px" fontWeight="700" color="waba.charcoal">비밀번호 확인</Field.Label>
                        <Input
                            type="password"
                            placeholder="비밀번호를 한 번 더 입력해주세요"
                            value={passwordConfirm}
                            onChange={(e) => setPasswordConfirm(e.target.value)}
                            required
                            {...inputStyle}
                        />
                    </Field.Root>

                    {/* 닉네임 & 중복확인 버튼 */}
                    <Field.Root>
                        <Field.Label fontSize="12px" fontWeight="700" color="waba.charcoal">닉네임</Field.Label>
                        <HStack gap={2} w="full">
                            <Input
                                type="text"
                                placeholder="활동할 닉네임 입력 (예: 몽실이네)"
                                value={nickname}
                                onChange={(e) => setNickname(e.target.value)}
                                disabled={checkedNickname ? true : false}
                                required
                                {...inputStyle}
                            />
                            {!checkedNickname && (
                                <Button
                                    type="button"
                                    h="48px"
                                    px={5}
                                    borderRadius="16px"
                                    bg="waba.subtle"
                                    border="1px solid"
                                    borderColor="blackAlpha.100"
                                    color="waba.charcoal"
                                    fontSize="13px"
                                    fontWeight="700"
                                    _hover={{ bg: "stone.200" }}
                                    flexShrink={0}
                                    onClick={checkNickname}
                                >
                                    중복확인
                                </Button>
                            )}

                        </HStack>
                    </Field.Root>

                    {/* 5. Terms Agreement Bento Module (약관 동의 벤토 박스) */}
                    <Box
                        p={4}
                        borderRadius="20px"
                        bg="waba.subtle"
                        border="1px solid"
                        borderColor="blackAlpha.100"
                        mt={1}
                    >
                        {/* 전체 동의 마스터 체크 */}
                        <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", paddingBottom: 10, borderBottom: "1px solid rgba(0,0,0,0.08)", fontWeight: 700, fontSize: "14px", color: "#1A1C1E" }}>
                            <input
                                type="checkbox"
                                checked={isAllChecked}
                                onChange={(e) => handleAgreeAll(e.target.checked)}
                                style={{ width: 18, height: 18, accentColor: "#6338A9", cursor: "pointer" }}
                            />
                            전체 약관에 동의합니다
                        </label>

                        {/* 개별 세부 체크 항목들 */}
                        <VStack gap={2.5} pt={3} align="stretch" fontSize="12.5px" color="waba.charcoal">
                            <Flex justify="space-between" align="center">
                                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                                    <input
                                        type="checkbox"
                                        checked={agreeAge}
                                        onChange={(e) => setAgreeAge(e.target.checked)}
                                        required
                                        style={{ width: 15, height: 15, accentColor: "#6338A9", cursor: "pointer" }}
                                    />
                                    <span><Span color="waba.purple" fontWeight="700">[필수]</Span> 만 14세 이상입니다</span>
                                </label>
                            </Flex>

                            <Flex justify="space-between" align="center">
                                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                                    <input
                                        type="checkbox"
                                        checked={agreeTerms}
                                        onChange={(e) => setAgreeTerms(e.target.checked)}
                                        required
                                        style={{ width: 15, height: 15, accentColor: "#6338A9", cursor: "pointer" }}
                                    />
                                    <span><Span color="waba.purple" fontWeight="700">[필수]</Span> 서비스 이용약관 및 개인정보 처리방침 동의</span>
                                </label>
                                <Text as="span" textDecoration="underline" fontSize="11px" color="waba.muted" cursor="pointer" _hover={{ color: "waba.charcoal" }}>보기</Text>
                            </Flex>

                            <Flex justify="space-between" align="center">
                                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                                    <input
                                        type="checkbox"
                                        checked={agreeMarketing}
                                        onChange={(e) => setAgreeMarketing(e.target.checked)}
                                        style={{ width: 15, height: 15, accentColor: "#6338A9", cursor: "pointer" }}
                                    />
                                    <Span color="waba.muted"><Span color="waba.muted" fontWeight="500">[선택]</Span> 웰컴 3,000P 혜택 및 마케팅 정보 수신</Span>
                                </label>
                                <Box bg="waba.purpleLight" color="waba.purple" fontSize="11px" fontWeight="800" px={2.5} py={0.5} borderRadius="full">
                                    +3,000P
                                </Box>
                            </Flex>
                        </VStack>
                    </Box>

                    {/* 6. Primary Signup CTA Button */}
                    <Button
                        type="submit"
                        w="full"
                        h="52px"
                        borderRadius="full"
                        bg="#141416"
                        color="white"
                        fontSize="15px"
                        fontWeight="700"
                        _hover={{ bg: "black" }}
                        mt={2}
                        gap={2}
                        boxShadow="md"
                    >
                        <span>동의하고 회원가입 완료</span>
                        <ArrowRight size={17} />
                    </Button>
                </VStack>

                {/* 7. Login Direction Footer Link */}
                <Box textAlign="center" pt={4}>
                    <Text fontSize="12.5px" color="waba.muted">
                        이미 WABA 계정이 있으신가요?{" "}
                        <Span
                            color="waba.purple"
                            fontWeight="700"
                            textDecoration="underline"
                            cursor="pointer"
                            ml={1}
                            onClick={() => setModalType('login')}
                        >
                            로그인하기 →
                        </Span>
                    </Text>
                </Box>

            </Box>
        </Flex>
    )
}
