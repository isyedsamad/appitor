import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { verifyUser } from "@/lib/verifyUser";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(req) {
  try {
    const user = await verifyUser(req, "attendance.modify");
    const { requestId, branch } = await req.json();
    if (!requestId || !branch) {
      return NextResponse.json(
        { message: "Request ID required" },
        { status: 400 }
      );
    }
    const pendingRef = adminDb
      .collection("schools")
      .doc(user.schoolId)
      .collection("branches")
      .doc(branch)
      .collection("attendance_pending")
      .doc(requestId);
    const snap = await pendingRef.get();
    if (!snap.exists) {
      return NextResponse.json(
        { message: "Pending request not found" },
        { status: 404 }
      );
    }
    if (snap.data().status !== "pending") {
      return NextResponse.json(
        { message: "Request already processed" },
        { status: 400 }
      );
    }
    await pendingRef.update({
      status: "rejected",
      reviewedBy: {
        uid: user.uid,
        name: user.name,
        role: user.role,
      },
      reviewedAt: FieldValue.serverTimestamp(),
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("REJECT ATTENDANCE ERROR:", err);
    return NextResponse.json(
      { message: "Rejection failed" },
      { status: 500 }
    );
  }
}
