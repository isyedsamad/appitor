import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { verifyUser } from "@/lib/verifyUser";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { formatDate, formatMonth } from "@/lib/dateUtils";

export async function GET(req, { params }) {
    try {
        const { monthYear } = await params;
        const user = await verifyUser(req, "payroll.view");
        const branchId = req.headers.get("x-branch-id");

        if (!branchId) {
            return NextResponse.json({ message: "Branch ID required" }, { status: 400 });
        }

        const runRef = adminDb
            .collection("schools")
            .doc(user.schoolId)
            .collection("branches")
            .doc(branchId)
            .collection("payroll_runs")
            .doc(monthYear);

        const snap = await runRef.get();
        if (!snap.exists) {
            return NextResponse.json({ message: "Payrun not found" }, { status: 404 });
        }
        return NextResponse.json({ id: snap.id, ...snap.data() });
    } catch (err) {
        return NextResponse.json({ message: err.message }, { status: 500 });
    }
}

export async function PATCH(req, { params }) {
    try {
        const { monthYear } = await params;
        const user = await verifyUser(req, "payroll.manage");
        const branchId = req.headers.get("x-branch-id");
        const body = await req.json();

        if (!branchId) {
            return NextResponse.json({ message: "Branch ID required" }, { status: 400 });
        }

        const runRef = adminDb
            .collection("schools")
            .doc(user.schoolId)
            .collection("branches")
            .doc(branchId)
            .collection("payroll_runs")
            .doc(monthYear);

        await adminDb.runTransaction(async (tx) => {
            const snap = await tx.get(runRef);
            if (!snap.exists) throw new Error("Payrun not found");
            const runData = snap.data();

            let updateData = {
                updatedAt: FieldValue.serverTimestamp(),
                updatedBy: user.uid,
            };

            let updatedRecords = body.employeeRecords || runData.employeeRecords;
            let paymentAmount = 0;
            let paymentRemark = "";

            if (body.type === "record_payment") {
                const { uid, amount, method } = body;
                updatedRecords = updatedRecords.map(r => {
                    if (r.uid === uid) {
                        const newPaid = (r.paidAmount || 0) + parseFloat(amount);
                        const status = newPaid >= r.netPayable ? "paid" : "partial";
                        return { ...r, paidAmount: newPaid, status };
                    }
                    return r;
                });
                paymentAmount = parseFloat(amount);
                paymentRemark = `Partial payroll payment for ${monthYear} - ${uid}`;
                updateData.employeeRecords = updatedRecords;
                if (runData.status === "draft") {
                    updateData.status = "partial";
                }
            } else if (body.status === "paid" && runData.status !== "paid") {
                updatedRecords = updatedRecords.map(r => {
                    const remaining = r.netPayable - (r.paidAmount || 0);
                    if (remaining > 0) {
                        paymentAmount += remaining;
                    }
                    return { ...r, paidAmount: r.netPayable, status: "paid" };
                });
                updateData.status = "paid";
                updateData.employeeRecords = updatedRecords;
                paymentRemark = `Full payroll payout for ${monthYear}`;
            } else if (body.employeeRecords) {
                updateData.employeeRecords = body.employeeRecords;
                updateData.totalPayout = body.employeeRecords.reduce((sum, r) => sum + (parseFloat(r.netPayable) || 0), 0);
            }

            const allPaid = updatedRecords.every(r => r.status === "paid");
            if (allPaid && updateData.status !== "paid") {
                updateData.status = "paid";
            }

            const employeePayrollRefs = updatedRecords.map(record => adminDb
                .collection("schools")
                .doc(user.schoolId)
                .collection("branches")
                .doc(branchId)
                .collection("employees")
                .doc(record.uid)
                .collection("payroll")
                .doc(runData.session)
            );

            const dayId = formatDate();
            const monthId = formatMonth();
            const dayRef = adminDb.collection("schools").doc(user.schoolId).collection("branches").doc(branchId).collection("fees").doc("day_book").collection("items").doc(dayId);
            const monthRef = adminDb.collection("schools").doc(user.schoolId).collection("branches").doc(branchId).collection("fees").doc("month_book").collection("items").doc(monthId);

            // 1. ALL READS FIRST
            const [employeeSnaps, daySnap, monthSnap] = await Promise.all([
                Promise.all(employeePayrollRefs.map(ref => tx.get(ref))),
                tx.get(dayRef),
                tx.get(monthRef)
            ]);

            // 2. ALL WRITES AFTER
            tx.update(runRef, updateData);

            employeeSnaps.forEach((snapP, index) => {
                const record = updatedRecords[index];
                if (snapP.exists && record) {
                    const pData = snapP.data();
                    const payslips = pData.payslips || [];
                    const updatedPayslips = payslips.map(ps => {
                        if (ps.monthYear === monthYear) {
                            return {
                                ...ps,
                                netPayable: record.netPayable,
                                fixedSalary: record.fixedSalary,
                                earnings: record.earnings,
                                deductions: record.deductions,
                                lopDays: record.lopDays,
                                lopAmount: record.lopAmount,
                                adjustments: record.adjustments || 0,
                                paidAmount: record.paidAmount || 0,
                                status: record.status || ps.status,
                                updatedAt: Timestamp.now()
                            };
                        }
                        return ps;
                    });
                    tx.update(employeePayrollRefs[index], { payslips: updatedPayslips });
                }
            });

            if (paymentAmount > 0) {
                const initialBook = {
                    collections: { total: 0, cash: 0, upi: 0, card: 0, netbanking: 0, wallet: 0, cheque: 0 },
                    refunds: { total: 0, cash: 0, upi: 0, card: 0, netbanking: 0, wallet: 0, cheque: 0 },
                    expenses: { total: 0, payroll: 0 },
                    net: 0,
                    transactions: 0,
                    updatedAt: FieldValue.serverTimestamp(),
                };

                if (!daySnap.exists) tx.set(dayRef, { ...initialBook, date: dayId });
                if (!monthSnap.exists) tx.set(monthRef, { ...initialBook, month: monthId });

                const bookUpdate = {
                    "expenses.total": FieldValue.increment(paymentAmount),
                    "expenses.payroll": FieldValue.increment(paymentAmount),
                    net: FieldValue.increment(-paymentAmount),
                    updatedAt: FieldValue.serverTimestamp(),
                };

                tx.update(dayRef, bookUpdate);
                tx.update(monthRef, bookUpdate);

                const ledgerRef = adminDb.collection("schools").doc(user.schoolId).collection("branches").doc(branchId).collection("fees").doc("ledger").collection("items").doc();
                tx.set(ledgerRef, {
                    type: "payroll",
                    direction: "debit",
                    amount: paymentAmount,
                    remark: paymentRemark,
                    method: body.method || "cash",
                    createdAt: FieldValue.serverTimestamp(),
                    createdDay: dayId,
                    createdMonth: monthId,
                    createdBy: { id: user.uid, name: user.name, role: user.role }
                });
            }
        });

        return NextResponse.json({ success: true, message: "Payrun updated" });
    } catch (err) {
        console.error("PAYROLL UPDATE ERROR:", err);
        return NextResponse.json({ message: err.message }, { status: 500 });
    }
}

export async function DELETE(req, { params }) {
    try {
        const { monthYear } = await params;
        const user = await verifyUser(req, "payroll.manage");
        const branchId = req.headers.get("x-branch-id");

        if (!branchId) {
            return NextResponse.json({ message: "Branch ID required" }, { status: 400 });
        }

        const runRef = adminDb
            .collection("schools")
            .doc(user.schoolId)
            .collection("branches")
            .doc(branchId)
            .collection("payroll_runs")
            .doc(monthYear);

        const snap = await runRef.get();
        if (!snap.exists) return NextResponse.json({ message: "Not found" }, { status: 404 });
        if (snap.data().status !== 'draft') return NextResponse.json({ message: "Only draft payruns can be deleted" }, { status: 400 });

        const runData = snap.data();

        await adminDb.runTransaction(async (tx) => {
            const records = runData.employeeRecords || [];
            const employeePayrollRefs = records.map(record => adminDb
                .collection("schools")
                .doc(user.schoolId)
                .collection("branches")
                .doc(branchId)
                .collection("employees")
                .doc(record.uid)
                .collection("payroll")
                .doc(runData.session)
            );

            const employeeSnaps = await Promise.all(employeePayrollRefs.map(ref => tx.get(ref)));

            employeeSnaps.forEach((snapP, index) => {
                if (snapP.exists) {
                    const pData = snapP.data();
                    const payslips = pData.payslips || [];
                    const updatedPayslips = payslips.filter(ps => ps.monthYear !== monthYear);
                    tx.update(employeePayrollRefs[index], { payslips: updatedPayslips });
                }
            });
            tx.delete(runRef);
        });

        return NextResponse.json({ success: true });
    } catch (err) {
        return NextResponse.json({ message: err.message }, { status: 500 });
    }
}
