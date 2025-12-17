export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";

export async function POST(req) {
  try {
    const data = await req.json();
    if (!data?.appName || !data?.supportEmail) {
      return NextResponse.json(
        { error: "Invalid settings payload" },
        { status: 400 }
      );
    }
    await adminDb
      .collection("settings")
      .doc("system")
      .set(
        {
          appName: data.appName,
          supportEmail: data.supportEmail,
          maintenanceMode: !!data.maintenanceMode,

          auth: {
            forcePasswordReset: !!data.auth?.forcePasswordReset,
            usernameLogin: !!data.auth?.usernameLogin,
          },

          communication: {
            emailEnabled: !!data.communication?.emailEnabled,
            smsEnabled: !!data.communication?.smsEnabled,
          },

          updatedAt: new Date(),
        },
        { merge: true }
      );

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Settings update error:", err);
    return NextResponse.json(
      { error: "Failed to update system settings" },
      { status: 500 }
    );
  }
}
