"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, Receipt, User, Calendar, Wallet, RotateCcw, X, ShieldCheck, Hash, Zap, RefreshCcw } from "lucide-react";
import { collection, getDoc, getDocs, orderBy, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useSchool } from "@/context/SchoolContext";
import { useBranch } from "@/context/BranchContext";
import RequirePermission from "@/components/school/RequirePermission";
import { toast } from "react-toastify";
import secureAxios from "@/lib/secureAxios";
import { formatDateSlash } from "@/lib/dateUtils";

export default function RefundPage() {
  const { schoolUser, setLoading, currentSession, sessionList } = useSchool();
  const { branch, branchInfo } = useBranch();
  const [sessionId, setSessionId] = useState(null);
  const [searchType, setSearchType] = useState("student");
  const [queryText, setQueryText] = useState("");
  const [rows, setRows] = useState([]);
  const [openPayment, setOpenPayment] = useState(null);
  const [refundMap, setRefundMap] = useState({});
  const [refundRemark, setRefundRemark] = useState('');
  const [payType, setPayType] = useState('cash');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  useEffect(() => {
    if (searchType === "receipt") {
      if (branchInfo?.branchCode && currentSession) {
        setQueryText("RCPT/" + branchInfo.branchCode + "/" + currentSession + "/");
      }
    } else {
      setQueryText("");
    }
  }, [searchType, branchInfo, currentSession]);
  useEffect(() => {
    if (schoolUser && sessionList && currentSession) {
      setSessionId(currentSession);
    } else {
      return;
    }
  }, [schoolUser, sessionList, currentSession])
  const searchPayments = async () => {
    if (!queryText.trim()) return;
    setLoading(true);
    setRows([]);
    try {
      let q;
      if (searchType === "receipt") {
        q = query(
          collection(
            db,
            "schools",
            schoolUser.schoolId,
            "branches",
            branch,
            "fees",
            "payments",
            "items"
          ),
          where("receiptNo", "==", queryText.trim())
        );
      } else {
        const qStudent = query(
          collection(db, 'schools', schoolUser.schoolId, 'branches', branch, 'students'),
          where('appId', '==', queryText.toUpperCase().trim()));
        const snapStudent = await getDocs(qStudent);
        if (snapStudent.empty) {
          toast.error('Student Not Found!');
          return;
        }
        const studentData = snapStudent.docs[0].data();
        q = query(
          collection(
            db,
            "schools",
            schoolUser.schoolId,
            "branches",
            branch,
            "fees",
            "payments",
            "items"
          ),
          where("studentId", "==", studentData.uid || snapStudent.docs[0].id),
          where('sessionId', '==', sessionId),
          orderBy('createdAt', 'desc')
        );
      }
      const snap = await getDocs(q);
      setRows(
        snap.docs.map(d => ({
          id: d.id,
          ...d.data(),
        }))
      );
    } finally {
      setLoading(false);
    }
  };
  const groupedByItems = useMemo(() => {
    if (!openPayment) return {};

    return openPayment.items.reduce((acc, i) => {
      const key = i.type === "month" ? i.period : i.id?.toString();
      acc[key] = acc[key] || [];
      acc[key].push(i);
      return acc;
    }, {});
  }, [openPayment]);
  const totalRefund = Object.values(refundMap).reduce(
    (s, v) => s + Number(v || 0),
    0
  );
  const triggerRefund = () => {
    if (!openPayment) {
      toast.error("No payment selected for refund");
      return;
    }
    if (!refundMap || Object.keys(refundMap).length === 0) {
      toast.error("Please enter refund amount");
      return;
    }
    if (totalRefund <= 0) {
      toast.error("Refund amount must be greater than 0");
      return;
    }
    const invalidEntry = Object.entries(refundMap).find(
      ([_, amt]) => Number(amt) < 0
    );
    if (invalidEntry) {
      toast.error("Invalid refund amount detected");
      return;
    }
    if (!refundRemark?.trim()) {
      toast.error("Refund remark is required");
      return;
    }
    setShowConfirmModal(true);
  };

  const executeRefund = async () => {
    setShowConfirmModal(false);
    setLoading(true);
    try {
      await secureAxios.post("/api/school/fees/refund", {
        branch,
        paymentId: openPayment.id,
        receiptNo: openPayment.receiptNo,
        appId: openPayment.appId,
        studentId: openPayment.studentId,
        sessionId: openPayment.sessionId,
        refundItems: refundMap,
        totalRefund,
        remark: refundRemark.trim(),
        payType
      });
      toast.success("Refund processed successfully");
      await searchPayments();
      setOpenPayment(null);
      setRefundMap({});
      setRefundRemark("");
    } catch (err) {
      console.error("Refund error:", err);
      const msg =
        err?.response?.data?.message ||
        "Refund failed. Please try again.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };
  return (
    <RequirePermission permission="fee.operations.view">
      <div className="max-w-7xl mx-auto space-y-4">
        <div className="flex items-start gap-3">
          <div className="p-3 rounded-lg shadow-sm border border-(--primary)/20 bg-(--primary-soft) text-(--primary)">
            <RefreshCcw size={20} />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-(--text)">Fee Refund</h1>
            <p className="text-xs font-semibold text-(--text-muted)">
              Search and refund collected fees
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-4">
          <div className="flex rounded-md overflow-hidden shadow-sm border border-(--border) w-fit bg-(--bg-card)">
            {["student", "receipt"].map(t => (
              <button
                key={t}
                onClick={() => setSearchType(t)}
                className={`px-5 py-2 text-sm font-semibold flex items-center gap-2 transition-all ${searchType === t
                  ? "bg-(--primary) text-white border-(--primary)"
                  : "text-(--text-muted) hover:text-(--text) hover:bg-(--bg-soft)"
                  }
                  ${t === "receipt" ? "rounded-r-md" : "rounded-l-md"}`}
              >
                {t === "receipt" ? (
                  <>
                    <Hash size={15} />
                    <span>Receipt No</span>
                  </>
                ) : (
                  <>
                    <User size={15} />
                    <span>Student ID</span>
                  </>
                )}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-4 items-end py-2">
            {searchType !== "receipt" && (
              <div className="w-full sm:w-auto min-w-[200px]">
                <p className="text-[10px] font-bold uppercase tracking-wider text-(--text-muted)">
                  Academic Session
                </p>
                <select
                  className="input w-full"
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
            )}
            <div className="flex-1 min-w-[250px]">
              <p className="text-[10px] font-bold uppercase tracking-wider text-(--text-muted)">
                {searchType === "receipt" ? "Receipt Number" : "Student ID"}
              </p>
              <input
                className="input w-full"
                placeholder={
                  searchType === "receipt"
                    ? `i.e. RCPT/${branchInfo?.branchCode || "BRN"}/${currentSession || "2025-26"}/001928`
                    : "i.e. A250001"
                }
                value={queryText}
                onChange={e => setQueryText(e.target.value.toUpperCase())}
                onKeyDown={e => e.key === "Enter" && searchPayments()}
              />
            </div>
            <button
              onClick={searchPayments}
              className="btn-primary px-6 py-2.5 h-[42px] w-full sm:w-auto font-semibold flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all"
            >
              <Search size={16} />
              <span>Search Payments</span>
            </button>
          </div>
        </div>
        <div className="bg-(--bg-card) border border-(--border) rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-(--bg) border-b border-(--border)">
                <tr>
                  <th className="px-6 py-4 text-left text-[10px] font-bold text-(--text-muted) uppercase tracking-widest">
                    Date
                  </th>
                  <th className="px-6 py-4 text-left text-[10px] font-bold text-(--text-muted) uppercase tracking-widest">
                    Receipt No
                  </th>
                  <th className="px-6 py-4 text-left text-[10px] font-bold text-(--text-muted) uppercase tracking-widest">
                    Payment Mode
                  </th>
                  <th className="px-6 py-4 text-right text-[10px] font-bold text-(--text-muted) uppercase tracking-widest">
                    Paid Amount
                  </th>
                  <th className="px-6 py-4 text-right text-[10px] font-bold text-(--text-muted) uppercase tracking-widest">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-6 py-10 text-center text-(--text-muted) font-medium"
                    >
                      No receipt found
                    </td>
                  </tr>
                ) : (
                  rows.map(r => (
                    <tr
                      key={r.id}
                      className="border-t border-(--border) hover:bg-(--bg-soft)/50 transition-colors"
                    >
                      <td className="px-6 py-4 font-semibold text-(--text)">
                        {formatDateSlash(r.createdAt?.toDate())}
                      </td>
                      <td className="px-6 py-4 font-semibold text-(--text)">
                        {r.receiptNo}
                      </td>
                      <td className="px-6 py-4 capitalize font-semibold text-(--text)">
                        {r.paymentMode}
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-(--text) whitespace-nowrap">
                        ₹ {r.paidAmount}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          className="px-4 py-1.5 text-xs font-bold bg-(--status-a-bg) text-(--status-a-text) border border-(--status-a-border) rounded-lg shadow-sm hover:opacity-80 transition-all"
                          onClick={() => setOpenPayment(r)}
                        >
                          Refund
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
        {openPayment && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex px-3 items-end md:items-center justify-center">
            <div
              className="bg-(--bg-card) w-full md:max-w-5xl h-[95vh]  rounded-t-2xl md:rounded-2xl border border-(--border) shadow-2xl flex flex-col">
              <div className="flex justify-between items-center px-4 md:px-6 py-4 border-b border-(--border)">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-(--primary-soft) text-(--primary)">
                    <Receipt size={18} />
                  </div>
                  <div>
                    <div className="font-semibold text-base">
                      Refund Receipt
                    </div>
                    <div className="text-xs md:text-sm text-(--text-muted)">
                      {openPayment.receiptNo}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setOpenPayment(null)}
                  className="p-2 hover:bg-(--bg) rounded-lg"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 p-4 md:p-6">
                  <div className="md:col-span-4 space-y-4">
                    <div className="border border-(--border) bg-(--bg) rounded-xl p-4">
                      <div className="text-xs font-semibold text-(--text-muted) mb-1">
                        Collected By
                      </div>
                      <div className="flex items-center gap-2 font-medium">
                        {openPayment.collectedBy?.name}
                      </div>
                      <div className="text-xs font-semibold text-(--text-muted)">
                        {openPayment.collectedBy?.role || 'Admin'}
                      </div>
                    </div>
                    <div className="border border-(--border) rounded-xl p-4 space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-(--text-muted)">Student App ID</span>
                        <span className="font-semibold">{openPayment.appId}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-(--text-muted)">Paid Amount</span>
                        <span className="font-semibold">₹ {openPayment.paidAmount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-(--text-muted)">Payment Mode</span>
                        <span className="capitalize">{openPayment.paymentMode}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-(--text-muted)">Session</span>
                        <span>{openPayment.sessionId}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-(--text-muted)">Collected At</span>
                        <span>
                          {formatDateSlash(openPayment.createdAt.toDate())}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-(--text-muted)">Refund Amount</span>
                        <span className="font-semibold text-red-500">
                          ₹ {totalRefund}
                        </span>
                      </div>
                    </div>
                    <div className="border border-(--border) rounded-xl p-4 flex flex-col gap-3">
                      <div className="flex flex-col gap-1">
                        <p className="text-sm font-medium text-(--status-a-text)">Refund Payment Mode</p>
                        <select
                          className="input"
                          value={payType}
                          onChange={e => setPayType(e.target.value)}
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
                        <div className="text-sm font-medium text-(--status-a-text)">
                          Refund Remark
                        </div>
                        <textarea
                          value={refundRemark}
                          onChange={(e) => setRefundRemark(e.target.value)}
                          className="input min-h-[80px]"
                          placeholder="enter the reason for refund..."
                        />
                      </div>
                    </div>
                  </div>
                  <div className="md:col-span-8 space-y-4">
                    {Object.entries(groupedByItems).map(([periodOrId, items]) => {
                      const item = items[0];
                      const maxRefundable = item.amount - (item.refundedAmount || 0);
                      const isFullyRefunded = maxRefundable <= 0;

                      return (
                        <div
                          key={periodOrId}
                          className="border border-(--border) rounded-xl space-y-3"
                        >
                          <div className="flex bg-(--bg) border-b border-(--border) rounded-t-xl py-3 px-4 flex-col md:flex-row md:justify-between md:items-center gap-1">
                            <div className="font-semibold text-(--primary) text-md">
                              {item.type === "month" ? `Fee Period: ${item.period}` : `Flexible Fee: ${item.label}`}
                            </div>
                            <div className="text-xs font-medium text-(--text-muted)">
                              Paid on {formatDateSlash(item.paidAt.toDate())}
                            </div>
                          </div>
                          <div className="px-5 pb-4 space-y-2">
                            {item.type === "month" && item.headsSnapshot && (
                              <div className="space-y-1 text-xs">
                                {item.headsSnapshot.map(h => (
                                  <div
                                    key={h.headId}
                                    className="flex justify-between"
                                  >
                                    <span className="font-medium text-(--text-muted)">
                                      {h.headName}
                                    </span>
                                    <span className="font-medium">
                                      ₹ {h.amount}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                            <div className="flex justify-between pt-2 mb-1 border-t border-(--border) font-medium text-sm">
                              <span className="text-(--text-muted)">Total Paid</span>
                              <span>₹ {item.amount}</span>
                            </div>
                            <div className="flex justify-between font-medium text-sm pb-2 border-b border-(--border)">
                              <span className="text-(--text-muted)">Already Refunded</span>
                              <span className={item.refundedAmount > 0 ? "text-red-500 font-semibold" : ""}>₹ {item.refundedAmount || 0}</span>
                            </div>
                            <div className="flex flex-col">
                              {isFullyRefunded ? (
                                <div className="px-3 py-2 rounded-lg bg-(--status-p-bg) border border-(--status-p-border) text-center text-(--status-p-text) text-xs font-semibold">
                                  ✓ Fully Refunded
                                </div>
                              ) : (
                                <>
                                  <p className="text-xs font-semibold text-(--status-a-text) mb-1">Refund Amount</p>
                                  <input
                                    type="number"
                                    min={0}
                                    max={maxRefundable}
                                    value={refundMap[periodOrId] || ""}
                                    onChange={(e) => {
                                      let val = Number(e.target.value || 0);
                                      if (val < 0) val = 0;
                                      if (val > maxRefundable) val = maxRefundable;
                                      setRefundMap(prev => ({
                                        ...prev,
                                        [periodOrId]: val || ""
                                      }));
                                    }}
                                    className="input w-full"
                                    placeholder={`Refund amount (max ₹${maxRefundable})`}
                                  />
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
              <div className="flex flex-col md:flex-row justify-end gap-3 px-4 md:px-6 py-4 border-t border-(--border)">
                <button onClick={() => setOpenPayment(null)}
                  className="btn-outline w-full md:w-auto">Cancel</button>
                <button disabled={totalRefund <= 0} onClick={triggerRefund}
                  className="btn-primary font-semibold w-full md:w-auto flex gap-2 items-center">
                  <ShieldCheck size={18} /> Confirm Refund
                </button>
              </div>
            </div>
          </div>
        )}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-(--bg-card) border border-(--border) w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="py-4 px-6 border-b border-(--border) flex justify-between items-center bg-(--bg-soft)/50">
              <h3 className="font-bold text-base text-(--text)">Confirm Fee Refund</h3>
              <button onClick={() => setShowConfirmModal(false)} className="p-2 hover:bg-(--bg-soft) rounded-xl">
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto text-sm">
              <div className="border border-(--border) bg-(--bg-soft)/40 rounded-xl p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-(--text-muted) font-medium">Receipt Number</span>
                  <span className="font-bold text-(--text)">{openPayment.receiptNo}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-(--text-muted) font-medium">Student ID / App ID</span>
                  <span className="font-semibold text-(--text)">{openPayment.appId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-(--text-muted) font-medium">Refund Mode</span>
                  <span className="font-semibold text-(--text) capitalize">{payType}</span>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-(--text-muted)">Refund Breakdown</p>
                <div className="border border-(--border) rounded-xl divide-y divide-(--border) bg-(--bg-soft)/20">
                  {Object.entries(refundMap).filter(([_, amt]) => Number(amt) > 0).map(([periodOrId, amt]) => {
                    const item = openPayment.items.find(i => (i.type === "month" ? i.period === periodOrId : i.id?.toString() === periodOrId));
                    return (
                      <div key={periodOrId} className="flex justify-between p-3">
                        <span className="font-medium text-(--text)">
                          {item?.type === "month" ? `Fee Period: ${item.period}` : `Flexible: ${item?.label || item?.name}`}
                        </span>
                        <span className="font-bold text-red-500">₹ {amt}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="border border-(--border) rounded-xl p-4 bg-(--bg) space-y-2">
                <div className="flex justify-between font-bold text-md text-red-500">
                  <span>Total Refund Amount</span>
                  <span>₹ {totalRefund}</span>
                </div>
                {refundRemark?.trim() && (
                  <div className="flex justify-between font-semibold text-xs text-(--text-muted) border-t border-(--border) pt-2">
                    <span>Remark/Reason</span>
                    <span>{refundRemark}</span>
                  </div>
                )}
              </div>
            </div>
            <div className="p-4 border-t border-(--border) bg-(--bg-soft)/30 flex justify-end gap-3">
              <button onClick={() => setShowConfirmModal(false)} className="btn-outline px-4 py-2 font-semibold">
                Cancel
              </button>
              <button onClick={executeRefund} className="btn-primary px-5 py-2 font-bold shadow-md bg-red-600 border-red-600 hover:bg-red-700">
                Confirm & Refund
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </RequirePermission >
  );
}
