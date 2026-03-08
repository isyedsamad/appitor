import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { verifyUser } from "@/lib/verifyUser";
import { FieldValue } from "firebase-admin/firestore";

export async function GET(req) {
    try {
        const user = await verifyUser(req, "payroll.view");
        const branchId = req.headers.get("x-branch-id");

        if (!branchId) {
            return NextResponse.json({ message: "Branch ID required" }, { status: 400 });
        }

        const settingsRef = adminDb
            .collection("schools")
            .doc(user.schoolId)
            .collection("branches")
            .doc(branchId)
            .collection("settings")
            .doc("payroll");

        const snap = await settingsRef.get();
        const settings = snap.exists ? snap.data() : { isAdvanced: false, components: { earnings: [], deductions: [] } };

        return NextResponse.json(settings);
    } catch (err) {
        return NextResponse.json({ message: err.message }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        const user = await verifyUser(req, "payroll.manage");
        const branchId = req.headers.get("x-branch-id");
        const body = await req.json();

        if (!branchId) {
            return NextResponse.json({ message: "Branch ID required" }, { status: 400 });
        }

        const settingsRef = adminDb
            .collection("schools")
            .doc(user.schoolId)
            .collection("branches")
            .doc(branchId)
            .collection("settings")
            .doc("payroll");

        await settingsRef.set({
            ...body,
            updatedAt: FieldValue.serverTimestamp(),
            updatedBy: user.uid,
        }, { merge: true });

        return NextResponse.json({ success: true, message: "Settings updated" });
    } catch (err) {
        return NextResponse.json({ message: err.message }, { status: 500 });
    }
}
