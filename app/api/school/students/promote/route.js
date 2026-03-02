import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { verifyUser } from "@/lib/verifyUser";
import { FieldValue } from "firebase-admin/firestore";

export async function PUT(req) {
  try {
    const user = await verifyUser(req, "student.promote.manage");
    const { uids, toClass, toSection, toSession: manualToSession } = await req.json();
    const toSession = manualToSession;
    if (!uids?.length || !toClass || !toSection || !toSession) {
      return NextResponse.json({ message: "Invalid payload" }, { status: 400 });
    }

    const schoolRef = adminDb.collection("schools").doc(user.schoolId);
    await adminDb.runTransaction(async (tx) => {
      const firstStudentRef = adminDb.collection("schoolUsers").doc(uids[0]);
      const firstSnap = await tx.get(firstStudentRef);
      if (!firstSnap.exists) throw new Error("Student not found");

      const { branchId } = firstSnap.data();
      const branchRef = schoolRef.collection("branches").doc(branchId);

      const rosterState = new Map();
      const getRoster = async (classId, secId, sessId) => {
        const id = `${classId}_${secId}_${sessId}`;
        if (rosterState.has(id)) return rosterState.get(id);
        const ref = branchRef.collection("meta").doc(id);
        const snap = await tx.get(ref);
        const state = {
          ref,
          exists: snap.exists,
          students: snap.exists ? (snap.data().students || []) : [],
          classId,
          sectionId: secId,
          sessionId: sessId
        };
        rosterState.set(id, state);
        return state;
      };

      const targetRoster = await getRoster(toClass, toSection, toSession);
      const updatesToProcess = [];

      for (const uid of uids) {
        const userRef = adminDb.collection("schoolUsers").doc(uid);
        const branchStudentRef = branchRef.collection("students").doc(uid);
        const studentSnap = await tx.get(userRef);

        if (!studentSnap.exists) continue;
        const s = studentSnap.data();

        const oldRoster = await getRoster(s.className, s.section, s.currentSession);
        oldRoster.students = oldRoster.students.filter(st => st.uid !== uid);

        const isPassedOut = toClass === "passed_out";
        const historyEntry = {
          session: s.currentSession,
          className: s.className,
          section: s.section,
          at: Date.now(),
          action: isPassedOut ? "passed_out" : (toClass === s.className ? "section-change" : "promoted"),
        };

        const updates = {
          className: toClass,
          section: toSection,
          currentSession: toSession,
          status: isPassedOut ? "passed_out" : s.status,
          rollNo: null,
          academicHistory: FieldValue.arrayUnion(historyEntry),
          updatedAt: FieldValue.serverTimestamp(),
        };

        updatesToProcess.push({ userRef, branchStudentRef, updates });

        if (!targetRoster.students.find(st => st.uid === uid)) {
          targetRoster.students.push({
            uid,
            name: s.name,
            appId: s.appId,
            rollNo: null,
            status: isPassedOut ? "passed_out" : s.status,
            dob: s.dob || "",
            gender: s.gender || "",
          });
        }
      }

      // WRITE PHASE: Now perform all writes after all reads are done
      for (const { userRef, branchStudentRef, updates } of updatesToProcess) {
        tx.update(userRef, updates);
        tx.update(branchStudentRef, updates);
      }

      for (const [id, state] of rosterState.entries()) {
        const payload = {
          classId: state.classId,
          sectionId: state.sectionId,
          sessionId: state.sessionId,
          students: state.students,
          count: state.students.length,
          updatedAt: FieldValue.serverTimestamp()
        };
        if (!state.exists) {
          tx.set(state.ref, payload);
        } else {
          tx.update(state.ref, payload);
        }
      }
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("MANUAL PROMOTION ERROR:", err);
    return NextResponse.json({ message: err.message || "Promotion failed" }, { status: 500 });
  }
}
