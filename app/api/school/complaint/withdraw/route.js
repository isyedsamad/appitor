import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { verifyUser } from "@/lib/verifyUser";
import { Timestamp } from "firebase-admin/firestore";

export async function POST(req) {
  try {
    const user = await verifyUser(req, "leavecomplaint.create");
    const body = await req.json();
    const { type, branch, session, complaintId } = body;
    if (!type || !branch || !session || !complaintId) {
      return NextResponse.json(
        { message: "Missing required fields" },
        { status: 400 }
      );
    }

    if (!["employee", "student"].includes(type)) {
      return NextResponse.json(
        { message: "Invalid complaint type" },
        { status: 400 }
      );
    }

    const schoolComplaintRef = adminDb
      .collection("schools")
      .doc(user.schoolId)
      .collection("branches")
      .doc(branch)
      .collection("complaint")
      .doc("items")
      .collection(session)
      .doc(complaintId);

    const userComplaintRef = adminDb
      .collection("schools")
      .doc(user.schoolId)
      .collection("branches")
      .doc(branch)
      .collection(type === "employee" ? "employees" : "students")
      .doc(user.uid)
      .collection("complaint")
      .doc(session);

    const schoolSnap = await schoolComplaintRef.get();
    if (!schoolSnap.exists) {
      return NextResponse.json(
        { message: "Complaint not found" },
        { status: 404 }
      );
    }

    const complaintData = schoolSnap.data();
    if (complaintData.uid !== user.uid) {
      return NextResponse.json(
        { message: "Unauthorized complaint withdrawal" },
        { status: 403 }
      );
    }

    if (complaintData.status !== "pending") {
      return NextResponse.json(
        { message: "Only pending complaints can be withdrawn" },
        { status: 400 }
      );
    }

    const userSnap = await userComplaintRef.get();
    if (!userSnap.exists) {
      return NextResponse.json(
        { message: "User complaint record not found" },
        { status: 404 }
      );
    }

    const items = userSnap.data().items || [];
    const updatedItems = items.filter(
      (i) => i.id !== complaintId
    );

    const batch = adminDb.batch();
    batch.delete(schoolComplaintRef);
    batch.set(
      userComplaintRef,
      {
        items: updatedItems,
        updatedAt: Timestamp.now(),
      },
      { merge: true }
    );

    await batch.commit();
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Complaint withdraw failed:", err);
    return NextResponse.json(
      { message: "Failed to withdraw complaint" },
      { status: 500 }
    );
  }
}
