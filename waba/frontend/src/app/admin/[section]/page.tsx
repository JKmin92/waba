'use client'

import React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Box, Button, Flex, Heading, Text, VStack } from '@chakra-ui/react';
import { LuArrowLeft, LuConstruction } from 'react-icons/lu';

const SECTION_META: Record<string, { title: string; description: string }> = {
    users: { title: '회원 · 반려동물 관리', description: '가입 회원 계정 상태 및 등록된 반려동물 프로필을 조회·관리합니다.' },
    posts: { title: '게시글 · 댓글 · 큐레이션', description: '커뮤니티 게시글/댓글 모니터링 및 공식 큐레이션 등급을 관리합니다.' },
    notebooks: { title: '건강 수첩 · AI 분석', description: 'AI 자동 추출 건강 수첩 기록 및 공개 수첩 그룹 현황을 관리합니다.' },
    reports: { title: '신고 센터', description: '접수된 게시글/댓글/사용자 신고 내역을 검토하고 제재 조치를 수행합니다.' },
    verifications: { title: '수의사 검증 · 질병', description: '수의사 면허 인증 신청 및 케어 검증 요청을 심사합니다.' },
    boards: { title: '게시판 관리', description: '커뮤니티 게시판 카테고리, 노출 순서 및 핀 허용 정책을 설정합니다.' },
    'affiliate-domains': { title: '제휴 도메인 관리', description: '외부 상품 핀 등록이 허용되는 제휴 도메인 화이트리스트를 관리합니다.' },
    notices: { title: '공지 · 배너', description: '서비스 공지사항 및 홈 메인 배너 노출을 관리합니다.' },
    'audit-logs': { title: '감사 로그', description: '관리자 계정의 모든 운영 작업 이력을 실시간으로 추적합니다.' },
};

export default function AdminSectionStubPage() {
    const params = useParams();
    const section = String(params?.section || '');
    const meta = SECTION_META[section] || {
        title: '관리자 메뉴',
        description: '해당 운영 관리 페이지는 순차적으로 오픈될 예정입니다.',
    };

    return (
        <Flex minH="60vh" align="center" justify="center">
            <Box
                maxW="460px"
                w="full"
                bg="var(--waba-card)"
                border="1px solid"
                borderColor="var(--waba-line)"
                borderRadius="24px"
                p={{ base: 6, md: 8 }}
                textAlign="center"
            >
                <VStack gap={4}>
                    <Flex
                        w="52px"
                        h="52px"
                        borderRadius="full"
                        bg="var(--waba-purple-soft)"
                        color="var(--waba-purple-text)"
                        align="center"
                        justify="center"
                    >
                        <LuConstruction size={24} />
                    </Flex>
                    <Heading as="h1" fontSize="18px" fontWeight="800" color="var(--waba-ink)">
                        {meta.title}
                    </Heading>
                    <Text fontSize="13px" color="var(--waba-ink-3)" lineHeight="1.6">
                        {meta.description}
                    </Text>
                    <Link href="/admin">
                        <Button
                            mt={2}
                            size="sm"
                            h="38px"
                            px={5}
                            borderRadius="999px"
                            bg="#6338A9"
                            color="#FFFFFF"
                            _hover={{ bg: '#522B8F' }}
                            fontWeight="700"
                            gap={1.5}
                        >
                            <LuArrowLeft size={14} />
                            대시보드로 돌아가기
                        </Button>
                    </Link>
                </VStack>
            </Box>
        </Flex>
    );
}
