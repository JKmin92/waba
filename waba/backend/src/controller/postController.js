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