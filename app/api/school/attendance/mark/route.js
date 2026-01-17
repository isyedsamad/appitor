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
      return NextResponse.json({ message: "Invalid payload" }, { status: 400 });
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

    const [dd, mm, yyyy] = date.split("-");
    const monthKey = `${yyyy}-${mm}`;
    const dayNumber = Number(dd);

    const batch = adminDb.batch();
    batch.set(
      dayRef,
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

    for (const [uid, status] of Object.entries(records)) {
      const baseRef = adminDb
        .collection("schools")
        .doc(user.schoolId)
        .collection("branches")
        .doc(branch)
        .collection(type === "student" ? "students" : "employees")
        .doc(uid);

      const monthRef = baseRef
        .collection("attendance_month")
        .doc(monthKey);

      const monthIncMap = {
        P: "totalP",
        A: "totalA",
        L: "totalL",
        M: "totalM",
        H: "totalH",
        O: "totalO",
      };

      const incField = monthIncMap[status];
      batch.set(
        monthRef,
        {
          month: monthKey,
          session,
          className: className || null,
          section: section || null,
          days: {
            [dayNumber]: status,
          },
          ...(incField && {
            [incField]: FieldValue.increment(1),
          }),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
      const sessionRef = baseRef
        .collection("attendance_session")
        .doc(session);
      batch.set(
        sessionRef,
        {
          session,
          months: {
            [monthKey]: {
              [status]: FieldValue.increment(1),
            },
          },
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    }

    await batch.commit();
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("ATTENDANCE SAVE ERROR:", err);
    return NextResponse.json(
      { message: "Failed to save attendance" },
      { status: 500 }
    );
  }
}
