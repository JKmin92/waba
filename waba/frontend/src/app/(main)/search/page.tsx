import { Suspense } from 'react';
import SearchClient from './SearchClient';
import { Box, Spinner, Center } from '@chakra-ui/react';

export default function SearchPage() {
    return (
        <Suspense
            fallback={
                <Center minH="60vh">
                    <Spinner size="xl" color="waba.purple" />
                </Center>
            }
        >
            <SearchClient />
        </Suspense>
    );
}
