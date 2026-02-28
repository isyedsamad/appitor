import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import { verifyUser } from "@/lib/verifyUser";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(req) {
  let createdUid = null;
  try {
    const user = await verifyUser(req, "admission.create");
    const { name, gender, mobile, dob, className, section, branch, branchNames, currentSession, autoRoll, templateId, templateName, admissionId } = await req.json();

    if (!name || !dob || !className || !section || !branch || !currentSession || !admissionId) {
      return NextResponse.json(
        { message: "Missing required fields" },
        { status: 400 }
      );
    }

    const branchRef = adminDb.collection("branches").doc(branch);
    const schoolRef = adminDb.collection("schools").doc(user.schoolId);
    const rosterRef = adminDb
      .collection("schools")
      .doc(user.schoolId)
      .collection("branches")
      .doc(branch)
      .collection("meta")
      .doc(`${className}_${section}_${currentSession}`);

    let appId = "";
    let nextRoll = null;
    let generatedPassword = "";

    await adminDb.runTransaction(async (tx) => {
      // 1. ALL READS FIRST
      const branchSnap = await tx.get(branchRef);
      const schoolSnap = await tx.get(schoolRef);
      const rosterSnap = await tx.get(rosterRef);

      if (!branchSnap.exists || !schoolSnap.exists) {
        throw new Error("Branch or School not found");
      }

      const branchData = branchSnap.data();
      const schoolData = schoolSnap.data();

      // Pattern: [AppitorCode][AdmissionId]
      appId = `${branchData.appitorCode.toUpperCase()}${admissionId.toUpperCase()}`;

      // Password: DDMMYYYY from DD-MM-YYYY
      const dobSplit = dob.split("-");
      generatedPassword = `${dobSplit[0]}${dobSplit[1]}${dobSplit[2]}`;

      if (autoRoll) {
        if (rosterSnap.exists) {
          const rosterData = rosterSnap.data();
          const students = rosterData.students || [];
          const rolls = students.map(s => s.rollNo || 0);
          nextRoll = Math.max(0, ...rolls) + 1;
        } else {
          nextRoll = 1;
        }
      }

      // 2. EXTERNAL SERVICES (Auth)
      const uid = (await adminAuth.createUser({
        email: `${appId.toLowerCase()}@${schoolData.code.toLowerCase()}.appitor`,
        password: generatedPassword,
        displayName: name,
        disabled: false,
      })).uid;

      createdUid = uid;

      // 3. ALL WRITES AFTER ALL READS
      const studentData = {
        uid,
        admissionId,
        appId,
        name,
        mobile: mobile || null,
        gender,
        dob,
        className,
        section,
        email: `${appId.toLowerCase()}@${schoolData.code.toLowerCase()}.appitor`,
        schoolId: user.schoolId,
        schoolCode: schoolData.code,
        branchId: branch,
        branchIds: [branch],
        currentBranch: branch,
        branchNames,
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

      const schoolUserRef = adminDb.collection("schoolUsers").doc(uid);
      const studentRef = adminDb
        .collection("schools")
        .doc(user.schoolId)
        .collection("branches")
        .doc(branch)
        .collection("students")
        .doc(uid);

      tx.set(schoolUserRef, {
        ...studentData,
        role: "student",
        roleId: "student",
      });
      tx.set(studentRef, studentData);

      const studentEntry = {
        uid,
        name,
        appId,
        rollNo: nextRoll,
        status: "active",
        dob,
        gender,
      };

      if (!rosterSnap.exists) {
        tx.set(rosterRef, {
          classId: className,
          sectionId: section,
          students: [studentEntry],
          count: 1,
          updatedAt: FieldValue.serverTimestamp(),
        });
      } else {
        const data = rosterSnap.data();
        const students = data.students || [];
        students.push(studentEntry);
        tx.update(rosterRef, {
          students,
          count: students.length,
          updatedAt: FieldValue.serverTimestamp(),
        });
      }

      // Fee Assignment
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

        tx.set(assignmentRef, {
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
    });

    return NextResponse.json({
      success: true,
      appId,
      password: generatedPassword,
    });
  } catch (err) {
    console.error("NEW ADMISSION ERROR:", err);
    if (createdUid) {
      try {
        await adminAuth.deleteUser(createdUid);
      } catch (cleanupErr) {
        console.error("AUTH ROLLBACK FAILED:", cleanupErr);
      }
    }
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
