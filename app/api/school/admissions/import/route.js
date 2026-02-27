import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import { verifyUser } from "@/lib/verifyUser";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(req) {
  const createdUids = [];
  try {
    const user = await verifyUser(req, "admission.create");
    const body = await req.json();
    const { branch, sessionId, classId, sectionId, students, branchCode } = body;
    if (!branchCode || !branch || !sessionId || !classId || !sectionId || !Array.isArray(students)) {
      return NextResponse.json({ message: "Invalid payload" }, { status: 400 });
    }

    if (students.length === 0) {
      return NextResponse.json({ message: "No students provided" }, { status: 400 });
    }

    const admissionSet = new Set();
    for (const s of students) {
      if (!s.admissionId || !s.name || !s.dob) {
        return NextResponse.json(
          { message: "admissionId, name and dob are required for all students" },
          { status: 400 }
        );
      }

      if (s.dob.includes("/")) {
        return NextResponse.json(
          { message: `Invalid DOB format for ${s.admissionId}` },
          { status: 400 }
        );
      }

      if (admissionSet.has(s.admissionId)) {
        return NextResponse.json(
          { message: `Duplicate admissionId in file: ${s.admissionId}` },
          { status: 400 }
        );
      }

      admissionSet.add(s.admissionId);
    }

    const lastRollSnap = await adminDb
      .collection("schools")
      .doc(user.schoolId)
      .collection("branches")
      .doc(branch)
      .collection("students")
      .where("className", "==", classId)
      .where("section", "==", sectionId)
      .where("currentSession", "==", sessionId)
      .orderBy("rollNo", "desc")
      .limit(1)
      .get();

    let nextRoll = lastRollSnap.empty
      ? 1
      : (lastRollSnap.docs[0].data().rollNo || 0) + 1;

    const preparedStudents = [];
    for (const s of students) {
      const appId = branchCode.toUpperCase() + s.admissionId;
      const email = `${appId}@${user.schoolCode.toLowerCase()}.appitor`;
      const [y, m, d] = s.dob.split("-");
      const password = `${y}${m}${d}`;
      const authUser = await adminAuth.createUser({
        email,
        password,
        displayName: s.name,
      });

      createdUids.push(authUser.uid);
      preparedStudents.push({
        uid: authUser.uid,
        email,
        appId,
        rollNo: nextRoll++,
        ...s,
      });
    }

    await adminDb.runTransaction(async (tx) => {
      const rosterRef = adminDb
        .collection("schools")
        .doc(user.schoolId)
        .collection("branches")
        .doc(branch)
        .collection("meta")
        .doc(`${classId}_${sectionId}`);

      const rosterSnap = await tx.get(rosterRef);
      let rosterStudents = [];
      if (rosterSnap.exists) {
        rosterStudents = rosterSnap.data().students || [];
      }

      for (const s of preparedStudents) {
        const studentData = {
          uid: s.uid,
          admissionId: s.admissionId,
          appId: s.appId,
          name: s.name,
          dob: s.dob,
          email: s.email,
          className: classId,
          section: sectionId,
          rollNo: s.rollNo,
          rollAssignedAt: FieldValue.serverTimestamp(),
          rollAssignedBy: user.uid,
          schoolId: user.schoolId,
          branchId: branch,
          branchIds: [branch],
          currentBranch: branch,
          status: "active",
          currentSession: sessionId,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
          createdBy: user.uid,
          academicHistory: [
            {
              session: sessionId,
              className: classId,
              section: sectionId,
              action: "admitted",
            },
          ],
        };

        const schoolUserRef = adminDb.collection("schoolUsers").doc(s.uid);
        const studentRef = adminDb
          .collection("schools")
          .doc(user.schoolId)
          .collection("branches")
          .doc(branch)
          .collection("students")
          .doc(s.uid);

        tx.set(schoolUserRef, {
          ...studentData,
          role: "student",
          roleId: "student",
        });

        tx.set(studentRef, studentData);
        rosterStudents.push({
          uid: s.uid,
          name: s.name,
          appId: s.appId,
          rollNo: s.rollNo,
          status: "active",
          dob: s.dob,
          gender: s.gender || "",
        });
      }

      if (!rosterSnap.exists) {
        tx.set(rosterRef, {
          classId,
          sectionId,
          students: rosterStudents,
          count: rosterStudents.length,
          updatedAt: FieldValue.serverTimestamp(),
        });
      } else {
        tx.update(rosterRef, {
          students: rosterStudents,
          count: rosterStudents.length,
          updatedAt: FieldValue.serverTimestamp(),
        });
      }
    });

    return NextResponse.json({
      success: true,
      count: preparedStudents.length,
    });
  } catch (err) {
    console.error("BULK IMPORT ERROR:", err);
    for (const uid of createdUids) {
      try {
        await adminAuth.deleteUser(uid);
      } catch { }
    }
    if (err.code === "auth/email-already-exists") {
      return NextResponse.json(
        { message: "Admission ID already exists" },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { message: "Failed to import students" },
      { status: 500 }
    );
  }
}
