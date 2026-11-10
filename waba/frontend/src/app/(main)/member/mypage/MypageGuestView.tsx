'use client'

import { Box, Button, Container, Heading, Text, VStack } from "@chakra-ui/react";
import { LuUser } from "react-icons/lu";

interface MypageGuestViewProps {
    onOpenLogin: () => void;
}

export default function MypageGuestView({ onOpenLogin }: MypageGuestViewProps) {
    return (
        <Container maxW="600px" pt={36} textAlign="center">
            <VStack
                gap={6}
                p={8}
                bg="white"
                borderRadius="24px"
                border="1px solid"
                borderColor="waba.border"
                shadow="sm"
            >
                <Box
                    w="64px"
                    h="64px"
                    borderRadius="full"
                    bg="waba.purpleLight"
                    color="waba.purple"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                >
                    <LuUser size={32} />
                </Box>
                <Heading fontSize="22px" fontWeight="700" color="waba.charcoal">
                    로그인이 필요한 서비스입니다
                </Heading>
                <Text fontSize="14px" color="waba.faint" maxW="380px">
                    와바미의 감각적인 펫 라이프스타일 룩북과 내 반려동물 기록, 적립 리워드를 확인하려면 로그인해 주세요.
                </Text>
                <Button
                    bg="waba.charcoal"
                    color="white"
                    rounded="full"
                    px={8}
                    py={6}
                    fontWeight="600"
                    _hover={{ bg: '#2D3033' }}
                    onClick={onOpenLogin}
                >
                    로그인 / 회원가입하기
                </Button>
            </VStack>
        </Container>
    );
}
