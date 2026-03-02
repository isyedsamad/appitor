import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { verifyUser } from "@/lib/verifyUser";
import { FieldValue, Timestamp } from "firebase-admin/firestore";

export async function POST(req) {
  try {
    const user = await verifyUser(req, "admission.enquiry.manage");
    const { branch, enquiryId, remark, nextFollowUpDate } = await req.json();
    if (!branch || !enquiryId || !remark || !nextFollowUpDate) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
    }

    const now = Timestamp.now();
    const enquiryRef = adminDb
      .collection("schools").doc(user.schoolId)
      .collection("branches").doc(branch)
      .collection("admissions").doc("items")
      .collection("enquiries").doc(enquiryId);

    await adminDb.runTransaction(async (tx) => {
      const snap = await tx.get(enquiryRef);
      if (!snap.exists) throw new Error("Enquiry not found");
      const data = snap.data();
      const prevStatus = data.status;
      const sessionId = data.sessionId;
      tx.update(enquiryRef, {
        followUps: [
          ...(data.followUps || []),
          {
            remark,
            nextFollowUpDate,
            createdAt: now,
            createdBy: user.uid,
          },
        ],
        status: "FOLLOW_UP",
        updatedAt: now,
      });

      if (prevStatus !== "FOLLOW_UP") {
        const summaryRef = adminDb
          .collection("schools").doc(user.schoolId)
          .collection("branches").doc(branch)
          .collection("admissions").doc("items")
          .collection("enquirySummary").doc(sessionId);

        tx.set(summaryRef, {
          [prevStatus]: FieldValue.increment(-1),
          FOLLOW_UP: FieldValue.increment(1),
          updatedAt: now,
        }, { merge: true });
      }
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("FOLLOWUP ERROR:", err);
    return NextResponse.json({ message: err.message || "Failed" }, { status: 500 });
  }
}
