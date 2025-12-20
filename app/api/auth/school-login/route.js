import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";

export async function POST(req) {
  const { uid, schoolId } = await req.json();
  const userSnap = await adminDb
    .collection("schoolUsers")
    .doc(uid)
    .get();

  if (!userSnap.exists) {
    return NextResponse.json(
      { message: "Invalid Credentials" },
      { status: 403 }
    );
  }
  const user = userSnap.data();
  if (user.schoolId !== schoolId) {
    return NextResponse.json(
      { message: "Invalid Credentials" },
      { status: 403 }
    );
  }
  if (user.status !== "active") {
    return NextResponse.json(
      { message: "Your Account is disabled! Please contact Admin" },
      { status: 403 }
    );
  }
  return NextResponse.json({
    schoolId: user.schoolId,
    role: user.role,
  });
}
