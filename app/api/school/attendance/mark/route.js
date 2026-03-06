import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { verifyUser } from "@/lib/verifyUser";
import { FieldValue } from "firebase-admin/firestore";
import { updateAttendanceAnalytics } from "@/lib/school/analyticsUtils";

export async function POST(req) {
  try {
    const { type, date, session, className, section, branch, records } = await req.json();
    if (!type || !date || !session || !branch || !records) {
      return NextResponse.json({ message: "Invalid payload" }, { status: 400 });
    }

    const requiredPermission = type === "student"
      ? "attendance.mark.student.manage"
      : "attendance.mark.employee.manage";

    const user = await verifyUser(req, requiredPermission);
    const today = new Date();
    const serverTodayStr = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(today);
    const serverToday = serverTodayStr;

    const [dd, mm, yyyy] = date.split("-");
    const clientDate = `${yyyy}-${mm}-${dd}`;

    if (clientDate < serverToday) {
      await verifyUser(req, "attendance.mark.past.manage");
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

    const monthKey = `${yyyy}-${mm}`;
    const dayNumber = Number(dd);

    await adminDb.runTransaction(async (tx) => {
      const existingSnap = await tx.get(dayRef);
      const oldRecords = existingSnap.exists ? existingSnap.data().records || {} : {};

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

        if (oldStatus === status) continue;

        const incField = monthIncMap[status];
        const decField = oldStatus ? monthIncMap[oldStatus] : null;
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
