import { adminDb } from "@/lib/firebaseAdmin";
import { verifyAppCheck } from "@/lib/verifyAppCheck";
import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    await verifyAppCheck(req);
    const { userId, isActive } = await req.json();
    await adminDb.collection('schoolUsers')
      .doc(userId).update({
        status: isActive ? 'inactive' : 'active'
      })
      return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ success: false, err: error.message })
  }
}