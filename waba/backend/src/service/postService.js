import * as postModel from '../models/postModel.js';
import * as userModel from '../models/userModel.js';
import { extractPetHealthEvent } from './geminiService.js';

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

export const getBoardList = async () => {
    return await postModel.getBoardList();
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

        let existingAiHistory = null;
        if (isPostUpdate && postId) {
            const linkedHistories = await userModel.getPetHistoriesByPostId(userId, postId);
            if (linkedHistories.some((h) => !h.is_ai_generated)) {
                return { attempted: false, created: false, updated: false, reason: 'MANUAL_HISTORY_EXISTS' };
            }
            existingAiHistory = linkedHistories.find((h) => h.is_ai_generated === 1) || null;
        }

        const targetPetId = auto_journal_pet_id
            || (Array.isArray(selected_pets) ? selected_pets[0] : null)
            || existingAiHistory?.pet_id
            || null;
        if (!targetPetId) {
            return { attempted: false, created: false, updated: false, reason: 'NO_TARGET_PET' };
        }

        const pet = await userModel.getUserPetById(userId, targetPetId);
        if (!pet) {
            return { attempted: false, created: false, updated: false, reason: 'PET_NOT_FOUND' };
        }

        const todayDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date());
        const aiTimeoutMs = Number(process.env.AUTO_JOURNAL_TIMEOUT_MS) || 25000;

        const chosenEvent = await Promise.race([
            extractPetHealthEvent({
                title,
                content,
                petName: pet.name,
                species: pet.custom_species || pet.species || '',
                todayDate
            }),
            new Promise((_, reject) =>
                setTimeout(() => reject(new Error('AUTO_JOURNAL_TIMEOUT')), aiTimeoutMs)
            )
        ]);

        if (!chosenEvent?.has_event) {
            return { attempted: true, created: false, updated: false, reason: 'NO_HEALTH_EVENT_DETECTED' };
        }

        if (existingAiHistory) {
            const newStep = (chosenEvent.notes || chosenEvent.title || '').trim();
            const baseText = (existingAiHistory.description || existingAiHistory.title || '').trim();
            const steps = baseText ? baseText.split('->').map((s) => s.trim()).filter(Boolean) : [];
            const lastStep = steps[steps.length - 1] || '';

            const nextDescription = newStep && lastStep !== newStep
                ? (baseText ? `${baseText} -> ${newStep}` : newStep)
                : (baseText || newStep || null);
            const nextTitle = chosenEvent.title || existingAiHistory.title;

            const history = await userModel.updatePetHistory(userId, existingAiHistory.pet_id, existingAiHistory.id, {
                event_date: existingAiHistory.event_date,
                title: nextTitle,
                category: chosenEvent.category || existingAiHistory.category,
                description: nextDescription,
                hospital_name: chosenEvent.hospital_name ?? existingAiHistory.hospital_name,
                weight_kg: chosenEvent.weight_kg ?? existingAiHistory.weight_kg,
                journey_id: existingAiHistory.journey_id,
                is_ai_generated: 1
            });

            return {
                attempted: true,
                created: false,
                updated: true,
                history
            };
        }

        const parsedJourneyId = auto_journal_journey_id !== undefined && auto_journal_journey_id !== null && String(auto_journal_journey_id).trim() !== ''
            ? Number(auto_journal_journey_id)
            : null;

        const history = await userModel.createPetHistory(userId, targetPetId, {
            event_date: chosenEvent.event_date || todayDate,
            title: chosenEvent.title || String(title || '').trim().slice(0, 20),
            category: chosenEvent.category || 'NOTE',
            description: chosenEvent.notes || null,
            hospital_name: chosenEvent.hospital_name || null,
            weight_kg: chosenEvent.weight_kg ?? null,
            journey_id: Number.isFinite(parsedJourneyId) ? parsedJourneyId : null,
            post_ids: postId ? [postId] : [],
            is_ai_generated: 1
        });

        return {
            attempted: true,
            created: true,
            updated: false,
            history
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

    if (data.status === 'PUBLISHED' && data.enableAutoJournalHook) {
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

export const getUserDraft = async (userId) => {
    return await postModel.getUserDraft(userId);
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
