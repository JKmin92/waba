import { Suspense } from 'react';
import JourneyClient from './JourneyClient';
import { Center, Spinner } from '@chakra-ui/react';

interface JourneyPageProps {
    params: {
        slug: string;
    };
}

export default function JourneyPage({ params }: JourneyPageProps) {
    return (
        <Suspense
            fallback={
                <Center minH="70vh">
                    <Spinner size="xl" color="waba.purple" />
                </Center>
            }
        >
            <JourneyClient slug={params.slug} />
        </Suspense>
    );
}
