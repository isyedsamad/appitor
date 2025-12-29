import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { verifyUser } from "@/lib/verifyUser";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(req) {
  try {
    const user = await verifyUser(req, "fee.manage");
    const body = await req.json();
    const {branch, name, className, section, academicYear, items} = body;
    if (!branch || !name || !className || !academicYear ||
      !Array.isArray(items) || items.length === 0) {
        return NextResponse.json(
          { message: "Invalid or missing data" },
          { status: 400 }
        );
    }
    const cleanItems = items.map(i => ({
      headId: i.headId,
      headName: i.headName,
      amount: Number(i.amount),
      frequency: i.frequency || "one-time",
    }));
    await adminDb
      .collection("schools")
      .doc(user.schoolId)
      .collection("branches")
      .doc(branch)
      .collection("fees")
      .doc("templates")
      .collection("items")
      .add({
        name: name.trim(),
        className,
        section: section || null,
        academicYear,
        items: cleanItems,
        status: "active",
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Fee Template POST error:", err);
    return NextResponse.json(
      { message: "Failed to create fee template" },
      { status: 500 }
    );
  }
}

export async function PATCH(req) {
  try {
    const user = await verifyUser(req, "fee.manage");
    const body = await req.json();
    const {
      branch,
      templateId,
      updates,
    } = body;
    if (!branch || !templateId || !updates) {
      return NextResponse.json(
        { message: "Invalid update request" },
        { status: 400 }
      );
    }
    const updatePayload = {
      ...updates,
      updatedAt: FieldValue.serverTimestamp(),
    };
    if (Array.isArray(updates.items)) {
      updatePayload.items = updates.items.map(i => ({
        headId: i.headId,
        headName: i.headName,
        amount: Number(i.amount),
        frequency: i.frequency || "one-time",
      }));
    }
    await adminDb
      .collection("schools")
      .doc(user.schoolId)
      .collection("branches")
      .doc(branch)
      .collection("fees")
      .doc("templates")
      .collection("items")
      .doc(templateId)
      .update(updatePayload);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Fee Template PATCH error:", err);
    return NextResponse.json(
      { message: "Failed to update fee template" },
      { status: 500 }
    );
  }
}
