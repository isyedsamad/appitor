import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { verifyUser } from "@/lib/verifyUser";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(req) {
  try {
    const user = await verifyUser(req, "attendance.modify");
    const data = await req.json();
    const {type, date, session, className, section, branch, records, reason} = data;
    const attendanceDocId =
      type === "student"
        ? `student_${date}_${className}_${section}`
        : `employee_${date}`;
    const attendanceRef = adminDb
      .collection("schools")
      .doc(user.schoolId)
      .collection("branches")
      .doc(branch)
      .collection("attendance")
      .doc(attendanceDocId);
    const attSnap = await attendanceRef.get();
    let payload = {
      type,
      date,
      session,
      className: className || null,
      section: section || null,
      branch,
      reason,
      status: "pending",
      requestedBy: {
        uid: user.uid,
        name: user.name,
        role: user.role,
      },
      createdAt: FieldValue.serverTimestamp(),
    };
    if (!attSnap.exists) {
      payload = {
        ...payload,
        mode: "full",
        records,
      };
    }
    else {
      const actualRecords = attSnap.data().records || {};
      const changes = {};
      // Object.entries(records).forEach(([uid, newStatus]) => {
      //   const oldStatus = actualRecords[uid];
      //   if (oldStatus !== newStatus) {
      //     changes[uid] = {
      //       from: oldStatus,
      //       to: newStatus,
      //     };
      //   }
      // });
      if(type == 'student') {
        await Promise.all(
          Object.entries(records).map(async ([uid, newStatus]) => {
            const oldStatus = actualRecords[uid];
            if (oldStatus !== newStatus) {
              const studentRef = adminDb.collection('schoolUsers').doc(uid);
              const studentSnap = await studentRef.get();
              const studentData = studentSnap.data();
              changes[uid] = {
                name: studentData.name,
                appId: studentData.appId,
                from: oldStatus ? oldStatus : null,
                to: newStatus,
              };
            }
          })
        );
      } else {
        await Promise.all(
          Object.entries(records).map(async ([uid, newStatus]) => {
            const oldStatus = actualRecords[uid];
            if (oldStatus !== newStatus) {
              const employeeRef = adminDb.collection('schoolUsers').doc(uid);
              const employeeSnap = await employeeRef.get();
              const employeeData = employeeSnap.data();
              changes[uid] = {
                name: employeeData.name,
                employeeId: employeeData.employeeId,
                from: oldStatus ? oldStatus : null,
                to: newStatus,
              };
            }
          })
        );
      }
      if (Object.keys(changes).length === 0) {
        return NextResponse.json(
          { message: "No changes detected" },
          { status: 400 }
        );
      }
      payload = {
        ...payload,
        mode: "diff",
        changes,
      };
    }
    await adminDb
      .collection("schools")
      .doc(user.schoolId)
      .collection("branches")
      .doc(branch)
      .collection("attendance_pending")
      .add(payload);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("PENDING ATTENDANCE ERROR:", err);
    return NextResponse.json(
      { message: "Pending submission failed" },
      { status: 500 }
    );
  }
}
