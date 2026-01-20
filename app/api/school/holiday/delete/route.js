import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { verifyUser } from "@/lib/verifyUser";
import { Timestamp } from "firebase-admin/firestore";

export async function POST(req) {
  try {
    const user = await verifyUser(req, "holiday.create");
    const body = await req.json();
    const { branch, session, holidayId } = body;
    if (!branch || !session || !holidayId) {
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

    const snap = await holidayRef.get();
    if (!snap.exists) {
      return NextResponse.json(
        { message: "Holiday session not found" },
        { status: 404 }
      );
    }
    const items = snap.data().items || [];
    const updatedItems = items.filter(h => h.id !== holidayId);
    if (items.length === updatedItems.length) {
      return NextResponse.json(
        { message: "Holiday not found" },
        { status: 404 }
      );
    }
    await holidayRef.update({
      items: updatedItems,
      updatedAt: Timestamp.now(),
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Holiday delete failed:", err);
    return NextResponse.json(
      { message: "Failed to delete holiday" },
      { status: 500 }
    );
  }
}
