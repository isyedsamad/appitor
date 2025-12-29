import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { verifyUser } from "@/lib/verifyUser";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { formatDate, formatMonth } from "@/lib/dateUtils";

export async function POST(req) {
  try {
    const user = await verifyUser(req, "fee.manage");
    const {branch, branchInfo, studentId, appId, sessionId, months, flexibleItems, payment} = await req.json();
    if (!branch || !studentId || !appId || !sessionId || !payment?.paidAmount || !branchInfo) {
      return NextResponse.json(
        { message: "Invalid payload" },
        { status: 400 }
      );
    }
    const nowTs = Timestamp.now();
    const nowServer = FieldValue.serverTimestamp();
    let remaining = Number(payment.paidAmount);
    const schoolRef = adminDb.collection("schools").doc(user.schoolId);
    const branchRef = schoolRef.collection("branches").doc(branch);
    const counterRef = branchRef
      .collection("fees")
      .doc("counters")
      .collection("items")
      .doc("receipts");

    let receiptNo = "";
    await adminDb.runTransaction(async tx => {
      const snap = await tx.get(counterRef);
      let current = snap.exists ? snap.data().current || 0 : 0;
      const next = current + 1;
      tx.set(
        counterRef,
        { current: next, updatedAt: FieldValue.serverTimestamp() },
        { merge: true }
      );
      receiptNo = `RCPT/${branchInfo.branchCode}/${sessionId}/${String(next).padStart(6, "0")}`;
    });
    const summaryRef = branchRef
      .collection("fees")
      .doc("session_summaries")
      .collection("items")
      .doc(`${studentId}_${sessionId}`);
    const paymentRef = branchRef
      .collection("fees")
      .doc("payments")
      .collection("items")
      .doc();
    const batch = adminDb.batch();
    const summarySnap = await summaryRef.get();
    const summary = summarySnap.exists
      ? summarySnap.data()
      : {
          studentId,
          appId,
          sessionId,
          months: {},
          flexible: [],
          totals: { totalFee: 0, totalPaid: 0, totalDue: 0 },
        };
    const allocations = [];
    const totalFlexible = flexibleItems.reduce(
      (s, f) => s + Number(f.amount),
      0
    );
    if (flexibleItems.length && remaining < totalFlexible) {
      return NextResponse.json(
        { message: "Paid amount must clear flexible fees first" },
        { status: 400 }
      );
    }
    for (const f of flexibleItems) {
      allocations.push({
        type: "flexible",
        id: f.id,
        headId: f.headId,
        label: f.label,
        amount: f.amount,
        paidAt: nowTs,
      });
      summary.flexible.push({
        id: f.id,
        headId: f.headId,
        name: f.label,
        amount: f.amount,
        status: "paid",
        paidAt: nowTs,
      });
      remaining -= f.amount;
      summary.totals.totalPaid += f.amount;
    }
    const normalizedMonths = months.map(m => ({
      period: m.key,
      total: Number(m.total),
      headsSnapshot: m.breakdown || [],
    }));
    const sortedMonths = normalizedMonths.sort(
      (a, b) => a.period.localeCompare(b.period)
    );
    for (const { period, total, headsSnapshot } of sortedMonths) {
      if (remaining <= 0) break;
      const existing =
        summary.months[period] || {
          total,
          paid: 0,
          status: "due",
          lastPaidAt: null,
          headsSnapshot,
        };
      existing.total = total;
      if (!existing.headsSnapshot || !existing.headsSnapshot.length) {
        existing.headsSnapshot = headsSnapshot;
      }
      const pending = existing.total - existing.paid;
      if (pending <= 0) continue;
      const payNow = Math.min(pending, remaining);
      existing.paid += payNow;
      existing.status =
        existing.paid === existing.total ? "paid" : "partial";
      existing.lastPaidAt = nowTs;
      summary.months[period] = existing;
      const duesRef = branchRef
        .collection("fees")
        .doc("dues")
        .collection("items")
        .doc(`${studentId}_${sessionId}_${period}`);
      batch.set(
        duesRef,
        {
          studentId,
          appId,
          sessionId,
          period,
          headsSnapshot: existing.headsSnapshot,
          total: existing.total,
          paid: existing.paid,
          due: existing.total - existing.paid,
          status: existing.status,
          lastPaidAt: nowTs,
          updatedAt: nowServer,
        },
        { merge: true }
      );
      allocations.push({
        type: "month",
        period,
        headsSnapshot: existing.headsSnapshot,
        label: period,
        amount: payNow,
        paidAt: nowTs,
      });
      remaining -= payNow;
      summary.totals.totalPaid += payNow;
    }
    summary.totals.totalFee = Object.values(summary.months).reduce(
      (s, m) => s + m.total,
      0
    );
    summary.totals.totalDue =
      summary.totals.totalFee - summary.totals.totalPaid;
    summary.lastPaymentAt = nowServer;
    summary.updatedAt = nowServer;
    const dayId = formatDate();
    const dayRef = branchRef
      .collection("fees")
      .doc("day_book")
      .collection("items")
      .doc(dayId);
    batch.update(dayRef, {
      date: dayId,
      "collections.total": FieldValue.increment(Number(payment.paidAmount)),
      [`collections.${payment.payType}`]: FieldValue.increment(Number(payment.paidAmount)),
      net: FieldValue.increment(Number(payment.paidAmount)),
      transactions: FieldValue.increment(1),
      updatedAt: nowServer,
    }, { merge: true });
    const ledgerRef = branchRef
      .collection("fees")
      .doc("ledger")
      .collection("items")
      .doc();
    batch.set(ledgerRef, {
      type: "payment",
      direction: "credit",
      amount: Number(payment.paidAmount),
      studentId,
      appId,
      sessionId,
      receiptNo,
      paymentMode: payment.payType || "cash",
      remark: payment.remark || "",
      createdAt: nowServer,
      createdDay: formatDate(),
      createdMonth: formatMonth(),
      createdBy: {
        id: user.uid,
        name: user.name,
        role: user.role,
      },
    });
    batch.set(summaryRef, summary, { merge: true });
    batch.set(paymentRef, {
      receiptNo,
      studentId,
      appId,
      sessionId,
      collectedBy: {
        id: user.uid,
        name: user.name,
        role: user.role,
      },
      items: allocations,
      paidAmount: Number(payment.paidAmount),
      discount: {
        type: payment.discountType,
        value: payment.discountValue || 0,
      },
      remark: payment.remark || "",
      paymentMode: payment.payType || "cash",
      createdAt: nowServer,
    });

    await batch.commit();

    return NextResponse.json({ success: true, receiptNo });
  } catch (err) {
    console.error("Fee collect batch error:", err);
    return NextResponse.json(
      { message: "Failed to collect fee" },
      { status: 500 }
    );
  }
}
