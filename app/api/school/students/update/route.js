import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { verifyUser } from "@/lib/verifyUser";
import { FieldValue } from "firebase-admin/firestore";

export async function PUT(req) {
  try {
    const user = await verifyUser(req, "student.profile.manage");
    const { uid, updates, branch } = await req.json();
    if (!uid || !updates || !branch) {
      return NextResponse.json(
        { message: "Invalid payload" },
        { status: 400 }
      );
    }

    const userRef = adminDb.collection("schoolUsers").doc(uid);
    const userSnap = await userRef.get();
    if (!userSnap.exists) {
      return NextResponse.json(
        { message: "Student not found" },
        { status: 404 }
      );
    }

    const student = userSnap.data();
    const studentRef = adminDb
      .collection("schools")
      .doc(student.schoolId)
      .collection("branches")
      .doc(branch)
      .collection("students")
      .doc(uid);

    const rosterRef = adminDb
      .collection("schools")
      .doc(student.schoolId)
      .collection("branches")
      .doc(branch)
      .collection("meta")
      .doc(`${student.className}_${student.section}_${student.currentSession}`);

    const rosterSnap = await rosterRef.get();

    let tFee = 0;
    let targetTpl = null;
    let transportHeadId = null;

    if (updates.transport !== undefined) {
      const headsSnap = await adminDb
        .collection("schools")
        .doc(student.schoolId)
        .collection("branches")
        .doc(branch)
        .collection("fees")
        .doc("heads")
        .collection("items")
        .where("category", "==", "transport")
        .where("status", "==", "active")
        .get();

      const transportHead = headsSnap.docs[0];
      transportHeadId = transportHead ? transportHead.id : null;

      const templatesSnap = await adminDb
        .collection("schools")
        .doc(student.schoolId)
        .collection("branches")
        .doc(branch)
        .collection("fees")
        .doc("templates")
        .collection("items")
        .where("className", "==", student.className)
        .where("status", "==", "active")
        .get();

      const templatesList = templatesSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      if (updates.transport === "yes") {
        targetTpl = templatesList.find(t =>
          t.name?.toLowerCase().includes("transport") ||
          t.items?.some(item => item.headName?.toLowerCase().includes("transport"))
        );
      }
      if (!targetTpl) {
        targetTpl = templatesList.find(t => t.name?.toLowerCase().includes("default")) || templatesList[0];
      }

      if (targetTpl) {
        const tItem = targetTpl.items?.find(item => item.headName?.toLowerCase().includes("transport"));
        if (tItem) {
          tFee = Number(tItem.amount || 0);
        }
      }
    }

    const updateData = {
      ...updates,
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (updates.transport !== undefined) {
      updateData.transportFee = updates.transport === "yes" ? tFee : 0;
    }

    const batch = adminDb.batch();
    batch.update(userRef, updateData);
    batch.update(studentRef, updateData);

    if (rosterSnap.exists && (updates.name || updates.dob || updates.gender)) {
      const data = rosterSnap.data();
      const students = (data.students || []).map((s) =>
        s.uid === uid ? {
          ...s,
          ...(updates.name && { name: updates.name }),
          ...(updates.dob && { dob: updates.dob }),
          ...(updates.gender && { gender: updates.gender })
        } : s
      );
      batch.update(rosterRef, {
        students,
        updatedAt: FieldValue.serverTimestamp(),
      });
    }

    if (updates.transport !== undefined) {
      const currentSession = student.currentSession;
      const metaRef = adminDb
        .collection("schools")
        .doc(student.schoolId)
        .collection("branches")
        .doc(branch)
        .collection("fees")
        .doc("metadata")
        .collection("selectiveAssignments")
        .doc(currentSession);

      const metaSnap = await metaRef.get();

      let selections = {};
      if (metaSnap.exists) {
        selections = metaSnap.data().selections || {};
      }
      const className = student.className;
      if (transportHeadId) {
        if (!selections[className]) {
          selections[className] = {};
        }
        if (!selections[className][transportHeadId]) {
          selections[className][transportHeadId] = [];
        }
        if (updates.transport === "yes") {
          if (!selections[className][transportHeadId].includes(uid)) {
            selections[className][transportHeadId].push(uid);
          }
        } else {
          selections[className][transportHeadId] = selections[className][transportHeadId].filter(id => id !== uid);
        }
        batch.set(metaRef, { selections, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
      }

      const assignRef = adminDb
        .collection("schools")
        .doc(student.schoolId)
        .collection("branches")
        .doc(branch)
        .collection("fees")
        .doc("assignments")
        .collection("items");

      const assignSnap = await assignRef
        .where("studentId", "==", uid)
        .where("status", "==", "active")
        .get();

      if (targetTpl) {
        assignSnap.docs.forEach(doc => {
          batch.update(doc.ref, {
            templateId: targetTpl.id,
            templateName: targetTpl.name,
            updatedAt: FieldValue.serverTimestamp()
          });
        });
      }
    }

    await batch.commit();

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("STUDENT UPDATE ERROR:", err);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
