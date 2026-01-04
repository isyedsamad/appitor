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
        { message: "You are not allowed to declare results" },
        { status: 403 }
      );
    }
    const body = await req.json();
    const { branch, termId } = body;
    if (!branch || !termId) {
      return NextResponse.json(
        { message: "branch and termId are required" },
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
    await adminDb.runTransaction(async (tx) => {
      const termSnap = await tx.get(termRef);
      if (!termSnap.exists) {
        throw new Error("Exam term not found");
      }
      const termData = termSnap.data();
      if (termData.resultDeclared === true) {
        throw new Error("Result already declared");
      }
      tx.update(termRef, {
        resultDeclared: true,
        resultDeclaredAt: FieldValue.serverTimestamp(),
        resultDeclaredBy: user.uid
      });
    });
    return NextResponse.json(
      { message: "Result declared successfully" },
      { status: 200 }
    );
  } catch (err) {
    console.error("DECLARE RESULT ERROR:", err);
    return NextResponse.json(
      { message: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
