export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { verifyAppCheck } from "@/lib/verifyAppCheck";
import { verifySuperAdmin } from "@/lib/verifySuperAdmin";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(req) {
  try {
    await verifyAppCheck(req);
    await verifySuperAdmin(req);
    const { name, permissions, userData } = await req.json();

    if (!name) {
      return NextResponse.json({ error: "Role name is required" }, { status: 400 });
    }

    const batch = adminDb.batch();
    const roleRef = adminDb.collection("roles").doc();

    const roleData = {
      name,
      permissions: permissions || ['*'],
      system: false, // Created manually
      createdAt: FieldValue.serverTimestamp(),
    };

    if (name === "Admin" && permissions?.includes("*")) {
      roleData.system = true;
    }

    batch.set(roleRef, roleData);

    if (userData && userData.username && userData.schoolId) {
      const userRef = adminDb.collection("schoolUsers").doc();
      batch.set(userRef, {
        ...userData,
        role: name,
        roleId: roleRef.id,
        status: "active",
        createdAt: FieldValue.serverTimestamp(),
      });
    }

    await batch.commit();
    return NextResponse.json({ success: true, roleId: roleRef.id });
  } catch (err) {
    console.error("create role error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
