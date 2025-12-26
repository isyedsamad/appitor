import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { verifyUser } from "@/lib/verifyUser";
import { FieldValue } from "firebase-admin/firestore";
import { buildNextClassMap } from "@/lib/school/students/academic";
export async function PUT(req) {
  try {
    const user = await verifyUser(req, "student.manage");
    const schoolRef = adminDb.collection("schools").doc(user.schoolId);
    const schoolSnap = await schoolRef.get();
    const fromSession = schoolSnap.data().currentSession;
    // const { searchParams } = new URL(req.url);
    const {toSession} = await req.json();
    if (!toSession) {
      return NextResponse.json(
        { message: "Target session required" },
        { status: 400 }
      );
    }
    if (!fromSession || !toSession) {
      return NextResponse.json(
        { message: "Session not configured" },
        { status: 400 }
      );
    }
    const studentsSnap = await adminDb
      .collection("schoolUsers")
      .where("role", "==", "student")
      .where("schoolId", "==", user.schoolId)
      .where("currentSession", "==", fromSession)
      .get();
    const batch = adminDb.batch();
    const classesSnap = await adminDb
      .collection("schools")
      .doc(user.schoolId)
      .collection('branches')
      .doc(user.currentBranch)
      .collection("classes")
      .get();
    const classData = classesSnap.docs.map(d => d.data());
    const nextClassMap = buildNextClassMap(classData);
    studentsSnap.forEach(doc => {
      const s = doc.data();
      const uid = doc.id;
      const branchRef = adminDb
        .collection("schools")
        .doc(s.schoolId)
        .collection("branches")
        .doc(s.branchId)
        .collection("students")
        .doc(uid);
      const userRef = adminDb
        .collection('schoolUsers')
        .doc(uid)
      const nextClass = nextClassMap[s.className];
      if (!nextClass) {
        const history = {
          session: fromSession,
          className: s.className,
          section: s.section,
          action: "passed-out",
          at: Date.now(),
        };
        batch.update(userRef, {
          status: "passed_out",
          academicHistory: FieldValue.arrayUnion(history),
          updatedAt: FieldValue.serverTimestamp(),
        });
        batch.update(branchRef, {
          status: "passed_out",
          academicHistory: FieldValue.arrayUnion(history),
          updatedAt: FieldValue.serverTimestamp(),
        });
        return;
      }
      const history = {
        session: fromSession,
        className: s.className,
        section: s.section,
        action: "promoted",
        at: Date.now(),
      };
      const updates = {
        className: nextClass,
        currentSession: toSession,
        academicHistory: FieldValue.arrayUnion(history),
        updatedAt: FieldValue.serverTimestamp(),
      };
      batch.update(doc.ref, updates);
      batch.update(branchRef, updates);
    });
    await batch.commit();
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { message: "Promotion failed" },
      { status: 500 }
    );
  }
}
