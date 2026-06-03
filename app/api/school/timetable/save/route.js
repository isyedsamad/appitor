import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { verifyUser } from "@/lib/verifyUser";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(req) {
  try {
    const body = await req.json();
    const { branch, classId, sectionId, days } = body;

    if (!branch || !classId || !sectionId || !days) {
      return NextResponse.json({ message: "Invalid payload" }, { status: 400 });
    }

    const user = await verifyUser(req, "timetable.edit.manage", false, branch);
    const classSectionId = `${classId}_${sectionId}`;
    const baseRef = adminDb
      .collection("schools")
      .doc(user.schoolId)
      .collection("branches")
      .doc(branch)
      .collection("timetable")
      .doc("items");

    const conflicts = [];
    for (const day of Object.keys(days)) {
      for (const slot of days[day] || []) {
        for (const e of slot.entries || []) {
          conflicts.push({
            teacherId: e.teacherId,
            subjectId: e.subjectId,
            day,
            period: slot.period,
          });
        }
      }
    }

    const periodKeys = new Set();
    for (const c of conflicts) {
      periodKeys.add(`${c.day}_${c.period}`);
    }
    for (const day of Object.keys(days)) {
      for (const slot of days[day] || []) {
        periodKeys.add(`${day}_${slot.period}`);
      }
    }

    await adminDb.runTransaction(async tx => {
      const teacherDocs = new Map();
      const classDocs = new Map();
      const periodDocs = new Map();

      for (const pKey of periodKeys) {
        periodDocs.set(
          pKey,
          await tx.get(baseRef.collection("periodIndex").doc(pKey))
        );
      }

      for (const c of conflicts) {
        if (!teacherDocs.has(c.teacherId)) {
          teacherDocs.set(
            c.teacherId,
            await tx.get(baseRef.collection("teachers").doc(c.teacherId))
          );
        }
      }

      for (const day of Object.keys(days)) {
        for (const slot of days[day] || []) {
          for (const e of slot.entries || []) {
            if (!teacherDocs.has(e.teacherId)) {
              teacherDocs.set(
                e.teacherId,
                await tx.get(baseRef.collection("teachers").doc(e.teacherId))
              );
            }
          }
        }
      }

      for (const snap of teacherDocs.values()) {
        if (!snap.exists) continue;
        for (const s of snap.data().slots || []) {
          const key = `${s.classId}_${s.sectionId}`;
          if (!classDocs.has(key)) {
            classDocs.set(
              key,
              await tx.get(baseRef.collection("classes").doc(key))
            );
          }
        }
      }

      if (!classDocs.has(classSectionId)) {
        classDocs.set(
          classSectionId,
          await tx.get(baseRef.collection("classes").doc(classSectionId))
        );
      }

      const teacherSlotMap = new Map();
      const classDayMap = new Map();
      const periodEntryMap = new Map();

      for (const [tid, snap] of teacherDocs.entries()) {
        teacherSlotMap.set(tid, structuredClone(snap.data()?.slots || []));
      }

      for (const [cid, snap] of classDocs.entries()) {
        classDayMap.set(cid, structuredClone(snap.data()?.days || {}));
      }

      for (const [pid, snap] of periodDocs.entries()) {
        periodEntryMap.set(pid, structuredClone(snap.data()?.entries || []));
      }

      for (const c of conflicts) {
        const tSlots = teacherSlotMap.get(c.teacherId) || [];
        const removing = tSlots.filter(
          s => s.day === c.day && s.period === c.period && !(s.classId === classId && s.sectionId === sectionId)
        );

        teacherSlotMap.set(
          c.teacherId,
          tSlots.filter(s => !(s.day === c.day && s.period === c.period))
        );

        for (const s of removing) {
          const key = `${s.classId}_${s.sectionId}`;
          const otherClassDays = classDayMap.get(key);
          if (!otherClassDays) continue;

          otherClassDays[s.day] = (otherClassDays[s.day] || []).map(p =>
            p.period === s.period
              ? { ...p, entries: p.entries.filter(e => e.teacherId !== c.teacherId) }
              : p
          );
        }

        const pKey = `${c.day}_${c.period}`;
        periodEntryMap.set(
          pKey,
          (periodEntryMap.get(pKey) || []).filter(e => e.teacherId !== c.teacherId)
        );
      }

      for (const day of Object.keys(days)) {
        for (const slot of days[day] || []) {
          const period = slot.period;
          const entries = slot.entries || [];
          const pKey = `${day}_${period}`;

          let currentPeriodEntries = (periodEntryMap.get(pKey) || []).filter(
            e => !(e.classId === classId && e.sectionId === sectionId)
          );

          const newEntriesForIndex = entries.map(e => ({
            teacherId: e.teacherId,
            subjectId: e.subjectId,
            classId,
            sectionId,
          }));

          currentPeriodEntries = [...currentPeriodEntries, ...newEntriesForIndex];
          periodEntryMap.set(pKey, currentPeriodEntries);

          for (const e of entries) {
            const tSlots = teacherSlotMap.get(e.teacherId) || [];
            const filteredSlots = tSlots.filter(
              s => !(s.day === day && s.period === period)
            );
            filteredSlots.push({
              classId,
              sectionId,
              subjectId: e.subjectId,
              day,
              period,
            });
            teacherSlotMap.set(e.teacherId, filteredSlots);
          }
        }
      }

      classDayMap.set(classSectionId, days);

      for (const [cid, daysObj] of classDayMap.entries()) {
        const docRef = baseRef.collection("classes").doc(cid);
        if (cid === classSectionId) {
          tx.set(
            docRef,
            {
              classId,
              sectionId,
              days: daysObj,
              meta: {
                updatedAt: FieldValue.serverTimestamp(),
                updatedBy: user.uid,
              },
            },
            { merge: true }
          );
        } else {
          tx.set(
            docRef,
            { days: daysObj },
            { merge: true }
          );
        }
      }

      for (const [tid, slots] of teacherSlotMap.entries()) {
        tx.set(
          baseRef.collection("teachers").doc(tid),
          { teacherId: tid, slots },
          { merge: true }
        );
      }

      for (const [pid, entries] of periodEntryMap.entries()) {
        const [day, period] = pid.split("_");
        tx.set(
          baseRef.collection("periodIndex").doc(pid),
          {
            day,
            period: Number(period),
            entries,
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
      }
    });

    return NextResponse.json({ success: true });

  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { message: err.message || "Internal error" },
      { status: 500 }
    );
  }
}
