import PostEditClient from "./PostEditClient";

export default async function PostEditPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    return <PostEditClient postId={id} />;
}
