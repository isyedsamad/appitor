import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import { verifyUser } from "@/lib/verifyUser";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { incrementEmployeeCount } from "@/lib/school/analyticsUtils";

export async function POST(req) {
  const createdUids = [];
  try {
    const user = await verifyUser(req, "employee.admit.manage");
    const body = await req.json();
    const { employees, branch, branchName } = body;
    if (!branch || !employees || !Array.isArray(employees) || employees.length === 0) {
      return NextResponse.json({ message: "Invalid request data" }, { status: 400 });
    }

    const schoolRef = adminDb.collection("schools").doc(user.schoolId);
    const branchRef = adminDb.collection("branches").doc(branch);
    const schoolSnap = await schoolRef.get();
    const branchSnap = await branchRef.get();
    if (!schoolSnap.exists || !branchSnap.exists) {
      throw new Error("School or Branch not found");
    }

    const schoolData = schoolSnap.data();
    const branchData = branchSnap.data();
    const schoolCode = schoolData.code;
    const branchCode = branchData.appitorCode;
    let currentCounter = branchData.employeeCounter || 0;
    const processedEmployees = [];
    const now = Timestamp.now();

    for (const emp of employees) {
      const { name, mobile, salary, roleId, role } = emp;
      if (!name || !mobile || !roleId || !salary) {
        throw new Error(`Missing details for employee: ${name || 'Unknown'}`);
      }

      currentCounter++;
      const employeeId = `${schoolCode}-${branchCode}E${1000 + currentCounter}`;
      const cleanName = name.replace(/\s+/g, '').toLowerCase().slice(0, 4);
      const last4Mobile = mobile.toString().slice(-4);
      const generatedPassword = `${cleanName}@${last4Mobile}`;
      const authEmail = `${employeeId.toLowerCase()}@${schoolCode.toLowerCase()}.appitor`;
      const authUser = await adminAuth.createUser({
        email: authEmail,
        password: generatedPassword,
        displayName: name,
        disabled: false,
      });

      const uid = authUser.uid;
      createdUids.push(uid);
      processedEmployees.push({
        uid,
        employeeId,
        password: generatedPassword,
        name,
        mobile,
        salary,
        roleId,
        role,
        authEmail
      });
    }

    await adminDb.runTransaction(async (tx) => {
      const bSnap = await tx.get(branchRef);
      const latestCounter = bSnap.data().employeeCounter || 0;
      if (latestCounter !== (currentCounter - employees.length)) {
        throw new Error("Collision detected: Employee counter was updated by someone else. Please try again.");
      }

      const metaEmployeesRef = adminDb
        .collection("schools")
        .doc(user.schoolId)
        .collection("branches")
        .doc(branch)
        .collection("meta")
        .doc("employees");

      const metaSnap = await tx.get(metaEmployeesRef);
      const existingMetaEmployees = metaSnap.exists ? metaSnap.data().employees || [] : [];
      const newMetaEntries = [];
      for (const emp of processedEmployees) {
        const schoolUserRef = adminDb.collection("schoolUsers").doc(emp.uid);
        const employeeRef = adminDb
          .collection("schools")
          .doc(user.schoolId)
          .collection("branches")
          .doc(branch)
          .collection("employees")
          .doc(emp.uid);

        const baseData = {
          uid: emp.uid,
          employeeId: emp.employeeId,
          name: emp.name,
          mobile: emp.mobile,
          roleId: emp.roleId,
          role: emp.role,
          salary: emp.salary,
          schoolId: user.schoolId,
          schoolCode: schoolCode,
          branchIds: [branch],
          currentBranch: branch,
          branchNames: [branchName],
          status: "active",
          createdBy: user.uid,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
          email: emp.authEmail
        };

        tx.set(schoolUserRef, baseData);
        tx.set(employeeRef, { ...baseData, password: emp.password });
        newMetaEntries.push({
          uid: emp.uid,
          employeeId: emp.employeeId,
          name: emp.name,
          mobile: emp.mobile,
          roleId: emp.roleId,
          role: emp.role,
          status: "active",
        });
      }

      tx.update(branchRef, { employeeCounter: currentCounter });
      const finalizedMeta = [...existingMetaEmployees, ...newMetaEntries];
      tx.set(metaEmployeesRef, {
        employees: finalizedMeta,
        count: finalizedMeta.length,
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });

      await incrementEmployeeCount(tx, adminDb, user.schoolId, branch, employees.length);
    });

    return NextResponse.json({
      success: true,
      count: processedEmployees.length,
      employees: processedEmployees.map(e => ({
        name: e.name,
        employeeId: e.employeeId,
        password: e.password
      }))
    });

  } catch (err) {
    console.error("BULK IMPORT ERROR:", err);
    for (const uid of createdUids) {
      try {
        await adminAuth.deleteUser(uid);
      } catch (rollbackErr) {
        console.error("Rollback Auth failed for:", uid, rollbackErr);
      }
    }
    return NextResponse.json({ message: "Import failed: " + err.message }, { status: 500 });
  }
}
