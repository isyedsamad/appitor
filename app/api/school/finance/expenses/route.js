import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { verifyUser } from "@/lib/verifyUser";
import { FieldValue } from "firebase-admin/firestore";
import { formatDate, formatMonth } from "@/lib/dateUtils";

export async function POST(req) {
  try {
    const body = await req.json();
    const { branch, amount, category, remark, payType, date, sessionId } = body;

    if (!branch || !amount || !category || !payType || !date || !sessionId) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
    }

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return NextResponse.json({ message: "Invalid amount" }, { status: 400 });
    }

    const user = await verifyUser(req, "fee.operations.manage", false, branch);

    const nowServer = FieldValue.serverTimestamp();
    const schoolRef = adminDb.collection("schools").doc(user.schoolId);
    const branchRef = schoolRef.collection("branches").doc(branch);

    const counterRef = branchRef.collection("fees").doc("counters").collection("items").doc("expenses");
    const expenseRef = branchRef.collection("fees").doc("expenses").collection("items").doc();
    const ledgerRef = branchRef.collection("fees").doc("ledger").collection("items").doc();

    const dateObj = new Date(date);
    const dayId = formatDate(dateObj);
    const monthId = formatMonth(dateObj);

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
      expenses: { total: 0, payroll: 0 },
      net: 0,
      transactions: 0,
      transactionsCollection: 0,
      transactionsRefund: 0,
      transactionsExpense: 0
    };

    let voucherNo = "";

    await adminDb.runTransaction(async tx => {
      const [counterSnap, branchSnap, ...bookSnapshots] = await Promise.all([
        tx.get(counterRef),
        tx.get(branchRef),
        ...refs.map(ref => tx.get(ref))
      ]);

      const current = counterSnap.exists ? counterSnap.data().current || 0 : 0;
      const next = current + 1;
      const branchCode = branchSnap.exists ? branchSnap.data().appitorCode || "BRN" : "BRN";

      const yr = dateObj.getFullYear();
      const mo = String(dateObj.getMonth() + 1).padStart(2, "0");
      voucherNo = `EXP/${branchCode.toUpperCase()}/${yr}-${mo}/${String(next).padStart(6, "0")}`;

      tx.set(counterRef, { current: next, updatedAt: nowServer }, { merge: true });

      bookSnapshots.forEach((snap, index) => {
        const ref = refs[index];
        if (!snap.exists) {
          tx.set(ref, {
            ...emptyBook,
            expenses: {
              ...emptyBook.expenses,
              total: numAmount,
            },
            net: -numAmount,
            transactions: 1,
            transactionsExpense: 1,
            updatedAt: nowServer,
          });
        } else {
          tx.update(ref, {
            "expenses.total": FieldValue.increment(numAmount),
            net: FieldValue.increment(-numAmount),
            transactions: FieldValue.increment(1),
            transactionsExpense: FieldValue.increment(1),
            updatedAt: nowServer,
          });
        }
      });

      tx.set(expenseRef, {
        id: expenseRef.id,
        voucherNo,
        amount: numAmount,
        category,
        remark: remark || "",
        paymentMode: payType,
        date,
        sessionId,
        status: "active",
        ledgerId: ledgerRef.id,
        createdAt: nowServer,
        createdDay: dayId,
        createdMonth: monthId,
        createdBy: {
          id: user.uid,
          name: user.name,
          role: user.role,
        },
      });

      tx.set(ledgerRef, {
        type: "expense",
        direction: "debit",
        amount: numAmount,
        receiptNo: voucherNo,
        paymentMode: payType,
        remark: `[${category}] ${remark || ""}`,
        createdAt: nowServer,
        createdDay: dayId,
        createdMonth: monthId,
        createdBy: {
          id: user.uid,
          name: user.name,
          role: user.role,
        },
        linkedExpenseId: expenseRef.id,
      });
    });

    return NextResponse.json({ success: true, voucherNo });
  } catch (err) {
    console.error("Expense POST error:", err);
    return NextResponse.json({ message: "Failed to log expense" }, { status: 500 });
  }
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const branch = searchParams.get("branch");
    const sessionId = searchParams.get("sessionId");

    if (!branch || !sessionId) {
      return NextResponse.json({ message: "Missing branch or sessionId" }, { status: 400 });
    }

    const user = await verifyUser(req, "fee.reports.view", false, branch);

    const schoolRef = adminDb.collection("schools").doc(user.schoolId);
    const branchRef = schoolRef.collection("branches").doc(branch);

    const snap = await branchRef
      .collection("fees")
      .doc("expenses")
      .collection("items")
      .where("sessionId", "==", sessionId)
      .orderBy("createdAt", "desc")
      .get();

    const expenses = snap.docs.map(doc => doc.data());

    return NextResponse.json({ expenses });
  } catch (err) {
    console.error("Expense GET error:", err);
    return NextResponse.json({ message: "Failed to list expenses" }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const { searchParams } = new URL(req.url);
    const branch = searchParams.get("branch");
    const expenseId = searchParams.get("expenseId");

    if (!branch || !expenseId) {
      return NextResponse.json({ message: "Missing branch or expenseId" }, { status: 400 });
    }

    const user = await verifyUser(req, "fee.operations.manage", false, branch);

    const schoolRef = adminDb.collection("schools").doc(user.schoolId);
    const branchRef = schoolRef.collection("branches").doc(branch);

    const expenseRef = branchRef.collection("fees").doc("expenses").collection("items").doc(expenseId);

    const nowServer = FieldValue.serverTimestamp();

    await adminDb.runTransaction(async tx => {
      const expenseSnap = await tx.get(expenseRef);
      if (!expenseSnap.exists) throw new Error("EXPENSE_NOT_FOUND");

      const expenseData = expenseSnap.data();
      if (expenseData.status === "voided") throw new Error("ALREADY_VOIDED");

      const dateObj = new Date(expenseData.date);
      const dayId = formatDate(dateObj);
      const monthId = formatMonth(dateObj);
      const sessionId = expenseData.sessionId;
      const numAmount = Number(expenseData.amount);

      const dayRef = branchRef.collection("fees").doc("day_book").collection("items").doc(dayId);
      const monthRef = branchRef.collection("fees").doc("month_book").collection("items").doc(monthId);
      const sessionRef = branchRef.collection("fees").doc("session_book").collection("items").doc(sessionId);
      const refs = [dayRef, monthRef, sessionRef];

      const bookSnapshots = await Promise.all(refs.map(ref => tx.get(ref)));

      bookSnapshots.forEach((snap, index) => {
        const ref = refs[index];
        if (snap.exists) {
          tx.update(ref, {
            "expenses.total": FieldValue.increment(-numAmount),
            net: FieldValue.increment(numAmount),
            transactions: FieldValue.increment(1),
            transactionsExpense: FieldValue.increment(1),
            updatedAt: nowServer,
          });
        }
      });

      tx.update(expenseRef, {
        status: "voided",
        voidedAt: nowServer,
        voidedBy: {
          id: user.uid,
          name: user.name,
          role: user.role,
        },
      });

      if (expenseData.ledgerId) {
        const ledgerRef = branchRef.collection("fees").doc("ledger").collection("items").doc(expenseData.ledgerId);
        tx.update(ledgerRef, {
          status: "voided",
          voidedAt: nowServer,
          voidedBy: {
            id: user.uid,
            name: user.name,
            role: user.role,
          },
        });
      }
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err.message === "EXPENSE_NOT_FOUND") {
      return NextResponse.json({ message: "Expense not found" }, { status: 404 });
    }
    if (err.message === "ALREADY_VOIDED") {
      return NextResponse.json({ message: "Expense is already voided" }, { status: 400 });
    }
    console.error("Expense DELETE error:", err);
    return NextResponse.json({ message: "Failed to void expense" }, { status: 500 });
  }
}
