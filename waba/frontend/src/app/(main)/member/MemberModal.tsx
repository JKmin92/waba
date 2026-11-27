'use client'

import { Button, CloseButton, Dialog, Flex, Portal } from "@chakra-ui/react";
import { useEffect, useState } from "react";
import LoginClient from "./login/LoginClient";
import JoinClient from "./join/JoinClient";

interface MemberModalProps {
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    showTrigger?: boolean;
    triggerText?: string;
}

export default function MemberModal({
    open: externalOpen,
    onOpenChange: externalOnOpenChange,
    showTrigger = true,
    triggerText = '로그인'
}: MemberModalProps = {}) {
    const [internalOpen, setInternalOpen] = useState(false);
    const isControlled = externalOpen !== undefined;
    const open = isControlled ? externalOpen : internalOpen;

    const setOpen = (newOpen: boolean) => {
        if (isControlled) {
            externalOnOpenChange?.(newOpen);
        } else {
            setInternalOpen(newOpen);
        }
    };

    const [isEmailMode, setIsEmailMode] = useState(false);
    const [modalType, setModalType] = useState<'login' | 'join'>('login');

    useEffect(() => {
        const handleOpenLogin = () => {
            setOpen(true);
            setIsEmailMode(false);
            setModalType('login');
        };

        window.addEventListener('open-login-modal', handleOpenLogin);
        return () => window.removeEventListener('open-login-modal', handleOpenLogin);
    }, [isControlled]);

    return (
        <Dialog.Root
            open={open}
            onOpenChange={(e) => {
                setOpen(e.open)
                if (!e.open) {
                    setIsEmailMode(false)
                    setModalType('login')
                }
            }}
            placement="center"
            scrollBehavior="inside"
        >
            {showTrigger && (
                <Dialog.Trigger asChild>
                    <Button bg="var(--waba-ink)" color="var(--waba-bg)" rounded="full" px={5} h="40px" fontSize="13px" _hover={{ bg: '#6338A9', color: '#FFFFFF' }}>{triggerText}</Button>
                </Dialog.Trigger>
            )}
            <Portal>
                <Dialog.Backdrop backdropFilter="blur(8px)" bg="blackAlpha.500" />
                <Dialog.Positioner p={{ base: 0, md: 6 }}>
                    <Dialog.Content
                        maxW="520px"
                        w="full"
                        my="auto"
                        borderRadius={{ base: 0, md: "28px" }}
                        overflow="hidden"
                        p={0}
                        bg="var(--waba-card)"
                        color="var(--waba-ink)"
                        border="1px solid"
                        borderColor="var(--waba-line)"
                    >
                        <Dialog.CloseTrigger asChild position="absolute" top={4} right={4} zIndex={2}>
                            <CloseButton size="sm" borderRadius="full" bg="var(--waba-surface)" color="var(--waba-ink)" _hover={{ bg: 'var(--waba-line)' }} />
                        </Dialog.CloseTrigger>

                        <Dialog.Body
                            p={0}
                            css={{
                                scrollbarWidth: 'none',
                                msOverflowStyle: 'none',
                                '&::-webkit-scrollbar': { display: 'none' },
                            }}
                        >
                            <Flex>
                                {modalType === 'login' ? (
                                    <LoginClient isEmailMode={isEmailMode} setIsEmailMode={setIsEmailMode} setModalType={setModalType} setOpen={setOpen} />
                                ) : (
                                    <JoinClient setModalType={setModalType} setOpen={setOpen} />
                                )}
                            </Flex>
                        </Dialog.Body>
                    </Dialog.Content>
                </Dialog.Positioner>
            </Portal>
        </Dialog.Root>
    )
}
