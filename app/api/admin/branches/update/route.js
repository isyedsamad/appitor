export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { verifyAppCheck } from "@/lib/verifyAppCheck";
import { verifySuperAdmin } from "@/lib/verifySuperAdmin";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(req) {
    try {
        await verifyAppCheck(req);
        await verifySuperAdmin(req);
        const { branchId, schoolId, updates } = await req.json();

        if (!branchId || !schoolId || !updates) {
            return NextResponse.json(
                { error: "Missing required fields" },
                { status: 400 }
            );
        }

        const batch = adminDb.batch();
        const branchRef = adminDb.collection("branches").doc(branchId);
        const schoolBranchRef = adminDb
            .collection("schools")
            .doc(schoolId)
            .collection("branches")
            .doc(branchId);

        const cleanUpdates = {
            ...updates,
            updatedAt: FieldValue.serverTimestamp(),
        };

        batch.update(branchRef, cleanUpdates);
        batch.update(schoolBranchRef, cleanUpdates);

        await batch.commit();
        return NextResponse.json({ success: true });
    } catch (err) {
        console.error("update branch error:", err);
        return NextResponse.json(
            { error: err.message },
            { status: 500 }
        );
    }
}
