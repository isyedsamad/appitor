import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { verifyUser } from "@/lib/verifyUser";
import { randomUUID } from "crypto";

export async function POST(req) {
  try {
    const user = await verifyUser(req, "academic.manage");
    const body = await req.json();
    const { branch, classId, name, order } = body;
    if (!branch || !name) {
      return NextResponse.json(
        { message: "branch and class name are required" },
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
      const data = snap.exists ? snap.data() : { classData: [] };
      const classData = data.classData || [];
      if (!classId) {
        classData.push({
          id: randomUUID(),
          name,
          order: order || 0,
          sections: [],
          isActive: true,
          createdAt: Timestamp.now(),
        });
      } else {
        const idx = classData.findIndex((c) => c.id === classId);
        if (idx === -1) throw new Error("Class not found");
        classData[idx] = {
          ...classData[idx],
          name,
          order: order || 0,
        };
      }
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
    const classId = searchParams.get("classId");
    const branch = searchParams.get("branch");
    if (!branch || !classId) {
      return NextResponse.json(
        { message: "branch and classId required" },
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
      const classData = (data.classData || []).filter(
        (c) => c.id !== classId
      );
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
    console.error("DELETE CLASS ERROR:", err);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}