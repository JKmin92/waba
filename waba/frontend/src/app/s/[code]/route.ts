import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const API_BASE =
    process.env.BACKEND_INTERNAL_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    'http://127.0.0.1:5000/api';

export async function GET(
    request: NextRequest,
    { params }: { params: { code: string } }
) {
    const code = String(params?.code || '').trim();
    if (!code) {
        return NextResponse.redirect(new URL('/', request.url), 302);
    }

    try {
        const res = await fetch(
            `${API_BASE}/public/short-links/${encodeURIComponent(code)}/resolve`,
            {
                method: 'GET',
                headers: {
                    'x-client-user-agent': request.headers.get('user-agent') || '',
                },
                cache: 'no-store',
            }
        );

        if (!res.ok) {
            return NextResponse.redirect(new URL('/', request.url), 302);
        }

        const data = await res.json();
        const targetPath = typeof data?.targetPath === 'string' ? data.targetPath : '/';
        const safePath =
            targetPath.startsWith('/') && !targetPath.startsWith('//')
                ? targetPath
                : '/';

        const response = NextResponse.redirect(new URL(safePath, request.url), 302);

        if (!data?.isBot && data?.code) {
            response.cookies.set(
                'waba_short_ref',
                JSON.stringify({
                    code: data.code,
                    channel: data.channel || 'SHARE_COPY',
                }),
                {
                    httpOnly: false,
                    sameSite: 'lax',
                    path: '/',
                    maxAge: 300,
                }
            );
        }

        return response;
    } catch {
        return NextResponse.redirect(new URL('/', request.url), 302);
    }
}
