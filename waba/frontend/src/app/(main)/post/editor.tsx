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
import { FeedPreviewPane, FullPreviewModal } from './editor-components/FeedPreviewPane';
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

    // 1. Board Categories
    const [boardId, setBoardId] = useState<string>(initialData?.board_id || 'SNAP');

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
    const [showDraftBanner, setShowDraftBanner] = useState(false);
    const [draftModalOpen, setDraftModalOpen] = useState(false);

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

    // Initial Load: User & Pets & Official Products & Draft Check
    useEffect(() => {
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

            // 1. Try server draft if user is logged in
            if (isAuthenticated()) {
                try {
                    const res = await axiosInstance.get('/post/draft');
                    if (res.data?.success && res.data.draft) {
                        const d = res.data.draft;
                        setSavedDraft({
                            data: {
                                postId: d.postId,
                                board_id: d.board_id,
                                title: d.title,
                                blocks: d.blocks,
                                selectedPets: d.selectedPets,
                                tags: d.tags,
                            },
                            savedAt: d.updatedAt || d.createdAt,
                        });
                        setShowDraftBanner(true);
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
                            setSavedDraft(parsed);
                            setShowDraftBanner(true);
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
        return () => window.removeEventListener('auth-change', handleAuthChange);
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

    const handleLoadDraft = () => {
        if (!savedDraft?.data) return;
        const d = savedDraft.data;
        if (d.postId) setCurrentPostId(d.postId);
        if (d.board_id) setBoardId(d.board_id);
        if (d.title !== undefined) setTitle(d.title);
        if (d.blocks && d.blocks.length > 0) setBlocks(d.blocks);
        if (d.selectedPets) setSelectedPets(d.selectedPets);
        if (d.tags) setTags(d.tags);

        setShowDraftBanner(false);
        setDraftModalOpen(false);

        toaster.create({
            title: '임시 저장된 글을 성공적으로 불러왔습니다.',
            description: savedDraft.savedAt
                ? `${new Date(savedDraft.savedAt).toLocaleString('ko-KR')} 저장본`
                : '',
            type: 'success',
        });
    };

    const handleDiscardDraft = async () => {
        const draftPostId = savedDraft?.data?.postId || currentPostId;
        if (draftPostId && isAuthenticated()) {
            try {
                await axiosInstance.delete(`/post/draft/${draftPostId}`);
            } catch (e) {
                console.error('Delete server draft error:', e);
            }
        }
        if (typeof window !== 'undefined') {
            localStorage.removeItem(DRAFT_STORAGE_KEY);
        }
        setSavedDraft(null);
        setCurrentPostId(null);
        setShowDraftBanner(false);
        setDraftModalOpen(false);
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
        setShowDraftBanner(false);
        setDraftModalOpen(false);

        if (onSaveDraft) {
            const newDraftId = await onSaveDraft(payload, currentPostId || undefined);
            if (newDraftId) {
                setCurrentPostId(newDraftId);
                setSavedDraft((prev) => (prev ? { ...prev, data: { ...prev.data, postId: newDraftId } } : null));
            }
        }

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

                // Seamless continuation text block below the newly inserted image
                const newContinuationTextBlock: EditorTextBlock = {
                    id: `block-text-${baseTimestamp}-${idx}-next`,
                    type: 'text',
                    content: '',
                    format: 'p',
                };

                blocksToInsert.push(newImageBlock, newContinuationTextBlock);
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
        <Box minH="100vh" bg="#F9F9FB" color="#1A1C1D" pb={28}>
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
            {/* 1. TOP STICKY APP BAR (Studio Action Header)                      */}
            {/* ================================================================= */}
            <Box
                position="sticky"
                top={0}
                zIndex={45}
                bg="rgba(255, 255, 255, 0.92)"
                backdropFilter="blur(20px)"
                borderBottom="1px solid"
                borderColor="waba.border"
                boxShadow="0 4px 20px -4px rgba(26,28,30,0.04)"
                px={{ base: 4, lg: 10 }}
                py={3}
            >
                <Flex maxW="1440px" mx="auto" align="center" justify="space-between">
                    <HStack gap={{ base: 2, sm: 3.5 }}>
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
                            borderColor="waba.border"
                            bg="white"
                            color="waba.charcoal"
                            _hover={{ borderColor: 'waba.charcoal', transform: 'translateX(-2px)' }}
                            size="sm"
                        >
                            <ArrowLeft size={18} />
                        </IconButton>
                        <Box h="16px" w="1px" bg="waba.border" display={{ base: 'none', sm: 'block' }} />
                        <HStack
                            gap={1.5}
                            cursor="pointer"
                            onClick={() => router.push('/')}
                            _hover={{ opacity: 0.8 }}
                            display={{ base: 'none', sm: 'flex' }}
                        >
                            <Text fontSize="17px" fontWeight="800" letterSpacing="-0.03em" color="waba.charcoal">
                                WABA
                            </Text>
                            <Box w="5px" h="5px" borderRadius="full" bg="waba.purple" />
                        </HStack>
                        <HStack gap={3}>
                            <Box
                                bg="waba.purpleLight"
                                color="waba.purple"
                                fontSize="11px"
                                fontWeight="800"
                                letterSpacing="0.05em"
                                px={2.5}
                                py={0.8}
                                rounded="full"
                                border="1px solid"
                                borderColor="purple.200"
                                display={{ base: 'none', md: 'inline-block' }}
                            >
                                STUDIO
                            </Box>
                            <Heading fontSize="17px" fontWeight="700" color="waba.charcoal" letterSpacing="-0.02em">
                                {mode === 'edit' ? '이야기 수정' : '새 이야기 작성'}
                            </Heading>
                            <HStack gap={1.5} fontSize="12px" color="waba.muted" pl={2} display={{ base: 'none', md: 'flex' }}>
                                <Box w="7px" h="7px" rounded="full" bg="emerald.500" />
                                <Text>{autoSaveTime} 자동 저장됨</Text>
                            </HStack>
                        </HStack>
                    </HStack>

                    <HStack gap={2.5}>
                        {/* Point 3: Draft Management Button with count & modal */}
                        {mode !== 'edit' && (
                        <Button
                            variant="outline"
                            borderColor={savedDraft ? 'purple.300' : 'waba.border'}
                            bg={savedDraft ? 'purple.50' : 'white'}
                            color={savedDraft ? 'waba.purple' : 'waba.muted'}
                            _hover={{ color: 'waba.charcoal', borderColor: 'waba.charcoal' }}
                            rounded="full"
                            size="sm"
                            px={4}
                            fontSize="13px"
                            fontWeight="600"
                            onClick={() => setDraftModalOpen(true)}
                        >
                            <Bookmark size={15} />
                            임시저장 {savedDraft ? '(1)' : ''}
                        </Button>
                        )}
                        <Button
                            variant="outline"
                            borderColor="waba.border"
                            bg="white"
                            color="waba.charcoal"
                            _hover={{ borderColor: 'waba.charcoal' }}
                            rounded="full"
                            size="sm"
                            px={4}
                            fontSize="13px"
                            fontWeight="600"
                            onClick={() => setPreviewModalOpen(true)}
                        >
                            <Eye size={15} />
                            미리보기
                        </Button>
                        <Button
                            bg="waba.charcoal"
                            color="white"
                            _hover={{ bg: 'waba.charcoalHover', transform: 'translateY(-1px)' }}
                            _active={{ transform: 'scale(0.98)' }}
                            rounded="full"
                            size="sm"
                            px={5}
                            fontSize="13px"
                            fontWeight="700"
                            onClick={handlePublishClick}
                            loading={isSubmitting || isModeratingImages}
                            disabled={isSubmitting || isModeratingImages}
                            boxShadow="0 4px 14px rgba(26,28,30,0.18)"
                        >
                            {mode === 'edit' ? '수정완료' : '발행하기'}
                            <ArrowRight size={15} />
                        </Button>
                    </HStack>
                </Flex>
            </Box>

            {/* ================================================================= */}
            {/* 2. META BAR (Board Tabs & Real User Pets)                         */}
            {/* ================================================================= */}
            <Box bg="white" borderBottom="1px solid" borderColor="waba.border" py={3.5} px={{ base: 4, lg: 10 }}>
                <Flex
                    maxW="1440px"
                    mx="auto"
                    direction={{ base: 'column', md: 'row' }}
                    align={{ base: 'stretch', md: 'center' }}
                    justify="space-between"
                    gap={4}
                >
                    {/* 4 Board Categories */}
                    <HStack gap={2} overflowX="auto" pb={{ base: 1, md: 0 }}>
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
                                    size="sm"
                                    rounded="full"
                                    px={4}
                                    fontSize="13px"
                                    fontWeight="600"
                                    bg={isSelected ? 'waba.purple' : 'waba.subtle'}
                                    color={isSelected ? 'white' : 'waba.muted'}
                                    _hover={{ bg: isSelected ? 'waba.purpleHover' : 'gray.200', color: isSelected ? 'white' : 'waba.charcoal' }}
                                    onClick={() => setBoardId(b.id)}
                                    transition="all 0.15s ease"
                                >
                                    {isSelected && <Check size={14} />}
                                    {b.name}
                                </Button>
                            );
                        })}
                    </HStack>

                    {/* Real Member Registered Pets Selector */}
                    <HStack gap={2} flexWrap="wrap">
                        <Text fontSize="12px" fontWeight="700" color="waba.muted" mr={1}>
                            동반 반려동물:
                        </Text>
                        {userPetsList.length === 0 ? (
                            <Text fontSize="12px" color="waba.faint">
                                등록된 반려동물이 없습니다.
                            </Text>
                        ) : (
                            userPetsList.map((pet) => {
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
                                        bg={isChecked ? 'purple.50' : 'waba.subtle'}
                                        border="1px solid"
                                        borderColor={isChecked ? 'purple.300' : 'waba.border'}
                                        color={isChecked ? 'waba.purple' : 'waba.charcoal'}
                                        px={3}
                                        py={1.5}
                                        rounded="full"
                                        fontSize="12px"
                                        fontWeight="600"
                                        cursor="pointer"
                                        transition="all 0.15s ease"
                                    >
                                        {isChecked ? <Check size={13} color="#6338A9" /> : <span>{speciesIcon}</span>}
                                        <span>
                                            {pet.name} ({pet.breed}
                                            {pet.latest_weight_kg !== null && pet.latest_weight_kg !== undefined && Number(pet.latest_weight_kg) > 0
                                                ? ` ${Number(pet.latest_weight_kg).toFixed(1)}kg`
                                                : ''})
                                        </span>
                                    </Box>
                                );
                            })
                        )}

                        {isMultiSpecies && (
                            <Box
                                bg="waba.purpleLight"
                                color="waba.purple"
                                fontSize="11px"
                                fontWeight="700"
                                px={3}
                                py={1.5}
                                rounded="full"
                                border="1px solid"
                                borderColor="purple.200"
                                display="inline-flex"
                                alignItems="center"
                                gap={1.5}
                            >
                                <Sparkles size={13} />
                                다종 합사 가구 (+20% 리워드 가중치 적용)
                            </Box>
                        )}
                    </HStack>
                </Flex>
            </Box>

            {/* ================================================================= */}
            {/* 3. MAIN WORKSPACE (8:4 Unified Flow Layout)                       */}
            {/* ================================================================= */}
            <Container maxW="1440px" px={{ base: 4, lg: 10 }} py={8}>
                <Flex direction={{ base: 'column', lg: 'row' }} gap={8} align="flex-start">
                    {/* ============================================================= */}
                    {/* [LEFT 8 COLUMNS] Continuous Unified Flow Canvas               */}
                    {/* ============================================================= */}
                    <Box
                        flex="1"
                        w="100%"
                        bg="white"
                        rounded="28px"
                        border="1px solid"
                        borderColor="waba.border"
                        p={{ base: 6, md: 10 }}
                        boxShadow="0 8px 32px -4px rgba(26,28,30,0.04)"
                    >
                        {/* Point 3: Saved Draft Top Callout Banner */}
                        {showDraftBanner && savedDraft && (
                            <Box
                                p={4}
                                bg="purple.50"
                                border="1px solid"
                                borderColor="purple.200"
                                rounded="20px"
                                mb={6}
                                display="flex"
                                flexDirection={{ base: 'column', sm: 'row' }}
                                alignItems={{ base: 'flex-start', sm: 'center' }}
                                justifyContent="space-between"
                                gap={3}
                            >
                                <HStack gap={2.5}>
                                    <Box
                                        w="32px"
                                        h="32px"
                                        rounded="full"
                                        bg="waba.purple"
                                        color="white"
                                        display="flex"
                                        alignItems="center"
                                        justifyContent="center"
                                        flexShrink={0}
                                    >
                                        <Bookmark size={16} />
                                    </Box>
                                    <Box>
                                        <Text fontSize="13px" fontWeight="700" color="waba.charcoal">
                                            이전에 작성 중이던 임시 저장 글이 있습니다.
                                        </Text>
                                        <Text fontSize="11px" color="waba.muted">
                                            {savedDraft.savedAt ? new Date(savedDraft.savedAt).toLocaleString('ko-KR') : ''} 저장됨
                                            {savedDraft.data?.title ? ` • "${savedDraft.data.title}"` : ''}
                                        </Text>
                                    </Box>
                                </HStack>

                                <HStack gap={2} alignSelf={{ base: 'flex-end', sm: 'center' }}>
                                    <Button
                                        size="sm"
                                        bg="waba.purple"
                                        color="white"
                                        _hover={{ bg: 'waba.purpleHover' }}
                                        rounded="full"
                                        px={4}
                                        fontSize="12px"
                                        fontWeight="700"
                                        onClick={handleLoadDraft}
                                    >
                                        불러오기
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        borderColor="purple.200"
                                        color="gray.600"
                                        _hover={{ bg: 'white', color: 'red.500', borderColor: 'red.300' }}
                                        rounded="full"
                                        px={3}
                                        fontSize="12px"
                                        onClick={handleDiscardDraft}
                                    >
                                        삭제
                                    </Button>
                                </HStack>
                            </Box>
                        )}

                        {/* Title Input */}
                        <Box mb={4}>
                            <Input
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="제목을 입력하세요..."
                                fontSize={{ base: '22px', md: '28px' }}
                                fontWeight="800"
                                color="waba.charcoal"
                                letterSpacing="-0.03em"
                                border="none"
                                outline="none"
                                px={0}
                                py={1}
                                _focus={{ outline: 'none', boxShadow: 'none' }}
                                _placeholder={{ color: 'waba.faint' }}
                            />
                            <HStack
                                gap={3}
                                fontSize="12px"
                                color="waba.muted"
                                mt={2}
                                pt={3}
                                borderTop="1px solid"
                                borderColor="waba.subtle"
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

                        {/* Minimal Sticky In-stream Action Bar */}
                        <Box
                            position="sticky"
                            top={18}
                            zIndex={30}
                            bg="rgba(255, 255, 255, 0.95)"
                            backdropFilter="blur(14px)"
                            border="1px solid"
                            borderColor="waba.border"
                            px={3.5}
                            py={2}
                            rounded="full"
                            mb={8}
                            boxShadow="0 4px 16px rgba(0,0,0,0.04)"
                            maxW="fit-content"
                        >
                            <HStack gap={2}>
                                <Button
                                    size="xs"
                                    bg="waba.charcoal"
                                    _hover={{ bg: 'waba.charcoalHover' }}
                                    color="white"
                                    rounded="full"
                                    px={3.5}
                                    fontSize="12px"
                                    fontWeight="700"
                                    onClick={() => triggerImageUpload(blocks.length - 1)}
                                >
                                    <ImageIcon size={14} />
                                    + 사진 삽입
                                </Button>
                                <Box h="14px" w="1px" bg="waba.border" mx={0.5} />
                                <Text fontSize="12px" color="waba.muted" px={1}>
                                    글을 작성하다가 사진을 넣고 싶은 위치에서 [+ 사진 삽입]을 누르세요
                                </Text>
                            </HStack>
                        </Box>

                        {/* Point 1: Continuous Story Writing Canvas with AutoResizeTextarea (No fixed height, No scrollbars) */}
                        <EditorBlockList
                            blocks={blocks}
                            activePinId={activePinId}
                            onSetActivePinId={setActivePinId}
                            onUpdateTextBlock={updateTextBlock}
                            onUpdateImageCaption={updateImageCaption}
                            onMoveImageBlock={moveImageBlock}
                            onRemoveImageBlock={removeImageBlock}
                            onImageClickToPin={handleImageClickToPin}
                            onRemovePinFromImage={removePinFromImage}
                        />

                        {/* Bottom Tag Bar */}
                        <Box pt={8} mt={6} borderTop="1px solid" borderColor="waba.subtle">
                            <Flex align="center" flexWrap="wrap" gap={2}>
                                <Text fontSize="12px" fontWeight="600" color="waba.muted" mr={1}>
                                    연관 태그:
                                </Text>
                                {tags.length === 0 && (
                                    <Text fontSize="12px" color="waba.faint" mr={2}>
                                        (등록된 태그 없음)
                                    </Text>
                                )}
                                {tags.map((tag) => (
                                    <Box
                                        key={tag}
                                        display="inline-flex"
                                        alignItems="center"
                                        gap={1}
                                        bg="waba.subtle"
                                        border="1px solid"
                                        borderColor="waba.border"
                                        px={3}
                                        py={1}
                                        rounded="full"
                                        fontSize="13px"
                                        fontWeight="600"
                                        color="waba.charcoal"
                                    >
                                        #{tag}
                                        <CloseButton
                                            size="2xs"
                                            rounded="full"
                                            color="waba.faint"
                                            _hover={{ color: 'waba.charcoal' }}
                                            onClick={() => handleRemoveTag(tag)}
                                        />
                                    </Box>
                                ))}

                                <HStack gap={1}>
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
                                        size="xs"
                                        w="140px"
                                        rounded="full"
                                        bg="white"
                                        borderColor="waba.border"
                                        fontSize="12px"
                                    />
                                    <Button
                                        size="xs"
                                        rounded="full"
                                        variant="outline"
                                        borderColor="waba.border"
                                        onClick={handleAddTag}
                                        fontSize="11px"
                                    >
                                        추가
                                    </Button>
                                </HStack>
                            </Flex>
                        </Box>
                    </Box>

                    {/* ============================================================= */}
                    {/* [RIGHT 4 COLUMNS] Real-time Inspector Sidebar                 */}
                    {/* ============================================================= */}
                    <Box
                        w={{ base: '100%', lg: '380px' }}
                        position={{ base: 'static', lg: 'sticky' }}
                        top="80px"
                        display="flex"
                        flexDirection="column"
                        gap={6}
                    >
                        {/* 0) ✨ 건강 수첩 자동 기록 카드 (내 반려동물을 1마리 이상 태그했을 때만 노출) */}
                        {selectedPets.length > 0 && (
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
                        )}

                        <FeedPreviewPane
                            boardId={boardId}
                            title={title}
                            currentUser={currentUser}
                            firstImagePreview={firstImagePreview}
                            allProductPins={allProductPins}
                            productPinsCount={productPinsCount}
                            totalImagesCount={totalImagesCount}
                            calculatedPoints={calculatedPoints}
                            isMultiSpecies={isMultiSpecies}
                            readinessPercentage={readinessPercentage}
                            isTitleValid={isTitleValid}
                            isContentValid={isContentValid}
                            isImageValid={isImageValid}
                            isPinValid={isPinValid}
                        />
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
                        <Dialog.Content rounded="28px" p={6} bg="white">
                            <Dialog.Header p={0} mb={4}>
                                <Flex justify="space-between" align="center">
                                    <HStack gap={2}>
                                        <Bookmark size={18} color="#6338A9" />
                                        <Dialog.Title fontSize="18px" fontWeight="800" color="waba.charcoal">
                                            임시 저장 보관함
                                        </Dialog.Title>
                                    </HStack>
                                    <CloseButton size="sm" rounded="full" onClick={() => setDraftModalOpen(false)} />
                                </Flex>
                            </Dialog.Header>

                            <Dialog.Body p={0}>
                                <VStack gap={4} align="stretch">
                                    {savedDraft ? (
                                        <Box p={4} bg="purple.50/50" rounded="20px" border="1px solid" borderColor="purple.200">
                                            <Flex justify="space-between" align="center" mb={1.5}>
                                                <Text fontSize="11px" fontWeight="700" color="waba.purple">
                                                    보관된 임시 저장본
                                                </Text>
                                                <Text fontSize="11px" color="waba.muted">
                                                    {savedDraft.savedAt ? new Date(savedDraft.savedAt).toLocaleString('ko-KR') : ''}
                                                </Text>
                                            </Flex>
                                            <Heading fontSize="15px" fontWeight="700" color="waba.charcoal" mb={2}>
                                                {savedDraft.data?.title || '제목 없음'}
                                            </Heading>
                                            <Text fontSize="12px" color="waba.muted" lineClamp={2} mb={4}>
                                                {(savedDraft.data?.blocks?.find((b): b is EditorTextBlock => b.type === 'text' && Boolean(b.content))?.content) || '작성된 본문 내용 요약...'}
                                            </Text>

                                            <HStack justify="flex-end" gap={2}>
                                                <Button
                                                    size="xs"
                                                    variant="outline"
                                                    borderColor="gray.300"
                                                    color="gray.600"
                                                    _hover={{ color: 'red.500', borderColor: 'red.300' }}
                                                    rounded="full"
                                                    px={3}
                                                    onClick={handleDiscardDraft}
                                                >
                                                    삭제
                                                </Button>
                                                <Button
                                                    size="xs"
                                                    bg="waba.purple"
                                                    color="white"
                                                    _hover={{ bg: 'waba.purpleHover' }}
                                                    rounded="full"
                                                    px={4}
                                                    fontWeight="700"
                                                    onClick={handleLoadDraft}
                                                >
                                                    이 글 불러오기
                                                </Button>
                                            </HStack>
                                        </Box>
                                    ) : (
                                        <Box p={6} bg="waba.subtle" rounded="20px" textAlign="center">
                                            <Text fontSize="13px" color="waba.muted">
                                                현재 보관된 이전 임시 저장 글이 없습니다.
                                            </Text>
                                        </Box>
                                    )}

                                    <Box pt={2}>
                                        <Button
                                            w="100%"
                                            size="md"
                                            bg="waba.charcoal"
                                            color="white"
                                            _hover={{ bg: 'waba.charcoalHover' }}
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
        </Box>
    );
}
