import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { verifyUser } from "@/lib/verifyUser";
import { FieldValue } from "firebase-admin/firestore";
import { randomUUID } from "crypto";

export async function POST(req) {
  try {
    const user = await verifyUser(req, "academic.manage");
    const body = await req.json();
    const { branch, classId, sectionId, name, capacity } = body;
    if (!branch || !classId || !name) {
      return NextResponse.json(
        { message: "branch, class and section name are required" },
        { status: 400 }
      );
    }
    const metaRef = adminDb
      .collection("schools")
      .doc(user.schoolId)
      .collection("branches")
      .doc(branch)
      .collection("classes")
      .doc("data");
    await adminDb.runTransaction(async (tx) => {
      const snap = await tx.get(metaRef);
      if (!snap.exists) throw new Error("Class meta not found");
      const data = snap.data();
      const classData = data.classData || [];
      const classIndex = classData.findIndex((c) => c.id === classId);
      if (classIndex === -1) throw new Error("Class not found");
      let sections = classData[classIndex].sections || [];
      if (!sectionId) {
        sections.push({
          id: randomUUID(),
          name,
          capacity: capacity || 0,
          isActive: true,
        });
      } else {
        sections = sections.map((sec) =>
          sec.id === sectionId
            ? { ...sec, name, capacity }
            : sec
        );
      }
      classData[classIndex] = {
        ...classData[classIndex],
        sections,
      };
      tx.set(
        metaRef,
        {
          classData,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("SECTION API ERROR:", err);
    return NextResponse.json(
      { message: err.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}


export async function DELETE(req) {
  try {
    const user = await verifyUser(req, "academic.manage");
    const { searchParams } = new URL(req.url);
    const branch = searchParams.get("branch");
    const classId = searchParams.get("classId");
    const sectionId = searchParams.get("sectionId");
    if (!branch || !classId || !sectionId) {
      return NextResponse.json(
        { message: "branch, classId and sectionId are required" },
        { status: 400 }
      );
    }
    const metaRef = adminDb
      .collection("schools")
      .doc(user.schoolId)
      .collection("branches")
      .doc(branch)
      .collection("classes")
      .doc("data");
    await adminDb.runTransaction(async (tx) => {
      const snap = await tx.get(metaRef);
      if (!snap.exists) return;
      const data = snap.data();
      const classData = data.classData || [];
      const classIndex = classData.findIndex((c) => c.id === classId);
      if (classIndex === -1) throw new Error("Class not found");
      const sections = (classData[classIndex].sections || []).filter(
        (sec) => sec.id !== sectionId
      )
      classData[classIndex] = {
        ...classData[classIndex],
        sections,
      };
      tx.set(
        metaRef,
        {
          classData,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE SECTION ERROR:", err);
    return NextResponse.json(
      { message: err.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
