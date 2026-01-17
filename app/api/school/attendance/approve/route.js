import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { verifyUser } from "@/lib/verifyUser";
import { FieldValue } from "firebase-admin/firestore";

function getStatusDelta(from, to) {
  const delta = {};
  if (from) delta[`total${from}`] = FieldValue.increment(-1);
  if (to) delta[`total${to}`] = FieldValue.increment(1);
  return delta;
}

export async function POST(req) {
  try {
    const user = await verifyUser(req, "attendance.modify");
    const { requestId, branch } = await req.json();
    const pendingRef = adminDb
      .collection("schools")
      .doc(user.schoolId)
      .collection("branches")
      .doc(branch)
      .collection("attendance_pending")
      .doc(requestId);

    const pendingSnap = await pendingRef.get();
    if (!pendingSnap.exists) {
      return NextResponse.json({ message: "Request not found" }, { status: 404 });
    }
    const pending = pendingSnap.data();
    if (pending.status !== "pending") {
      return NextResponse.json({ message: "Already processed" }, { status: 400 });
    }

    const batch = adminDb.batch();
    const dayDocId =
      pending.type === "student"
        ? `student_${pending.date}_${pending.className}_${pending.section}`
        : `employee_${pending.date}`;

    const dayRef = adminDb
      .collection("schools")
      .doc(user.schoolId)
      .collection("branches")
      .doc(branch)
      .collection("attendance")
      .doc(dayDocId);

    if (pending.mode === "full") {
      batch.set(
        dayRef,
        {
          type: pending.type,
          date: pending.date,
          session: pending.session,
          className: pending.className || null,
          section: pending.section || null,
          records: pending.records,
          updatedAt: FieldValue.serverTimestamp(),
          updatedBy: user.uid,
        },
        { merge: true }
      );
    }

    if (pending.mode === "diff") {
      Object.entries(pending.changes).forEach(([uid, c]) => {
        batch.update(dayRef, {
          [`records.${uid}`]: c.to,
        });
      });
      batch.update(dayRef, {
        updatedAt: FieldValue.serverTimestamp(),
        updatedBy: user.uid,
      });
    }

    const [dd, mm, yyyy] = pending.date.split("-");
    const monthKey = `${yyyy}-${mm}`;
    const dayNumber = Number(dd);

    const baseCollection =
      pending.type === "student" ? "students" : "employees";

    const validStatuses =
      pending.type === "student"
        ? ["P", "A", "L", "M"]
        : ["P", "A", "L", "H", "O"];

    const applyRecord = (uid, from, to) => {
      const baseRef = adminDb
        .collection("schools")
        .doc(user.schoolId)
        .collection("branches")
        .doc(branch)
        .collection(baseCollection)
        .doc(uid);

      const monthRef = baseRef
        .collection("attendance_month")
        .doc(monthKey);

      batch.set(
        monthRef,
        {
          month: monthKey,
          session: pending.session,
          className: pending.className || null,
          section: pending.section || null,
          days: { [dayNumber]: to },
          ...getStatusDelta(from, to),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      const sessionRef = baseRef
        .collection("attendance_session")
        .doc(pending.session);

      batch.set(
        sessionRef,
        {
          session: pending.session,
          months: {
            [monthKey]: {
              ...(from && { [from]: FieldValue.increment(-1) }),
              ...(to && { [to]: FieldValue.increment(1) }),
            },
          },
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    };
    if (pending.mode === "full") {
      Object.entries(pending.records).forEach(([uid, status]) => {
        if (validStatuses.includes(status)) {
          applyRecord(uid, null, status);
        }
      });
    }
    if (pending.mode === "diff") {
      Object.entries(pending.changes).forEach(([uid, c]) => {
        applyRecord(uid, c.from, c.to);
      });
    }
    batch.update(pendingRef, {
      status: "approved",
      reviewedBy: {
        uid: user.uid,
        name: user.name,
        role: user.role,
      },
      reviewedAt: FieldValue.serverTimestamp(),
    });

    await batch.commit();

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("APPROVE ATTENDANCE ERROR:", err);
    return NextResponse.json(
      { message: "Approval failed" },
      { status: 500 }
    );
  }
}
