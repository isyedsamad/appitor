import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { verifyUser } from "@/lib/verifyUser";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(req) {
  try {
    const user = await verifyUser(req, "admission.enquiry.manage");
    const { branch, sessionId, studentName, parentName, mobile, classInterested, source, notes } = await req.json();

    if (!branch || !sessionId || !studentName || !mobile || !classInterested) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
    }

    const enquiryRef = adminDb
      .collection("schools").doc(user.schoolId)
      .collection("branches").doc(branch)
      .collection("admissions").doc("items")
      .collection("enquiries").doc();

    const summaryRef = adminDb
      .collection("schools").doc(user.schoolId)
      .collection("branches").doc(branch)
      .collection("admissions").doc("items")
      .collection("enquirySummary").doc(sessionId);

    await adminDb.runTransaction(async (tx) => {
      const snap = await tx.get(summaryRef);
      const data = snap.exists ? snap.data() : {};
      tx.set(enquiryRef, {
        studentName,
        parentName: parentName || "",
        mobile,
        classInterested,
        source: source || "",
        notes: notes || "",
        sessionId,
        status: "NEW",
        followUps: [],
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        createdBy: user.uid,
      });
      tx.set(summaryRef, {
        total: (data.total || 0) + 1,
        NEW: (data.NEW || 0) + 1,
        FOLLOW_UP: data.FOLLOW_UP || 0,
        CONVERTED: data.CONVERTED || 0,
        CLOSED: data.CLOSED || 0,
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("CREATE ENQUIRY ERROR:", err);
    return NextResponse.json({ message: "Failed to create enquiry" }, { status: 500 });
  }
}
