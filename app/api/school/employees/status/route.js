import { NextResponse } from "next/server";
import { adminDb, adminAuth } from "@/lib/firebaseAdmin";
import { verifyUser } from "@/lib/verifyUser";

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
    const branchRef = adminDb
      .collection("schools")
      .doc(user.schoolId)
      .collection("branches")
      .doc(branch)
      .collection("employees")
      .doc(employeeId);
    await Promise.all([
      userRef.update({ status }),
      branchRef.update({ status }),
      adminAuth.updateUser(employeeId, {
        disabled: status !== "active",
      }),
    ]);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("EMPLOYEE STATUS ERROR:", err);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
