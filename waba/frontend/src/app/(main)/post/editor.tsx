'use client'

import React, { useState, useRef, useEffect } from 'react';
import {
    Avatar,
    Box,
    Button,
    Container,
    Dialog,
    Flex,
    Heading,
    HStack,
    IconButton,
    Image,
    Input,
    NativeSelect,
    Portal,
    Separator,
    Stack,
    Switch,
    Text,
    VStack,
    CloseButton,
} from '@chakra-ui/react';
import {
    ArrowLeft,
    ArrowRight,
    Check,
    CheckCircle2,
    Circle,
    Eye,
    Plus,
    Tag,
    Trash2,
    ChevronUp,
    ChevronDown,
    Image as ImageIcon,
    Bookmark,
    Sparkles,
    Coins,
    ExternalLink,
    Layers,
    Search,
    Link as LinkIcon,
    AlertCircle,
    CheckCircle,
} from 'lucide-react';
import { toaster } from '@/components/ui/toaster';
import { isAuthenticated, getUserInfo } from '@/utils/authUtils';
import MemberModal from '../member/MemberModal';
import { useRouter } from 'next/navigation';
import axiosInstance from '@/utils/api';
import {
    EditorImagePin,
    EditorImageBlock,
    EditorTextBlock,
    EditorBlock,
    PostEditorData,
    EditorProps,
    ParsedExternalMetadata,
    DRAFT_STORAGE_KEY,
} from './editor-components/types';
import EditorBlockList from './editor-components/EditorBlockList';
import AutoJournalCard from './editor-components/AutoJournalCard';
import { FullPreviewModal } from './editor-components/FeedPreviewPane';
import PinRegistrationModal from './editor-components/PinRegistrationModal';

export type {
    EditorImagePin,
    EditorImageBlock,
    EditorTextBlock,
    EditorBlock,
    PostEditorData,
    EditorProps,
    ParsedExternalMetadata,
};
export { DRAFT_STORAGE_KEY };

export default function Editor({
    mode = 'create',
    postId,
    initialData,
    onSubmit,
    onSaveDraft,
    isSubmitting = false,
}: EditorProps) {
    const router = useRouter();

    // 1. Board Categories (신규 작성 시 미선택 '' 시작, 수정/임시저장 불러오기 시 기존 값 유지)
    const [boardId, setBoardId] = useState<string>(initialData?.board_id || '');
    const [highlightCategory, setHighlightCategory] = useState(false);
    const categorySectionRef = useRef<HTMLDivElement>(null);

    // 2. Title & Metadata
    const [title, setTitle] = useState<string>(initialData?.title || '');

    // 3. User & Real Registered Pets from DB
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [userPetsList, setUserPetsList] = useState<any[]>([]);
    const [selectedPets, setSelectedPets] = useState<string[]>(initialData?.selectedPets || []);

    // AI 건강 수첩 자동 기록 건별 설정 상태
    const [autoJournal, setAutoJournal] = useState<boolean>(false);
    const [autoJournalPetId, setAutoJournalPetId] = useState<string>(initialData?.selectedPets?.[0] || '');
    const [autoJournalJourneyId, setAutoJournalJourneyId] = useState<string>('');
    const [petJourneys, setPetJourneys] = useState<any[]>([]);

    // 4. In-stream Unified Blocks Flow (Clean slate: starts with 1 empty text canvas)
    const [isModeratingImages, setIsModeratingImages] = useState(false);
    const [autoFocusBlockId, setAutoFocusBlockId] = useState<string | null>(null);
    const [blocks, setBlocks] = useState<EditorBlock[]>(() => {
        if (initialData?.blocks && initialData.blocks.length > 0) {
            return initialData.blocks;
        }
        return [
            {
                id: `block-text-${Date.now()}`,
                type: 'text',
                content: '',
                format: 'p',
            },
        ];
    });

    // 5. Tags
    const [tags, setTags] = useState<string[]>(initialData?.tags || []);
    const [newTagInput, setNewTagInput] = useState<string>('');

    // 6. Draft Management States (Point 3)
    const [currentPostId, setCurrentPostId] = useState<string | null>(postId || null);
    const [savedDraft, setSavedDraft] = useState<{ data: PostEditorData; savedAt: string } | null>(null);
    const [draftModalOpen, setDraftModalOpen] = useState(false);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [savedDrafts, setSavedDrafts] = useState<Array<{ data: PostEditorData; savedAt: string }>>([]);
    const [pendingDeleteDraft, setPendingDeleteDraft] = useState<{ data: PostEditorData; savedAt: string } | null>(null);

    // 7. Pin Dropping & Modal States
    const [activePinId, setActivePinId] = useState<string | null>(null);
    const [pinModalOpen, setPinModalOpen] = useState(false);
    const [targetImageBlockId, setTargetImageBlockId] = useState<string | null>(null);
    const [pinCoords, setPinCoords] = useState<{ x: number; y: number }>({ x: 50, y: 50 });

    const [pinTypeTab, setPinTypeTab] = useState<'INTERNAL_PRODUCT' | 'EXTERNAL_PRODUCT' | 'PET'>('INTERNAL_PRODUCT');

    // Official Product Search State
    const [officialProducts, setOfficialProducts] = useState<any[]>([]);
    const [productSearchKeyword, setProductSearchKeyword] = useState('');
    const [isSearchingProducts, setIsSearchingProducts] = useState(false);
    const [selectedOfficialProduct, setSelectedOfficialProduct] = useState<any | null>(null);

    // External URL Metadata Parsing State
    const [externalUrlInput, setExternalUrlInput] = useState('');
    const [analyzedExternalUrl, setAnalyzedExternalUrl] = useState('');
    const [isParsingUrl, setIsParsingUrl] = useState(false);
    const [parsedMetadata, setParsedMetadata] = useState<ParsedExternalMetadata | null>(null);
    const [manualExternalFallback, setManualExternalFallback] = useState(false);

    // Selected Pet Pin State
    const [selectedPetForPin, setSelectedPetForPin] = useState<any | null>(null);

    // Common Pin Memo
    const [pinOptionMemo, setPinOptionMemo] = useState('');

    // 8. General Dialogs & Autosave
    const [loginModalOpen, setLoginModalOpen] = useState(false);
    const [previewModalOpen, setPreviewModalOpen] = useState(false);
    const [autoSaveTime, setAutoSaveTime] = useState<string>('방금 전');
    const [insertIndexTarget, setInsertIndexTarget] = useState<number | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const autoLoadedDraftKeyRef = useRef<string | null>(null);

    // Initial Load: User & Pets & Official Products & Draft Check
    useEffect(() => {
        let isCancelled = false;
        const userInfo = getUserInfo();
        setCurrentUser(userInfo);

        // Fetch User's Real Registered Pets
        const fetchUserPets = async () => {
            if (!isAuthenticated()) {
                setUserPetsList([]);
                return;
            }
            try {
                const res = await axiosInstance.get('/user/pets');
                if (res.data?.pets) {
                    setUserPetsList(res.data.pets);
                } else {
                    setUserPetsList([]);
                }
            } catch (err) {
                console.error('Failed to load user pets:', err);
                setUserPetsList([]);
            }
        };
        fetchUserPets();

        // Fetch User's Global Auto-Journal Setting as Default
        const fetchAutoJournalSetting = async () => {
            if (!isAuthenticated()) return;
            try {
                const res = await axiosInstance.get('/user/settings/auto-journal');
                const enabledVal = res.data?.enabled ?? res.data?.auto_journal_enabled;
                if (typeof enabledVal === 'boolean') {
                    setAutoJournal(enabledVal);
                }
            } catch {
                // ignore
            }
        };
        fetchAutoJournalSetting();

        // Fetch Official Wabami Products for Pinning
        fetchOfficialProducts('');

        // Point 3: Check Saved Draft from Server First (Multi-device sync), then fallback to LocalStorage
        const checkDrafts = async () => {
            if (mode !== 'create') return;

            const rawDraftParam =
                typeof window !== 'undefined'
                    ? new URLSearchParams(window.location.search).get('draft')
                    : null;
            const draftParam =
                rawDraftParam && rawDraftParam !== 'undefined' && rawDraftParam !== 'null'
                    ? rawDraftParam
                    : null;

            const applyDraftImmediate = (d: any) => {
                const loadKey = String(d.postId || d.id || draftParam || 'local');
                if (autoLoadedDraftKeyRef.current === loadKey) return;
                autoLoadedDraftKeyRef.current = loadKey;
                if (d.postId || d.id) setCurrentPostId(String(d.postId || d.id));
                if (d.board_id) setBoardId(d.board_id);
                if (d.title !== undefined) setTitle(d.title || '');
                if (d.blocks && d.blocks.length > 0) setBlocks(d.blocks);
                if (d.selectedPets) setSelectedPets(d.selectedPets);
                if (d.tags) setTags(d.tags);
                toaster.create({
                    title: '임시 저장된 글을 성공적으로 불러왔습니다.',
                    type: 'success',
                });
            };

            // 1. Try server draft if user is logged in
            if (isAuthenticated()) {
                try {
                    const res = await axiosInstance.get(
                        '/post/draft',
                        draftParam ? { params: { draftId: draftParam } } : undefined
                    );
                    if (isCancelled) return;
                    if (res.data?.success && (res.data.draft || Array.isArray(res.data.drafts))) {
                        const mapDraft = (item: any) => ({
                            data: {
                                postId: item.postId || item.id,
                                board_id: item.board_id,
                                title: item.title,
                                blocks: item.blocks,
                                selectedPets: item.selectedPets,
                                tags: item.tags,
                            },
                            savedAt: item.updatedAt || item.updated_at || item.createdAt || item.created_at,
                        });
                        const draftsList = Array.isArray(res.data.drafts) && res.data.drafts.length > 0
                            ? res.data.drafts.map(mapDraft)
                            : res.data.draft
                                ? [mapDraft(res.data.draft)]
                                : [];
                        const primaryDraft = res.data.draft ? mapDraft(res.data.draft) : draftsList[0] || null;
                        setSavedDrafts(draftsList);
                        setSavedDraft(primaryDraft);
                        if (draftParam && primaryDraft) {
                            applyDraftImmediate(primaryDraft.data);
                        } else if (primaryDraft) {
                        }
                        return;
                    }
                } catch (e) {
                    console.error('Fetch server draft error:', e);
                }
            }

            // 2. Fallback to local storage
            if (typeof window !== 'undefined') {
                const rawDraft = localStorage.getItem(DRAFT_STORAGE_KEY);
                if (rawDraft) {
                    try {
                        const parsed = JSON.parse(rawDraft);
                        if (
                            parsed?.data &&
                            (parsed.data.title ||
                                parsed.data.blocks?.some((b: any) => b.type === 'image' || b.content))
                        ) {
                            setSavedDrafts([parsed]);
                            setSavedDraft(parsed);
                            if (draftParam) {
                                applyDraftImmediate(parsed.data);
                            } else {
                            }
                        }
                    } catch (_) {}
                }
            }
        };

        checkDrafts();

        const handleAuthChange = () => {
            setCurrentUser(getUserInfo());
            fetchUserPets();

        // Fetch User's Global Auto-Journal Setting as Default
        const fetchAutoJournalSetting = async () => {
            if (!isAuthenticated()) return;
            try {
                const res = await axiosInstance.get('/user/settings/auto-journal');
                const enabledVal = res.data?.enabled ?? res.data?.auto_journal_enabled;
                if (typeof enabledVal === 'boolean') {
                    setAutoJournal(enabledVal);
                }
            } catch {
                // ignore
            }
        };
        fetchAutoJournalSetting();
            checkDrafts();
        };
        window.addEventListener('auth-change', handleAuthChange);
        return () => {
            isCancelled = true;
            window.removeEventListener('auth-change', handleAuthChange);
        };
    }, [mode]);

    // Sync default autoJournalPetId when selectedPets or userPetsList changes
    useEffect(() => {
        if (selectedPets.length > 0 && (!autoJournalPetId || !selectedPets.includes(autoJournalPetId))) {
            setAutoJournalPetId(selectedPets[0]);
        } else if (!autoJournalPetId && userPetsList.length > 0) {
            setAutoJournalPetId(userPetsList[0].id);
        }
    }, [selectedPets, userPetsList]);

    // Fetch journeys for selected autoJournalPetId
    useEffect(() => {
        if (!autoJournalPetId || !isAuthenticated()) {
            setPetJourneys([]);
            setAutoJournalJourneyId('');
            return;
        }
        let isMounted = true;
        const fetchJourneys = async () => {
            try {
                const res = await axiosInstance.get(`/user/pets/${autoJournalPetId}/journeys`);
                if (isMounted && res.data) {
                    const list = Array.isArray(res.data) ? res.data : (res.data.journeys || []);
                    setPetJourneys(list);
                }
            } catch {
                if (isMounted) setPetJourneys([]);
            }
        };
        fetchJourneys();
        setAutoJournalJourneyId('');
        return () => {
            isMounted = false;
        };
    }, [autoJournalPetId]);

    // Autosave Simulation
    useEffect(() => {
        const timer = setInterval(() => {
            const now = new Date();
            const hh = String(now.getHours()).padStart(2, '0');
            const mm = String(now.getMinutes()).padStart(2, '0');
            setAutoSaveTime(`${hh}:${mm}`);
        }, 30000);
        return () => clearInterval(timer);
    }, []);

    // Official Products Search
    const fetchOfficialProducts = async (keyword = '') => {
        setIsSearchingProducts(true);
        try {
            const res = await axiosInstance.get(`/product/search?q=${encodeURIComponent(keyword)}`);
            if (res.data?.products) {
                setOfficialProducts(res.data.products);
            }
        } catch (e) {
            console.error('Product search error:', e);
        } finally {
            setIsSearchingProducts(false);
        }
    };

    // =========================================================================
    // Point 3: Draft Loading & Saving Handlers
    // =========================================================================

    const handleLoadDraft = (target?: { data: PostEditorData; savedAt: string } | null) => {
        const targetDraft = target || savedDraft;
        if (!targetDraft?.data) return;
        const d = targetDraft.data;
        if (d.postId) setCurrentPostId(d.postId);
        if (d.board_id) setBoardId(d.board_id);
        if (d.title !== undefined) setTitle(d.title || '');
        if (d.blocks && d.blocks.length > 0) setBlocks(d.blocks);
        if (d.selectedPets) setSelectedPets(d.selectedPets);
        if (d.tags) setTags(d.tags);
        setDraftModalOpen(false);

        toaster.create({
            title: '임시 저장된 글을 성공적으로 불러왔습니다.',
            description: targetDraft.savedAt
                ? `${new Date(targetDraft.savedAt).toLocaleString('ko-KR')} 저장본`
                : '',
            type: 'success',
        });
    };

    const handleDiscardDraft = async (target?: { data: PostEditorData; savedAt: string } | null) => {
        const targetDraft = target || pendingDeleteDraft || savedDraft;
        const draftPostId = targetDraft?.data?.postId || currentPostId;
        if (draftPostId && isAuthenticated()) {
            try {
                await axiosInstance.delete(`/post/draft/${draftPostId}`);
            } catch (e) {
                console.error('Delete server draft error:', e);
            }
        }
        const remaining = savedDrafts.filter(
            (item) => String(item.data?.postId || '') !== String(draftPostId || '')
        );
        setSavedDrafts(remaining);
        setSavedDraft(remaining[0] || null);
        if (currentPostId && String(currentPostId) === String(draftPostId)) {
            setCurrentPostId(null);
        }
        if (remaining.length === 0) {
            if (typeof window !== 'undefined') {
                localStorage.removeItem(DRAFT_STORAGE_KEY);
            }
            setDraftModalOpen(false);
        }
        toaster.create({ title: '임시 저장 글이 삭제되었습니다.', type: 'info' });
    };

    const handleSaveCurrentDraft = async () => {
        // 이미지 블록에 등록된 모든 PET 핀의 pet_id 수집 및 selectedPets 병합 (중복 제거)
        const petPinIds = blocks
            .flatMap((b) => (b.type === 'image' ? b.pins : []))
            .filter((p) => p.pin_type === 'PET' && p.pet_id)
            .map((p) => String(p.pet_id));

        const mergedSelectedPets = Array.from(new Set([...selectedPets, ...petPinIds]));
        const shouldAutoJournal = mergedSelectedPets.length > 0 && autoJournal;

        const payload: PostEditorData = {
            postId: currentPostId || undefined,
            board_id: boardId,
            title: title.trim(),
            blocks,
            selectedPets: mergedSelectedPets,
            tags,
            auto_journal: shouldAutoJournal,
            auto_journal_pet_id: shouldAutoJournal ? (autoJournalPetId || mergedSelectedPets[0] || null) : null,
            auto_journal_journey_id: shouldAutoJournal && autoJournalJourneyId ? autoJournalJourneyId : null,
        };
        const draftObj = { data: payload, savedAt: new Date().toISOString() };
        if (typeof window !== 'undefined') {
            localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draftObj));
        }
        setSavedDraft(draftObj);
        setDraftModalOpen(false);

        let finalDraftObj = draftObj;
        if (onSaveDraft) {
            const newDraftId = await onSaveDraft(payload, currentPostId || undefined);
            if (newDraftId) {
                setCurrentPostId(newDraftId);
                finalDraftObj = { ...draftObj, data: { ...draftObj.data, postId: newDraftId } };
                setSavedDraft(finalDraftObj);
            }
        }
        setSavedDrafts((prev) => {
            const id = finalDraftObj.data.postId;
            if (!id) return [finalDraftObj, ...prev];
            const exists = prev.some((item) => String(item.data.postId || '') === String(id));
            return exists
                ? prev.map((item) => (String(item.data.postId || '') === String(id) ? finalDraftObj : item))
                : [finalDraftObj, ...prev];
        });

        toaster.create({
            title: '현재 작성 중인 글이 임시 저장되었습니다.',
            description: `현재 시각 (${autoSaveTime}) 기준 보관함에 안전하게 저장되었습니다.`,
            type: 'success',
        });
    };

    // =========================================================================
    // Image Upload & Optimization (Rule Compliance: max 1500px, 72DPI, WebP)
    // =========================================================================

    const triggerImageUpload = (insertIndex?: number) => {
        setInsertIndexTarget(insertIndex !== undefined ? insertIndex : null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
            fileInputRef.current.click();
        }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        setIsModeratingImages(true);
        toaster.create({
            title: '이미지 확인 중...',
            type: 'info',
        });

        try {
            const processed = await Promise.all(files.map((file) => processImageClient(file)));

            let moderationResults: Array<{ blocked?: boolean; is_sensitive?: boolean }> = [];
            try {
                const formData = new FormData();
                processed.forEach(({ optimizedFile }) => {
                    formData.append('images', optimizedFile);
                });
                const res = await axiosInstance.post('/post/moderate-image', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                    timeout: 15000,
                });
                moderationResults = res.data?.results || res.data?.data?.results || [];
            } catch {
                // Fail-open: API 통신 오류/타임아웃 시 정상 첨부 (등록 시 서버에서 재검사)
                moderationResults = [];
            }

            let hasBlocked = false;
            let hasSensitive = false;
            const blocksToInsert: EditorBlock[] = [];
            const baseTimestamp = Date.now();

            processed.forEach(({ optimizedFile, previewUrl }, idx) => {
                const result = moderationResults[idx];
                if (result?.blocked === true) {
                    hasBlocked = true;
                    URL.revokeObjectURL(previewUrl);
                    return;
                }

                const isSensitive = Boolean(result?.is_sensitive);
                if (isSensitive) {
                    hasSensitive = true;
                }

                const newImageBlock: EditorImageBlock = {
                    id: `block-image-${baseTimestamp}-${idx}`,
                    type: 'image',
                    previewUrl,
                    file: optimizedFile,
                    caption: '',
                    is_sensitive: isSensitive,
                    pins: [],
                };

                blocksToInsert.push(newImageBlock);
            });

            if (blocksToInsert.length > 0) {
                setBlocks((prev) => {
                    if (insertIndexTarget !== null && insertIndexTarget >= 0) {
                        const next = [...prev];
                        next.splice(insertIndexTarget + 1, 0, ...blocksToInsert);
                        return next;
                    }
                    return [...prev, ...blocksToInsert];
                });
            }

            if (hasBlocked) {
                toaster.create({
                    title: '선정적이거나 부적절한 이미지는 첨부할 수 없습니다.',
                    type: 'error',
                });
            }
            if (hasSensitive) {
                toaster.create({
                    title: '일부 이미지가 민감한 이미지로 분류되어 게시 시 가림 처리됩니다.',
                    type: 'warning',
                });
            } else if (!hasBlocked && blocksToInsert.length > 0) {
                toaster.create({
                    title: '사진이 추가되었습니다.',
                    type: 'success',
                });
            }
        } catch (err) {
            toaster.create({
                title: '이미지 처리 중 오류가 발생했습니다.',
                type: 'error',
            });
        } finally {
            setIsModeratingImages(false);
        }
    };

    const processImageClient = (file: File): Promise<{ optimizedFile: File; previewUrl: string }> => {
        return new Promise((resolve) => {
            const img = new window.Image();
            const reader = new FileReader();
            reader.onload = (event) => {
                img.src = event.target?.result as string;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let { width, height } = img;
                    const maxW = 1500;
                    if (width > maxW) {
                        height = Math.round((height * maxW) / width);
                        width = maxW;
                    }
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    if (ctx) {
                        ctx.drawImage(img, 0, 0, width, height);
                        canvas.toBlob(
                            (blob) => {
                                if (blob) {
                                    const convertedFile = new File(
                                        [blob],
                                        file.name.replace(/\.[^/.]+$/, '') + '.webp',
                                        { type: 'image/webp' }
                                    );
                                    resolve({
                                        optimizedFile: convertedFile,
                                        previewUrl: URL.createObjectURL(blob),
                                    });
                                    return;
                                }
                                resolve({ optimizedFile: file, previewUrl: URL.createObjectURL(file) });
                            },
                            'image/webp',
                            0.85
                        );
                    } else {
                        resolve({ optimizedFile: file, previewUrl: URL.createObjectURL(file) });
                    }
                };
            };
            reader.readAsDataURL(file);
        });
    };

    // =========================================================================
    // Unified Continuous Editor Flow Handlers
    // =========================================================================

    const updateTextBlock = (id: string, content: string) => {
        setBlocks((prev) =>
            prev.map((b) => (b.id === id && b.type === 'text' ? { ...b, content } : b))
        );
    };

    const handleAppendTextBlock = () => {
        const newId = `block-text-${Date.now()}`;
        setBlocks((prev) => [
            ...prev,
            {
                id: newId,
                type: 'text',
                content: '',
                format: 'p',
            },
        ]);
        setAutoFocusBlockId(newId);
    };

    const updateImageCaption = (id: string, caption: string) => {
        setBlocks((prev) =>
            prev.map((b) => (b.id === id && b.type === 'image' ? { ...b, caption } : b))
        );
    };

    const moveImageBlock = (index: number, direction: 'up' | 'down') => {
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= blocks.length) return;

        setBlocks((prev) => {
            const next = [...prev];
            const [moved] = next.splice(index, 1);
            next.splice(targetIndex, 0, moved);
            return next;
        });
    };

    const removeImageBlock = (id: string) => {
        setBlocks((prev) => prev.filter((b) => b.id !== id));
        toaster.create({ title: '사진이 삭제되었습니다.', type: 'info' });
    };

    // =========================================================================
    // Interactive Product & Pet Pin Dropping
    // =========================================================================

    const handleImageClickToPin = (
        e: React.MouseEvent<HTMLDivElement>,
        blockId: string
    ) => {
        // 이미 열려있는 핀 팝오버가 있다면 사진 클릭 시 팝오버를 먼저 닫음
        if (activePinId) {
            setActivePinId(null);
            return;
        }

        const rect = e.currentTarget.getBoundingClientRect();
        const x = Math.round(((e.clientX - rect.left) / rect.width) * 100);
        const y = Math.round(((e.clientY - rect.top) / rect.height) * 100);

        setTargetImageBlockId(blockId);
        setPinCoords({ x: Math.min(Math.max(x, 5), 95), y: Math.min(Math.max(y, 5), 95) });

        // RESET PIN FORM TO COMPLETELY CLEAN STATE
        setSelectedOfficialProduct(null);
        setProductSearchKeyword('');
        setExternalUrlInput('');
        setAnalyzedExternalUrl('');
        setParsedMetadata(null);
        setManualExternalFallback(false);
        setSelectedPetForPin(null);
        setPinOptionMemo('');

        setPinTypeTab('INTERNAL_PRODUCT');
        setPinModalOpen(true);
    };

    const handleParseExternalUrl = async () => {
        const trimmedInput = externalUrlInput.trim();
        if (!trimmedInput) {
            toaster.create({ title: '외부 쇼핑몰 URL을 입력해주세요.', type: 'error' });
            return;
        }

        setIsParsingUrl(true);
        setAnalyzedExternalUrl('');
        setParsedMetadata(null);
        try {
            const res = await axiosInstance.post('/post/parse-url', { url: trimmedInput });
            if (res.data?.success) {
                const resolvedUrl = (res.data.url || trimmedInput).trim();
                if (res.data.url) {
                    setExternalUrlInput(res.data.url);
                }
                setAnalyzedExternalUrl(resolvedUrl);
                setParsedMetadata({
                    product_name: res.data.product_name,
                    brand_name: res.data.brand_name || (res.data.partners_url ? '쿠팡' : '외부 제휴'),
                    price: res.data.price || 0,
                    thumbnail_url: res.data.thumbnail_url,
                });
                setManualExternalFallback(false);
                toaster.create({
                    title: res.data.partners_url
                        ? '쿠팡 파트너스 수익 링크로 자동 변환되었습니다!'
                        : '상품 메타데이터를 성공적으로 가져왔습니다!',
                    description: res.data.product_name,
                    type: 'success',
                });
            } else {
                const resolvedUrl = (res.data?.partners_url || res.data?.url || trimmedInput).trim();
                if (res.data?.partners_url || res.data?.url) {
                    setExternalUrlInput(res.data.partners_url || res.data.url);
                }
                setAnalyzedExternalUrl(resolvedUrl);
                setManualExternalFallback(true);
                setParsedMetadata({
                    product_name: '',
                    brand_name: res.data?.partners_url ? '쿠팡' : '외부 제휴',
                    price: 0,
                });
                toaster.create({
                    title: res.data?.partners_url
                        ? '쿠팡 파트너스 수익 링크로 자동 변환되었습니다!'
                        : '메타데이터를 자동으로 가져올 수 없습니다.',
                    description: res.data?.partners_url
                        ? '수익 링크가 생성되었습니다. 상품명과 가격을 입력해주세요.'
                        : '아래 입력창에 상품명과 가격을 직접 입력해주세요.',
                    type: res.data?.partners_url ? 'success' : 'info',
                });
            }
        } catch (e: any) {
            setAnalyzedExternalUrl('');
            setManualExternalFallback(false);
            setParsedMetadata(null);
            const serverMessage = e?.response?.data?.message;
            toaster.create({
                title: serverMessage || 'URL 분석에 실패했습니다. 허용된 쇼핑몰 링크인지 확인해주세요.',
                type: 'error',
            });
        } finally {
            setIsParsingUrl(false);
        }
    };

    const handleSavePin = () => {
        if (!targetImageBlockId) return;

        let newPin: EditorImagePin | null = null;

        if (pinTypeTab === 'INTERNAL_PRODUCT') {
            if (!selectedOfficialProduct) {
                toaster.create({ title: '와바미 공식 상품을 선택해주세요.', type: 'error' });
                return;
            }
            newPin = {
                pin_id: `pin-${Date.now()}`,
                pin_type: 'INTERNAL_PRODUCT',
                is_official: true,
                product_id: selectedOfficialProduct.id,
                product_name: selectedOfficialProduct.name,
                brand_name: 'WABAMI',
                price: selectedOfficialProduct.sale_price,
                thumbnail_url: selectedOfficialProduct.thumbnail_url,
                pos_x: pinCoords.x,
                pos_y: pinCoords.y,
                pin_option_memo: pinOptionMemo.trim(),
            };
        } else if (pinTypeTab === 'EXTERNAL_PRODUCT') {
            if (!analyzedExternalUrl || externalUrlInput.trim() !== analyzedExternalUrl) {
                toaster.create({ title: "외부 링크 입력 후 'URL 분석'을 먼저 완료해주세요.", type: 'error' });
                return;
            }
            if (!parsedMetadata?.product_name?.trim()) {
                toaster.create({ title: '상품명을 입력해주세요.', type: 'error' });
                return;
            }
            newPin = {
                pin_id: `pin-${Date.now()}`,
                pin_type: 'EXTERNAL_PRODUCT',
                is_official: false,
                product_name: parsedMetadata.product_name.trim(),
                brand_name: parsedMetadata.brand_name || '외부 제휴',
                price: Number(parsedMetadata.price) || 0,
                product_url: externalUrlInput.trim(),
                thumbnail_url: parsedMetadata.thumbnail_url,
                pos_x: pinCoords.x,
                pos_y: pinCoords.y,
                pin_option_memo: pinOptionMemo.trim(),
            };
        } else if (pinTypeTab === 'PET') {
            if (!selectedPetForPin) {
                toaster.create({ title: '태그할 반려동물을 선택해주세요.', type: 'error' });
                return;
            }
            const hasWeight = selectedPetForPin.latest_weight_kg !== null && selectedPetForPin.latest_weight_kg !== undefined && Number(selectedPetForPin.latest_weight_kg) > 0;
            const weightText = hasWeight ? `${Number(selectedPetForPin.latest_weight_kg).toFixed(1)}kg` : '';
            const desc = [selectedPetForPin.breed, weightText].filter(Boolean).join(', ');
            const petProductName = desc ? `${selectedPetForPin.name} (${desc})` : selectedPetForPin.name;

            newPin = {
                pin_id: `pin-${Date.now()}`,
                pin_type: 'PET',
                is_official: false,
                pet_id: selectedPetForPin.id,
                product_name: petProductName,
                brand_name: '반려동물 태그',
                thumbnail_url: selectedPetForPin.current_avatar_url,
                pos_x: pinCoords.x,
                pos_y: pinCoords.y,
                pin_option_memo: pinOptionMemo.trim(),
            };

            // 선택된 펫이 상단 동반 반려동물 목록에 없으면 자동 추가
            if (selectedPetForPin.id) {
                setSelectedPets((prev) =>
                    prev.includes(selectedPetForPin.id) ? prev : [...prev, selectedPetForPin.id]
                );
            }
        }

        if (!newPin) return;

        setBlocks((prev) =>
            prev.map((b) => {
                if (b.id === targetImageBlockId && b.type === 'image') {
                    return { ...b, pins: [...b.pins, newPin!] };
                }
                return b;
            })
        );

        setPinModalOpen(false);
        setTargetImageBlockId(null);
        toaster.create({
            title: '사진 위에 핀이 성공적으로 등록되었습니다.',
            type: 'success',
        });
    };

    const removePinFromImage = (blockId: string, pinId: string, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        setBlocks((prev) =>
            prev.map((b) => {
                if (b.id === blockId && b.type === 'image') {
                    return { ...b, pins: b.pins.filter((p) => p.pin_id !== pinId) };
                }
                return b;
            })
        );
        toaster.create({ title: '핀이 삭제되었습니다.', type: 'info' });
    };

    // =========================================================================
    // Tags Management
    // =========================================================================

    const handleAddTag = () => {
        const clean = newTagInput.replace(/#/g, '').trim();
        if (!clean) return;
        if (tags.includes(clean)) {
            toaster.create({ title: '이미 등록된 태그입니다.', type: 'info' });
            return;
        }
        setTags([...tags, clean]);
        setNewTagInput('');
    };

    const handleRemoveTag = (tagToRemove: string) => {
        setTags(tags.filter((t) => t !== tagToRemove));
    };

    // =========================================================================
    // Point 2: Connected Products Strictly EXCLUDE PET Pins!
    // =========================================================================

    const allProductPins = blocks
        .flatMap((b) => (b.type === 'image' ? b.pins : []))
        .filter((pin) => pin.pin_type !== 'PET');

    const productPinsCount = allProductPins.length;
    const totalImagesCount = blocks.filter((b) => b.type === 'image').length;
    const isMultiSpecies = selectedPets.length >= 2;

    const calculatedPoints =
        (totalImagesCount >= 1 ? 500 : (title.trim() || blocks.some((b) => b.type === 'text' && b.content.trim()) ? 100 : 0)) +
        productPinsCount * 200 +
        (isMultiSpecies ? 600 : 0);

    const isTitleValid = title.trim().length >= 5;
    const isContentValid =
        blocks.reduce(
            (len, b) => (b.type === 'text' ? len + b.content.trim().length : len),
            0
        ) >= 30;
    const isImageValid = totalImagesCount >= 1;
    const isPinValid = productPinsCount >= 1;

    let readinessPercentage = 0;
    if (isTitleValid) readinessPercentage += 25;
    if (isContentValid) readinessPercentage += 25;
    if (isImageValid) readinessPercentage += 25;
    if (isPinValid) readinessPercentage += 25;

    // =========================================================================
    // Publish Handler (Clears Draft upon success)
    // =========================================================================

    const handlePublishClick = async () => {
        if (isModeratingImages) return;
        if (!isAuthenticated()) {
            setLoginModalOpen(true);
            return;
        }

        if (!boardId) {
            toaster.create({ title: '카테고리를 선택해주세요.', type: 'error' });
            categorySectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setHighlightCategory(true);
            setTimeout(() => setHighlightCategory(false), 1800);
            return;
        }

        if (!title.trim()) {
            toaster.create({ title: '게시글 제목을 입력해주세요.', type: 'error' });
            return;
        }

        // 이미지 블록에 등록된 모든 PET 핀의 pet_id 수집 및 selectedPets 병합 (중복 제거)
        const petPinIds = blocks
            .flatMap((b) => (b.type === 'image' ? b.pins : []))
            .filter((p) => p.pin_type === 'PET' && p.pet_id)
            .map((p) => String(p.pet_id));

        const mergedSelectedPets = Array.from(new Set([...selectedPets, ...petPinIds]));
        const shouldAutoJournal = mergedSelectedPets.length > 0 && autoJournal;

        const payload: PostEditorData = {
            postId: currentPostId || undefined,
            board_id: boardId,
            title: title.trim(),
            blocks,
            selectedPets: mergedSelectedPets,
            tags,
            auto_journal: shouldAutoJournal,
            auto_journal_pet_id: shouldAutoJournal ? (autoJournalPetId || mergedSelectedPets[0] || null) : null,
            auto_journal_journey_id: shouldAutoJournal && autoJournalJourneyId ? autoJournalJourneyId : null,
        };

        if (onSubmit) {
            await onSubmit(payload, currentPostId || undefined);
            // Clear draft from localStorage on publish
            if (typeof window !== 'undefined') {
                localStorage.removeItem(DRAFT_STORAGE_KEY);
            }
            setSavedDraft(null);
            setCurrentPostId(null);
        } else {
            if (typeof window !== 'undefined') {
                localStorage.removeItem(DRAFT_STORAGE_KEY);
            }
            setSavedDraft(null);
            setCurrentPostId(null);
            toaster.create({
                title: mode === 'edit' ? '게시글이 수정되었습니다.' : '새 게시글이 발행되었습니다!',
                description: `+${calculatedPoints.toLocaleString()}P 리워드가 적립되었습니다.`,
                type: 'success',
            });
            setTimeout(() => {
                router.push('/');
            }, 1000);
        }
    };

    const firstImageBlock = blocks.find((b): b is EditorImageBlock => b.type === 'image');
    const firstImagePreview = firstImageBlock?.previewUrl || null;

    return (
        <Box minH="100vh" bg="var(--waba-bg)" color="var(--waba-ink)" pb={20} w="100%" overflowX="clip" minW={0}>
            {/* Hidden File Input for Image Upload */}
            <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                accept="image/*"
                onChange={handleFileChange}
            />

            {/* Non-member Login Modal */}
            <MemberModal open={loginModalOpen} onOpenChange={setLoginModalOpen} showTrigger={false} />

            {/* ================================================================= */}
            {/* 1. TOP STICKY APP BAR (Focused Studio Action Header)              */}
            {/* ================================================================= */}
            <Box
                position="sticky"
                top={0}
                zIndex={35}
                bg="var(--waba-bg)"
                borderBottom="1px solid"
                borderColor="var(--waba-line)"
                px={{ base: 4, lg: 8 }}
                py={3}
            >
                <Flex maxW="1240px" mx="auto" align="center" justify="space-between" gap={2} flexWrap="wrap">
                    <HStack gap={{ base: 2, sm: 3 }}>
                        <IconButton
                            aria-label="뒤로가기"
                            onClick={() => {
                                if (typeof window !== 'undefined' && window.history.length > 1) {
                                    router.back();
                                } else {
                                    router.push('/');
                                }
                            }}
                            rounded="full"
                            variant="outline"
                            borderColor="var(--waba-line)"
                            bg="var(--waba-card)"
                            color="var(--waba-ink)"
                            size="sm"
                        >
                            <ArrowLeft size={16} />
                        </IconButton>
                        <Heading fontSize={{ base: '16px', md: '18px' }} fontWeight="800" color="var(--waba-ink)" letterSpacing="-0.02em">
                            {mode === 'edit' ? '기록 수정' : '새 기록 작성'}
                        </Heading>
                        <HStack gap={1.5} fontSize="12px" color="var(--waba-ink-3)" pl={1} display={{ base: 'none', md: 'flex' }}>
                            <Box w="7px" h="7px" rounded="full" bg="emerald.500" />
                            <Text>{autoSaveTime} 자동 저장됨</Text>
                        </HStack>
                    </HStack>

                    <HStack gap={2} flexWrap="wrap">
                        {mode !== 'edit' && (
                            <Button
                                variant="outline"
                                borderColor={savedDrafts.length > 0 || Boolean(savedDraft) ? 'var(--waba-purple-border)' : 'var(--waba-line)'}
                                bg={savedDrafts.length > 0 || Boolean(savedDraft) ? 'var(--waba-purple-soft)' : 'var(--waba-card)'}
                                color={savedDrafts.length > 0 || Boolean(savedDraft) ? 'var(--waba-purple-text)' : 'var(--waba-ink-2)'}
                                rounded="full"
                                size="sm"
                                px={{ base: 3, md: 4 }}
                                fontSize="12px"
                                fontWeight="600"
                                onClick={() => setDraftModalOpen(true)}
                            >
                                <Bookmark size={14} />
                                임시저장 {savedDrafts.length > 0 ? `(${savedDrafts.length})` : savedDraft ? '(1)' : ''}
                            </Button>
                        )}
                        <Button
                            variant="outline"
                            borderColor="var(--waba-line)"
                            bg="var(--waba-card)"
                            color="var(--waba-ink)"
                            rounded="full"
                            size="sm"
                            px={{ base: 3, md: 4 }}
                            fontSize="12px"
                            fontWeight="600"
                            onClick={() => setPreviewModalOpen(true)}
                        >
                            <Eye size={14} />
                            미리보기
                        </Button>
                        <Button
                            bg="#6338A9"
                            color="#FFFFFF"
                            _hover={{ bg: '#522B8F' }}
                            rounded="full"
                            size="sm"
                            px={{ base: 4, md: 5 }}
                            fontSize="12px"
                            fontWeight="700"
                            onClick={handlePublishClick}
                            loading={isSubmitting || isModeratingImages}
                            disabled={isSubmitting || isModeratingImages}
                        >
                            {mode === 'edit' ? '수정 완료' : '발행하기'}
                            <ArrowRight size={14} />
                        </Button>
                    </HStack>
                </Flex>
            </Box>

            {/* ================================================================= */}
            {/* 2. MAIN WORKSPACE (Editor Canvas + Right Utility Sidebar)         */}
            {/* ================================================================= */}
            <Container maxW="1240px" px={{ base: 4, md: 6, lg: 8 }} py={{ base: 5, md: 8 }} minW={0}>
                <Flex direction={{ base: 'column', lg: 'row' }} gap={{ base: 6, lg: 8 }} align="flex-start" minW={0}>
                    {/* [LEFT] Continuous Unified Flow Canvas */}
                    <Box
                        flex="1"
                        w="100%"
                        minW={0}
                        bg="var(--waba-card)"
                        rounded="24px"
                        border="1px solid"
                        borderColor="var(--waba-line)"
                        p={{ base: 5, md: 8 }}
                    >
                        {/* Saved Draft Top Callout Banner */}

                        {/* Category Selector Chips (제목 바로 위) */}
                        <Box
                            ref={categorySectionRef}
                            mb={4}
                            p={highlightCategory ? 3 : 0}
                            rounded="16px"
                            border="1.5px solid"
                            borderColor={highlightCategory ? 'red.400' : 'transparent'}
                            bg={highlightCategory ? 'rgba(239, 68, 68, 0.06)' : 'transparent'}
                            transition="all 0.2s ease"
                        >
                            <Text fontSize="11px" fontWeight="700" color={highlightCategory ? 'red.500' : 'var(--waba-ink-3)'} mb={2}>
                                카테고리 선택 {highlightCategory ? '(필수)' : ''}
                            </Text>
                            <HStack gap={2} flexWrap="wrap">
                                {[
                                    { id: 'SNAP', name: '일상 스냅' },
                                    { id: 'LOOKBOOK', name: '공식 룩북' },
                                    { id: 'CARE_LOUNGE', name: '케어 라운지' },
                                    { id: 'QNA', name: '궁금증 Q&A' },
                                ].map((b) => {
                                    const isSelected = boardId === b.id;
                                    return (
                                        <Button
                                            key={b.id}
                                            size="xs"
                                            h="32px"
                                            rounded="full"
                                            px={3.5}
                                            fontSize="12px"
                                            fontWeight="700"
                                            bg={isSelected ? '#6338A9' : 'var(--waba-surface)'}
                                            color={isSelected ? '#FFFFFF' : 'var(--waba-ink-2)'}
                                            border="1px solid"
                                            borderColor={isSelected ? '#6338A9' : 'var(--waba-line)'}
                                            _hover={{
                                                bg: isSelected ? '#522B8F' : 'var(--waba-purple-soft)',
                                            }}
                                            onClick={() => {
                                                setBoardId(b.id);
                                                setHighlightCategory(false);
                                            }}
                                            transition="all 0.15s ease"
                                        >
                                            {isSelected && <Check size={13} />}
                                            {b.name}
                                        </Button>
                                    );
                                })}
                            </HStack>
                        </Box>

                        {/* Title Input */}
                        <Box mb={4}>
                            <Input
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="제목을 입력하세요..."
                                fontSize={{ base: '22px', md: '26px' }}
                                fontWeight="800"
                                color="var(--waba-ink)"
                                letterSpacing="-0.03em"
                                border="none"
                                outline="none"
                                px={0}
                                py={1}
                                _focus={{ outline: 'none', boxShadow: 'none' }}
                                _placeholder={{ color: 'var(--waba-ink-3)' }}
                            />
                            <HStack
                                gap={3}
                                fontSize="12px"
                                color="var(--waba-ink-3)"
                                mt={2}
                                pt={3}
                                borderTop="1px solid"
                                borderColor="var(--waba-line)"
                                flexWrap="wrap"
                            >
                                <Text fontWeight="600">작성자: @{currentUser?.nickname || '크리에이터'}</Text>
                                <Text>•</Text>
                                <Text>{new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })} 작성 중</Text>
                                <Text>•</Text>
                                <Text>
                                    읽는 시간 약 {Math.max(1, Math.ceil(blocks.reduce((acc, b) => (b.type === 'text' ? acc + b.content.trim().length : acc), 0) / 300))}분
                                </Text>
                            </HStack>
                        </Box>

                        {/* Photo Insert Toolbar (+ 사진 추가만 유지) */}
                        <Box
                            position="sticky"
                            top="68px"
                            zIndex={25}
                            bg="var(--waba-surface)"
                            border="1px solid"
                            borderColor="var(--waba-line)"
                            px={3.5}
                            py={2}
                            rounded="full"
                            mb={6}
                            maxW="fit-content"
                        >
                            <HStack gap={2}>
                                <Button
                                    size="xs"
                                    bg="#6338A9"
                                    _hover={{ bg: '#522B8F' }}
                                    color="white"
                                    rounded="full"
                                    px={3.5}
                                    fontSize="12px"
                                    fontWeight="700"
                                    onClick={() => triggerImageUpload(blocks.length - 1)}
                                >
                                    <ImageIcon size={14} />
                                    + 사진 추가
                                </Button>
                                <Text fontSize="12px" color="var(--waba-ink-3)" px={1} display={{ base: 'none', sm: 'block' }}>
                                    사진 추가 후 클릭해 상품·반려동물 핀을 태그할 수 있어요
                                </Text>
                            </HStack>
                        </Box>

                        {/* Continuous Story Writing Canvas */}
                        <EditorBlockList
                            blocks={blocks}
                            activePinId={activePinId}
                            autoFocusBlockId={autoFocusBlockId}
                            onSetActivePinId={setActivePinId}
                            onUpdateTextBlock={updateTextBlock}
                            onUpdateImageCaption={updateImageCaption}
                            onMoveImageBlock={moveImageBlock}
                            onRemoveImageBlock={removeImageBlock}
                            onImageClickToPin={handleImageClickToPin}
                            onRemovePinFromImage={removePinFromImage}
                            onAppendTextBlock={handleAppendTextBlock}
                        />
                    </Box>

                    {/* [RIGHT] Utility Sidebar: AI 건강 수첩 자동 기록 + 태그 설정 */}
                    <Box
                        w={{ base: '100%', lg: '340px' }}
                        flexShrink={0}
                        position={{ base: 'static', lg: 'sticky' }}
                        top="76px"
                        display="flex"
                        flexDirection="column"
                        gap={5}
                        minW={0}
                    >
                        {/* 1) 동반 반려동물 선택 카드 */}
                        <Box
                            bg="var(--waba-card)"
                            rounded="20px"
                            border="1px solid"
                            borderColor="var(--waba-line)"
                            p={5}
                        >
                            <Text fontSize="14px" fontWeight="800" color="var(--waba-ink)" mb={1}>
                                🐾 동반 반려동물 선택
                            </Text>
                            <Text fontSize="12px" color="var(--waba-ink-3)" mb={3}>
                                함께 기록할 아이를 선택하면 AI 건강 수첩과 연동됩니다.
                            </Text>
                            {userPetsList.length === 0 ? (
                                <Text fontSize="12px" color="var(--waba-ink-3)">
                                    등록된 반려동물이 없습니다.
                                </Text>
                            ) : (
                                <HStack gap={2} flexWrap="wrap">
                                    {userPetsList.map((pet) => {
                                        const isChecked = selectedPets.includes(pet.id);
                                        const speciesIcon = pet.species === 'CAT' ? '🐱' : pet.species === 'DOG' ? '🐶' : pet.species === 'RABBIT' ? '🐰' : '🐾';
                                        return (
                                            <Box
                                                key={pet.id}
                                                as="button"
                                                onClick={() => {
                                                    setSelectedPets((prev) =>
                                                        isChecked ? prev.filter((id) => id !== pet.id) : [...prev, pet.id]
                                                    );
                                                }}
                                                display="inline-flex"
                                                alignItems="center"
                                                gap={1.5}
                                                bg={isChecked ? 'var(--waba-purple-soft)' : 'var(--waba-surface)'}
                                                border="1px solid"
                                                borderColor={isChecked ? 'var(--waba-purple-border)' : 'var(--waba-line)'}
                                                color={isChecked ? 'var(--waba-purple-text)' : 'var(--waba-ink-2)'}
                                                px={3}
                                                py={1.5}
                                                rounded="full"
                                                fontSize="12px"
                                                fontWeight="600"
                                                cursor="pointer"
                                            >
                                                {isChecked ? <Check size={13} /> : <span>{speciesIcon}</span>}
                                                <span>{pet.name}</span>
                                            </Box>
                                        );
                                    })}
                                </HStack>
                            )}
                        </Box>

                        {/* 2) ✨ AI 건강 수첩 자동 기록 카드 */}
                        <AutoJournalCard
                            autoJournal={autoJournal}
                            onAutoJournalChange={setAutoJournal}
                            autoJournalPetId={autoJournalPetId}
                            onAutoJournalPetIdChange={setAutoJournalPetId}
                            autoJournalJourneyId={autoJournalJourneyId}
                            onAutoJournalJourneyIdChange={setAutoJournalJourneyId}
                            userPetsList={userPetsList}
                            petJourneys={petJourneys}
                        />

                        {/* 3) 태그 설정 카드 */}
                        <Box
                            bg="var(--waba-card)"
                            rounded="20px"
                            border="1px solid"
                            borderColor="var(--waba-line)"
                            p={5}
                        >
                            <Text fontSize="14px" fontWeight="800" color="var(--waba-ink)" mb={1}>
                                🏷️ 태그 설정
                            </Text>
                            <Text fontSize="12px" color="var(--waba-ink-3)" mb={3}>
                                검색과 큐레이션에 활용되는 키워드를 추가해 보세요.
                            </Text>

                            <HStack gap={1.5} mb={tags.length > 0 ? 3 : 0}>
                                <Input
                                    value={newTagInput}
                                    onChange={(e) => setNewTagInput(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            handleAddTag();
                                        }
                                    }}
                                    placeholder="태그 입력 후 Enter"
                                    size="sm"
                                    rounded="full"
                                    bg="var(--waba-surface)"
                                    borderColor="var(--waba-line)"
                                    color="var(--waba-ink)"
                                    fontSize="12px"
                                />
                                <Button
                                    size="sm"
                                    rounded="full"
                                    bg="#6338A9"
                                    color="white"
                                    _hover={{ bg: '#522B8F' }}
                                    onClick={handleAddTag}
                                    fontSize="12px"
                                    fontWeight="700"
                                    px={4}
                                    flexShrink={0}
                                >
                                    추가
                                </Button>
                            </HStack>

                            {tags.length > 0 && (
                                <Flex flexWrap="wrap" gap={1.5}>
                                    {tags.map((tag) => (
                                        <Box
                                            key={tag}
                                            display="inline-flex"
                                            alignItems="center"
                                            gap={1}
                                            bg="var(--waba-purple-soft)"
                                            border="1px solid"
                                            borderColor="var(--waba-purple-border)"
                                            px={2.5}
                                            py={1}
                                            rounded="full"
                                            fontSize="12px"
                                            fontWeight="600"
                                            color="var(--waba-purple-text)"
                                        >
                                            #{tag}
                                            <CloseButton
                                                size="2xs"
                                                rounded="full"
                                                color="var(--waba-purple-text)"
                                                onClick={() => handleRemoveTag(tag)}
                                            />
                                        </Box>
                                    ))}
                                </Flex>
                            )}
                        </Box>
                    </Box>
                </Flex>
            </Container>

            {/* ================================================================= */}
            {/* 4. PIN TAG DIALOG MODAL (Clean UX, Search, URL Parser, Pets API) */}
            {/* ================================================================= */}
            <PinRegistrationModal
                open={pinModalOpen}
                onClose={() => {
                    setPinModalOpen(false);
                    setAnalyzedExternalUrl('');
                }}
                pinCoords={pinCoords}
                pinTypeTab={pinTypeTab}
                onPinTypeTabChange={setPinTypeTab}
                productSearchKeyword={productSearchKeyword}
                onProductSearchKeywordChange={setProductSearchKeyword}
                onFetchOfficialProducts={fetchOfficialProducts}
                isSearchingProducts={isSearchingProducts}
                officialProducts={officialProducts}
                selectedOfficialProduct={selectedOfficialProduct}
                onSelectOfficialProduct={setSelectedOfficialProduct}
                externalUrlInput={externalUrlInput}
                onExternalUrlInputChange={setExternalUrlInput}
                analyzedExternalUrl={analyzedExternalUrl}
                isParsingUrl={isParsingUrl}
                onParseExternalUrl={handleParseExternalUrl}
                parsedMetadata={parsedMetadata}
                onParsedMetadataChange={setParsedMetadata}
                manualExternalFallback={manualExternalFallback}
                onManualExternalFallbackChange={setManualExternalFallback}
                userPetsList={userPetsList}
                selectedPetForPin={selectedPetForPin}
                onSelectPetForPin={setSelectedPetForPin}
                pinOptionMemo={pinOptionMemo}
                onPinOptionMemoChange={setPinOptionMemo}
                onSavePin={handleSavePin}
            />

            {/* ================================================================= */}
            {/* 5. DRAFT MANAGEMENT MODAL (Point 3)                              */}
            {/* ================================================================= */}
            <Dialog.Root open={draftModalOpen} onOpenChange={(e) => setDraftModalOpen(e.open)} placement="center" size="md">
                <Portal>
                    <Dialog.Backdrop backdropFilter="blur(10px)" bg="blackAlpha.500" />
                    <Dialog.Positioner>
                        <Dialog.Content rounded="28px" p={6} bg="var(--waba-card)">
                            <Dialog.Header p={0} mb={4}>
                                <Flex justify="space-between" align="center" w="100%">
                                    <Box>
                                        <HStack gap={2}>
                                            <Bookmark size={18} color="#6338A9" />
                                            <Dialog.Title fontSize="18px" fontWeight="800" color="var(--waba-ink)">
                                                임시 저장 보관함
                                            </Dialog.Title>
                                        </HStack>
                                        <Text fontSize="11.5px" color="var(--waba-ink-3)" mt={1}>
                                            다시 저장 시 보관 기간이 30일 연장됩니다.
                                        </Text>
                                    </Box>
                                    <CloseButton size="sm" rounded="full" color="var(--waba-ink)" _hover={{ bg: 'var(--waba-surface)' }} onClick={() => setDraftModalOpen(false)} />
                                </Flex>
                            </Dialog.Header>

                            <Dialog.Body p={0}>
                                <VStack gap={4} align="stretch">
                                    {(savedDrafts.length > 0 ? savedDrafts : savedDraft ? [savedDraft] : []).length > 0 ? (
                                        <VStack gap={3} align="stretch" maxH="340px" overflowY="auto">
                                            {(savedDrafts.length > 0 ? savedDrafts : savedDraft ? [savedDraft] : []).map((item, idx) => (
                                                <Box
                                                    key={String(item.data?.postId || idx)}
                                                    p={4}
                                                    bg="var(--waba-purple-soft)"
                                                    rounded="20px"
                                                    border="1px solid"
                                                    borderColor="var(--waba-purple-border)"
                                                >
                                                    <Flex justify="space-between" align="center" mb={1.5} flexWrap="wrap" gap={1}>
                                                        <Text fontSize="11px" fontWeight="700" color="var(--waba-purple-text)">
                                                            보관된 임시 저장본
                                                        </Text>
                                                        <HStack gap={2} flexWrap="wrap">
                                                            <Text fontSize="11px" color="var(--waba-ink-3)">
                                                                {item.savedAt ? new Date(item.savedAt).toLocaleString('ko-KR') : ''}
                                                            </Text>
                                                            {(() => {
                                                                const base = item.savedAt ? new Date(item.savedAt) : new Date();
                                                                const exp = new Date(base.getTime() + 30 * 24 * 60 * 60 * 1000);
                                                                const dDay = Math.max(0, Math.ceil((exp.getTime() - Date.now()) / (24 * 60 * 60 * 1000)));
                                                                const yyyy = exp.getFullYear();
                                                                const mm = String(exp.getMonth() + 1).padStart(2, '0');
                                                                const dd = String(exp.getDate()).padStart(2, '0');
                                                                return (
                                                                    <Text fontSize="10.5px" fontWeight="700" color={dDay <= 5 ? '#EF4444' : 'var(--waba-ink-3)'}>
                                                                        {yyyy}.{mm}.{dd} 자동 삭제 예정 (D-{dDay})
                                                                    </Text>
                                                                );
                                                            })()}
                                                        </HStack>
                                                    </Flex>
                                                    <Heading fontSize="15px" fontWeight="700" color="var(--waba-ink)" mb={2}>
                                                        {item.data?.title || '제목 없음'}
                                                    </Heading>
                                                    <Text fontSize="12px" color="var(--waba-ink-3)" lineClamp={2} mb={4}>
                                                        {(item.data?.blocks?.find((b): b is EditorTextBlock => b.type === 'text' && Boolean(b.content))?.content) || '작성된 본문 내용 요약...'}
                                                    </Text>

                                                    <HStack justify="flex-end" gap={2}>
                                                        <Button
                                                            size="xs"
                                                            variant="outline"
                                                            borderColor="var(--waba-line)"
                                                            bg="var(--waba-card)"
                                                            color="var(--waba-ink-2)"
                                                            _hover={{ color: 'red.500', borderColor: 'red.300', bg: 'rgba(239, 68, 68, 0.08)' }}
                                                            rounded="full"
                                                            px={3}
                                                            onClick={() => {
                                                                setPendingDeleteDraft(item);
                                                                setDeleteConfirmOpen(true);
                                                            }}
                                                        >
                                                            삭제
                                                        </Button>
                                                        <Button
                                                            size="xs"
                                                            bg="#6338A9"
                                                            color="#FFFFFF"
                                                            _hover={{ bg: '#522B8F' }}
                                                            _active={{ bg: '#45237A' }}
                                                            rounded="full"
                                                            px={4}
                                                            fontWeight="700"
                                                            onClick={() => handleLoadDraft(item)}
                                                        >
                                                            이 글 불러오기
                                                        </Button>
                                                    </HStack>
                                                </Box>
                                            ))}
                                        </VStack>
                                    ) : (
                                        <Box p={6} bg="var(--waba-surface)" rounded="20px" textAlign="center">
                                            <Text fontSize="13px" color="var(--waba-ink-3)">
                                                현재 보관된 이전 임시 저장 글이 없습니다.
                                            </Text>
                                        </Box>
                                    )}

                                    <Box pt={2}>
                                        <Button
                                            w="100%"
                                            size="md"
                                            bg="#6338A9"
                                            color="#FFFFFF"
                                            _hover={{ bg: '#522B8F' }}
                                            _active={{ bg: '#45237A' }}
                                            rounded="full"
                                            fontWeight="700"
                                            onClick={handleSaveCurrentDraft}
                                        >
                                            현재 작성 중인 글 새로 임시 저장하기
                                        </Button>
                                    </Box>
                                </VStack>
                            </Dialog.Body>
                        </Dialog.Content>
                    </Dialog.Positioner>
                </Portal>
            </Dialog.Root>

            {/* ================================================================= */}
            {/* 6. FULL PREVIEW MODAL                                             */}
            {/* ================================================================= */}
            <FullPreviewModal
                open={previewModalOpen}
                onOpenChange={setPreviewModalOpen}
                title={title}
                blocks={blocks}
            />

            {/* 임시저장 삭제 확인 팝업 */}
            <Dialog.Root open={deleteConfirmOpen} onOpenChange={(e) => setDeleteConfirmOpen(e.open)} placement="center">
                <Portal>
                    <Dialog.Backdrop bg="blackAlpha.600" backdropFilter="blur(4px)" />
                    <Dialog.Positioner>
                        <Dialog.Content rounded="24px" p={6} bg="var(--waba-card)" border="1px solid" borderColor="var(--waba-line)" maxW="360px">
                            <Dialog.Header p={0} mb={2}>
                                <Dialog.Title fontSize="16px" fontWeight="800" color="var(--waba-ink)">
                                    정말 삭제하시겠습니까?
                                </Dialog.Title>
                            </Dialog.Header>
                            <Dialog.Body p={0} mb={5}>
                                <Text fontSize="13px" color="var(--waba-ink-2)">
                                    삭제한 임시 저장 글은 복구할 수 없습니다.
                                </Text>
                            </Dialog.Body>
                            <HStack justify="flex-end" gap={2}>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    borderColor="var(--waba-line)"
                                    color="var(--waba-ink)"
                                    rounded="full"
                                    px={4}
                                    onClick={() => setDeleteConfirmOpen(false)}
                                >
                                    취소
                                </Button>
                                <Button
                                    size="sm"
                                    bg="#E53E3E"
                                    color="#FFFFFF"
                                    _hover={{ bg: '#C53030' }}
                                    rounded="full"
                                    px={4}
                                    fontWeight="700"
                                    onClick={() => {
                                        setDeleteConfirmOpen(false);
                                        handleDiscardDraft(pendingDeleteDraft);
                                        setPendingDeleteDraft(null);
                                    }}
                                >
                                    삭제
                                </Button>
                            </HStack>
                        </Dialog.Content>
                    </Dialog.Positioner>
                </Portal>
            </Dialog.Root>
        </Box>
    );
}
