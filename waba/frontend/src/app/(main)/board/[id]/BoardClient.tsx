'use client'

import { PostDetail } from "@/interface";
import axiosInstance from "@/utils/api";
import { CheckboxCard, Container, Heading, HStack, SegmentGroup, Stack, Text } from "@chakra-ui/react"
import { useEffect, useMemo, useState } from "react";
import Header from "../../common/Header";
import { petSpeciesLabel } from "@/utils/simpleUtils";
import { toaster } from "@/components/ui/toaster";
import PostMasonryList from "./PostMasonryList";

export default function BoardClient({ boardId }: { boardId: string }) {

    const [postList, setPostList] = useState<PostDetail[]>([]);
    const [selectedPetTypeList, setSelectedPetTypeList] = useState<string[]>(['전체']);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPostList = async () => {
            try {
                const res = await axiosInstance.get(`/post/board/${boardId}`);
                setPostList(res.data);
            } catch {
                toaster.create({ title: '오류가 발생했습니다.', type: 'error' });
            } finally {
                setLoading(false);
            }


        };
        fetchPostList();
    }, [boardId]);

    const petTypeCount = useMemo(() => {
        let totalCount = 0;
        const countMap: Record<string, number> = {};

        postList.map((post) => {
            post.post_pets?.map((pet) => {
                totalCount += 1;
                if (pet.species) countMap[pet.species] = (countMap[pet.species] || 0) + 1;
            })
        })

        const sortedSpecies = Object.entries(countMap).map(([type, count]) => ({ type, count, checked: selectedPetTypeList.includes(type) })).sort((a, b) => b.count - a.count);

        return [{ type: '전체', count: totalCount, checked: selectedPetTypeList.includes('전체') }, ...sortedSpecies];
    }, [postList, selectedPetTypeList]);

    const petTypeChangeHandler = (type: string) => {
        if (type === '전체') {
            setSelectedPetTypeList(['전체']);
            return;
        } else {
            let next = selectedPetTypeList.filter(t => t !== '전체');

            if (next.includes(type)) {
                next = next.filter(t => t !== type);
            } else {
                next = [...next, type];
            }

            if (next.length === 0) {
                setSelectedPetTypeList(['전체']);
            } else {
                setSelectedPetTypeList(next);
            }
        }
    }

    const filteredPostList = useMemo(() => {
        if (selectedPetTypeList.includes('전체')) return postList;
        return postList.filter((post) =>
            post.post_pets?.some((pet) => selectedPetTypeList.includes(pet.species))
        );
    }, [postList, selectedPetTypeList]);

    return (
        <Container minH="100vh" bg="waba.canvas" pb={24}>
            <Header />
            <Container maxW="1280px" pt={32} px={6}>
                <Stack gap="12">
                    <Stack gap="4">
                        <Stack direction="row" alignItems="end" justifyContent="space-between">
                            <Stack gap="0">
                                <Text color="fg.subtle">{filteredPostList.length}개의 게시글</Text>
                                <Heading fontSize="2xl">반려생활 이야기</Heading>
                            </Stack>
                            <SegmentGroup.Root size="sm" defaultValue="최신순" rounded="full">
                                <SegmentGroup.Indicator rounded="full" bg="bg" />
                                <SegmentGroup.Items items={["최신순", "인기순", "댓글 많은순"]} />
                            </SegmentGroup.Root>
                        </Stack>

                        <HStack>
                            {petTypeCount.map((petType) => (
                                <CheckboxCard.Root
                                    key={petType.type}
                                    rounded="full"
                                    maxW="150px"
                                    display="inline-flex"
                                    checked={petType.checked}
                                    onCheckedChange={() => petTypeChangeHandler(petType.type)}>
                                    <CheckboxCard.HiddenInput />
                                    <CheckboxCard.Control py="2">
                                        <CheckboxCard.Label>{petType.type === '전체' ? petType.type : petSpeciesLabel(petType.type)} ({petType.count})</CheckboxCard.Label>
                                    </CheckboxCard.Control>
                                </CheckboxCard.Root>
                            ))}
                        </HStack>
                    </Stack>
                    <PostMasonryList postList={filteredPostList} />
                </Stack>
            </Container>
        </Container>
    )
}