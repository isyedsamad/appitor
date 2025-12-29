import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { verifyUser } from "@/lib/verifyUser";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { formatDate, formatMonth } from "@/lib/dateUtils";

export async function POST(req) {
  try {
    const user = await verifyUser(req, "fee.manage");
    const {branch, paymentId, receiptNo, appId, studentId, sessionId, refundItems, totalRefund, remark, payType} = await req.json();
    if (!branch || !paymentId || !studentId || !sessionId || !refundItems || totalRefund <= 0 || !payType) {
      return NextResponse.json(
        { message: "Invalid refund payload" },
        { status: 400 }
      );
    }
    const nowTs = Timestamp.now();
    const nowServer = FieldValue.serverTimestamp();
    const schoolRef = adminDb.collection("schools").doc(user.schoolId);
    const branchRef = schoolRef.collection("branches").doc(branch);
    const paymentRef = branchRef
      .collection("fees")
      .doc("payments")
      .collection("items")
      .doc(paymentId);
    const refundRef = branchRef
      .collection("fees")
      .doc("refunds")
      .collection("items")
      .doc();
    const summaryRef = branchRef
      .collection("fees")
      .doc("session_summaries")
      .collection("items")
      .doc(`${studentId}_${sessionId}`);
    const batch = adminDb.batch();
    const paymentSnap = await paymentRef.get();
    if (!paymentSnap.exists) {
      return NextResponse.json(
        { message: "Payment not found" },
        { status: 404 }
      );
    }
    const payment = paymentSnap.data();
    const summarySnap = await summaryRef.get();
    if (!summarySnap.exists) {
      return NextResponse.json(
        { message: "Session summary missing" },
        { status: 400 }
      );
    }
    const summary = summarySnap.data();
    for (const [period, refundAmount] of Object.entries(refundItems)) {
      if (refundAmount <= 0) continue;
      const duesRef = branchRef
        .collection("fees")
        .doc("dues")
        .collection("items")
        .doc(`${studentId}_${sessionId}_${period}`);
      const duesSnap = await duesRef.get();
      if (duesSnap.exists) {
        const dues = duesSnap.data();
        batch.set(
          duesRef,
          {
            paid: Math.max((dues.paid || 0) - refundAmount, 0),
            due: (dues.due || 0) + refundAmount,
            status: "due",
            updatedAt: nowServer,
          },
          { merge: true }
        );
      }
      if (summary.months?.[period]) {
        summary.months[period].paid =
          Math.max(summary.months[period].paid - refundAmount, 0);
        summary.months[period].status = "due";
        summary.months[period].lastRefundAt = nowTs;
      }
      summary.totals.totalPaid -= refundAmount;
      summary.totals.totalDue += refundAmount;
    }
    summary.updatedAt = nowServer;
    const dayId = formatDate();
    const dayRef = branchRef
      .collection("fees")
      .doc("day_book")
      .collection("items")
      .doc(dayId);
    batch.update(dayRef, {
      "refunds.total": FieldValue.increment(Number(totalRefund)),
      [`refunds.${payType}`]: FieldValue.increment(Number(totalRefund)),
      net: FieldValue.increment(-Number(totalRefund)),
      updatedAt: nowServer,
    }, { merge: true });
    const refundLedgerRef = branchRef
      .collection("fees")
      .doc("ledger")
      .collection("items")
      .doc();
    batch.set(refundLedgerRef, {
      type: "refund",
      direction: "debit",
      amount: Number(totalRefund),
      studentId,
      appId,
      sessionId,
      receiptNo,
      refundRef: `RFND/${receiptNo}/${refundLedgerRef.id.slice(-4)}`,
      paymentMode: payType || "cash",
      remark,
      linkedPaymentId: paymentId,
      createdAt: nowServer,
      createdDay: formatDate(new Date()),
      createdMonth: formatMonth(new Date()),
      createdBy: {
        id: user.uid,
        name: user.name,
        role: user.role,
      },
    });
    batch.set(summaryRef, summary, { merge: true });
    batch.set(
      paymentRef,
      {
        refundedAmount: FieldValue.increment(totalRefund),
        lastRefundAt: nowServer,
      },
      { merge: true }
    );
    batch.set(refundRef, {
      paymentId,
      receiptNo,
      studentId,
      appId,
      sessionId,
      refundItems,
      totalRefund,
      remark,
      payType,
      refundedBy: {
        id: user.uid,
        name: user.name,
        role: user.role,
      },
      createdAt: nowServer,
    });
    await batch.commit();
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Refund API error:", err);
    return NextResponse.json(
      { message: "Refund failed" },
      { status: 500 }
    );
  }
}
