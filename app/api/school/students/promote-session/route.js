import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { verifyUser } from "@/lib/verifyUser";
import { FieldValue } from "firebase-admin/firestore";
import { randomUUID } from "crypto";

export async function POST(req) {
  try {
    const user = await verifyUser(req, "student.promote.manage");
    const body = await req.json();
    const { fromSession, toSession, sectionMappings } = body;

    if (!fromSession || !toSession || !Array.isArray(sectionMappings)) {
      return NextResponse.json(
        { message: "Invalid payload: fromSession, toSession, and sectionMappings are required." },
        { status: 400 }
      );
    }

    const schoolRef = adminDb.collection("schools").doc(user.schoolId);
    const branchRef = schoolRef.collection("branches").doc(user.currentBranch);

    let processedCount = 0;
    const errors = [];

    for (const mapping of sectionMappings) {
      const { fromClassId, fromSectionId, toClassId, toSectionId, toSectionName } = mapping;

      if (!fromClassId || !fromSectionId || !toClassId || (toClassId !== "passed_out" && !toSectionId && !toSectionName)) {
        errors.push(`Invalid mapping definition: ${JSON.stringify(mapping)}`);
        continue;
      }

      try {
        await adminDb.runTransaction(async (tx) => {
          const srcRosterId = `${fromClassId}_${fromSectionId}_${fromSession}`;
          const srcRosterRef = branchRef.collection("meta").doc(srcRosterId);
          const srcRosterSnap = await tx.get(srcRosterRef);

          if (!srcRosterSnap.exists) {
            return;
          }

          const srcRosterData = srcRosterSnap.data();
          const studentsToPromote = srcRosterData.students || [];

          if (studentsToPromote.length === 0) {
            return;
          }

          const isPassedOut = toClassId === "passed_out";
          let resolvedSectionId = toSectionId;

          if (!isPassedOut && !resolvedSectionId && toSectionName) {
            const classesRef = branchRef.collection("classes").doc("data");
            const classesSnap = await tx.get(classesRef);
            if (!classesSnap.exists) {
              throw new Error("Class configuration document not found.");
            }
            const classData = classesSnap.data().classData || [];
            const classIndex = classData.findIndex(c => c.id === toClassId);
            if (classIndex === -1) {
              throw new Error(`Target class ${toClassId} not found.`);
            }
            const sections = classData[classIndex].sections || [];
            const match = sections.find(s => s.name.trim().toLowerCase() === toSectionName.trim().toLowerCase());
            if (match) {
              resolvedSectionId = match.id;
            } else {
              const newId = randomUUID();
              sections.push({
                id: newId,
                name: toSectionName.toUpperCase(),
                capacity: 40,
                isActive: true
              });
              classData[classIndex] = {
                ...classData[classIndex],
                sections
              };
              tx.set(classesRef, { classData, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
              resolvedSectionId = newId;
            }
          }

          let targetRosterRef = null;
          let targetRosterSnap = null;
          let targetStudents = [];

          if (!isPassedOut) {
            const tgtRosterId = `${toClassId}_${resolvedSectionId}_${toSession}`;
            targetRosterRef = branchRef.collection("meta").doc(tgtRosterId);
            targetRosterSnap = await tx.get(targetRosterRef);
            if (targetRosterSnap.exists) {
              targetStudents = targetRosterSnap.data().students || [];
            }
          }

          const updatesToProcess = [];

          for (const s of studentsToPromote) {
            const userRef = adminDb.collection("schoolUsers").doc(s.uid);
            const branchStudentRef = branchRef.collection("students").doc(s.uid);
            const studentSnap = await tx.get(userRef);

            if (!studentSnap.exists) continue;
            const studentData = studentSnap.data();

            const historyEntry = {
              session: fromSession,
              className: fromClassId,
              section: fromSectionId,
              at: Date.now(),
              action: isPassedOut ? "passed_out" : (toClassId === fromClassId ? "section-change" : "promoted"),
            };

            const updates = {
              className: toClassId,
              section: resolvedSectionId,
              currentSession: toSession,
              status: isPassedOut ? "passed_out" : studentData.status,
              rollNo: null,
              academicHistory: FieldValue.arrayUnion(historyEntry),
              updatedAt: FieldValue.serverTimestamp(),
            };

            updatesToProcess.push({ userRef, branchStudentRef, updates });

            if (!isPassedOut && !targetStudents.some(ts => ts.uid === s.uid)) {
              targetStudents.push({
                uid: s.uid,
                name: studentData.name,
                appId: studentData.appId,
                rollNo: null,
                status: studentData.status,
                dob: studentData.dob || "",
                gender: studentData.gender || "",
              });
            }
          }

          for (const { userRef, branchStudentRef, updates } of updatesToProcess) {
            tx.update(userRef, updates);
            tx.update(branchStudentRef, updates);
          }

          tx.update(srcRosterRef, {
            students: [],
            count: 0,
            updatedAt: FieldValue.serverTimestamp()
          });

          if (targetRosterRef) {
            const targetPayload = {
              classId: toClassId,
              sectionId: resolvedSectionId,
              sessionId: toSession,
              students: targetStudents,
              count: targetStudents.length,
              updatedAt: FieldValue.serverTimestamp()
            };

            if (!targetRosterSnap || !targetRosterSnap.exists) {
              tx.set(targetRosterRef, targetPayload);
            } else {
              tx.update(targetRosterRef, targetPayload);
            }
          }

          processedCount += studentsToPromote.length;
        });
      } catch (err) {
        console.error(`Transaction failed for mapping from class ${fromClassId} section ${fromSectionId}:`, err);
        errors.push(`Failed to promote from class ${fromClassId} section ${fromSectionId}: ${err.message}`);
      }
    }

    if (errors.length > 0 && processedCount === 0) {
      return NextResponse.json(
        { message: "Rollover failed entirely.", errors },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      processedCount,
      errors: errors.length > 0 ? errors : null
    });
  } catch (err) {
    console.error("SESSION ROLLOVER EXECUTE ERROR:", err);
    return NextResponse.json(
      { message: err.message || "Failed to execute session rollover" },
      { status: 500 }
    );
  }
}
