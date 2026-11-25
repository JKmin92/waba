import * as adminModel from '../models/adminModel.js';

export const getAdminMe = async (adminUser) => {
    const pendingReportCount = await adminModel.getPendingReportCount();
    return {
        admin: adminUser,
        pendingReportCount
    };
};

export const getDashboardOverview = async (query = {}) => {
    return await adminModel.getDashboardOverview(query);
};

export const togglePostCuration = async (postId, payload, adminUser, ipAddress) => {
    return await adminModel.togglePostCuration(postId, payload, adminUser, ipAddress);
};

export const getAdminPosts = async (query = {}) => {
    return await adminModel.getAdminPosts(query);
};

export const getAdminPostDetail = async (postId) => {
    return await adminModel.getAdminPostDetail(postId);
};

export const updateAdminPostStatus = async (postId, status, reason, adminUser, ipAddress) => {
    return await adminModel.updateAdminPostStatus(postId, status, reason, adminUser, ipAddress);
};

export const togglePostImageSensitive = async (imageId, isSensitive, adminUser, ipAddress) => {
    return await adminModel.togglePostImageSensitive(imageId, Boolean(isSensitive), adminUser, ipAddress);
};

export const getAdminComments = async (query = {}) => {
    return await adminModel.getAdminComments(query);
};

export const updateAdminCommentStatus = async (commentId, status, reason, adminUser, ipAddress) => {
    return await adminModel.updateAdminCommentStatus(commentId, status, reason, adminUser, ipAddress);
};

export const getAdminHistories = async (query = {}) => {
    return await adminModel.getAdminHistories(query);
};

export const getAdminHistoryDetail = async (historyId) => {
    return await adminModel.getAdminHistoryDetail(historyId);
};

export const updateAdminHistoryVisibility = async (historyId, isPrivate, reason, adminUser, ipAddress) => {
    return await adminModel.updateAdminHistoryVisibility(historyId, Boolean(isPrivate), reason, adminUser, ipAddress);
};

export const getAdminNotebooks = async (query = {}) => {
    return await adminModel.getAdminNotebooks(query);
};

export const getAdminNotebookDetail = async (journeyId) => {
    return await adminModel.getAdminNotebookDetail(journeyId);
};

export const updateAdminNotebookShareScope = async (journeyId, shareScope, reason, adminUser, ipAddress) => {
    return await adminModel.updateAdminNotebookShareScope(journeyId, shareScope, reason, adminUser, ipAddress);
};

export const getAdminBoards = async (query = {}) => {
    return await adminModel.getAdminBoards(query);
};

export const createAdminBoard = async (data, adminUser, ipAddress) => {
    return await adminModel.createAdminBoard(data, adminUser, ipAddress);
};

export const reorderAdminBoards = async (orderedIds, adminUser, ipAddress) => {
    return await adminModel.reorderAdminBoards(orderedIds, adminUser, ipAddress);
};

export const updateAdminBoard = async (boardId, data, adminUser, ipAddress) => {
    return await adminModel.updateAdminBoard(boardId, data, adminUser, ipAddress);
};

export const deleteAdminBoard = async (boardId, adminUser, ipAddress) => {
    return await adminModel.deleteAdminBoard(boardId, adminUser, ipAddress);
};

export const getAdminAffiliateDomains = async (query = {}) => {
    return await adminModel.getAdminAffiliateDomains(query);
};

export const testAdminAffiliateUrl = async (url) => {
    return await adminModel.testAdminAffiliateUrl(url);
};

export const createAdminAffiliateDomain = async (data, adminUser, ipAddress) => {
    return await adminModel.createAdminAffiliateDomain(data, adminUser, ipAddress);
};

export const updateAdminAffiliateDomain = async (domainId, data, adminUser, ipAddress) => {
    return await adminModel.updateAdminAffiliateDomain(domainId, data, adminUser, ipAddress);
};

export const deleteAdminAffiliateDomain = async (domainId, adminUser, ipAddress) => {
    return await adminModel.deleteAdminAffiliateDomain(domainId, adminUser, ipAddress);
};

export const getAdminUsers = async (query = {}) => {
    return await adminModel.getAdminUsers(query);
};

export const getAdminUserDetail = async (userId) => {
    return await adminModel.getAdminUserDetail(userId);
};

export const updateAdminUser = async (userId, data, adminUser, ipAddress) => {
    return await adminModel.updateAdminUser(userId, data, adminUser, ipAddress);
};

export const updateAdminPetStatus = async (petId, isDeleted, reason, adminUser, ipAddress) => {
    return await adminModel.updateAdminPetStatus(petId, Boolean(isDeleted), reason, adminUser, ipAddress);
};

export const extendPostPurge = async (postId, extendDays, reason, adminUser, ipAddress) => {
    return await adminModel.extendPostPurge(postId, extendDays, reason, adminUser, ipAddress);
};

export const restorePost = async (postId, adminNote, adminUser, ipAddress) => {
    return await adminModel.restorePost(postId, adminNote, adminUser, ipAddress);
};

export const rejectPostAppeal = async (postId, reason, blockReappeal, adminUser, ipAddress) => {
    return await adminModel.rejectPostAppeal(postId, reason, Boolean(blockReappeal), adminUser, ipAddress);
};

export const getAdminReports = async (query = {}) => {
    return await adminModel.getAdminReports(query);
};

export const handleAdminReport = async (reportId, decision, decisionReason, adminUser, ipAddress) => {
    return await adminModel.handleAdminReport(reportId, decision, decisionReason, adminUser, ipAddress);
};

export const getPostModerationDetail = async (postId) => {
    return await adminModel.getPostModerationDetail(postId);
};

export const updateAppealAdminNote = async (appealId, adminNote, adminUser, ipAddress) => {
    return await adminModel.updateAppealAdminNote(appealId, adminNote, adminUser, ipAddress);
};

export const handlePostReports = async (postId, decision, decisionReason, adminUser, ipAddress) => {
    return await adminModel.handlePostReports(postId, decision, decisionReason, adminUser, ipAddress);
};
