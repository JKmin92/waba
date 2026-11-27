import * as adminService from '../service/adminService.js';

export const getMe = async (req, res, next) => {
    try {
        const result = await adminService.getAdminMe(req.adminUser);
        return res.status(200).json({
            success: true,
            ...result
        });
    } catch (err) {
        next(err);
    }
};

export const getDashboard = async (req, res, next) => {
    try {
        const { period = '7d', q = '' } = req.query || {};
        const overview = await adminService.getDashboardOverview({ period, q });
        return res.status(200).json({
            success: true,
            ...overview
        });
    } catch (err) {
        next(err);
    }
};

export const togglePostCuration = async (req, res, next) => {
    try {
        const { postId } = req.params;
        const { curation_grade, is_curated, curation_target_species } = req.body || {};
        const ipAddress = req.ip || req.headers['x-forwarded-for'] || null;
        const result = await adminService.togglePostCuration(
            postId,
            { curation_grade, is_curated, curation_target_species },
            req.adminUser,
            ipAddress
        );
        return res.status(200).json({
            success: true,
            ...result
        });
    } catch (err) {
        if (err.message === 'POST_NOT_FOUND') {
            return res.status(404).json({ success: false, message: '게시글을 찾을 수 없습니다.' });
        }
        if (err.status) {
            return res.status(err.status).json({ success: false, message: err.message });
        }
        next(err);
    }
};

export const getPosts = async (req, res, next) => {
    try {
        const result = await adminService.getAdminPosts(req.query || {});
        return res.status(200).json({ success: true, ...result });
    } catch (err) {
        next(err);
    }
};

export const getPostDetail = async (req, res, next) => {
    try {
        const { postId } = req.params;
        const result = await adminService.getAdminPostDetail(postId);
        return res.status(200).json({ success: true, ...result });
    } catch (err) {
        if (err.message === 'POST_NOT_FOUND') {
            return res.status(404).json({ success: false, message: '게시글을 찾을 수 없습니다.' });
        }
        next(err);
    }
};

export const updatePostStatus = async (req, res, next) => {
    try {
        const { postId } = req.params;
        const { status, reason } = req.body || {};
        const ipAddress = req.ip || req.headers['x-forwarded-for'] || null;
        const result = await adminService.updateAdminPostStatus(postId, status, reason, req.adminUser, ipAddress);
        return res.status(200).json({ success: true, ...result });
    } catch (err) {
        if (err.message === 'POST_NOT_FOUND') {
            return res.status(404).json({ success: false, message: '게시글을 찾을 수 없습니다.' });
        }
        if (err.status) {
            return res.status(err.status).json({ success: false, message: err.message });
        }
        next(err);
    }
};

export const togglePostImageSensitive = async (req, res, next) => {
    try {
        const { imageId } = req.params;
        const { is_sensitive } = req.body || {};
        const ipAddress = req.ip || req.headers['x-forwarded-for'] || null;
        const result = await adminService.togglePostImageSensitive(imageId, Boolean(is_sensitive), req.adminUser, ipAddress);
        return res.status(200).json({ success: true, ...result });
    } catch (err) {
        if (err.message === 'IMAGE_NOT_FOUND') {
            return res.status(404).json({ success: false, message: '이미지를 찾을 수 없습니다.' });
        }
        next(err);
    }
};

export const getComments = async (req, res, next) => {
    try {
        const result = await adminService.getAdminComments(req.query || {});
        return res.status(200).json({ success: true, ...result });
    } catch (err) {
        next(err);
    }
};

export const updateCommentStatus = async (req, res, next) => {
    try {
        const { commentId } = req.params;
        const { status, reason } = req.body || {};
        const ipAddress = req.ip || req.headers['x-forwarded-for'] || null;
        const result = await adminService.updateAdminCommentStatus(commentId, status, reason, req.adminUser, ipAddress);
        return res.status(200).json({ success: true, ...result });
    } catch (err) {
        if (err.message === 'COMMENT_NOT_FOUND') {
            return res.status(404).json({ success: false, message: '댓글을 찾을 수 없습니다.' });
        }
        if (err.status) {
            return res.status(err.status).json({ success: false, message: err.message });
        }
        next(err);
    }
};

export const getHistories = async (req, res, next) => {
    try {
        const result = await adminService.getAdminHistories(req.query || {});
        return res.status(200).json({ success: true, ...result });
    } catch (err) {
        next(err);
    }
};

export const getHistoryDetail = async (req, res, next) => {
    try {
        const { historyId } = req.params;
        const result = await adminService.getAdminHistoryDetail(historyId);
        return res.status(200).json({ success: true, ...result });
    } catch (err) {
        if (err.message === 'HISTORY_NOT_FOUND') {
            return res.status(404).json({ success: false, message: '건강 기록을 찾을 수 없습니다.' });
        }
        next(err);
    }
};

export const updateHistoryVisibility = async (req, res, next) => {
    try {
        const { historyId } = req.params;
        const { is_private, reason } = req.body || {};
        const ipAddress = req.ip || req.headers['x-forwarded-for'] || null;
        const result = await adminService.updateAdminHistoryVisibility(historyId, Boolean(is_private), reason, req.adminUser, ipAddress);
        return res.status(200).json(result);
    } catch (err) {
        if (err.message === 'HISTORY_NOT_FOUND') {
            return res.status(404).json({ success: false, message: '건강 기록을 찾을 수 없습니다.' });
        }
        if (err.status) {
            return res.status(err.status).json({ success: false, message: err.message });
        }
        next(err);
    }
};

export const getNotebooks = async (req, res, next) => {
    try {
        const result = await adminService.getAdminNotebooks(req.query || {});
        return res.status(200).json({ success: true, ...result });
    } catch (err) {
        next(err);
    }
};

export const getNotebookDetail = async (req, res, next) => {
    try {
        const { journeyId } = req.params;
        const result = await adminService.getAdminNotebookDetail(journeyId);
        return res.status(200).json({ success: true, ...result });
    } catch (err) {
        if (err.message === 'NOTEBOOK_NOT_FOUND') {
            return res.status(404).json({ success: false, message: '수첩 그룹을 찾을 수 없습니다.' });
        }
        next(err);
    }
};

export const updateNotebookShareScope = async (req, res, next) => {
    try {
        const { journeyId } = req.params;
        const { share_scope, reason } = req.body || {};
        const ipAddress = req.ip || req.headers['x-forwarded-for'] || null;
        const result = await adminService.updateAdminNotebookShareScope(journeyId, share_scope, reason, req.adminUser, ipAddress);
        return res.status(200).json(result);
    } catch (err) {
        if (err.message === 'NOTEBOOK_NOT_FOUND') {
            return res.status(404).json({ success: false, message: '수첩 그룹을 찾을 수 없습니다.' });
        }
        if (err.status) {
            return res.status(err.status).json({ success: false, message: err.message });
        }
        next(err);
    }
};

export const getBoards = async (req, res, next) => {
    try {
        const result = await adminService.getAdminBoards(req.query || {});
        return res.status(200).json({ success: true, ...result });
    } catch (err) {
        next(err);
    }
};

export const createBoard = async (req, res, next) => {
    try {
        const ipAddress = req.ip || req.headers['x-forwarded-for'] || null;
        const result = await adminService.createAdminBoard(req.body || {}, req.adminUser, ipAddress);
        return res.status(201).json({ success: true, ...result });
    } catch (err) {
        if (err.status) {
            return res.status(err.status).json({ success: false, message: err.message });
        }
        next(err);
    }
};

export const reorderBoards = async (req, res, next) => {
    try {
        const { orderedIds } = req.body || {};
        const ipAddress = req.ip || req.headers['x-forwarded-for'] || null;
        const result = await adminService.reorderAdminBoards(orderedIds, req.adminUser, ipAddress);
        return res.status(200).json(result);
    } catch (err) {
        if (err.status) {
            return res.status(err.status).json({ success: false, message: err.message });
        }
        next(err);
    }
};

export const updateBoard = async (req, res, next) => {
    try {
        const { boardId } = req.params;
        const ipAddress = req.ip || req.headers['x-forwarded-for'] || null;
        const result = await adminService.updateAdminBoard(boardId, req.body || {}, req.adminUser, ipAddress);
        return res.status(200).json(result);
    } catch (err) {
        if (err.message === 'BOARD_NOT_FOUND') {
            return res.status(404).json({ success: false, message: '게시판을 찾을 수 없습니다.' });
        }
        if (err.status) {
            return res.status(err.status).json({ success: false, message: err.message });
        }
        next(err);
    }
};

export const deleteBoard = async (req, res, next) => {
    try {
        const { boardId } = req.params;
        const ipAddress = req.ip || req.headers['x-forwarded-for'] || null;
        const result = await adminService.deleteAdminBoard(boardId, req.adminUser, ipAddress);
        return res.status(200).json(result);
    } catch (err) {
        if (err.message === 'BOARD_NOT_FOUND') {
            return res.status(404).json({ success: false, message: '게시판을 찾을 수 없습니다.' });
        }
        if (err.status) {
            return res.status(err.status).json({ success: false, message: err.message });
        }
        next(err);
    }
};

export const getAffiliateDomains = async (req, res, next) => {
    try {
        const result = await adminService.getAdminAffiliateDomains(req.query || {});
        return res.status(200).json({ success: true, ...result });
    } catch (err) {
        next(err);
    }
};

export const testAffiliateUrl = async (req, res, next) => {
    try {
        const { url } = req.body || {};
        const result = await adminService.testAdminAffiliateUrl(url);
        return res.status(200).json(result);
    } catch (err) {
        if (err.status) {
            return res.status(err.status).json({ success: false, message: err.message });
        }
        next(err);
    }
};

export const createAffiliateDomain = async (req, res, next) => {
    try {
        const ipAddress = req.ip || req.headers['x-forwarded-for'] || null;
        const result = await adminService.createAdminAffiliateDomain(req.body || {}, req.adminUser, ipAddress);
        return res.status(201).json({ success: true, ...result });
    } catch (err) {
        if (err.status) {
            return res.status(err.status).json({ success: false, message: err.message });
        }
        next(err);
    }
};

export const updateAffiliateDomain = async (req, res, next) => {
    try {
        const { domainId } = req.params;
        const ipAddress = req.ip || req.headers['x-forwarded-for'] || null;
        const result = await adminService.updateAdminAffiliateDomain(domainId, req.body || {}, req.adminUser, ipAddress);
        return res.status(200).json(result);
    } catch (err) {
        if (err.message === 'DOMAIN_NOT_FOUND') {
            return res.status(404).json({ success: false, message: '제휴 도메인을 찾을 수 없습니다.' });
        }
        if (err.status) {
            return res.status(err.status).json({ success: false, message: err.message });
        }
        next(err);
    }
};

export const deleteAffiliateDomain = async (req, res, next) => {
    try {
        const { domainId } = req.params;
        const ipAddress = req.ip || req.headers['x-forwarded-for'] || null;
        const result = await adminService.deleteAdminAffiliateDomain(domainId, req.adminUser, ipAddress);
        return res.status(200).json(result);
    } catch (err) {
        if (err.message === 'DOMAIN_NOT_FOUND') {
            return res.status(404).json({ success: false, message: '제휴 도메인을 찾을 수 없습니다.' });
        }
        if (err.status) {
            return res.status(err.status).json({ success: false, message: err.message });
        }
        next(err);
    }
};

export const getAuditLogs = async (req, res, next) => {
    try {
        const result = await adminService.getAdminAuditLogs(req.query || {});
        return res.status(200).json({ success: true, ...result });
    } catch (err) {
        next(err);
    }
};

const escapeCsvCell = (val) => {
    let str = val === null || val === undefined ? '' : String(val);
    if (/^[=+\-@\t\r]/.test(str)) {
        str = `'${str}`;
    }
    return `"${str.replace(/"/g, '""')}"`;
};

export const exportAuditLogsCsv = async (req, res, next) => {
    try {
        const logs = await adminService.getAdminAuditLogsForExport(req.query || {});
        const header = [
            '로그 ID', '일시', '관리자 ID', '관리자명', '관리자 이메일',
            '액션 코드', '위험도', '대상 구분', '대상 ID', '요약', 'IP 주소', '상세 JSON'
        ].map(escapeCsvCell).join(',');

        const lines = logs.map((l) => [
            l.id,
            l.created_at instanceof Date ? l.created_at.toISOString() : l.created_at,
            l.admin_user_id,
            l.admin_name,
            l.admin_email,
            l.action,
            l.severity,
            l.target_type,
            l.target_id,
            l.summary,
            l.ip_address,
            l.detail ? JSON.stringify(l.detail) : ''
        ].map(escapeCsvCell).join(','));

        const csvContent = '\uFEFF' + [header, ...lines].join('\r\n');
        const now = new Date();
        const yyyymmdd = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="waba-audit-logs-${yyyymmdd}.csv"`);
        return res.status(200).send(csvContent);
    } catch (err) {
        next(err);
    }
};

export const getAdminAccounts = async (req, res, next) => {
    try {
        const result = await adminService.getAdminAccounts(req.query || {});
        return res.status(200).json({ success: true, ...result });
    } catch (err) {
        next(err);
    }
};

export const searchAdminCandidates = async (req, res, next) => {
    try {
        const result = await adminService.searchAdminCandidates(req.query || {});
        return res.status(200).json({ success: true, ...result });
    } catch (err) {
        next(err);
    }
};

export const promoteAdminAccount = async (req, res, next) => {
    try {
        const ipAddress = req.ip || req.headers['x-forwarded-for'] || null;
        const admin = await adminService.promoteAdminAccount(req.body || {}, req.adminUser, ipAddress);
        return res.status(201).json({ success: true, admin });
    } catch (err) {
        if (err.status) {
            return res.status(err.status).json({ success: false, code: err.code, message: err.message });
        }
        next(err);
    }
};

export const updateAdminAccount = async (req, res, next) => {
    try {
        const { userId } = req.params;
        const ipAddress = req.ip || req.headers['x-forwarded-for'] || null;
        const admin = await adminService.updateAdminAccount(userId, req.body || {}, req.adminUser, ipAddress);
        return res.status(200).json({ success: true, admin });
    } catch (err) {
        if (err.status) {
            return res.status(err.status).json({ success: false, code: err.code, message: err.message });
        }
        next(err);
    }
};

export const revokeAdminAccount = async (req, res, next) => {
    try {
        const { userId } = req.params;
        const ipAddress = req.ip || req.headers['x-forwarded-for'] || null;
        const result = await adminService.revokeAdminAccount(userId, req.body || {}, req.adminUser, ipAddress);
        return res.status(200).json({ success: true, ...result });
    } catch (err) {
        if (err.status) {
            return res.status(err.status).json({ success: false, code: err.code, message: err.message });
        }
        next(err);
    }
};

export const getUsers = async (req, res, next) => {
    try {
        const result = await adminService.getAdminUsers(req.query || {});
        return res.status(200).json({
            success: true,
            ...result
        });
    } catch (err) {
        next(err);
    }
};

export const getUserDetail = async (req, res, next) => {
    try {
        const { userId } = req.params;
        const result = await adminService.getAdminUserDetail(userId);
        return res.status(200).json({
            success: true,
            ...result
        });
    } catch (err) {
        if (err.message === 'USER_NOT_FOUND') {
            return res.status(404).json({ success: false, message: '회원을 찾을 수 없습니다.' });
        }
        next(err);
    }
};

export const updateUser = async (req, res, next) => {
    try {
        const { userId } = req.params;
        const ipAddress = req.ip || req.headers['x-forwarded-for'] || null;
        const user = await adminService.updateAdminUser(userId, req.body || {}, req.adminUser, ipAddress);
        return res.status(200).json({
            success: true,
            user
        });
    } catch (err) {
        if (err.message === 'USER_NOT_FOUND') {
            return res.status(404).json({ success: false, message: '회원을 찾을 수 없습니다.' });
        }
        if (['INVALID_ROLE', 'INVALID_STATUS', 'CANNOT_DEMOTE_SELF'].includes(err.message)) {
            return res.status(400).json({ success: false, code: err.code, message: err.message });
        }
        if (err.status) {
            return res.status(err.status).json({ success: false, code: err.code, message: err.message });
        }
        next(err);
    }
};

export const updatePetStatus = async (req, res, next) => {
    try {
        const { petId } = req.params;
        const { is_deleted, reason } = req.body || {};
        const ipAddress = req.ip || req.headers['x-forwarded-for'] || null;
        const result = await adminService.updateAdminPetStatus(petId, Boolean(is_deleted), reason, req.adminUser, ipAddress);
        return res.status(200).json({
            success: true,
            ...result
        });
    } catch (err) {
        if (err.message === 'PET_NOT_FOUND') {
            return res.status(404).json({ success: false, message: '반려동물을 찾을 수 없습니다.' });
        }
        next(err);
    }
};

export const extendPostPurge = async (req, res, next) => {
    try {
        const { postId } = req.params;
        const { extendDays, reason } = req.body || {};
        const ipAddress = req.ip || req.headers['x-forwarded-for'] || null;
        const result = await adminService.extendPostPurge(postId, extendDays, reason, req.adminUser, ipAddress);
        return res.status(200).json({ success: true, ...result });
    } catch (err) {
        if (err.status) {
            return res.status(err.status).json({ success: false, message: err.message });
        }
        next(err);
    }
};

export const restorePost = async (req, res, next) => {
    try {
        const { postId } = req.params;
        const { adminNote } = req.body || {};
        const ipAddress = req.ip || req.headers['x-forwarded-for'] || null;
        const result = await adminService.restorePost(postId, adminNote, req.adminUser, ipAddress);
        return res.status(200).json({ success: true, ...result });
    } catch (err) {
        if (err.message === 'POST_NOT_FOUND') {
            return res.status(404).json({ success: false, message: '게시글을 찾을 수 없습니다.' });
        }
        next(err);
    }
};

export const rejectPostAppeal = async (req, res, next) => {
    try {
        const { postId } = req.params;
        const { reason, blockReappeal } = req.body || {};
        const ipAddress = req.ip || req.headers['x-forwarded-for'] || null;
        const result = await adminService.rejectPostAppeal(postId, reason, Boolean(blockReappeal), req.adminUser, ipAddress);
        return res.status(200).json(result);
    } catch (err) {
        if (err.status) {
            return res.status(err.status).json({ success: false, message: err.message });
        }
        next(err);
    }
};

export const getReports = async (req, res, next) => {
    try {
        const result = await adminService.getAdminReports(req.query || {});
        return res.status(200).json({ success: true, ...result });
    } catch (err) {
        next(err);
    }
};

export const handleReport = async (req, res, next) => {
    try {
        const { reportId } = req.params;
        const { decision, decisionReason } = req.body || {};
        const ipAddress = req.ip || req.headers['x-forwarded-for'] || null;
        const result = await adminService.handleAdminReport(reportId, decision, decisionReason, req.adminUser, ipAddress);
        return res.status(200).json(result);
    } catch (err) {
        if (err.status) {
            return res.status(err.status).json({ success: false, message: err.message });
        }
        next(err);
    }
};

export const getPostModerationDetail = async (req, res, next) => {
    try {
        const { postId } = req.params;
        const result = await adminService.getPostModerationDetail(postId);
        return res.status(200).json({ success: true, ...result });
    } catch (err) {
        if (err.message === 'POST_NOT_FOUND') {
            return res.status(404).json({ success: false, message: '게시글을 찾을 수 없습니다.' });
        }
        if (err.status) {
            return res.status(err.status).json({ success: false, message: err.message });
        }
        next(err);
    }
};

export const updateAppealNote = async (req, res, next) => {
    try {
        const { appealId } = req.params;
        const { adminNote } = req.body || {};
        const ipAddress = req.ip || req.headers['x-forwarded-for'] || null;
        const result = await adminService.updateAppealAdminNote(appealId, adminNote, req.adminUser, ipAddress);
        return res.status(200).json(result);
    } catch (err) {
        if (err.status) {
            return res.status(err.status).json({ success: false, message: err.message });
        }
        next(err);
    }
};

export const handlePostReports = async (req, res, next) => {
    try {
        const { postId } = req.params;
        const { decision, decisionReason } = req.body || {};
        const ipAddress = req.ip || req.headers['x-forwarded-for'] || null;
        const result = await adminService.handlePostReports(postId, decision, decisionReason, req.adminUser, ipAddress);
        return res.status(200).json(result);
    } catch (err) {
        if (err.status) {
            return res.status(err.status).json({ success: false, message: err.message });
        }
        next(err);
    }
};
