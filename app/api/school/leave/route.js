import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { verifyUser } from "@/lib/verifyUser";
import { FieldValue, Timestamp } from "firebase-admin/firestore";

export async function POST(req) {
  try {
    const user = await verifyUser(req, "leavecomplaint.create");
    const body = await req.json();
    const { branch, session, reason, from, to, days } = body;
    if (!branch || !session || !reason || !from || !days) {
      return NextResponse.json(
        { message: "Missing required fields" },
        { status: 400 }
      );
    }

    const now = Timestamp.now();
    const leaveId = adminDb.collection("_").doc().id;
    const leaveEntry = {
      id: leaveId,
      employeeId: user.uid,
      employeeName: user.name || null,
      reason,
      from,
      to: to || null,
      days,
      status: "pending",
      session,
      requestedAt: now,
      createdBy: user.uid,
    };

    const schoolLeaveRef = adminDb
      .collection("schools")
      .doc(user.schoolId)
      .collection("branches")
      .doc(branch)
      .collection("leave")
      .doc("items")
      .collection(session)
      .doc(leaveId);

    const employeeLeaveRef = adminDb
      .collection("schools")
      .doc(user.schoolId)
      .collection("branches")
      .doc(branch)
      .collection("employees")
      .doc(user.uid)
      .collection("leave")
      .doc(session);

    const batch = adminDb.batch();
    batch.set(schoolLeaveRef, {
      ...leaveEntry,
      updatedAt: now,
    });
    batch.set(
      employeeLeaveRef,
      {
        employeeId: user.uid,
        session,
        items: FieldValue.arrayUnion({
          id: leaveId,
          reason,
          from,
          to: to || null,
          days,
          status: "pending",
          requestedAt: now,
        }),
        updatedAt: now,
      },
      { merge: true }
    );

    await batch.commit();
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Leave batch save failed:", err);
    return NextResponse.json(
      { message: "Failed to request leave" },
      { status: 500 }
    );
  }
}
