import { NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebaseAdmin";
import { verifyUser } from "@/lib/verifyUser";

export async function PUT(req) {
  try {
    const user = await verifyUser(req, "student.manage");
    const { uid, password } = await req.json();
    if (!uid || !password) {
      return NextResponse.json(
        { message: "Invalid payload" },
        { status: 400 }
      );
    }
    await adminAuth.updateUser(uid, {
      password,
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("PASSWORD RESET ERROR:", err);
    return NextResponse.json(
      { message: "Password reset failed" },
      { status: 500 }
    );
  }
}
