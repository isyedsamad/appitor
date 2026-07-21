import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import { verifyUser } from "@/lib/verifyUser";
import { FieldValue } from "firebase-admin/firestore";
import { incrementStudentCount } from "@/lib/school/analyticsUtils";

function parseDobAndPassword(dobStr) {
  if (!dobStr) return { dob: "", password: "" };
  const cleanStr = String(dobStr).trim().replace(/\//g, "-");
  const parts = cleanStr.split("-");
  if (parts.length === 3) {
    let day, month, year;
    if (parts[0].length === 4) {
      year = parts[0];
      month = parts[1].padStart(2, "0");
      day = parts[2].padStart(2, "0");
    } else {
      day = parts[0].padStart(2, "0");
      month = parts[1].padStart(2, "0");
      year = parts[2];
    }
    const normalizedDob = `${day}-${month}-${year}`;
    const password = `${day}${month}${year}`;
    return { dob: normalizedDob, password };
  }
  return { dob: cleanStr, password: cleanStr.replace(/\D/g, "") };
}

export async function POST(req) {
  let createdUid = null;
  try {
    const body = await req.json();
    const { name, gender, mobile, dob, className, section, branch, branchNames, currentSession, autoRoll, templateId, templateName, admissionId, transport, transportFee } = body;

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
    const { dob: normalizedDob, password: generatedPassword } = parseDobAndPassword(dob);
    const email = `${appId.toLowerCase()}@${schoolData.code.toLowerCase()}.appitor`;

    const authUser = await adminAuth.createUser({
      email,
      password: generatedPassword,
      displayName: name,
      disabled: false,
    });

    createdUid = authUser.uid;

    const headsSnap = await adminDb
      .collection("schools")
      .doc(user.schoolId)
      .collection("branches")
      .doc(branch)
      .collection("fees")
      .doc("heads")
      .collection("items")
      .where("category", "==", "transport")
      .where("status", "==", "active")
      .get();

    const transportHead = headsSnap.docs[0];
    const transportHeadId = transportHead ? transportHead.id : null;

    await adminDb.runTransaction(async (tx) => {
      const metaRef = adminDb
        .collection("schools")
        .doc(user.schoolId)
        .collection("branches")
        .doc(branch)
        .collection("fees")
        .doc("metadata")
        .collection("selectiveAssignments")
        .doc(currentSession);

      const [rosterSnap, metaSnap] = await Promise.all([
        tx.get(rosterRef),
        tx.get(metaRef),
      ]);

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
        dob: normalizedDob,
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
        transport: transport || "no",
        transportFee: Number(transportFee) || 0,
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
        dob: normalizedDob,
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

      let selections = {};
      if (metaSnap.exists) {
        selections = metaSnap.data().selections || {};
      }
      if (transportHeadId) {
        if (!selections[className]) {
          selections[className] = {};
        }
        if (!selections[className][transportHeadId]) {
          selections[className][transportHeadId] = [];
        }
        if (transport === "yes") {
          if (!selections[className][transportHeadId].includes(createdUid)) {
            selections[className][transportHeadId].push(createdUid);
          }
        } else {
          selections[className][transportHeadId] = selections[className][transportHeadId].filter(id => id !== createdUid);
        }
      }

      tx.set(metaRef, { selections, updatedAt: FieldValue.serverTimestamp() }, { merge: true });

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
