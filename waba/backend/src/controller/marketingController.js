import * as marketingService from '../service/marketingService.js';
import { processAndSaveMarketingImage } from '../../utils/imageUtils.js';

const handleError = (err, res, next) => {
    if (err.status) {
        return res.status(err.status).json({ success: false, code: err.code, message: err.message });
    }
    return next(err);
};

export const uploadMarketingImage = async (req, res, next) => {
    try {
        const category = req.body?.category || req.query?.category || 'banners';
        const imageUrl = await processAndSaveMarketingImage(category, req.file);
        return res.status(200).json({ success: true, image_url: imageUrl });
    } catch (err) {
        return handleError(err, res, next);
    }
};

export const getMarketingSummary = async (req, res, next) => {
    try {
        const summary = await marketingService.getMarketingSummary();
        return res.status(200).json({ success: true, summary });
    } catch (err) {
        return handleError(err, res, next);
    }
};

export const getNotices = async (req, res, next) => {
    try {
        const notices = await marketingService.getAdminNotices(req.query || {});
        return res.status(200).json({ success: true, notices });
    } catch (err) {
        return handleError(err, res, next);
    }
};

export const getNoticeDetail = async (req, res, next) => {
    try {
        const notice = await marketingService.getAdminNoticeById(req.params.noticeId);
        return res.status(200).json({ success: true, notice });
    } catch (err) {
        return handleError(err, res, next);
    }
};

export const createNotice = async (req, res, next) => {
    try {
        const ip = req.ip || req.headers['x-forwarded-for'] || null;
        const notice = await marketingService.createAdminNotice(req.body || {}, req.adminUser, ip);
        return res.status(201).json({ success: true, notice });
    } catch (err) {
        return handleError(err, res, next);
    }
};

export const updateNotice = async (req, res, next) => {
    try {
        const ip = req.ip || req.headers['x-forwarded-for'] || null;
        const notice = await marketingService.updateAdminNotice(req.params.noticeId, req.body || {}, req.adminUser, ip);
        return res.status(200).json({ success: true, notice });
    } catch (err) {
        return handleError(err, res, next);
    }
};

export const deleteNotice = async (req, res, next) => {
    try {
        const ip = req.ip || req.headers['x-forwarded-for'] || null;
        const result = await marketingService.deleteAdminNotice(req.params.noticeId, req.adminUser, ip);
        return res.status(200).json({ success: true, ...result });
    } catch (err) {
        return handleError(err, res, next);
    }
};

export const getBanners = async (req, res, next) => {
    try {
        const banners = await marketingService.getAdminBanners(req.query || {});
        return res.status(200).json({ success: true, banners });
    } catch (err) {
        return handleError(err, res, next);
    }
};

export const getBannerDetail = async (req, res, next) => {
    try {
        const banner = await marketingService.getAdminBannerById(req.params.bannerId);
        return res.status(200).json({ success: true, banner });
    } catch (err) {
        return handleError(err, res, next);
    }
};

export const createBanner = async (req, res, next) => {
    try {
        const ip = req.ip || req.headers['x-forwarded-for'] || null;
        const banner = await marketingService.createAdminBanner(req.body || {}, req.adminUser, ip);
        return res.status(201).json({ success: true, banner });
    } catch (err) {
        return handleError(err, res, next);
    }
};

export const updateBanner = async (req, res, next) => {
    try {
        const ip = req.ip || req.headers['x-forwarded-for'] || null;
        const banner = await marketingService.updateAdminBanner(req.params.bannerId, req.body || {}, req.adminUser, ip);
        return res.status(200).json({ success: true, banner });
    } catch (err) {
        return handleError(err, res, next);
    }
};

export const deleteBanner = async (req, res, next) => {
    try {
        const ip = req.ip || req.headers['x-forwarded-for'] || null;
        const result = await marketingService.deleteAdminBanner(req.params.bannerId, req.adminUser, ip);
        return res.status(200).json({ success: true, ...result });
    } catch (err) {
        return handleError(err, res, next);
    }
};

export const getPopups = async (req, res, next) => {
    try {
        const result = await marketingService.getAdminPopups();
        return res.status(200).json({ success: true, ...result });
    } catch (err) {
        return handleError(err, res, next);
    }
};

export const updatePopupSettings = async (req, res, next) => {
    try {
        const ip = req.ip || req.headers['x-forwarded-for'] || null;
        const settings = await marketingService.updateAdminPopupSettings(req.body || {}, req.adminUser, ip);
        return res.status(200).json({ success: true, settings });
    } catch (err) {
        return handleError(err, res, next);
    }
};

export const reorderPopupSlides = async (req, res, next) => {
    try {
        const ip = req.ip || req.headers['x-forwarded-for'] || null;
        const slides = await marketingService.reorderAdminPopupSlides(req.body?.slideIds, req.adminUser, ip);
        return res.status(200).json({ success: true, slides });
    } catch (err) {
        return handleError(err, res, next);
    }
};

export const getPopupSlideDetail = async (req, res, next) => {
    try {
        const result = await marketingService.getAdminPopupSlideById(req.params.slideId);
        return res.status(200).json({ success: true, ...result });
    } catch (err) {
        return handleError(err, res, next);
    }
};

export const createPopupSlide = async (req, res, next) => {
    try {
        const ip = req.ip || req.headers['x-forwarded-for'] || null;
        const slide = await marketingService.createAdminPopupSlide(req.body || {}, req.adminUser, ip);
        return res.status(201).json({ success: true, slide });
    } catch (err) {
        return handleError(err, res, next);
    }
};

export const updatePopupSlide = async (req, res, next) => {
    try {
        const ip = req.ip || req.headers['x-forwarded-for'] || null;
        const slide = await marketingService.updateAdminPopupSlide(req.params.slideId, req.body || {}, req.adminUser, ip);
        return res.status(200).json({ success: true, slide });
    } catch (err) {
        return handleError(err, res, next);
    }
};

export const deletePopupSlide = async (req, res, next) => {
    try {
        const ip = req.ip || req.headers['x-forwarded-for'] || null;
        const result = await marketingService.deleteAdminPopupSlide(req.params.slideId, req.adminUser, ip);
        return res.status(200).json({ success: true, ...result });
    } catch (err) {
        return handleError(err, res, next);
    }
};

export const getPublicBanner = async (req, res, next) => {
    try {
        const result = await marketingService.getPublicBannerByKey(req.params.bannerKey);
        return res.status(200).json({ success: true, ...result });
    } catch (err) {
        return handleError(err, res, next);
    }
};

export const trackPublicBannerClick = async (req, res, next) => {
    try {
        await marketingService.trackPublicBannerClick(req.params.bannerKey, req.body?.itemId);
        return res.status(200).json({ success: true });
    } catch (err) {
        return handleError(err, res, next);
    }
};

export const getPublicMainPopup = async (req, res, next) => {
    try {
        const result = await marketingService.getPublicMainPopup();
        return res.status(200).json({ success: true, ...result });
    } catch (err) {
        return handleError(err, res, next);
    }
};

export const trackPublicPopupSlideClick = async (req, res, next) => {
    try {
        await marketingService.trackPublicPopupSlideClick(req.params.slideId);
        return res.status(200).json({ success: true });
    } catch (err) {
        return handleError(err, res, next);
    }
};

export const getPublicNotices = async (req, res, next) => {
    try {
        const result = await marketingService.getPublicNotices(req.query || {});
        return res.status(200).json({ success: true, ...result });
    } catch (err) {
        return handleError(err, res, next);
    }
};

export const getPublicNoticeDetail = async (req, res, next) => {
    try {
        const result = await marketingService.getPublicNoticeDetail(req.params.noticeId);
        return res.status(200).json({ success: true, ...result });
    } catch (err) {
        return handleError(err, res, next);
    }
};
