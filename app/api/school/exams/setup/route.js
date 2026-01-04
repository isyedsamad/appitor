import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { verifyUser } from "@/lib/verifyUser";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(req) {
  try {
    const user = await verifyUser(req, "exam.create");
    const isAdmin =
      user.permissions?.includes("*") ||
      user.permissions?.includes("exam.create");
    if (!isAdmin) {
      return NextResponse.json(
        { message: "You are not allowed to create exam setup" },
        { status: 403 }
      );
    }
    const body = await req.json();
    const { branch, session, termId, classId, sectionId, subjectId, examDate } = body;
    if (!branch || !session || !termId || !classId || !sectionId || !subjectId || !examDate) {
      return NextResponse.json(
        { message: "All fields are required" },
        { status: 400 }
      );
    }
    const setupRef = adminDb
      .collection("schools")
      .doc(user.schoolId)
      .collection("branches")
      .doc(branch)
      .collection("exams")
      .doc("items")
      .collection("exam_setups");
    const dupSnap = await setupRef
      .where("session", "==", session)
      .where("termId", "==", termId)
      .where("classId", "==", classId)
      .where("sectionId", "==", sectionId)
      .where("subjectId", "==", subjectId)
      .limit(1)
      .get();

    if (!dupSnap.empty) {
      return NextResponse.json(
        { message: "Exam setup already exists for this class & subject" },
        { status: 409 }
      );
    }
    const batch = adminDb.batch();
    const docRef = setupRef.doc();
    batch.set(docRef, {
      session,
      termId,
      classId,
      sectionId,
      subjectId,
      examDate,
      createdAt: FieldValue.serverTimestamp(),
      createdBy: user.uid
    });

    await batch.commit();
    return NextResponse.json(
      { message: "Exam setup saved successfully" },
      { status: 201 }
    );
  } catch (err) {
    console.error("EXAM SETUP SAVE ERROR:", err);
    return NextResponse.json(
      { message: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
