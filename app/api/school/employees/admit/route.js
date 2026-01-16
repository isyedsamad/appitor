import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import { verifyUser } from "@/lib/verifyUser";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(req) {
  let createdUid = null;
  try {
    const user = await verifyUser(req, "employee.manage");
    const body = await req.json();
    const { name, mobile, email, gender, roleId, role, salary, employeeId, branchIds, branchNames, password } = body;
    if (!name || !mobile || !roleId || !employeeId || !branchIds?.length) {
      return NextResponse.json(
        { message: "Missing required fields" },
        { status: 400 }
      );
    }

    const authEmail = `${employeeId.toLowerCase()}@${user.schoolCode.toLowerCase()}.appitor`;
    const authUser = await adminAuth.createUser({
      email: authEmail,
      password,
      displayName: name,
      disabled: false,
    });

    const uid = authUser.uid;
    createdUid = uid;
    const primaryBranch = branchIds[0];
    const schoolUserRef = adminDb.collection("schoolUsers").doc(uid);

    const employeeRef = adminDb
      .collection("schools")
      .doc(user.schoolId)
      .collection("branches")
      .doc(primaryBranch)
      .collection("employees")
      .doc(uid);

    const branchRef = adminDb.collection("branches").doc(primaryBranch);
    const metaEmployeesRef = adminDb
      .collection("schools")
      .doc(user.schoolId)
      .collection("branches")
      .doc(primaryBranch)
      .collection("meta")
      .doc("employees");

    await adminDb.runTransaction(async (tx) => {
      const metaSnap = await tx.get(metaEmployeesRef);
      const baseEmployeeData = {
        uid,
        employeeId,
        name,
        mobile,
        email: email || null,
        gender: gender || null,
        roleId,
        role,
        salary: salary || null,
        schoolId: user.schoolId,
        branchIds,
        currentBranch: primaryBranch,
        branchNames,
        status: "pending",
        createdBy: user.uid,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      };

      tx.set(schoolUserRef, baseEmployeeData);
      tx.set(employeeRef, {
        ...baseEmployeeData,
        password,
      });

      tx.update(branchRef, {
        employeeCounter: FieldValue.increment(1),
      });
      const metaEntry = {
        uid,
        employeeId,
        name,
        mobile,
        roleId,
        role,
        status: "pending",
      };

      if (!metaSnap.exists) {
        tx.set(metaEmployeesRef, {
          employees: [metaEntry],
          count: 1,
          updatedAt: FieldValue.serverTimestamp(),
        });
      } else {
        const data = metaSnap.data();
        const employees = data.employees || [];
        if (!employees.some((e) => e.uid === uid)) {
          employees.push(metaEntry);
        }
        tx.update(metaEmployeesRef, {
          employees,
          count: employees.length,
          updatedAt: FieldValue.serverTimestamp(),
        });
      }
    });

    return NextResponse.json({
      success: true,
      message: "Employee admitted successfully",
    });
  } catch (err) {
    console.error("ADMIT EMPLOYEE ERROR:", err);
    if (createdUid) {
      try {
        await adminAuth.deleteUser(createdUid);
      } catch (rollbackErr) {
        console.error("FAILED TO ROLLBACK AUTH USER:", rollbackErr);
      }
    }
    return NextResponse.json(
      { message: "Failed: " + err.message },
      { status: 500 }
    );
  }
}
