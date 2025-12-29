import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import { verifyUser } from "@/lib/verifyUser";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(req) {
  try {
    const user = await verifyUser(req, "admission.create");
    const {admissionId, name, gender, dob, className, section, branch, currentSession, branchCode, autoRoll, templateId, templateName} = await req.json();
    if (!admissionId || !name || !dob || !className || !section || !branch || !currentSession || !branchCode) {
      return NextResponse.json(
        { message: "Missing required fields" },
        { status: 400 }
      );
    }
    if (dob.includes("/")) {
      return NextResponse.json(
        { message: "Invalid DOB format. Use YYYY-MM-DD" },
        { status: 400 }
      );
    }
    const appId = branchCode.toUpperCase() + admissionId;
    const email = `${appId}@${user.schoolCode.toLowerCase()}.appitor`;
    const split = dob.split("-");
    const password = `${split[0]}${split[1]}${split[2]}`;
    const authUser = await adminAuth.createUser({
      email,
      password,
      displayName: name,
      disabled: false,
    });
    const uid = authUser.uid;
    let nextRoll = null;
    if (autoRoll) {
      const studentsSnap = await adminDb
        .collection("schools")
        .doc(user.schoolId)
        .collection("branches")
        .doc(branch)
        .collection("students")
        .where("className", "==", className)
        .where("section", "==", section)
        .where("currentSession", "==", currentSession)
        .orderBy("rollNo", "desc")
        .limit(1)
        .get();
      if (!studentsSnap.empty) {
        const lastRoll = studentsSnap.docs[0].data().rollNo;
        if (lastRoll) nextRoll = lastRoll + 1;
      } else {
        nextRoll = 1;
      }
    }
    const studentData = {
      uid,
      admissionId,
      appId,
      name,
      gender,
      dob,
      className,
      section,
      email,
      schoolId: user.schoolId,
      branchId: branch,
      status: "active",
      rollNo: nextRoll,
      rollAssignedAt: nextRoll ? FieldValue.serverTimestamp() : null,
      rollAssignedBy: nextRoll ? user.uid : null,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      createdBy: user.uid,
      currentSession,
      academicHistory: [
        {
          session: currentSession,
          className,
          section,
          action: "admitted",
        },
      ],
    };
    const batch = adminDb.batch();
    const schoolUserRef = adminDb.collection("schoolUsers").doc(uid);
    const studentRef = adminDb
      .collection("schools")
      .doc(user.schoolId)
      .collection("branches")
      .doc(branch)
      .collection("students")
      .doc(uid);
    batch.set(schoolUserRef, {
      ...studentData,
      role: "student",
      roleId: "student",
    });
    batch.set(studentRef, studentData);
    if (templateId && templateName) {
      const assignmentRef = adminDb
        .collection("schools")
        .doc(user.schoolId)
        .collection("branches")
        .doc(branch)
        .collection("fees")
        .doc("assignments")
        .collection("items")
        .doc();
      batch.set(assignmentRef, {
        studentId: uid,
        studentName: name,
        className,
        section,
        templateId,
        templateName,
        sessionId: currentSession,
        status: "active",
        assignedAt: FieldValue.serverTimestamp(),
        assignedBy: user.uid,
      });
    }
    await batch.commit();
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