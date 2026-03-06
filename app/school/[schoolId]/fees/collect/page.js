"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, ArrowRight, ArrowLeft, CheckSquare, Square, Trash2, Plus, IndianRupee, User, Wallet, Percent, Layers, ShieldCheck, Info, CheckCircle, Printer, X } from "lucide-react";
import { collection, getDocs, getDoc, query, where, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import secureAxios from "@/lib/secureAxios";
import { useSchool } from "@/context/SchoolContext";
import { useBranch } from "@/context/BranchContext";
import RequirePermission from "@/components/school/RequirePermission";
import { canManage } from "@/lib/school/permissionUtils";
import { toast } from "react-toastify";
import { buildMonthsForSession } from "@/lib/school/fees/monthUtil";
import { generateReceiptPDF } from "@/lib/exports/fees/receiptPdf";
import { formatDateSlash } from "@/lib/dateUtils";

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

  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [savedReceipt, setSavedReceipt] = useState(null);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [pdfOptions, setPdfOptions] = useState({ size: 'a4', copies: 1 });
  const [receiptDocToPrint, setReceiptDocToPrint] = useState(null);

  const getClassName = id => classData.find(c => c.id === id)?.name;
  const getSectionName = (cid, sid) =>
    classData.find(c => c.id === cid)?.sections.find(s => s.id === sid)?.name;
  useEffect(() => {
    if (schoolUser && sessionList && currentSession) {
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
          where("studentId", "==", s.id),
          where("sessionId", "==", sessionId)
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
    } catch (err) {
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
    if (selectedMonths.length == 0 && flexibleItems.length == 0) return [];
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

  const addFlexible = () => {
    const head = flexibleHeads.find(h => h.id === flexForm.headId);
    setFlexibleItems(prev => [
      ...prev,
      { id: Date.now(), headId: head.id, label: head.name, amount: Number(flexForm.amount), type: "flexible" },
    ]);
    setFlexForm({ headId: "", amount: "" });
  };
  const savePayment = async () => {
    if (!student || payable <= 0 || !payment.paidAmount) return;
    const netPayable = payable - discountAmount;
    if (Number(payment.paidAmount) > netPayable) {
      toast.error(`Paid amount should not be more than the net payable (₹${netPayable})`);
      return;
    }
    const totalFlexible = flexibleItems.reduce((s, f) => s + f.amount, 0);
    if (Number(payment.paidAmount) + discountAmount < totalFlexible) {
      toast.error(`Paid amount + discount must cover flexible fees (₹${totalFlexible})`);
      return;
    }
    setLoading(true);
    try {
      const res = await secureAxios.post("/api/school/fees/collect", {
        branch,
        branchInfo,
        appId: student.appId,
        studentId: student.id,
        sessionId,
        months: step2Items.filter(i => i.type === "month"),
        flexibleItems,
        payment,
      });
      setSavedReceipt({
        receiptNo: res.data.receiptNo,
        paidAmount: Number(payment.paidAmount),
        studentId: student.id,
        appId: student.appId,
        studentName: student.name,
        className: student.className,
        section: student.section
      });
      setShowSuccessModal(true);
      toast.success('Fee Submitted!');
    } catch (err) {
      toast.error('Failed: ' + err.response.data.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCloseSuccess = () => {
    setShowSuccessModal(false);
    setSavedReceipt(null);
    searchStudent(appIdSearch);
  };

  const handlePrintRequest = async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, "schools", schoolUser.schoolId, "branches", branch, "fees", "payments", "items"),
        where("receiptNo", "==", savedReceipt.receiptNo)
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        setReceiptDocToPrint(snap.docs[0].data());
        setShowDownloadModal(true);
      } else {
        toast.error("Receipt not found in database.");
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to load receipt details.");
    } finally {
      setLoading(false);
    }
  };

  const confirmDownload = () => {
    if (!receiptDocToPrint || !savedReceipt) return;
    generateReceiptPDF({
      receipt: receiptDocToPrint,
      student: {
        ...savedReceipt,
        name: student.name,
        className: getClassName(student.className),
        sectionName: getSectionName(student.className, student.section),
      },
      schoolUser,
      branchInfo,
      options: pdfOptions
    });
    setShowDownloadModal(false);
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
    }
  };
  const currentPlan = branchInfo?.plan || schoolUser.plan || "trial";
  const editable = canManage(schoolUser, "fee.operations.manage", currentPlan);

  return (
    <RequirePermission permission="fee.operations.view">
      <div className="max-w-7xl mx-auto space-y-5">
        <div className="flex items-start gap-3">
          <div className="p-3 rounded-lg shadow-sm border border-(--primary)/20 bg-(--primary-soft) text-(--primary)">
            <Wallet size={20} />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-(--text)">Collect Fee</h1>
            <p className="text-xs font-semibold text-(--text-muted)">
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
                onKeyDown={e => e.key === "Enter" && searchStudent(e.target.value.toUpperCase())}
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
        {!student && (
          <div className="bg-(--status-m-bg) border border-(--status-m-border) rounded-2xl p-5 md:p-6 mb-6">
            <div className="flex flex-col md:flex-row gap-4 items-start">
              <div className="bg-(--status-m-text)/10 p-3 rounded-full text-(--status-m-text) shrink-0">
                <Info size={24} />
              </div>
              <div>
                <h3 className="text-(--status-m-text) font-semibold text-base mb-1">
                  How to Collect Fees?
                </h3>
                <p className="text-(--status-m-text) text-sm leading-relaxed mb-3">
                  Follow these simple steps to collect fees easily:
                </p>
                <ul className="text-sm text-(--status-m-text) space-y-2 list-none p-0">
                  <li className="flex items-start gap-2">
                    <div className="w-5 h-5 rounded-full bg-(--status-m-text) text-(--status-m-bg) flex items-center justify-center text-xs font-bold shrink-0">1</div>
                    <span>Search for the student using their unique <strong>App ID</strong> (e.g., A2500001) in the search bar above.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-5 h-5 rounded-full bg-(--status-m-text) text-(--status-m-bg) flex items-center justify-center text-xs font-bold shrink-0">2</div>
                    <span>Check the boxes for the <strong>Months</strong> or add any <strong>Flexible Fees</strong> you want to collect.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-5 h-5 rounded-full bg-(--status-m-text) text-(--status-m-bg) flex items-center justify-center text-xs font-bold shrink-0">3</div>
                    <span>Review the total, enter the <strong>Paid Amount</strong> (and discount if any), then click <strong>Save Payment</strong> to generate a receipt.</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}
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
                    <button onClick={() => setStep(2)} className="btn-primary flex gap-2">
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
                                  {editable && (
                                    <Trash2
                                      size={16}
                                      className="cursor-pointer text-(--danger) hover:scale-110 transition"
                                      onClick={() => removeItem(i)}
                                    />
                                  )}
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
                      {editable && (
                        <button onClick={addFlexible} className="font-medium btn-outline text-sm bg-(--bg) hover:bg-(--bg)/50 flex gap-2"><Plus size={16} /> Add to Table</button>
                      )}
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
                    {editable && (
                      <button onClick={savePayment} className="btn-primary font-semibold"><ShieldCheck size={17} /> Save Payment</button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {showSuccessModal && savedReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-(--bg-card) w-full max-w-md rounded-xl border border-(--border) shadow-xl shadow-(--status-p-bg)/20 overflow-hidden transform transition-all animate-in zoom-in-95 duration-200 flex flex-col items-center p-8 text-center relative">
            <button onClick={handleCloseSuccess} className="absolute top-4 right-4 p-2 hover:bg-(--bg-soft) rounded-full text-(--text-muted) transition-colors">
              <X size={20} />
            </button>
            <div className="w-15 h-15 bg-(--status-p-bg) rounded-full flex items-center justify-center mb-6 shadow-md shadow-(--status-p-bg)/40 mt-4">
              <CheckCircle size={25} className="text-(--status-p-text)" />
            </div>
            <h3 className="text-lg font-semibold text-(--status-p-text)">Payment Successful!</h3>
            <p className="text-(--text-muted) font-medium text-sm mb-4">Receipt generated successfully.</p>

            <div className="w-full bg-(--bg-soft) rounded-xl p-4 mb-4 space-y-2 border border-(--border)">
              <div className="flex justify-between items-center text-sm">
                <span className="text-(--text-muted) font-medium">Receipt No.</span>
                <span className="font-semibold text-(--text)">{savedReceipt.receiptNo}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-(--text-muted) font-medium">Amount Paid</span>
                <span className="font-semibold text-(--status-p-text)">₹ {savedReceipt.paidAmount.toLocaleString()}</span>
              </div>
            </div>

            <div className="w-full space-y-3">
              <button
                onClick={handlePrintRequest}
                className="w-full py-3 rounded-lg border border-(--status-p-border) font-semibold text-(status-p-text) shadow-sm transition-transform active:scale-95 flex items-center justify-center gap-2 bg-(--status-p-bg) hover:bg-(--status-p-bg)/60"
              >
                <Printer size={15} /> Print Receipt
              </button>
              <button
                onClick={handleCloseSuccess}
                className="w-full text-sm py-2 font-semibold text-(--text-muted) bg-(--bg-card) border border-(--border) hover:bg-(--bg) transition-colors active:scale-95"
              >
                Close & Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {showDownloadModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-(--bg-card) w-full max-w-md rounded-2xl border border-(--border) shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-(--border) flex justify-between items-center bg-(--bg-soft)">
              <h3 className="font-bold flex items-center gap-2">
                <Printer size={18} className="text-(--primary)" /> Print Receipt Options
              </h3>
              <button onClick={() => setShowDownloadModal(false)} className="p-1.5 hover:bg-(--border) rounded-full">
                <X size={20} />
              </button>
            </div>

            <div className="p-5 space-y-6">
              <div className="space-y-2">
                <p className="text-[11px] font-bold text-(--text-muted) uppercase">Layout Size</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'a4', label: 'Full A4' },
                    { id: '1/2', label: '1/2 A4' },
                  ].map(sz => (
                    <button
                      key={sz.id}
                      onClick={() => setPdfOptions({ ...pdfOptions, size: sz.id, copies: 1 })}
                      className={`p-3 rounded-xl border text-sm font-semibold transition-all
                                          ${pdfOptions.size === sz.id ? "border-(--primary) bg-(--primary-soft) text-(--primary)" : "border-(--border) hover:border-(--text-muted)"}`}
                    >
                      {sz.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-[11px] font-bold text-(--text-muted) uppercase">Copies on Page</p>
                <div className="flex gap-2">
                  {[1, 2, 3, 4].map(num => {
                    const disabled = (pdfOptions.size === 'a4' && num > 1) ||
                      (pdfOptions.size === '1/2' && num > 2) ||
                      (pdfOptions.size === '1/3' && num > 3);
                    return (
                      <button
                        key={num}
                        disabled={disabled}
                        onClick={() => setPdfOptions({ ...pdfOptions, copies: num })}
                        className={`w-10 h-10 rounded-lg border font-bold transition-all flex items-center justify-center
                                          ${pdfOptions.copies === num ? "border-(--primary) bg-(--primary) text-white" : "border-(--border) text-(--text-muted)"}
                                          ${disabled ? "opacity-0 pointer-events-none" : ""}`}
                      >
                        {num}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="bg-(--bg-soft) p-3 rounded-xl border border-(--border) text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-(--text-muted)">Receipt:</span>
                  <span className="font-semibold">{savedReceipt?.receiptNo}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-(--text-muted)">Paid:</span>
                  <span className="font-bold text-(--primary)">₹{savedReceipt?.paidAmount?.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-(--bg-soft) border-t border-(--border)">
              <button
                onClick={confirmDownload}
                className="btn-primary w-full py-3 font-semibold shadow-lg shadow-(--primary-soft)/20"
              >
                Generate PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </RequirePermission>
  );
}
