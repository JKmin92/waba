import PopupEditorForm from '../../components/PopupEditorForm';

export default async function EditPopupSlidePage({
    params,
}: {
    params: Promise<{ slideId: string }>;
}) {
    const { slideId } = await params;
    return <PopupEditorForm mode="edit" slideId={slideId} />;
}
