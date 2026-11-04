'use client'

import { Box, Button, CloseButton, Dialog, Flex, HStack, Portal, Text } from "@chakra-ui/react";
import { MapPin } from "lucide-react";
import { useState } from "react";
import LoginClient from "./login/LoginClient";

const LOOKBOOK_IMAGE = ""

export default function MemberModal() {
    const [open, setOpen] = useState(false);
    const [isEmailMode, setIsEmailMode] = useState(false)

    return (
        <Dialog.Root
            open={open}
            onOpenChange={(e) => {
                setOpen(e.open)
                if (!e.open) setIsEmailMode(false)
            }}
            placement="center"
            scrollBehavior="inside"
        >
            <Dialog.Trigger asChild>
                <Button bg="waba.charcoal" color="white" rounded="full" px={5} h="40px" fontSize="13px" _hover={{ bg: 'waba.purple' }}>로그인</Button>
            </Dialog.Trigger>
            <Portal>
                <Dialog.Backdrop backdropFilter="blur(8px)" bg="blackAlpha.500" />
                <Dialog.Positioner p={{ base: 0, md: 6 }}>
                    <Dialog.Content
                        maxW="1100px"
                        w="full"
                        my="auto"
                        borderRadius={{ base: 0, md: "36px" }}
                        overflow="hidden"
                        p={0}
                    >
                        <Dialog.CloseTrigger asChild position="absolute" top={4} right={4} zIndex={2}>
                            <CloseButton size="sm" borderRadius="full" bg="white" />
                        </Dialog.CloseTrigger>

                        <Dialog.Body p={0}>
                            <Flex minH={{ md: "680px" }}>
                                {/* ───── 좌측: 에디토리얼 이미지 ───── */}
                                <Box
                                    display={{ base: "none", md: "block" }}
                                    position="relative"
                                    flex="0 0 46%"
                                    m={4}
                                    borderRadius="28px"
                                    overflow="hidden"
                                    bgGradient="to-b"
                                    gradientFrom="#D9C7B0"
                                    gradientTo="#5B4636"
                                    bgImage={LOOKBOOK_IMAGE ? `url(${LOOKBOOK_IMAGE})` : undefined}
                                    bgSize="cover"
                                    bgPos="center"
                                >
                                    <HStack
                                        position="absolute"
                                        top={5}
                                        left={5}
                                        bg="whiteAlpha.900"
                                        borderRadius="full"
                                        px={4}
                                        py={2}
                                        gap={2}
                                    >
                                        <Box w="8px" h="8px" borderRadius="full" bg="waba.purple" />
                                        <Text fontSize="11px" fontWeight="800" letterSpacing="0.15em">
                                            WABA CURATED LIFE
                                        </Text>
                                    </HStack>

                                    <Box
                                        position="absolute"
                                        left={5}
                                        right={5}
                                        bottom={5}
                                        bg="whiteAlpha.800"
                                        backdropFilter="blur(16px)"
                                        borderRadius="24px"
                                        p={6}
                                    >
                                        <HStack gap={3} mb={3}>
                                            <Box
                                                bg="waba.purpleLight"
                                                color="waba.purple"
                                                fontSize="10px"
                                                fontWeight="800"
                                                letterSpacing="0.08em"
                                                px={3}
                                                py={1}
                                                borderRadius="full"
                                            >
                                                EDITORIAL LOOKBOOK
                                            </Box>
                                            <Text fontSize="11px" color="waba.muted">
                                                실시간 1,428개의 따뜻한 기록
                                            </Text>
                                        </HStack>
                                        <Text fontSize="20px" fontWeight="800" mb={2}>
                                            &quot;모든 반려생활의 취향과 따뜻한 기록&quot;
                                        </Text>
                                        <Text fontSize="12px" color="waba.muted" lineHeight="1.7" mb={4}>
                                            다종 합사 노하우부터 수의사 검증 케어, 감도 높은 펫-리빙 룩북까지
                                            와바미에서 한눈에 만나보세요.
                                        </Text>
                                        <Flex
                                            justify="space-between"
                                            align="center"
                                            borderTop="1px solid"
                                            borderColor="blackAlpha.100"
                                            pt={3}
                                            fontSize="11px"
                                            color="waba.muted"
                                        >
                                            <HStack gap={2}>
                                                <MapPin size={12} color="#6338A9" />
                                                <Text>태그된 공간 1,420+</Text>
                                                <Text>·</Text>
                                                <Text>
                                                    리워드{" "}
                                                    <Text as="span" color="waba.purple" fontWeight="700">
                                                        5% 적립
                                                    </Text>
                                                </Text>
                                            </HStack>
                                            <Text letterSpacing="0.1em">ISSUE #04</Text>
                                        </Flex>
                                    </Box>
                                </Box>
                                <LoginClient isEmailMode={isEmailMode} setIsEmailMode={setIsEmailMode} />
                            </Flex>
                        </Dialog.Body>
                    </Dialog.Content>
                </Dialog.Positioner>
            </Portal>
        </Dialog.Root>
    )
}