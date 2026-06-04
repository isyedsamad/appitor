import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { verifyUser } from "@/lib/verifyUser";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(req) {
  try {
    const user = await verifyUser(req, "student.rollno.manage");
    const { branch, session, order } = await req.json();

    if (!branch || !session || !order) {
      return NextResponse.json(
        { message: "Missing required fields: branch, session, and order are required." },
        { status: 400 }
      );
    }

    if (order !== "alphabetical" && order !== "appId") {
      return NextResponse.json(
        { message: "Invalid order. Must be 'alphabetical' or 'appId'." },
        { status: 400 }
      );
    }

    const branchRef = adminDb
      .collection("schools")
      .doc(user.schoolId)
      .collection("branches")
      .doc(branch);

    const metaSnap = await branchRef.collection("meta").get();
    const rosters = [];

    metaSnap.docs.forEach(doc => {
      if (doc.id.endsWith(`_${session}`)) {
        rosters.push({ id: doc.id, ref: doc.ref, data: doc.data() });
      }
    });

    if (rosters.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No student rosters found to assign roll numbers.",
        processedSections: 0,
        processedStudents: 0
      });
    }

    let batch = adminDb.batch();
    let writeCount = 0;
    let totalStudentsProcessed = 0;

    const commitBatch = async () => {
      if (writeCount > 0) {
        await batch.commit();
        batch = adminDb.batch();
        writeCount = 0;
      }
    };

    for (const roster of rosters) {
      let students = roster.data.students || [];
      if (students.length === 0) continue;

      const sortedStudents = [...students].sort((a, b) => {
        if (order === "alphabetical") {
          return (a.name || "").localeCompare(b.name || "");
        } else {
          return String(a.appId || "").localeCompare(String(b.appId || ""), undefined, { numeric: true });
        }
      });

      const rollMap = new Map();
      const updatedStudents = sortedStudents.map((s, index) => {
        const rollNo = index + 1;
        rollMap.set(s.uid, rollNo);
        return { ...s, rollNo };
      });

      for (const student of updatedStudents) {
        const userRef = adminDb.collection("schoolUsers").doc(student.uid);
        const branchStudentRef = branchRef.collection("students").doc(student.uid);

        const dataUpdate = {
          rollNo: student.rollNo,
          rollAssignedAt: FieldValue.serverTimestamp(),
          rollAssignedBy: user.uid,
          updatedAt: FieldValue.serverTimestamp(),
        };

        batch.update(userRef, dataUpdate);
        batch.update(branchStudentRef, dataUpdate);
        writeCount += 2;
        totalStudentsProcessed++;

        if (writeCount >= 450) {
          await commitBatch();
        }
      }

      batch.update(roster.ref, {
        students: updatedStudents,
        updatedAt: FieldValue.serverTimestamp(),
      });
      writeCount += 1;

      if (writeCount >= 450) {
        await commitBatch();
      }
    }

    await commitBatch();

    return NextResponse.json({
      success: true,
      message: `Successfully assigned roll numbers to ${totalStudentsProcessed} students across sections.`,
      processedSections: rosters.length,
      processedStudents: totalStudentsProcessed
    });

  } catch (err) {
    console.error("BULK ASSIGN ROLL NO ERROR:", err);
    return NextResponse.json(
      { message: err.message || "Failed to bulk assign roll numbers." },
      { status: 500 }
    );
  }
}
