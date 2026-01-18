import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { verifyUser } from "@/lib/verifyUser";
import { FieldValue, Timestamp } from "firebase-admin/firestore";

export async function POST(req) {
  try {
    const user = await verifyUser(req, "leavecomplaint.create");
    const body = await req.json();
    const { type, branch, session, reason, from, to, days, appId } = body;

    if (!type || !branch || !session || !reason || !from || !days || !appId) {
      return NextResponse.json(
        { message: "Missing required fields" },
        { status: 400 }
      );
    }

    if (!["employee", "student"].includes(type)) {
      return NextResponse.json(
        { message: "Invalid leave type" },
        { status: 400 }
      );
    }

    const now = Timestamp.now();
    const leaveId = adminDb.collection("_").doc().id;
    const leaveEntry = {
      id: leaveId,
      type,
      uid: user.uid,
      appId,
      name: user.name || null,
      reason,
      from,
      to: to || null,
      days,
      status: "pending",
      session,
      requestedAt: now,
      createdBy: user.uid,
      updatedAt: now,
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

    const userLeaveRef = adminDb
      .collection("schools")
      .doc(user.schoolId)
      .collection("branches")
      .doc(branch)
      .collection(type === "employee" ? "employees" : "students")
      .doc(user.uid)
      .collection("leave")
      .doc(session);

    const batch = adminDb.batch();
    batch.set(schoolLeaveRef, leaveEntry);
    batch.set(
      userLeaveRef,
      {
        uid: user.uid,
        appId,
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
