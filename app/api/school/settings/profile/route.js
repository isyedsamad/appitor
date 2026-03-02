import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { verifyUser } from "@/lib/verifyUser";
import { FieldValue } from "firebase-admin/firestore";

export async function GET(req) {
    try {
        const user = await verifyUser(req, "system.profile.view");
        const { searchParams } = new URL(req.url);
        const branchId = searchParams.get("branch");

        if (!branchId) {
            return NextResponse.json({ message: "Branch ID required" }, { status: 400 });
        }

        const branchRef = adminDb
            .collection("schools")
            .doc(user.schoolId)
            .collection("branches")
            .doc(branchId);

        const snap = await branchRef.get();
        if (!snap.exists) {
            return NextResponse.json({ message: "Branch not found" }, { status: 404 });
        }

        return NextResponse.json({ id: snap.id, ...snap.data() });
    } catch (err) {
        console.error("PROFILE GET ERROR:", err);
        return NextResponse.json(
            { message: "Internal server error" },
            { status: 500 }
        );
    }
}

export async function PUT(req) {
    try {
        const user = await verifyUser(req, "system.profile.manage");
        const { branchId, ...updateData } = await req.json();

        if (!branchId) {
            return NextResponse.json({ message: "Branch ID required" }, { status: 400 });
        }

        // List of allowed fields to update
        const allowedFields = [
            "name",
            "branchCode",
            "city",
            "state",
            "address",
            "phone",
            "email",
            "website",
        ];

        const filteredUpdate = {};
        allowedFields.forEach((field) => {
            if (updateData[field] !== undefined) {
                filteredUpdate[field] = updateData[field];
            }
        });

        if (Object.keys(filteredUpdate).length === 0) {
            return NextResponse.json({ message: "No valid fields to update" }, { status: 400 });
        }

        const branchRef = adminDb
            .collection("schools")
            .doc(user.schoolId)
            .collection("branches")
            .doc(branchId);

        await branchRef.update({
            ...filteredUpdate,
            updatedAt: FieldValue.serverTimestamp(),
            updatedBy: user.uid,
        });

        return NextResponse.json({ success: true, message: "Profile updated successfully" });
    } catch (err) {
        console.error("PROFILE PUT ERROR:", err);
        return NextResponse.json(
            { message: err.message || "Internal server error" },
            { status: 500 }
        );
    }
}
