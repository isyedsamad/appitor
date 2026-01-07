import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { verifyUser } from "@/lib/verifyUser";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(req) {
  try {
    const user = await verifyUser(req, "exam.create");
    const isAdmin = user.permissions?.includes("*") || user.permissions?.includes("exam.create");
    if (!isAdmin) {
      return NextResponse.json(
        { message: "You are not allowed to create exam setup" },
        { status: 403 }
      );
    }
    const body = await req.json();
    const { branch, session, termId, classId, sectionId, rows } = body;
    if (!branch || !session || !termId || !classId || !sectionId || !Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json(
        { message: "Invalid bulk setup payload" },
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
    const batch = adminDb.batch();
    const now = FieldValue.serverTimestamp();
    for (const row of rows) {
      const { subjectId, examDate, markingType, maxMarks } = row;
      if (!subjectId || !examDate || !markingType) continue;
      if (!["grades", "marks"].includes(markingType)) continue;
      if (markingType === "marks" && (!maxMarks || Number(maxMarks) <= 0)) continue;
      const docId = `${session}::${termId}::${classId}::${sectionId}::${subjectId}`;
      const docRef = setupRef.doc(docId);
      batch.set(
        docRef,
        {
          session,
          termId,
          classId,
          sectionId,
          subjectId,
          examDate,
          markingType,
          maxMarks: markingType === "marks" ? Number(maxMarks) : null,
          updatedAt: now,
          updatedBy: user.uid,
          createdAt: FieldValue.serverTimestamp(),
          createdBy: user.uid
        },
        { merge: true }
      );
    }
    await batch.commit();
    return NextResponse.json(
      { message: "Exam setups saved successfully" },
      { status: 200 }
    );
  } catch (err) {
    console.error("EXAM SETUP BULK UPSERT ERROR:", err);
    return NextResponse.json(
      { message: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}


export async function PUT(req) {
  try {
    const user = await verifyUser(req, "exam.create");
    const isAdmin = user.permissions?.includes("*") || user.permissions?.includes("exam.create");
    if (!isAdmin) {
      return NextResponse.json(
        { message: "You are not allowed to update exam setup" },
        { status: 403 }
      );
    }
    const body = await req.json();
    const { id, branch, session, termId, classId, sectionId, subjectId, examDate, markingType, maxMarks } = body;
    if (!id || !branch) {
      return NextResponse.json(
        { message: "Setup id and branch are required" },
        { status: 400 }
      );
    }
    if (markingType === "marks" && (!maxMarks || Number(maxMarks) <= 0)) {
      return NextResponse.json(
        { message: "Invalid max marks" },
        { status: 400 }
      );
    }
    const ref = adminDb
      .collection("schools")
      .doc(user.schoolId)
      .collection("branches")
      .doc(branch)
      .collection("exams")
      .doc("items")
      .collection("exam_setups")
      .doc(id);
    const snap = await ref.get();
    if (!snap.exists) {
      return NextResponse.json(
        { message: "Exam setup not found" },
        { status: 404 }
      );
    }
    await ref.update({
      session,
      termId,
      classId,
      sectionId,
      subjectId,
      examDate,
      markingType,
      maxMarks: markingType === "marks" ? Number(maxMarks) : null,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: user.uid
    });
    return NextResponse.json(
      { message: "Exam setup updated successfully" },
      { status: 200 }
    );
  } catch (err) {
    console.error("EXAM SETUP UPDATE ERROR:", err);
    return NextResponse.json(
      { message: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(req) {
  try {
    const user = await verifyUser(req, "exam.create");
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const branch = searchParams.get("branch");
    if (!id || !branch) {
      return NextResponse.json(
        { message: "Setup id and branch are required" },
        { status: 400 }
      );
    }
    const ref = adminDb
      .collection("schools")
      .doc(user.schoolId)
      .collection("branches")
      .doc(branch)
      .collection("exams")
      .doc("items")
      .collection("exam_setups")
      .doc(id);
    const snap = await ref.get();
    if (!snap.exists) {
      return NextResponse.json(
        { message: "Exam setup not found" },
        { status: 404 }
      );
    }
    await ref.delete();
    return NextResponse.json(
      { message: "Exam setup deleted successfully" },
      { status: 200 }
    );
  } catch (err) {
    console.error("EXAM SETUP DELETE ERROR:", err);
    return NextResponse.json(
      { message: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}