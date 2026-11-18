'use client'

import React, { useMemo } from 'react';
import { DatePicker, IconButton, Portal, parseDate, type DateValue } from '@chakra-ui/react';
import { LuCalendar } from 'react-icons/lu';

interface KoreanDatePickerProps {
    value: string; // YYYY-MM-DD
    onChange: (nextYyyyMmDd: string) => void;
    placeholder?: string;
    h?: string | number;
    disabled?: boolean;
}

function formatSlashDate(date: DateValue): string {
    const y = String(date.year).padStart(4, '0');
    const m = String(date.month).padStart(2, '0');
    const d = String(date.day).padStart(2, '0');
    return `${y}/${m}/${d}`;
}

function formatIsoDate(date: DateValue): string {
    const y = String(date.year).padStart(4, '0');
    const m = String(date.month).padStart(2, '0');
    const d = String(date.day).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function parseFlexibleDate(input: string): DateValue | undefined {
    const normalized = input.trim().replace(/[./]/g, '-');
    if (!/^\d{4}-\d{1,2}-\d{1,2}$/.test(normalized)) return undefined;
    const [y, m, d] = normalized.split('-').map(Number);
    try {
        return parseDate(
            `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
        );
    } catch {
        return undefined;
    }
}

export default function KoreanDatePicker({
    value,
    onChange,
    placeholder = 'YYYY/MM/DD',
    h = '38px',
    disabled = false,
}: KoreanDatePickerProps) {
    const pickerValue = useMemo<DateValue[]>(() => {
        if (!value) return [];
        const parsed = parseFlexibleDate(value.slice(0, 10));
        return parsed ? [parsed] : [];
    }, [value]);

    return (
        <DatePicker.Root
            locale="ko-KR"
            value={pickerValue}
            disabled={disabled}
            closeOnSelect
            format={formatSlashDate}
            parse={parseFlexibleDate}
            positioning={{ placement: 'bottom-start' }}
            onValueChange={(details) => {
                const next = details.value?.[0];
                if (next) {
                    onChange(formatIsoDate(next));
                }
            }}
            w="100%"
        >
            <DatePicker.Control
                position="relative"
                display="flex"
                alignItems="center"
                w="100%"
            >
                <DatePicker.Input
                    placeholder={placeholder}
                    h={h}
                    w="100%"
                    px={3}
                    pr="34px"
                    borderRadius="12px"
                    bg="var(--waba-surface)"
                    border="1px solid"
                    borderColor="var(--waba-line)"
                    color="var(--waba-ink)"
                    fontSize="13px"
                    _focus={{
                        outline: 'none',
                        borderColor: '#6338A9',
                    }}
                />
                <DatePicker.IndicatorGroup
                    position="absolute"
                    right="4px"
                    top="50%"
                    transform="translateY(-50%)"
                    display="flex"
                    alignItems="center"
                >
                    <DatePicker.Trigger asChild>
                        <IconButton
                            aria-label="날짜 선택"
                            variant="ghost"
                            size="xs"
                            rounded="8px"
                            color="var(--waba-ink-3)"
                            _hover={{ color: '#6338A9', bg: 'var(--waba-purple-soft)' }}
                        >
                            <LuCalendar size={15} />
                        </IconButton>
                    </DatePicker.Trigger>
                </DatePicker.IndicatorGroup>
            </DatePicker.Control>

            <Portal>
                <DatePicker.Positioner zIndex={1600}>
                    <DatePicker.Content
                        p={3.5}
                        borderRadius="18px"
                        bg="var(--waba-card)"
                        color="var(--waba-ink)"
                        border="1px solid"
                        borderColor="var(--waba-line)"
                        boxShadow="0 18px 44px rgba(0, 0, 0, 0.2)"
                        css={{
                            '& [data-part="view-control"]': {
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                marginBottom: '10px',
                                gap: '6px',
                            },
                            '& [data-part="view-trigger"]': {
                                fontSize: '13px',
                                fontWeight: '800',
                                color: 'var(--waba-ink)',
                                padding: '4px 10px',
                                borderRadius: '10px',
                                cursor: 'pointer',
                            },
                            '& [data-part="view-trigger"]:hover': {
                                background: 'var(--waba-purple-soft)',
                                color: 'var(--waba-purple-text)',
                            },
                            '& [data-part="prev-trigger"], & [data-part="next-trigger"]': {
                                width: '28px',
                                height: '28px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderRadius: '8px',
                                color: 'var(--waba-ink-2)',
                                cursor: 'pointer',
                            },
                            '& [data-part="prev-trigger"]:hover, & [data-part="next-trigger"]:hover': {
                                background: 'var(--waba-purple-soft)',
                                color: '#6338A9',
                            },
                            '& [data-part="table-header"]': {
                                fontSize: '11px',
                                fontWeight: '700',
                                color: 'var(--waba-ink-3)',
                                paddingBottom: '6px',
                                textAlign: 'center',
                            },
                            '& [data-part="table-cell-trigger"]': {
                                width: '34px',
                                height: '34px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderRadius: '10px',
                                fontSize: '12px',
                                fontWeight: '600',
                                color: 'var(--waba-ink)',
                                cursor: 'pointer',
                            },
                            '& [data-part="table-cell-trigger"][data-outside-range]': {
                                color: 'var(--waba-ink-3)',
                                opacity: 0.45,
                            },
                            '& [data-part="table-cell-trigger"]:hover': {
                                background: '#F6EBFB',
                                color: '#6338A9',
                            },
                            '& [data-part="table-cell-trigger"][data-today]': {
                                background: 'var(--waba-purple-soft)',
                                color: 'var(--waba-purple-text)',
                                fontWeight: '800',
                            },
                            '& [data-part="table-cell-trigger"][data-selected]': {
                                background: '#6338A9',
                                color: '#FFFFFF',
                                fontWeight: '800',
                            },
                        }}
                    >
                        <DatePicker.View view="day">
                            <DatePicker.Header />
                            <DatePicker.DayTable />
                        </DatePicker.View>
                        <DatePicker.View view="month">
                            <DatePicker.Header />
                            <DatePicker.MonthTable />
                        </DatePicker.View>
                        <DatePicker.View view="year">
                            <DatePicker.Header />
                            <DatePicker.YearTable />
                        </DatePicker.View>
                    </DatePicker.Content>
                </DatePicker.Positioner>
            </Portal>
        </DatePicker.Root>
    );
}
