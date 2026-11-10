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
    Portal,
    Separator,
    Stack,
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

// =============================================================================
// Type Definitions
// =============================================================================

export interface EditorImagePin {
    pin_id: string;
    pin_type: 'INTERNAL_PRODUCT' | 'EXTERNAL_PRODUCT' | 'PET';
    is_official?: boolean;
    product_id?: string;
    product_name: string;
    brand_name?: string;
    price?: number;
    product_url?: string;
    thumbnail_url?: string;
    pet_id?: string;
    pos_x: number; // percentage 0 - 100
    pos_y: number; // percentage 0 - 100
    pin_option_memo?: string;
}

export interface EditorImageBlock {
    id: string;
    type: 'image';
    image_id?: number;
    previewUrl: string;
    image_url?: string;
    file?: File;
    fileIndex?: number;
    caption?: string;
    pins: EditorImagePin[];
}

export interface EditorTextBlock {
    id: string;
    type: 'text';
    content: string;
    format: 'p' | 'h2' | 'h3' | 'quote';
}

export type EditorBlock = EditorTextBlock | EditorImageBlock;

export interface PostEditorData {
    postId?: string;
    board_id: string;
    title: string;
    blocks: EditorBlock[];
    selectedPets: string[];
    tags: string[];
}

export interface EditorProps {
    mode?: 'create' | 'edit';
    postId?: string;
    initialData?: Partial<PostEditorData>;
    onSubmit?: (data: PostEditorData, draftPostId?: string) => Promise<void> | void;
    onSaveDraft?: (data: PostEditorData, draftPostId?: string) => Promise<string | undefined> | void;
    isSubmitting?: boolean;
}

const DRAFT_STORAGE_KEY = 'waba_post_draft';

// =============================================================================
// Helper: Auto-resizing Textarea (No fixed height, No internal scrollbars)
// =============================================================================
function AutoResizeTextarea({
    value,
    onChange,
    placeholder,
}: {
    value: string;
    onChange: (val: string) => void;
    placeholder?: string;
}) {
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const resize = () => {
        const el = textareaRef.current;
        if (!el) return;
        el.style.height = 'auto';
        el.style.height = `${el.scrollHeight}px`;
    };

    useEffect(() => {
        resize();
    }, [value]);

    return (
        <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => {
                onChange(e.target.value);
                resize();
            }}
            placeholder={placeholder}
            rows={1}
            style={{
                width: '100%',
                height: 'auto',
                overflow: 'hidden',
                resize: 'none',
                border: 'none',
                outline: 'none',
                background: 'transparent',
                fontSize: '16px',
                fontWeight: 400,
                lineHeight: 1.85,
                color: '#141416',
                padding: '4px 0',
                margin: 0,
                display: 'block',
                fontFamily: 'inherit',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
            }}
        />
    );
}

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

    // 4. In-stream Unified Blocks Flow (Clean slate: starts with 1 empty text canvas)
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
    const [activeHoverPinId, setActiveHoverPinId] = useState<string | null>(null);
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
    const [isParsingUrl, setIsParsingUrl] = useState(false);
    const [parsedMetadata, setParsedMetadata] = useState<{
        product_name: string;
        brand_name: string;
        price: number;
        thumbnail_url?: string;
    } | null>(null);
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
            checkDrafts();
        };
        window.addEventListener('auth-change', handleAuthChange);
        return () => window.removeEventListener('auth-change', handleAuthChange);
    }, [mode]);

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
        const payload: PostEditorData = {
            postId: currentPostId || undefined,
            board_id: boardId,
            title: title.trim(),
            blocks,
            selectedPets,
            tags,
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
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const { optimizedFile, previewUrl } = await processImageClient(file);

            const newImageBlock: EditorImageBlock = {
                id: `block-image-${Date.now()}`,
                type: 'image',
                previewUrl,
                file: optimizedFile,
                caption: '',
                pins: [],
            };

            // Seamless continuation text block below the newly inserted image
            const newContinuationTextBlock: EditorTextBlock = {
                id: `block-text-${Date.now() + 1}`,
                type: 'text',
                content: '',
                format: 'p',
            };

            setBlocks((prev) => {
                if (insertIndexTarget !== null && insertIndexTarget >= 0) {
                    const next = [...prev];
                    next.splice(insertIndexTarget + 1, 0, newImageBlock, newContinuationTextBlock);
                    return next;
                }
                return [...prev, newImageBlock, newContinuationTextBlock];
            });

            toaster.create({
                title: '사진이 추가되었습니다.',
                type: 'success',
            });
        } catch (err) {
            toaster.create({
                title: '이미지 처리 중 오류가 발생했습니다.',
                type: 'error',
            });
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
        const rect = e.currentTarget.getBoundingClientRect();
        const x = Math.round(((e.clientX - rect.left) / rect.width) * 100);
        const y = Math.round(((e.clientY - rect.top) / rect.height) * 100);

        setTargetImageBlockId(blockId);
        setPinCoords({ x: Math.min(Math.max(x, 5), 95), y: Math.min(Math.max(y, 5), 95) });

        // RESET PIN FORM TO COMPLETELY CLEAN STATE
        setSelectedOfficialProduct(null);
        setProductSearchKeyword('');
        setExternalUrlInput('');
        setParsedMetadata(null);
        setManualExternalFallback(false);
        setSelectedPetForPin(null);
        setPinOptionMemo('');

        setPinTypeTab('INTERNAL_PRODUCT');
        setPinModalOpen(true);
    };

    const handleParseExternalUrl = async () => {
        if (!externalUrlInput.trim()) {
            toaster.create({ title: '외부 쇼핑몰 URL을 입력해주세요.', type: 'error' });
            return;
        }

        setIsParsingUrl(true);
        setParsedMetadata(null);
        try {
            const res = await axiosInstance.post('/post/parse-url', { url: externalUrlInput.trim() });
            if (res.data?.success) {
                if (res.data.url) {
                    setExternalUrlInput(res.data.url);
                }
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
                if (res.data?.partners_url || res.data?.url) {
                    setExternalUrlInput(res.data.partners_url || res.data.url);
                }
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
        } catch (e) {
            setManualExternalFallback(true);
            setParsedMetadata({
                product_name: '',
                brand_name: '외부 제휴몰',
                price: 0,
            });
            toaster.create({
                title: 'URL 분석에 실패했습니다. 직접 입력해주세요.',
                type: 'info',
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
            newPin = {
                pin_id: `pin-${Date.now()}`,
                pin_type: 'PET',
                is_official: false,
                pet_id: selectedPetForPin.id,
                product_name: `${selectedPetForPin.name} (${selectedPetForPin.breed}, ${Number(selectedPetForPin.latest_weight_kg).toFixed(1)}kg)`,
                brand_name: '반려동물 태그',
                thumbnail_url: selectedPetForPin.current_avatar_url,
                pos_x: pinCoords.x,
                pos_y: pinCoords.y,
                pin_option_memo: pinOptionMemo.trim(),
            };
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
        if (!isAuthenticated()) {
            setLoginModalOpen(true);
            return;
        }

        if (!title.trim()) {
            toaster.create({ title: '게시글 제목을 입력해주세요.', type: 'error' });
            return;
        }

        const payload: PostEditorData = {
            postId: currentPostId || undefined,
            board_id: boardId,
            title: title.trim(),
            blocks,
            selectedPets,
            tags,
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
                            loading={isSubmitting}
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
                                        <span>{pet.name} ({pet.breed} {Number(pet.latest_weight_kg).toFixed(1)}kg)</span>
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
                        <VStack gap={4} align="stretch">
                            {blocks.map((block, index) => {
                                if (block.type === 'text') {
                                    return (
                                        <Box key={block.id} position="relative" w="100%">
                                            <AutoResizeTextarea
                                                value={block.content}
                                                onChange={(val) => updateTextBlock(block.id, val)}
                                                placeholder={
                                                    index === 0
                                                        ? "자유롭게 이야기를 시작해보세요. 엔터를 누르면 자연스럽게 줄바꿈되며 높이가 자동 조절됩니다. 상단의 [+ 사진 삽입] 버튼으로 사진과 상품 핀을 넣을 수 있습니다."
                                                        : "이어지는 이야기를 작성해보세요..."
                                                }
                                            />
                                        </Box>
                                    );
                                }

                                if (block.type === 'image') {
                                    return (
                                        <Box key={block.id} my={4}>
                                            <Box
                                                position="relative"
                                                rounded="24px"
                                                overflow="hidden"
                                                border="1px solid"
                                                borderColor="waba.border"
                                                bg="waba.subtle"
                                                cursor="crosshair"
                                                role="group"
                                                onClick={(e) => handleImageClickToPin(e, block.id)}
                                            >
                                                {/* Uploaded Image */}
                                                <Image
                                                    src={block.previewUrl}
                                                    alt="에디터 삽입 이미지"
                                                    w="100%"
                                                    maxH="520px"
                                                    objectFit="cover"
                                                    display="block"
                                                />



                                                {/* Click-to-Pin Guide Pill */}
                                                <Box
                                                    position="absolute"
                                                    top={4}
                                                    left={4}
                                                    bg="rgba(255, 255, 255, 0.92)"
                                                    backdropFilter="blur(8px)"
                                                    color="waba.charcoal"
                                                    fontSize="11px"
                                                    fontWeight="700"
                                                    px={3}
                                                    py={1}
                                                    rounded="full"
                                                    boxShadow="sm"
                                                    pointerEvents="none"
                                                >
                                                    📍 사진을 클릭하여 상품/반려동물 핀(+)을 태그하세요
                                                </Box>

                                                {/* Dropped Pins */}
                                                {block.pins.map((pin, pinIdx) => {
                                                    const pinBg =
                                                        pin.pin_type === 'PET'
                                                            ? '#7046B7'
                                                            : pin.is_official
                                                            ? '#6338A9'
                                                            : '#141416';

                                                    return (
                                                        <Box
                                                            key={pin.pin_id}
                                                            position="absolute"
                                                            left={`${pin.pos_x}%`}
                                                            top={`${pin.pos_y}%`}
                                                            transform="translate(-50%, -50%)"
                                                            zIndex={20}
                                                            onClick={(e) => e.stopPropagation()}
                                                            onMouseEnter={() => setActiveHoverPinId(pin.pin_id)}
                                                            onMouseLeave={() => setActiveHoverPinId(null)}
                                                        >
                                                            <Box
                                                                w="30px"
                                                                h="30px"
                                                                rounded="full"
                                                                bg={pinBg}
                                                                color="white"
                                                                fontSize="12px"
                                                                fontWeight="800"
                                                                display="flex"
                                                                alignItems="center"
                                                                justifyContent="center"
                                                                border="2.5px solid white"
                                                                boxShadow="0 4px 14px rgba(0,0,0,0.3)"
                                                                cursor="pointer"
                                                                transition="transform 0.15s ease"
                                                                _hover={{ transform: 'scale(1.15)' }}
                                                            >
                                                                {pinIdx + 1}
                                                            </Box>

                                                            {/* Pin Tag Callout Badge */}
                                                            <HStack
                                                                position="absolute"
                                                                left="36px"
                                                                top="50%"
                                                                transform="translateY(-50%)"
                                                                bg="rgba(255, 255, 255, 0.94)"
                                                                backdropFilter="blur(12px)"
                                                                px={3}
                                                                py={1.5}
                                                                rounded="full"
                                                                border="1px solid"
                                                                borderColor="waba.border"
                                                                boxShadow="0 6px 20px rgba(0,0,0,0.12)"
                                                                whiteSpace="nowrap"
                                                                gap={2}
                                                            >
                                                                <Text fontSize="12px" fontWeight="700" color="waba.charcoal">
                                                                    {pin.product_name}
                                                                </Text>
                                                                {pin.is_official && (
                                                                    <Box
                                                                        bg="waba.purple"
                                                                        color="white"
                                                                        fontSize="9px"
                                                                        fontWeight="800"
                                                                        px={1.5}
                                                                        py={0.5}
                                                                        rounded="full"
                                                                    >
                                                                        5% 적립
                                                                    </Box>
                                                                )}
                                                                {!pin.is_official && pin.pin_type !== 'PET' && (
                                                                    <Text fontSize="10px" color="gray.500">
                                                                        외부 제휴
                                                                    </Text>
                                                                )}
                                                                <CloseButton
                                                                    size="2xs"
                                                                    rounded="full"
                                                                    color="gray.400"
                                                                    _hover={{ color: 'red.500', bg: 'red.50' }}
                                                                    onClick={(e) => removePinFromImage(block.id, pin.pin_id, e)}
                                                                />
                                                            </HStack>
                                                        </Box>
                                                    );
                                                })}

                                                {/* Hover Toolbar: Order & Delete */}
                                                <HStack
                                                    position="absolute"
                                                    bottom={3}
                                                    right={3}
                                                    bg="rgba(20, 20, 22, 0.85)"
                                                    backdropFilter="blur(8px)"
                                                    rounded="full"
                                                    px={2.5}
                                                    py={1}
                                                    gap={1}
                                                    zIndex={15}
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <IconButton
                                                        aria-label="위로 이동"
                                                        size="xs"
                                                        variant="ghost"
                                                        color="white"
                                                        _hover={{ bg: 'whiteAlpha.300' }}
                                                        onClick={() => moveImageBlock(index, 'up')}
                                                        disabled={index === 0}
                                                    >
                                                        <ChevronUp size={14} />
                                                    </IconButton>
                                                    <IconButton
                                                        aria-label="아래로 이동"
                                                        size="xs"
                                                        variant="ghost"
                                                        color="white"
                                                        _hover={{ bg: 'whiteAlpha.300' }}
                                                        onClick={() => moveImageBlock(index, 'down')}
                                                        disabled={index === blocks.length - 1}
                                                    >
                                                        <ChevronDown size={14} />
                                                    </IconButton>
                                                    <IconButton
                                                        aria-label="사진 삭제"
                                                        size="xs"
                                                        variant="ghost"
                                                        color="red.300"
                                                        _hover={{ bg: 'whiteAlpha.300', color: 'red.400' }}
                                                        onClick={() => removeImageBlock(block.id)}
                                                    >
                                                        <Trash2 size={14} />
                                                    </IconButton>
                                                </HStack>
                                            </Box>

                                            {/* Caption Input */}
                                            <Flex justify="space-between" align="center" mt={2} px={1}>
                                                <Input
                                                    value={block.caption || ''}
                                                    onChange={(e) => updateImageCaption(block.id, e.target.value)}
                                                    placeholder="• 사진에 대한 캡션을 입력하세요..."
                                                    fontSize="13px"
                                                    color="waba.muted"
                                                    border="none"
                                                    outline="none"
                                                    px={0}
                                                    _focus={{ outline: 'none' }}
                                                />
                                                <Text fontSize="12px" color="waba.faint" whiteSpace="nowrap">
                                                    핀 {block.pins.length}개 연동됨
                                                </Text>
                                            </Flex>
                                        </Box>
                                    );
                                }
                                return null;
                            })}
                        </VStack>

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
                        {/* 1) Live Feed Preview */}
                        <Box
                            bg="white"
                            rounded="24px"
                            border="1px solid"
                            borderColor="waba.border"
                            p={5}
                            boxShadow="0 8px 32px -4px rgba(26,28,30,0.04)"
                        >
                            <Flex justify="space-between" align="center" mb={4}>
                                <HStack gap={2}>
                                    <Layers size={17} color="#6338A9" />
                                    <Heading fontSize="15px" fontWeight="700" color="waba.charcoal">
                                        피드 실시간 미리보기
                                    </Heading>
                                </HStack>
                                <Text fontSize="11px" fontWeight="800" color="waba.muted" letterSpacing="0.08em">
                                    100% SYNC
                                </Text>
                            </Flex>

                            <Box rounded="20px" border="1px solid" borderColor="waba.border" overflow="hidden" bg="#FAFAFC">
                                {/* Thumbnail Container */}
                                <Box
                                    position="relative"
                                    h="190px"
                                    w="100%"
                                    bg="waba.subtle"
                                    display="flex"
                                    alignItems="center"
                                    justifyContent="center"
                                    overflow="hidden"
                                >
                                    {firstImagePreview ? (
                                        <Image
                                            src={firstImagePreview}
                                            alt="미리보기 썸네일"
                                            w="100%"
                                            h="100%"
                                            objectFit="cover"
                                        />
                                    ) : (
                                        <VStack gap={2} color="waba.faint" py={6}>
                                            <ImageIcon size={32} />
                                            <Text fontSize="12px" fontWeight="600">
                                                사진을 추가하면 대표 썸네일로 표시됩니다
                                            </Text>
                                        </VStack>
                                    )}
                                    <HStack position="absolute" top={3} left={3} gap={1.5}>
                                        <Box
                                            bg="rgba(20, 20, 22, 0.8)"
                                            backdropFilter="blur(6px)"
                                            color="white"
                                            fontSize="11px"
                                            fontWeight="700"
                                            px={2.5}
                                            py={0.8}
                                            rounded="full"
                                        >
                                            {boardId === 'SNAP'
                                                ? '일상 스냅'
                                                : boardId === 'LOOKBOOK'
                                                    ? '공식 룩북'
                                                    : boardId === 'CARE_LOUNGE'
                                                        ? '케어 라운지'
                                                        : '궁금증 Q&A'}
                                        </Box>
                                        {productPinsCount > 0 && (
                                            <Box
                                                bg="rgba(99, 56, 169, 0.85)"
                                                backdropFilter="blur(6px)"
                                                color="white"
                                                fontSize="11px"
                                                fontWeight="700"
                                                px={2}
                                                py={0.8}
                                                rounded="full"
                                            >
                                                상품 {productPinsCount}개
                                            </Box>
                                        )}
                                    </HStack>
                                </Box>

                                {/* Meta Info & Title */}
                                <Box p={4} bg="white">
                                    <Flex justify="space-between" align="center" mb={2}>
                                        <HStack gap={2}>
                                            <Box
                                                w="24px"
                                                h="24px"
                                                rounded="full"
                                                bg="waba.purpleLight"
                                                color="waba.purple"
                                                fontSize="11px"
                                                fontWeight="800"
                                                display="flex"
                                                alignItems="center"
                                                justifyContent="center"
                                            >
                                                {currentUser?.nickname ? currentUser.nickname[0].toUpperCase() : 'W'}
                                            </Box>
                                            <Text fontSize="12px" fontWeight="600" color="waba.charcoal">
                                                @{currentUser?.nickname || '크리에이터'}
                                            </Text>
                                        </HStack>
                                        <Box
                                            bg="waba.purpleLight"
                                            color="waba.purple"
                                            fontSize="10px"
                                            fontWeight="800"
                                            px={2}
                                            py={0.5}
                                            rounded="full"
                                        >
                                            STYLE MENTOR
                                        </Box>
                                    </Flex>
                                    <Heading
                                        fontSize="15px"
                                        fontWeight="700"
                                        color="waba.charcoal"
                                        lineClamp={2}
                                        mb={3}
                                    >
                                        {title || '제목을 입력하면 여기에 실시간으로 반영됩니다'}
                                    </Heading>

                                    {/* Point 2: Tagged Items List STRICTLY EXCLUDES PETS! */}
                                    <Box pt={3} borderTop="1px solid" borderColor="waba.subtle">
                                        <Text fontSize="11px" fontWeight="600" color="waba.muted" mb={2}>
                                            연동 상품 ({productPinsCount})
                                        </Text>
                                        {productPinsCount === 0 ? (
                                            <Text fontSize="11px" color="waba.faint" fontStyle="italic">
                                                사진 위를 클릭해 상품 핀을 추가해보세요
                                            </Text>
                                        ) : (
                                            <VStack gap={1.5} align="stretch">
                                                {allProductPins.slice(0, 3).map((pin, i) => (
                                                    <Flex
                                                        key={pin.pin_id}
                                                        justify="space-between"
                                                        align="center"
                                                        p={2}
                                                        bg="waba.subtle"
                                                        rounded="12px"
                                                        fontSize="12px"
                                                    >
                                                        <HStack gap={2} overflow="hidden">
                                                            <Box
                                                                w="18px"
                                                                h="18px"
                                                                rounded="full"
                                                                bg={pin.is_official ? 'waba.purple' : 'waba.charcoal'}
                                                                color="white"
                                                                fontSize="10px"
                                                                fontWeight="800"
                                                                display="flex"
                                                                alignItems="center"
                                                                justifyContent="center"
                                                                flexShrink={0}
                                                            >
                                                                {i + 1}
                                                            </Box>
                                                            <Text fontWeight="600" color="waba.charcoal" truncate>
                                                                {pin.product_name}
                                                            </Text>
                                                        </HStack>
                                                        <Text
                                                            fontSize="11px"
                                                            fontWeight="700"
                                                            color={pin.is_official ? 'waba.purple' : 'waba.muted'}
                                                            flexShrink={0}
                                                        >
                                                            {pin.is_official ? '5% 적립' : '제휴 링크'}
                                                        </Text>
                                                    </Flex>
                                                ))}
                                            </VStack>
                                        )}
                                    </Box>
                                </Box>
                            </Box>
                        </Box>

                        {/* 2) Creator Reward Calculator Card */}
                        <Box
                            bg="white"
                            rounded="24px"
                            border="1px solid"
                            borderColor="waba.border"
                            p={5}
                            boxShadow="0 8px 32px -4px rgba(26,28,30,0.04)"
                        >
                            <Flex justify="space-between" align="center" mb={4}>
                                <HStack gap={2}>
                                    <Coins size={18} color="#6338A9" />
                                    <Heading fontSize="15px" fontWeight="700" color="waba.charcoal">
                                        리워드 혜택 계산기
                                    </Heading>
                                </HStack>
                                <Box
                                    bg="waba.purpleLight"
                                    color="waba.purple"
                                    fontSize="10px"
                                    fontWeight="800"
                                    px={2}
                                    py={0.5}
                                    rounded="full"
                                >
                                    실시간 적립
                                </Box>
                            </Flex>

                            <Box bg="purple.50/40" p={4} rounded="18px" border="1px solid" borderColor="purple.100" mb={4}>
                                <Text fontSize="12px" color="waba.muted" mb={1}>
                                    현재 예상 적립 포인트
                                </Text>
                                <HStack align="baseline" gap={1} color="waba.purple">
                                    <Text fontSize="32px" fontWeight="800" letterSpacing="-0.03em">
                                        +{calculatedPoints.toLocaleString()}
                                    </Text>
                                    <Text fontSize="18px" fontWeight="700">
                                        P
                                    </Text>
                                </HStack>
                            </Box>

                            <VStack gap={2.5} fontSize="13px" mb={4}>
                                <Flex justify="space-between" w="100%" color="waba.muted">
                                    <Text>기본 에디토리얼 작성</Text>
                                    <Text fontWeight="700" color="waba.charcoal">
                                        +{totalImagesCount >= 1 ? '500' : '0'}P
                                    </Text>
                                </Flex>
                                <Flex justify="space-between" w="100%" color="waba.muted">
                                    <Text>연동 상품 {productPinsCount}개 태그 완료</Text>
                                    <Text fontWeight="700" color="waba.charcoal">
                                        +{(productPinsCount * 200).toLocaleString()}P
                                    </Text>
                                </Flex>
                                {isMultiSpecies && (
                                    <Flex justify="space-between" w="100%" color="waba.muted">
                                        <Text>다종 합사 가중치 (+20%)</Text>
                                        <Text fontWeight="700" color="waba.purple">
                                            +600P
                                        </Text>
                                    </Flex>
                                )}
                            </VStack>

                            <Box p={3} bg="waba.subtle" rounded="14px" display="flex" gap={2.5} alignItems="center">
                                <Sparkles size={16} color="#6338A9" />
                                <Text fontSize="12px" color="waba.muted" lineHeight="1.4">
                                    공식 룩북 승격 시 <strong style={{ color: '#141416' }}>+10,000P</strong> 및 앰버서더 배지가 지급됩니다.
                                </Text>
                            </Box>
                        </Box>

                        {/* 3) Publish Readiness Checklist Card */}
                        <Box
                            bg="white"
                            rounded="24px"
                            border="1px solid"
                            borderColor="waba.border"
                            p={5}
                            boxShadow="0 8px 32px -4px rgba(26,28,30,0.04)"
                        >
                            <Flex justify="space-between" align="center" mb={3}>
                                <Heading fontSize="15px" fontWeight="700" color="waba.charcoal">
                                    발행 준비 완료도
                                </Heading>
                                <Text fontSize="15px" fontWeight="800" color="waba.purple">
                                    {readinessPercentage}%
                                </Text>
                            </Flex>

                            <Box w="100%" bg="waba.subtle" h="8px" rounded="full" overflow="hidden" mb={4}>
                                <Box
                                    bg="waba.purple"
                                    h="100%"
                                    rounded="full"
                                    transition="width 0.4s ease"
                                    w={`${readinessPercentage}%`}
                                />
                            </Box>

                            <VStack gap={2.5} align="stretch" fontSize="13px">
                                <HStack gap={2} color={isTitleValid ? 'waba.charcoal' : 'waba.muted'}>
                                    {isTitleValid ? (
                                        <CheckCircle2 size={16} color="#10B981" />
                                    ) : (
                                        <Circle size={16} color="#9E9DA6" />
                                    )}
                                    <Text fontWeight={isTitleValid ? '600' : '400'}>제목 5자 이상 입력</Text>
                                </HStack>

                                <HStack gap={2} color={isContentValid ? 'waba.charcoal' : 'waba.muted'}>
                                    {isContentValid ? (
                                        <CheckCircle2 size={16} color="#10B981" />
                                    ) : (
                                        <Circle size={16} color="#9E9DA6" />
                                    )}
                                    <Text fontWeight={isContentValid ? '600' : '400'}>본문 내용 30자 이상 충족</Text>
                                </HStack>

                                <HStack gap={2} color={isImageValid ? 'waba.charcoal' : 'waba.muted'}>
                                    {isImageValid ? (
                                        <CheckCircle2 size={16} color="#10B981" />
                                    ) : (
                                        <Circle size={16} color="#9E9DA6" />
                                    )}
                                    <Text fontWeight={isImageValid ? '600' : '400'}>고화질 사진 1장 이상 첨부</Text>
                                </HStack>

                                <HStack gap={2} color={isPinValid ? 'waba.charcoal' : 'waba.muted'}>
                                    {isPinValid ? (
                                        <CheckCircle2 size={16} color="#10B981" />
                                    ) : (
                                        <Circle size={16} color="#9E9DA6" />
                                    )}
                                    <Text fontWeight={isPinValid ? '600' : '400'}>상품 핀 최소 1개 이상 태깅</Text>
                                </HStack>
                            </VStack>
                        </Box>
                    </Box>
                </Flex>
            </Container>

            {/* ================================================================= */}
            {/* 4. PIN TAG DIALOG MODAL (Clean UX, Search, URL Parser, Pets API) */}
            {/* ================================================================= */}
            <Dialog.Root open={pinModalOpen} onOpenChange={(e) => setPinModalOpen(e.open)} placement="center" size="md">
                <Portal>
                    <Dialog.Backdrop backdropFilter="blur(10px)" bg="blackAlpha.500" />
                    <Dialog.Positioner>
                        <Dialog.Content rounded="28px" p={6} bg="white">
                            <Dialog.Header p={0} mb={4}>
                                <Flex justify="space-between" align="center">
                                    <Dialog.Title fontSize="18px" fontWeight="800" color="waba.charcoal">
                                        📌 사진 위 상품 / 반려동물 핀 태깅
                                    </Dialog.Title>
                                    <CloseButton size="sm" rounded="full" onClick={() => setPinModalOpen(false)} />
                                </Flex>
                                <Text fontSize="12px" color="waba.muted" mt={1}>
                                    선택한 위치 (가로: {pinCoords.x}%, 세로: {pinCoords.y}%)
                                </Text>
                            </Dialog.Header>

                            <Dialog.Body p={0}>
                                <VStack gap={4} align="stretch">
                                    {/* Tab Selector */}
                                    <Box>
                                        <Text fontSize="12px" fontWeight="700" color="waba.muted" mb={2}>
                                            핀 유형 선택
                                        </Text>
                                        <HStack gap={2}>
                                            <Button
                                                flex="1"
                                                size="sm"
                                                rounded="full"
                                                fontSize="12px"
                                                fontWeight="700"
                                                bg={pinTypeTab === 'INTERNAL_PRODUCT' ? 'waba.purple' : 'waba.subtle'}
                                                color={pinTypeTab === 'INTERNAL_PRODUCT' ? 'white' : 'waba.charcoal'}
                                                onClick={() => setPinTypeTab('INTERNAL_PRODUCT')}
                                            >
                                                ✨ 와바미 공식 (5% 적립)
                                            </Button>
                                            <Button
                                                flex="1"
                                                size="sm"
                                                rounded="full"
                                                fontSize="12px"
                                                fontWeight="600"
                                                bg={pinTypeTab === 'EXTERNAL_PRODUCT' ? 'waba.charcoal' : 'waba.subtle'}
                                                color={pinTypeTab === 'EXTERNAL_PRODUCT' ? 'white' : 'waba.charcoal'}
                                                onClick={() => setPinTypeTab('EXTERNAL_PRODUCT')}
                                            >
                                                🔗 외부 쇼핑몰 제휴
                                            </Button>
                                            <Button
                                                flex="1"
                                                size="sm"
                                                rounded="full"
                                                fontSize="12px"
                                                fontWeight="600"
                                                bg={pinTypeTab === 'PET' ? 'purple.700' : 'waba.subtle'}
                                                color={pinTypeTab === 'PET' ? 'white' : 'waba.charcoal'}
                                                onClick={() => setPinTypeTab('PET')}
                                            >
                                                🐾 반려동물 태그
                                            </Button>
                                        </HStack>
                                    </Box>

                                    {/* TAB 1: 와바미 공식 상품 */}
                                    {pinTypeTab === 'INTERNAL_PRODUCT' && (
                                        <Box>
                                            <Text fontSize="12px" fontWeight="700" color="waba.muted" mb={2}>
                                                와바미 상품 검색 &amp; 선택
                                            </Text>
                                            <HStack gap={2} mb={3}>
                                                <Input
                                                    value={productSearchKeyword}
                                                    onChange={(e) => {
                                                        setProductSearchKeyword(e.target.value);
                                                        fetchOfficialProducts(e.target.value);
                                                    }}
                                                    placeholder="와바미 상품명 또는 키워드 검색 (예: 워터볼, 매트, 캣폴...)"
                                                    fontSize="13px"
                                                    rounded="full"
                                                    borderColor="waba.border"
                                                />
                                                <IconButton
                                                    aria-label="상품 검색"
                                                    size="sm"
                                                    rounded="full"
                                                    bg="waba.purple"
                                                    color="white"
                                                    onClick={() => fetchOfficialProducts(productSearchKeyword)}
                                                    loading={isSearchingProducts}
                                                >
                                                    <Search size={15} />
                                                </IconButton>
                                            </HStack>

                                            <VStack gap={1.5} align="stretch" maxH="220px" overflowY="auto" pr={1}>
                                                {officialProducts.length === 0 ? (
                                                    <Text fontSize="12px" color="waba.faint" textAlign="center" py={4}>
                                                        검색된 와바미 상품이 없습니다.
                                                    </Text>
                                                ) : (
                                                    officialProducts.map((p) => {
                                                        const isSelected = selectedOfficialProduct?.id === p.id;
                                                        return (
                                                            <Box
                                                                key={p.id}
                                                                as="button"
                                                                onClick={() => setSelectedOfficialProduct(p)}
                                                                display="flex"
                                                                justifyContent="space-between"
                                                                alignItems="center"
                                                                p={2.5}
                                                                bg={isSelected ? 'purple.50' : 'waba.subtle'}
                                                                border="1px solid"
                                                                borderColor={isSelected ? 'waba.purple' : 'transparent'}
                                                                rounded="14px"
                                                                fontSize="12px"
                                                                textAlign="left"
                                                                _hover={{ bg: 'purple.50' }}
                                                            >
                                                                <HStack gap={2.5} overflow="hidden">
                                                                    {p.thumbnail_url && (
                                                                        <Image
                                                                            src={p.thumbnail_url}
                                                                            alt={p.name}
                                                                            w="36px"
                                                                            h="36px"
                                                                            rounded="8px"
                                                                            objectFit="cover"
                                                                        />
                                                                    )}
                                                                    <Box>
                                                                        <Text fontWeight="700" color="waba.charcoal" truncate>
                                                                            {p.name}
                                                                        </Text>
                                                                        <Text fontSize="11px" color="waba.muted" truncate>
                                                                            {p.summary || '와바미 라이프스타일 셀렉션'}
                                                                        </Text>
                                                                    </Box>
                                                                </HStack>
                                                                <HStack gap={2} flexShrink={0}>
                                                                    <Text fontWeight="800" color="waba.purple">
                                                                        {Number(p.sale_price).toLocaleString()}원
                                                                    </Text>
                                                                    {isSelected && <CheckCircle size={16} color="#6338A9" />}
                                                                </HStack>
                                                            </Box>
                                                        );
                                                    })
                                                )}
                                            </VStack>
                                        </Box>
                                    )}

                                    {/* TAB 2: 외부 쇼핑몰 제휴 */}
                                    {pinTypeTab === 'EXTERNAL_PRODUCT' && (
                                        <Box>
                                            <Text fontSize="12px" fontWeight="700" color="waba.muted" mb={2}>
                                                외부 쇼핑몰 URL 입력 및 메타데이터 가져오기
                                            </Text>
                                            <HStack gap={2} mb={3}>
                                                <Input
                                                    value={externalUrlInput}
                                                    onChange={(e) => setExternalUrlInput(e.target.value)}
                                                    placeholder="예: https://smartstore.naver.com/... 또는 쿠팡 링크"
                                                    fontSize="13px"
                                                    rounded="full"
                                                    borderColor="waba.border"
                                                />
                                                <Button
                                                    size="sm"
                                                    bg="waba.charcoal"
                                                    color="white"
                                                    _hover={{ bg: 'waba.charcoalHover' }}
                                                    rounded="full"
                                                    px={4}
                                                    fontSize="12px"
                                                    fontWeight="700"
                                                    onClick={handleParseExternalUrl}
                                                    loading={isParsingUrl}
                                                    flexShrink={0}
                                                >
                                                    <LinkIcon size={14} />
                                                    URL 분석
                                                </Button>
                                            </HStack>

                                            {parsedMetadata && !manualExternalFallback && (
                                                <Box p={3.5} bg="purple.50/50" rounded="16px" border="1px solid" borderColor="purple.200" mb={3}>
                                                    <Flex justify="space-between" align="center" mb={2}>
                                                        <HStack gap={1.5} color="waba.purple" fontSize="12px" fontWeight="700">
                                                            <CheckCircle2 size={15} />
                                                            <Text>메타데이터 자동 추출 완료</Text>
                                                        </HStack>
                                                        <Button
                                                            size="2xs"
                                                            variant="ghost"
                                                            color="waba.muted"
                                                            onClick={() => setManualExternalFallback(true)}
                                                        >
                                                            직접 수정
                                                        </Button>
                                                    </Flex>
                                                    <HStack gap={3}>
                                                        {parsedMetadata.thumbnail_url && (
                                                            <Image
                                                                src={parsedMetadata.thumbnail_url}
                                                                alt={parsedMetadata.product_name}
                                                                w="48px"
                                                                h="48px"
                                                                rounded="10px"
                                                                objectFit="cover"
                                                            />
                                                        )}
                                                        <Box overflow="hidden">
                                                            <Text fontSize="13px" fontWeight="700" color="waba.charcoal" truncate>
                                                                {parsedMetadata.product_name}
                                                            </Text>
                                                            <HStack gap={2} fontSize="12px" color="waba.muted">
                                                                <Text>{parsedMetadata.brand_name}</Text>
                                                                {parsedMetadata.price > 0 && (
                                                                    <Text fontWeight="700" color="waba.charcoal">
                                                                        {parsedMetadata.price.toLocaleString()}원
                                                                    </Text>
                                                                )}
                                                            </HStack>
                                                        </Box>
                                                    </HStack>
                                                </Box>
                                            )}

                                            {(!parsedMetadata || manualExternalFallback) && (
                                                <VStack gap={3} align="stretch" p={3.5} bg="waba.subtle" rounded="16px">
                                                    <Box>
                                                        <Text fontSize="12px" fontWeight="700" color="waba.muted" mb={1}>
                                                            상품명 (직접 입력)
                                                        </Text>
                                                        <Input
                                                            value={parsedMetadata?.product_name || ''}
                                                            onChange={(e) =>
                                                                setParsedMetadata({
                                                                    ...parsedMetadata,
                                                                    product_name: e.target.value,
                                                                    brand_name: parsedMetadata?.brand_name || '외부 제휴',
                                                                    price: parsedMetadata?.price || 0,
                                                                })
                                                            }
                                                            placeholder="예: 방수 스크래치프루프 라운드 소파"
                                                            fontSize="13px"
                                                            bg="white"
                                                            rounded="12px"
                                                        />
                                                    </Box>
                                                    <HStack gap={2}>
                                                        <Box flex="1">
                                                            <Text fontSize="12px" fontWeight="700" color="waba.muted" mb={1}>
                                                                브랜드 / 판매처
                                                            </Text>
                                                            <Input
                                                                value={parsedMetadata?.brand_name || ''}
                                                                onChange={(e) =>
                                                                    setParsedMetadata({
                                                                        ...parsedMetadata,
                                                                        product_name: parsedMetadata?.product_name || '',
                                                                        brand_name: e.target.value,
                                                                        price: parsedMetadata?.price || 0,
                                                                    })
                                                                }
                                                                placeholder="예: 쿠팡, 오늘의집"
                                                                fontSize="13px"
                                                                bg="white"
                                                                rounded="12px"
                                                            />
                                                        </Box>
                                                        <Box flex="1">
                                                            <Text fontSize="12px" fontWeight="700" color="waba.muted" mb={1}>
                                                                가격 (원)
                                                            </Text>
                                                            <Input
                                                                type="number"
                                                                value={parsedMetadata?.price || ''}
                                                                onChange={(e) =>
                                                                    setParsedMetadata({
                                                                        ...parsedMetadata,
                                                                        product_name: parsedMetadata?.product_name || '',
                                                                        brand_name: parsedMetadata?.brand_name || '외부 제휴',
                                                                        price: Number(e.target.value) || 0,
                                                                    })
                                                                }
                                                                placeholder="0"
                                                                fontSize="13px"
                                                                bg="white"
                                                                rounded="12px"
                                                            />
                                                        </Box>
                                                    </HStack>
                                                </VStack>
                                            )}
                                        </Box>
                                    )}

                                    {/* TAB 3: 반려동물 태그 */}
                                    {pinTypeTab === 'PET' && (
                                        <Box>
                                            <Text fontSize="12px" fontWeight="700" color="waba.muted" mb={2}>
                                                나의 등록된 반려동물 선택
                                            </Text>
                                            {userPetsList.length === 0 ? (
                                                <Box p={4} bg="waba.subtle" rounded="16px" textAlign="center">
                                                    <Text fontSize="12px" color="waba.muted">
                                                        등록된 반려동물이 없습니다. 마이페이지에서 먼저 아이를 등록해주세요.
                                                    </Text>
                                                </Box>
                                            ) : (
                                                <VStack gap={2} align="stretch">
                                                    {userPetsList.map((pet) => {
                                                        const isSelected = selectedPetForPin?.id === pet.id;
                                                        const speciesIcon = pet.species === 'CAT' ? '🐱' : pet.species === 'DOG' ? '🐶' : pet.species === 'RABBIT' ? '🐰' : '🐾';
                                                        return (
                                                            <Box
                                                                key={pet.id}
                                                                as="button"
                                                                onClick={() => setSelectedPetForPin(pet)}
                                                                display="flex"
                                                                justifyContent="space-between"
                                                                alignItems="center"
                                                                p={3}
                                                                bg={isSelected ? 'purple.50' : 'waba.subtle'}
                                                                border="1px solid"
                                                                borderColor={isSelected ? 'purple.400' : 'transparent'}
                                                                rounded="16px"
                                                                textAlign="left"
                                                                _hover={{ bg: 'purple.50' }}
                                                            >
                                                                <HStack gap={3}>
                                                                    <Avatar.Root size="sm">
                                                                        {pet.current_avatar_url ? (
                                                                            <Avatar.Image src={pet.current_avatar_url} />
                                                                        ) : (
                                                                            <Avatar.Fallback>{speciesIcon}</Avatar.Fallback>
                                                                        )}
                                                                    </Avatar.Root>
                                                                    <Box>
                                                                        <HStack gap={1.5}>
                                                                            <Text fontSize="13px" fontWeight="700" color="waba.charcoal">
                                                                                {pet.name}
                                                                            </Text>
                                                                            <Text fontSize="11px" color="waba.purple" fontWeight="600">
                                                                                {pet.species}
                                                                            </Text>
                                                                        </HStack>
                                                                        <Text fontSize="12px" color="waba.muted">
                                                                            {pet.breed} · {Number(pet.latest_weight_kg).toFixed(1)}kg
                                                                        </Text>
                                                                    </Box>
                                                                </HStack>
                                                                {isSelected && <CheckCircle size={18} color="#6338A9" />}
                                                            </Box>
                                                        );
                                                    })}
                                                </VStack>
                                            )}
                                        </Box>
                                    )}

                                    {/* Common Pin Memo */}
                                    <Box pt={2}>
                                        <Text fontSize="12px" fontWeight="700" color="waba.muted" mb={1.5}>
                                            사용자 팁 / 코멘트 (선택)
                                        </Text>
                                        <Input
                                            value={pinOptionMemo}
                                            onChange={(e) => setPinOptionMemo(e.target.value)}
                                            placeholder="예: 4.8kg 아이도 흔들림 없이 편안하게 쉬어요"
                                            rounded="14px"
                                            fontSize="13px"
                                            borderColor="waba.border"
                                        />
                                    </Box>
                                </VStack>
                            </Dialog.Body>

                            <Dialog.Footer p={0} mt={6}>
                                <HStack justify="flex-end" w="100%" gap={2}>
                                    <Button
                                        variant="outline"
                                        rounded="full"
                                        size="sm"
                                        borderColor="waba.border"
                                        onClick={() => setPinModalOpen(false)}
                                    >
                                        취소
                                    </Button>
                                    <Button
                                        bg="waba.purple"
                                        color="white"
                                        _hover={{ bg: 'waba.purpleHover' }}
                                        rounded="full"
                                        size="sm"
                                        px={5}
                                        fontWeight="700"
                                        onClick={handleSavePin}
                                    >
                                        핀 등록 완료
                                    </Button>
                                </HStack>
                            </Dialog.Footer>
                        </Dialog.Content>
                    </Dialog.Positioner>
                </Portal>
            </Dialog.Root>

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
            <Dialog.Root open={previewModalOpen} onOpenChange={(e) => setPreviewModalOpen(e.open)} placement="center" size="xl">
                <Portal>
                    <Dialog.Backdrop backdropFilter="blur(12px)" bg="blackAlpha.600" />
                    <Dialog.Positioner>
                        <Dialog.Content rounded="28px" maxW="900px" maxH="90vh" overflowY="auto" p={8} bg="white">
                            <Flex justify="space-between" align="center" mb={6}>
                                <HStack gap={2}>
                                    <Eye size={18} color="#6338A9" />
                                    <Heading fontSize="18px" fontWeight="800">
                                        에디토리얼 미리보기
                                    </Heading>
                                </HStack>
                                <CloseButton size="sm" rounded="full" onClick={() => setPreviewModalOpen(false)} />
                            </Flex>

                            <Heading fontSize="26px" fontWeight="800" color="waba.charcoal" mb={4}>
                                {title || '제목 없음'}
                            </Heading>

                            <VStack gap={6} align="stretch">
                                {blocks.map((b, idx) => {
                                    if (b.type === 'text') {
                                        if (!b.content.trim()) return null;
                                        return (
                                            <Text
                                                key={`prev-${idx}`}
                                                fontSize="15px"
                                                lineHeight="1.85"
                                                color="waba.charcoal"
                                                whiteSpace="pre-wrap"
                                            >
                                                {b.content}
                                            </Text>
                                        );
                                    }
                                    if (b.type === 'image') {
                                        return (
                                            <Box key={`prev-img-${idx}`} rounded="20px" overflow="hidden">
                                                <Image src={b.previewUrl} alt="미리보기 사진" w="100%" rounded="20px" />
                                                {b.caption && (
                                                    <Text fontSize="12px" color="waba.muted" mt={2} fontStyle="italic">
                                                        • {b.caption}
                                                    </Text>
                                                )}
                                            </Box>
                                        );
                                    }
                                    return null;
                                })}
                            </VStack>
                        </Dialog.Content>
                    </Dialog.Positioner>
                </Portal>
            </Dialog.Root>
        </Box>
    );
}
