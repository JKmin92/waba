import multer from 'multer';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PUBLIC_BASE_DIR = path.resolve(__dirname, '../public');

// 1. Multer memory storage (files processed in RAM before writing to disk)
const storage = multer.memoryStorage();

export const uploadPostImages = multer({
    storage,
    limits: {
        fileSize: 25 * 1024 * 1024, // 25MB max per image
        files: 20 // max 20 images per post
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('이미지 파일(jpg, png, webp 등)만 업로드할 수 있습니다.'));
        }
    }
}).array('images', 20);

// 2. Date path extractor (YY / MM / DD / HH / mm)
export const getPostDatePath = (dateInput) => {
    const d = dateInput ? new Date(dateInput) : new Date();
    const yy = String(d.getFullYear()).slice(-2);
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return { yy, mm, dd, hh, min, relPath: `${yy}/${mm}/${dd}/${hh}/${min}` };
};

// 3. Process with sharp and save to public/{YY}/{MM}/{DD}/{HH}/{mm}/{postId}/
// Rule compliance: max width 1500px, withoutEnlargement: true, 72 DPI, .rotate(), WebP (82 quality)
// uniqueNames=true (게시글 수정 시): 기존 이미지 파일(1.webp, 2.webp...)을 덮어쓰지 않도록 고유 파일명 사용
export const processAndSavePostImages = async ({ postId, createdAt, files = [], contentBlocks = [], uniqueNames = false, sensitivityByFileIndex = {} }) => {
    const { yy, mm, dd, hh, min } = getPostDatePath(createdAt);
    const postDir = path.join(PUBLIC_BASE_DIR, yy, mm, dd, hh, min, postId);

    let hasNewImages = false;
    for (const b of contentBlocks) {
        if (b.type === 'image' && b.fileIndex !== undefined && files[b.fileIndex]) {
            hasNewImages = true;
            break;
        }
    }

    if (hasNewImages) {
        await fs.promises.mkdir(postDir, { recursive: true });
    }

    let imageOrder = 1;
    const resolvedBlocks = [];

    for (const block of contentBlocks) {
        if (block.type === 'text') {
            resolvedBlocks.push(block);
            continue;
        }

        if (block.type === 'image') {
            let finalImageUrl = block.image_url || block.previewUrl || '';
            let isSensitive = Boolean(block.is_sensitive);

            // Check if there is an uploaded file for this block
            if (block.fileIndex !== undefined && files[block.fileIndex]) {
                isSensitive = Boolean(sensitivityByFileIndex[block.fileIndex]);
                const file = files[block.fileIndex];
                const fileName = uniqueNames ? `e${Date.now()}_${imageOrder}.webp` : `${imageOrder}.webp`;
                const destFilePath = path.join(postDir, fileName);

                // Sharp pipeline according to image-upload-rule.md:
                // 1) .rotate() EXIF orientation auto-correction & strip EXIF location
                // 2) .resize() max 1500px width with aspect ratio, withoutEnlargement: true
                // 3) .withMetadata({ density: 72 }) 72 DPI
                // 4) .webp({ quality: 82 }) WebP format
                const optimizedBuffer = await sharp(file.buffer)
                    .rotate()
                    .resize({
                        width: 1500,
                        withoutEnlargement: true,
                        fit: 'inside'
                    })
                    .withMetadata({ density: 72 })
                    .webp({ quality: 82 })
                    .toBuffer();

                await fs.promises.writeFile(destFilePath, optimizedBuffer);

                // Public URL path
                finalImageUrl = `/public/${yy}/${mm}/${dd}/${hh}/${min}/${postId}/${fileName}`;
            }

            resolvedBlocks.push({
                ...block,
                image_url: finalImageUrl,
                previewUrl: finalImageUrl,
                is_sensitive: isSensitive,
                sort_order: imageOrder
            });

            imageOrder++;
        }
    }

    return resolvedBlocks;
};

// 4. Delete entire postId folder on post / draft deletion
export const deletePostFolder = async (postId, createdAt) => {
    try {
        if (!postId || !createdAt) return;
        const { yy, mm, dd, hh, min } = getPostDatePath(createdAt);
        const postDir = path.join(PUBLIC_BASE_DIR, yy, mm, dd, hh, min, postId);

        if (fs.existsSync(postDir)) {
            await fs.promises.rm(postDir, { recursive: true, force: true });
            console.log(`[Image Cleanup] Successfully deleted folder: ${postDir}`);
        }
    } catch (err) {
        console.error(`[Image Cleanup Error] Failed to delete folder for post ${postId}:`, err);
    }
};

// 4-1. 게시글 수정 후, 더 이상 본문에서 사용하지 않는 이미지 파일 정리
export const cleanupUnusedPostImages = async (postId, createdAt, keepUrls = []) => {
    try {
        if (!postId || !createdAt) return;
        const { yy, mm, dd, hh, min } = getPostDatePath(createdAt);
        const postDir = path.join(PUBLIC_BASE_DIR, yy, mm, dd, hh, min, postId);
        if (!fs.existsSync(postDir)) return;

        const keepNames = new Set(keepUrls.filter(Boolean).map((u) => path.basename(String(u))));
        const entries = await fs.promises.readdir(postDir);
        for (const name of entries) {
            if (!keepNames.has(name)) {
                await fs.promises.unlink(path.join(postDir, name)).catch(() => {});
            }
        }
    } catch (err) {
        console.error(`[Image Cleanup Error] Failed to clean unused images for post ${postId}:`, err);
    }
};

// 5. Single Profile Image Uploader & Sharp Processor (image-upload-rule.md compliant)
export const uploadProfileImage = multer({
    storage,
    limits: {
        fileSize: 15 * 1024 * 1024 // 15MB max
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('이미지 파일만 업로드할 수 있습니다.'));
        }
    }
}).single('profile_image');

export const processAndSaveProfileImage = async (userId, file) => {
    if (!file || !file.buffer) return null;

    // 1. 메타데이터 분석 및 최소 가로 150px 검증
    const imageInstance = sharp(file.buffer).rotate();
    const metadata = await imageInstance.metadata();

    const origWidth = metadata.width || 0;
    const origHeight = metadata.height || 0;

    if (origWidth < 150) {
        throw new Error('프로필 이미지는 최소 가로 150px 이상이어야 합니다.');
    }

    // 2. 가로/세로 중앙 기준 1:1 정사각형 크롭 및 최대 500px 제한
    // 500px을 넘기면 500x500으로, 500px 미만이면 원본 짧은 변 크기 기준으로 무손실 정사각형 크롭
    const targetSize = Math.min(Math.min(origWidth, origHeight), 500);

    // 3. 디렉토리 샤딩 (Directory Sharding)
    // 수만 명 이상의 사용자가 프로필 이미지를 등록해도 단일 디렉토리에 파일이 과도하게 집중되지 않도록
    // userId의 앞 2자리(p1)와 그 다음 2자리(p2)를 계층형 폴더로 분산 저장합니다.
    const safeId = String(userId || 'anonymous').replace(/[^a-zA-Z0-9_-]/g, '');
    const p1 = safeId.length >= 2 ? safeId.slice(0, 2) : '00';
    const p2 = safeId.length >= 4 ? safeId.slice(2, 4) : '00';

    const profileDir = path.join(PUBLIC_BASE_DIR, 'profiles', p1, p2);
    await fs.promises.mkdir(profileDir, { recursive: true });

    const fileName = `${safeId}_${Date.now()}.webp`;
    const destFilePath = path.join(profileDir, fileName);

    const optimizedBuffer = await imageInstance
        .resize({
            width: targetSize,
            height: targetSize,
            fit: 'cover',
            position: 'centre' // 중앙 정렬: 세로가 길면 상/하, 가로가 길면 좌/우 자동 크롭
        })
        .withMetadata({ density: 72 })
        .webp({ quality: 85 })
        .toBuffer();

    await fs.promises.writeFile(destFilePath, optimizedBuffer);
    return `/public/profiles/${p1}/${p2}/${fileName}`;
};

// 6. Delete old profile image on replacement or reset
export const deleteProfileImageFile = async (imageUrl) => {
    try {
        if (!imageUrl || typeof imageUrl !== 'string') return;
        // 로컬에 저장된 이미지 경로만 삭제 (/public/ 또는 public/ 기준)
        if (!imageUrl.startsWith('/public/') && !imageUrl.startsWith('public/')) return;

        const relativePath = imageUrl.replace(/^\/?public\//, '');
        const targetPath = path.resolve(PUBLIC_BASE_DIR, relativePath);

        // 보안 검증: targetPath가 PUBLIC_BASE_DIR 내부인지 확인 (Path Traversal 방지)
        if (!targetPath.startsWith(PUBLIC_BASE_DIR)) {
            console.warn(`[Image Cleanup Security] Path traversal blocked: ${imageUrl}`);
            return;
        }

        if (fs.existsSync(targetPath)) {
            await fs.promises.unlink(targetPath);
            console.log(`[Image Cleanup] Successfully deleted old profile image: ${targetPath}`);
        }
    } catch (err) {
        console.error(`[Image Cleanup Error] Failed to delete profile image ${imageUrl}:`, err);
    }
};


// 7. Pet Avatar Image Uploader & Sharp Processor (image-upload-rule.md compliant)
export const uploadPetAvatar = multer({
    storage,
    limits: {
        fileSize: 15 * 1024 * 1024 // 15MB max
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('이미지 파일만 업로드할 수 있습니다.'));
        }
    }
}).single('avatar_image');

export const processAndSavePetAvatar = async (userId, petId, file) => {
    if (!file || !file.buffer) return null;

    const imageInstance = sharp(file.buffer).rotate();
    const metadata = await imageInstance.metadata();

    const origWidth = metadata.width || 0;
    const origHeight = metadata.height || 0;

    if (origWidth < 150) {
        throw new Error('반려동물 아바타 이미지는 최소 가로 150px 이상이어야 합니다.');
    }

    // 1:1 중앙 정사각형 크롭 및 최대 500px 제한 (withoutEnlargement: 원본 짧은 변 기준)
    const targetSize = Math.min(Math.min(origWidth, origHeight), 500);

    // 디렉토리 샤딩: public/pets/{p1}/{p2}/
    const safeUserId = String(userId || 'anonymous').replace(/[^a-zA-Z0-9_-]/g, '');
    const safePetId = String(petId || 'pet').replace(/[^a-zA-Z0-9_-]/g, '');
    const p1 = safeUserId.length >= 2 ? safeUserId.slice(0, 2) : '00';
    const p2 = safeUserId.length >= 4 ? safeUserId.slice(2, 4) : '00';

    const petDir = path.join(PUBLIC_BASE_DIR, 'pets', p1, p2);
    await fs.promises.mkdir(petDir, { recursive: true });

    const fileName = `${safePetId}_${Date.now()}.webp`;
    const destFilePath = path.join(petDir, fileName);

    const optimizedBuffer = await imageInstance
        .resize({
            width: targetSize,
            height: targetSize,
            fit: 'cover',
            position: 'centre'
        })
        .withMetadata({ density: 72 })
        .webp({ quality: 85 })
        .toBuffer();

    await fs.promises.writeFile(destFilePath, optimizedBuffer);
    return `/public/pets/${p1}/${p2}/${fileName}`;
};
