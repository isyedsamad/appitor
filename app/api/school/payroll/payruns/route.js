import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { verifyUser } from "@/lib/verifyUser";
import { FieldValue, Timestamp } from "firebase-admin/firestore";

export async function GET(req) {
    try {
        const user = await verifyUser(req, "payroll.view");
        const branchId = req.headers.get("x-branch-id");

        if (!branchId) {
            return NextResponse.json({ message: "Branch ID required" }, { status: 400 });
        }

        const sessionFilter = req.nextUrl.searchParams.get("session");

        let q = adminDb
            .collection("schools")
            .doc(user.schoolId)
            .collection("branches")
            .doc(branchId)
            .collection("payroll_runs")
            .orderBy("updatedAt", "desc");

        if (sessionFilter) {
            q = q.where("session", "==", sessionFilter);
        } else {
            q = q.limit(24);
        }

        const snap = await q.get();
        if (snap.empty) return NextResponse.json([]);
        const items = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        return NextResponse.json(items);
    } catch (err) {
        console.log(err);

        return NextResponse.json({ message: err.message }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        const user = await verifyUser(req, "payroll.manage");
        const branchId = req.headers.get("x-branch-id");
        const { monthYear } = await req.json();

        if (!branchId || !monthYear) {
            return NextResponse.json({ message: "Branch ID and Month-Year required" }, { status: 400 });
        }

        const [mm, yyyy] = monthYear.split("-");
        const monthKey = `${yyyy}-${mm}`;
        const daysInMonth = new Date(yyyy, mm, 0).getDate();

        const runRef = adminDb
            .collection("schools")
            .doc(user.schoolId)
            .collection("branches")
            .doc(branchId)
            .collection("payroll_runs")
            .doc(monthYear);

        const existsSnap = await runRef.get();
        if (existsSnap.exists) {
            return NextResponse.json({ message: "Payrun already exists for this month" }, { status: 400 });
        }

        const settingsSnap = await adminDb
            .collection("schools")
            .doc(user.schoolId)
            .collection("branches")
            .doc(branchId)
            .collection("settings")
            .doc("payroll")
            .get();

        const settings = settingsSnap.exists ? settingsSnap.data() : { isAdvanced: false, components: { earnings: [], deductions: [] } };
        const acaSnap = await adminDb.collection("schools").doc(user.schoolId).collection("branches").doc(branchId).collection("settings").doc("academic").get();
        const currentSession = acaSnap.exists ? acaSnap.data().currentSession : null;

        if (!currentSession) {
            return NextResponse.json({ message: "No active academic session found for this branch" }, { status: 400 });
        }

        const employeesSnap = await adminDb
            .collection("schools")
            .doc(user.schoolId)
            .collection("branches")
            .doc(branchId)
            .collection("employees")
            .where("status", "==", "active")
            .get();

        const employeeRecords = [];

        for (const doc of employeesSnap.docs) {
            const data = doc.data();
            const fixedSalary = parseFloat(data.salary || 0);
            let lopAmount = 0;
            let lopDays = 0;
            let earnings = [];
            let deductions = [];

            if (settings.isAdvanced) {
                const attSnap = await adminDb
                    .collection("schools")
                    .doc(user.schoolId)
                    .collection("branches")
                    .doc(branchId)
                    .collection("employees")
                    .doc(data.uid)
                    .collection("attendance_month")
                    .doc(monthKey)
                    .get();

                if (attSnap.exists) {
                    const attData = attSnap.data();
                    lopDays = attData.totalA || 0;
                    lopAmount = Math.round((fixedSalary / daysInMonth) * lopDays);
                }

                settings.components?.earnings?.forEach(c => {
                    const val = c.type === "percentage" ? Math.round((fixedSalary * c.value) / 100) : c.value;
                    earnings.push({ name: c.name, amount: val });
                });

                settings.components?.deductions?.forEach(c => {
                    const val = c.type === "percentage" ? Math.round((fixedSalary * c.value) / 100) : c.value;
                    deductions.push({ name: c.name, amount: val });
                });
            }

            const totalEarnings = earnings.reduce((s, e) => s + e.amount, 0);
            const totalDeductions = deductions.reduce((s, d) => s + d.amount, 0);
            const netPayable = fixedSalary + totalEarnings - totalDeductions - lopAmount;

            employeeRecords.push({
                uid: data.uid,
                name: data.name,
                employeeId: data.employeeId,
                role: data.role,
                fixedSalary,
                earnings,
                deductions,
                lopDays,
                lopAmount,
                adjustments: 0,
                netPayable,
                status: "draft",
            });
        }

        const totalPayout = employeeRecords.reduce((sum, r) => sum + r.netPayable, 0);

        const runData = {
            monthYear,
            session: currentSession,
            isAdvanced: settings.isAdvanced,
            status: "draft",
            totalEmployees: employeeRecords.length,
            totalPayout,
            employeeRecords,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
            createdBy: user.uid,
            updatedBy: user.uid,
        };

        const batch = adminDb.batch();
        batch.set(runRef, runData);

        for (const record of employeeRecords) {
            const employeePayrollRef = adminDb
                .collection("schools")
                .doc(user.schoolId)
                .collection("branches")
                .doc(branchId)
                .collection("employees")
                .doc(record.uid)
                .collection("payroll")
                .doc(currentSession);

            const payslipEntry = {
                monthYear,
                status: "draft",
                netPayable: record.netPayable,
                fixedSalary: record.fixedSalary,
                earnings: record.earnings,
                deductions: record.deductions,
                lopDays: record.lopDays,
                lopAmount: record.lopAmount,
                adjustments: record.adjustments || 0,
                paidAmount: 0,
                updatedAt: Timestamp.now()
            };

            batch.set(employeePayrollRef, {
                payslips: FieldValue.arrayUnion(payslipEntry)
            }, { merge: true });
        }
        await batch.commit();

        return NextResponse.json({ success: true, message: "Payrun generated", id: monthYear });
    } catch (err) {
        return NextResponse.json({ message: err.message }, { status: 500 });
    }
}
