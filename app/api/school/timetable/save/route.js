import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { verifyUser } from "@/lib/verifyUser";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(req) {
  try {
    const user = await verifyUser(req, "timetable.edit");
    const body = await req.json();
    const { branch, classId, sectionId, days } = body;
    if (!branch || !classId || !sectionId || !days) {
      return NextResponse.json(
        { message: "Invalid payload" },
        { status: 400 }
      );
    }
    const classSectionId = `${classId}_${sectionId}`;
    const baseRef = adminDb
      .collection("schools")
      .doc(user.schoolId)
      .collection("branches")
      .doc(branch)
      .collection("timetable")
      .doc("items");
    const mappingSnap = await baseRef
      .collection("subjectTeacherMapping")
      .where("classId", "==", classId)
      .where("sectionId", "==", sectionId)
      .get();
    const mappingLimit = {};
    mappingSnap.forEach(doc => {
      const m = doc.data();
      mappingLimit[`${m.subjectId}_${m.teacherId}`] = m.periodsPerWeek;
    });
    const weeklyCount = {};
    const teacherSlotUsed = {};
    for (const day of Object.keys(days)) {
      const slots = Array.isArray(days[day]) ? days[day] : [];
      for (const slot of slots) {
        const period = slot.period;
        const entries = Array.isArray(slot.entries)
          ? slot.entries
          : Object.values(slot.entries || []);
        for (const e of entries) {
          const key = `${e.subjectId}_${e.teacherId}`;
          if (!mappingLimit[key]) {
            return NextResponse.json(
              { message: `Invalid mapping ${key}` },
              { status: 400 }
            );
          }
          weeklyCount[key] = (weeklyCount[key] || 0) + 1;
          if (weeklyCount[key] > mappingLimit[key]) {
            return NextResponse.json(
              { message: `Weekly limit exceeded for`, teacherId: e.teacherId },
              { status: 400 }
            );
          }
          const clashKey = `${day}_${period}_${e.teacherId}`;
          if (teacherSlotUsed[clashKey]) {
            return NextResponse.json(
              { message: `Teacher clash for`, teacherId: e.teacherId },
              { status: 400 }
            );
          }
          teacherSlotUsed[clashKey] = true;
        }
      }
    }
    const batch = adminDb.batch();
    const classRef = baseRef
      .collection("classes")
      .doc(classSectionId);
    const oldSnap = await classRef.get();
    const oldDays = oldSnap.exists ? oldSnap.data().days || {} : {};
    const affectedTeachers = new Set();
    for (const day of Object.keys(oldDays)) {
      const slots = Array.isArray(oldDays[day])
        ? oldDays[day]
        : Object.values(oldDays[day] || {});
      for (const slot of slots) {
        const entries = Array.isArray(slot.entries)
          ? slot.entries
          : Object.values(slot.entries || []);
        for (const e of entries) {
          affectedTeachers.add(e.teacherId);
        }
      }
    }
    for (const teacherId of affectedTeachers) {
      const teacherRef = baseRef.collection("teachers").doc(teacherId);
      const snap = await teacherRef.get();
      if (!snap.exists) continue;
      const existingSlots = snap.data().slots || [];
      const filteredSlots = existingSlots.filter(
        s => !(s.classId === classId && s.sectionId === sectionId)
      );
      batch.set(
        teacherRef,
        { slots: filteredSlots },
        { merge: true }
      );
    }
    batch.set(
      classRef,
      {
        classId,
        sectionId,
        days,
        meta: {
          updatedAt: FieldValue.serverTimestamp(),
          updatedBy: user.uid,
        },
      },
      { merge: true }
    );
    for (const day of Object.keys(days)) {
      for (const slot of days[day] || []) {
        const period = slot.period;
        const entries = Array.isArray(slot.entries)
          ? slot.entries
          : Object.values(slot.entries || []);

        if (!entries.length) continue;
        batch.set(
          baseRef.collection("periodIndex").doc(`${day}_${period}`),
          {
            day,
            period,
            entries,
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
        for (const e of entries) {
          const teacherRef = baseRef
            .collection("teachers")
            .doc(e.teacherId);

          batch.set(
            teacherRef,
            {
              teacherId: e.teacherId,
              slots: FieldValue.arrayUnion({
                classId,
                sectionId,
                subjectId: e.subjectId,
                day,
                period,
              }),
            },
            { merge: true }
          );
        }
      }
    }

    await batch.commit();
    return NextResponse.json({ success: true });

  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { message: err.message || "Internal error" },
      { status: 500 }
    );
  }
}
