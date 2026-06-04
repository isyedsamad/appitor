"use client";

import { useEffect, useState, useMemo } from "react";
import { Search, Receipt, User, Calendar, Wallet, RotateCcw, X, ShieldCheck, Hash, Zap, Trash2, IndianRupee, Info } from "lucide-react";
import { useSchool } from "@/context/SchoolContext";
import { useBranch } from "@/context/BranchContext";
import RequirePermission from "@/components/school/RequirePermission";
import { toast } from "react-toastify";
import secureAxios from "@/lib/secureAxios";
import { formatDateSlash } from "@/lib/dateUtils";

export default function ExpensesPage() {
  const { schoolUser, setLoading, currentSession, sessionList } = useSchool();
  const { branch } = useBranch();

  const [sessionId, setSessionId] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showVoidModal, setShowVoidModal] = useState(false);
  const [selectedVoidExpense, setSelectedVoidExpense] = useState(null);

  const [form, setForm] = useState({
    amount: "",
    category: "Snacks & Refreshments",
    remark: "",
    payType: "cash",
    date: new Date().toISOString().split("T")[0],
  });

  const categories = [
    "Snacks & Refreshments",
    "Stationery & Office Supplies",
    "Utilities (Electricity, Water, Internet)",
    "Rent & Maintenance",
    "Travel & Conveyance",
    "Miscellaneous / Others",
  ];

  useEffect(() => {
    if (schoolUser && sessionList && currentSession) {
      setSessionId(currentSession);
    }
  }, [schoolUser, sessionList, currentSession]);

  const loadExpenses = async () => {
    if (!branch || !sessionId) return;
    setLoading(true);
    try {
      const res = await secureAxios.get(`/api/school/finance/expenses?branch=${branch}&sessionId=${sessionId}`);
      setExpenses(res.data.expenses || []);
    } catch (err) {
      toast.error("Failed to load expenses");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (branch && sessionId) {
      loadExpenses();
    }
  }, [branch, sessionId]);

  const triggerAddExpense = () => {
    if (!form.amount || Number(form.amount) <= 0) {
      toast.error("Amount must be greater than 0");
      return;
    }
    if (!form.category) {
      toast.error("Category is required");
      return;
    }
    if (!form.date) {
      toast.error("Date is required");
      return;
    }
    setShowConfirmModal(true);
  };

  const saveExpense = async () => {
    setShowConfirmModal(false);
    setLoading(true);
    try {
      await secureAxios.post("/api/school/finance/expenses", {
        branch,
        sessionId,
        amount: Number(form.amount),
        category: form.category,
        remark: form.remark,
        payType: form.payType,
        date: form.date,
      });
      toast.success("Expense logged successfully");
      setForm({
        amount: "",
        category: "Snacks & Refreshments",
        remark: "",
        payType: "cash",
        date: new Date().toISOString().split("T")[0],
      });
      await loadExpenses();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to log expense");
    } finally {
      setLoading(false);
    }
  };

  const triggerVoidExpense = (expense) => {
    setSelectedVoidExpense(expense);
    setShowVoidModal(true);
  };

  const confirmVoidExpense = async () => {
    if (!selectedVoidExpense) return;
    setShowVoidModal(false);
    setLoading(true);
    try {
      await secureAxios.delete(`/api/school/finance/expenses?branch=${branch}&expenseId=${selectedVoidExpense.id}`);
      toast.success("Voucher voided successfully");
      setSelectedVoidExpense(null);
      await loadExpenses();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to void expense");
    } finally {
      setLoading(false);
    }
  };

  const totals = useMemo(() => {
    let total = 0;
    let cash = 0;
    let upi = 0;
    let others = 0;

    expenses.filter(e => e.status !== "voided").forEach(e => {
      const amt = Number(e.amount || 0);
      total += amt;
      if (e.paymentMode === "cash") cash += amt;
      else if (e.paymentMode === "upi") upi += amt;
      else others += amt;
    });

    return { total, cash, upi, others };
  }, [expenses]);

  return (
    <RequirePermission permission="fee.reports.view">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-3 rounded-lg shadow-sm border border-(--primary)/20 bg-(--primary-soft) text-(--primary)">
              <IndianRupee size={20} />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-(--text)">Expense Vouchers</h1>
              <p className="text-xs font-semibold text-(--text-muted)">
                Log and monitor school general account expenses
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <p className="text-xs text-(--text-muted) font-medium">Session</p>
            <select
              className="input max-w-xs"
              value={sessionId ? sessionId : ""}
              onChange={e => setSessionId(e.target.value)}
            >
              {sessionList &&
                sessionList.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.id}
                    {s.id === sessionId ? " (Current)" : ""}
                  </option>
                ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-(--bg-card) border border-(--border) rounded-2xl p-5 shadow-sm">
            <p className="text-xs font-semibold text-(--text-muted) mb-1">Total Expenses</p>
            <h4 className="text-2xl font-bold text-(--text)">₹ {totals.total.toLocaleString()}</h4>
          </div>
          <div className="bg-(--bg-card) border border-(--border) rounded-2xl p-5 shadow-sm">
            <p className="text-xs font-semibold text-(--text-muted) mb-1">Paid in Cash</p>
            <h4 className="text-2xl font-bold text-green-600">₹ {totals.cash.toLocaleString()}</h4>
          </div>
          <div className="bg-(--bg-card) border border-(--border) rounded-2xl p-5 shadow-sm">
            <p className="text-xs font-semibold text-(--text-muted) mb-1">Paid via UPI</p>
            <h4 className="text-2xl font-bold text-blue-600">₹ {totals.upi.toLocaleString()}</h4>
          </div>
          <div className="bg-(--bg-card) border border-(--border) rounded-2xl p-5 shadow-sm">
            <p className="text-xs font-semibold text-(--text-muted) mb-1">Other Modes</p>
            <h4 className="text-2xl font-bold text-amber-600">₹ {totals.others.toLocaleString()}</h4>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-4 bg-(--bg-card) border border-(--border) rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="font-bold text-sm text-(--text) border-b border-(--border) pb-2">Log New Expense</h3>
            <div className="space-y-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-(--text-muted)">Date</label>
                <input
                  type="date"
                  className="input"
                  value={form.date}
                  onChange={e => setForm({ ...form, date: e.target.value })}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-(--text-muted)">Category</label>
                <select
                  className="input"
                  value={form.category}
                  onChange={e => setForm({ ...form, category: e.target.value })}
                >
                  {categories.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-(--text-muted)">Amount (₹)</label>
                <input
                  type="number"
                  min="0"
                  className="input"
                  placeholder="Enter amount"
                  value={form.amount}
                  onChange={e => setForm({ ...form, amount: e.target.value })}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-(--text-muted)">Payment Mode</label>
                <select
                  className="input"
                  value={form.payType}
                  onChange={e => setForm({ ...form, payType: e.target.value })}
                >
                  <option value="cash">Cash</option>
                  <option value="upi">UPI</option>
                  <option value="card">Card (Debit/Credit)</option>
                  <option value="netbanking">Net Banking</option>
                  <option value="wallet">Wallet (Paytm/PhonePe)</option>
                  <option value="cheque">Cheque</option>
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-(--text-muted)">Remark / Description</label>
                <textarea
                  className="input min-h-[80px]"
                  placeholder="Enter remark"
                  value={form.remark}
                  onChange={e => setForm({ ...form, remark: e.target.value })}
                />
              </div>
              <button
                onClick={triggerAddExpense}
                className="btn-primary w-full py-2.5 font-bold flex gap-2 justify-center items-center mt-2 shadow-md"
              >
                <ShieldCheck size={18} /> Log Expense
              </button>
            </div>
          </div>

          <div className="lg:col-span-8 bg-(--bg-card) border border-(--border) rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-(--bg) border-b border-(--border)">
                  <tr>
                    <th className="px-6 py-4 text-left text-[10px] font-bold text-(--text-muted) uppercase tracking-widest">Date</th>
                    <th className="px-6 py-4 text-left text-[10px] font-bold text-(--text-muted) uppercase tracking-widest">Voucher ID</th>
                    <th className="px-6 py-4 text-left text-[10px] font-bold text-(--text-muted) uppercase tracking-widest">Category</th>
                    <th className="px-6 py-4 text-left text-[10px] font-bold text-(--text-muted) uppercase tracking-widest">Remark</th>
                    <th className="px-6 py-4 text-left text-[10px] font-bold text-(--text-muted) uppercase tracking-widest">Mode</th>
                    <th className="px-6 py-4 text-right text-[10px] font-bold text-(--text-muted) uppercase tracking-widest">Amount</th>
                    <th className="px-6 py-4 text-center text-[10px] font-bold text-(--text-muted) uppercase tracking-widest">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-(--text-muted) font-medium">No expenses logged yet</td>
                    </tr>
                  ) : (
                    expenses.map(e => (
                      <tr key={e.id} className="border-t border-(--border) hover:bg-(--bg-soft)/50 transition-colors">
                        <td className="px-6 py-4 font-semibold text-(--text)">{formatDateSlash(new Date(e.date))}</td>
                        <td className="px-6 py-4 font-bold text-(--text) whitespace-nowrap">{e.voucherNo}</td>
                        <td className="px-6 py-4 font-semibold text-(--text-muted)">{e.category}</td>
                        <td className="px-6 py-4 text-(--text) text-xs truncate max-w-[150px]" title={e.remark}>{e.remark || "-"}</td>
                        <td className="px-6 py-4 capitalize font-semibold text-(--text)">{e.paymentMode}</td>
                        <td className="px-6 py-4 text-right font-bold text-(--text) whitespace-nowrap">₹ {e.amount}</td>
                        <td className="px-6 py-4 text-center">
                          {e.status === "voided" ? (
                            <span className="px-2 py-1 rounded-md text-[10px] font-bold bg-(--status-o-bg) text-(--status-o-text) border border-(--status-o-border)">Voided</span>
                          ) : (
                            <button
                              onClick={() => triggerVoidExpense(e)}
                              className="p-1.5 rounded-lg border border-(--status-o-border) bg-(--status-o-bg)/10 text-(--status-o-text) hover:bg-(--status-o-bg) transition-all"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-(--bg-card) border border-(--border) w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="py-4 px-6 border-b border-(--border) flex justify-between items-center bg-(--bg-soft)/50">
              <h3 className="font-bold text-base text-(--text)">Confirm Expense Voucher</h3>
              <button onClick={() => setShowConfirmModal(false)} className="p-2 hover:bg-(--bg-soft) rounded-xl">
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4 text-sm">
              <div className="border border-(--border) bg-(--bg-soft)/40 rounded-xl p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-(--text-muted) font-medium">Date</span>
                  <span className="font-semibold text-(--text)">{formatDateSlash(new Date(form.date))}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-(--text-muted) font-medium">Category</span>
                  <span className="font-bold text-(--text)">{form.category}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-(--text-muted) font-medium">Payment Mode</span>
                  <span className="font-semibold text-(--text) capitalize">{form.payType}</span>
                </div>
              </div>
              <div className="border border-(--border) rounded-xl p-4 bg-(--bg) space-y-2.5">
                <div className="flex justify-between font-bold text-md text-red-500">
                  <span>Expense Amount</span>
                  <span>₹ {Number(form.amount)}</span>
                </div>
                {form.remark?.trim() && (
                  <div className="flex justify-between font-semibold text-xs text-(--text-muted) border-t border-(--border) pt-2">
                    <span>Remark</span>
                    <span>{form.remark}</span>
                  </div>
                )}
              </div>
            </div>
            <div className="p-4 border-t border-(--border) bg-(--bg-soft)/30 flex justify-end gap-3">
              <button onClick={() => setShowConfirmModal(false)} className="btn-outline px-4 py-2 font-semibold">Cancel</button>
              <button onClick={saveExpense} className="btn-primary px-5 py-2 font-bold shadow-md bg-red-600 border-red-600 hover:bg-red-700">Confirm & Log</button>
            </div>
          </div>
        </div>
      )}

      {showVoidModal && selectedVoidExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-(--bg-card) border border-(--border) w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="py-4 px-6 border-b border-(--border) flex justify-between items-center bg-(--bg-soft)/50">
              <h3 className="font-bold text-base text-(--text)">Void Expense Voucher</h3>
              <button onClick={() => setShowVoidModal(false)} className="p-2 hover:bg-(--bg-soft) rounded-xl">
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4 text-sm">
              <p className="text-(--text-muted) font-medium text-center">
                Are you sure you want to void the selected expense voucher? This will reverse the expense and net balance in the day book, month book, and general ledger.
              </p>
              <div className="border border-(--border) bg-red-500/5 rounded-xl p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-(--text-muted) font-medium">Voucher ID</span>
                  <span className="font-bold text-(--text)">{selectedVoidExpense.voucherNo}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-(--text-muted) font-medium">Amount</span>
                  <span className="font-bold text-red-500">₹ {selectedVoidExpense.amount}</span>
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-(--border) bg-(--bg-soft)/30 flex justify-end gap-3">
              <button onClick={() => setShowVoidModal(false)} className="btn-outline px-4 py-2 font-semibold">Cancel</button>
              <button onClick={confirmVoidExpense} className="btn-primary px-5 py-2 font-bold shadow-md bg-red-600 border-red-600 hover:bg-red-700">Yes, Void Voucher</button>
            </div>
          </div>
        </div>
      )}
    </RequirePermission>
  );
}
