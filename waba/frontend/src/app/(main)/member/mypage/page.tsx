import { Suspense } from "react";
import MypageClient from "./MypageClient";

export default function MypagePage() {
    return (
        <Suspense fallback={null}>
            <MypageClient />
        </Suspense>
    );
}
