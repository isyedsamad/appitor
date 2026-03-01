import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { verifyUser } from "@/lib/verifyUser";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { formatDate, formatMonth } from "@/lib/dateUtils";

export async function POST(req) {
  try {
    const user = await verifyUser(req, "fee.manage");
    const {
      branch,
      branchInfo,
      studentId,
      appId,
      sessionId,
      months,
      flexibleItems,
      payment,
    } = await req.json();

    if (!branch || !studentId || !appId || !sessionId || !payment?.paidAmount || !branchInfo) {
      return NextResponse.json({ message: "Invalid payload" }, { status: 400 });
    }

    const nowTs = Timestamp.now();
    const nowServer = FieldValue.serverTimestamp();
    let paidAmount = Number(payment.paidAmount);
    if (isNaN(paidAmount) || paidAmount <= 0) {
      return NextResponse.json({ message: "Invalid payment amount detected, transactions blocked to protect the ledger." }, { status: 400 });
    }
    let receiptNo = "";

    const schoolRef = adminDb.collection("schools").doc(user.schoolId);
    const branchRef = schoolRef.collection("branches").doc(branch);

    const counterRef = branchRef
      .collection("fees")
      .doc("counters")
      .collection("items")
      .doc("receipts");

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
      transactionsRefund: 0,
    };

    const ledgerRef = branchRef
      .collection("fees")
      .doc("ledger")
      .collection("items")
      .doc();

    await adminDb.runTransaction(async tx => {
      const counterSnap = await tx.get(counterRef);
      const summarySnap = await tx.get(summaryRef);
      const current = counterSnap.exists ? counterSnap.data().current || 0 : 0;
      const next = current + 1;

      const totalFlexibleAmount = flexibleItems.reduce((s, f) => {
        const amt = Number(f.amount);
        if (isNaN(amt) || amt < 0) throw new Error("Invalid flexible fee amount");
        return s + amt;
      }, 0);

      const totalMonths = months.reduce((s, m) => {
        const amt = Number(m.amount);
        if (isNaN(amt) || amt <= 0) throw new Error(`Invalid amount for month: ${m.key || m.period}`);
        return s + amt;
      }, 0);

      const totalFeeToSettle = totalFlexibleAmount + totalMonths;
      const discountValue = Number(payment.discountValue || 0);
      if (isNaN(discountValue) || discountValue < 0) throw new Error("Invalid discount value");

      const discountAmount =
        payment.discountType === "percent"
          ? Math.round((totalFeeToSettle * discountValue) / 100)
          : discountValue;

      const snapshots = await Promise.all(refs.map(ref => tx.get(ref)));
      snapshots.forEach((snap, index) => {
        if (!snap.exists) {
          tx.set(refs[index], {
            ...emptyBook,
            updatedAt: FieldValue.serverTimestamp(),
          });
        }
      });

      for (const ref of refs) {
        tx.update(ref, {
          "collections.total": FieldValue.increment(Number(payment.paidAmount)),
          [`collections.${payment.payType}`]: FieldValue.increment(Number(payment.paidAmount)),
          net: FieldValue.increment(Number(payment.paidAmount)),
          transactions: FieldValue.increment(1),
          transactionsCollection: FieldValue.increment(1),
          updatedAt: FieldValue.serverTimestamp(),
        });
      }

      tx.set(
        counterRef,
        { current: next, updatedAt: nowServer },
        { merge: true }
      );

      receiptNo = `RCPT/${branchInfo.branchCode}/${sessionId}/${String(next).padStart(6, "0")}`;

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

      // let remaining = paidAmount;
      let remaining = paidAmount + discountAmount;
      const allocations = [];

      const totalFlexible = flexibleItems.reduce((s, f) => s + Number(f.amount), 0);
      if (flexibleItems.length && remaining < totalFlexible) {
        throw new Error("Paid amount must clear flexible fees first");
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

      const normalizedMonths = months
        .map(m => {
          const amt = Number(m.amount);
          if (isNaN(amt) || amt <= 0) throw new Error(`Invalid amount for month period`);
          return {
            period: m.key || m.period,
            amount: amt,
            headsSnapshot: m.headsSnapshot || [],
          };
        })
        .sort((a, b) => a.period.localeCompare(b.period));

      for (const { period, amount, headsSnapshot } of normalizedMonths) {
        if (remaining <= 0) break;

        // If the month wasn't in summary before, this means it's the first time it's being paid.
        // We initialize its total using the 'amount' which is effectively 'total due' right now.
        const existing = summary.months[period] || {
          total: amount,
          paid: 0,
          status: "due",
          lastPaidAt: null,
          headsSnapshot,
        };

        // Note: we do NOT intentionally blindly overwrite 'existing.total = amount' because 'amount' 
        // sent from frontend is simply the remainder due mapped from 'step2Items'. The existing 
        // month total should be preserved.
        if (!existing.headsSnapshot || !existing.headsSnapshot.length) {
          existing.headsSnapshot = headsSnapshot;
        }

        const pending = existing.total - existing.paid;
        if (pending <= 0) continue;

        const payNow = Math.min(pending, remaining);
        existing.paid += payNow;
        existing.status = existing.paid === existing.total ? "paid" : "partial";
        existing.lastPaidAt = nowTs;

        summary.months[period] = existing;

        const duesRef = branchRef
          .collection("fees")
          .doc("dues")
          .collection("items")
          .doc(`${studentId}_${sessionId}_${period}`);

        tx.set(
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

      summary.totals.totalDiscount = (summary.totals.totalDiscount || 0) + discountAmount;

      const totalMonthFees = Object.values(summary.months).reduce((s, m) => s + m.total, 0);
      const totalFlexFees = summary.flexible.reduce((s, f) => s + f.amount, 0);

      summary.totals.totalFee = totalMonthFees + totalFlexFees;
      summary.totals.totalDue = summary.totals.totalFee - summary.totals.totalPaid;
      summary.lastPaymentAt = nowServer;
      summary.updatedAt = nowServer;

      if (discountAmount > 0) {
        tx.set(
          branchRef
            .collection("fees")
            .doc("ledger")
            .collection("items")
            .doc(),
          {
            type: "discount",
            direction: "debit",
            amount: discountAmount,
            studentId,
            appId,
            sessionId,
            receiptNo,
            remark: payment.remark || "Fee Discount",
            createdAt: nowServer,
            createdDay: formatDate(),
            createdMonth: formatMonth(),
            createdBy: {
              id: user.uid,
              name: user.name,
              role: user.role,
            },
          }
        );
      }

      tx.set(ledgerRef, {
        type: "payment",
        direction: "credit",
        amount: paidAmount,
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

      tx.set(summaryRef, summary, { merge: true });

      tx.set(paymentRef, {
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
        paidAmount,
        discount: {
          type: payment.discountType,
          value: payment.discountValue || 0,
          amount: discountAmount,
          baseAmount: totalFeeToSettle,
        },
        remark: payment.remark || "",
        paymentMode: payment.payType || "cash",
        createdAt: nowServer,
      });
    });

    return NextResponse.json({ success: true, receiptNo });
  } catch (err) {
    console.error("Fee collect transaction error:", err);
    return NextResponse.json(
      { message: err.message || "Failed to collect fee" },
      { status: 500 }
    );
  }
}
