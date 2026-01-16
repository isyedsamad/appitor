import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { verifyUser } from "@/lib/verifyUser";
import { FieldValue } from "firebase-admin/firestore";

export async function PUT(req) {
  try {
    const user = await verifyUser(req, "employee.manage");
    const { employeeId, updates, branch } = await req.json();
    if (!employeeId || !updates || !branch) {
      return NextResponse.json(
        { message: "Invalid payload" },
        { status: 400 }
      );
    }

    const userRef = adminDb.collection("schoolUsers").doc(employeeId);
    const empRef = adminDb
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

    const metaSnap = await metaRef.get();
    const updateData = {
      ...updates,
      updatedAt: FieldValue.serverTimestamp(),
    };

    const batch = adminDb.batch();
    batch.update(userRef, updateData);
    batch.update(empRef, updateData);
    if (metaSnap.exists) {
      const data = metaSnap.data();
      const employees = (data.employees || []).map((e) => {
        if (e.uid !== employeeId) return e;
        return {
          ...e,
          ...(updates.name && { name: updates.name }),
          ...(updates.mobile && { mobile: updates.mobile }),
          ...(updates.role && { role: updates.role }),
          ...(updates.roleId && { roleId: updates.roleId }),
        };
      });
      batch.update(metaRef, {
        employees,
        updatedAt: FieldValue.serverTimestamp(),
      });
    }

    await batch.commit();

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("EMPLOYEE UPDATE ERROR:", err);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
