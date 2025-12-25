import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import { verifyUser } from "@/lib/verifyUser";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(req) {
  try {
    const user = await verifyUser(req, "admission.create");
    const {admissionId, name, gender, dob, className, section, branch} = await req.json();
    if (!admissionId || !name || !dob || !className || !section || !branch) {
      return NextResponse.json(
        { message: "Missing required fields" },
        { status: 400 }
      );
    }
    const email = `${admissionId}@${user.schoolCode.toLowerCase()}.appitor`;
    const [year, month, day] = dob.split("-");
    const password = `${day}${month}${year}`;
    const authUser = await adminAuth.createUser({
      email,
      password,
      displayName: name,
      disabled: false,
    });
    const uid = authUser.uid;
    const studentData = {
      uid,
      admissionId,
      studentId: admissionId,
      name,
      gender,
      dob,
      className,
      section,
      email,
      schoolId: user.schoolId,
      branchId: branch,
      status: "active",
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      createdBy: user.uid,
    };
    await adminDb
      .collection("schoolUsers")
      .doc(uid)
      .set({
        ...studentData,
        role: "student",
        roleId: "student",
      });
    await adminDb
      .collection("schools")
      .doc(user.schoolId)
      .collection("branches")
      .doc(branch)
      .collection("students")
      .doc(uid)
      .set(studentData);
    return NextResponse.json({
      success: true,
      uid,
      email,
    });
  } catch (err) {
    console.error("NEW ADMISSION ERROR:", err);
    if (err.code === "auth/email-already-exists") {
      return NextResponse.json(
        { message: "Admission ID already exists" },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
