import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { verifyUser } from "@/lib/verifyUser";
import { FieldValue, Timestamp } from "firebase-admin/firestore";

export async function POST(req) {
  try {
    const user = await verifyUser(req, "leavecomplaint.create");
    const body = await req.json();
    const { type, branch, session, title, description, appId } = body;
    if (!type || !branch || !session || !title || !description || !appId) {
      return NextResponse.json(
        { message: "Missing required fields" },
        { status: 400 }
      );
    }
    
    if (!["employee", "student"].includes(type)) {
      return NextResponse.json(
        { message: "Invalid complaint type" },
        { status: 400 }
      );
    }

    const now = Timestamp.now();
    const complaintId = adminDb.collection("_").doc().id;
    const complaintEntry = {
      id: complaintId,
      type,
      uid: user.uid,
      appId,
      name: user.name || null,
      title,
      description,
      status: "pending",
      session,
      createdAt: now,
      updatedAt: now,
      createdBy: user.uid,
    };

    const schoolComplaintRef = adminDb
      .collection("schools")
      .doc(user.schoolId)
      .collection("branches")
      .doc(branch)
      .collection("complaint")
      .doc("items")
      .collection(session)
      .doc(complaintId);

    const userComplaintRef = adminDb
      .collection("schools")
      .doc(user.schoolId)
      .collection("branches")
      .doc(branch)
      .collection(type === "employee" ? "employees" : "students")
      .doc(user.uid)
      .collection("complaint")
      .doc(session);

    const batch = adminDb.batch();
    batch.set(schoolComplaintRef, complaintEntry);
    batch.set(
      userComplaintRef,
      {
        uid: user.uid,
        appId,
        session,
        items: FieldValue.arrayUnion({
          id: complaintId,
          title,
          description,
          status: "pending",
          createdAt: now,
        }),
        updatedAt: now,
      },
      { merge: true }
    );

    await batch.commit();
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Complaint create failed:", err);
    return NextResponse.json(
      { message: "Failed to create complaint" },
      { status: 500 }
    );
  }
}
