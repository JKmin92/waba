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
export const processAndSavePostImages = async ({ postId, createdAt, files = [], contentBlocks = [] }) => {
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

            // Check if there is an uploaded file for this block
            if (block.fileIndex !== undefined && files[block.fileIndex]) {
                const file = files[block.fileIndex];
                const fileName = `${imageOrder}.webp`;
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
