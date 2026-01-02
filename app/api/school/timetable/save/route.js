import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { verifyUser } from "@/lib/verifyUser";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(req) {
  try {
    const user = await verifyUser(req, "timetable.edit");
    const { branch, classId, sectionId, days } = await req.json();

    if (!branch || !classId || !sectionId || !days) {
      return NextResponse.json({ message: "Invalid payload" }, { status: 400 });
    }

    const classSectionId = `${classId}_${sectionId}`;
    const baseRef = adminDb
      .collection("schools")
      .doc(user.schoolId)
      .collection("branches")
      .doc(branch)
      .collection("timetable")
      .doc("items");

    /* ---------------- LIMIT CHECK (OUTSIDE TX) ---------------- */

    const mappingSnap = await baseRef
      .collection("subjectTeacherMapping")
      .where("classId", "==", classId)
      .where("sectionId", "==", sectionId)
      .get();

    const limitMap = {};
    mappingSnap.forEach(d => {
      const m = d.data();
      limitMap[`${m.subjectId}_${m.teacherId}`] = m.periodsPerWeek;
    });

    const weeklyCount = {};
    const conflicts = [];

    for (const day of Object.keys(days)) {
      for (const slot of days[day] || []) {
        for (const e of slot.entries || []) {
          const key = `${e.subjectId}_${e.teacherId}`;
          weeklyCount[key] = (weeklyCount[key] || 0) + 1;

          if (weeklyCount[key] > (limitMap[key] || 0)) {
            return NextResponse.json(
              { message: "Weekly limit exceeded", teacherId: e.teacherId },
              { status: 400 }
            );
          }

          conflicts.push({
            teacherId: e.teacherId,
            subjectId: e.subjectId,
            day,
            period: slot.period,
          });
        }
      }
    }

    /* ---------------- TRANSACTION ---------------- */

    await adminDb.runTransaction(async tx => {

      /* ---------- READ PHASE ---------- */

      const teacherDocs = new Map();
      const classDocs = new Map();
      const periodDocs = new Map();

      for (const c of conflicts) {
        if (!teacherDocs.has(c.teacherId)) {
          teacherDocs.set(
            c.teacherId,
            await tx.get(baseRef.collection("teachers").doc(c.teacherId))
          );
        }

        const pKey = `${c.day}_${c.period}`;
        if (!periodDocs.has(pKey)) {
          periodDocs.set(
            pKey,
            await tx.get(baseRef.collection("periodIndex").doc(pKey))
          );
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

      /* ---------- MUTABLE STATE ---------- */

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

      /* ---------- APPLY CONFLICT REMOVALS ---------- */

      for (const c of conflicts) {
        const tSlots = teacherSlotMap.get(c.teacherId) || [];

        const removing = tSlots.filter(
          s => s.day === c.day && s.period === c.period
        );

        teacherSlotMap.set(
          c.teacherId,
          tSlots.filter(s => !(s.day === c.day && s.period === c.period))
        );

        for (const s of removing) {
          const key = `${s.classId}_${s.sectionId}`;
          const days = classDayMap.get(key);
          if (!days) continue;

          days[s.day] = (days[s.day] || []).map(p =>
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

      /* ---------- WRITE CLEANED STATE ---------- */

      for (const [tid, slots] of teacherSlotMap.entries()) {
        tx.set(
          baseRef.collection("teachers").doc(tid),
          { slots },
          { merge: true }
        );
      }

      for (const [cid, daysObj] of classDayMap.entries()) {
        tx.set(
          baseRef.collection("classes").doc(cid),
          { days: daysObj },
          { merge: true }
        );
      }

      for (const [pid, entries] of periodEntryMap.entries()) {
        tx.set(
          baseRef.collection("periodIndex").doc(pid),
          { entries },
          { merge: true }
        );
      }

      /* ---------- SAVE CURRENT CLASS ---------- */

      tx.set(
        baseRef.collection("classes").doc(classSectionId),
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

      /* ---------- ADD NEW INDEXES ---------- */

      for (const day of Object.keys(days)) {
        for (const slot of days[day] || []) {
          const period = slot.period;
          const entries = slot.entries || [];
          if (!entries.length) continue;

          tx.set(
            baseRef.collection("periodIndex").doc(`${day}_${period}`),
            {
              day,
              period,
              entries: entries.map(e => ({
                teacherId: e.teacherId,
                subjectId: e.subjectId,
                classId,
                sectionId,
              })),
              updatedAt: FieldValue.serverTimestamp(),
            },
            { merge: true }
          );

          for (const e of entries) {
            tx.set(
              baseRef.collection("teachers").doc(e.teacherId),
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
