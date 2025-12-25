import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import { verifyUser } from "@/lib/verifyUser";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(req) {
  try {
    const user = await verifyUser(req, "employee.manage");
    const body = await req.json();
    const {name, mobile, email, gender, roleId, role, salary, employeeId, branchIds, branchNames, password} = body;
    if (!name || !mobile || !roleId || !employeeId || !branchIds) {
      return NextResponse.json(
        { message: "Missing required fields" },
        { status: 400 }
      );
    }
    const schoolCode = user.schoolCode;
    const authEmail = `${employeeId.toLowerCase()}@${schoolCode.toLowerCase()}.appitor`;
    const authUser = await adminAuth.createUser({
      email: authEmail,
      password: password,
      displayName: name,
      disabled: false,
    });
    const branchRef = adminDb
      .collection("branches")
      .doc(branchIds[0]);
    // const branchSnap = await branchRef.get();
    // if (!branchSnap.exists) {
    //   return NextResponse.json(
    //     { message: "Invalid branch" },
    //     { status: 400 }
    //   );
    // }
    await adminDb
      .collection("schoolUsers")
      .doc(authUser.uid)
      .set({
        uid: authUser.uid,
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
        currentBranch: branchIds[0],
        branchNames,
        status: "pending",
        createdBy: user.uid,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    await adminDb
      .collection("schools").doc(user.schoolId)
      .collection('branches').doc(branchIds[0])
      .collection('employees')
      .doc(authUser.uid)
      .set({
        uid: authUser.uid,
        employeeId,
        name,
        password,
        mobile,
        email: email || null,
        gender: gender || null,
        roleId,
        role,
        salary: salary || null,
        schoolId: user.schoolId,
        branchIds,
        currentBranch: branchIds[0],
        branchNames,
        status: "pending",
        createdBy: user.uid,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    await branchRef.update({
      employeeCounter: FieldValue.increment(1),
    });
    return NextResponse.json({
      success: true,
      message: "Employee admitted successfully",
    });
  } catch (err) {
    console.error("ADMIT EMPLOYEE ERROR:", err);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
