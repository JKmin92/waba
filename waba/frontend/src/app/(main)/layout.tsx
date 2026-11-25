import React from 'react';
import SideBarShell from './common/side-bar';
import VisitTracker from './common/VisitTracker';

export default function MainGroupLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <>
            <VisitTracker />
            <SideBarShell>{children}</SideBarShell>
        </>
    );
}
