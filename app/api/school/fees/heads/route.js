import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { verifyUser } from "@/lib/verifyUser";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(req) {
  try {
    const user = await verifyUser(req, "fee.manage");
    const body = await req.json();
    const {
      branch,
      name,
      category,
      frequency,
      type = "fixed",
      refundable = false,
    } = body;
    if (!branch || !name || !category || !frequency) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }
    await adminDb
      .collection("schools")
      .doc(user.schoolId)
      .collection("branches")
      .doc(branch)
      .collection("fees")
      .doc("heads")
      .collection("items")
      .add({
        name: name.trim(),
        category,
        frequency,
        type,
        refundable,
        status: "active",
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Fee Heads POST error:", err);
    return NextResponse.json(
      { error: "Failed to create fee head" },
      { status: 500 }
    );
  }
}


export async function PATCH(req) {
  try {
    const user = await verifyUser(req, "fee.manage");
    const body = await req.json();
    const { branch, headId, updates } = body;
    if (!branch || !headId || !updates) {
      return NextResponse.json(
        { error: "Invalid request" },
        { status: 400 }
      );
    }
    await adminDb
      .collection("schools")
      .doc(user.schoolId)
      .collection("branches")
      .doc(branch)
      .collection("fees")
      .doc("heads")
      .collection("items")
      .doc(headId)
      .update({
        ...updates,
        updatedAt: FieldValue.serverTimestamp(),
      });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Fee Heads PATCH error:", err);
    return NextResponse.json(
      { error: "Failed to update fee head" },
      { status: 500 }
    );
  }
}