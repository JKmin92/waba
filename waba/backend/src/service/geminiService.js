import { GoogleGenAI, Type } from '@google/genai';

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

const healthEventSchema = {
    type: Type.OBJECT,
    properties: {
        has_event: {
            type: Type.BOOLEAN,
            description: '진료, 수술, 예방접종, 투약, 미용, 체중 변화, 증상 등 반려동물 건강/케어 기록으로 남길 만한 이벤트가 있는지 여부'
        },
        category: {
            type: Type.STRING,
            enum: VALID_CATEGORIES,
            description: '건강/케어 이벤트 카테고리 (CHECKUP, VACCINE, SURGERY, MEDICATION, GROOMING, WEIGHT, SYMPTOM, NOTE 중 1개)'
        },
        title: {
            type: Type.STRING,
            description: '20자 이내의 간결한 한 줄 제목 (예: 중성화 수술 완료, 정기 건강검진)'
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
    required: ['has_event', 'category', 'title', 'notes', 'event_date', 'hospital_name', 'weight_kg']
};

/**
 * 게시글 본문(텍스트)에서 반려동물 건강 수첩 기록(Smart Auto-Journal)을 자동 추출합니다.
 */
export const extractPetHealthEvent = async ({
    title = '',
    content = '',
    petName = '',
    species = '',
    todayDate = new Date().toISOString().slice(0, 10)
} = {}) => {
    const ai = getAiClient();
    const model = getModelName();

    const textTitle = String(title || '').trim();
    const textContent = normalizeContentText(content);

    if (!textTitle && !textContent) {
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

    const petContext = [
        petName ? `반려동물 이름: ${petName}` : null,
        species ? `종: ${species}` : null
    ].filter(Boolean).join(', ');

    const systemInstruction = [
        '당신은 반려동물 커뮤니티 WABA의 스마트 건강 수첩 AI 어시스턴트입니다.',
        '보호자가 작성한 게시글(제목 및 본문)을 분석하여 반려동물의 건강/메디컬/케어 수첩에 기록할 가치가 있는지 판단하고 구조화된 JSON으로 추출하세요.',
        '',
        '[핵심 판별 원칙]',
        '"반려동물의 몸 상태·건강·식습관·체중·안전(사고/이물질 섭취)과 관련이 있어 보호자나 수의사가 참고할 만한 내용인가?"',
        '- [게시글 제목]과 [게시글 본문] **둘 중 어느 한쪽에만** 건강/진료/접종/체중/증상/특별 케어 내용이 포함되어 있어도(예: 본문은 단순 일상이나 산책 이야기지만 제목에 예방접종·병원·증상 등이 있는 경우) 반드시 `has_event: true`로 판정하고 해당 이벤트를 추출하세요.',
        '',
        '[반드시 기록 대상(has_event: true)에 포함해야 할 케이스]',
        '1. 병원 진료, 건강검진(CHECKUP), 예방접종(VACCINE), 수술(SURGERY), 영수증/처방전/진단서',
        '2. 투약, 처치, 영양제/연고 복용(MEDICATION)',
        '3. 신체 이상 증상 및 외상·사고(SYMPTOM): 구토, 설사, 기침, 피부 발적, 다리 절뚝임, 산책 중 발바닥 다침/아파함 등',
        '4. 이물질/금지 음식 섭취 및 관련 질문글(SYMPTOM): 예) "모래를 먹었는데 괜찮나요?", "산책하다 이상한 걸 주워 먹었는지 기운이 없어요", "초콜릿을 조금 먹었어요" 등',
        '5. 식욕·음수량·배변·컨디션 변화(SYMPTOM 또는 NOTE): 예) "밥/물을 잘 안 먹는다", "물을 갑자기 너무 많이 마신다", 혹은 아팠던 아이가 "이제 밥/물을 잘 먹는다, 상태가 좋아졌다" 같은 회복 경과',
        '6. 체중·체형 변화(WEIGHT): 구체적 kg 수치뿐 아니라 "살이 쪘다 / 살이 빠졌다 / 체중이 늘었다" 등 정성적 체중 변화 언급도 반드시 포함',
        '7. 위생·미용 케어(GROOMING): 발톱 깎기, 귀 청소, 항문낭 관리, 약용 목욕 등',
        '',
        '[기록 제외(has_event: false) 대상]',
        '- 건강 이슈나 사고·증상이 전혀 없는 단순 산책·나들이·여행·애견카페 방문 ("오늘 한강 산책 즐거웠어요")',
        '- 건강/식욕 맥락 없는 단순 먹방·귀여움 자랑 ("자는 모습 심쿵", "간식 맛있게 먹는 중")',
        '- 단순 용품 구매/자랑 ("새 하네스/캣타워 샀어요")',
        '',
        '[시간대 및 다일(Multi-day) 경과 요약 규칙]',
        '- 글 안에 "오전/오후/저녁/밤/새벽", "2시간 뒤", "몇 시간 후", "어제 ... → 오늘 ...", "며칠 전부터 ..." 같은 시간 순서와 경과가 있으면 절대 생략하지 말고 notes에 시간 흐름 순서대로(필요 시 `[오전] ... → [밤/2시간 뒤] ...` 또는 `[어제] ... → [오늘] ...` 형식 활용) 1~3문장으로 빠짐없이 요약하세요.',
        `- 기준 날짜(todayDate)는 ${todayDate} 입니다. event_date는 글의 중심 사건일(여러 날에 걸친 경과일 경우 가장 최근/기준 사건일)을 todayDate 기준으로 YYYY-MM-DD 추론하고, 날짜 단서가 전혀 없으면 ${todayDate}를 사용하세요.`,
        '- title은 반드시 공백 포함 20자 이내의 간결한 한국어 한 줄 제목으로 작성하세요.',
        '- hospital_name과 weight_kg는 본문에 명시된 경우에만 추출하고, 없으면 반드시 null로 반환하세요.'
    ].join('\n');

    const userPrompt = [
        petContext ? `[반려동물 정보] ${petContext}` : null,
        `[기준 날짜] ${todayDate}`,
        textTitle ? `[게시글 제목] ${textTitle}` : null,
        textContent ? `[게시글 본문]\n${textContent}` : null
    ].filter(Boolean).join('\n\n');

    const response = await callGeminiWithTimeout(ai, {
        model,
        contents: userPrompt,
        config: {
            systemInstruction,
            responseMimeType: 'application/json',
            responseSchema: healthEventSchema,
            temperature: 0.1
        }
    });

    const parsed = JSON.parse(response.text);
    const safeCategory = VALID_CATEGORIES.includes(parsed.category) ? parsed.category : 'NOTE';
    const safeDate = /^\d{4}-\d{2}-\d{2}$/.test(String(parsed.event_date || ''))
        ? String(parsed.event_date)
        : todayDate;
    const safeWeight = (parsed.weight_kg !== null && parsed.weight_kg !== undefined && !Number.isNaN(Number(parsed.weight_kg)))
        ? Number(parsed.weight_kg)
        : null;

    return {
        has_event: Boolean(parsed.has_event),
        category: safeCategory,
        title: String(parsed.title || '').trim().slice(0, 20),
        notes: String(parsed.notes || '').trim(),
        event_date: safeDate,
        hospital_name: parsed.hospital_name ? String(parsed.hospital_name).trim() : null,
        weight_kg: safeWeight
    };
};
