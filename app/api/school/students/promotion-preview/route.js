import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { verifyUser } from "@/lib/verifyUser";
import { buildNextClassMap } from "@/lib/school/students/academic";

export async function GET(req) {
  try {
    const user = await verifyUser(req, "student.manage");
    const schoolRef = adminDb.collection("schools").doc(user.schoolId);
    const schoolSnap = await schoolRef.get();
    const fromSession = schoolSnap.data().currentSession;
    const { searchParams } = new URL(req.url);
    const toSession = searchParams.get("toSession");
    if (!toSession) {
      return NextResponse.json(
        { message: "Target session required" },
        { status: 400 }
      );
    }
    if (!fromSession || !toSession) {
      return NextResponse.json(
        { message: "Session not configured" },
        { status: 400 }
      );
    }
    const studentsSnap = await adminDb
      .collection("schoolUsers")
      .where("role", "==", "student")
      .where("schoolId", "==", user.schoolId)
      .where("currentSession", "==", fromSession)
      .get();
    const classMap = {};
    const classesSnap = await adminDb
      .collection("schools")
      .doc(user.schoolId)
      .collection('branches')
      .doc(user.currentBranch)
      .collection("classes")
      .get();
    const classData = classesSnap.docs.map(d => d.data());
    const nextClassMap = buildNextClassMap(classData);
    let passedOutCount = 0;
    studentsSnap.forEach(doc => {
      const s = doc.data();
      const nextClass = nextClassMap[s.className];
      if (!nextClass) {
        passedOutCount++;
        return;
      }
      if (!classMap[s.className]) {
        classMap[s.className] = {
          fromClass: s.className,
          toClass: nextClass,
          count: 0,
        };
      }
      classMap[s.className].count++;
    });
    return NextResponse.json({
      fromSession,
      toSession,
      summary: Object.values(classMap),
      passedOutCount,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { message: "Preview failed" },
      { status: 500 }
    );
  }
}
