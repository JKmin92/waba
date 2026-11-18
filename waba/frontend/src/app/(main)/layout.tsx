import React from 'react';
import SideBarShell from './common/side-bar';

export default function MainGroupLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <SideBarShell>{children}</SideBarShell>;
}
