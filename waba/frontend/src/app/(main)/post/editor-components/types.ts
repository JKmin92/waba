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
    is_sensitive?: boolean;
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
    auto_journal?: boolean;
    auto_journal_pet_id?: string | null;
    auto_journal_journey_id?: string | null;
}

export interface EditorProps {
    mode?: 'create' | 'edit';
    postId?: string;
    initialData?: Partial<PostEditorData>;
    onSubmit?: (data: PostEditorData, draftPostId?: string) => Promise<void> | void;
    onSaveDraft?: (data: PostEditorData, draftPostId?: string) => Promise<string | undefined> | void;
    isSubmitting?: boolean;
}

export interface ParsedExternalMetadata {
    product_name: string;
    brand_name: string;
    price: number;
    thumbnail_url?: string;
}

export const DRAFT_STORAGE_KEY = 'waba_post_draft';
