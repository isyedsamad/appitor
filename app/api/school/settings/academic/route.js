import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { verifyUser } from "@/lib/verifyUser";
import { FieldValue } from "firebase-admin/firestore";

export async function GET(req) {
  try {
    const user = await verifyUser(req, "system.manage");
    const ref = adminDb
      .collection("schools")
      .doc(user.schoolId)
      .collection("settings")
      .doc("academic");
    const snap = await ref.get();
    if (!snap.exists) {
      return NextResponse.json({
        currentSession: "",
        sessions: [],
      });
    }
    return NextResponse.json(snap.data());
  } catch (err) {
    console.error("ACADEMIC SETTINGS GET ERROR:", err);
    return NextResponse.json(
      { message: "Failed to load academic settings" },
      { status: 500 }
    );
  }
}


export async function PUT(req) {
  try {
    const user = await verifyUser(req, "system.manage");
    const { currentSession, sessions } = await req.json();
    if (!currentSession || !Array.isArray(sessions)) {
      return NextResponse.json(
        { message: "Invalid payload" },
        { status: 400 }
      );
    }
    const schoolRef = adminDb.collection("schools").doc(user.schoolId);
    const academicRef = schoolRef
      .collection("settings")
      .doc("academic");
    const sessionExists = sessions.some(
      s => s.id === currentSession
    );
    if (!sessionExists) {
      return NextResponse.json(
        { message: "Current session must exist in sessions list" },
        { status: 400 }
      );
    }
    await academicRef.set(
      {
        currentSession,
        sessions,
        updatedAt: FieldValue.serverTimestamp(),
        updatedBy: user.uid,
      },
      { merge: true }
    );
    await schoolRef.update({
      currentSession,
      updatedAt: FieldValue.serverTimestamp(),
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("ACADEMIC SETTINGS UPDATE ERROR:", err);
    return NextResponse.json(
      { message: "Failed to update academic settings" },
      { status: 500 }
    );
  }
}
