"use client";

import { useEffect, useState } from "react";
import {
  LayoutTemplate,
  Plus,
  IndianRupee,
  Trash2,
  Layers,
  X,
  School,
  Hash,
  CalendarRange,
  Info,
} from "lucide-react";
import {
  collection,
  getDocs,
  query,
  orderBy,
} from "firebase/firestore";

import secureAxios from "@/lib/secureAxios";
import { db } from "@/lib/firebase";
import { useSchool } from "@/context/SchoolContext";
import { useBranch } from "@/context/BranchContext";
import RequirePermission from "@/components/school/RequirePermission";
import { toast } from "react-toastify";
import { canManage } from "@/lib/school/permissionUtils";

export default function FeeTemplatesPage() {
  const { schoolUser, setLoading, classData, currentSession } = useSchool();
  const { branch, branchInfo } = useBranch();
  const currentPlan = branchInfo?.plan || schoolUser?.plan || "trial";
  const editable = canManage(schoolUser, "fee.setup.manage", currentPlan);
  const [templates, setTemplates] = useState([]);
  const [feeHeads, setFeeHeads] = useState([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({
    name: "",
    className: "",
    section: "",
  });
  const getClassName = id => classData.find(c => c.id === id)?.name;
  const getSectionName = (cid, sid) =>
    classData.find(c => c.id === cid)?.sections.find(s => s.id === sid)?.name;
  const fetchData = async () => {
    if (!schoolUser || !branch) return;
    setLoading(true);
    const base = ["schools", schoolUser.schoolId, "branches", branch, "fees"];
    const [templateSnap, headSnap] = await Promise.all([
      getDocs(query(
        collection(db, ...base, "templates", "items"),
        orderBy("createdAt", "desc")
      )),
      getDocs(query(
        collection(db, ...base, "heads", "items")
      )),
    ]);
    setTemplates(templateSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    setFeeHeads(
      headSnap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(h => h.status === "active" && h.type === "fixed")
    );
    setLoading(false);
  };
  useEffect(() => {
    if (branch && schoolUser) fetchData();
  }, [branch, schoolUser]);
  function validateItems(items) {
    for (const element of items) {
      if (element.amount === '' || element.amount < 0) {
        toast.error('Invalid Amount of Fee Head!');
        return false;
      }
    }
    return true;
  }
  const saveTemplate = async () => {
    if (!form.name || !form.className || !items.length) {
      toast.error('Enter all required details!')
      return;
    }
    if (!validateItems(items)) {
      return;
    }
    setLoading(true);
    try {
      if (editing) {
        await secureAxios.patch("/api/school/fees/templates", {
          branch,
          academicYear: currentSession,
          templateId: editing.id,
          updates: { ...form, items },
        });
        toast.success('Fee Template Updated!');
      } else {
        await secureAxios.post("/api/school/fees/templates", {
          branch,
          academicYear: currentSession,
          ...form,
          items,
        });
        toast.success('Fee Template Created!');
      }
      resetPopup();
      fetchData();
    } catch (err) {
      toast.error('Failed: ' + err.response.data.message);
    } finally {
      setLoading(false);
    }
  };
  const resetPopup = () => {
    setOpen(false);
    setEditing(null);
    setItems([]);
    setForm({
      name: "",
      className: "",
      section: "",
    });
  };
  const totalAmount = items.reduce(
    (sum, i) => sum + Number(i.amount || 0),
    0
  );
  return (
    <RequirePermission permission="fee.setup.view">
      <div className="space-y-5">
        <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
          <div className="flex items-start gap-3">
            <div className="p-3 rounded-lg shadow-sm border border-(--primary)/20 bg-(--primary-soft) text-(--primary)">
              <LayoutTemplate size={20} />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-(--text)">Fee Templates</h1>
              <p className="text-xs font-semibold text-(--text-muted)">
                Define class-wise fee structures for {branchInfo?.name}
              </p>
            </div>
          </div>
          {editable && (
            <button
              onClick={() => setOpen(true)}
              className="btn-primary flex items-center gap-2"
            >
              <Plus size={16} />
              New Template
            </button>
          )}
        </div>

        {templates.length === 0 && (
          <div className="bg-(--status-m-bg) border border-(--status-m-border) rounded-2xl p-5 md:p-6 mb-6">
            <div className="flex flex-col md:flex-row gap-4 items-start">
              <div className="bg-(--status-m-text)/10 p-3 rounded-full text-(--status-m-text) shrink-0">
                <Info size={24} />
              </div>
              <div>
                <h3 className="text-(--status-m-text) font-semibold text-base mb-1">
                  About Fee Templates
                </h3>
                <p className="text-(--status-m-text) text-sm leading-relaxed mb-3">
                  Fee Templates define the default fee structures (combinations of Fee Heads) for different classes and sections.
                </p>
                <ul className="text-sm text-(--status-m-text) space-y-2 list-none p-0">
                  <li className="flex items-start gap-2">
                    <div className="w-5 h-5 rounded-full bg-(--status-m-text) text-(--status-m-bg) flex items-center justify-center text-xs font-bold shrink-0">1</div>
                    <span><strong>Create Templates:</strong> Click "New Template" to group fixed Fee Heads together (e.g., Tuition, Transport) for a specific class/section.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-5 h-5 rounded-full bg-(--status-m-text) text-(--status-m-bg) flex items-center justify-center text-xs font-bold shrink-0">2</div>
                    <span><strong>Assign Fees:</strong> These templates are then used in the <strong>Fee Assignment</strong> page to quickly attach the entire fee structure to enrolled students.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-5 h-5 rounded-full bg-(--status-m-text) text-(--status-m-bg) flex items-center justify-center text-xs font-bold shrink-0">3</div>
                    <span><strong>Edit Anytime:</strong> Only admins with <code>fee.setup.manage</code> permission can create or change these templates.</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map(t => (
            <div
              key={t.id}
              className="bg-(--bg-card) border border-(--border)
                         rounded-xl p-4 space-y-1 hover:shadow-sm transition"
            >
              <div className="flex justify-between items-start">
                <h3 className="font-medium">{t.name}</h3>
                <span className="text-xs px-2 py-1 rounded-md
                  bg-(--accent-soft) font-semibold text-(--accent)">
                  Active
                </span>
              </div>
              <div className="text-sm text-(--text-muted) font-semibold flex items-center gap-2">
                <School size={14} />
                {getClassName(t.className)}{t.section && ` - ${getSectionName(t.className, t.section)}`}
              </div>
              <div className="text-sm text-(--text-muted) font-semibold flex items-center gap-2">
                <CalendarRange size={14} />
                {t.academicYear}
              </div>
              <div className="border-t border-(--border) pt-3 space-y-1">
                {t.items.map((i, idx) => (
                  <div
                    key={idx}
                    className="flex justify-between text-sm"
                  >
                    <span>{i.headName}</span>
                    <span className="flex items-center gap-1">
                      <IndianRupee size={12} /> {i.amount}
                    </span>
                  </div>
                ))}
              </div>
              <div className="pt-1">
                <div className="text-sm font-semibold flex-1 flex justify-between items-center">
                  <span className="flex-1 text-left">Total:</span>
                  <span>₹ {t.items.reduce((s, i) => s + Number(i.amount), 0)}</span>
                </div>
                {editable && (
                  <div className="flex justify-end">
                    <button
                      onClick={() => {
                        setEditing(t);
                        setForm({
                          name: t.name,
                          className: t.className,
                          section: t.section || "",
                          academicYear: t.academicYear,
                        });
                        setItems(t.items);
                        setOpen(true);
                      }}
                      className="action-btn font-medium text-xs mt-2 text-(--status-l-text) bg-(--status-l-bg)"
                    >
                      Edit Fee Template
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
        {open && (
          <div className="fixed inset-0 bg-black/40 px-5 backdrop-blur-md flex items-center justify-center z-50">
            <div className="w-full max-w-lg bg-(--bg-card) rounded-xl shadow-xl border border-(--border)">
              <div className="flex justify-between items-center p-5 bg-(--bg) rounded-t-xl border-b border-(--border)">
                <h2 className="font-semibold">
                  {editing ? "Edit Fee Template" : "New Fee Template"}
                </h2>
                <X onClick={resetPopup} className="cursor-pointer" />
              </div>
              <div className="p-5 space-y-3 max-h-[70vh] overflow-auto">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-(--text-muted) uppercase tracking-wider">Template Name</label>
                  <input
                    className="input w-full"
                    placeholder="Template Name i.e. Class 11 Science"
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-(--text-muted) uppercase tracking-wider">Class</label>
                    <select
                      className="input w-full"
                      value={form.className}
                      onChange={e => setForm({
                        ...form,
                        className: e.target.value,
                        section: "",
                      })}
                    >
                      <option value="">Select Class</option>
                      {classData.map(c => (
                        <option key={c.name} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-(--text-muted) uppercase tracking-wider">Section (Optional)</label>
                    <select
                      className="input w-full"
                      value={form.section}
                      disabled={!form.className}
                      onChange={e =>
                        setForm({ ...form, section: e.target.value })
                      }
                    >
                      <option value="">All Sections</option>
                      {classData
                        .find(c => c.id === form.className)
                        ?.sections?.map(sec => (
                          <option key={sec.id} value={sec.id}>
                            {sec.name}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-(--text-muted) uppercase tracking-wider">Add Fee Head</label>
                  <select
                    className="input w-full"
                    onChange={e => {
                      const h = feeHeads.find(x => x.id === e.target.value);
                      if (!h) return;
                      setItems([...items, {
                        headId: h.id,
                        headName: h.name,
                        amount: "",
                        frequency: h.frequency,
                      }]);
                    }}
                  >
                    <option value="">+ Add Fee Head</option>
                    {feeHeads.map(h => (
                      <option key={h.id} value={h.id}>
                        {h.name}
                      </option>
                    ))}
                  </select>
                </div>
                {items.map((i, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-3 px-2"
                  >
                    <Layers size={16} />
                    <span className="flex-1 font-semibold">{i.headName}</span>
                    <span>₹</span>
                    <input
                      className="input w-24"
                      placeholder="Amount"
                      value={i.amount}
                      onChange={e => {
                        const arr = [...items];
                        arr[idx].amount = e.target.value;
                        setItems(arr);
                      }}
                    />
                    <div className="p-1 bg-(--status-a-bg) rounded-sm cursor-pointer"
                      onClick={() =>
                        setItems(items.filter((_, x) => x !== idx))
                      }>
                      <Trash2
                        size={16}
                        className="text-(--status-a-text)"
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="py-4 px-6 border-t border-(--border) flex flex-col md:flex-row gap-3 justify-between items-center">
                <span className="text-sm font-medium">
                  Total Amount: ₹{totalAmount}
                </span>
                <div className="flex gap-4">
                  <button onClick={resetPopup} className="btn-secondary">
                    Cancel
                  </button>
                  <button onClick={saveTemplate} className="btn-primary">
                    Save Template
                  </button>
                </div>
              </div>

            </div>
          </div>
        )}

      </div>
    </RequirePermission>
  );
}
