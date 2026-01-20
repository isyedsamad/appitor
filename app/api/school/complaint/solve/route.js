import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { verifyUser } from "@/lib/verifyUser";
import { FieldValue, Timestamp } from "firebase-admin/firestore";

export async function POST(req) {
  try {
    const user = await verifyUser(req, "leavecomplaint.manage");
    const body = await req.json();
    const { branch, session, complaintId } = body;
    if (!branch || !session || !complaintId) {
      return NextResponse.json(
        { message: "Missing required fields" },
        { status: 400 }
      );
    }

    const complaintRef = adminDb
      .collection("schools")
      .doc(user.schoolId)
      .collection("branches")
      .doc(branch)
      .collection("complaint")
      .doc("items")
      .collection(session)
      .doc(complaintId);

    const snap = await complaintRef.get();
    if (!snap.exists) {
      return NextResponse.json(
        { message: "Complaint not found" },
        { status: 404 }
      );
    }
    const complaint = snap.data();
    if (complaint.status === "solved") {
      return NextResponse.json(
        { message: "Complaint already solved" },
        { status: 409 }
      );
    }
    const { uid, type } = complaint;
    if (!uid || !type) {
      return NextResponse.json(
        { message: "Invalid complaint data" },
        { status: 400 }
      );
    }

    const userComplaintRef =
      type === "employee"
        ? adminDb
            .collection("schools")
            .doc(user.schoolId)
            .collection("branches")
            .doc(branch)
            .collection("employees")
            .doc(uid)
            .collection("complaint")
            .doc(session)
        : adminDb
            .collection("schools")
            .doc(user.schoolId)
            .collection("branches")
            .doc(branch)
            .collection("students")
            .doc(uid)
            .collection("complaint")
            .doc(session);

    const userSnap = await userComplaintRef.get();
    const userItems = userSnap.exists ? userSnap.data().items || [] : [];
    const updatedItems = userItems.map(i =>
      i.id === complaintId
        ? { ...i, status: "solved", solvedAt: Timestamp.now() }
        : i
    );

    const batch = adminDb.batch();
    const now = Timestamp.now();
    batch.update(complaintRef, {
      status: "solved",
      solvedAt: now,
      solvedBy: user.uid,
      updatedAt: now,
    });

    batch.set(
      userComplaintRef,
      {
        uid,
        session,
        items: updatedItems,
        updatedAt: now,
      },
      { merge: true }
    );

    await batch.commit();
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Complaint solve failed:", err);
    return NextResponse.json(
      { message: "Failed to update complaint status" },
      { status: 500 }
    );
  }
}
