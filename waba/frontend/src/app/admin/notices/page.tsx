import { Suspense } from 'react';
import { Flex, Spinner } from '@chakra-ui/react';
import AdminNoticesHubClient from './AdminNoticesHubClient';

export default function AdminNoticesPage() {
    return (
        <Suspense
            fallback={
                <Flex py={20} justify="center">
                    <Spinner size="lg" color="#6338A9" />
                </Flex>
            }
        >
            <AdminNoticesHubClient />
        </Suspense>
    );
}
