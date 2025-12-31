import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";
import { verifyUser } from "@/lib/verifyUser";

export async function POST(req) {
  try {
    const user = await verifyUser(req, "timetable.edit");
    const body = await req.json();
    const { branch, startTime, periodDuration, totalPeriods, workingDays, breaks } = body;
    if (!branch) {
      return NextResponse.json(
        { error: "Branch is required" },
        { status: 400 }
      );
    }
    const settingsRef = adminDb
      .collection("schools")
      .doc(user.schoolId)
      .collection("branches")
      .doc(branch)
      .collection("timetable")
      .doc('items')
      .collection("timetableSettings")
      .doc("global");

    const batch = adminDb.batch();
    batch.set(
      settingsRef,
      {
        startTime: startTime || "",
        periodDuration: Number(periodDuration) || "",
        totalPeriods: Number(totalPeriods) || "",
        workingDays: workingDays || [],
        breaks: breaks || [],
        branch,
        schoolId: user.schoolId,
        updatedBy: user.uid,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    await batch.commit();

    return NextResponse.json({
      success: true,
      message: "Timetable settings saved successfully",
    });
  } catch (error) {
    console.error("Timetable Settings Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
