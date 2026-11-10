import * as postModel from '../models/postModel.js';

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

export const createPost = async (userId, data) => {
    return await postModel.createPost(userId, data);
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
