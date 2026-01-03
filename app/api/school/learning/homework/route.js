import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { verifyUser } from "@/lib/verifyUser";
import { FieldValue, Timestamp } from "firebase-admin/firestore";

export async function POST(req) {
  try {
    const user = await verifyUser(req, "learning.manage");
    const body = await req.json();
    const {
      branch,
      date,
      classId: bodyClassId,
      sectionId: bodySectionId,
      timetable,
      content,
    } = body;
    if (!branch || !date || !timetable || !content) {
      return NextResponse.json(
        { message: "Missing required fields" },
        { status: 400 }
      );
    }

    console.log(user);
    
    const isAdmin = user.permissions?.includes('*') || user.permissions?.includes("learning.all");
    let classId, sectionId, teacherId;
    if (!isAdmin) {
      classId = timetable.classId;
      sectionId = timetable.sectionId;
      teacherId = user.uid;
      if (
        !classId ||
        !sectionId ||
        !timetable.period ||
        !timetable.subjectId
      ) {
        return NextResponse.json(
          { message: "Invalid timetable data" },
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
      const ownsSlot = (teacherSnap.data().slots || []).some(
        (s) =>
          s.classId === classId &&
          s.sectionId === sectionId &&
          s.period === timetable.period &&
          s.subjectId === timetable.subjectId
      );
      if (!ownsSlot) {
        return NextResponse.json(
          { message: "Unauthorized timetable slot" },
          { status: 403 }
        );
      }
    }else {
      classId = bodyClassId;
      sectionId = bodySectionId;
      teacherId = timetable.teacherId;
      if (!classId || !sectionId || !teacherId) {
        return NextResponse.json(
          { message: "Class, section or teacher missing" },
          { status: 400 }
        );
      }
    }
    const docId = `${classId}_${sectionId}_${date}`;
    const homeworkRef = adminDb
      .collection("schools")
      .doc(user.schoolId)
      .collection("branches")
      .doc(branch)
      .collection("learning")
      .doc("items")
      .collection("homework")
      .doc(docId);
    await adminDb.runTransaction(async (tx) => {
      const snap = await tx.get(homeworkRef);
      let items = [];
      if (snap.exists) {
        items = snap.data().items || [];
      }
      const now = FieldValue.serverTimestamp();
      const nowArray = Timestamp.now();
      const newEntry = {
        period: timetable.period,
        subjectId: timetable.subjectId,
        teacherId,
        content,
        updatedAt: nowArray,
        updatedBy: user.uid,
      };
      const index = items.findIndex(
        (i) => i.period === timetable.period
      );
      if (index !== -1) {
        items[index] = {
          ...items[index],
          ...newEntry,
        };
      } else {
        items.push({
          ...newEntry,
          createdAt: nowArray,
          createdBy: user.uid,
        });
      }
      tx.set(
        homeworkRef,
        {
          classId,
          sectionId,
          date,
          items,
          updatedAt: nowArray,
        },
        { merge: true }
      );
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Homework transaction failed:", err);
    return NextResponse.json(
      { message: "Failed to save homework" },
      { status: 500 }
    );
  }
}
