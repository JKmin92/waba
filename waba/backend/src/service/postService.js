import * as postModel from '../models/postModel.js';

export const getMainPostList = async () => {
    return await postModel.getMainPostList();
}

export const getPostDetail = async (postId) => {
    return await postModel.getPostDetail(postId);
}

export const getBoardList = async () => {
    return await postModel.getBoardList();
}

export const getPostList = async (boardId) => {
    return await postModel.getPostList(boardId);
}