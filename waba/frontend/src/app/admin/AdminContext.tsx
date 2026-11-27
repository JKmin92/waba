'use client'

import React, { createContext, useContext } from 'react';

export interface AdminUser {
    id: string;
    email?: string;
    nickname?: string;
    profile_image_url?: string | null;
    role?: string;
    admin_level?: 'SUPER' | 'NORMAL';
    admin_name?: string | null;
    admin_title?: string | null;
}

export interface AdminContextValue {
    adminUser: AdminUser | null;
    isSuperAdmin: boolean;
    refreshAdminMe: () => Promise<void>;
}

export const AdminContext = createContext<AdminContextValue>({
    adminUser: null,
    isSuperAdmin: false,
    refreshAdminMe: async () => {},
});

export function useAdminContext() {
    return useContext(AdminContext);
}
