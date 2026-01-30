import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { verifyUser } from "@/lib/verifyUser";
import { Timestamp, FieldValue } from "firebase-admin/firestore";
import { nanoid } from "nanoid";

async function sendExpoPush({ token, title, body, employeeUid }) {
  await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      to: token,
      sound: "default",
      title,
      body,
      data: { type: "employee_message", employeeUid },
    }),
  });
}

export async function POST(req) {
  const user = await verifyUser(req, "communication.manage");
  const body = await req.json();

  const {
    branch,
    sessionId,
    employeeUid,
    title,
    body: messageBody,
    sendPush,
    schoolName,
  } = body;

  if (!branch || !sessionId || !employeeUid || !title || !messageBody) {
    return NextResponse.json({ message: "Missing fields" }, { status: 400 });
  }

  const now = Timestamp.now();
  const message = {
    messageId: nanoid(12),
    title,
    body: messageBody,
    createdAt: now,
    createdBy: user.uid,
    createdByName: user.name || "School",
    readAt: null,
  };

  const ref = adminDb
    .collection("schools")
    .doc(user.schoolId)
    .collection("branches")
    .doc(branch)
    .collection("communication")
    .doc("items")
    .collection("employee_messages")
    .doc(`${employeeUid}_${sessionId}`);

  await adminDb.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const items = snap.exists ? snap.data().items || [] : [];
    tx.set(
      ref,
      {
        employeeUid,
        sessionId,
        items: [...items, message],
        updatedAt: now,
      },
      { merge: true }
    );
  });

  await adminDb.collection("schoolUsers").doc(employeeUid).set(
    { personalMessageAt: now },
    { merge: true }
  );

  if (sendPush) {
    const tokenSnap = await adminDb
      .collection("fcmTokens")
      .where("uid", "==", employeeUid)
      .where("active", "==", true)
      .limit(1)
      .get();

    if (!tokenSnap.empty) {
      await sendExpoPush({
        token: tokenSnap.docs[0].data().token,
        title: `${title} - ${schoolName}`,
        body: messageBody,
        employeeUid,
      });
    }
  }

  return NextResponse.json({ success: true });
}
