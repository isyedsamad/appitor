"use client";

import { useEffect, useState } from "react";
import {
  Layers,
  Plus,
  Tag,
  Calendar,
  ShieldCheck,
  MoreVertical,
  Pencil,
  Ban,
  CheckCircle2,
  X,
} from "lucide-react";
import {
  collection,
  addDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  doc,
} from "firebase/firestore";

import { db } from "@/lib/firebase";
import { useSchool } from "@/context/SchoolContext";
import { useBranch } from "@/context/BranchContext";
import RequirePermission from "@/components/school/RequirePermission";
import secureAxios from "@/lib/secureAxios";
import { toast } from "react-toastify";

export default function FeeHeadsPage() {
  const { schoolUser, setLoading } = useSchool();
  const { branch, branchInfo } = useBranch();
  const [heads, setHeads] = useState([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [menuOpen, setMenuOpen] = useState(null);
  const [form, setForm] = useState({
    name: "",
    category: "academic",
    frequency: "monthly",
    refundable: false,
    type: 'fixed'
  });
  const fetchHeads = async () => {
    if (!schoolUser || !branch) return;
    setLoading(true);
    const ref = collection(
      db,
      "schools",
      schoolUser.schoolId,
      "branches",
      branch,
      "fees",
      "heads",
      "items"
    );
    const snap = await getDocs(query(ref, orderBy("createdAt", "desc")));
    setHeads(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    setLoading(false);
  };
  useEffect(() => {
    if(branch && schoolUser) fetchHeads();
  }, [branch, schoolUser]);
  const saveHead = async () => {
    if (!form.name.trim()) return;
    try {
      setLoading(true);
      if (editing) {
        await secureAxios.patch("/api/school/fees/heads", {
          branch,
          headId: editing.id,
          updates: {
            name: form.name.trim(),
            category: form.category,
            frequency: form.frequency,
            refundable: form.refundable,
            type: form.type
          },
        });
        toast.success('Fee Head Updated!');
      } else {
        await secureAxios.post("/api/school/fees/heads", {
          branch,
          name: form.name.trim(),
          category: form.category,
          frequency: form.frequency,
          refundable: form.refundable,
          type: form.type
        });
        toast.success('Fee Head Added to System!');
      }
      resetModal();
      fetchHeads();
    } catch (err) {
      toast.error('Failed: ' + err.response.data.message);
      console.error("Save Fee Head error:", err);
    } finally {
      setLoading(false);
    }
  };
  const updateStatus = async (headId, status) => {
    try {
      setLoading(true);
      await secureAxios.patch("/api/school/fees/heads", {
        branch,
        headId,
        updates: { status },
      });
      fetchHeads();
      toast.success('Fee Head Updated!');
    } catch (err) {
      toast.error('Failed: ' + err.response.data.message);
      console.error("Update Fee Head status error:", err);
    } finally {
      setLoading(false);
    }
  };
  const resetModal = () => {
    setForm({ name: "", category: "academic", frequency: "monthly", refundable: false, type: 'fixed' });
    setEditing(null);
    setOpen(false);
  };
  return (
    <RequirePermission permission="fee.manage">
      <div className="space-y-5">
        <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-(--primary-soft) text-(--primary)">
              <Layers size={20} />
            </div>
            <div>
              <h1 className="text-xl font-semibold">Fee Heads</h1>
              <p className="text-sm text-(--text-muted)">
                Configure fee types for {branchInfo?.name}
              </p>
            </div>
          </div>

          <button
            onClick={() => setOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg
                       bg-(--primary) text-white shadow-sm hover:opacity-90"
          >
            <Plus size={16} />
            Add Fee Head
          </button>
        </div>
        <div className="bg-(--bg-card) border border-(--border) rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-(--bg) text-(--text-muted)">
                <tr>
                  <th className="px-4 py-3 text-left">Fee Head</th>
                  <th className="px-4 py-3 text-left">Category</th>
                  <th className="px-4 py-3 text-left">Frequency</th>
                  <th className="px-4 py-3 text-left">Type</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="text-right px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {heads.map(h => (
                  <tr
                    key={h.id}
                    className={`border-t border-(--border)
                      ${h.status === "inactive" ? "opacity-60" : "hover:bg-(--bg)"}
                    `}
                  >
                    <td className="px-4 py-3 text-left">
                      <div className="flex items-center gap-3">
                        <span className="font-medium">{h.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-left capitalize">
                      <div className="flex items-center gap-2">
                        <ShieldCheck size={14} />
                        {h.category}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-left capitalize">
                      <div className="flex items-center gap-2">
                        <Calendar size={14} />
                        {h.frequency}
                      </div>
                    </td>
                    <td className="capitalize px-4 py-3 text-left font-medium">
                      {h.type === "flexible" ? (
                        <span className="text-xs px-2 py-1 rounded-md bg-(--warning-soft) text-(--warning)">
                          Flexible
                        </span>
                      ) : (
                        <span className="text-xs px-2 py-1 rounded-md bg-(--accent-soft) text-(--accent)">
                          Fixed
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-left">
                      {h.status === "active" ? (
                        <span
                          className="px-2.5 py-1 rounded-md text-xs font-medium"
                          style={{
                            color: "var(--accent)",
                            background: "var(--accent-soft)",
                          }}
                        >
                          Active
                        </span>
                      ) : (
                        <span
                          className="px-2.5 py-1 rounded-md text-xs font-medium"
                          style={{
                            color: "var(--danger)",
                            background: "var(--danger-soft)",
                          }}
                        >
                          Disabled
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex gap-2 justify-end">
                        <button className="action-btn hover:text-yellow-500" onClick={() => {
                              setEditing(h);
                              setForm({
                                name: h.name,
                                category: h.category,
                                frequency: h.frequency,
                                refundable: h.refundable,
                                type: h.type
                              });
                              setOpen(true);
                              setMenuOpen(null);
                            }}
                        ><Pencil size={15} /></button>
                        {h.status === "active" ? (
                          <button
                            onClick={() => updateStatus(h.id, "inactive")}
                            className="action-btn text-xs font-medium hover:text-red-500"
                          >
                            <Ban size={15} />
                            Disable
                          </button>
                          ) : (
                          <button
                            onClick={() => updateStatus(h.id, "active")}
                            className="action-btn text-xs font-medium hover:text-green-500"
                          >
                            <CheckCircle2 size={14} />
                            Enable
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {heads.length === 0 && (
                  <tr>
                    <td colSpan="6" className="p-10 text-center text-(--text-muted)">
                      No fee heads created yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        {open && (
          <div className="fixed inset-0 bg-black/40 px-5 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="w-full max-w-md bg-(--bg-card) border border-(--border) rounded-xl shadow-xl">
              <div className="flex items-center justify-between bg-(--bg) rounded-t-xl p-5 border-b border-(--border)">
                <h2 className="font-semibold">
                  {editing ? "Edit Fee Head" : "Add Fee Head"}
                </h2>
                <button onClick={resetModal}>
                  <X size={18} />
                </button>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <label className="text-sm text-(--text-muted)">Fee Head Name</label>
                  <input
                    className="input w-full"
                    placeholder="e.g. Tuition Fee"
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm text-(--text-muted)">Category</label>
                  <select
                    className="input w-full"
                    value={form.category}
                    onChange={e =>
                      setForm({ ...form, category: e.target.value })
                    }
                  >
                    <option value="academic">Academic</option>
                    <option value="transport">Transport</option>
                    <option value="hostel">Hostel</option>
                    <option value="misc">Miscellaneous</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm text-(--text-muted)">Frequency</label>
                  <select
                    className="input w-full"
                    value={form.frequency}
                    onChange={e =>
                      setForm({ ...form, frequency: e.target.value })
                    }
                  >
                    <option value="monthly">Monthly</option>
                    <option value="one-time">One Time</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm text-(--text-muted)">Fee Type</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, type: "fixed" })}
                      className={`p-3 rounded-lg border text-sm flex items-center gap-2
                        ${form.type === "fixed"
                          ? "border-(--primary) bg-(--primary-soft)"
                          : "border-(--border)"
                        }`}
                    >
                      <Layers size={16} />
                      Fixed
                    </button>

                    <button
                      type="button"
                      onClick={() => setForm({ ...form, type: "flexible" })}
                      className={`p-3 rounded-lg border text-sm flex items-center gap-2
                        ${form.type === "flexible"
                          ? "border-(--primary) bg-(--primary-soft)"
                          : "border-(--border)"
                        }`}
                    >
                      <Plus size={16} />
                      Flexible
                    </button>
                  </div>
                  {form.type === "flexible" && (
                    <p className="text-xs text-(--text-muted) mt-2">
                      Flexible fees don’t generate dues. Amount is entered during fee collection.
                    </p>
                  )}
                </div>
              </div>
              <div className="p-4 border-t border-(--border) flex justify-end gap-5">
                <button onClick={resetModal} className="btn-secondary">
                  Cancel
                </button>
                <button onClick={saveHead} className="btn-primary">
                  {editing ? "Update" : "Save"}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </RequirePermission>
  );
}
