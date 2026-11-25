'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import axiosInstance from '@/utils/api';
import { isAuthenticated } from '@/utils/authUtils';

const VISITOR_KEY_STORAGE = 'waba_visitor_key';
const SESSION_ENTRY_STORAGE = 'waba_visit_entry';
const SHORT_REF_COOKIE = 'waba_short_ref';

interface SessionEntryInfo {
    referrerUrl: string | null;
    utmSource: string | null;
    utmMedium: string | null;
    utmCampaign: string | null;
}

const getOrCreateVisitorKey = (): string => {
    if (typeof window === 'undefined') return '';
    try {
        const existing = localStorage.getItem(VISITOR_KEY_STORAGE);
        if (existing) return existing;
        const generated =
            typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
                ? crypto.randomUUID()
                : `v_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
        localStorage.setItem(VISITOR_KEY_STORAGE, generated);
        return generated;
    } catch {
        return '';
    }
};

const consumeShortRefCookie = (): string | null => {
    if (typeof document === 'undefined') return null;
    try {
        const cookies = document.cookie ? document.cookie.split('; ') : [];
        const match = cookies.find((c) => c.startsWith(`${SHORT_REF_COOKIE}=`));
        if (!match) return null;

        const rawVal = match.slice(SHORT_REF_COOKIE.length + 1);
        document.cookie = `${SHORT_REF_COOKIE}=; path=/; max-age=0; samesite=lax`;

        const parsed = JSON.parse(decodeURIComponent(rawVal));
        return typeof parsed?.code === 'string' ? parsed.code : null;
    } catch {
        return null;
    }
};

const getSessionEntryInfo = (): SessionEntryInfo => {
    if (typeof window === 'undefined') {
        return { referrerUrl: null, utmSource: null, utmMedium: null, utmCampaign: null };
    }

    try {
        const searchParams = new URLSearchParams(window.location.search);
        const currentUtmSource = searchParams.get('utm_source');
        const currentUtmMedium = searchParams.get('utm_medium');
        const currentUtmCampaign = searchParams.get('utm_campaign');

        const cachedRaw = sessionStorage.getItem(SESSION_ENTRY_STORAGE);
        if (cachedRaw) {
            const cached = JSON.parse(cachedRaw) as SessionEntryInfo;
            if (currentUtmSource && !cached.utmSource) {
                const updated: SessionEntryInfo = {
                    ...cached,
                    utmSource: currentUtmSource,
                    utmMedium: currentUtmMedium,
                    utmCampaign: currentUtmCampaign,
                };
                sessionStorage.setItem(SESSION_ENTRY_STORAGE, JSON.stringify(updated));
                return updated;
            }
            return cached;
        }

        let externalReferrer: string | null = null;
        if (document.referrer) {
            try {
                const refUrl = new URL(document.referrer);
                const currentHost = window.location.hostname.toLowerCase().replace(/^www\./, '');
                const refHost = refUrl.hostname.toLowerCase().replace(/^www\./, '');
                if (refHost && refHost !== currentHost) {
                    externalReferrer = document.referrer;
                }
            } catch {
                externalReferrer = null;
            }
        }

        const entry: SessionEntryInfo = {
            referrerUrl: externalReferrer,
            utmSource: currentUtmSource,
            utmMedium: currentUtmMedium,
            utmCampaign: currentUtmCampaign,
        };
        sessionStorage.setItem(SESSION_ENTRY_STORAGE, JSON.stringify(entry));
        return entry;
    } catch {
        return { referrerUrl: null, utmSource: null, utmMedium: null, utmCampaign: null };
    }
};

const isTrackableClientPath = (path?: string | null): path is string => {
    if (!path) return false;
    return !path.startsWith('/admin') && !path.startsWith('/s/');
};

export default function VisitTracker() {
    const pathname = usePathname();
    const pathnameRef = useRef<string | null>(pathname);
    const lastSentRef = useRef<{ path: string; time: number } | null>(null);

    useEffect(() => {
        pathnameRef.current = pathname;
        if (!isTrackableClientPath(pathname)) return;

        const visitorKey = getOrCreateVisitorKey();
        if (!visitorKey) return;

        const shortLinkCode = consumeShortRefCookie();
        const now = Date.now();
        if (
            !shortLinkCode &&
            lastSentRef.current &&
            lastSentRef.current.path === pathname &&
            now - lastSentRef.current.time < 1500
        ) {
            return;
        }
        lastSentRef.current = { path: pathname, time: now };

        const entry = getSessionEntryInfo();
        axiosInstance
            .post('/public/track/visit', {
                visitorKey,
                path: pathname,
                referrerUrl: entry.referrerUrl,
                currentHost: window.location.hostname,
                utmSource: entry.utmSource,
                utmMedium: entry.utmMedium,
                utmCampaign: entry.utmCampaign,
                shortLinkCode,
            })
            .catch(() => {});
    }, [pathname]);

    useEffect(() => {
        const handleAuthChange = () => {
            if (!isAuthenticated()) return;
            const currentPath = pathnameRef.current;
            if (!isTrackableClientPath(currentPath)) return;

            const visitorKey = getOrCreateVisitorKey();
            if (!visitorKey) return;

            axiosInstance
                .post('/public/track/visit', {
                    visitorKey,
                    path: currentPath,
                    currentHost: window.location.hostname,
                    isLoginSync: true,
                })
                .catch(() => {});
        };

        window.addEventListener('auth-change', handleAuthChange);
        return () => window.removeEventListener('auth-change', handleAuthChange);
    }, []);

    return null;
}
