import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { verifyUser } from "@/lib/verifyUser";
import * as XLSX from "xlsx";

export async function POST(req) {
  try {
    const user = await verifyUser(req, "admission.manage");
    const { branch, sessionId, classId, sectionId } = await req.json();
    if (!branch || !sessionId || !classId || !sectionId) {
      return NextResponse.json({ message: "Missing fields" }, { status: 400 });
    }

    const snap = await adminDb
      .collection("schools")
      .doc(user.schoolId)
      .collection("branches")
      .doc(branch)
      .collection("meta")
      .doc(classId + "_" + sectionId)
      .get();

    const data = snap.data().students.map(s => {
      return {
        appId: s.appId,
        name: s.name.toLowerCase(),
        dob: s.dob,
        rollNo: s.rollNo || "",
      };
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Students");
    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    return new NextResponse(buffer, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": "attachment; filename=students.xlsx",
      },
    });
  } catch (err) {
    console.error("EXPORT ERROR:", err);
    return NextResponse.json(
      { message: "Failed to export students" },
      { status: 500 }
    );
  }
}
