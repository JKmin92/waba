import * as marketingModel from '../models/marketingModel.js';

export const getMarketingSummary = async () => await marketingModel.getMarketingSummary();

export const getAdminNotices = async (query) => await marketingModel.getAdminNotices(query);
export const getAdminNoticeById = async (noticeId) => await marketingModel.getAdminNoticeById(noticeId);
export const createAdminNotice = async (data, adminUser, ipAddress) => await marketingModel.createAdminNotice(data, adminUser, ipAddress);
export const updateAdminNotice = async (noticeId, data, adminUser, ipAddress) => await marketingModel.updateAdminNotice(noticeId, data, adminUser, ipAddress);
export const deleteAdminNotice = async (noticeId, adminUser, ipAddress) => await marketingModel.deleteAdminNotice(noticeId, adminUser, ipAddress);

export const getAdminBanners = async (query) => await marketingModel.getAdminBanners(query);
export const getAdminBannerById = async (bannerId) => await marketingModel.getAdminBannerById(bannerId);
export const createAdminBanner = async (data, adminUser, ipAddress) => await marketingModel.createAdminBanner(data, adminUser, ipAddress);
export const updateAdminBanner = async (bannerId, data, adminUser, ipAddress) => await marketingModel.updateAdminBanner(bannerId, data, adminUser, ipAddress);
export const deleteAdminBanner = async (bannerId, adminUser, ipAddress) => await marketingModel.deleteAdminBanner(bannerId, adminUser, ipAddress);

export const getAdminPopups = async () => await marketingModel.getAdminPopups();
export const updateAdminPopupSettings = async (data, adminUser, ipAddress) => await marketingModel.updateAdminPopupSettings(data, adminUser, ipAddress);
export const reorderAdminPopupSlides = async (slideIds, adminUser, ipAddress) => await marketingModel.reorderAdminPopupSlides(slideIds, adminUser, ipAddress);
export const getAdminPopupSlideById = async (slideId) => await marketingModel.getAdminPopupSlideById(slideId);
export const createAdminPopupSlide = async (data, adminUser, ipAddress) => await marketingModel.createAdminPopupSlide(data, adminUser, ipAddress);
export const updateAdminPopupSlide = async (slideId, data, adminUser, ipAddress) => await marketingModel.updateAdminPopupSlide(slideId, data, adminUser, ipAddress);
export const deleteAdminPopupSlide = async (slideId, adminUser, ipAddress) => await marketingModel.deleteAdminPopupSlide(slideId, adminUser, ipAddress);

export const getPublicBannerByKey = async (bannerKey) => await marketingModel.getPublicBannerByKey(bannerKey);
export const trackPublicBannerClick = async (bannerKey, itemId) => await marketingModel.trackPublicBannerClick(bannerKey, itemId);
export const getPublicMainPopup = async () => await marketingModel.getPublicMainPopup();
export const trackPublicPopupSlideClick = async (slideId) => await marketingModel.trackPublicPopupSlideClick(slideId);
export const getPublicNotices = async (query) => await marketingModel.getPublicNotices(query);
export const getPublicNoticeDetail = async (noticeId) => await marketingModel.getPublicNoticeDetail(noticeId);
