import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { verifyUser } from "@/lib/verifyUser";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(req) {
  try {
    const user = await verifyUser(req, "attendance.mark");
    const {type, date, session, className, section, branch, records} = await req.json();
    if(!type || !date || !session) {
      return NextResponse.json(
        { message: "Invalid Payload" },
        { status: 400 }
      );
    }
    const docId =
      type === "student"
        ? `student_${date}_${className}_${section}`
        : `employee_${date}`;
    const ref = adminDb
      .collection("schools")
      .doc(user.schoolId)
      .collection("branches")
      .doc(branch)
      .collection("attendance")
      .doc(docId);
    await ref.set(
      {
        type,
        date,
        session,
        className: className || null,
        section: section || null,
        records,
        locked: true,
        updatedAt: FieldValue.serverTimestamp(),
        updatedBy: user.uid,
      },
      { merge: true }
    );
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("ATTENDANCE SAVE ERROR:", err);
    return NextResponse.json(
      { message: "Failed to save attendance" },
      { status: 500 }
    );
  }
}
