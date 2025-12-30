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
    const paidAmount = Number(payment.paidAmount);
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

      let remaining = paidAmount;
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
        .map(m => ({
          period: m.key,
          total: Number(m.total),
          headsSnapshot: m.breakdown || [],
        }))
        .sort((a, b) => a.period.localeCompare(b.period));

      for (const { period, total, headsSnapshot } of normalizedMonths) {
        if (remaining <= 0) break;

        const existing = summary.months[period] || {
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

      summary.totals.totalFee = Object.values(summary.months).reduce((s, m) => s + m.total, 0);
      summary.totals.totalDue = summary.totals.totalFee - summary.totals.totalPaid;
      summary.lastPaymentAt = nowServer;
      summary.updatedAt = nowServer;
    
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
