import * as notebookModel from '../models/notebookModel.js';

const handleKnownError = (res, next, e) => {
    if (e.message === 'NOTEBOOK_NOT_FOUND') {
        return res.status(404).json({ success: false, message: '건강 수첩을 찾을 수 없습니다.' });
    }
    if (e.message === 'COMMENT_NOT_FOUND') {
        return res.status(404).json({ success: false, message: '댓글을 찾을 수 없습니다.' });
    }
    if (e.message === 'FORBIDDEN') {
        return res.status(403).json({ success: false, message: '권한이 없습니다.' });
    }
    if (e.message === 'INVALID_STATUS') {
        return res.status(400).json({ success: false, message: '유효하지 않은 수첩 상태입니다. (ACTIVE, CURED, COMPLETED 중 선택)' });
    }
    if (e.message === 'CONTENT_REQUIRED') {
        return res.status(400).json({ success: false, message: '댓글 내용을 입력해주세요.' });
    }
    if (e.message === 'EVENT_DATE_REQUIRED') {
        return res.status(400).json({ success: false, message: '기록 날짜를 입력해주세요.' });
    }
    if (e.message === 'TITLE_REQUIRED') {
        return res.status(400).json({ success: false, message: '기록 제목을 입력해주세요.' });
    }
    return next(e);
};

export const getNotebooks = async (req, res, next) => {
    try {
        const userId = req.user?.userId || null;
        const { tab = 'all', status = 'ALL', category = '', q = '', page = 1, limit = 12 } = req.query;
        const result = await notebookModel.getNotebooks({ userId, tab, status, category, q, page, limit });
        return res.status(200).json({ success: true, ...result });
    } catch (e) {
        return handleKnownError(res, next, e);
    }
};

export const getNotebookDetail = async (req, res, next) => {
    try {
        const userId = req.user?.userId || null;
        const { idOrSlug } = req.params;
        const detail = await notebookModel.getNotebookDetail(idOrSlug, userId);
        return res.status(200).json({ success: true, ...detail });
    } catch (e) {
        return handleKnownError(res, next, e);
    }
};

export const toggleNotebookScrap = async (req, res, next) => {
    try {
        const userId = req.user?.userId;
        if (!userId) return res.status(401).json({ success: false, message: '로그인이 필요합니다.' });
        const result = await notebookModel.toggleNotebookScrap(Number(req.params.id), userId);
        return res.status(200).json({ success: true, ...result });
    } catch (e) {
        return handleKnownError(res, next, e);
    }
};

export const updateNotebookStatus = async (req, res, next) => {
    try {
        const userId = req.user?.userId;
        if (!userId) return res.status(401).json({ success: false, message: '로그인이 필요합니다.' });
        const journey = await notebookModel.updateNotebookStatus(Number(req.params.id), userId, req.body);
        return res.status(200).json({ success: true, journey });
    } catch (e) {
        return handleKnownError(res, next, e);
    }
};

export const createNotebookComment = async (req, res, next) => {
    try {
        const userId = req.user?.userId;
        if (!userId) return res.status(401).json({ success: false, message: '로그인이 필요합니다.' });
        const comment = await notebookModel.createNotebookComment(Number(req.params.id), userId, req.body?.content);
        return res.status(201).json({ success: true, comment });
    } catch (e) {
        return handleKnownError(res, next, e);
    }
};

export const deleteNotebookComment = async (req, res, next) => {
    try {
        const userId = req.user?.userId;
        if (!userId) return res.status(401).json({ success: false, message: '로그인이 필요합니다.' });
        const result = await notebookModel.deleteNotebookComment(Number(req.params.id), Number(req.params.commentId), userId);
        return res.status(200).json({ success: true, ...result });
    } catch (e) {
        return handleKnownError(res, next, e);
    }
};

export const createNotebookHistory = async (req, res, next) => {
    try {
        const userId = req.user?.userId;
        if (!userId) return res.status(401).json({ success: false, message: '로그인이 필요합니다.' });
        const history = await notebookModel.createNotebookHistory(Number(req.params.id), userId, req.body);
        return res.status(201).json({ success: true, history });
    } catch (e) {
        return handleKnownError(res, next, e);
    }
};
