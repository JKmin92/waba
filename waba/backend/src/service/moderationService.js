import sharp from 'sharp';

const OPENAI_MODERATION_URL = 'https://api.openai.com/v1/moderations';
const DEFAULT_MODERATION_MODEL = 'omni-moderation-latest';

const getModerationThresholds = () => ({
    sexualBlock: Number(process.env.MODERATION_SEXUAL_THRESHOLD) || 0.5,
    sexualMinorsBlock: Number(process.env.MODERATION_SEXUAL_MINORS_THRESHOLD) || 0.2,
    violenceSensitive: Number(process.env.MODERATION_VIOLENCE_THRESHOLD) || 0.35
});

/**
 * OpenAI Moderation API 단일 result 객체에 대한 판별 분기 로직
 */
export const evaluateModerationResult = (result) => {
    if (!result || typeof result !== 'object') {
        return { blocked: false, isSensitive: false, reason: null };
    }

    const { sexualBlock, sexualMinorsBlock, violenceSensitive } = getModerationThresholds();
    const scores = result.category_scores || {};
    const categories = result.categories || {};

    const sexualScore = Number(scores.sexual || 0);
    const sexualMinorsScore = Number(scores['sexual/minors'] || 0);
    const isSexualMinorsFlagged = categories['sexual/minors'] === true;

    if (sexualScore >= sexualBlock || sexualMinorsScore >= sexualMinorsBlock || isSexualMinorsFlagged) {
        return {
            blocked: true,
            isSensitive: false,
            reason: 'SEXUAL_CONTENT'
        };
    }

    const violenceGraphicScore = Number(scores['violence/graphic'] || 0);
    const violenceScore = Number(scores.violence || 0);

    if (violenceGraphicScore >= violenceSensitive || violenceScore >= violenceSensitive) {
        return {
            blocked: false,
            isSensitive: true,
            reason: 'SENSITIVE_VIOLENCE'
        };
    }

    return {
        blocked: false,
        isSensitive: false,
        reason: null
    };
};

/**
 * 이미지 버퍼를 경량화(512px JPEG)한 뒤 OpenAI omni-moderation-latest API로 검사합니다.
 * API 키 미설정/네트워크/타임아웃 오류 시에는 Fail-open으로 업로드를 허용합니다.
 */
export const moderateImageBuffer = async (buffer) => {
    if (!buffer || !Buffer.isBuffer(buffer)) {
        return { blocked: false, isSensitive: false, reason: null };
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        console.warn('⚠️ [Moderation] OPENAI_API_KEY가 설정되지 않아 이미지 모더레이션을 건너뜁니다 (Fail-open).');
        return { blocked: false, isSensitive: false, reason: null };
    }

    const timeoutMs = Number(process.env.MODERATION_TIMEOUT_MS) || 10000;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const resizedBuffer = await sharp(buffer)
            .rotate()
            .resize({ width: 512, withoutEnlargement: true })
            .jpeg({ quality: 80 })
            .toBuffer();

        const dataUri = `data:image/jpeg;base64,${resizedBuffer.toString('base64')}`;

        const response = await fetch(OPENAI_MODERATION_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: DEFAULT_MODERATION_MODEL,
                input: [
                    {
                        type: 'image_url',
                        image_url: { url: dataUri }
                    }
                ]
            }),
            signal: controller.signal
        });

        if (!response.ok) {
            const errText = await response.text().catch(() => '');
            console.warn(`⚠️ [Moderation] OpenAI API 응답 오류 (${response.status}): ${errText.slice(0, 200)} (Fail-open)`);
            return { blocked: false, isSensitive: false, reason: null };
        }

        const data = await response.json();
        const firstResult = data?.results?.[0];
        return evaluateModerationResult(firstResult);
    } catch (err) {
        const msg = err?.name === 'AbortError' ? `TIMEOUT(${timeoutMs}ms)` : (err?.message || String(err));
        console.warn(`⚠️ [Moderation] 이미지 모더레이션 검사 실패 (Fail-open): ${msg}`);
        return { blocked: false, isSensitive: false, reason: null };
    } finally {
        clearTimeout(timer);
    }
};

/**
 * 게시글의 새로 업로드된 이미지 블록들(req.files)에 대해 모더레이션을 일괄 수행합니다.
 */
export const moderatePostUploadFiles = async ({ files = [], contentBlocks = [] } = {}) => {
    const sensitivityByFileIndex = {};
    if (!Array.isArray(files) || files.length === 0 || !Array.isArray(contentBlocks)) {
        return { blocked: false, sensitivityByFileIndex };
    }

    const fileIndicesToCheck = new Set();
    for (const block of contentBlocks) {
        if (block?.type === 'image' && block.fileIndex !== undefined && files[block.fileIndex]) {
            fileIndicesToCheck.add(block.fileIndex);
        }
    }

    if (fileIndicesToCheck.size === 0) {
        return { blocked: false, sensitivityByFileIndex };
    }

    const checks = await Promise.all(
        Array.from(fileIndicesToCheck).map(async (fileIndex) => {
            const verdict = await moderateImageBuffer(files[fileIndex].buffer);
            return { fileIndex, verdict };
        })
    );

    for (const { fileIndex, verdict } of checks) {
        if (verdict.blocked) {
            return {
                blocked: true,
                reason: verdict.reason || 'SEXUAL_CONTENT',
                fileIndex,
                sensitivityByFileIndex
            };
        }
        sensitivityByFileIndex[fileIndex] = Boolean(verdict.isSensitive);
    }

    return {
        blocked: false,
        sensitivityByFileIndex
    };
};
