'use client'

import { Box, Button, CloseButton, Container, Dialog, Field, Flex, Heading, HStack, IconButton, Image, Input, Link, Portal, Text, VStack } from "@chakra-ui/react"
import { Eye, EyeOff, Gift, MapPin, MessageCircle } from "lucide-react"
import { useState } from "react"
import Header from "../../common/Header"

// 좌측 룩북 이미지 (교체 필요)


export default function LoginClient({ isEmailMode, setIsEmailMode }: { isEmailMode: boolean, setIsEmailMode: (open: boolean) => void }) {

    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [showPw, setShowPw] = useState(false)
    const [keepLogin, setKeepLogin] = useState(false)

    const handleEmailLogin = () => {
        // TODO: 이메일 로그인 API 연동
        console.log({ email, password, keepLogin })
    }

    const inputStyle = {
        h: "52px",
        borderRadius: "16px",
        bg: "waba.subtle",
        border: "1px solid",
        borderColor: "blackAlpha.100",
        px: 5,
        fontSize: "14px",
        _focus: { borderColor: "waba.purple", bg: "white", outline: "none" },
    }

    return (
        <Flex flex="1" direction="column" justify="center" px={{ base: 6, md: 14 }} py={{ base: 12, md: 10 }}>
            <Box
                alignSelf="flex-start"
                bg="waba.purpleLight"
                color="waba.purple"
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
                <Heading fontSize="32px" fontWeight="900" letterSpacing="-0.03em" mb={2}>
                    반가워요, 집사님!
                </Heading>
            </Dialog.Title>
            <Dialog.Description fontSize="14px" color="waba.muted" mb={8}>
                이메일 또는 소셜 계정으로 간편하게 로그인하세요.
            </Dialog.Description>

            {isEmailMode ? (
                <VStack gap={4} align="stretch" as="form"
                    onSubmit={(e: React.FormEvent) => { e.preventDefault(); handleEmailLogin() }}>
                    <Field.Root>
                        <Field.Label fontSize="12px" fontWeight="700">이메일</Field.Label>
                        <Input
                            type="email"
                            placeholder="name@wabami.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
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

                    <Flex justify="space-between" align="center" fontSize="12px" color="waba.muted">
                        <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                            <input
                                type="checkbox"
                                checked={keepLogin}
                                onChange={(e) => setKeepLogin(e.target.checked)}
                            />
                            로그인 상태 유지
                        </label>
                        <HStack gap={2}>
                            <Link href="#" color="waba.muted">아이디 찾기</Link>
                            <Text>·</Text>
                            <Link href="#" color="waba.muted">비밀번호 찾기</Link>
                        </HStack>
                    </Flex>

                    <Button
                        type="submit"
                        h="56px"
                        borderRadius="full"
                        bg="waba.charcoal"
                        color="white"
                        fontWeight="800"
                        _hover={{ bg: "black" }}
                    >
                        이메일로 로그인
                    </Button>

                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        color="waba.muted"
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
                        bg="waba.charcoal"
                        color="white"
                        fontWeight="800"
                        _hover={{ bg: "black" }}
                        onClick={() => setIsEmailMode(true)}
                    >
                        이메일로 로그인
                    </Button>

                    <Flex align="center" gap={4} my={6} color="waba.muted" fontSize="12px">
                        <Box flex="1" h="1px" bg="blackAlpha.100" />
                        <Text>또는 3초 만에 간편 시작</Text>
                        <Box flex="1" h="1px" bg="blackAlpha.100" />
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
                        <Button h="52px" borderRadius="full" bg="white" color="black" fontWeight="700" border="1px solid" borderColor="blackAlpha.200">
                            <Image src="/image/member/login/google.svg" w="4" />
                            Google로 시작하기
                        </Button>
                        <Button h="52px" borderRadius="full" bg="white" color="black" border="1px solid" borderColor="blackAlpha.200" fontWeight="700">
                            <Image src="/image/member/login/apple.svg" w="4" />
                            Apple로 계속하기
                        </Button>
                    </VStack>
                </>
            )}

            <HStack
                mt={6}
                gap={3}
                bg="waba.purpleLight"
                border="1px solid"
                borderColor="purple.100"
                borderRadius="20px"
                px={5}
                py={4}
                fontSize="13px"
                color="waba.purple"
                fontWeight="600"
            >
                <Gift size={22} />
                <Text>
                    신규 가입하고 첫 반려동물 등록 시
                    <br />
                    <Text as="span" color="black" fontWeight="800">3,000P 리워드</Text>가 즉시 지급됩니다!
                </Text>
            </HStack>

            <Text textAlign="center" fontSize="12px" color="waba.muted" mt={6}>
                아직 WABA 회원이 아니신가요?{" "}
                <Link href="/member/join" color="waba.purple" fontWeight="800">
                    회원가입하기 →
                </Link>
            </Text>
        </Flex>
    )
}
