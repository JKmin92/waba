import db from '../../config/db.js';
import { logAdminAction } from './adminModel.js';

const VALID_NOTICE_TYPES = ['NOTICE', 'EVENT'];
const VALID_DISPLAY_STATUSES = ['VISIBLE', 'HIDDEN', 'SCHEDULED'];
const VALID_BANNER_TYPES = ['SINGLE', 'SWIPER', 'RANDOM'];
const VALID_LINK_TARGETS = ['_self', '_blank'];
const VALID_DISMISS_POLICIES = ['DAY', 'WEEK', 'NONE'];
const VALID_MOBILE_MODES = ['MODAL', 'BOTTOM_SHEET'];

export const computeEffectiveStatus = (displayStatus, startAt, endAt, now = new Date()) => {
    const ds = String(displayStatus || 'VISIBLE').toUpperCase();
    if (ds === 'HIDDEN') return 'HIDDEN';
    if (ds === 'VISIBLE') return 'ACTIVE';
    if (ds === 'SCHEDULED') {
        if (startAt && now < new Date(startAt)) return 'SCHEDULED';
        if (endAt && now > new Date(endAt)) return 'EXPIRED';
        return 'ACTIVE';
    }
    return 'ACTIVE';
};

const parseOptionalDateTime = (raw, fieldLabel = '날짜') => {
    if (raw === null || raw === undefined || String(raw).trim() === '') return null;
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) {
        const err = new Error(`유효하지 않은 ${fieldLabel} 형식입니다.`);
        err.status = 400;
        throw err;
    }
    return d;
};

const formatNoticeRow = (row, now = new Date()) => ({
    ...row,
    is_active: Boolean(Number(row.is_active || 0)),
    is_pinned: Boolean(Number(row.is_pinned || 0)),
    view_count: Number(row.view_count || 0),
    effective_status: computeEffectiveStatus(row.display_status || (row.is_active ? 'VISIBLE' : 'HIDDEN'), row.start_at, row.end_at, now)
});

const formatBannerItemRow = (item, now = new Date()) => ({
    ...item,
    sort_order: Number(item.sort_order || 0),
    click_count: Number(item.click_count || 0),
    effective_status: computeEffectiveStatus(item.display_status, item.start_at, item.end_at, now)
});

const formatPopupSlideRow = (slide, now = new Date()) => ({
    ...slide,
    sort_order: Number(slide.sort_order || 0),
    click_count: Number(slide.click_count || 0),
    effective_status: computeEffectiveStatus(slide.display_status, slide.start_at, slide.end_at, now)
});

const formatPopupSettings = (row) => ({
    id: row?.id || 1,
    is_enabled: Boolean(Number(row?.is_enabled ?? 1)),
    dismiss_policy: row?.dismiss_policy || 'DAY',
    show_pc: Boolean(Number(row?.show_pc ?? 1)),
    show_tablet: Boolean(Number(row?.show_tablet ?? 1)),
    show_mobile: Boolean(Number(row?.show_mobile ?? 1)),
    mobile_display_mode: row?.mobile_display_mode || 'BOTTOM_SHEET',
    updated_by: row?.updated_by || null,
    updated_at: row?.updated_at || null
});

export const getMarketingSummary = async () => {
    const now = new Date();
    const [noticeRows] = await db.query(`SELECT type, display_status, is_active, start_at, end_at FROM admin_notices WHERE type IN ('NOTICE','EVENT')`);
    const [bannerRows] = await db.query(`SELECT banner_type, display_status, start_at, end_at FROM admin_banners`);
    const [[popupSettings]] = await db.query(`SELECT is_enabled FROM admin_popup_settings WHERE id = 1 LIMIT 1`);
    const [slideRows] = await db.query(`SELECT display_status, start_at, end_at FROM admin_popup_slides`);

    const notices = { total: noticeRows.length, active: 0, scheduled: 0, hidden: 0, expired: 0 };
    for (const r of noticeRows) {
        const eff = computeEffectiveStatus(r.display_status || (r.is_active ? 'VISIBLE' : 'HIDDEN'), r.start_at, r.end_at, now);
        if (eff === 'ACTIVE') notices.active += 1;
        else if (eff === 'SCHEDULED') notices.scheduled += 1;
        else if (eff === 'HIDDEN') notices.hidden += 1;
        else if (eff === 'EXPIRED') notices.expired += 1;
    }

    const banners = { total: bannerRows.length, active: 0, single: 0, swiper: 0, random: 0 };
    for (const b of bannerRows) {
        const eff = computeEffectiveStatus(b.display_status, b.start_at, b.end_at, now);
        if (eff === 'ACTIVE') banners.active += 1;
        if (b.banner_type === 'SINGLE') banners.single += 1;
        else if (b.banner_type === 'SWIPER') banners.swiper += 1;
        else if (b.banner_type === 'RANDOM') banners.random += 1;
    }

    let activeSlides = 0;
    for (const s of slideRows) {
        if (computeEffectiveStatus(s.display_status, s.start_at, s.end_at, now) === 'ACTIVE') {
            activeSlides += 1;
        }
    }

    const [[nAlert]] = await db.query(
        `SELECT COUNT(*) AS cnt FROM admin_notices
         WHERE type IN ('NOTICE','EVENT')
           AND ((start_at BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 7 DAY))
             OR (end_at BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 7 DAY)))`
    );
    const [[bAlert]] = await db.query(
        `SELECT COUNT(*) AS cnt FROM admin_banners
         WHERE (start_at BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 7 DAY))
            OR (end_at BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 7 DAY))`
    );
    const [[pAlert]] = await db.query(
        `SELECT COUNT(*) AS cnt FROM admin_popup_slides
         WHERE (start_at BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 7 DAY))
            OR (end_at BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 7 DAY))`
    );

    return {
        notices,
        banners,
        popups: {
            is_enabled: Boolean(Number(popupSettings?.is_enabled ?? 1)),
            total_slides: slideRows.length,
            active_slides: activeSlides
        },
        upcoming_alerts: Number(nAlert?.cnt || 0) + Number(bAlert?.cnt || 0) + Number(pAlert?.cnt || 0)
    };
};

// ==================== Notices ====================

export const getAdminNotices = async ({ type = 'ALL', status = 'ALL', q = '' } = {}) => {
    const whereClauses = ["type IN ('NOTICE','EVENT')"];
    const params = [];

    const upperType = String(type || 'ALL').toUpperCase();
    if (VALID_NOTICE_TYPES.includes(upperType)) {
        whereClauses.push('type = ?');
        params.push(upperType);
    }

    const trimmedQ = String(q || '').trim();
    if (trimmedQ) {
        const like = `%${trimmedQ}%`;
        whereClauses.push('(title LIKE ? OR content LIKE ?)');
        params.push(like, like);
    }

    const [rows] = await db.query(
        `SELECT * FROM admin_notices WHERE ${whereClauses.join(' AND ')} ORDER BY is_pinned DESC, created_at DESC`,
        params
    );

    const now = new Date();
    let notices = rows.map((r) => formatNoticeRow(r, now));
    const upperStatus = String(status || 'ALL').toUpperCase();
    if (['ACTIVE', 'SCHEDULED', 'HIDDEN', 'EXPIRED'].includes(upperStatus)) {
        notices = notices.filter((n) => n.effective_status === upperStatus);
    }
    return notices;
};

export const getAdminNoticeById = async (noticeId) => {
    const [rows] = await db.query(`SELECT * FROM admin_notices WHERE id = ? LIMIT 1`, [noticeId]);
    if (!rows[0]) {
        const err = new Error('공지/이벤트를 찾을 수 없습니다.');
        err.status = 404;
        throw err;
    }
    return formatNoticeRow(rows[0]);
};

export const createAdminNotice = async (data = {}, adminUser, ipAddress = null) => {
    const title = String(data.title || '').trim();
    if (!title || title.length > 150) {
        const err = new Error('제목을 입력해주세요. (최대 150자)');
        err.status = 400;
        throw err;
    }

    const type = String(data.type || 'NOTICE').trim().toUpperCase();
    if (!VALID_NOTICE_TYPES.includes(type)) {
        const err = new Error('유효한 공지 유형(NOTICE, EVENT)을 선택해주세요.');
        err.status = 400;
        throw err;
    }

    const displayStatus = String(data.display_status || 'VISIBLE').trim().toUpperCase();
    if (!VALID_DISPLAY_STATUSES.includes(displayStatus)) {
        const err = new Error('유효한 노출 상태(VISIBLE, HIDDEN, SCHEDULED)를 선택해주세요.');
        err.status = 400;
        throw err;
    }

    const isActive = displayStatus !== 'HIDDEN' ? 1 : 0;
    const isPinned = data.is_pinned ? 1 : 0;
    const content = data.content ? String(data.content) : null;
    const thumbnailUrl = data.thumbnail_url ? String(data.thumbnail_url).trim().slice(0, 500) : null;
    const linkUrl = data.link_url ? String(data.link_url).trim().slice(0, 500) : null;

    const startAt = displayStatus === 'SCHEDULED' ? parseOptionalDateTime(data.start_at, '게시 시작일') : null;
    const endAt = displayStatus === 'SCHEDULED' ? parseOptionalDateTime(data.end_at, '게시 종료일') : null;
    const eventStartAt = type === 'EVENT' ? parseOptionalDateTime(data.event_start_at, '이벤트 시작일') : null;
    const eventEndAt = type === 'EVENT' ? parseOptionalDateTime(data.event_end_at, '이벤트 종료일') : null;

    const [res] = await db.query(
        `INSERT INTO admin_notices (
            type, title, content, link_url, thumbnail_url, is_active, display_status, is_pinned,
            event_start_at, event_end_at, start_at, end_at, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [type, title, content, linkUrl, thumbnailUrl, isActive, displayStatus, isPinned, eventStartAt, eventEndAt, startAt, endAt, adminUser.id]
    );

    await logAdminAction({
        adminUserId: adminUser.id,
        action: 'NOTICE_CREATE',
        targetType: 'NOTICE',
        targetId: String(res.insertId),
        summary: `${type === 'EVENT' ? '이벤트' : '공지사항'} '${title}' 등록`,
        detail: { type, display_status: displayStatus, is_pinned: Boolean(isPinned) },
        ipAddress
    });

    return await getAdminNoticeById(res.insertId);
};

export const updateAdminNotice = async (noticeId, data = {}, adminUser, ipAddress = null) => {
    const existing = await getAdminNoticeById(noticeId);

    const title = data.title !== undefined ? String(data.title || '').trim() : existing.title;
    if (!title || title.length > 150) {
        const err = new Error('제목을 입력해주세요. (최대 150자)');
        err.status = 400;
        throw err;
    }

    const type = data.type !== undefined ? String(data.type || '').trim().toUpperCase() : existing.type;
    if (!VALID_NOTICE_TYPES.includes(type)) {
        const err = new Error('유효한 공지 유형(NOTICE, EVENT)을 선택해주세요.');
        err.status = 400;
        throw err;
    }

    const displayStatus = data.display_status !== undefined
        ? String(data.display_status || '').trim().toUpperCase()
        : existing.display_status;
    if (!VALID_DISPLAY_STATUSES.includes(displayStatus)) {
        const err = new Error('유효한 노출 상태(VISIBLE, HIDDEN, SCHEDULED)를 선택해주세요.');
        err.status = 400;
        throw err;
    }

    const isActive = displayStatus !== 'HIDDEN' ? 1 : 0;
    const isPinned = data.is_pinned !== undefined ? (data.is_pinned ? 1 : 0) : (existing.is_pinned ? 1 : 0);
    const content = data.content !== undefined ? (data.content ? String(data.content) : null) : existing.content;
    const thumbnailUrl = data.thumbnail_url !== undefined ? (data.thumbnail_url ? String(data.thumbnail_url).trim().slice(0, 500) : null) : existing.thumbnail_url;
    const linkUrl = data.link_url !== undefined ? (data.link_url ? String(data.link_url).trim().slice(0, 500) : null) : existing.link_url;

    const startAt = displayStatus === 'SCHEDULED'
        ? (data.start_at !== undefined ? parseOptionalDateTime(data.start_at, '게시 시작일') : existing.start_at)
        : null;
    const endAt = displayStatus === 'SCHEDULED'
        ? (data.end_at !== undefined ? parseOptionalDateTime(data.end_at, '게시 종료일') : existing.end_at)
        : null;
    const eventStartAt = type === 'EVENT'
        ? (data.event_start_at !== undefined ? parseOptionalDateTime(data.event_start_at, '이벤트 시작일') : existing.event_start_at)
        : null;
    const eventEndAt = type === 'EVENT'
        ? (data.event_end_at !== undefined ? parseOptionalDateTime(data.event_end_at, '이벤트 종료일') : existing.event_end_at)
        : null;

    await db.query(
        `UPDATE admin_notices
         SET type = ?, title = ?, content = ?, link_url = ?, thumbnail_url = ?,
             is_active = ?, display_status = ?, is_pinned = ?,
             event_start_at = ?, event_end_at = ?, start_at = ?, end_at = ?, updated_at = NOW()
         WHERE id = ?`,
        [type, title, content, linkUrl, thumbnailUrl, isActive, displayStatus, isPinned, eventStartAt, eventEndAt, startAt, endAt, noticeId]
    );

    await logAdminAction({
        adminUserId: adminUser.id,
        action: 'NOTICE_UPDATE',
        targetType: 'NOTICE',
        targetId: String(noticeId),
        summary: `${type === 'EVENT' ? '이벤트' : '공지사항'} '${title}' 수정`,
        detail: { type, display_status: displayStatus, is_pinned: Boolean(isPinned) },
        ipAddress
    });

    return await getAdminNoticeById(noticeId);
};

export const deleteAdminNotice = async (noticeId, adminUser, ipAddress = null) => {
    const existing = await getAdminNoticeById(noticeId);
    await db.query(`DELETE FROM admin_notices WHERE id = ?`, [noticeId]);

    await logAdminAction({
        adminUserId: adminUser.id,
        action: 'NOTICE_DELETE',
        targetType: 'NOTICE',
        targetId: String(noticeId),
        summary: `공지/이벤트 '${existing.title}' 삭제`,
        detail: { id: Number(noticeId) },
        ipAddress
    });

    return { deletedId: Number(noticeId) };
};

// ==================== Banners ====================

const normalizeBannerItemsInput = (items = []) => {
    if (!Array.isArray(items)) return [];
    return items.map((it, idx) => {
        const pc = it.pc_image_url ? String(it.pc_image_url).trim().slice(0, 500) : null;
        const tablet = it.tablet_image_url ? String(it.tablet_image_url).trim().slice(0, 500) : null;
        const mobile = it.mobile_image_url ? String(it.mobile_image_url).trim().slice(0, 500) : null;
        const common = it.image_url ? String(it.image_url).trim().slice(0, 500) : (pc || tablet || mobile || '');

        if (!common) {
            const err = new Error(`${idx + 1}번째 배너 아이템에 최소 1개 이상의 이미지를 등록해주세요.`);
            err.status = 400;
            throw err;
        }

        const ds = String(it.display_status || 'VISIBLE').trim().toUpperCase();
        if (!VALID_DISPLAY_STATUSES.includes(ds)) {
            const err = new Error('유효한 배너 아이템 노출 상태를 선택해주세요.');
            err.status = 400;
            throw err;
        }

        const linkTarget = VALID_LINK_TARGETS.includes(it.link_target) ? it.link_target : '_self';
        return {
            id: it.id ? Number(it.id) : null,
            sort_order: it.sort_order !== undefined ? Number(it.sort_order) : idx,
            title: it.title ? String(it.title).trim().slice(0, 150) : null,
            image_url: common,
            pc_image_url: pc,
            tablet_image_url: tablet,
            mobile_image_url: mobile,
            link_url: it.link_url ? String(it.link_url).trim().slice(0, 500) : null,
            link_target: linkTarget,
            display_status: ds,
            start_at: ds === 'SCHEDULED' ? parseOptionalDateTime(it.start_at, '아이템 시작일') : null,
            end_at: ds === 'SCHEDULED' ? parseOptionalDateTime(it.end_at, '아이템 종료일') : null
        };
    });
};

export const getAdminBanners = async ({ type = 'ALL', status = 'ALL', q = '' } = {}) => {
    const whereClauses = ['1=1'];
    const params = [];

    const upperType = String(type || 'ALL').toUpperCase();
    if (VALID_BANNER_TYPES.includes(upperType)) {
        whereClauses.push('banner_type = ?');
        params.push(upperType);
    }

    const trimmedQ = String(q || '').trim();
    if (trimmedQ) {
        const like = `%${trimmedQ}%`;
        whereClauses.push('(title LIKE ? OR banner_key LIKE ?)');
        params.push(like, like);
    }

    const [bannerRows] = await db.query(
        `SELECT * FROM admin_banners WHERE ${whereClauses.join(' AND ')} ORDER BY id DESC`,
        params
    );

    if (bannerRows.length === 0) return [];

    const bannerIds = bannerRows.map((b) => b.id);
    const placeholders = bannerIds.map(() => '?').join(', ');
    const [itemRows] = await db.query(
        `SELECT * FROM admin_banner_items WHERE banner_id IN (${placeholders}) ORDER BY sort_order ASC, id ASC`,
        bannerIds
    );

    const now = new Date();
    const itemsByBanner = new Map();
    for (const row of itemRows) {
        if (!itemsByBanner.has(row.banner_id)) itemsByBanner.set(row.banner_id, []);
        itemsByBanner.get(row.banner_id).push(formatBannerItemRow(row, now));
    }

    let banners = bannerRows.map((b) => {
        const items = itemsByBanner.get(b.id) || [];
        const activeItems = items.filter((i) => i.effective_status === 'ACTIVE').length;
        const deviceSet = new Set();
        let hasItemSchedules = false;
        for (const it of items) {
            if (it.display_status === 'SCHEDULED') hasItemSchedules = true;
            if (it.pc_image_url || it.tablet_image_url || it.mobile_image_url) {
                if (it.pc_image_url) deviceSet.add('PC');
                if (it.tablet_image_url) deviceSet.add('TABLET');
                if (it.mobile_image_url) deviceSet.add('MOBILE');
            } else if (it.image_url) {
                deviceSet.add('COMMON');
            }
        }
        return {
            ...b,
            autoplay_enabled: Boolean(Number(b.autoplay_enabled || 0)),
            autoplay_interval_ms: Number(b.autoplay_interval_ms || 4000),
            show_indicators: Boolean(Number(b.show_indicators || 0)),
            click_count: Number(b.click_count || 0),
            effective_status: computeEffectiveStatus(b.display_status, b.start_at, b.end_at, now),
            total_items: items.length,
            active_items: activeItems,
            devices: deviceSet.size > 0 ? [...deviceSet] : ['COMMON'],
            has_item_schedules: hasItemSchedules,
            items
        };
    });

    const upperStatus = String(status || 'ALL').toUpperCase();
    if (['ACTIVE', 'SCHEDULED', 'HIDDEN', 'EXPIRED'].includes(upperStatus)) {
        banners = banners.filter((b) => b.effective_status === upperStatus);
    }

    return banners;
};

export const getAdminBannerById = async (bannerId) => {
    const [rows] = await db.query(`SELECT * FROM admin_banners WHERE id = ? LIMIT 1`, [bannerId]);
    if (!rows[0]) {
        const err = new Error('배너를 찾을 수 없습니다.');
        err.status = 404;
        throw err;
    }

    const [itemRows] = await db.query(
        `SELECT * FROM admin_banner_items WHERE banner_id = ? ORDER BY sort_order ASC, id ASC`,
        [bannerId]
    );
    const now = new Date();
    const b = rows[0];
    return {
        ...b,
        autoplay_enabled: Boolean(Number(b.autoplay_enabled || 0)),
        autoplay_interval_ms: Number(b.autoplay_interval_ms || 4000),
        show_indicators: Boolean(Number(b.show_indicators || 0)),
        click_count: Number(b.click_count || 0),
        effective_status: computeEffectiveStatus(b.display_status, b.start_at, b.end_at, now),
        items: itemRows.map((it) => formatBannerItemRow(it, now))
    };
};

export const createAdminBanner = async (data = {}, adminUser, ipAddress = null) => {
    const title = String(data.title || '').trim();
    if (!title || title.length > 150) {
        const err = new Error('배너 제목을 입력해주세요. (최대 150자)');
        err.status = 400;
        throw err;
    }

    const bannerKey = String(data.banner_key || '').trim().toLowerCase();
    if (!/^[a-z0-9][a-z0-9-_]{1,79}$/.test(bannerKey)) {
        const err = new Error('배너 키는 영문 소문자·숫자·하이픈(-)·밑줄(_) 2~80자로 입력해주세요.');
        err.status = 400;
        throw err;
    }

    const [dup] = await db.query(`SELECT id FROM admin_banners WHERE banner_key = ? LIMIT 1`, [bannerKey]);
    if (dup.length > 0) {
        const err = new Error('이미 사용 중인 배너 키입니다.');
        err.status = 409;
        err.code = 'DUPLICATE_BANNER_KEY';
        throw err;
    }

    const bannerType = String(data.banner_type || 'SINGLE').trim().toUpperCase();
    if (!VALID_BANNER_TYPES.includes(bannerType)) {
        const err = new Error('유효한 배너 타입(SINGLE, SWIPER, RANDOM)을 선택해주세요.');
        err.status = 400;
        throw err;
    }

    const displayStatus = String(data.display_status || 'VISIBLE').trim().toUpperCase();
    if (!VALID_DISPLAY_STATUSES.includes(displayStatus)) {
        const err = new Error('유효한 노출 상태를 선택해주세요.');
        err.status = 400;
        throw err;
    }

    const startAt = displayStatus === 'SCHEDULED' ? parseOptionalDateTime(data.start_at, '배너 시작일') : null;
    const endAt = displayStatus === 'SCHEDULED' ? parseOptionalDateTime(data.end_at, '배너 종료일') : null;
    const autoplayEnabled = data.autoplay_enabled === undefined ? 1 : (data.autoplay_enabled ? 1 : 0);
    const autoplayIntervalMs = Math.max(1000, parseInt(data.autoplay_interval_ms, 10) || 4000);
    const showIndicators = data.show_indicators === undefined ? 1 : (data.show_indicators ? 1 : 0);

    const items = normalizeBannerItemsInput(data.items || []);

    const [res] = await db.query(
        `INSERT INTO admin_banners (
            banner_key, title, banner_type, display_status, start_at, end_at,
            autoplay_enabled, autoplay_interval_ms, show_indicators, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [bannerKey, title, bannerType, displayStatus, startAt, endAt, autoplayEnabled, autoplayIntervalMs, showIndicators, adminUser.id]
    );

    const bannerId = res.insertId;
    for (const it of items) {
        await db.query(
            `INSERT INTO admin_banner_items (
                banner_id, sort_order, title, image_url, pc_image_url, tablet_image_url, mobile_image_url,
                link_url, link_target, display_status, start_at, end_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [bannerId, it.sort_order, it.title, it.image_url, it.pc_image_url, it.tablet_image_url, it.mobile_image_url, it.link_url, it.link_target, it.display_status, it.start_at, it.end_at]
        );
    }

    await logAdminAction({
        adminUserId: adminUser.id,
        action: 'BANNER_CREATE',
        targetType: 'BANNER',
        targetId: String(bannerId),
        summary: `배너 '${title}' (${bannerKey}) 생성`,
        detail: { banner_key: bannerKey, banner_type: bannerType, item_count: items.length },
        ipAddress
    });

    return await getAdminBannerById(bannerId);
};

export const updateAdminBanner = async (bannerId, data = {}, adminUser, ipAddress = null) => {
    const existing = await getAdminBannerById(bannerId);

    const title = data.title !== undefined ? String(data.title || '').trim() : existing.title;
    if (!title || title.length > 150) {
        const err = new Error('배너 제목을 입력해주세요. (최대 150자)');
        err.status = 400;
        throw err;
    }

    const bannerKey = data.banner_key !== undefined ? String(data.banner_key || '').trim().toLowerCase() : existing.banner_key;
    if (!/^[a-z0-9][a-z0-9-_]{1,79}$/.test(bannerKey)) {
        const err = new Error('배너 키는 영문 소문자·숫자·하이픈(-)·밑줄(_) 2~80자로 입력해주세요.');
        err.status = 400;
        throw err;
    }

    const [dup] = await db.query(`SELECT id FROM admin_banners WHERE banner_key = ? AND id != ? LIMIT 1`, [bannerKey, bannerId]);
    if (dup.length > 0) {
        const err = new Error('이미 사용 중인 배너 키입니다.');
        err.status = 409;
        err.code = 'DUPLICATE_BANNER_KEY';
        throw err;
    }

    const bannerType = data.banner_type !== undefined ? String(data.banner_type || '').trim().toUpperCase() : existing.banner_type;
    if (!VALID_BANNER_TYPES.includes(bannerType)) {
        const err = new Error('유효한 배너 타입(SINGLE, SWIPER, RANDOM)을 선택해주세요.');
        err.status = 400;
        throw err;
    }

    const displayStatus = data.display_status !== undefined ? String(data.display_status || '').trim().toUpperCase() : existing.display_status;
    if (!VALID_DISPLAY_STATUSES.includes(displayStatus)) {
        const err = new Error('유효한 노출 상태를 선택해주세요.');
        err.status = 400;
        throw err;
    }

    const startAt = displayStatus === 'SCHEDULED'
        ? (data.start_at !== undefined ? parseOptionalDateTime(data.start_at, '배너 시작일') : existing.start_at)
        : null;
    const endAt = displayStatus === 'SCHEDULED'
        ? (data.end_at !== undefined ? parseOptionalDateTime(data.end_at, '배너 종료일') : existing.end_at)
        : null;
    const autoplayEnabled = data.autoplay_enabled !== undefined ? (data.autoplay_enabled ? 1 : 0) : (existing.autoplay_enabled ? 1 : 0);
    const autoplayIntervalMs = data.autoplay_interval_ms !== undefined
        ? Math.max(1000, parseInt(data.autoplay_interval_ms, 10) || 4000)
        : existing.autoplay_interval_ms;
    const showIndicators = data.show_indicators !== undefined ? (data.show_indicators ? 1 : 0) : (existing.show_indicators ? 1 : 0);

    await db.query(
        `UPDATE admin_banners
         SET banner_key = ?, title = ?, banner_type = ?, display_status = ?, start_at = ?, end_at = ?,
             autoplay_enabled = ?, autoplay_interval_ms = ?, show_indicators = ?, updated_at = NOW()
         WHERE id = ?`,
        [bannerKey, title, bannerType, displayStatus, startAt, endAt, autoplayEnabled, autoplayIntervalMs, showIndicators, bannerId]
    );

    if (Array.isArray(data.items)) {
        const normalizedItems = normalizeBannerItemsInput(data.items);
        const keepIds = normalizedItems.map((it) => it.id).filter(Boolean);
        if (keepIds.length > 0) {
            const placeholders = keepIds.map(() => '?').join(', ');
            await db.query(`DELETE FROM admin_banner_items WHERE banner_id = ? AND id NOT IN (${placeholders})`, [bannerId, ...keepIds]);
        } else {
            await db.query(`DELETE FROM admin_banner_items WHERE banner_id = ?`, [bannerId]);
        }

        for (const it of normalizedItems) {
            if (it.id) {
                await db.query(
                    `UPDATE admin_banner_items
                     SET sort_order = ?, title = ?, image_url = ?, pc_image_url = ?, tablet_image_url = ?, mobile_image_url = ?,
                         link_url = ?, link_target = ?, display_status = ?, start_at = ?, end_at = ?, updated_at = NOW()
                     WHERE id = ? AND banner_id = ?`,
                    [it.sort_order, it.title, it.image_url, it.pc_image_url, it.tablet_image_url, it.mobile_image_url, it.link_url, it.link_target, it.display_status, it.start_at, it.end_at, it.id, bannerId]
                );
            } else {
                await db.query(
                    `INSERT INTO admin_banner_items (
                        banner_id, sort_order, title, image_url, pc_image_url, tablet_image_url, mobile_image_url,
                        link_url, link_target, display_status, start_at, end_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [bannerId, it.sort_order, it.title, it.image_url, it.pc_image_url, it.tablet_image_url, it.mobile_image_url, it.link_url, it.link_target, it.display_status, it.start_at, it.end_at]
                );
            }
        }
    }

    await logAdminAction({
        adminUserId: adminUser.id,
        action: 'BANNER_UPDATE',
        targetType: 'BANNER',
        targetId: String(bannerId),
        summary: `배너 '${title}' (${bannerKey}) 수정`,
        detail: { banner_key: bannerKey, banner_type: bannerType, display_status: displayStatus },
        ipAddress
    });

    return await getAdminBannerById(bannerId);
};

export const deleteAdminBanner = async (bannerId, adminUser, ipAddress = null) => {
    const existing = await getAdminBannerById(bannerId);
    await db.query(`DELETE FROM admin_banner_items WHERE banner_id = ?`, [bannerId]);
    await db.query(`DELETE FROM admin_banners WHERE id = ?`, [bannerId]);

    await logAdminAction({
        adminUserId: adminUser.id,
        action: 'BANNER_DELETE',
        targetType: 'BANNER',
        targetId: String(bannerId),
        summary: `배너 '${existing.title}' (${existing.banner_key}) 삭제`,
        detail: { id: Number(bannerId) },
        ipAddress
    });

    return { deletedId: Number(bannerId) };
};

// ==================== Popups ====================

export const getAdminPopups = async () => {
    const [[settingsRow]] = await db.query(`SELECT * FROM admin_popup_settings WHERE id = 1 LIMIT 1`);
    const [slideRows] = await db.query(`SELECT * FROM admin_popup_slides ORDER BY sort_order ASC, id ASC`);
    const now = new Date();
    return {
        settings: formatPopupSettings(settingsRow),
        slides: slideRows.map((s) => formatPopupSlideRow(s, now))
    };
};

export const updateAdminPopupSettings = async (data = {}, adminUser, ipAddress = null) => {
    const [[existing]] = await db.query(`SELECT * FROM admin_popup_settings WHERE id = 1 LIMIT 1`);
    const cur = formatPopupSettings(existing);

    const isEnabled = data.is_enabled !== undefined ? (data.is_enabled ? 1 : 0) : (cur.is_enabled ? 1 : 0);
    const dismissPolicy = data.dismiss_policy !== undefined ? String(data.dismiss_policy).toUpperCase() : cur.dismiss_policy;
    if (!VALID_DISMISS_POLICIES.includes(dismissPolicy)) {
        const err = new Error('유효한 다시 보지 않기 정책(DAY, WEEK, NONE)을 선택해주세요.');
        err.status = 400;
        throw err;
    }
    const showPc = data.show_pc !== undefined ? (data.show_pc ? 1 : 0) : (cur.show_pc ? 1 : 0);
    const showTablet = data.show_tablet !== undefined ? (data.show_tablet ? 1 : 0) : (cur.show_tablet ? 1 : 0);
    const showMobile = data.show_mobile !== undefined ? (data.show_mobile ? 1 : 0) : (cur.show_mobile ? 1 : 0);
    const mobileMode = data.mobile_display_mode !== undefined ? String(data.mobile_display_mode).toUpperCase() : cur.mobile_display_mode;
    if (!VALID_MOBILE_MODES.includes(mobileMode)) {
        const err = new Error('유효한 모바일 노출 방식(MODAL, BOTTOM_SHEET)을 선택해주세요.');
        err.status = 400;
        throw err;
    }

    await db.query(
        `UPDATE admin_popup_settings
         SET is_enabled = ?, dismiss_policy = ?, show_pc = ?, show_tablet = ?, show_mobile = ?,
             mobile_display_mode = ?, updated_by = ?, updated_at = NOW()
         WHERE id = 1`,
        [isEnabled, dismissPolicy, showPc, showTablet, showMobile, mobileMode, adminUser.id]
    );

    await logAdminAction({
        adminUserId: adminUser.id,
        action: 'POPUP_SETTINGS_UPDATE',
        targetType: 'POPUP',
        targetId: '1',
        summary: `팝업 노출 설정 변경`,
        detail: { is_enabled: Boolean(isEnabled), dismiss_policy: dismissPolicy, mobile_display_mode: mobileMode },
        ipAddress
    });

    const [[updated]] = await db.query(`SELECT * FROM admin_popup_settings WHERE id = 1 LIMIT 1`);
    return formatPopupSettings(updated);
};

export const reorderAdminPopupSlides = async (slideIds = [], adminUser, ipAddress = null) => {
    if (!Array.isArray(slideIds) || slideIds.length === 0) {
        const err = new Error('정렬할 슬라이드 ID 목록을 전달해주세요.');
        err.status = 400;
        throw err;
    }
    for (let i = 0; i < slideIds.length; i++) {
        await db.query(`UPDATE admin_popup_slides SET sort_order = ? WHERE id = ?`, [i + 1, Number(slideIds[i])]);
    }
    await logAdminAction({
        adminUserId: adminUser.id,
        action: 'POPUP_SLIDES_REORDER',
        targetType: 'POPUP',
        targetId: null,
        summary: `팝업 슬라이드 순서 변경 (${slideIds.length}개)`,
        detail: { slideIds },
        ipAddress
    });
    const { slides } = await getAdminPopups();
    return slides;
};

export const getAdminPopupSlideById = async (slideId) => {
    const [rows] = await db.query(`SELECT * FROM admin_popup_slides WHERE id = ? LIMIT 1`, [slideId]);
    if (!rows[0]) {
        const err = new Error('팝업 슬라이드를 찾을 수 없습니다.');
        err.status = 404;
        throw err;
    }
    const [[settingsRow]] = await db.query(`SELECT * FROM admin_popup_settings WHERE id = 1 LIMIT 1`);
    return {
        slide: formatPopupSlideRow(rows[0]),
        settings: formatPopupSettings(settingsRow)
    };
};

export const createAdminPopupSlide = async (data = {}, adminUser, ipAddress = null) => {
    const imageUrl = String(data.image_url || '').trim().slice(0, 500);
    if (!imageUrl) {
        const err = new Error('팝업 이미지를 등록해주세요.');
        err.status = 400;
        throw err;
    }
    const title = data.title ? String(data.title).trim().slice(0, 150) : null;
    const linkUrl = data.link_url ? String(data.link_url).trim().slice(0, 500) : null;
    const linkTarget = VALID_LINK_TARGETS.includes(data.link_target) ? data.link_target : '_self';
    const displayStatus = String(data.display_status || 'VISIBLE').trim().toUpperCase();
    if (!VALID_DISPLAY_STATUSES.includes(displayStatus)) {
        const err = new Error('유효한 노출 상태를 선택해주세요.');
        err.status = 400;
        throw err;
    }
    const startAt = displayStatus === 'SCHEDULED' ? parseOptionalDateTime(data.start_at, '팝업 시작일') : null;
    const endAt = displayStatus === 'SCHEDULED' ? parseOptionalDateTime(data.end_at, '팝업 종료일') : null;

    let sortOrder = parseInt(data.sort_order, 10);
    if (!Number.isInteger(sortOrder) || sortOrder < 1) {
        const [[maxRow]] = await db.query(`SELECT COALESCE(MAX(sort_order), 0) + 1 AS next_order FROM admin_popup_slides`);
        sortOrder = Number(maxRow?.next_order || 1);
    }

    const [res] = await db.query(
        `INSERT INTO admin_popup_slides (
            sort_order, title, image_url, link_url, link_target, display_status, start_at, end_at, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [sortOrder, title, imageUrl, linkUrl, linkTarget, displayStatus, startAt, endAt, adminUser.id]
    );

    await logAdminAction({
        adminUserId: adminUser.id,
        action: 'POPUP_SLIDE_CREATE',
        targetType: 'POPUP',
        targetId: String(res.insertId),
        summary: `팝업 슬라이드 '${title || res.insertId}' 추가`,
        detail: { id: res.insertId, display_status: displayStatus },
        ipAddress
    });

    const { slide } = await getAdminPopupSlideById(res.insertId);
    return slide;
};

export const updateAdminPopupSlide = async (slideId, data = {}, adminUser, ipAddress = null) => {
    const { slide: existing } = await getAdminPopupSlideById(slideId);

    const imageUrl = data.image_url !== undefined ? String(data.image_url || '').trim().slice(0, 500) : existing.image_url;
    if (!imageUrl) {
        const err = new Error('팝업 이미지를 등록해주세요.');
        err.status = 400;
        throw err;
    }
    const title = data.title !== undefined ? (data.title ? String(data.title).trim().slice(0, 150) : null) : existing.title;
    const linkUrl = data.link_url !== undefined ? (data.link_url ? String(data.link_url).trim().slice(0, 500) : null) : existing.link_url;
    const linkTarget = data.link_target !== undefined ? (VALID_LINK_TARGETS.includes(data.link_target) ? data.link_target : '_self') : existing.link_target;
    const displayStatus = data.display_status !== undefined ? String(data.display_status || '').trim().toUpperCase() : existing.display_status;
    if (!VALID_DISPLAY_STATUSES.includes(displayStatus)) {
        const err = new Error('유효한 노출 상태를 선택해주세요.');
        err.status = 400;
        throw err;
    }
    const startAt = displayStatus === 'SCHEDULED'
        ? (data.start_at !== undefined ? parseOptionalDateTime(data.start_at, '팝업 시작일') : existing.start_at)
        : null;
    const endAt = displayStatus === 'SCHEDULED'
        ? (data.end_at !== undefined ? parseOptionalDateTime(data.end_at, '팝업 종료일') : existing.end_at)
        : null;
    const sortOrder = data.sort_order !== undefined ? (parseInt(data.sort_order, 10) || existing.sort_order) : existing.sort_order;

    await db.query(
        `UPDATE admin_popup_slides
         SET sort_order = ?, title = ?, image_url = ?, link_url = ?, link_target = ?,
             display_status = ?, start_at = ?, end_at = ?, updated_at = NOW()
         WHERE id = ?`,
        [sortOrder, title, imageUrl, linkUrl, linkTarget, displayStatus, startAt, endAt, slideId]
    );

    await logAdminAction({
        adminUserId: adminUser.id,
        action: 'POPUP_SLIDE_UPDATE',
        targetType: 'POPUP',
        targetId: String(slideId),
        summary: `팝업 슬라이드 '${title || slideId}' 수정`,
        detail: { id: Number(slideId), display_status: displayStatus },
        ipAddress
    });

    const { slide } = await getAdminPopupSlideById(slideId);
    return slide;
};

export const deleteAdminPopupSlide = async (slideId, adminUser, ipAddress = null) => {
    const { slide: existing } = await getAdminPopupSlideById(slideId);
    await db.query(`DELETE FROM admin_popup_slides WHERE id = ?`, [slideId]);

    await logAdminAction({
        adminUserId: adminUser.id,
        action: 'POPUP_SLIDE_DELETE',
        targetType: 'POPUP',
        targetId: String(slideId),
        summary: `팝업 슬라이드 '${existing.title || slideId}' 삭제`,
        detail: { id: Number(slideId) },
        ipAddress
    });

    return { deletedId: Number(slideId) };
};

// ==================== Public Endpoints ====================

export const getPublicBannerByKey = async (bannerKey) => {
    const key = String(bannerKey || '').trim().toLowerCase();
    const [rows] = await db.query(`SELECT * FROM admin_banners WHERE banner_key = ? LIMIT 1`, [key]);
    if (!rows[0]) {
        return { active: false, banner: null, items: [] };
    }
    const now = new Date();
    const b = rows[0];
    if (computeEffectiveStatus(b.display_status, b.start_at, b.end_at, now) !== 'ACTIVE') {
        return { active: false, banner: null, items: [] };
    }
    const [itemRows] = await db.query(
        `SELECT * FROM admin_banner_items WHERE banner_id = ? ORDER BY sort_order ASC, id ASC`,
        [b.id]
    );
    const activeItems = itemRows
        .map((it) => formatBannerItemRow(it, now))
        .filter((it) => it.effective_status === 'ACTIVE');

    if (activeItems.length === 0) {
        return { active: false, banner: null, items: [] };
    }

    return {
        active: true,
        banner: {
            id: b.id,
            banner_key: b.banner_key,
            title: b.title,
            banner_type: b.banner_type,
            autoplay_enabled: Boolean(Number(b.autoplay_enabled || 0)),
            autoplay_interval_ms: Number(b.autoplay_interval_ms || 4000),
            show_indicators: Boolean(Number(b.show_indicators || 0))
        },
        items: activeItems
    };
};

export const trackPublicBannerClick = async (bannerKey, itemId = null) => {
    const key = String(bannerKey || '').trim().toLowerCase();
    const [rows] = await db.query(`SELECT id FROM admin_banners WHERE banner_key = ? LIMIT 1`, [key]);
    if (!rows[0]) return;
    await db.query(`UPDATE admin_banners SET click_count = click_count + 1 WHERE id = ?`, [rows[0].id]);
    if (itemId) {
        await db.query(`UPDATE admin_banner_items SET click_count = click_count + 1 WHERE id = ? AND banner_id = ?`, [itemId, rows[0].id]);
    }
};

export const getPublicMainPopup = async () => {
    const [[settingsRow]] = await db.query(`SELECT * FROM admin_popup_settings WHERE id = 1 LIMIT 1`);
    const settings = formatPopupSettings(settingsRow);
    if (!settings.is_enabled) {
        return { active: false, settings, slides: [] };
    }
    const [slideRows] = await db.query(`SELECT * FROM admin_popup_slides ORDER BY sort_order ASC, id ASC`);
    const now = new Date();
    const activeSlides = slideRows
        .map((s) => formatPopupSlideRow(s, now))
        .filter((s) => s.effective_status === 'ACTIVE');
    return {
        active: activeSlides.length > 0,
        settings,
        slides: activeSlides
    };
};

export const trackPublicPopupSlideClick = async (slideId) => {
    await db.query(`UPDATE admin_popup_slides SET click_count = click_count + 1 WHERE id = ?`, [slideId]);
};

export const computeEventStatus = (row, now = new Date()) => {
    if (row?.type !== 'EVENT') return null;
    if (row.event_start_at && now < new Date(row.event_start_at)) return 'UPCOMING';
    if (row.event_end_at && now > new Date(row.event_end_at)) return 'ENDED';
    if (!row.event_start_at && !row.event_end_at) return 'ALWAYS';
    return 'ONGOING';
};

const extractNoticeSearchText = (content) => {
    if (!content) return '';
    if (typeof content === 'string') {
        const trimmed = content.trim();
        if (trimmed.startsWith('[')) {
            try {
                const parsed = JSON.parse(trimmed);
                if (Array.isArray(parsed)) {
                    return parsed.map((b) => String(b?.content || '')).join(' ');
                }
            } catch {
                // fallback to raw string
            }
        }
        return content;
    }
    if (Array.isArray(content)) {
        return content.map((b) => String(b?.content || '')).join(' ');
    }
    return String(content);
};

export const getPublicNotices = async ({
    type = 'ALL',
    onlyOngoingEvents = false,
    q = '',
    page = 1,
    pageSize = 10
} = {}) => {
    const [rows] = await db.query(
        `SELECT * FROM admin_notices WHERE type IN ('NOTICE','EVENT') ORDER BY is_pinned DESC, created_at DESC, id DESC`
    );
    const now = new Date();
    const allActive = rows
        .map((r) => ({
            ...formatNoticeRow(r, now),
            event_status: computeEventStatus(r, now)
        }))
        .filter((n) => n.effective_status === 'ACTIVE');

    const counts = {
        total: allActive.length,
        noticeCount: allActive.filter((n) => n.type === 'NOTICE').length,
        eventCount: allActive.filter((n) => n.type === 'EVENT').length
    };

    let filtered = allActive;
    const upperType = String(type || 'ALL').trim().toUpperCase();
    if (['NOTICE', 'EVENT'].includes(upperType)) {
        filtered = filtered.filter((n) => n.type === upperType);
    }

    const ongoingOnly = onlyOngoingEvents === true || onlyOngoingEvents === 'true' || onlyOngoingEvents === '1';
    if (ongoingOnly) {
        filtered = filtered.filter((n) => n.type === 'EVENT' && ['ONGOING', 'ALWAYS'].includes(n.event_status));
    }

    const trimmedQ = String(q || '').trim().toLowerCase();
    if (trimmedQ) {
        filtered = filtered.filter((n) => {
            const titleMatch = String(n.title || '').toLowerCase().includes(trimmedQ);
            const contentText = extractNoticeSearchText(n.content).toLowerCase();
            return titleMatch || contentText.includes(trimmedQ);
        });
    }

    const pinnedNotices = filtered.filter((n) => n.is_pinned === true);
    const regular = filtered.filter((n) => n.is_pinned === false);

    const safePage = Math.max(1, parseInt(page, 10) || 1);
    const safePageSize = Math.min(50, Math.max(1, parseInt(pageSize, 10) || 10));
    const total = regular.length;
    const totalPages = Math.max(1, Math.ceil(total / safePageSize));
    const notices = regular.slice((safePage - 1) * safePageSize, safePage * safePageSize);

    return {
        counts,
        pinnedNotices,
        notices,
        pagination: {
            page: safePage,
            pageSize: safePageSize,
            total,
            totalPages
        }
    };
};

export const getPublicNoticeDetail = async (noticeId) => {
    const [rows] = await db.query(
        `SELECT * FROM admin_notices WHERE type IN ('NOTICE','EVENT') ORDER BY is_pinned DESC, created_at DESC, id DESC`
    );
    const now = new Date();
    const allActive = rows
        .map((r) => ({
            ...formatNoticeRow(r, now),
            event_status: computeEventStatus(r, now)
        }))
        .filter((n) => n.effective_status === 'ACTIVE');

    const idx = allActive.findIndex((n) => String(n.id) === String(noticeId));
    if (idx === -1) {
        const err = new Error('공지사항을 찾을 수 없습니다.');
        err.status = 404;
        err.code = 'NOTICE_NOT_FOUND';
        throw err;
    }

    const target = allActive[idx];
    await db.query(
        `UPDATE admin_notices SET view_count = COALESCE(view_count, 0) + 1 WHERE id = ?`,
        [target.id]
    );

    const notice = {
        ...target,
        view_count: Number(target.view_count || 0) + 1
    };

    const prevNotice = idx > 0
        ? { id: allActive[idx - 1].id, type: allActive[idx - 1].type, title: allActive[idx - 1].title, created_at: allActive[idx - 1].created_at }
        : null;
    const nextNotice = idx < allActive.length - 1
        ? { id: allActive[idx + 1].id, type: allActive[idx + 1].type, title: allActive[idx + 1].title, created_at: allActive[idx + 1].created_at }
        : null;

    return { notice, prevNotice, nextNotice };
};
