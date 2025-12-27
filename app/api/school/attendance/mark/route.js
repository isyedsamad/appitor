import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { verifyUser } from "@/lib/verifyUser";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(req) {
  try {
    const user = await verifyUser(req, "attendance.mark");
    const {
      type,
      date,
      session,
      className,
      section,
      branch,
      records
    } = await req.json();
    if (!type || !date || !session || !branch || !records) {
      return NextResponse.json(
        { message: "Invalid payload" },
        { status: 400 }
      );
    }
    const dayDocId =
      type === "student"
        ? `student_${date}_${className}_${section}`
        : `employee_${date}`;
    const dayRef = adminDb
      .collection("schools")
      .doc(user.schoolId)
      .collection("branches")
      .doc(branch)
      .collection("attendance")
      .doc(dayDocId);
    await dayRef.set(
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
    if (type === "student") {
      const [dd, mm, yyyy] = date.split("-");
      const monthKey = `${yyyy}-${mm}`; // 2025-12
      const dayNumber = Number(dd);
      const batch = adminDb.batch();
      for (const [uid, status] of Object.entries(records)) {
        const monthRef = adminDb
          .collection("schools")
          .doc(user.schoolId)
          .collection("branches")
          .doc(branch)
          .collection("students")
          .doc(uid)
          .collection("attendance_months")
          .doc(monthKey);
        const inc = {
          P: { totalP: 1 },
          A: { totalA: 1 },
          L: { totalL: 1 },
          M: { totalM: 1 },
        }[status] || {};
        batch.set(
          monthRef,
          {
            month: monthKey,
            session,
            className,
            section,
            days: {
              [dayNumber]: status,
            },
            ...Object.fromEntries(
              Object.keys(inc).map(k => [k, FieldValue.increment(1)])
            ),
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
      }
      await batch.commit();
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("ATTENDANCE SAVE ERROR:", err);
    return NextResponse.json(
      { message: "Failed to save attendance" },
      { status: 500 }
    );
  }
}
