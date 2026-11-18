'use client'

import React, { useState } from 'react';
import {
    Box,
    Button,
    Flex,
    Grid,
    Heading,
    HStack,
    IconButton,
    Menu,
    Portal,
    Switch,
    Text,
    VStack,
} from '@chakra-ui/react';
import { LuBookmark, LuEllipsis, LuExternalLink, LuFolder, LuLogOut, LuPencil, LuPlus, LuSparkles, LuTrash2 } from 'react-icons/lu';
import { useRouter } from 'next/navigation';
import { Pet } from '@/interface';
import UserAvatar from '../../common/UserAvatar';
import { getNotebookStatusBadge, NotebookItem } from '../../notebook/notebook-components/types';

export interface MypageHistoryPet {
    id: number | string;
    name: string;
    current_avatar_url?: string | null;
}

export interface MypageHistoryRecord {
    id: string | number;
    category?: string;
    date: string;
    title: string;
    description?: string;
    hospital_name?: string;
    weight_kg?: number | null;
    is_ai_generated?: boolean | number;
    pet_id?: number | string | null;
    pet?: MypageHistoryPet | null;
    pets?: MypageHistoryPet[];
    journey_id?: number | string | null;
    journey?: {
        id: number | string;
        title: string;
        is_ongoing?: boolean | number;
    } | null;
    posts?: { id: string; title: string }[];
}

export interface MypageJourneyRecord {
    id: string | number;
    title: string;
    category?: string;
    status?: string;
    goal_summary?: string | null;
    description?: string | null;
    share_scope?: string;
    start_date?: string;
    end_date?: string | null;
    is_ongoing?: boolean | number;
    share_slug?: string;
    record_count?: number;
}

interface MypageNotebookTabProps {
    pet: Pet | null;
    pets?: Pet[];
    histories: MypageHistoryRecord[];
    journeys: MypageJourneyRecord[];
    autoJournalEnabled: boolean;
    onOpenRecordModal: () => void;
    onOpenManageModal: () => void;
    onEditJourney: (journey: MypageJourneyRecord) => void;
    onDeleteJourney: (journeyId: string | number) => void;
    onEditHistory: (item: MypageHistoryRecord) => void;
    onDeleteHistory: (historyId: string | number) => void;
    onOpenPetRegister: () => void;
}

export function MypageNotebookTab({
    pet,
    pets = [],
    histories,
    journeys,
    autoJournalEnabled,
    onOpenRecordModal,
    onOpenManageModal,
    onEditJourney,
    onDeleteJourney,
    onEditHistory,
    onDeleteHistory,
    onOpenPetRegister,
}: MypageNotebookTabProps) {
    const router = useRouter();
    const [filterMode, setFilterMode] = useState<'all' | 'group' | 'unclassified'>('all');

    if (!pet) {
        return (
            <Box
                bg="var(--waba-surface)"
                border="1px dashed"
                borderColor="var(--waba-line)"
                borderRadius="20px"
                py={14}
                px={6}
                textAlign="center"
            >
                <Text fontSize="15px" fontWeight="700" color="var(--waba-ink)" mb={1}>
                    등록된 반려동물이 없습니다
                </Text>
                <Text fontSize="13px" color="var(--waba-ink-3)" mb={4}>
                    반려동물을 등록하면 AI 건강 수첩 타임라인을 시작할 수 있습니다.
                </Text>
                <Button size="sm" rounded="full" bg="#6338A9" color="white" px={5} onClick={onOpenPetRegister}>
                    + 반려동물 등록하기
                </Button>
            </Box>
        );
    }

    const unclassifiedHistories = histories.filter((item) => !item.journey_id && !item.journey);
    const visibleHistories = filterMode === 'unclassified' ? unclassifiedHistories : histories;

    return (
        <Box
            bg="var(--waba-card)"
            border="1px solid"
            borderColor="var(--waba-line)"
            borderRadius="20px"
            p={{ base: '16px', md: '22px 24px' }}
            display="flex"
            flexDirection="column"
            gap="14px"
            minW={0}
        >
            <Flex justify="space-between" align={{ base: 'flex-start', sm: 'center' }} direction={{ base: 'column', sm: 'row' }} gap={3}>
                <Box>
                    <Heading as="h2" fontSize="16px" fontWeight="800" color="var(--waba-ink)">
                        AI 건강 수첩 타임라인
                    </Heading>
                    <Text fontSize="12px" color="var(--waba-ink-3)" mt="2px">
                        커뮤니티 글과 직접 기록이 시간순으로 누적됩니다.
                    </Text>
                </Box>

                <HStack gap={2} flexWrap="wrap">
                    <Box
                        bg="var(--waba-purple-soft)"
                        color="var(--waba-purple-text)"
                        fontSize="11px"
                        fontWeight="700"
                        px="10px"
                        py="4px"
                        borderRadius="999px"
                    >
                        ✨ AI 자동 일지 {autoJournalEnabled ? 'ON' : 'OFF'}
                    </Box>
                </HStack>
            </Flex>

            {/* [전체 | 그룹 | 미분류] 세그먼트 필터 칩 + 우측 액션 버튼 */}
            <Flex
                direction={{ base: 'column', sm: 'row' }}
                align={{ base: 'stretch', sm: 'center' }}
                justify="space-between"
                gap={3}
                minW={0}
            >
                <HStack
                    bg="var(--waba-surface)"
                    p="3px"
                    borderRadius="999px"
                    border="1px solid"
                    borderColor="var(--waba-line)"
                    gap="2px"
                    w={{ base: '100%', sm: 'fit-content' }}
                    maxW="100%"
                    overflowX="auto"
                    css={{ '&::-webkit-scrollbar': { display: 'none' } }}
                >
                    {[
                        { key: 'all' as const, label: `전체 (${histories.length})` },
                        { key: 'group' as const, label: `그룹 (${journeys.length})` },
                        { key: 'unclassified' as const, label: `미분류 (${unclassifiedHistories.length})` },
                    ].map((chip) => {
                        const isSelected = filterMode === chip.key;
                        return (
                            <Button
                                key={chip.key}
                                size="2xs"
                                h="28px"
                                px={{ base: '10px', sm: '14px' }}
                                flex={{ base: 1, sm: 'none' }}
                                borderRadius="999px"
                                bg={isSelected ? '#6338A9' : 'transparent'}
                                color={isSelected ? '#FFFFFF' : 'var(--waba-ink-2)'}
                                fontSize="12px"
                                fontWeight={isSelected ? '700' : '600'}
                                whiteSpace="nowrap"
                                onClick={() => setFilterMode(chip.key)}
                            >
                                {chip.label}
                            </Button>
                        );
                    })}
                </HStack>

                {filterMode === 'group' ? (
                    <Button
                        size="xs"
                        h="34px"
                        px="14px"
                        borderRadius="999px"
                        bg="#6338A9"
                        color="#FFFFFF"
                        fontSize="12px"
                        fontWeight="700"
                        _hover={{ bg: '#522B8F' }}
                        onClick={onOpenManageModal}
                        flexShrink={0}
                        alignSelf={{ base: 'flex-end', sm: 'auto' }}
                        gap={1}
                    >
                        <LuPlus size={14} />
                        그룹 생성
                    </Button>
                ) : (
                    <Button
                        size="xs"
                        h="34px"
                        px="14px"
                        borderRadius="999px"
                        bg="#6338A9"
                        color="#FFFFFF"
                        fontSize="12px"
                        fontWeight="700"
                        _hover={{ bg: '#522B8F' }}
                        onClick={onOpenRecordModal}
                        flexShrink={0}
                        alignSelf={{ base: 'flex-end', sm: 'auto' }}
                        gap={1}
                    >
                        <LuPlus size={14} />
                        수첩 직접 기록
                    </Button>
                )}
            </Flex>

            {filterMode === 'group' ? (
                journeys.length === 0 ? (
                    <Box
                        bg="var(--waba-surface)"
                        border="1px dashed"
                        borderColor="var(--waba-line)"
                        borderRadius="16px"
                        py={10}
                        textAlign="center"
                    >
                        <Text fontSize="13px" color="var(--waba-ink-3)" mb={3}>
                            아직 생성된 수첩 그룹이 없습니다.
                        </Text>
                        <Button size="xs" rounded="full" bg="#6338A9" color="white" px={4} onClick={onOpenManageModal}>
                            + 그룹 생성
                        </Button>
                    </Box>
                ) : (
                    <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }} gap="14px" minW={0}>
                        {journeys.map((j) => {
                            const resolvedStatus = j.status || (j.is_ongoing ? 'ACTIVE' : 'CURED');
                            const badge = getNotebookStatusBadge(resolvedStatus);
                            return (
                                <Box
                                    key={j.id}
                                    bg="var(--waba-surface)"
                                    border="1px solid"
                                    borderColor="var(--waba-line)"
                                    borderRadius="16px"
                                    p="16px"
                                    display="flex"
                                    flexDirection="column"
                                    justifyContent="space-between"
                                    gap="10px"
                                    cursor="pointer"
                                    onClick={() => router.push(`/notebook/${j.id}`)}
                                    _hover={{ borderColor: 'var(--waba-purple-border)' }}
                                    transition="border-color 0.15s"
                                    minW={0}
                                >
                                    <Flex justify="space-between" align="center" gap={2}>
                                        <Box
                                            bg={badge.bg}
                                            color={badge.color}
                                            fontSize="11px"
                                            fontWeight="700"
                                            px="10px"
                                            py="3px"
                                            borderRadius="999px"
                                        >
                                            {badge.shortLabel}
                                        </Box>
                                        <HStack gap={1.5} flexShrink={0}>
                                            <Text fontSize="11px" color="var(--waba-ink-3)">
                                                기록 {j.record_count ?? 0}건
                                            </Text>
                                            <Menu.Root positioning={{ placement: 'bottom-end' }}>
                                                <Menu.Trigger asChild>
                                                    <IconButton
                                                        aria-label="그룹 메뉴"
                                                        size="2xs"
                                                        variant="ghost"
                                                        rounded="full"
                                                        color="var(--waba-ink-3)"
                                                        _hover={{ color: 'var(--waba-ink)', bg: 'var(--waba-card)' }}
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        <LuEllipsis size={14} />
                                                    </IconButton>
                                                </Menu.Trigger>
                                                <Portal>
                                                    <Menu.Positioner>
                                                        <Menu.Content
                                                            minW="120px"
                                                            borderRadius="14px"
                                                            p={1.5}
                                                            bg="var(--waba-card)"
                                                            border="1px solid"
                                                            borderColor="var(--waba-line)"
                                                            boxShadow="0 10px 28px rgba(0,0,0,0.12)"
                                                        >
                                                            <Menu.Item
                                                                value="edit"
                                                                cursor="pointer"
                                                                borderRadius="10px"
                                                                py={1.5}
                                                                px={2.5}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    onEditJourney(j);
                                                                }}
                                                            >
                                                                <LuPencil size={13} />
                                                                <Text fontSize="12px" fontWeight="600">수정하기</Text>
                                                            </Menu.Item>
                                                            <Menu.Item
                                                                value="delete"
                                                                cursor="pointer"
                                                                borderRadius="10px"
                                                                py={1.5}
                                                                px={2.5}
                                                                color="red.500"
                                                                _hover={{ bg: 'red.50' }}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    onDeleteJourney(j.id);
                                                                }}
                                                            >
                                                                <LuTrash2 size={13} />
                                                                <Text fontSize="12px" fontWeight="600">삭제하기</Text>
                                                            </Menu.Item>
                                                        </Menu.Content>
                                                    </Menu.Positioner>
                                                </Portal>
                                            </Menu.Root>
                                        </HStack>
                                    </Flex>

                                    <HStack gap={1.5} minW={0}>
                                        <Box color="var(--waba-purple-text)" flexShrink={0}>
                                            <LuFolder size={15} />
                                        </Box>
                                        <Text fontSize="15px" fontWeight="800" color="var(--waba-ink)" lineClamp={2}>
                                            {j.title}
                                        </Text>
                                    </HStack>

                                    <Flex justify="space-between" align="center" pt="6px" borderTop="1px solid" borderColor="var(--waba-line)">
                                        <Text fontSize="11px" color="var(--waba-ink-3)">
                                            {j.start_date || ''} {j.end_date ? `~ ${j.end_date}` : ''}
                                        </Text>
                                        <Text fontSize="12px" fontWeight="700" color="var(--waba-purple-text)">
                                            수첩 상세 →
                                        </Text>
                                    </Flex>
                                </Box>
                            );
                        })}
                    </Grid>
                )
            ) : visibleHistories.length === 0 ? (
                <Box
                    bg="var(--waba-surface)"
                    border="1px dashed"
                    borderColor="var(--waba-line)"
                    borderRadius="16px"
                    py={10}
                    textAlign="center"
                >
                    <Text fontSize="13px" color="var(--waba-ink-3)" mb={3}>
                        {filterMode === 'unclassified'
                            ? '그룹에 속하지 않은 미분류 기록이 없습니다.'
                            : `아직 ${pet.name}의 건강 수첩 기록이 없습니다.`}
                    </Text>
                    {filterMode === 'all' && (
                        <Button size="xs" rounded="full" bg="#6338A9" color="white" px={4} onClick={onOpenRecordModal}>
                            + 첫 기록 작성하기
                        </Button>
                    )}
                </Box>
            ) : (
                <VStack align="stretch" gap="12px" minW={0}>
                    {visibleHistories.map((item) => {
                        const linkedPostId = item.posts?.[0]?.id;
                        const isAI = item.is_ai_generated === 1 || item.is_ai_generated === true;
                        const resolvedJourneyId = item.journey?.id ?? item.journey_id;
                        const resolvedJourneyTitle =
                            item.journey?.title ||
                            (resolvedJourneyId
                                ? journeys.find((j) => String(j.id) === String(resolvedJourneyId))?.title
                                : undefined);

                        const fallbackPet = item.pet_id
                            ? pets.find((p) => String(p.id) === String(item.pet_id))
                            : undefined;
                        const itemPets =
                            Array.isArray(item.pets) && item.pets.length > 0
                                ? item.pets
                                : item.pet
                                    ? [item.pet]
                                    : fallbackPet
                                        ? [fallbackPet]
                                        : [];

                        return (
                            <Grid
                                key={item.id}
                                templateColumns={{ base: '1fr', md: '116px 1fr auto' }}
                                gap={{ base: '8px', md: '16px' }}
                                alignItems={{ base: 'flex-start', md: 'center' }}
                                px={{ base: '14px', md: '18px' }}
                                py={{ base: '14px', md: '15px' }}
                                borderRadius="16px"
                                bg={isAI ? 'var(--waba-purple-soft)' : 'var(--waba-surface)'}
                                border="1px solid"
                                borderColor={isAI ? 'var(--waba-purple-border)' : 'var(--waba-line)'}
                                minW={0}
                            >
                                <Box minW={0}>
                                    {itemPets.length > 0 && (
                                        <HStack
                                            gap={0}
                                            align="center"
                                            mb={1.5}
                                            title={itemPets.map((p) => p.name).join(', ')}
                                        >
                                            {itemPets.slice(0, 3).map((p, idx) => (
                                                <Box
                                                    key={String(p.id)}
                                                    position="relative"
                                                    zIndex={idx}
                                                    ml={idx > 0 ? '-8px' : 0}
                                                    w="24px"
                                                    h="24px"
                                                    borderRadius="full"
                                                    border="2px solid"
                                                    borderColor={isAI ? 'var(--waba-purple-soft)' : 'var(--waba-surface)'}
                                                    overflow="hidden"
                                                    flexShrink={0}
                                                    title={p.name}
                                                >
                                                    <UserAvatar
                                                        src={p.current_avatar_url || undefined}
                                                        alt={p.name}
                                                        size="xs"
                                                        fallbackType="pet"
                                                        w="full"
                                                        h="full"
                                                    />
                                                </Box>
                                            ))}
                                            {itemPets.length > 3 && (
                                                <Box
                                                    position="relative"
                                                    zIndex={3}
                                                    ml="-8px"
                                                    w="24px"
                                                    h="24px"
                                                    borderRadius="full"
                                                    border="2px solid"
                                                    borderColor={isAI ? 'var(--waba-purple-soft)' : 'var(--waba-surface)'}
                                                    bg="var(--waba-subtle)"
                                                    color="var(--waba-ink-2)"
                                                    fontSize="10px"
                                                    fontWeight="800"
                                                    display="flex"
                                                    alignItems="center"
                                                    justifyContent="center"
                                                    flexShrink={0}
                                                >
                                                    +{itemPets.length - 3}
                                                </Box>
                                            )}
                                        </HStack>
                                    )}
                                    <Text
                                        fontSize="12px"
                                        fontWeight={isAI ? '800' : '700'}
                                        color={isAI ? 'var(--waba-purple-text)' : 'var(--waba-ink-3)'}
                                    >
                                        {item.date}
                                    </Text>
                                </Box>

                                <Box minW={0}>
                                    <HStack gap="8px" align="center" flexWrap="wrap">
                                        {isAI ? (
                                            <Box
                                                bg="var(--waba-purple-soft)"
                                                border="1px solid"
                                                borderColor="var(--waba-purple-border)"
                                                color="var(--waba-purple-text)"
                                                fontSize="11px"
                                                fontWeight="700"
                                                px="10px"
                                                py="3px"
                                                borderRadius="999px"
                                            >
                                                ✨ AI 자동 생성
                                            </Box>
                                        ) : (
                                            <Box
                                                bg="var(--waba-card)"
                                                border="1px solid"
                                                borderColor="var(--waba-line)"
                                                color="var(--waba-ink-2)"
                                                fontSize="11px"
                                                fontWeight="700"
                                                px="10px"
                                                py="3px"
                                                borderRadius="999px"
                                            >
                                                직접 기록
                                            </Box>
                                        )}
                                        <Text fontSize="14px" fontWeight="700" color="var(--waba-ink)">
                                            {item.title}
                                        </Text>
                                    </HStack>

                                    {(item.description || item.weight_kg || item.hospital_name) && (
                                        <Text fontSize="12px" color="var(--waba-ink-2)" mt="4px" lineHeight="1.5">
                                            {[
                                                item.description,
                                                item.hospital_name ? `🏥 ${item.hospital_name}` : null,
                                                item.weight_kg ? `${Number(item.weight_kg).toFixed(1)}kg` : null,
                                            ]
                                                .filter(Boolean)
                                                .join(' · ')}
                                        </Text>
                                    )}
                                </Box>

                                <HStack gap="8px" flexWrap="wrap" justify={{ base: 'flex-start', md: 'flex-end' }}>
                                    {resolvedJourneyId && (
                                        <HStack
                                            as="button"
                                            gap={1}
                                            bg="var(--waba-card)"
                                            border="1px solid"
                                            borderColor="var(--waba-purple-border)"
                                            color="var(--waba-purple-text)"
                                            fontSize="11px"
                                            fontWeight="700"
                                            px="9px"
                                            py="3px"
                                            borderRadius="999px"
                                            cursor="pointer"
                                            maxW="160px"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                router.push(`/notebook/${resolvedJourneyId}`);
                                            }}
                                            _hover={{ bg: 'var(--waba-purple-soft)' }}
                                        >
                                            <LuFolder size={12} />
                                            <Text truncate>{resolvedJourneyTitle || '수첩 그룹'}</Text>
                                        </HStack>
                                    )}

                                    <Menu.Root positioning={{ placement: 'bottom-end' }}>
                                        <Menu.Trigger asChild>
                                            <IconButton
                                                aria-label="기록 메뉴"
                                                size="2xs"
                                                variant="ghost"
                                                rounded="full"
                                                color="var(--waba-ink-3)"
                                                _hover={{ color: 'var(--waba-ink)', bg: 'var(--waba-card)' }}
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <LuEllipsis size={14} />
                                            </IconButton>
                                        </Menu.Trigger>
                                        <Portal>
                                            <Menu.Positioner>
                                                <Menu.Content
                                                    minW="130px"
                                                    borderRadius="14px"
                                                    p={1.5}
                                                    bg="var(--waba-card)"
                                                    border="1px solid"
                                                    borderColor="var(--waba-line)"
                                                    boxShadow="0 10px 28px rgba(0,0,0,0.12)"
                                                >
                                                    {linkedPostId && (
                                                        <Menu.Item
                                                            value="view-post"
                                                            cursor="pointer"
                                                            borderRadius="10px"
                                                            py={1.5}
                                                            px={2.5}
                                                            color="var(--waba-purple-text)"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                router.push(`/post/${linkedPostId}`);
                                                            }}
                                                        >
                                                            <LuExternalLink size={13} />
                                                            <Text fontSize="12px" fontWeight="600">게시글 보기</Text>
                                                        </Menu.Item>
                                                    )}
                                                    <Menu.Item
                                                        value="edit"
                                                        cursor="pointer"
                                                        borderRadius="10px"
                                                        py={1.5}
                                                        px={2.5}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            onEditHistory(item);
                                                        }}
                                                    >
                                                        <LuPencil size={13} />
                                                        <Text fontSize="12px" fontWeight="600">수정하기</Text>
                                                    </Menu.Item>
                                                    <Menu.Item
                                                        value="delete"
                                                        cursor="pointer"
                                                        borderRadius="10px"
                                                        py={1.5}
                                                        px={2.5}
                                                        color="red.500"
                                                        _hover={{ bg: 'red.50' }}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            onDeleteHistory(item.id);
                                                        }}
                                                    >
                                                        <LuTrash2 size={13} />
                                                        <Text fontSize="12px" fontWeight="600">삭제하기</Text>
                                                    </Menu.Item>
                                                </Menu.Content>
                                            </Menu.Positioner>
                                        </Portal>
                                    </Menu.Root>
                                </HStack>
                            </Grid>
                        );
                    })}
                </VStack>
            )}
        </Box>
    );
}

interface MypageScrappedNotebooksProps {
    notebooks: NotebookItem[];
    onUnscrap: (notebookId: string | number, e: React.MouseEvent) => void;
}

export function MypageScrappedNotebooks({
    notebooks,
    onUnscrap,
}: MypageScrappedNotebooksProps) {
    const router = useRouter();

    return (
        <Box
            bg="var(--waba-card)"
            border="1px solid"
            borderColor="var(--waba-line)"
            borderRadius="20px"
            p={{ base: '16px', md: '22px 24px' }}
            display="flex"
            flexDirection="column"
            gap="14px"
            minW={0}
        >
            <Flex justify="space-between" align="center">
                <Heading as="h3" fontSize="16px" fontWeight="800" color="var(--waba-ink)">
                    🔖 스크랩한 건강 수첩 ({notebooks.length})
                </Heading>
                <Text
                    as="button"
                    fontSize="12px"
                    fontWeight="600"
                    color="var(--waba-purple-text)"
                    cursor="pointer"
                    onClick={() => router.push('/notebook')}
                >
                    공유 수첩 탐색 →
                </Text>
            </Flex>

            {notebooks.length === 0 ? (
                <Box
                    bg="var(--waba-surface)"
                    border="1px dashed"
                    borderColor="var(--waba-line)"
                    borderRadius="16px"
                    py={8}
                    textAlign="center"
                >
                    <Text fontSize="13px" color="var(--waba-ink-3)">
                        아직 스크랩한 건강 수첩이 없습니다.
                    </Text>
                </Box>
            ) : (
                <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }} gap="14px" minW={0}>
                    {notebooks.map((nb) => {
                        const badge = getNotebookStatusBadge(nb.status, nb.days_elapsed, nb.weight_summary);
                        return (
                            <Flex
                                key={nb.id}
                                bg="var(--waba-surface)"
                                border="1px solid"
                                borderColor="var(--waba-line)"
                                borderRadius="16px"
                                p="14px"
                                justify="space-between"
                                align="center"
                                gap={3}
                                cursor="pointer"
                                onClick={() => router.push(`/notebook/${nb.id}`)}
                                _hover={{ borderColor: 'var(--waba-purple-border)' }}
                                minW={0}
                            >
                                <HStack gap={3} minW={0} flex="1">
                                    <UserAvatar
                                        src={nb.pet?.current_avatar_url}
                                        alt={nb.pet?.name || '반려동물'}
                                        size="md"
                                        fallbackType="pet"
                                    />
                                    <Box minW={0} flex="1">
                                        <HStack gap={1.5} mb={0.5} flexWrap="wrap">
                                            <Box bg={badge.bg} color={badge.color} fontSize="10px" fontWeight="700" px={2} py={0.5} rounded="full">
                                                {badge.shortLabel}
                                            </Box>
                                            <Text fontSize="11px" color="var(--waba-ink-3)">
                                                by {nb.user?.nickname || '집사'}
                                            </Text>
                                        </HStack>
                                        <Text fontSize="14px" fontWeight="700" color="var(--waba-ink)" truncate>
                                            {nb.title}
                                        </Text>
                                    </Box>
                                </HStack>

                                <IconButton
                                    aria-label="스크랩 해제"
                                    size="sm"
                                    rounded="full"
                                    bg="var(--waba-purple-soft)"
                                    color="var(--waba-purple-text)"
                                    onClick={(e) => onUnscrap(nb.id, e)}
                                    flexShrink={0}
                                >
                                    <LuBookmark size={14} fill="currentColor" />
                                </IconButton>
                            </Flex>
                        );
                    })}
                </Grid>
            )}
        </Box>
    );
}

interface MypageSettingsTabProps {
    autoJournalEnabled: boolean;
    isUpdatingAutoJournal: boolean;
    onToggleAutoJournal: (checked: boolean) => void;
    onOpenEditProfile: () => void;
    onLogout: () => void;
}

export function MypageSettingsTab({
    autoJournalEnabled,
    isUpdatingAutoJournal,
    onToggleAutoJournal,
    onOpenEditProfile,
    onLogout,
}: MypageSettingsTabProps) {
    return (
        <VStack align="stretch" gap="16px" minW={0}>
            {/* AI 건강 수첩 자동 기록 설정 */}
            <Flex
                bg="var(--waba-card)"
                border="1px solid"
                borderColor="var(--waba-line)"
                borderRadius="20px"
                p={{ base: '18px', md: '22px 24px' }}
                align={{ base: 'flex-start', sm: 'center' }}
                justify="space-between"
                gap={4}
                flexWrap="wrap"
            >
                <HStack gap={3} align="flex-start" flex="1" minW="220px">
                    <Box
                        w="34px"
                        h="34px"
                        borderRadius="12px"
                        bg="var(--waba-purple-soft)"
                        color="var(--waba-purple-text)"
                        display="flex"
                        alignItems="center"
                        justifyContent="center"
                        flexShrink={0}
                    >
                        <LuSparkles size={16} />
                    </Box>
                    <Box>
                        <Text fontSize="14px" fontWeight="800" color="var(--waba-ink)">
                            ✨ AI 건강 수첩 자동 기록
                        </Text>
                        <Text fontSize="12px" color="var(--waba-ink-3)" mt="2px" lineHeight="1.5">
                            ON 설정 시 게시글 작성 중 병원·건강 내용을 AI가 감지하면 자동으로 수첩에 기록합니다.
                        </Text>
                    </Box>
                </HStack>

                <Switch.Root
                    colorPalette="purple"
                    size="md"
                    checked={autoJournalEnabled}
                    disabled={isUpdatingAutoJournal}
                    onCheckedChange={(e) => onToggleAutoJournal(e.checked)}
                >
                    <Switch.HiddenInput />
                    <Switch.Control>
                        <Switch.Thumb />
                    </Switch.Control>
                    <Switch.Label fontSize="12px" fontWeight="700" color={autoJournalEnabled ? 'var(--waba-purple-text)' : 'var(--waba-ink-3)'}>
                        {autoJournalEnabled ? 'ON' : 'OFF'}
                    </Switch.Label>
                </Switch.Root>
            </Flex>

            {/* 계정 설정 */}
            <Flex
                bg="var(--waba-card)"
                border="1px solid"
                borderColor="var(--waba-line)"
                borderRadius="20px"
                p={{ base: '18px', md: '22px 24px' }}
                justify="space-between"
                align="center"
                flexWrap="wrap"
                gap={3}
            >
                <Box>
                    <Text fontSize="14px" fontWeight="800" color="var(--waba-ink)">
                        계정 및 프로필 관리
                    </Text>
                    <Text fontSize="12px" color="var(--waba-ink-3)" mt="2px">
                        닉네임, 프로필 이미지 변경 또는 로그아웃을 진행합니다.
                    </Text>
                </Box>

                <HStack gap={2}>
                    <Button
                        size="sm"
                        rounded="full"
                        variant="outline"
                        borderColor="var(--waba-line)"
                        color="var(--waba-ink)"
                        onClick={onOpenEditProfile}
                    >
                        프로필 수정
                    </Button>
                    <Button
                        size="sm"
                        rounded="full"
                        variant="outline"
                        borderColor="red.300"
                        color="red.500"
                        _hover={{ bg: 'red.50' }}
                        onClick={onLogout}
                        gap={1.5}
                    >
                        <LuLogOut size={14} />
                        로그아웃
                    </Button>
                </HStack>
            </Flex>
        </VStack>
    );
}
