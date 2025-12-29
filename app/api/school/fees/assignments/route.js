import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { verifyUser } from "@/lib/verifyUser";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(req) {
  try {
    const user = await verifyUser(req, "fee.manage");
    const body = await req.json();
    const { branch, students, templateId, templateName } = body;
    if (
      !branch ||
      !Array.isArray(students) ||
      students.length === 0 ||
      !templateId || !templateName
    ) {
      return NextResponse.json(
        { error: "Invalid assignment data" },
        { status: 400 }
      );
    }
    const assignmentsRef = adminDb
      .collection("schools")
      .doc(user.schoolId)
      .collection("branches")
      .doc(branch)
      .collection("fees")
      .doc("assignments")
      .collection("items");
    const studentIds = students.map(s => s.id);
    const existingSnap = await assignmentsRef
      .where("studentId", "in", studentIds.slice(0, 10))
      .where("status", "==", "active")
      .get();
    const existingMap = {};
    existingSnap.docs.forEach(doc => {
      const data = doc.data();
      existingMap[data.studentId] = {
        id: doc.id,
        ...data,
      };
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
