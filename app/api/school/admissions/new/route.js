import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import { verifyUser } from "@/lib/verifyUser";
import { FieldValue } from "firebase-admin/firestore";
import { incrementStudentCount } from "@/lib/school/analyticsUtils";

export async function POST(req) {
  let createdUid = null;
  try {
    const body = await req.json();
    const { name, gender, mobile, dob, className, section, branch, branchNames, currentSession, autoRoll, templateId, templateName, admissionId } = body;

    if (!name || !dob || !className || !section || !branch || !currentSession || !admissionId) {
      return NextResponse.json(
        { message: "Missing required fields" },
        { status: 400 }
      );
    }

    const user = await verifyUser(req, "admission.new.manage", false, branch);

    const branchRef = adminDb.collection("branches").doc(branch);
    const schoolRef = adminDb.collection("schools").doc(user.schoolId);
    const rosterRef = adminDb
      .collection("schools")
      .doc(user.schoolId)
      .collection("branches")
      .doc(branch)
      .collection("meta")
      .doc(`${className}_${section}_${currentSession}`);

    const branchSnap = await branchRef.get();
    const schoolSnap = await schoolRef.get();

    if (!branchSnap.exists || !schoolSnap.exists) {
      return NextResponse.json(
        { message: "Branch or School not found" },
        { status: 404 }
      );
    }

    const branchData = branchSnap.data();
    const schoolData = schoolSnap.data();
    const appId = `${branchData.appitorCode.toUpperCase()}${admissionId.toUpperCase()}`;
    const dobSplit = dob.split("-");
    const generatedPassword = `${dobSplit[0]}${dobSplit[1]}${dobSplit[2]}`;
    const email = `${appId.toLowerCase()}@${schoolData.code.toLowerCase()}.appitor`;

    const authUser = await adminAuth.createUser({
      email,
      password: generatedPassword,
      displayName: name,
      disabled: false,
    });

    createdUid = authUser.uid;

    await adminDb.runTransaction(async (tx) => {
      const rosterSnap = await tx.get(rosterRef);

      let nextRoll = null;
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

      const studentData = {
        uid: createdUid,
        admissionId,
        appId,
        name,
        mobile: mobile || null,
        gender,
        dob,
        className,
        section,
        email,
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

      const schoolUserRef = adminDb.collection("schoolUsers").doc(createdUid);
      const studentRef = adminDb
        .collection("schools")
        .doc(user.schoolId)
        .collection("branches")
        .doc(branch)
        .collection("students")
        .doc(createdUid);

      tx.set(schoolUserRef, {
        ...studentData,
        role: "student",
        roleId: "student",
      });
      tx.set(studentRef, studentData);

      const studentEntry = {
        uid: createdUid,
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
          studentId: createdUid,
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

      await incrementStudentCount(tx, adminDb, user.schoolId, branch, 1, gender);
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
