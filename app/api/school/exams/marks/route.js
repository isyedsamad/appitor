import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { verifyUser } from "@/lib/verifyUser";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(req) {
  try {
    const user = await verifyUser(req, "exam.manage");
    const isAllowed =
      user.permissions?.includes("*") ||
      user.permissions?.includes("exam.manage");
    if (!isAllowed) {
      return NextResponse.json(
        { message: "You are not allowed to enter marks" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { branch, session, termId, classId, sectionId, marks } = body;
    if (!branch || !session || !termId || !classId || !sectionId || !marks || typeof marks !== "object") {
      return NextResponse.json(
        { message: "Invalid request data" },
        { status: 400 }
      );
    }

    const studentMap = {};
    Object.entries(marks).forEach(([key, value]) => {
      if (value === "" || value === null || value === undefined) return;
      const [studentId, setupId] = key.split("_");
      if (!studentMap[studentId]) {
        studentMap[studentId] = [];
      }
      studentMap[studentId].push({
        setupId,
        value
      });
    });

    const batch = adminDb.batch();
    const baseRef = adminDb
      .collection("schools")
      .doc(user.schoolId)
      .collection("branches")
      .doc(branch)
      .collection("exams")
      .doc("items")
      .collection("student_marks");
      
    for (const studentId of Object.keys(studentMap)) {
      const docId = `${studentId}_${termId}`;
      const ref = baseRef.doc(docId);
      const snap = await ref.get();
      let updatedMarks = studentMap[studentId];
      if (snap.exists) {
        const existing = snap.data().marks || [];
        const map = {};
        existing.forEach(m => (map[m.setupId] = m));
        updatedMarks.forEach(m => (map[m.setupId] = m));
        updatedMarks = Object.values(map);
      }
      batch.set(
        ref,
        {
          studentId,
          session,
          termId,
          classId,
          sectionId,
          marks: updatedMarks,
          updatedAt: FieldValue.serverTimestamp(),
          updatedBy: user.uid
        },
        { merge: true }
      );
    }

    await batch.commit();
    return NextResponse.json(
      { message: "Marks saved successfully" },
      { status: 200 }
    );
  } catch (err) {
    console.error("MARKS SAVE ERROR:", err);
    return NextResponse.json(
      { message: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
