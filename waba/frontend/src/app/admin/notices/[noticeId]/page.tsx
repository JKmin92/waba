import NoticeEditorForm from '../components/NoticeEditorForm';

export default async function EditNoticePage({
    params,
}: {
    params: Promise<{ noticeId: string }>;
}) {
    const { noticeId } = await params;
    return <NoticeEditorForm mode="edit" noticeId={noticeId} />;
}
