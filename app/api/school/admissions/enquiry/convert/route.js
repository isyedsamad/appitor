import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { verifyUser } from "@/lib/verifyUser";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(req) {
  try {
    const user = await verifyUser(req, "admission.enquiry.manage");
    const { branch, enquiryId } = await req.json();

    if (!branch || !enquiryId) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
    }

    const enquiryRef = adminDb
      .collection("schools").doc(user.schoolId)
      .collection("branches").doc(branch)
      .collection("admissions").doc("items")
      .collection("enquiries").doc(enquiryId);

    await adminDb.runTransaction(async (tx) => {
      const snap = await tx.get(enquiryRef);
      if (!snap.exists) throw new Error("Enquiry not found");

      const { sessionId, status } = snap.data();

      tx.update(enquiryRef, {
        status: "CONVERTED",
        updatedAt: FieldValue.serverTimestamp(),
        convertedBy: user.uid,
      });

      const summaryRef = adminDb
        .collection("schools").doc(user.schoolId)
        .collection("branches").doc(branch)
        .collection("admissions").doc("items")
        .collection("enquirySummary").doc(sessionId);

      tx.set(summaryRef, {
        [status]: FieldValue.increment(-1),
        CONVERTED: FieldValue.increment(1),
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("CONVERT ERROR:", err);
    return NextResponse.json({ message: "Failed to convert enquiry" }, { status: 500 });
  }
}
