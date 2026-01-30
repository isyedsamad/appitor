import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { verifyUser } from "@/lib/verifyUser";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { nanoid } from "nanoid";

async function sendExpoPush({ title, body, schoolId, branchId, roles }) {
  try {
    const tokenSnap = await adminDb
      .collection("fcmTokens")
      .where("schoolId", "==", schoolId)
      .where("branchId", "==", branchId)
      .where("active", "==", true)
      .where("role", "array-contains-any", roles)
      .get();
    if (tokenSnap.empty) return;
    const messages = [];
    tokenSnap.forEach((doc) => {
      const data = doc.data();
      messages.push({
        to: data.token,
        sound: "default",
        title,
        body,
        data: {
          type: "noticeboard",
        },
      });
    });

    const chunks = [];
    for (let i = 0; i < messages.length; i += 100) {
      chunks.push(messages.slice(i, i + 100));
    }
    for (const chunk of chunks) {
      await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(chunk),
      });
    }
  } catch (err) {
    console.error("Expo push failed:", err);
  }
}

export async function POST(req) {
  try {
    const user = await verifyUser(req, "communication.manage");
    const body = await req.json();
    const { branch, sessionId, title, description, roles, priority = "normal", expiresAt, sendPush, schoolName } = body;
    if (!branch || !sessionId || !title || !description || !roles?.length) {
      return NextResponse.json(
        { message: "Missing required fields" },
        { status: 400 }
      );
    }

    const noticeId = nanoid(12);
    const now = Timestamp.now();
    const notice = {
      noticeId,
      title,
      description,
      roles,
      priority,
      createdBy: user.uid,
      createdByName: user.name || "Admin",
      createdAt: now,
      expiresAt: expiresAt
        ? Timestamp.fromDate(new Date(expiresAt))
        : null,
    };

    const noticeRef = adminDb
      .collection("schools")
      .doc(user.schoolId)
      .collection("branches")
      .doc(branch)
      .collection("communication")
      .doc("items")
      .collection("notices")
      .doc(sessionId);

    const indexRef = adminDb
      .collection("system")
      .doc("notificationIndex");

    await adminDb.runTransaction(async (tx) => {
      const snap = await tx.get(noticeRef);
      const items = snap.exists ? snap.data().items || [] : [];
      tx.set(
        noticeRef,
        {
          sessionId,
          items: [...items, notice],
          updatedAt: now,
        },
        { merge: true }
      );
      tx.set(
        indexRef,
        {
          noticeboardAt: now,
        },
        { merge: true }
      )
    });
    if (sendPush === true) {
      sendExpoPush({
        title: title + " - " + schoolName,
        body: description,
        schoolId: user.schoolId,
        branchId: branch,
        roles,
      });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Notice create failed:", err);
    return NextResponse.json(
      { message: "Failed to create notice" },
      { status: 500 }
    );
  }
}

export async function DELETE(req) {
  try {
    const user = await verifyUser(req, "communication.all");
    const body = await req.json();
    const { branch, sessionId, noticeId } = body;
    if (!branch || !sessionId || !noticeId) {
      return NextResponse.json(
        { message: "Missing required fields" },
        { status: 400 }
      );
    }

    const noticeRef = adminDb
      .collection("schools")
      .doc(user.schoolId)
      .collection("branches")
      .doc(branch)
      .collection("communication")
      .doc("items")
      .collection("notices")
      .doc(sessionId);

    await adminDb.runTransaction(async (tx) => {
      const snap = await tx.get(noticeRef);
      if (!snap.exists) {
        throw new Error("Notice document not found");
      }

      const items = snap.data().items || [];
      const filtered = items.filter((n) => n.noticeId !== noticeId);
      tx.set(
        noticeRef,
        {
          items: filtered,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Notice delete failed:", err);
    return NextResponse.json(
      { message: err.message || "Failed to delete notice" },
      { status: 500 }
    );
  }
}
