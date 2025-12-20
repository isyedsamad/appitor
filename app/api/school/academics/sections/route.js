import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { verifyUser } from "@/lib/verifyUser";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(req) {
  try {
    const user = await verifyUser(req, "academic.manage");
    const body = await req.json();
    const { branch, classId, sectionId, name, capacity } = body;
    if (!classId || !name) {
      return NextResponse.json(
        { message: "class selection and section name is required!" },
        { status: 400 }
      );
    }
    const classRef = adminDb
      .collection("schools")
      .doc(user.schoolId)
      .collection("branches")
      .doc(branch)
      .collection("classes")
      .doc(classId);
    const classSnap = await classRef.get();
    if (!classSnap.exists) {
      return NextResponse.json(
        { message: "Class not found" },
        { status: 404 }
      );
    }
    const classData = classSnap.data();
    let sections = classData.sections || [];
    if (!sectionId) {
      sections.push({
        id: crypto.randomUUID(),
        name,
        capacity: capacity || 0,
        isActive: true,
      });
    }
    else {
      sections = sections.map(sec =>
        sec.id === sectionId
          ? { ...sec, name, capacity }
          : sec
      );
    }
    await classRef.update({
      sections,
      updatedAt: FieldValue.serverTimestamp(),
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("SECTION API ERROR:", err);
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
    const sectionId = searchParams.get("secId");
    const branch = searchParams.get("branch");
    if (!classId || !sectionId || !branch) {
      return NextResponse.json(
        { message: "class & section is required" },
        { status: 400 }
      );
    }
    const classRef = adminDb
      .collection("schools")
      .doc(user.schoolId)
      .collection("branches")
      .doc(branch)
      .collection("classes")
      .doc(classId);
    const snap = await classRef.get();
    if (!snap.exists) {
      return NextResponse.json(
        { message: "Class not found" },
        { status: 404 }
      );
    }
    const sections = (snap.data().sections || []).filter(
      sec => sec.id !== sectionId
    );
    await classRef.update({
      sections,
      updatedAt: FieldValue.serverTimestamp(),
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE SECTION ERROR:", err);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}
