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
    const pendingSnap = await pendingRef.get();
    if (!pendingSnap.exists) {
      return NextResponse.json(
        { message: "Pending request not found" },
        { status: 404 }
      );
    }
    const pending = pendingSnap.data();
    if (pending.status !== "pending") {
      return NextResponse.json(
        { message: "Request already processed" },
        { status: 400 }
      );
    }
    const attendanceDocId =
      pending.type === "student"
        ? `student_${pending.date}_${pending.className}_${pending.section}`
        : `employee_${pending.date}`;
    const attendanceRef = adminDb
      .collection("schools")
      .doc(user.schoolId)
      .collection("branches")
      .doc(pending.branch)
      .collection("attendance")
      .doc(attendanceDocId);
    const batch = adminDb.batch();
    if (pending.mode === "full") {
      batch.set(attendanceRef, {
        type: pending.type,
        date: pending.date,
        session: pending.session,
        className: pending.className || null,
        section: pending.section || null,
        records: pending.records,
        updatedAt: FieldValue.serverTimestamp(),
        updatedBy: user.uid,
      });
    }
    if (pending.mode === "diff") {
      Object.entries(pending.changes).forEach(([uid, c]) => {
        batch.update(attendanceRef, {
          [`records.${uid}`]: c.to,
        });
      });
      batch.update(attendanceRef, {
        updatedAt: FieldValue.serverTimestamp(),
        updatedBy: user.uid,
      });
    }
    batch.update(pendingRef, {
      status: "approved",
      reviewedBy: {
        uid: user.uid,
        name: user.name,
        role: user.role,
      },
      reviewedAt: FieldValue.serverTimestamp(),
    });
    await batch.commit();
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("APPROVE ATTENDANCE ERROR:", err);
    return NextResponse.json(
      { message: "Approval failed" },
      { status: 500 }
    );
  }
}
