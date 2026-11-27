import NoticeDetailClient from './NoticeDetailClient';

export default async function NoticeDetailPage({
    params,
}: {
    params: Promise<{ noticeId: string }>;
}) {
    const { noticeId } = await params;
    return <NoticeDetailClient noticeId={noticeId} />;
}
