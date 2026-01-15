import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { verifyUser } from "@/lib/verifyUser";
import { FieldValue, Timestamp } from "firebase-admin/firestore";

export async function POST(req) {
  try {
    const user = await verifyUser(req, "learning.create");
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

    const isAdmin =
      user.permissions?.includes("*") ||
      user.permissions?.includes("learning.all");

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

    const batch = adminDb.batch();
    const now = Timestamp.now();

    const classDocId = `${classId}_${sectionId}_${date}`;
    const classHomeworkRef = adminDb
      .collection("schools")
      .doc(user.schoolId)
      .collection("branches")
      .doc(branch)
      .collection("learning")
      .doc("items")
      .collection("homework")
      .doc(classDocId);

    const classSnap = await classHomeworkRef.get();
    let classItems = classSnap.exists ? classSnap.data().items || [] : [];

    const entry = {
      period: timetable.period,
      subjectId: timetable.subjectId,
      teacherId,
      content,
      classId,
      sectionId,
      updatedAt: now,
      updatedBy: user.uid,
    };

    const idx = classItems.findIndex(i => i.period === timetable.period);
    if (idx !== -1) {
      classItems[idx] = { ...classItems[idx], ...entry };
    } else {
      classItems.push({
        ...entry,
        createdAt: now,
        createdBy: user.uid,
      });
    }

    batch.set(
      classHomeworkRef,
      {
        classId,
        sectionId,
        date,
        items: classItems,
        updatedAt: now,
      },
      { merge: true }
    );

    if (!isAdmin) {
      const teacherDocId = `${date}_${teacherId}`;
      const teacherHomeworkRef = adminDb
        .collection("schools")
        .doc(user.schoolId)
        .collection("branches")
        .doc(branch)
        .collection("learning")
        .doc("items")
        .collection("homework_employee")
        .doc(teacherDocId);

      const teacherSnap = await teacherHomeworkRef.get();
      let teacherItems = teacherSnap.exists
        ? teacherSnap.data().items || []
        : [];

      const tIdx = teacherItems.findIndex(
        i =>
          i.period === timetable.period &&
          i.classId === classId &&
          i.sectionId === sectionId
      );

      const teacherEntry = {
        period: timetable.period,
        subjectId: timetable.subjectId,
        classId,
        sectionId,
        content,
        updatedAt: now,
      };

      if (tIdx !== -1) {
        teacherItems[tIdx] = { ...teacherItems[tIdx], ...teacherEntry };
      } else {
        teacherItems.push({
          ...teacherEntry,
          createdAt: now,
        });
      }

      batch.set(
        teacherHomeworkRef,
        {
          teacherId,
          date,
          items: teacherItems,
          updatedAt: now,
        },
        { merge: true }
      );
    }

    await batch.commit();
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Homework batch save failed:", err);
    return NextResponse.json(
      { message: "Failed to save homework" },
      { status: 500 }
    );
  }
}
