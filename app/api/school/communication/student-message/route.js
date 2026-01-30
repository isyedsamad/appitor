import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { verifyUser } from "@/lib/verifyUser";
import { Timestamp, FieldValue } from "firebase-admin/firestore";
import { nanoid } from "nanoid";

async function sendExpoPush({ token, title, body, studentUid }) {
  try {
    const message = {
      to: token,
      sound: "default",
      title,
      body,
      data: {
        type: "student_message",
        studentUid,
      },
    };

    await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(message),
    });
  } catch (err) {
    console.error("Student message push failed:", err);
  }
}

export async function POST(req) {
  try {
    const user = await verifyUser(req, "communication.manage");
    const body = await req.json();
    const { branch, sessionId, studentUid, title, body: messageBody, sendPush, schoolName } = body;
    if (!branch || !sessionId || !studentUid || !title || !messageBody) {
      return NextResponse.json(
        { message: "Missing required fields" },
        { status: 400 }
      );
    }

    const messageId = nanoid(12);
    const now = Timestamp.now();
    const message = {
      messageId,
      title,
      body: messageBody,
      createdAt: now,
      createdBy: user.uid,
      createdByName: user.name || "School",
      readAt: null,
    };

    const msgRef = adminDb
      .collection("schools")
      .doc(user.schoolId)
      .collection("branches")
      .doc(branch)
      .collection("communication")
      .doc("items")
      .collection("student_messages")
      .doc(`${studentUid}_${sessionId}`);

    await adminDb.runTransaction(async (tx) => {
      const snap = await tx.get(msgRef);
      const items = snap.exists ? snap.data().items || [] : [];
      tx.set(
        msgRef,
        {
          studentUid,
          sessionId,
          items: [...items, message],
          updatedAt: now,
        },
        { merge: true }
      );
    });

    await adminDb
      .collection("schoolUsers")
      .doc(studentUid)
      .set(
        {
          studentMessageAt: now,
        },
        { merge: true }
      );

    if (sendPush === true) {
      const tokenSnap = await adminDb
        .collection("fcmTokens")
        .where("uid", "==", studentUid)
        .where("active", "==", true)
        .limit(1)
        .get();

      if (!tokenSnap.empty) {
        const token = tokenSnap.docs[0].data().token;
        await sendExpoPush({
          token,
          title: `${title} - ${schoolName}`,
          body: messageBody,
          studentUid,
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Student message send failed:", err);
    return NextResponse.json(
      { message: "Failed to send message" },
      { status: 500 }
    );
  }
}

export async function PATCH(req) {
  try {
    const body = await req.json();
    const { schoolId, branch, studentUid, sessionId } = body;
    if (!schoolId || !branch || !studentUid || !sessionId) {
      return NextResponse.json(
        { message: "Missing required fields" },
        { status: 400 }
      );
    }
    const ref = adminDb
      .collection("schools")
      .doc(schoolId)
      .collection("branches")
      .doc(branch)
      .collection("communication")
      .doc("items")
      .collection("student_messages")
      .doc(`${studentUid}_${sessionId}`);

    await adminDb.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) return;
      const items = snap.data().items || [];
      const updated = items.map((m) =>
        m.readAt ? m : { ...m, readAt: Timestamp.now() }
      );

      tx.set(
        ref,
        {
          items: updated,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Mark read failed:", err);
    return NextResponse.json(
      { message: "Failed to update read status" },
      { status: 500 }
    );
  }
}
