"use client";

import { useEffect, useMemo, useState } from "react";
import {Search, Receipt, User, Calendar, Wallet, RotateCcw, X, ShieldCheck} from "lucide-react";
import {collection, getDoc, getDocs, orderBy, query, where} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useSchool } from "@/context/SchoolContext";
import { useBranch } from "@/context/BranchContext";
import RequirePermission from "@/components/school/RequirePermission";
import { toast } from "react-toastify";
import secureAxios from "@/lib/secureAxios";

export default function RefundPage() {
  const { schoolUser, setLoading, currentSession, sessionList } = useSchool();
  const { branch } = useBranch();
  const [sessionId, setSessionId] = useState(null);
  const [searchType, setSearchType] = useState("student");
  const [queryText, setQueryText] = useState("");
  const [rows, setRows] = useState([]);
  const [openPayment, setOpenPayment] = useState(null);
  const [refundMap, setRefundMap] = useState({});
  const [refundRemark, setRefundRemark] = useState('');
  const [payType, setPayType] = useState('cash');
  useEffect(() => {
    if(schoolUser && sessionList && currentSession) {
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
        if(snapStudent.empty) {
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
          where("studentId", "==", studentData.uid),
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
  const groupedByMonth = useMemo(() => {
    if (!openPayment) return {};

    return openPayment.items.reduce((acc, i) => {
      acc[i.period] = acc[i.period] || [];
      acc[i.period].push(i);
      return acc;
    }, {});
  }, [openPayment]);
  const totalRefund = Object.values(refundMap).reduce(
    (s, v) => s + Number(v || 0),
    0
  );
  const submitRefund = async () => {
    try {
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
      setLoading(true);
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
    <RequirePermission permission="fee.manage">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-(--primary-soft) text-(--primary)">
            <RotateCcw size={20} />
          </div>
          <div>
            <h1 className="text-lg font-semibold">Fee Refund</h1>
            <p className="text-sm text-(--text-muted)">
              Search and refund collected fees
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-4">
          <div className="flex rounded-lg overflow-hidden">
            {["student", "receipt"].map(t => (
              <button
                key={t}
                onClick={() => setSearchType(t)}
                className={`px-4 py-2 text-sm font-medium rounded-none border border-(--border) ${
                  searchType === t
                    ? "bg-(--primary) text-white"
                    : "bg-(--bg-card)"
                }
                  ${t === "receipt" ? "rounded-r-md" : "rounded-l-md"}`}
              >
                {t === "receipt" ? "Receipt No" : "Student App ID"}
              </button>
            ))}
          </div>
          <div className="flex flex-1 flex-col sm:flex-row items-start sm:items-end gap-3">
            {searchType != 'receipt' && (
              <div className="flex flex-col">
                <p className="text-sm text-(--text-muted) font-medium">Session</p>
                <select
                  className="input max-w-xs"
                  value={sessionId ? sessionId : ''}
                  onChange={e => {
                    const id = e.target.value;
                    setSessionId(id);
                  }}
                >
                  {sessionList && sessionList.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.id}
                      {s.id === sessionId ? " (Current)" : ""}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="flex flex-col">
              <p className="text-sm text-(--text-muted) font-medium">{searchType == 'receipt' ? 'Receipt No' : 'Student App ID'}</p>
              <input
                className="input flex-1"
                placeholder={
                  searchType === "receipt"
                    ? "i.e. RCPT/ISM/2025-26/001928"
                    : "i.e. A25000001"
                }
                value={queryText}
                onChange={e => setQueryText(e.target.value)}
                onKeyDown={e => e.key === "Enter" && searchPayments()}
              />
            </div>
            <button onClick={searchPayments} className="btn-primary py-3">
              <Search size={18} />
            </button>
          </div>
        </div>
        <div className="bg-(--bg-card) border border-(--border) rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-(--bg)">
              <tr>
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-left">Receipt</th>
                <th className="px-4 py-3 text-left">Mode</th>
                <th className="px-4 py-3 text-right">Paid</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-6 text-center text-(--text-muted)"
                  >
                    No receipt found
                  </td>
                </tr>
              ) : (
                rows.map(r => (
                  <tr key={r.id} className="border-t border-(--border)">
                    <td className="px-4 py-3">
                      {r.createdAt?.toDate().toLocaleString()}
                    </td>
                    <td className="px-4 py-3">{r.receiptNo}</td>
                    <td className="px-4 py-3 capitalize font-medium">{r.paymentMode}</td>
                    <td className="px-4 py-3 text-right font-semibold whitespace-nowrap">
                      ₹ {r.paidAmount}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        className="btn-outline uppercase text-sm font-semibold"
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
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6 p-4 md:p-6">
                  <div className="md:col-span-4 space-y-4">
                    <div className="border border-(--border) rounded-xl p-4">
                      <div className="text-xs text-(--text-muted) mb-1">
                        Collected By
                      </div>
                      <div className="flex items-center gap-2 font-medium">
                        <User size={14} />
                        {openPayment.collectedBy?.name}
                      </div>
                      <div className="text-xs text-(--text-muted)">
                        {openPayment.collectedBy?.role}
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
                          {openPayment.createdAt.toDate().toLocaleString()}
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
                        <p className="text-sm font-medium text-(--text-muted)">Payment Mode</p>
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
                        <div className="text-sm font-medium text-(--text-muted)">
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
                    {Object.entries(groupedByMonth).map(([period, items]) => (
                      <div
                        key={period}
                        className="border border-(--border) rounded-xl p-4 space-y-3"
                      >
                        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-1">
                          <div className="font-semibold text-sm">
                            Fee Period: {period}
                          </div>
                          <div className="text-xs text-(--text-muted)">
                            Paid on {items[0].paidAt.toDate().toLocaleDateString()}
                          </div>
                        </div>
                        <div className="space-y-1 text-sm">
                          {items[0].headsSnapshot.map(h => (
                            <div
                              key={h.headId}
                              className="flex justify-between"
                            >
                              <span className="text-(--text-muted)">
                                {h.headName}
                              </span>
                              <span className="font-medium">
                                ₹ {h.amount}
                              </span>
                            </div>
                          ))}
                        </div>
                        <div className="flex justify-between pt-2 border-t border-(--border) font-semibold">
                          <span>Total Paid</span>
                          <span>₹ {items[0].amount}</span>
                        </div>
                        <div className="flex flex-col">
                          <p className="text-xs font-medium text-(--text-muted)">Refund Amount</p>
                          <input
                            type="number"
                            min={0}
                            max={items[0].amount}
                            value={refundMap[period] || ""}
                            onChange={(e) => {
                              const val = Number(e.target.value || 0);
                              if (val <= items[0].amount) {
                                setRefundMap(prev => ({
                                  ...prev,
                                  [period]: val
                                }));
                              }
                            }}
                            className="input w-full"
                            placeholder={`Refund amount (max ₹${items[0].amount})`}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex flex-col md:flex-row justify-end gap-3 px-4 md:px-6 py-4 border-t border-(--border)">
                <button onClick={() => setOpenPayment(null)}
                  className="btn-outline w-full md:w-auto">Cancel</button>
                <button disabled={totalRefund <= 0} onClick={submitRefund}
                  className="btn-primary font-semibold w-full md:w-auto flex gap-2 items-center">
                  <ShieldCheck size={18} /> Confirm Refund
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </RequirePermission>
  );
}
