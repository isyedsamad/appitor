import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { verifyUser } from "@/lib/verifyUser";
import { buildNextClassMap } from "@/lib/school/students/academic";

export async function GET(req) {
  try {
    const user = await verifyUser(req, "student.promote.manage");
    const { searchParams } = new URL(req.url);
    const toSession = searchParams.get("toSession");

    if (!toSession) {
      return NextResponse.json(
        { message: "Target session required" },
        { status: 400 }
      );
    }

    const schoolRef = adminDb.collection("schools").doc(user.schoolId);
    const branchRef = schoolRef.collection("branches").doc(user.currentBranch);

    const [branchSnap, schoolSnap] = await Promise.all([
      branchRef.get(),
      schoolRef.get()
    ]);

    const fromSession = branchSnap.data()?.currentSession || schoolSnap.data()?.currentSession;

    if (!fromSession) {
      return NextResponse.json(
        { message: "Source session not configured" },
        { status: 400 }
      );
    }

    if (fromSession === toSession) {
      return NextResponse.json(
        { message: "Source and target sessions cannot be the same" },
        { status: 400 }
      );
    }

    const classesDocRef = branchRef.collection("classes").doc("data");
    const classesSnap = await classesDocRef.get();
    if (!classesSnap.exists) {
      return NextResponse.json(
        { message: "No class configuration found for this branch" },
        { status: 404 }
      );
    }

    const classData = classesSnap.data().classData || [];
    classData.sort((a, b) => (a.order || 0) - (b.order || 0));

    const nextClassMap = buildNextClassMap(classData);

    const classLookup = {};
    classData.forEach(c => {
      classLookup[c.name] = c;
      classLookup[c.id] = c;
    });

    const metaSnap = await branchRef
      .collection("meta")
      .get();

    const studentCounts = {};
    metaSnap.docs.forEach(doc => {
      const data = doc.data();
      if (data.sessionId === fromSession || doc.id.endsWith(`_${fromSession}`)) {
        const classId = data.classId;
        const sectionId = data.sectionId;
        const count = data.count || (data.students || []).length;
        studentCounts[`${classId}_${sectionId}`] = count;
      }
    });

    const mappings = [];
    let totalActiveStudents = 0;
    let totalPassedOutStudents = 0;

    for (let i = 0; i < classData.length; i++) {
      const currentClass = classData[i];
      const nextClassName = nextClassMap[currentClass.name];
      const nextClass = nextClassName ? classLookup[nextClassName] : null;

      const classMapping = {
        fromClassId: currentClass.id,
        fromClassName: currentClass.name,
        toClassId: nextClass ? nextClass.id : "passed_out",
        toClassName: nextClass ? nextClass.name : "Passed Out / Alumni",
        sections: [],
        newTargetSections: [],
        nonFunctioningSections: [],
      };

      const sourceSections = currentClass.sections || [];
      const targetSections = nextClass ? (nextClass.sections || []) : [];

      sourceSections.forEach(srcSec => {
        const count = studentCounts[`${currentClass.id}_${srcSec.id}`] || 0;
        if (count === 0) return;

        totalActiveStudents += count;

        if (!nextClass) {
          classMapping.sections.push({
            fromSectionId: srcSec.id,
            fromSectionName: srcSec.name,
            toSectionId: "All",
            toSectionName: "All",
            studentCount: count,
            status: "graduating",
          });
          totalPassedOutStudents += count;
          return;
        }

        const match = targetSections.find(tgt => tgt.name.trim().toLowerCase() === srcSec.name.trim().toLowerCase());
        if (match) {
          classMapping.sections.push({
            fromSectionId: srcSec.id,
            fromSectionName: srcSec.name,
            toSectionId: match.id,
            toSectionName: match.name,
            studentCount: count,
            status: "mapped",
          });
        } else {
          classMapping.sections.push({
            fromSectionId: srcSec.id,
            fromSectionName: srcSec.name,
            toSectionId: "",
            toSectionName: "",
            studentCount: count,
            status: "orphaned_source",
          });
        }
      });

      if (nextClass) {
        targetSections.forEach(tgtSec => {
          const hasIncoming = sourceSections.some(src => {
            const srcCount = studentCounts[`${currentClass.id}_${src.id}`] || 0;
            return srcCount > 0 && src.name.trim().toLowerCase() === tgtSec.name.trim().toLowerCase();
          });

          if (!hasIncoming) {
            classMapping.nonFunctioningSections.push({
              toSectionId: tgtSec.id,
              toSectionName: tgtSec.name,
              status: "unmapped_target",
            });
          }
        });
      }

      mappings.push(classMapping);
    }

    const activeMappings = mappings.filter(m => m.sections.length > 0);

    return NextResponse.json({
      fromSession,
      toSession,
      totalActiveStudents,
      totalPassedOutStudents,
      mappings: activeMappings,
    });
  } catch (err) {
    console.error("SESSION ROLLOVER PREVIEW ERROR:", err);
    return NextResponse.json(
      { message: err.message || "Failed to load session rollover preview" },
      { status: 500 }
    );
  }
}
