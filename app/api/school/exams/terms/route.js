import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { verifyUser } from "@/lib/verifyUser";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(req) {
  try {
    const user = await verifyUser(req, "exam.create");
    const body = await req.json();
    const { branch, session, name, startDate, endDate } = body;
    if (!branch || !session || !name || !startDate || !endDate) {
      return NextResponse.json(
        { message: "All fields are required" },
        { status: 400 }
      );
    }
    if (new Date(endDate) < new Date(startDate)) {
      return NextResponse.json(
        { message: "End date cannot be before start date" },
        { status: 400 }
      );
    }
    const termsRef = adminDb
      .collection("schools")
      .doc(user.schoolId)
      .collection("branches")
      .doc(branch)
      .collection("exams")
      .doc("items")
      .collection("exam_terms");
    const dupSnap = await termsRef
      .where("session", "==", session)
      .where("name", "==", name)
      .limit(1)
      .get();
    if (!dupSnap.empty) {
      return NextResponse.json(
        { message: "Exam term already exists for this session" },
        { status: 409 }
      );
    }
    const batch = adminDb.batch();
    const termRef = termsRef.doc();
    batch.set(termRef, {
      name,
      session,
      startDate,
      endDate,
      resultDeclared: false,
      createdAt: FieldValue.serverTimestamp(),
      createdBy: user.uid
    });
    await batch.commit();
    return NextResponse.json(
      { message: "Exam term created successfully" },
      { status: 201 }
    );
  } catch (err) {
    console.error("EXAM TERM CREATE ERROR:", err);
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
    const termId = searchParams.get("id");
    const branch = searchParams.get("branch");
    if (!termId || !branch) {
      return NextResponse.json(
        { message: "Missing termId or branch" },
        { status: 400 }
      );
    }
    const termRef = adminDb
      .collection("schools")
      .doc(user.schoolId)
      .collection("branches")
      .doc(branch)
      .collection("exams")
      .doc("items")
      .collection("exam_terms")
      .doc(termId);
    const termSnap = await termRef.get();
    if (!termSnap.exists) {
      return NextResponse.json(
        { message: "Exam term not found" },
        { status: 404 }
      );
    }
    const termData = termSnap.data();
    if (termData.resultDeclared) {
      return NextResponse.json(
        { message: "Cannot delete term after result declaration" },
        { status: 403 }
      );
    }
    const batch = adminDb.batch();
    batch.delete(termRef);
    await batch.commit();
    return NextResponse.json(
      { message: "Exam term deleted successfully" },
      { status: 200 }
    );
  } catch (err) {
    console.error("EXAM TERM DELETE ERROR:", err);
    return NextResponse.json(
      { message: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
