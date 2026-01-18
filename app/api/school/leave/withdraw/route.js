import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { verifyUser } from "@/lib/verifyUser";
import { Timestamp } from "firebase-admin/firestore";

export async function POST(req) {
  try {
    const user = await verifyUser(req, "leavecomplaint.create");
    const body = await req.json();
    const { type, branch, session, leaveId } = body;
    if (!type || !branch || !session || !leaveId) {
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
    
    const schoolSnap = await schoolLeaveRef.get();
    if (!schoolSnap.exists) {
      return NextResponse.json(
        { message: "Leave request not found" },
        { status: 404 }
      );
    }

    const leaveData = schoolSnap.data();
    if (leaveData.uid !== user.uid) {
      return NextResponse.json(
        { message: "Unauthorized leave withdrawal" },
        { status: 403 }
      );
    }

    if (leaveData.status !== "pending") {
      return NextResponse.json(
        { message: "Only pending leaves can be withdrawn" },
        { status: 400 }
      );
    }

    const userSnap = await userLeaveRef.get();
    if (!userSnap.exists) {
      return NextResponse.json(
        { message: "User leave record not found" },
        { status: 404 }
      );
    }

    const userItems = userSnap.data().items || [];
    const updatedItems = userItems.filter(
      (i) => i.id !== leaveId
    );

    const batch = adminDb.batch();
    batch.delete(schoolLeaveRef);
    batch.set(
      userLeaveRef,
      {
        items: updatedItems,
        updatedAt: Timestamp.now(),
      },
      { merge: true }
    );

    await batch.commit();
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Withdraw leave failed:", err);
    return NextResponse.json(
      { message: "Failed to withdraw leave" },
      { status: 500 }
    );
  }
}
