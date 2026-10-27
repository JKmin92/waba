'use client'

import { PostDetail } from "@/interface";
import axiosInstance from "@/utils/api";
import { Container } from "@chakra-ui/react"
import { useEffect, useState } from "react";

export default function BoardClient({ boardId }: { boardId: string }) {

    const [postList, setPostList] = useState<PostDetail[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPostList = async () => {
            const res = await axiosInstance.get(`/post/board/${boardId}`);
            setPostList(res.data);
            setLoading(false);
        };
        fetchPostList();
    }, [boardId]);

    return (
        <Container></Container>
    )
}