'use client'

import { Box, Button, Dialog, Field, Flex, Heading, HStack, IconButton, Image, Input, Link, Span, Text, VStack } from "@chakra-ui/react"
import { Eye, EyeOff } from "lucide-react"
import { useState } from "react"
import axiosInstance from "@/utils/api"
import { setAuthSession } from "@/utils/authUtils"
import { toaster } from "@/components/ui/toaster"

export default function LoginClient({
    isEmailMode,
    setIsEmailMode,
    setModalType,
    setOpen
}: {
    isEmailMode: boolean,
    setIsEmailMode: (open: boolean) => void,
    setModalType: (modalType: 'login' | 'join') => void,
    setOpen: (open: boolean) => void
}) {
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [showPw, setShowPw] = useState(false)
    const [keepLogin, setKeepLogin] = useState(false)
    const [isLoading, setIsLoading] = useState(false)

    const handleEmailLogin = async () => {
        if (!email.trim() || !password) {
            toaster.create({ title: '이메일과 비밀번호를 입력해주세요.', type: 'error' });
            return;
        }

        try {
            setIsLoading(true);
            const res = await axiosInstance.post("/user/login", {
                email: email.trim(),
                password,
                keepLogin
            });

            if (res.data?.accessToken) {
                // ⭐️ 토큰 및 유저 정보 쿠키에 저장
                setAuthSession(res.data.accessToken, res.data.refreshToken, res.data.user);
                toaster.create({
                    title: `반가워요, ${res.data.user.nickname}님!`,
                    description: '와바에 오신 것을 환영합니다.',
                    type: 'success'
                });
                setOpen(false);
            }
        } catch (e: any) {
            const message = e.response?.data?.message || '로그인에 실패했습니다. 이메일과 비밀번호를 확인해주세요.';
            toaster.create({ title: message, type: 'error' });
        } finally {
            setIsLoading(false);
        }
    }

    const inputStyle = {
        h: "52px",
        borderRadius: "16px",
        bg: "var(--waba-surface)",
        color: "var(--waba-ink)",
        _placeholder: { color: "var(--waba-ink-3)" },
        border: "1px solid",
        borderColor: "var(--waba-line)",
        px: 5,
        fontSize: "14px",
        _focus: { borderColor: "#6338A9", bg: "var(--waba-card)", outline: "none" },
    }

    return (
        <Flex flex="1" direction="column" justify="center" px={{ base: 6, md: 9 }} py={{ base: 10, md: 9 }}>
            <Box
                alignSelf="flex-start"
                bg="var(--waba-purple-soft)"
                color="var(--waba-purple-text)"
                fontSize="11px"
                fontWeight="800"
                letterSpacing="0.08em"
                px={3}
                py={1}
                borderRadius="full"
                mb={4}
            >
                ● WELCOME BACK
            </Box>

            <Dialog.Title asChild>
                <Heading fontSize="30px" fontWeight="900" letterSpacing="-0.03em" mb={2} color="var(--waba-ink)">
                    반가워요, 집사님!
                </Heading>
            </Dialog.Title>
            <Dialog.Description fontSize="14px" color="var(--waba-ink-3)" mb={7}>
                이메일 또는 소셜 계정으로 간편하게 로그인하세요.
            </Dialog.Description>

            {isEmailMode ? (
                <VStack
                    gap={4}
                    align="stretch"
                    as="form"
                    onSubmit={(e: React.FormEvent) => {
                        e.preventDefault();
                        handleEmailLogin();
                    }}
                >
                    <Field.Root>
                        <Field.Label fontSize="12px" fontWeight="700">이메일</Field.Label>
                        <Input
                            type="email"
                            placeholder="name@wabami.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            {...inputStyle}
                        />
                    </Field.Root>

                    <Field.Root>
                        <Field.Label fontSize="12px" fontWeight="700">비밀번호</Field.Label>
                        <Box position="relative" w="full">
                            <Input
                                type={showPw ? "text" : "password"}
                                placeholder="비밀번호를 입력해주세요"
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
                                onClick={() => setShowPw((v) => !v)}
                            >
                                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                            </IconButton>
                        </Box>
                    </Field.Root>

                    <Flex justify="space-between" align="center" fontSize="12px" color="var(--waba-ink-3)">
                        <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                            <input
                                type="checkbox"
                                checked={keepLogin}
                                onChange={(e) => setKeepLogin(e.target.checked)}
                            />
                            로그인 상태 유지
                        </label>
                        <HStack gap={2}>
                            <Link href="#" color="var(--waba-ink-3)">아이디 찾기</Link>
                            <Text>·</Text>
                            <Link href="#" color="var(--waba-ink-3)">비밀번호 찾기</Link>
                        </HStack>
                    </Flex>

                    <Button
                        type="submit"
                        h="56px"
                        borderRadius="full"
                        bg="var(--waba-ink)"
                        color="var(--waba-bg)"
                        fontWeight="800"
                        _hover={{ bg: "#6338A9", color: "#FFFFFF" }}
                        loading={isLoading}
                    >
                        이메일로 로그인
                    </Button>

                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        color="var(--waba-ink-3)"
                        fontWeight="600"
                        onClick={() => setIsEmailMode(false)}
                    >
                        ← 간편 로그인으로 돌아가기
                    </Button>
                </VStack>
            ) : (
                <>
                    <Button
                        type="button"
                        h="56px"
                        borderRadius="full"
                        bg="var(--waba-ink)"
                        color="var(--waba-bg)"
                        fontWeight="800"
                        _hover={{ bg: "#6338A9", color: "#FFFFFF" }}
                        onClick={() => setIsEmailMode(true)}
                    >
                        이메일로 로그인
                    </Button>

                    <Flex align="center" gap={4} my={6} color="var(--waba-ink-3)" fontSize="12px">
                        <Box flex="1" h="1px" bg="var(--waba-line)" />
                        <Text>또는 3초 만에 간편 시작</Text>
                        <Box flex="1" h="1px" bg="var(--waba-line)" />
                    </Flex>

                    <VStack gap={3} align="stretch">
                        <Button h="52px" borderRadius="full" bg="#FEE500" color="#191919" fontWeight="700">
                            <Image src="/image/member/login/kakao.svg" w="4" />
                            카카오로 시작하기
                        </Button>
                        <Button h="52px" borderRadius="full" bg="#03C75A" color="white" fontWeight="700">
                            <Image src="/image/member/login/naver.svg" w="4" />
                            네이버로 시작하기
                        </Button>
                        <Button h="52px" borderRadius="full" bg="#FFFFFF" color="#141416" fontWeight="700" border="1px solid" borderColor="var(--waba-line)" _hover={{ bg: "#F7F7FA" }}>
                            <Image src="/image/member/login/google.svg" w="4" />
                            Google로 시작하기
                        </Button>
                        <Button h="52px" borderRadius="full" bg="#FFFFFF" color="#141416" border="1px solid" borderColor="var(--waba-line)" _hover={{ bg: "#F7F7FA" }} fontWeight="700">
                            <Image src="/image/member/login/apple.svg" w="4" />
                            Apple로 계속하기
                        </Button>
                    </VStack>
                </>
            )}

            <Text textAlign="center" fontSize="12px" color="var(--waba-ink-3)" mt={6}>
                아직 WABA 회원이 아니신가요?{" "}
                <Span color="var(--waba-purple-text)" fontWeight="800" onClick={() => setModalType('join')} cursor="pointer">
                    회원가입하기 →
                </Span>
            </Text>
        </Flex>
    )
}
