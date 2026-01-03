import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { verifyUser } from "@/lib/verifyUser";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { nanoid } from "nanoid";

export async function POST(req) {
  try {
    const user = await verifyUser(req, "learning.manage");
    const body = await req.json();
    const {
      branch,
      sessionId,
      classId: bodyClassId,
      sectionId: bodySectionId,
      subjectId,
      // teacherId: bodyTeacherId,
      title,
      description,
      dueDate,
    } = body;
    if (!branch || !sessionId || !subjectId || !title || !dueDate) {
      return NextResponse.json(
        { message: "Missing required fields" },
        { status: 400 }
      );
    }
    const isAdmin = user.permissions?.includes('*') || user.permissions?.includes("learning.all");
    let classId, sectionId;
    // , teacherId;
    if (!isAdmin) {
      // teacherId = user.uid;
      classId = bodyClassId;
      sectionId = bodySectionId;
      if (!classId || !sectionId) {
        return NextResponse.json(
          { message: "Invalid class or section" },
          { status: 400 }
        );
      }
      const teacherRef = adminDb
        .collection("schools")
        .doc(user.schoolId)
        .collection("branches")
        .doc(branch)
        .collection("timetable")
        .doc("items")
        .collection("teachers")
        .doc(user.uid);
      const teacherSnap = await teacherRef.get();
      if (!teacherSnap.exists) {
        return NextResponse.json(
          { message: "Teacher timetable not found" },
          { status: 403 }
        );
      }
      const allowed = (teacherSnap.data().slots || []).some(
        (s) =>
          s.classId === classId &&
          s.sectionId === sectionId &&
          s.subjectId === subjectId
      );
      if (!allowed) {
        return NextResponse.json(
          { message: "Unauthorized assignment creation" },
          { status: 403 }
        );
      }
    }else {
      classId = bodyClassId;
      sectionId = bodySectionId;
      // teacherId = bodyTeacherId;
      if (!classId || !sectionId) {
        return NextResponse.json(
          { message: "Class or section missing" },
          { status: 400 }
        );
      }
    }
    const [year, month, day] = dueDate.split("-").map(Number);
    const dueTimestamp = Timestamp.fromDate(
      new Date(year, month - 1, day, 23, 59, 59)
    );
    const docId = `${classId}_${sectionId}_${sessionId}`;
    const assignmentRef = adminDb
      .collection("schools")
      .doc(user.schoolId)
      .collection("branches")
      .doc(branch)
      .collection("learning")
      .doc("items")
      .collection("assignments")
      .doc(docId);
    await adminDb.runTransaction(async (tx) => {
      const snap = await tx.get(assignmentRef);
      const now = Timestamp.now();
      const items = snap.exists ? snap.data().items || [] : [];
      const assignment = {
        assignmentId: nanoid(12),
        title,
        description,
        subjectId,
        // teacherId,
        dueDate: dueTimestamp,
        createdAt: now,
        createdBy: user.uid,
        updatedAt: now,
      };
      tx.set(
        assignmentRef,
        {
          classId,
          sectionId,
          sessionId,
          items: [...items, assignment],
          updatedAt: now,
        },
        { merge: true }
      );
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Assignment create failed:", err);
    return NextResponse.json(
      { message: "Failed to create assignment" },
      { status: 500 }
    );
  }
}

export async function DELETE(req) {
  try {
    const user = await verifyUser(req, "learning.manage");
    const body = await req.json();
    const {
      branch,
      sessionId,
      classId,
      sectionId,
      assignmentId,
    } = body;
    if (!branch || !sessionId || !classId || !sectionId || !assignmentId) {
      return NextResponse.json(
        { message: "Missing required fields" },
        { status: 400 }
      );
    }
    const isAdmin = user.permissions?.includes('*') || user.permissions?.includes("learning.all");
    const docId = `${classId}_${sectionId}_${sessionId}`;
    const assignmentRef = adminDb
      .collection("schools")
      .doc(user.schoolId)
      .collection("branches")
      .doc(branch)
      .collection("learning")
      .doc("items")
      .collection("assignments")
      .doc(docId);
    await adminDb.runTransaction(async (tx) => {
      const snap = await tx.get(assignmentRef);
      if (!snap.exists) {
        throw new Error("Assignment document not found");
      }
      const items = snap.data().items || [];
      const target = items.find(i => i.assignmentId === assignmentId);
      if (!target) {
        throw new Error("Assignment not found");
      }
      if (!isAdmin) {
        throw new Error("Unauthorized delete");
      }
      const filtered = items.filter(
        i => i.assignmentId !== assignmentId
      );
      tx.set(
        assignmentRef,
        {
          items: filtered,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Assignment delete failed:", err);
    return NextResponse.json(
      { message: err.message || "Failed to delete assignment" },
      { status: 500 }
    );
  }
}
