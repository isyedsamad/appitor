import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { verifyUser } from "@/lib/verifyUser";
import { FieldValue, Timestamp } from "firebase-admin/firestore";

export async function POST(req) {
  try {
    const user = await verifyUser(req, "holiday.create");
    const body = await req.json();
    const { branch, session, title, from, to, days, daysList } = body;
    if (!branch || !session || !title || !from || !days || !daysList?.length) {
      return NextResponse.json(
        { message: "Missing required fields" },
        { status: 400 }
      );
    }

    const holidayRef = adminDb
      .collection("schools")
      .doc(user.schoolId)
      .collection("branches")
      .doc(branch)
      .collection("holidays")
      .doc(session);

    const now = Timestamp.now();
    const holiday = {
      id: adminDb.collection("_").doc().id,
      title,
      from,
      to: to || null,
      days,
      daysList,
      createdAt: now,
      createdBy: user.uid,
    };

    await holidayRef.set(
      {
        session,
        items: FieldValue.arrayUnion(holiday),
        updatedAt: now,
      },
      { merge: true }
    );
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Holiday create failed:", err);
    return NextResponse.json(
      { message: "Failed to create holiday" },
      { status: 500 }
    );
  }
}
