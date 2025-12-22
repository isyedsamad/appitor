import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";
import { verifyUser } from "@/lib/verifyUser";

export async function POST(req) {
  try {
    const user = await verifyUser(req, "academic.manage");
    const body = await req.json();
    const { branch, subjectId, name } = body;
    if (!name) {
      return NextResponse.json(
        { message: "Subject name is required" },
        { status: 400 }
      );
    }
    const subjectsRef = adminDb
      .collection("schools")
      .doc(user.schoolId)
      .collection("branches")
      .doc(branch)
      .collection("subjects")
      .doc("branch_subjects");
    const subjectsSnap = await subjectsRef.get();
    if (!subjectsSnap.exists) {
      await subjectsRef.set({
        subjects: [{
          id: crypto.randomUUID(),
          name,
          isActive: true,
        }]
      })
      return NextResponse.json({ success: true });
    }
    const subjectData = subjectsSnap.data();
    let subjects = subjectData.subjects || [];
    if (!subjectId) {
      subjects.push({
        id: crypto.randomUUID(),
        name,
        isActive: true,
      });
    }
    else {
      subjects = subjects.map(sub =>
        sub.id === subjectId
          ? { ...sub, name }
          : sub
      );
    }
    await subjectsRef.update({
      subjects
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("CLASS API ERROR:", err);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function DELETE(req) {
  try {
    const user = await verifyUser(req, "academic.manage");
    const { searchParams } = new URL(req.url);
    const subjectId = searchParams.get("subjectId");
    const branch = searchParams.get("branch");
    if (!subjectId || !branch) {
      return NextResponse.json(
        { message: "subject and branch selection is required" },
        { status: 400 }
      );
    }
    const subjectsRef = adminDb
      .collection("schools")
      .doc(user.schoolId)
      .collection("branches")
      .doc(branch)
      .collection("subjects")
      .doc("branch_subjects");
    const snap = await subjectsRef.get();
    if (!snap.exists) {
      return NextResponse.json(
        { message: "Subject not found" },
        { status: 404 }
      );
    }
    const subjects = (snap.data().subjects || []).filter(
      sub => sub.id !== subjectId
    );
    await subjectsRef.update({
      subjects,
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE SUBJECT ERROR:", err);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}
