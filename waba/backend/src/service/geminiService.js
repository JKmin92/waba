import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BACKEND_PUBLIC_DIR = path.resolve(__dirname, '../../public');

const VALID_CATEGORIES = [
    'CHECKUP',
    'VACCINE',
    'SURGERY',
    'MEDICATION',
    'GROOMING',
    'WEIGHT',
    'SYMPTOM',
    'NOTE'
];

const getModelName = () => process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite';

const getModelFallbackChain = (preferredModel = null) => {
    const primary = preferredModel || getModelName();
    const envFallbacks = process.env.GEMINI_FALLBACK_MODELS
        ? String(process.env.GEMINI_FALLBACK_MODELS).split(',').map((s) => s.trim()).filter(Boolean)
        : ['gemini-3.5-flash-lite', 'gemini-3.5-flash'];

    const chain = [];
    for (const m of [primary, ...envFallbacks]) {
        if (m && !chain.includes(m)) {
            chain.push(m);
        }
    }
    return chain;
};

const getAiClient = () => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || !String(apiKey).trim()) {
        const error = new Error('GEMINI_API_KEY_MISSING');
        error.status = 503;
        throw error;
    }
    return new GoogleGenAI({ apiKey: String(apiKey).trim() });
};

const classifyGeminiError = (err) => {
    if (err?.message === 'GEMINI_API_KEY_MISSING') {
        return { error: err, retryable: false };
    }
    if (err?.message === 'GEMINI_TIMEOUT') {
        return { error: err, retryable: true };
    }
    if (err?.message === 'GEMINI_EMPTY_RESPONSE') {
        return { error: err, retryable: true };
    }

    const statusCode = err?.status || err?.statusCode || 500;
    const errMsg = String(err?.message || '');
    const lowerMsg = errMsg.toLowerCase();

    if (lowerMsg.includes('api key') || statusCode === 401 || statusCode === 403) {
        const error = new Error('GEMINI_AUTH_ERROR');
        error.status = 503;
        return { error, retryable: false };
    }
    if (statusCode === 404 || errMsg.includes('404') || errMsg.includes('NOT_FOUND') || lowerMsg.includes('not found')) {
        const error = new Error('GEMINI_MODEL_NOT_FOUND');
        error.status = 502;
        return { error, retryable: true };
    }
    if (statusCode === 429 || errMsg.includes('429') || lowerMsg.includes('quota') || lowerMsg.includes('rate limit') || lowerMsg.includes('resource_exhausted')) {
        const error = new Error('GEMINI_QUOTA_EXCEEDED');
        error.status = 503;
        return { error, retryable: true };
    }
    if (statusCode === 503 || errMsg.includes('503') || errMsg.includes('UNAVAILABLE')) {
        const error = new Error('GEMINI_UNAVAILABLE');
        error.status = 503;
        return { error, retryable: true };
    }

    const error = new Error('GEMINI_REQUEST_FAILED');
    error.status = 502;
    return { error, retryable: false };
};

const callGeminiWithTimeout = async (ai, params) => {
    const timeoutMs = Number(process.env.GEMINI_TIMEOUT_MS) || 10000;
    const modelsToTry = getModelFallbackChain(params?.model);

    for (let i = 0; i < modelsToTry.length; i++) {
        const modelName = modelsToTry[i];
        try {
            const response = await Promise.race([
                ai.models.generateContent({ ...params, model: modelName }),
                new Promise((_, reject) =>
                    setTimeout(() => {
                        const err = new Error('GEMINI_TIMEOUT');
                        err.status = 504;
                        reject(err);
                    }, timeoutMs)
                )
            ]);
            if (!response?.text) {
                const error = new Error('GEMINI_EMPTY_RESPONSE');
                error.status = 502;
                throw error;
            }
            if (i > 0) {
                console.info(`✅ [Gemini Fallback] '${modelName}' 모델로 정상 응답 완료.`);
            }
            response._usedModel = modelName;
            return response;
        } catch (err) {
            const { error, retryable } = classifyGeminiError(err);
            const hasNext = i < modelsToTry.length - 1;

            if (retryable && hasNext) {
                console.warn(`⚠️ [Gemini Fallback] '${modelName}' 실패(${error.message}), 다음 모델('${modelsToTry[i + 1]}')로 자동 전환합니다.`);
                continue;
            }
            throw error;
        }
    }
};

const normalizeContentText = (content) => {
    if (!content) return '';
    if (typeof content === 'string') return content.trim();
    if (Array.isArray(content)) {
        return content
            .map((block) => {
                if (typeof block === 'string') return block;
                if (block && typeof block === 'object') {
                    return block.text || block.content || block.caption || '';
                }
                return '';
            })
            .filter(Boolean)
            .join('\n')
            .trim();
    }
    return String(content).trim();
};

const healthEventItemSchema = {
    type: Type.OBJECT,
    properties: {
        pet_names: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: '이 건강/케어 이벤트의 실제 당사자인 반려동물 이름 목록 (등록된 반려동물 목록 기준 정확히 매칭, 불명확하면 빈 배열)'
        },
        category: {
            type: Type.STRING,
            enum: VALID_CATEGORIES,
            description: '건강/케어 이벤트 카테고리 (CHECKUP, VACCINE, SURGERY, MEDICATION, GROOMING, WEIGHT, SYMPTOM, NOTE 중 1개)'
        },
        title: {
            type: Type.STRING,
            description: '20자 이내의 간결한 한 줄 제목 (예: 중성화 수술 완료, 심장사상충 접종)'
        },
        notes: {
            type: Type.STRING,
            description: '핵심 증상, 처치, 검진 결과 또는 시간대/다일 경과(오전/밤, N시간 뒤, 어제 → 오늘 등)를 1~3문장(필요 시 → 기호로 시간순 요약)으로 빠짐없이 기록'
        },
        event_date: {
            type: Type.STRING,
            description: 'YYYY-MM-DD 형식의 날짜. 글의 중심 사건일(다일 경과인 경우 가장 최근/기준 사건일)을 기준 날짜(todayDate)로 추론하고 불명확하면 todayDate 사용'
        },
        hospital_name: {
            type: Type.STRING,
            nullable: true,
            description: '본문에 언급된 동물병원 이름. 언급이 없으면 null'
        },
        weight_kg: {
            type: Type.NUMBER,
            nullable: true,
            description: '본문에 언급된 반려동물 체중(kg 단위 숫자). 언급이 없으면 null'
        }
    },
    required: ['pet_names', 'category', 'title', 'notes', 'event_date', 'hospital_name', 'weight_kg']
};

const healthEventsSchema = {
    type: Type.OBJECT,
    properties: {
        events: {
            type: Type.ARRAY,
            items: healthEventItemSchema,
            description: '글에서 분리 추출된 독립적인 건강/케어 이벤트 배열 (최대 4건, 기록할 이벤트가 없으면 빈 배열 [])'
        }
    },
    required: ['events']
};

/**
 * 게시글 본문(텍스트)에서 다중 반려동물/다중 건강 이벤트를 1회 호출로 분리 추출합니다.
 */
const extractImageUrlsFromContent = (content) => {
    if (!content) return [];
    const urls = [];

    const tryParseBlocks = (raw) => {
        if (Array.isArray(raw)) return raw;
        if (typeof raw === 'string') {
            const trimmed = raw.trim();
            if (trimmed.startsWith('[')) {
                try {
                    const parsed = JSON.parse(trimmed);
                    if (Array.isArray(parsed)) return parsed;
                } catch {
                    // ignore
                }
            }
        }
        return null;
    };

    const blocks = tryParseBlocks(content);
    if (blocks) {
        for (const block of blocks) {
            if (block?.type === 'image') {
                const candidate = block.url || block.src || block.image_url;
                if (typeof candidate === 'string' && candidate.trim()) {
                    urls.push(candidate.trim());
                }
            }
        }
    }

    const text = typeof content === 'string' ? content : JSON.stringify(content);
    const htmlImgRegex = /<img[^>]+src=["']([^"']+)["']/gi;
    let match;
    while ((match = htmlImgRegex.exec(text)) !== null) {
        if (match[1]?.trim()) urls.push(match[1].trim());
    }

    const mdImgRegex = /!\[[^\]]*\]\(([^)]+)\)/g;
    while ((match = mdImgRegex.exec(text)) !== null) {
        if (match[1]?.trim()) urls.push(match[1].trim());
    }

    return [...new Set(urls)];
};

const readLocalImageInlineData = (imageUrl) => {
    if (!imageUrl || typeof imageUrl !== 'string') return null;
    const trimmed = imageUrl.trim();
    if (!trimmed.startsWith('/uploads/')) return null;

    const relativePath = trimmed.replace(/^\/+/, '');
    const resolvedPath = path.resolve(BACKEND_PUBLIC_DIR, relativePath);
    if (!resolvedPath.startsWith(BACKEND_PUBLIC_DIR)) return null;

    try {
        if (!fs.existsSync(resolvedPath) || !fs.statSync(resolvedPath).isFile()) {
            return null;
        }
        const ext = path.extname(resolvedPath).toLowerCase();
        const mimeMap = {
            '.webp': 'image/webp',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.gif': 'image/gif'
        };
        const mimeType = mimeMap[ext];
        if (!mimeType) return null;

        const data = fs.readFileSync(resolvedPath).toString('base64');
        return { mimeType, data };
    } catch {
        return null;
    }
};

const getDecisionAiClient = () => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || !String(apiKey).trim()) {
        const error = new Error('GEMINI_API_KEY_MISSING');
        error.status = 503;
        throw error;
    }
    return new GoogleGenAI({ apiKey: String(apiKey).trim(), apiVersion: 'v1beta' });
};

const getDecisionModelName = () => process.env.GEMINI_DECISION_MODEL || 'gemini-decision-1';

const getDecisionHealthThreshold = () => {
    const parsed = Number(process.env.DECISION_HEALTH_THRESHOLD);
    return Number.isFinite(parsed) ? parsed : 0.5;
};

/**
 * Gemini Decisions API(gemini-decision-1)를 이용해 1차 일상글 필터링을 수행합니다.
 * Fail-open: 오류 발생 시 경고 로그만 남기고 true를 반환하여 기존 추출로 진행합니다.
 */
export const shouldExtractHealthEvents = async ({
    ai,
    title = '',
    content = '',
    normalizedPets = '',
    imageInlineData = null
} = {}) => {
    if (process.env.ENABLE_DECISIONS_FILTER === 'false') {
        return true;
    }

    const decisionInput = [
        normalizedPets ? `[등록된 반려동물 목록]\n${normalizedPets}` : null,
        title ? `[게시글 제목] ${title}` : null,
        content ? `[게시글 본문]\n${content}` : null
    ].filter(Boolean).join('\n\n');

    if (!decisionInput) {
        return false;
    }

    const threshold = getDecisionHealthThreshold();
    const model = getDecisionModelName();

    try {
        const decisionAi = getDecisionAiClient() || ai;
        const inputPayload = imageInlineData
            ? [decisionInput, { inlineData: imageInlineData }]
            : decisionInput;
        const result = await decisionAi.decisions.create({
            model,
            input: inputPayload,
            questions: {
                has_health_event: {
                    type: 'noul',
                    instructions: '반려동물 커뮤니티 게시글에 등록된 반려동물의 건강·진료·예방접종·수술·투약·신체 이상 증상·사고/이물질 섭취·체중 변화·위생 케어·완치 등 건강 수첩에 기록할 만한 실제 사건이 포함되어 있는지 판정하세요. 단순 산책·나들이·간식 먹방·일상·감정 언급이나 단순 제품 추천/비용 문의 같은 일반 질문은 제외하되, "초코 다쳤어요. 어떻게해요?"처럼 본인 반려동물의 실제 부상·증상·이상 징후가 사진이나 글로 보고된 경우는 true입니다.'
                },
                ...(normalizedPets ? {
                    is_own_registered_pet: {
                        type: 'noul',
                        instructions: '게시글 속 건강/케어 사건의 실제 당사자가 [등록된 반려동물 목록]에 포함된 작성자 본인의 반려동물인지 판정하세요. 목록의 반려동물 이름이 직접 언급되었거나, 등록된 반려동물 이름의 한글 음차/영문 표기 변형(예: john ↔ 존, coco ↔ 코코)이 사용되었거나, 이름이 생략되었더라도 문맥상 작성자 본인의 반려동물 이야기면 true입니다. 반면 친구·지인·이웃·타인의 반려동물, 길고양이·유기동물, 또는 특정 반려동물 사건이 아닌 일반 건강 정보·질문글이면 false입니다.'
                    }
                } : {})
            }
        });

        const noul = result?.answers?.has_health_event?.noul;
        const ownPetNoul = result?.answers?.is_own_registered_pet?.noul;
        if (typeof noul === 'number' && Number.isFinite(noul)) {
            if (noul < threshold) {
                console.info(`[Gemini Decisions] 일상글로 판정되어 건강 수첩 추출을 건너뜁니다. (has_health_event=${noul}, threshold=${threshold})`);
                return false;
            }
            if (normalizedPets && typeof ownPetNoul === 'number' && Number.isFinite(ownPetNoul) && ownPetNoul < threshold) {
                console.info(`[Gemini Decisions] 작성자 본인의 등록된 반려동물 사건이 아니므로 건강 수첩 추출을 건너뜁니다. (has_health_event=${noul}, is_own_registered_pet=${ownPetNoul}, threshold=${threshold})`);
                return false;
            }
            console.info(`[Gemini Decisions] 건강 수첩 추출 대상 판정 (has_health_event=${noul}${normalizedPets ? `, is_own_registered_pet=${ownPetNoul}` : ''}, threshold=${threshold})`);
            return true;
        }

        console.warn('[Gemini Decisions] 응답 형식이 예상과 달라 기존 추출로 진행합니다.');
        return true;
    } catch (err) {
        console.warn('[Gemini Decisions] 필터 호출 실패, 기존 추출로 폴백합니다:', err?.message || err);
        return true;
    }
};

export const extractPetHealthEvents = async ({
    title = '',
    content = '',
    pets = [],
    petName = '',
    species = '',
    todayDate = new Date().toISOString().slice(0, 10)
} = {}) => {
    const ai = getAiClient();
    const model = getModelName();

    const textTitle = String(title || '').trim();
    const textContent = normalizeContentText(content);
    const imageUrls = extractImageUrlsFromContent(content);
    const hasImage = imageUrls.length > 0;
    const compactLength = [textTitle, textContent].filter(Boolean).join('').replace(/\s+/g, '').length;

    if (!textTitle && !textContent && !hasImage) {
        return { events: [] };
    }

    if (!hasImage && compactLength < 10) {
        return { events: [] };
    }

    const petNamesList = Array.isArray(pets) && pets.length > 0
        ? pets.map((p) => String(p?.name || '').trim()).filter(Boolean)
        : (petName ? [String(petName).trim()] : []);

    let imageInlineData = null;
    if (hasImage && compactLength <= 30) {
        const combinedTextLower = `${textTitle} ${textContent}`.toLowerCase();
        const hasMentionedPet = petNamesList.some((n) => combinedTextLower.includes(n.toLowerCase()));
        const hasEnglishPetName = petNamesList.some((n) => /[a-zA-Z]/.test(n));
        if (!hasMentionedPet && !hasEnglishPetName) {
            return { events: [] };
        }
        imageInlineData = readLocalImageInlineData(imageUrls[0]);
    }

    const normalizedPets = Array.isArray(pets) && pets.length > 0
        ? pets.map((p) => {
            const sp = p.custom_species || p.species || '';
            const br = p.breed ? `, ${p.breed}` : '';
            return `- ${p.name}${sp ? ` (${sp}${br})` : ''}`;
        }).join('\n')
        : (petName ? `- ${petName}${species ? ` (${species})` : ''}` : '');

    const shouldExtract = await shouldExtractHealthEvents({
        ai,
        title: textTitle,
        content: textContent,
        normalizedPets,
        imageInlineData
    });
    if (!shouldExtract) {
        return { events: [] };
    }

    const systemInstruction = [
        '당신은 반려동물 커뮤니티 WABA의 스마트 건강 수첩 AI 어시스턴트입니다.',
        '보호자가 작성한 게시글(제목 및 본문)을 분석하여 반려동물의 건강/메디컬/케어 수첩에 기록할 가치가 있는 독립 이벤트를 최대 4건까지 분리 추출하세요.',
        '',
        '[핵심 판별 원칙]',
        '"반려동물의 몸 상태·건강·식습관·체중·안전(사고/이물질 섭취)과 관련이 있어 보호자나 수의사가 참고할 만한 내용인가?"',
        '- [게시글 제목]과 [게시글 본문] **둘 중 어느 한쪽에만** 건강/진료/접종/체중/증상/특별 케어 내용이 포함되어 있어도 반드시 추출하세요.',
        '',
        '[다중 반려동물·다중 이벤트 분리 및 엄격한 일상 제외 규칙]',
        '1. 글 안에 서로 다른 건강/케어 이벤트(예: "심장사상충 주사 맞음"과 "다음주 중성화 수술 예약")가 함께 있으면 최대 4건까지 각각 독립적인 이벤트 객체로 분리해 `events` 배열에 담으세요.',
        '2. 둘 이상의 반려동물이 **같은 건강/케어 이벤트를 함께** 겪은 경우(예: "오늘 모아랑 초코가 심장사상충 주사 맞고 왔어요")에는 1개의 이벤트에 `pet_names: ["모아", "초코"]`로 함께 묶으세요.',
        '3. 각 이벤트의 `pet_names`에는 [등록된 반려동물 목록] 중 **해당 건강/케어 이벤트의 실제 당사자** 이름만 정확히 넣으세요. 영문↔한글 음차(예: `존` → `john`)로 언급된 경우에도 `pet_names`에는 반드시 `[등록된 반려동물 목록]`에 등록된 이름 그대로 출력하세요.',
        '4. **엄격한 일상 제외 규칙:** 어떤 반려동물이 건강·진료·접종·수술·투약·증상·체중·위생 케어의 당사자가 아니라 단순히 감정·안부·일상 맥락으로만 언급된 경우(예: "초코 중성화 수술 무사히 끝났어요. 집에서 혼자 기다렸을 모아에게 미안하네요")에는 그 반려동물(모아)을 **절대** `pet_names`에 넣거나 별도 이벤트로 생성하지 마세요. 오직 실제 건강 이벤트 당사자(초코) 1건만 추출하세요.',
        '5. **작성자 본인 반려동물 한정 규칙 (제3자 제외):** 친구·지인·이웃·타인의 반려동물, 길고양이·유기동물, 또는 일반 건강 정보글의 사례는 **절대** 추출하지 마세요. 반드시 `[등록된 반려동물 목록]`에 속한 작성자 본인의 반려동물에게 실제로 발생한 사건만 추출하세요.',
        '6. 기록할 만한 건강/케어 이벤트가 전혀 없으면 `events: []` 빈 배열을 반환하세요.',
        '',
        '[반드시 기록 대상에 포함해야 할 케이스]',
        '1. 병원 진료, 건강검진(CHECKUP), 예방접종(VACCINE), 수술(SURGERY), 수술/진료 예약, 영수증/처방전/진단서',
        '2. 투약, 처치, 영양제/연고 복용(MEDICATION)',
        '3. 신체 이상 증상 및 외상·사고(SYMPTOM): 구토, 설사, 기침, 피부 발적, 다리 절뚝임, 산책 중 발바닥 다침/아파함 등',
        '4. 이물질/금지 음식 섭취 및 관련 질문글(SYMPTOM)',
        '5. 식욕·음수량·배변·컨디션 변화(SYMPTOM 또는 NOTE)',
        '6. 체중·체형 변화(WEIGHT): 구체적 kg 수치 및 정성적 체중 변화 언급 포함',
        '7. 위생·미용 케어(GROOMING): 발톱 깎기, 귀 청소, 항문낭 관리, 약용 목욕 등',
        '',
        '[기록 제외 대상]',
        '- 건강 이슈나 사고·증상이 전혀 없는 단순 산책·나들이·여행·애견카페 방문',
        '- 건강/식욕 맥락 없는 단순 먹방·귀여움 자랑·용품 자랑·단순 감정/미안함 언급',
        '',
        '[시간대 및 다일(Multi-day) 경과 요약 규칙]',
        '- 글 안에 시간 순서와 경과가 있으면 notes에 시간 흐름 순서대로 1~3문장으로 요약하세요.',
        `- 기준 날짜(todayDate)는 ${todayDate} 입니다. event_date는 글의 중심 사건일을 todayDate 기준으로 YYYY-MM-DD 추론하고, 불명확하면 ${todayDate}를 사용하세요.`,
        '- title은 반드시 공백 포함 20자 이내의 간결한 한국어 한 줄 제목으로 작성하세요.',
        '- hospital_name과 weight_kg는 본문에 명시된 경우에만 추출하고, 없으면 반드시 null로 반환하세요.'
    ].join('\n');

    const userPrompt = [
        normalizedPets ? `[등록된 반려동물 목록]\n${normalizedPets}` : null,
        `[기준 날짜] ${todayDate}`,
        textTitle ? `[게시글 제목] ${textTitle}` : null,
        textContent ? `[게시글 본문]\n${textContent}` : null
    ].filter(Boolean).join('\n\n');

    const response = await callGeminiWithTimeout(ai, {
        model,
        contents: imageInlineData ? [userPrompt, { inlineData: imageInlineData }] : userPrompt,
        config: {
            systemInstruction,
            responseMimeType: 'application/json',
            responseSchema: healthEventsSchema,
            temperature: 0.1
        }
    });

    const parsed = JSON.parse(response.text);
    const rawEvents = Array.isArray(parsed?.events) ? parsed.events.slice(0, 4) : [];

    const events = rawEvents.map((ev) => {
        const safeCategory = VALID_CATEGORIES.includes(ev?.category) ? ev.category : 'NOTE';
        const safeDate = /^\d{4}-\d{2}-\d{2}$/.test(String(ev?.event_date || ''))
            ? String(ev.event_date)
            : todayDate;
        const safeWeight = (ev?.weight_kg !== null && ev?.weight_kg !== undefined && !Number.isNaN(Number(ev.weight_kg)))
            ? Number(ev.weight_kg)
            : null;
        const safePetNames = Array.isArray(ev?.pet_names)
            ? ev.pet_names.map((n) => String(n || '').trim()).filter(Boolean)
            : [];

        return {
            pet_names: safePetNames,
            category: safeCategory,
            title: String(ev?.title || '').trim().slice(0, 20),
            notes: String(ev?.notes || '').trim(),
            event_date: safeDate,
            hospital_name: ev?.hospital_name ? String(ev.hospital_name).trim() : null,
            weight_kg: safeWeight
        };
    }).filter((ev) => ev.title || ev.notes);

    return { events };
};

/**
 * 단건 호환 래퍼: extractPetHealthEvents 결과의 첫 번째 이벤트를 반환합니다.
 */
export const extractPetHealthEvent = async ({
    title = '',
    content = '',
    pets = [],
    petName = '',
    species = '',
    todayDate = new Date().toISOString().slice(0, 10)
} = {}) => {
    const { events } = await extractPetHealthEvents({ title, content, pets, petName, species, todayDate });
    if (!events || events.length === 0) {
        return {
            has_event: false,
            category: 'NOTE',
            title: '',
            notes: '',
            event_date: todayDate,
            hospital_name: null,
            weight_kg: null
        };
    }
    const first = events[0];
    return {
        has_event: true,
        ...first
    };
};
