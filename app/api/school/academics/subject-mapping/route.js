import { NextResponse } from "next/server";
import { verifyUser } from "@/lib/verifyUser";
import { adminDb } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(req) {
  try {
    const user = await verifyUser(req, "timetable.mapping.manage");
    const { schoolId, uid } = user;
    const body = await req.json();
    const {
      id,
      branch,
      classId,
      sectionId,
      subjectId,
      teacherId,
      mappings,
    } = body;
    if (!branch) {
      return NextResponse.json(
        { error: "Branch is required" },
        { status: 400 }
      );
    }

    const mappingCol = adminDb
      .collection("schools")
      .doc(schoolId)
      .collection("branches")
      .doc(branch)
      .collection('timetable')
      .doc('items')
      .collection("subjectTeacherMapping");

    if (mappings && Array.isArray(mappings)) {
      if (!classId || !sectionId) {
        return NextResponse.json(
          { error: "Invalid payload for bulk mapping" },
          { status: 400 }
        );
      }
      const existingSnap = await mappingCol
        .where("classId", "==", classId)
        .where("sectionId", "==", sectionId)
        .get();

      const batch = adminDb.batch();
      existingSnap.docs.forEach(doc => batch.delete(doc.ref));

      mappings.forEach(m => {
        if (!m.subjectId || !m.teacherId) return;
        const newRef = mappingCol.doc();
        batch.set(newRef, {
          classId,
          sectionId,
          subjectId: m.subjectId,
          teacherId: m.teacherId,
          schoolId,
          branchId: branch,
          updatedBy: uid,
          updatedAt: FieldValue.serverTimestamp(),
          createdBy: uid,
          createdAt: FieldValue.serverTimestamp(),
        });
      });

      await batch.commit();
      return NextResponse.json({
        success: true,
        message: "Mappings saved successfully",
      });
    }

    if (!classId || !sectionId || !subjectId || !teacherId) {
      return NextResponse.json(
        { error: "Invalid payload" },
        { status: 400 }
      );
    }
    const duplicateSnap = await mappingCol
      .where("classId", "==", classId)
      .where("sectionId", "==", sectionId)
      .where("subjectId", "==", subjectId)
      .where("teacherId", "==", teacherId)
      .get();
    if (!duplicateSnap.empty) {
      const existingDoc = duplicateSnap.docs[0];
      if (!id || existingDoc.id !== id) {
        return NextResponse.json(
          { message: "This subject is already mapped for the selected class, section and teacher" },
          { status: 409 }
        );
      }
    }
    const docRef = id
      ? mappingCol.doc(id)
      : mappingCol.doc();
    const batch = adminDb.batch();
    batch.set(
      docRef,
      {
        classId,
        sectionId,
        subjectId,
        teacherId,
        schoolId,
        branchId: branch,
        updatedBy: uid,
        updatedAt: FieldValue.serverTimestamp(),
        ...(id
          ? {}
          : {
            createdBy: uid,
            createdAt: FieldValue.serverTimestamp(),
          }),
      },
      { merge: true }
    );

    await batch.commit();

    return NextResponse.json({
      success: true,
      message: id
        ? "Subject–Teacher mapping updated"
        : "Subject–Teacher mapping created",
      id: docRef.id,
    });
  } catch (error) {
    console.error("Subject–Teacher Mapping API Error:", error);

    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(req) {
  try {
    const user = await verifyUser(req, "timetable.mapping.manage");
    const { schoolId, uid } = user;
    const body = await req.json();
    const { id, branch } = body;
    if (!id || !branch) {
      return NextResponse.json(
        { error: "Mapping id and branch are required" },
        { status: 400 }
      );
    }

    const mappingRef = adminDb
      .collection("schools")
      .doc(schoolId)
      .collection("branches")
      .doc(branch)
      .collection('timetable')
      .doc('items')
      .collection("subjectTeacherMapping")
      .doc(id);
    const snap = await mappingRef.get();
    if (!snap.exists) {
      return NextResponse.json(
        { error: "Mapping not found" },
        { status: 404 }
      );
    }
    const batch = adminDb.batch();
    batch.delete(mappingRef);
    await batch.commit();
    return NextResponse.json({
      success: true,
      message: "Subject–Teacher mapping deleted successfully",
    });
  } catch (error) {
    console.error("Delete Subject–Teacher Mapping Error:", error);

    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
