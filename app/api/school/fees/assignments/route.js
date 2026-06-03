import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { verifyUser } from "@/lib/verifyUser";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(req) {
  try {
    const body = await req.json();
    const { branch, students, templateId, templateName, session } = body;
    if (
      !branch ||
      !Array.isArray(students) ||
      students.length === 0 ||
      !templateId || !templateName || !session
    ) {
      return NextResponse.json(
        { error: "Invalid assignment data" },
        { status: 400 }
      );
    }
    const user = await verifyUser(req, "fee.setup.manage", false, branch);
    const assignmentsRef = adminDb
      .collection("schools")
      .doc(user.schoolId)
      .collection("branches")
      .doc(branch)
      .collection("fees")
      .doc("assignments")
      .collection("items");
    const studentIds = students.map(s => s.id);
    const existingMap = {};
    const chunks = [];
    for (let i = 0; i < studentIds.length; i += 30) {
      chunks.push(studentIds.slice(i, i + 30));
    }
    const queryPromises = chunks.map(chunk =>
      assignmentsRef
        .where("studentId", "in", chunk)
        .where("status", "==", "active")
        .get()
    );
    const snapshots = await Promise.all(queryPromises);
    snapshots.forEach(snap => {
      snap.docs.forEach(doc => {
        const data = doc.data();
        existingMap[data.studentId] = {
          id: doc.id,
          ...data,
        };
      });
    });
    const batch = adminDb.batch();
    let createdCount = 0;
    let updatedCount = 0;
    students.forEach(student => {
      const existing = existingMap[student.id];
      if (existing) {
        batch.update(
          assignmentsRef.doc(existing.id),
          {
            status: "inactive",
            updatedAt: FieldValue.serverTimestamp(),
            closedBy: user.uid,
          }
        );
        updatedCount++;
      }
      const newRef = assignmentsRef.doc();
      batch.set(newRef, {
        studentId: student.id,
        studentName: student.name,
        className: student.className,
        section: student.section,
        templateId,
        templateName,
        session,
        status: "active",
        assignedAt: FieldValue.serverTimestamp(),
        assignedBy: user.uid,
      });
      createdCount++;
    });
    await batch.commit();
    return NextResponse.json({
      success: true,
      assigned: createdCount,
      replaced: updatedCount,
    });
  } catch (err) {
    console.error("Fee Assignment API error:", err);
    return NextResponse.json(
      { error: "Failed to assign fee template" },
      { status: 500 }
    );
  }
}
