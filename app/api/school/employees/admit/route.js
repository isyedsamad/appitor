import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import { verifyUser } from "@/lib/verifyUser";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(req) {
  let createdUid = null;
  try {
    const user = await verifyUser(req, "employee.manage");
    const body = await req.json();
    const { name, mobile, email, gender, roleId, role, salary, branchIds, branchNames } = body;
    if (!name || !mobile || !roleId || !branchIds?.length) {
      return NextResponse.json(
        { message: "Missing required fields" },
        { status: 400 }
      );
    }

    const primaryBranch = branchIds[0];
    const branchRef = adminDb.collection("branches").doc(primaryBranch);
    const schoolRef = adminDb.collection("schools").doc(user.schoolId);

    // Pattern: name[first4] + @ + last4[mobile]
    const cleanName = name.replace(/\s+/g, '').toLowerCase().slice(0, 4);
    const last4Mobile = mobile.slice(-4);
    const generatedPassword = `${cleanName}@${last4Mobile}`;

    let employeeId = "";

    await adminDb.runTransaction(async (tx) => {
      const branchSnap = await tx.get(branchRef);
      const schoolSnap = await tx.get(schoolRef);

      if (!branchSnap.exists || !schoolSnap.exists) {
        throw new Error("Branch or School not found");
      }

      const branchData = branchSnap.data();
      const schoolData = schoolSnap.data();
      const nextCounter = (branchData.employeeCounter || 0) + 1;

      employeeId = `${schoolData.code}-${branchData.appitorCode}E${nextCounter}`;

      const authEmail = `${employeeId.toLowerCase()}@${schoolData.code.toLowerCase()}.appitor`;
      const authUser = await adminAuth.createUser({
        email: authEmail,
        password: generatedPassword,
        displayName: name,
        disabled: false,
      });

      const uid = authUser.uid;
      createdUid = uid;

      const schoolUserRef = adminDb.collection("schoolUsers").doc(uid);
      const employeeRef = adminDb
        .collection("schools")
        .doc(user.schoolId)
        .collection("branches")
        .doc(primaryBranch)
        .collection("employees")
        .doc(uid);

      const metaEmployeesRef = adminDb
        .collection("schools")
        .doc(user.schoolId)
        .collection("branches")
        .doc(primaryBranch)
        .collection("meta")
        .doc("employees");

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
        schoolCode: schoolData.code,
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
        password: generatedPassword,
      });

      tx.update(branchRef, {
        employeeCounter: nextCounter,
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
        employees.push(metaEntry);
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
      employeeId,
      password: generatedPassword
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
