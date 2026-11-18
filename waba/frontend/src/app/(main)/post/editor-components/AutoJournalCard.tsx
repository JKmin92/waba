'use client'

import React from 'react';
import {
    Box,
    Flex,
    Heading,
    HStack,
    Switch,
    Text,
} from '@chakra-ui/react';
import { Sparkles } from 'lucide-react';

interface AutoJournalCardProps {
    autoJournal: boolean;
    onAutoJournalChange: (checked: boolean) => void;
    autoJournalPetId?: string;
    onAutoJournalPetIdChange?: (petId: string) => void;
    autoJournalJourneyId?: string;
    onAutoJournalJourneyIdChange?: (journeyId: string) => void;
    userPetsList?: any[];
    petJourneys?: any[];
}

export default function AutoJournalCard({
    autoJournal,
    onAutoJournalChange,
}: AutoJournalCardProps) {
    return (
        <Box
            bg="var(--waba-card)"
            rounded="20px"
            border="1px solid"
            borderColor={autoJournal ? '#6338A9' : 'var(--waba-line)'}
            p={5}
            boxShadow="0 8px 32px -4px rgba(26,28,30,0.04)"
            transition="all 0.2s"
        >
            <Flex justify="space-between" align="center" mb={2}>
                <HStack gap={2}>
                    <Sparkles size={16} color="#6338A9" />
                    <Heading fontSize="14px" fontWeight="800" color="var(--waba-ink)">
                        ✨ AI 건강 수첩 자동 기록
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
                    <Switch.Label fontSize="11px" fontWeight="700" color={autoJournal ? 'var(--waba-purple-text)' : 'var(--waba-ink-3)'}>
                        {autoJournal ? 'ON' : 'OFF'}
                    </Switch.Label>
                </Switch.Root>
            </Flex>

            <Text fontSize="12px" color="var(--waba-ink-3)" lineHeight="relaxed">
                AI가 글에서 건강·케어 내용만 추출해 해당 반려동물의 미분류 수첩에 자동 기록합니다. (단순 일상·감정은 제외)
            </Text>
        </Box>
    );
}
