import BannerEditorForm from '../../components/BannerEditorForm';

export default async function EditBannerPage({
    params,
}: {
    params: Promise<{ bannerId: string }>;
}) {
    const { bannerId } = await params;
    return <BannerEditorForm mode="edit" bannerId={bannerId} />;
}
