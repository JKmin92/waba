'use client'

import React from 'react';
import {
    Box,
    Flex,
    Heading,
    HStack,
    NativeSelect,
    Switch,
    Text,
    VStack,
} from '@chakra-ui/react';
import { Sparkles } from 'lucide-react';

interface AutoJournalCardProps {
    autoJournal: boolean;
    onAutoJournalChange: (checked: boolean) => void;
    autoJournalPetId: string;
    onAutoJournalPetIdChange: (petId: string) => void;
    autoJournalJourneyId: string;
    onAutoJournalJourneyIdChange: (journeyId: string) => void;
    userPetsList: any[];
    petJourneys: any[];
}

export default function AutoJournalCard({
    autoJournal,
    onAutoJournalChange,
    autoJournalPetId,
    onAutoJournalPetIdChange,
    autoJournalJourneyId,
    onAutoJournalJourneyIdChange,
    userPetsList,
    petJourneys,
}: AutoJournalCardProps) {
    return (
        <Box
            bg="white"
            rounded="24px"
            border="1px solid"
            borderColor={autoJournal ? 'waba.purple' : 'waba.border'}
            p={5}
            boxShadow="0 8px 32px -4px rgba(26,28,30,0.04)"
            transition="all 0.2s"
        >
            <Flex justify="space-between" align="center" mb={autoJournal ? 3 : 1}>
                <HStack gap={2}>
                    <Sparkles size={16} color="#7B5CFA" />
                    <Heading fontSize="14px" fontWeight="800" color="waba.charcoal">
                        ✨ 건강 수첩 자동 기록
                    </Heading>
                </HStack>

                <Switch.Root
                    colorPalette="purple"
                    size="sm"
                    checked={autoJournal}
                    onCheckedChange={(e) => onAutoJournalChange(e.checked)}
                >
                    <Switch.HiddenInput />
                    <Switch.Control>
                        <Switch.Thumb />
                    </Switch.Control>
                    <Switch.Label fontSize="11px" fontWeight="700" color={autoJournal ? 'waba.purple' : 'waba.faint'}>
                        {autoJournal ? 'ON' : 'OFF'}
                    </Switch.Label>
                </Switch.Root>
            </Flex>

            <Text fontSize="11px" color="waba.faint" lineHeight="relaxed" mb={autoJournal ? 3.5 : 0}>
                게시글 내 병원 진료·체중·접종 내용을 AI가 감지하면 자동으로 수첩에 기록합니다.
            </Text>

            {autoJournal && (
                <VStack gap={3} align="stretch" pt={3} borderTop="1px solid" borderColor="#F0F0F4">
                    {/* 기록할 반려동물 선택 */}
                    <Box>
                        <Text fontSize="11px" fontWeight="700" color="waba.muted" mb={1}>
                            기록할 반려동물 선택
                        </Text>
                        {userPetsList.length > 0 ? (
                            <NativeSelect.Root size="sm">
                                <NativeSelect.Field
                                    value={autoJournalPetId}
                                    onChange={(e: any) => onAutoJournalPetIdChange(e.target.value)}
                                    bg="#F8F8FA"
                                    borderColor="#E8E8EE"
                                    rounded="xl"
                                    fontSize="xs"
                                    fontWeight="semibold"
                                    color="waba.charcoal"
                                    h="34px"
                                >
                                    {userPetsList.map((pet) => (
                                        <option key={pet.id} value={pet.id}>
                                            {pet.name} ({pet.breed || pet.species})
                                        </option>
                                    ))}
                                </NativeSelect.Field>
                                <NativeSelect.Indicator />
                            </NativeSelect.Root>
                        ) : (
                            <Text fontSize="11px" color="waba.faint">
                                등록된 반려동물이 없습니다.
                            </Text>
                        )}
                    </Box>

                    {/* 치료기 그룹 선택 */}
                    {userPetsList.length > 0 && (
                        <Box>
                            <Text fontSize="11px" fontWeight="700" color="waba.muted" mb={1}>
                                치료기 그룹 선택
                            </Text>
                            <NativeSelect.Root size="sm">
                                <NativeSelect.Field
                                    value={autoJournalJourneyId}
                                    onChange={(e: any) => onAutoJournalJourneyIdChange(e.target.value)}
                                    bg="#F8F8FA"
                                    borderColor="#E8E8EE"
                                    rounded="xl"
                                    fontSize="xs"
                                    fontWeight="semibold"
                                    color="waba.charcoal"
                                    h="34px"
                                >
                                    <option value="">그룹 미지정 (일반 수첩에 기록)</option>
                                    {petJourneys.map((j) => (
                                        <option key={j.id} value={String(j.id)}>
                                            📁 {j.title} ({j.is_ongoing ? '진행 중' : '완치'})
                                        </option>
                                    ))}
                                </NativeSelect.Field>
                                <NativeSelect.Indicator />
                            </NativeSelect.Root>
                        </Box>
                    )}
                </VStack>
            )}
        </Box>
    );
}
