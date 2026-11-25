import * as postModel from '../models/postModel.js';
import * as userModel from '../models/userModel.js';
import { extractPetHealthEvents } from './geminiService.js';

export const getEditablePost = async (userId, postId) => {
    return await postModel.getEditablePost(userId, postId);
}

export const getOwnedPublishedPostMeta = async (userId, postId) => {
    return await postModel.getOwnedPublishedPostMeta(userId, postId);
}

export const getMainPostList = async () => {
    return await postModel.getMainPostList();
}

export const getPostDetail = async (postId, userId = null, shouldIncrement = false) => {
    return await postModel.getPostDetail(postId, userId, shouldIncrement);
}

export const togglePostLike = async (postId, userId) => {
    return await postModel.togglePostLike(postId, userId);
}

export const togglePostBookmark = async (postId, userId) => {
    return await postModel.togglePostBookmark(postId, userId);
}

export const createComment = async (postId, userId, data) => {
    return await postModel.createComment(postId, userId, data);
}

export const deleteComment = async (commentId, userId) => {
    return await postModel.deleteComment(commentId, userId);
}

export const updateComment = async (commentId, userId, content) => {
    return await postModel.updateComment(commentId, userId, content);
}

export const togglePinComment = async (postId, commentId, userId) => {
    return await postModel.togglePinComment(postId, commentId, userId);
}

export const getBoardList = async () => {
    return await postModel.getBoardList();
}

export const isValidBoardId = async (boardId) => {
    return await postModel.isValidBoardId(boardId);
}

export const getPostList = async (boardId) => {
    return await postModel.getPostList(boardId);
}

const parseAutoJournalFlag = (val) => {
    if (val === true || val === 'true' || val === 1 || val === '1') return true;
    if (val === false || val === 'false' || val === 0 || val === '0') return false;
    return undefined;
};

const tryAutoJournalForPost = async (userId, {
    postId,
    title,
    content,
    selected_pets = [],
    auto_journal,
    auto_journal_pet_id,
    auto_journal_journey_id,
    isPostUpdate = false
}) => {
    try {
        const explicitFlag = parseAutoJournalFlag(auto_journal);
        const shouldRun = explicitFlag !== undefined
            ? explicitFlag
            : await userModel.getAutoJournalSetting(userId);

        if (!shouldRun) {
            return { attempted: false, created: false, updated: false, reason: 'AUTO_JOURNAL_DISABLED' };
        }

        let existingAiHistories = [];
        if (isPostUpdate && postId) {
            const linkedHistories = await userModel.getPetHistoriesByPostId(userId, postId);
            if (linkedHistories.some((h) => !h.is_ai_generated)) {
                return { attempted: false, created: false, updated: false, reason: 'MANUAL_HISTORY_EXISTS' };
            }
            existingAiHistories = linkedHistories.filter((h) => h.is_ai_generated === 1);
        }

        const userPets = await userModel.getUserPets(userId);
        const fallbackPetId = auto_journal_pet_id
            || (Array.isArray(selected_pets) ? selected_pets[0] : null)
            || existingAiHistories[0]?.pet_id
            || userPets[0]?.id
            || null;
        if (userPets.length === 0 && !fallbackPetId) {
            return { attempted: false, created: false, updated: false, reason: 'NO_TARGET_PET' };
        }

        const todayDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date());
        const aiTimeoutMs = Number(process.env.AUTO_JOURNAL_TIMEOUT_MS) || 25000;

        const extracted = await Promise.race([
            extractPetHealthEvents({
                title,
                content,
                pets: userPets,
                todayDate
            }),
            new Promise((_, reject) =>
                setTimeout(() => reject(new Error('AUTO_JOURNAL_TIMEOUT')), aiTimeoutMs)
            )
        ]);

        const events = Array.isArray(extracted?.events) ? extracted.events : [];
        if (events.length === 0) {
            return { attempted: true, created: false, updated: false, reason: 'NO_HEALTH_EVENT_DETECTED' };
        }

        const resolveEventPetIds = (ev) => {
            const matched = [];
            for (const rawName of ev.pet_names || []) {
                const targetName = String(rawName || '').trim().toLowerCase();
                if (!targetName) continue;
                const found = userPets.find((p) => String(p.name || '').trim().toLowerCase() === targetName)
                    || userPets.find((p) => String(p.name || '').trim().toLowerCase().includes(targetName) || targetName.includes(String(p.name || '').trim().toLowerCase()));
                if (found && !matched.includes(found.id)) {
                    matched.push(found.id);
                }
            }
            if (matched.length > 0) return matched;
            return fallbackPetId ? [fallbackPetId] : [];
        };

        if (existingAiHistories.length > 0) {
            const usedExistingIds = new Set();
            const updatedHistories = [];
            const createdHistories = [];

            for (const ev of events) {
                const evPetIds = resolveEventPetIds(ev);
                if (evPetIds.length === 0) continue;

                // 펫 ID가 겹치는 기존 AI 기록 우선 매칭, 단건끼리면 1:1 매칭
                let targetExisting = existingAiHistories.find((h) => !usedExistingIds.has(h.id) && evPetIds.includes(h.pet_id));
                if (!targetExisting && existingAiHistories.length === 1 && events.length === 1 && !usedExistingIds.has(existingAiHistories[0].id)) {
                    targetExisting = existingAiHistories[0];
                }

                if (targetExisting) {
                    usedExistingIds.add(targetExisting.id);
                    const newStep = (ev.notes || ev.title || '').trim();
                    const baseText = (targetExisting.description || targetExisting.title || '').trim();
                    const steps = baseText ? baseText.split('->').map((s) => s.trim()).filter(Boolean) : [];
                    const lastStep = steps[steps.length - 1] || '';

                    const nextDescription = newStep && lastStep !== newStep
                        ? (baseText ? `${baseText} -> ${newStep}` : newStep)
                        : (baseText || newStep || null);
                    const nextTitle = ev.title || targetExisting.title;

                    const history = await userModel.updateUserHistory(userId, targetExisting.id, {
                        event_date: targetExisting.event_date,
                        title: nextTitle,
                        category: ev.category || targetExisting.category,
                        description: nextDescription,
                        hospital_name: ev.hospital_name ?? targetExisting.hospital_name,
                        weight_kg: ev.weight_kg ?? targetExisting.weight_kg,
                        journey_id: targetExisting.journey_id,
                        pet_ids: evPetIds,
                        is_ai_generated: 1
                    });
                    updatedHistories.push(history);
                } else {
                    const history = await userModel.createUserHistory(userId, {
                        pet_ids: evPetIds,
                        event_date: ev.event_date || todayDate,
                        title: ev.title || String(title || '').trim().slice(0, 20),
                        category: ev.category || 'NOTE',
                        description: ev.notes || null,
                        hospital_name: ev.hospital_name || null,
                        weight_kg: ev.weight_kg ?? null,
                        journey_id: null,
                        post_ids: postId ? [postId] : [],
                        is_ai_generated: 1
                    });
                    createdHistories.push(history);
                }
            }

            const allHistories = [...updatedHistories, ...createdHistories];
            return {
                attempted: true,
                created: createdHistories.length > 0,
                updated: updatedHistories.length > 0,
                created_count: createdHistories.length,
                updated_count: updatedHistories.length,
                histories: allHistories,
                history: allHistories[0] || null
            };
        }

        // 최초 작성 시: 기본 미분류(journey_id: null)로 분리된 이벤트 각각 생성
        const createdHistories = [];
        for (const ev of events) {
            const evPetIds = resolveEventPetIds(ev);
            if (evPetIds.length === 0) continue;

            const history = await userModel.createUserHistory(userId, {
                pet_ids: evPetIds,
                event_date: ev.event_date || todayDate,
                title: ev.title || String(title || '').trim().slice(0, 20),
                category: ev.category || 'NOTE',
                description: ev.notes || null,
                hospital_name: ev.hospital_name || null,
                weight_kg: ev.weight_kg ?? null,
                journey_id: null,
                post_ids: postId ? [postId] : [],
                is_ai_generated: 1
            });
            createdHistories.push(history);
        }

        return {
            attempted: true,
            created: createdHistories.length > 0,
            updated: false,
            created_count: createdHistories.length,
            histories: createdHistories,
            history: createdHistories[0] || null
        };
    } catch (err) {
        console.warn('⚠️ Auto-Journal failed safely without blocking post creation:', err?.message || err);
        return {
            attempted: true,
            created: false,
            updated: false,
            reason: err?.message || 'AUTO_JOURNAL_ERROR'
        };
    }
};

export const createPost = async (userId, data) => {
    const result = await postModel.createPost(userId, data);

    if (data.status === 'PUBLISHED' && data.enableAutoJournalHook && data.isPostUpdate !== true) {
        const autoJournalResult = await tryAutoJournalForPost(userId, {
            postId: data.postId || result?.postId,
            title: data.title,
            content: data.content,
            selected_pets: data.selected_pets,
            auto_journal: data.auto_journal,
            auto_journal_pet_id: data.auto_journal_pet_id,
            auto_journal_journey_id: data.auto_journal_journey_id,
            isPostUpdate: data.isPostUpdate === true
        });
        return {
            ...result,
            auto_journal_result: autoJournalResult
        };
    }

    return result;
};

export const getUserDraft = async (userId, draftId = null) => {
    return await postModel.getUserDraft(userId, draftId);
};

export const getUserDrafts = async (userId) => {
    return await postModel.getUserDrafts(userId);
};

export const deleteDraft = async (userId, postId) => {
    return await postModel.deleteDraft(userId, postId);
};

export const deletePost = async (userId, postId, userRole) => {
    return await postModel.deletePost(userId, postId, userRole);
};

export const getUserPosts = async (userId) => {
    return await postModel.getUserPosts(userId);
};

export const getUserBookmarks = async (userId) => {
    return await postModel.getUserBookmarks(userId);
};

export const getUserLikes = async (userId) => {
    return await postModel.getUserLikes(userId);
};

export const getUserReportedDeletedPosts = async (userId) => {
    return await postModel.getUserReportedDeletedPosts(userId);
};

export const submitPostAppeal = async (userId, postId, reason) => {
    return await postModel.submitPostAppeal(userId, postId, reason);
};

export const createPostReport = async (reporterUserId, postId, data) => {
    return await postModel.createPostReport(reporterUserId, postId, data);
};

export const toggleCommentLike = async (commentId, userId) => {
    return await postModel.toggleCommentLike(commentId, userId);
};
