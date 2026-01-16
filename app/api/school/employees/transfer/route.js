import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { verifyUser } from "@/lib/verifyUser";
import { FieldValue } from "firebase-admin/firestore";

export async function PUT(req) {
  try {
    const user = await verifyUser(req, "employee.manage");
    const { branch, employeeId, newBranchId } = await req.json();
    if (!branch || !employeeId || !newBranchId) {
      return NextResponse.json(
        { message: "Invalid payload" },
        { status: 400 }
      );
    }

    await adminDb.runTransaction(async (tx) => {
      const userRef = adminDb.collection("schoolUsers").doc(employeeId);
      const userSnap = await tx.get(userRef);
      if (!userSnap.exists) {
        throw new Error("Employee not found");
      }

      const emp = userSnap.data();
      const oldBranchId = emp.currentBranch;
      if (oldBranchId === newBranchId) {
        throw new Error("Employee already in this branch");
      }

      const schoolRef = adminDb.collection("schools").doc(emp.schoolId);
      const newBranchRef = schoolRef.collection("branches").doc(newBranchId);
      const newBranchSnap = await tx.get(newBranchRef);

      if (!newBranchSnap.exists) {
        throw new Error("Invalid branch");
      }

      const newBranchName = newBranchSnap.data().name;

      const oldEmpRef = schoolRef
        .collection("branches")
        .doc(oldBranchId)
        .collection("employees")
        .doc(employeeId);

      const newEmpRef = schoolRef
        .collection("branches")
        .doc(newBranchId)
        .collection("employees")
        .doc(employeeId);

      const oldMetaRef = schoolRef
        .collection("branches")
        .doc(oldBranchId)
        .collection("meta")
        .doc("employees");

      const newMetaRef = schoolRef
        .collection("branches")
        .doc(newBranchId)
        .collection("meta")
        .doc("employees");

      const oldMetaSnap = await tx.get(oldMetaRef);
      const newMetaSnap = await tx.get(newMetaRef);

      tx.set(
        newEmpRef,
        {
          ...emp,
          currentBranch: newBranchId,
          branchIds: FieldValue.arrayUnion(newBranchId),
          branchNames: FieldValue.arrayUnion(newBranchName),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      tx.update(userRef, {
        currentBranch: newBranchId,
        branchIds: FieldValue.arrayUnion(newBranchId),
        branchNames: FieldValue.arrayUnion(newBranchName),
        updatedAt: FieldValue.serverTimestamp(),
      });

      tx.delete(oldEmpRef);
      if (oldMetaSnap.exists) {
        const data = oldMetaSnap.data();
        const employees = (data.employees || []).filter(
          (e) => e.uid !== employeeId
        );
        tx.update(oldMetaRef, {
          employees,
          count: employees.length,
          updatedAt: FieldValue.serverTimestamp(),
        });
      }

      const metaEntry = {
        uid: emp.uid,
        employeeId: emp.employeeId,
        name: emp.name,
        mobile: emp.mobile,
        roleId: emp.roleId,
        role: emp.role,
        status: emp.status,
      };

      if (!newMetaSnap.exists) {
        tx.set(newMetaRef, {
          employees: [metaEntry],
          count: 1,
          updatedAt: FieldValue.serverTimestamp(),
        });
      } else {
        const employees = newMetaSnap.data().employees || [];
        if (!employees.some((e) => e.uid === employeeId)) {
          employees.push(metaEntry);
        }
        tx.update(newMetaRef, {
          employees,
          count: employees.length,
          updatedAt: FieldValue.serverTimestamp(),
        });
      }
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("EMPLOYEE TRANSFER ERROR:", err);
    return NextResponse.json(
      { message: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
