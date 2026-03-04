import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { verifyUser } from "@/lib/verifyUser";
import { FieldValue } from "firebase-admin/firestore";
import { updateAttendanceAnalytics } from "@/lib/school/analyticsUtils";

export async function POST(req) {
  try {
    const user = await verifyUser(req, "attendance.mark.manage");
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

    await adminDb.runTransaction(async (tx) => {
      // 1. Get existing attendance to calculate diff
      const existingSnap = await tx.get(dayRef);
      const oldRecords = existingSnap.exists ? existingSnap.data().records || {} : {};

      // 2. Update Daily Doc
      tx.set(
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

      // 3. Update Monthly/Session Logs & Local Counters
      for (const [uid, status] of Object.entries(records)) {
        const baseRef = adminDb
          .collection("schools")
          .doc(user.schoolId)
          .collection("branches")
          .doc(branch)
          .collection(type === "student" ? "students" : "employees")
          .doc(uid);

        const monthRef = baseRef.collection("attendance_month").doc(monthKey);
        const sessionRef = baseRef.collection("attendance_session").doc(session);

        const monthIncMap = { P: "totalP", A: "totalA", L: "totalL", M: "totalM", H: "totalH", O: "totalO" };
        const oldStatus = oldRecords[uid];

        if (oldStatus === status) continue; // No change, skip updates

        const incField = monthIncMap[status];
        const decField = oldStatus ? monthIncMap[oldStatus] : null;

        // Monthly breakdown update
        const monthUpdate = {
          month: monthKey,
          session,
          className: className || null,
          section: section || null,
          days: { [dayNumber]: status },
          updatedAt: FieldValue.serverTimestamp(),
        };
        if (incField) monthUpdate[incField] = FieldValue.increment(1);
        if (decField) monthUpdate[decField] = FieldValue.increment(-1);

        tx.set(monthRef, monthUpdate, { merge: true });

        // Session breakdown update
        const sessionUpdate = {
          session,
          months: {
            [monthKey]: {
              ...(status && { [status]: FieldValue.increment(1) }),
              ...(oldStatus && { [oldStatus]: FieldValue.increment(-1) })
            }
          },
          updatedAt: FieldValue.serverTimestamp(),
        };

        tx.set(sessionRef, sessionUpdate, { merge: true });
      }

      // 4. Update Global Analytics
      await updateAttendanceAnalytics(tx, adminDb, user.schoolId, branch, type, date, oldRecords, records);
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("ATTENDANCE SAVE ERROR:", err);
    return NextResponse.json(
      { message: "Failed to save attendance" },
      { status: 500 }
    );
  }
}
