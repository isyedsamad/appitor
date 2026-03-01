import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { verifyUser } from "@/lib/verifyUser";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { formatDate, formatMonth } from "@/lib/dateUtils";

export async function POST(req) {
  try {
    const user = await verifyUser(req, "fee.manage");
    const { branch, paymentId, receiptNo, appId, studentId, sessionId, refundItems, totalRefund, remark, payType } = await req.json();

    if (!branch || !paymentId || !studentId || !sessionId || !refundItems || totalRefund <= 0 || !payType) {
      return NextResponse.json({ message: "Invalid refund payload" }, { status: 400 });
    }

    const nowTs = Timestamp.now();
    const nowServer = FieldValue.serverTimestamp();

    const schoolRef = adminDb.collection("schools").doc(user.schoolId);
    const branchRef = schoolRef.collection("branches").doc(branch);

    const paymentRef = branchRef.collection("fees").doc("payments").collection("items").doc(paymentId);
    const refundRef = branchRef.collection("fees").doc("refunds").collection("items").doc();
    const summaryRef = branchRef.collection("fees").doc("session_summaries").collection("items").doc(`${studentId}_${sessionId}`);

    const dayId = formatDate();
    const monthId = formatMonth();
    const dayRef = branchRef.collection("fees").doc("day_book").collection("items").doc(dayId);
    const monthRef = branchRef.collection("fees").doc("month_book").collection("items").doc(monthId);
    const sessionRef = branchRef.collection("fees").doc("session_book").collection("items").doc(sessionId);
    const refs = [dayRef, monthRef, sessionRef];
    const emptyBook = {
      date: dayId,
      month: monthId,
      session: sessionId,
      collections: { total: 0, cash: 0, upi: 0, card: 0, netbanking: 0, wallet: 0, cheque: 0 },
      refunds: { total: 0, cash: 0, upi: 0, card: 0, netbanking: 0, wallet: 0, cheque: 0 },
      net: 0,
      transactions: 0,
      transactionsCollection: 0,
      transactionsRefund: 0
    };

    await adminDb.runTransaction(async tx => {
      const paymentSnap = await tx.get(paymentRef);
      if (!paymentSnap.exists) throw new Error("PAYMENT_NOT_FOUND");

      const summarySnap = await tx.get(summaryRef);
      if (!summarySnap.exists) throw new Error("SUMMARY_NOT_FOUND");

      const snapshots = await Promise.all(refs.map(ref => tx.get(ref)));
      snapshots.forEach((snap, index) => {
        if (!snap.exists) {
          tx.set(refs[index], {
            ...emptyBook,
            updatedAt: FieldValue.serverTimestamp(),
          });
        }
      });

      const paymentData = paymentSnap.data();
      const paymentItems = paymentData.items || [];
      const summary = summarySnap.data();

      let calculatedTotalRefund = 0;

      for (const [itemKey, refundAmountRaw] of Object.entries(refundItems)) {
        const refundAmount = Number(refundAmountRaw);
        if (isNaN(refundAmount) || refundAmount <= 0) continue;

        const pItem = paymentItems.find(i => (i.type === "month" ? i.period === itemKey : i.id?.toString() === itemKey));

        if (!pItem) {
          throw new Error(`INVALID_ITEM: ${itemKey} not found in this payment.`);
        }

        const maxRefundable = pItem.amount - (pItem.refundedAmount || 0);
        if (refundAmount > maxRefundable) {
          throw new Error(`OVER_REFUND: Cannot refund more than ₹${maxRefundable} for ${itemKey}`);
        }

        pItem.refundedAmount = (pItem.refundedAmount || 0) + refundAmount;
        calculatedTotalRefund += refundAmount;

        if (pItem.type === "month") {
          const duesRef = branchRef
            .collection("fees")
            .doc("dues")
            .collection("items")
            .doc(`${studentId}_${sessionId}_${itemKey}`);

          const duesSnap = await tx.get(duesRef);
          if (duesSnap.exists) {
            const dues = duesSnap.data();
            tx.set(
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

          if (summary.months?.[itemKey]) {
            summary.months[itemKey].paid =
              Math.max(summary.months[itemKey].paid - refundAmount, 0);
            summary.months[itemKey].status = "due";
            summary.months[itemKey].lastRefundAt = nowTs;
          }
        }
        else if (pItem.type === "flexible") {
          const flexIdx = summary.flexible?.findIndex(f => f.id?.toString() === itemKey);
          if (flexIdx !== undefined && flexIdx !== -1 && summary.flexible) {
            summary.flexible[flexIdx].refundedAmount = (summary.flexible[flexIdx].refundedAmount || 0) + refundAmount;
          }
        }

        summary.totals.totalPaid -= refundAmount;
      }

      if (calculatedTotalRefund <= 0) {
        throw new Error("INVALID_REFUND_AMOUNT");
      }

      const totalMonthFees = Object.values(summary.months || {}).reduce((s, m) => s + m.total, 0);
      const totalFlexFees = (summary.flexible || []).reduce((s, f) => s + f.amount, 0);
      summary.totals.totalFee = totalMonthFees + totalFlexFees;
      summary.totals.totalDue = summary.totals.totalFee - summary.totals.totalPaid;
      summary.updatedAt = nowServer;

      for (const ref of refs) {
        tx.update(ref, {
          "refunds.total": FieldValue.increment(calculatedTotalRefund),
          [`refunds.${payType}`]: FieldValue.increment(calculatedTotalRefund),
          net: FieldValue.increment(-calculatedTotalRefund),
          transactions: FieldValue.increment(1),
          transactionsRefund: FieldValue.increment(1),
          updatedAt: FieldValue.serverTimestamp(),
        });
      }

      const refundLedgerRef = branchRef.collection("fees").doc("ledger").collection("items").doc();
      tx.set(refundLedgerRef, {
        type: "refund",
        direction: "debit",
        amount: calculatedTotalRefund,
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

      tx.set(summaryRef, summary, { merge: true });

      tx.set(
        paymentRef,
        {
          items: paymentItems,
          refundedAmount: FieldValue.increment(calculatedTotalRefund),
          lastRefundAt: nowServer,
        },
        { merge: true }
      );

      tx.set(refundRef, {
        paymentId,
        receiptNo,
        studentId,
        appId,
        sessionId,
        refundItems,
        totalRefund: calculatedTotalRefund,
        remark,
        payType,
        refundedBy: {
          id: user.uid,
          name: user.name,
          role: user.role,
        },
        createdAt: nowServer,
      });
    });

    return NextResponse.json({ success: true });

  } catch (err) {
    if (err.message === "PAYMENT_NOT_FOUND") {
      return NextResponse.json({ message: "Payment not found" }, { status: 404 });
    }
    if (err.message === "SUMMARY_NOT_FOUND") {
      return NextResponse.json({ message: "Session summary missing" }, { status: 400 });
    }
    if (err.message === "INVALID_REFUND_AMOUNT" || err.message.startsWith("INVALID_ITEM") || err.message.startsWith("OVER_REFUND")) {
      return NextResponse.json({ message: err.message }, { status: 400 });
    }

    console.error("Refund API error:", err);
    return NextResponse.json({ message: "Refund failed" }, { status: 500 });
  }
}
