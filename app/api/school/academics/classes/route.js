import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";
import { verifyUser } from "@/lib/verifyUser";

export async function POST(req) {
  try {
    const user = await verifyUser(req, "academic.manage");
    const body = await req.json();
    const { branch, classId, name, order } = body;
    if (!name) {
      return NextResponse.json(
        { message: "Class name is required" },
        { status: 400 }
      );
    }
    
    const classesRef = adminDb
      .collection("schools")
      .doc(user.schoolId)
      .collection("branches")
      .doc(branch)
      .collection("classes");

    if (!classId) {
      await classesRef.add({
        name,
        order: order || 0,
        sections: [],
        isActive: true,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
    else {
      await classesRef.doc(classId).update({
        name,
        order: order || 0,
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
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
    const user = await verifyUser(req, "academics.manage");
    const { searchParams } = new URL(req.url);
    const classId = searchParams.get("classId");

    if (!classId) {
      return NextResponse.json(
        { message: "classId required" },
        { status: 400 }
      );
    }
    await adminDb
      .collection("schools")
      .doc(user.schoolId)
      .collection("branches")
      .doc(user.branchId)
      .collection("classes")
      .doc(classId)
      .delete();
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE CLASS ERROR:", err);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}
