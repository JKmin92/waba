import * as postService from '../service/postService.js';

export const getMainPostList = async (req, res, next) => {
    try {
        const rows = await postService.getMainPostList();
        return res.status(200).json(rows);
    } catch (e) {
        next(e);
    }
}

export const getPostDetail = async (req, res, next) => {
    try {
        const postId = req.params.id;
        const rows = await postService.getPostDetail(postId);
        return res.status(200).json(rows);
    } catch (e) {
        next(e);
    }
}

export const getBoardList = async (req, res, next) => {
    try {
        const rows = await postService.getBoardList();
        return res.status(200).json(rows);
    } catch (e) {
        next(e);
    }
}

export const getPostList = async (req, res, next) => {
    try {
        const { boardId } = req.params;
        const rows = await postService.getPostList(boardId);
        return res.status(200).json(rows);
    } catch (e) {
        next(e);
    }
}