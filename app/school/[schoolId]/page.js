"use client";

import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";

export default function SchoolRootPage() {
    const router = useRouter();
    const params = useParams();

    useEffect(() => {
        if (params.schoolId) {
            router.replace(`/school/${params.schoolId}/dashboard`);
        }
    }, [params.schoolId, router]);

    return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <div className="w-8 h-8 border-4 border-(--primary) border-t-transparent rounded-full animate-spin" />
        </div>
    );
}
