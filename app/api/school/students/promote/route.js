import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { verifyUser } from "@/lib/verifyUser";
import { FieldValue } from "firebase-admin/firestore";

export async function PUT(req) {
  try {
    const user = await verifyUser(req, "student.manage");
    const { uids, toClass, toSection } = await req.json();
    if (!uids?.length || !toClass || !toSection) {
      return NextResponse.json(
        { message: "Invalid payload" },
        { status: 400 }
      );
    }

    const schoolRef = adminDb.collection("schools").doc(user.schoolId);
    await adminDb.runTransaction(async (tx) => {
      const schoolSnap = await tx.get(schoolRef);
      if (!schoolSnap.exists || !schoolSnap.data().currentSession) {
        throw new Error("Academic session not configured");
      }

      const currentSession = schoolSnap.data().currentSession;
      const studentEntries = [];
      const rosterSnapshots = new Map();

      for (const uid of uids) {
        const userRef = adminDb.collection("schoolUsers").doc(uid);
        const userSnap = await tx.get(userRef);
        if (!userSnap.exists) continue;
        const student = userSnap.data();
        const branchRef = adminDb
          .collection("schools")
          .doc(student.schoolId)
          .collection("branches")
          .doc(student.branchId)
          .collection("students")
          .doc(uid);

        const oldRosterId = `${student.className}_${student.section}`;
        const newRosterId = `${toClass}_${toSection}`;
        const oldRosterRef = adminDb
          .collection("schools")
          .doc(student.schoolId)
          .collection("branches")
          .doc(student.branchId)
          .collection("meta")
          .doc(oldRosterId);

        const newRosterRef = adminDb
          .collection("schools")
          .doc(student.schoolId)
          .collection("branches")
          .doc(student.branchId)
          .collection("meta")
          .doc(newRosterId);

        if (!rosterSnapshots.has(oldRosterId)) {
          rosterSnapshots.set(oldRosterId, {
            ref: oldRosterRef,
            snap: await tx.get(oldRosterRef),
          });
        }
        if (!rosterSnapshots.has(newRosterId)) {
          rosterSnapshots.set(newRosterId, {
            ref: newRosterRef,
            snap: await tx.get(newRosterRef),
          });
        }
        studentEntries.push({
          uid,
          student,
          userRef,
          branchRef,
          oldRosterId,
          newRosterId,
        });
      }

      const rosterState = new Map();
      for (const [id, { ref, snap }] of rosterSnapshots.entries()) {
        rosterState.set(id, {
          ref,
          exists: snap.exists,
          students: snap.exists ? [...(snap.data().students || [])] : [],
        });
      }

      const removals = new Map();
      for (const entry of studentEntries) {
        const {
          uid,
          student,
          userRef,
          branchRef,
          oldRosterId,
          newRosterId,
        } = entry;

        const historyEntry = {
          session: student.currentSession,
          className: student.className,
          section: student.section,
          action:
            toClass === student.className
              ? "section-change"
              : "promoted",
        };

        const updatePayload = {
          academicHistory: FieldValue.arrayUnion(historyEntry),
          className: toClass,
          section: toSection,
          currentSession,
          rollNo: null,
          rollAssignedAt: null,
          rollAssignedBy: null,
          updatedAt: FieldValue.serverTimestamp(),
        };
        tx.update(userRef, updatePayload);
        tx.update(branchRef, updatePayload);
        if (!removals.has(oldRosterId)) {
          removals.set(oldRosterId, new Set());
        }
        removals.get(oldRosterId).add(uid);
        const newState = rosterState.get(newRosterId);
        if (newState && !newState.students.some((s) => s.uid === uid)) {
          newState.students.push({
            uid,
            name: student.name,
            appId: student.appId,
            rollNo: null,
            status: student.status,
          });
        }
      }
      for (const [oldRosterId, uidSet] of removals.entries()) {
        const state = rosterState.get(oldRosterId);
        if (!state) continue;
        state.students = state.students.filter(
          (s) => !uidSet.has(s.uid)
        );
      }
      for (const [_, state] of rosterState.entries()) {
        if (!state.exists && state.students.length) {
          tx.set(state.ref, {
            classId: toClass,
            sectionId: toSection,
            students: state.students,
            count: state.students.length,
            updatedAt: FieldValue.serverTimestamp(),
          });
        } else {
          tx.update(state.ref, {
            students: state.students,
            count: state.students.length,
            updatedAt: FieldValue.serverTimestamp(),
          });
        }
      }
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("PROMOTION ERROR:", err);
    return NextResponse.json(
      { message: err.message || "Promotion failed" },
      { status: 500 }
    );
  }
}
