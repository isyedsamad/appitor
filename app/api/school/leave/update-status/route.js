import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { verifyUser } from "@/lib/verifyUser";
import { Timestamp } from "firebase-admin/firestore";

export async function POST(req) {
  try {
    const user = await verifyUser(req, "leavecomplaint.manage");
    const body = await req.json();
    const { branch, session, leaveId, status } = body;
    if (!branch || !session || !leaveId || !status) {
      return NextResponse.json(
        { message: "Missing required fields" },
        { status: 400 }
      );
    }

    if (!["approved", "rejected"].includes(status)) {
      return NextResponse.json(
        { message: "Invalid status" },
        { status: 400 }
      );
    }

    const now = Timestamp.now();
    const schoolLeaveRef = adminDb
      .collection("schools")
      .doc(user.schoolId)
      .collection("branches")
      .doc(branch)
      .collection("leave")
      .doc("items")
      .collection(session)
      .doc(leaveId);

    const schoolSnap = await schoolLeaveRef.get();
    if (!schoolSnap.exists) {
      return NextResponse.json(
        { message: "Leave request not found" },
        { status: 404 }
      );
    }

    const leaveData = schoolSnap.data();
    if (leaveData.status !== "pending") {
      return NextResponse.json(
        { message: "Leave already processed" },
        { status: 400 }
      );
    }

    const { uid, type } = leaveData;
    const userLeaveRef = adminDb
      .collection("schools")
      .doc(user.schoolId)
      .collection("branches")
      .doc(branch)
      .collection(type === "employee" ? "employees" : "students")
      .doc(uid)
      .collection("leave")
      .doc(session);

    const userSnap = await userLeaveRef.get();
    if (!userSnap.exists) {
      return NextResponse.json(
        { message: "User leave record not found" },
        { status: 404 }
      );
    }

    const items = userSnap.data().items || [];
    const updatedItems = items.map(item =>
      item.id === leaveId
        ? {
            ...item,
            status,
            updatedAt: now,
          }
        : item
    );

    const batch = adminDb.batch();
    batch.update(schoolLeaveRef, {
      status,
      updatedAt: now,
      updatedBy: user.uid,
    });

    batch.set(
      userLeaveRef,
      {
        items: updatedItems,
        updatedAt: now,
      },
      { merge: true }
    );

    await batch.commit();
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Leave status update failed:", err);
    return NextResponse.json(
      { message: "Failed to update leave status" },
      { status: 500 }
    );
  }
}
