import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { verifyUser } from "@/lib/verifyUser";
import { FieldValue } from "firebase-admin/firestore";

export async function GET(req) {
  try {
    const user = await verifyUser(req, "system.academic.view");
    const { searchParams } = new URL(req.url);
    const branch = searchParams.get("branch");

    let ref;
    if (branch) {
      ref = adminDb
        .collection("schools")
        .doc(user.schoolId)
        .collection("branches")
        .doc(branch)
        .collection("settings")
        .doc("academic");
    } else {
      ref = adminDb
        .collection("schools")
        .doc(user.schoolId)
        .collection("settings")
        .doc("academic");
    }

    let snap = await ref.get();

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
    const user = await verifyUser(req, "system.academic.manage");
    const { currentSession, sessions, branch } = await req.json();

    if (!Array.isArray(sessions)) {
      return NextResponse.json(
        { message: "Invalid payload: sessions must be an array" },
        { status: 400 }
      );
    }

    if (currentSession) {
      const sessionExists = sessions.some(
        s => s.id === currentSession
      );
      if (!sessionExists) {
        return NextResponse.json(
          { message: "Current session must exist in sessions list" },
          { status: 400 }
        );
      }
    }

    if (branch) {
      // Save to branch-level
      const branchRef = adminDb
        .collection("schools")
        .doc(user.schoolId)
        .collection("branches")
        .doc(branch);

      const academicRef = branchRef
        .collection("settings")
        .doc("academic");

      await academicRef.set(
        {
          currentSession,
          sessions,
          updatedAt: FieldValue.serverTimestamp(),
          updatedBy: user.uid,
        },
        { merge: true }
      );

      // Also update branch main doc for quick access
      await branchRef.update({
        currentSession,
        sessions,
        updatedAt: FieldValue.serverTimestamp(),
      });
    } else {
      // Default school-level update
      const schoolRef = adminDb.collection("schools").doc(user.schoolId);
      const academicRef = schoolRef
        .collection("settings")
        .doc("academic");

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
        sessions,
        updatedAt: FieldValue.serverTimestamp(),
      });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("ACADEMIC SETTINGS UPDATE ERROR:", err);
    return NextResponse.json(
      { message: "Failed to update academic settings" },
      { status: 500 }
    );
  }
}
