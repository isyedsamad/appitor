import { NextResponse } from "next/server";
import { adminDb, adminAuth } from "@/lib/firebaseAdmin";
import { verifyUser } from "@/lib/verifyUser";
import { FieldValue } from "firebase-admin/firestore";
import { incrementEmployeeCount } from "@/lib/school/analyticsUtils";

export async function PUT(req) {
  try {
    const user = await verifyUser(req, "employee.manage");
    const { employeeId, status, branch } = await req.json();
    if (!branch || !employeeId || !["active", "disabled", "pending"].includes(status)) {
      return NextResponse.json(
        { message: "Invalid status" },
        { status: 400 }
      );
    }

    const userRef = adminDb.collection("schoolUsers").doc(employeeId);
    const employeeRef = adminDb
      .collection("schools")
      .doc(user.schoolId)
      .collection("branches")
      .doc(branch)
      .collection("employees")
      .doc(employeeId);

    const metaRef = adminDb
      .collection("schools")
      .doc(user.schoolId)
      .collection("branches")
      .doc(branch)
      .collection("meta")
      .doc("employees");

    await adminDb.runTransaction(async (tx) => {
      const metaSnap = await tx.get(metaRef);
      const currentSnap = await tx.get(userRef);
      const currentData = currentSnap.data();
      const oldStatus = currentData.status;

      tx.update(userRef, {
        status,
        updatedAt: FieldValue.serverTimestamp(),
      });

      tx.update(employeeRef, {
        status,
        updatedAt: FieldValue.serverTimestamp(),
      });

      if (metaSnap.exists) {
        const data = metaSnap.data();
        const employees = (data.employees || []).map((e) =>
          e.uid === employeeId ? { ...e, status } : e
        );
        tx.update(metaRef, {
          employees,
          updatedAt: FieldValue.serverTimestamp(),
        });
      }

      // Sync Analytics
      if (oldStatus !== status) {
        if (status === "active" && oldStatus !== "active") {
          await incrementEmployeeCount(tx, adminDb, user.schoolId, branch, 1);
        } else if (oldStatus === "active" && status !== "active") {
          await incrementEmployeeCount(tx, adminDb, user.schoolId, branch, -1);
        }
      }
    });

    await adminAuth.updateUser(employeeId, {
      disabled: status !== "active",
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("EMPLOYEE STATUS ERROR:", err);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
