"use client";

import { useEffect, useMemo, useState } from "react";
import {Search, ArrowRight, ArrowLeft, CheckSquare, Square, Trash2, Plus, IndianRupee, User, Wallet, Percent, Layers, ShieldCheck} from "lucide-react";
import {collection, getDocs, getDoc, query, where, doc} from "firebase/firestore";
import { db } from "@/lib/firebase";
import secureAxios from "@/lib/secureAxios";
import { useSchool } from "@/context/SchoolContext";
import { useBranch } from "@/context/BranchContext";
import RequirePermission from "@/components/school/RequirePermission";
import { toast } from "react-toastify";
import { buildMonthsForSession } from "@/lib/school/fees/monthUtil";

export default function FeeCollectionPage() {
  const { schoolUser, loading, setLoading, sessionList, currentSession, classData } = useSchool();
  const { branch, branchInfo } = useBranch();
  const [appIdSearch, setAppIdSearch] = useState('');
  const [sessionId, setSessionId] = useState(null);
  const [sessionMeta, setSessionMeta] = useState(null);
  const [step, setStep] = useState(1);
  const [student, setStudent] = useState(null);
  const [template, setTemplate] = useState(null);
  const [dues, setDues] = useState([]);
  const [minAmount, setMinAmount] = useState(0);
  const [selectedMonths, setSelectedMonths] = useState([]);
  const [flexibleHeads, setFlexibleHeads] = useState([]);
  const [flexibleItems, setFlexibleItems] = useState([]);
  const [flexForm, setFlexForm] = useState({ 
    headId: "",
    amount: ""
  });
  const [payment, setPayment] = useState({
    paidAmount: "",
    payType: "cash",
    discountType: "flat",
    discountValue: "",
    remark: "",
  });
  const getClassName = id => classData.find(c => c.id === id)?.name;
  const getSectionName = (cid, sid) =>
    classData.find(c => c.id === cid)?.sections.find(s => s.id === sid)?.name;
  useEffect(() => {
    if(schoolUser && sessionList && currentSession) {
      setSessionId(currentSession);
      const current = sessionList.find(
        s => s.id === currentSession
      );
      setSessionMeta(current);
    } else {
      return;
    }
  }, [schoolUser, sessionList, currentSession])
  const searchStudent = async (appId) => {
    if (!appId.trim()) return;
    if (!sessionId) {
      toast.error("Please select academic session");
      return;
    }
    setLoading(true);
    setStep(1);
    setStudent(null);
    setTemplate(null);
    setDues([]);
    setSelectedMonths([]);
    setFlexibleItems([]);
    setMinAmount(0);
    setPayment({
      paidAmount: "",
      payType: "cash",
      discountType: "flat",
      discountValue: "",
      remark: "",
    })
    try {
      const sSnap = await getDocs(
        query(
          collection(db, "schools", schoolUser.schoolId, "branches", branch, "students"),
          where("appId", "==", appId.trim())
        )
      );
      if (sSnap.empty) {
        toast.error('No Student Found!');
        return;
      }
      const s = { id: sSnap.docs[0].id, ...sSnap.docs[0].data() };
      setStudent(s);
      const aSnap = await getDocs(
        query(
          collection(db, "schools", schoolUser.schoolId, "branches", branch, "fees", "assignments", "items"),
          where("studentId", "==", s.id),
          where("status", "==", "active")
        )
      );
      if (aSnap.empty) {
        toast.error('Fees is not Assigned to Student!');
        return;
      }
      const assignment = aSnap.docs[0].data();
      const tSnap = await getDoc(
        doc(
          db,
          "schools",
          schoolUser.schoolId,
          "branches",
          branch,
          "fees",
          "templates",
          "items",
          assignment.templateId
        )
      );
      setTemplate(tSnap.data());
      const dSnap = await getDocs(
        query(
          collection(db, "schools", schoolUser.schoolId, "branches", branch, "fees", "dues", "items"),
          where("studentId", "==", s.id)
        )
      );
      setDues(dSnap.docs.map(d => d.data()));
      const hSnap = await getDocs(
        query(
          collection(db, "schools", schoolUser.schoolId, "branches", branch, "fees", "heads", "items"),
          where("type", "==", "flexible"),
          where("status", "==", "active")
        )
      );
      setFlexibleHeads(hSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch(err) {
      toast.error('Failed: ' + err)
    } finally {
      setLoading(false);
    }
  };
  const MONTHS = useMemo(() =>
    buildMonthsForSession(sessionMeta)
  , [sessionMeta]);
  const monthRows = useMemo(() => {
    if (!template || !MONTHS?.length) return [];
    return MONTHS.map(m => {
      const dueEntry = dues.find(d => d.period === m.key);
      if (dueEntry) {
        return {
          ...m,
          breakdown: dueEntry.headsSnapshot || [],
          total: Number(dueEntry.total || 0),
          paid: Number(dueEntry.paid || 0),
          due: Number(dueEntry.total || 0) - Number(dueEntry.paid || 0),
          status: dueEntry.status,
        };
      }
      const applicable = template.items.filter(i => {
        if (i.frequency === "monthly") return true;
        if (i.frequency === "quarterly") return m.q;
        if (i.frequency === "yearly") return m.y;
        return false;
      });
      const total = applicable.reduce((s, i) => s + Number(i.amount), 0);
      return {
        ...m,
        breakdown: applicable,
        total,
        paid: 0,
        due: total,
        status: "due",
      };
    });
  }, [template, dues, MONTHS]);  
  const step1Payable = selectedMonths.reduce(
    (s, k) => s + (monthRows.find(m => m.key === k)?.due || 0),
    0
  );
  const step2Items = useMemo(() => {
    if(selectedMonths.length == 0 && flexibleItems.length == 0) return [];
    const monthItems = selectedMonths.map(k => {
      const m = monthRows.find(x => x.key === k.key);
      return { 
        id: k.key, key: k.key, label: m.label, amount: m.due, type: "month",
        headsSnapshot: m.breakdown.map(b => ({
          headId: b.headId,
          headName: b.headName,
          amount: b.amount,
        }))
      };
    });
    return [...monthItems, ...flexibleItems];
  }, [selectedMonths, flexibleItems]);
  const payable = step2Items.reduce((s, i) => s + i.amount, 0);
  const discountAmount =
    payment.discountType === "percent"
      ? (payable * Number(payment.discountValue || 0)) / 100
      : Number(payment.discountValue || 0);
  const finalDue = payable - discountAmount - Number(payment.paidAmount || 0);
  useEffect(() => {
    console.log(minAmount)
  }, [minAmount])
  const addFlexible = () => {
    if (!flexForm.headId || !flexForm.amount) return;
    setMinAmount(Number(minAmount) + Number(flexForm.amount));
    const head = flexibleHeads.find(h => h.id === flexForm.headId);
    setFlexibleItems(prev => [
      ...prev,
      { id: Date.now(), headId: head.id, label: head.name, amount: Number(flexForm.amount), type: "flexible" },
    ]);
    setFlexForm({ headId: "", amount: "" });
  };
  const savePayment = async () => {
    if (!student || payable <= 0 || !payment.paidAmount) return;
    if(payment.paidAmount > payable) {
      toast.error(`Paid amount should be no be more than ${payable}`);
      return;
    }
    if(minAmount > payment.paidAmount) {
      toast.error(`Paid amount should be more than ${minAmount}`);
      return;
    }
    setLoading(true);
    try {
      await secureAxios.post("/api/school/fees/collect", {
        branch,
        branchInfo,
        appId: student.appId,
        studentId: student.id,
        sessionId,
        months: selectedMonths,
        flexibleItems,
        payment,
      });
      searchStudent(appIdSearch);
      toast.success('Fee Submitted!');
    } catch(err) {
      toast.error('Failed: ' + err.response.data.message);
    } finally {
      setLoading(false);
    }
  };
  const removeItem = (item) => {
    if (item.type === "month") {
      setSelectedMonths(prev =>
        prev.filter(m => m.key !== item.key)
      );
    }
    if (item.type === "flexible") {
      setFlexibleItems(prev =>
        prev.filter(f => f.id !== item.id)
      );
      setMinAmount(minAmount - item.amount);
    }
  };
  return (
    <RequirePermission permission="fee.manage">
      <div className="max-w-7xl mx-auto space-y-5">
        <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-(--primary-soft) text-(--primary)">
              <IndianRupee size={20} />
            </div>
          <div>
            <h1 className="text-lg font-semibold">Collect Fee</h1>
            <p className="text-sm text-(--text-muted)">
              Fee Collection Page
            </p>
          </div>
        </div>
        <div className="flex flex-col md:flex-row justify-start md:justify-between items-center gap-4">
          <div className="flex flex-col gap-1">
            <p className="text-sm text-(--text-muted) font-medium">Search by App ID</p>
            <div className="flex max-w-sm gap-3">
              <input
                className="input flex-1"
                value={appIdSearch}
                onChange={(e) => {
                  setAppIdSearch(e.target.value.toUpperCase());
                }}
                placeholder="i.e. A2500001"
                onKeyDown={e =>e.key === "Enter" && searchStudent(e.target.value.toUpperCase())}
              />
              <button className="btn-primary" onClick={() => searchStudent(appIdSearch)}>
                <Search size={18} />
              </button>
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <p className="text-sm text-(--text-muted) font-medium">Session</p>
            <select
              className="input max-w-xs"
              value={sessionId ? sessionId : ''}
              onChange={e => {
                const id = e.target.value;
                setSessionId(id);
                setSessionMeta(sessionList && sessionList.find(s => s.id === id));
                setSelectedMonths([]);
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
        </div>
        {student && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            <div className="space-y-4 lg:sticky lg:top-4 h-fit">
              <div className="bg-(--bg-card) border border-(--border) rounded-xl">
                <div className="flex items-center gap-2 bg-(--bg) p-4 rounded-t-xl text-sm font-semibold text-(--text-muted)">
                  <User size={16} /> Student
                </div>
                <div className="text-sm space-y-2 p-4">
                  <div className="flex justify-between"><span>Name</span><span className="font-medium capitalize">{student.name}</span></div>
                  <div className="flex justify-between"><span>App ID</span><span>{student.appId}</span></div>
                  <div className="flex justify-between"><span>Class</span><span>{getClassName(student.className)} - {getSectionName(student.className, student.section)}</span></div>
                </div>
              </div>
              <div className="bg-(--bg-card) border border-(--border) rounded-xl">
                <div className="flex items-center gap-2 bg-(--bg) p-4 rounded-t-xl text-sm font-semibold text-(--text-muted)">
                  <Wallet size={16} /> Summary
                </div>
                <div className="text-sm space-y-2 p-4">
                <div className="flex justify-between text-sm"><span>Payable:</span><span className="font-semibold whitespace-nowrap">₹ {payable}</span></div>
                <div className="flex justify-between text-sm"><span>Discount:</span><span className="font-semibold whitespace-nowrap">₹ {discountAmount}</span></div>
                <div className="flex justify-between text-sm"><span>Paid:</span><span className="font-semibold whitespace-nowrap">₹ {payment.paidAmount || 0}</span></div>
                <hr className="border-(--border)" />
                <div className="flex justify-between font-semibold text-(--danger)">
                  <span>Dues:</span><span className="whitespace-nowrap">₹ {finalDue}</span>
                </div>
                </div>
              </div>
            </div>
            <div className="lg:col-span-3 space-y-4">
              {step === 1 && (
                <div className="bg-(--bg-card) border border-(--border) rounded-xl overflow-hidden">
                  <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-(--bg)">
                      <tr>
                        <th className="px-4 py-3"></th>
                        <th className="px-4 py-3 text-left">Month</th>
                        <th className="px-4 py-3 text-left">Fee Breakdown</th>
                        <th className="px-4 py-3 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {monthRows.map(m => (
                        <tr key={m.key} className="border-t border-(--border) hover:bg-(--bg)">
                          <td className="px-4 py-3">
                            {Number(m.total) == Number(m.paid) ? 
                              <ShieldCheck onClick={() => {
                                setSelectedMonths(prev => prev.filter(x => x.key !== m.key))
                              }} className="cursor-pointer text-green-500" />
                            : selectedMonths.includes(m)
                              ? <CheckSquare onClick={() => {
                                setSelectedMonths(prev => prev.filter(x => x.key !== m.key))
                              }} className="cursor-pointer text-(--primary)" />
                              : <Square onClick={() => {
                                m.due > 0 && setSelectedMonths(prev => [...prev, m])
                              }} className="cursor-pointer" />}
                          </td>
                          <td className="px-4 py-3 text-left font-semibold">{m.label}</td>
                          <td className="px-4 py-3 text-xs text-(--text-muted) text-left space-y-1 font-medium">
                            {m.breakdown.map(b => <div key={b.headId}>{b.headName}: <span className="whitespace-nowrap">₹ {b.amount}</span></div>)}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold">
                            <div className="flex justify-center flex-col items-end gap-1">
                              {m.paid > 0
                                ? Number(m.total) == Number(m.paid) 
                                  ? (<span className="py-1 px-2 rounded-md text-(--status-p-text) bg-(--status-p-bg) whitespace-nowrap">₹ {Number(m.total) - Number(m.paid)}</span>)
                                  : (<span className="py-1 px-2 rounded-md text-(--status-a-text) bg-(--status-a-bg) whitespace-nowrap">₹ {Number(m.total) - Number(m.paid)}</span>)
                                : (<span className="whitespace-nowrap">₹ {m.total}</span>)}
                              {m.paid > 0 && <div className="text-xs text-(--warning) whitespace-nowrap">Paid: ₹ {m.paid}</div>}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  </div>
                  <div className="flex justify-end p-4">
                    <button disabled={!selectedMonths.length} onClick={() => setStep(2)} className="btn-primary flex gap-2">
                      Continue <ArrowRight size={16} />
                    </button>
                  </div>
                </div>
              )}
              {step === 2 && (
                <>
                  <div className="bg-(--bg-card) border border-(--border) rounded-xl overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-(--bg)">
                          <tr>
                            <th className="px-4 py-3 text-left">Fee Type</th>
                            <th className="px-4 py-3 text-left">Period</th>
                            <th className="px-4 py-3 text-right">Amount</th>
                            <th className="px-4 py-3 text-right">Remove</th>
                          </tr>
                        </thead>
                        <tbody>
                          {step2Items.map(i => (
                            <tr key={i.id} className="border-t border-(--border)">
                              <td className="px-4 py-3 text-left font-semibold">{i.type === "month" ? "Monthly Fee" : i.label}</td>
                              <td className="px-4 py-3 text-left font-semibold">{i.type === "month" ? i.label : "—"}</td>
                              <td className="px-4 py-3 text-right font-semibold whitespace-nowrap">₹ {i.amount}</td>
                              <td className="px-4 py-3">
                                <div className="flex justify-end">
                                <Trash2
                                  size={16}
                                  className="cursor-pointer text-(--danger) hover:scale-110 transition"
                                  onClick={() => removeItem(i)}
                                />
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  <div className="bg-(--bg-card) border border-(--border) rounded-xl flex flex-col">
                    <div className="flex items-center gap-2 bg-(--bg) p-4 rounded-t-xl text-sm font-semibold text-(--text-muted)">
                      <Layers size={15} /> Add Fee Head to Pay
                    </div>
                    <div className="grid md:grid-cols-3 gap-4 p-5 items-end">
                      <div className="flex flex-col gap-1">
                        <p className="text-sm font-medium text-(--text-muted)">Fee Heads</p>
                        <select className="input" value={flexForm.headId} onChange={e => setFlexForm({ ...flexForm, headId: e.target.value })}>
                          <option value="">Select Flexible Fee</option>
                          {flexibleHeads.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                        </select>
                      </div>
                      <div className="flex flex-col gap-1">
                        <p className="text-sm font-medium text-(--text-muted)">Amount (in ₹)</p>
                        <input type="number" onWheel={(e) => e.preventDefault()} className="input" placeholder="i.e. 500" value={flexForm.amount} onChange={e => setFlexForm({ ...flexForm, amount: e.target.value })} />
                      </div>
                      <button onClick={addFlexible} className="font-medium btn-outline text-sm bg-(--bg) hover:bg-(--bg)/50 flex gap-2"><Plus size={16} /> Add to Table</button>
                    </div>
                  </div>
                  <div className="bg-(--bg-card) border border-(--border) rounded-xl">
                    <div className="flex items-center gap-2 bg-(--bg) p-4 rounded-t-xl text-sm font-semibold text-(--text-muted)">
                      <IndianRupee size={15} /> Payment Details
                    </div>
                    <div className="p-5 space-y-3">
                      <div className="grid grid-col-1 md:grid-cols-2 gap-2 md:gap-4">
                        <div className="flex flex-col gap-1">
                          <p className="text-sm font-medium text-(--text-muted)">Amount Paid (in ₹)</p>
                          <input
                            type="number" onWheel={(e) => e.preventDefault()}
                            className="input"
                            placeholder="i.e. 1200"
                            value={payment.paidAmount}
                            onChange={e => setPayment({ ...payment, paidAmount: e.target.value })}
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <p className="text-sm font-medium text-(--text-muted)">Payment Mode</p>
                          <select
                            className="input"
                            value={payment.payType}
                            onChange={e => setPayment({ ...payment, payType: e.target.value })}
                          >
                            <option value="cash">Cash</option>
                            <option value="upi">UPI / QR</option>
                            <option value="card">Card (Debit/Credit)</option>
                            <option value="netbanking">Net Banking</option>
                            <option value="wallet">Wallet (Paytm/PhonePe)</option>
                            <option value="cheque">Cheque</option>
                          </select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 md:gap-4">
                        <div className="flex flex-col gap-1">
                          <p className="text-sm font-medium text-(--text-muted)">Discount Type</p>
                          <select
                            className="input"
                            value={payment.discountType}
                            onChange={e => setPayment({ ...payment, discountType: e.target.value })}
                          >
                            <option value="flat">₹ (in Rupees)</option>
                            <option value="percent">% (in Percentage)</option>
                          </select>
                        </div>
                        <div className="flex flex-col gap-1">
                          <p className="text-sm font-medium text-(--text-muted)">Discount Value</p>
                          <input
                            type="number" onWheel={(e) => e.preventDefault()}
                            className="input"
                            placeholder="i.e. 10 or 550"
                            value={payment.discountValue}
                            onChange={e => setPayment({ ...payment, discountValue: e.target.value })}
                          />
                        </div>
                      </div>
                      <div className="flex flex-col gap-1">
                        <p className="text-sm font-medium text-(--text-muted)">Remark (if any)</p>
                        <textarea
                          className="input"
                          placeholder="Remark"
                          onChange={e => setPayment({ ...payment, remark: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <button onClick={() => setStep(1)} className="btn-secondary flex gap-2"><ArrowLeft size={16} /> Back</button>
                    <button onClick={savePayment} className="btn-primary font-semibold"><ShieldCheck size={17} /> Save Payment</button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </RequirePermission>
  );
}
