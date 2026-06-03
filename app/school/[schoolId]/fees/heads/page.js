"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Plus,
  Sparkles,
  Check,
  Ban,
  Tag,
  Calendar,
  ShieldCheck,
  Zap,
  ArrowUp,
  ArrowDown,
  X,
  IndianRupee
} from "lucide-react";
import {
  collection,
  getDocs,
  query,
  orderBy
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
  const [showRecommended, setShowRecommended] = useState(true);
  
  const [newHeadName, setNewHeadName] = useState("");
  const [newHeadCategory, setNewHeadCategory] = useState("academic");
  const [newHeadFrequency, setNewHeadFrequency] = useState("monthly");
  const [newHeadType, setNewHeadType] = useState("fixed");

  const recommendedHeads = [
    { name: "Tuition Fee", category: "academic", frequency: "monthly", type: "fixed", refundable: false },
    { name: "Exam Fee", category: "academic", frequency: "yearly", type: "fixed", refundable: false },
    { name: "Admission Fee", category: "academic", frequency: "one-time", type: "fixed", refundable: false },
    { name: "Transport Fee", category: "transport", frequency: "monthly", type: "fixed", refundable: false },
    { name: "Computer Fee", category: "academic", frequency: "monthly", type: "fixed", refundable: false }
  ];

  const fetchHeads = async () => {
    if (!schoolUser || !branch) return;
    const ref = collection(db, "schools", schoolUser.schoolId, "branches", branch, "fees", "heads", "items");
    const snap = await getDocs(query(ref, orderBy("createdAt", "desc")));
    const fetched = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    const orderKey = `fee_heads_order_${schoolUser.uid}_${branch}`;
    const savedOrder = localStorage.getItem(orderKey);
    if (savedOrder) {
      const orderedIds = JSON.parse(savedOrder);
      fetched.sort((a, b) => {
        const indexA = orderedIds.indexOf(a.id);
        const indexB = orderedIds.indexOf(b.id);
        if (indexA === -1 && indexB === -1) return 0;
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;
        return indexA - indexB;
      });
    }
    setHeads(fetched);
  };

  useEffect(() => {
    if (branch && schoolUser) {
      setLoading(true);
      fetchHeads().finally(() => setLoading(false));
      const hidden = localStorage.getItem(`hide_recommended_heads_${schoolUser.uid}`);
      if (hidden === "true") {
        setShowRecommended(false);
      }
    }
  }, [branch, schoolUser]);

  const addCustomHead = async () => {
    if (!newHeadName.trim()) {
      toast.error("Please enter a fee head name");
      return;
    }
    const nameLower = newHeadName.trim().toLowerCase();
    if (heads.some(h => h.name.toLowerCase() === nameLower && h.status === "active")) {
      toast.error("A fee head with this name already exists");
      return;
    }
    try {
      setLoading(true);
      await secureAxios.post("/api/school/fees/heads", {
        branch,
        name: newHeadName.trim(),
        category: newHeadCategory,
        frequency: newHeadFrequency,
        refundable: false,
        type: newHeadType
      });
      toast.success("Fee head added successfully");
      setNewHeadName("");
      await fetchHeads();
    } catch (err) {
      toast.error("Failed to add fee head");
    } finally {
      setLoading(false);
    }
  };

  const addRecommended = async (rec) => {
    if (heads.some(h => h.name.toLowerCase() === rec.name.toLowerCase() && h.status === "active")) {
      toast.info(`${rec.name} is already added and active`);
      return;
    }
    try {
      setLoading(true);
      await secureAxios.post("/api/school/fees/heads", {
        branch,
        name: rec.name,
        category: rec.category,
        frequency: rec.frequency,
        refundable: rec.refundable,
        type: rec.type
      });
      toast.success(`${rec.name} added to system`);
      await fetchHeads();
    } catch (err) {
      toast.error(`Failed to add ${rec.name}`);
    } finally {
      setLoading(false);
    }
  };

  const toggleHeadStatus = async (headId, currentStatus) => {
    const nextStatus = currentStatus === "active" ? "inactive" : "active";
    try {
      setLoading(true);
      await secureAxios.patch("/api/school/fees/heads", {
        branch,
        headId,
        updates: { status: nextStatus }
      });
      toast.success("Fee head updated");
      await fetchHeads();
    } catch (err) {
      toast.error("Failed to update status");
    } finally {
      setLoading(false);
    }
  };

  const moveHead = (index, direction) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= heads.length) return;
    const updated = [...heads];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;
    setHeads(updated);
    
    if (schoolUser && branch) {
      const orderKey = `fee_heads_order_${schoolUser.uid}_${branch}`;
      const orderedIds = updated.map(h => h.id);
      localStorage.setItem(orderKey, JSON.stringify(orderedIds));
    }
  };

  const dismissRecommended = () => {
    setShowRecommended(false);
    if (schoolUser) {
      localStorage.setItem(`hide_recommended_heads_${schoolUser.uid}`, "true");
    }
  };

  return (
    <RequirePermission permission="fee.setup.view">
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="p-3 rounded-lg shadow-sm border border-(--primary)/20 bg-(--primary-soft) text-(--primary)">
              <IndianRupee size={20} />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-(--text)">Fee Heads</h1>
              <p className="text-xs font-semibold text-(--text-muted)">
                Configure fee heads for {branchInfo?.name}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {showRecommended && (
              <div className="bg-(--bg-card) border border-(--border) rounded-xl p-5 space-y-4 relative">
                <button
                  onClick={dismissRecommended}
                  className="absolute top-4 right-4 p-1 hover:bg-(--bg) rounded-full text-(--text-muted) transition"
                >
                  <X size={16} />
                </button>
                <div className="flex items-center gap-2 text-sm font-bold text-(--text) uppercase tracking-wider">
                  <Sparkles size={16} className="text-(--primary)" /> Recommended Standard Heads
                </div>
                <p className="text-xs text-(--text-muted) font-medium">
                  Fast track setup by adding typical fees below in one click:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {recommendedHeads.map(rec => {
                    const isAdded = heads.some(h => h.name.toLowerCase() === rec.name.toLowerCase() && h.status === "active");
                    return (
                      <div key={rec.name} className="flex justify-between items-center p-3 rounded-lg border border-(--border) bg-(--bg)/50 hover:bg-(--bg) transition">
                        <div>
                          <p className="text-sm font-semibold text-(--text)">{rec.name}</p>
                          <p className="text-[10px] text-(--text-muted) capitalize font-semibold">{rec.frequency} · {rec.category}</p>
                        </div>
                        <button
                          onClick={() => addRecommended(rec)}
                          disabled={isAdded}
                          className={`p-1.5 px-3 rounded-md text-xs font-bold transition ${isAdded
                            ? "bg-(--status-p-bg) text-(--status-p-text) border border-(--status-p-border)"
                            : "bg-(--primary-soft) text-(--primary) hover:bg-(--primary) hover:text-white"
                            }`}
                        >
                          {isAdded ? (
                            <span className="flex items-center gap-1"><Check size={12} /> Added</span>
                          ) : (
                            "+ Add"
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="bg-(--bg-card) border border-(--border) rounded-xl overflow-hidden shadow-sm">
              <div className="p-4 bg-(--bg) border-b border-(--border) flex justify-between items-center">
                <span className="text-sm font-bold text-(--text-muted) uppercase tracking-wider">Active Fee Heads ({heads.filter(h => h.status === "active" && h.type === "fixed").length})</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-(--bg) text-(--text-muted) border-b border-(--border)">
                    <tr>
                      <th className="px-4 py-3 text-left">Name</th>
                      <th className="px-4 py-3 text-left">Category</th>
                      <th className="px-4 py-3 text-left">Frequency</th>
                      <th className="px-4 py-3 text-left">Type</th>
                      <th className="px-4 py-3 text-center w-24">Order</th>
                      <th className="px-4 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-(--border)">
                    {heads.map((h, idx) => (
                      <tr key={h.id} className={`hover:bg-(--bg)/40 transition ${h.status !== "active" ? "opacity-50" : ""}`}>
                        <td className="px-4 py-3 font-semibold text-(--text)">{h.name}</td>
                        <td className="px-4 py-3 capitalize text-(--text-muted) font-semibold">{h.category}</td>
                        <td className="px-4 py-3 capitalize text-(--text-muted) font-semibold">{h.frequency}</td>
                        <td className="px-4 py-3">
                          {h.type === "fixed" ? (
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-(--status-m-bg) text-(--status-m-text)">Fixed</span>
                          ) : (
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-(--status-l-bg) text-(--status-l-text)">Flexible</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex justify-center gap-1">
                            <button
                              disabled={idx === 0}
                              onClick={() => moveHead(idx, -1)}
                              className="p-1 border border-(--border) rounded hover:bg-(--primary-soft) disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                              <ArrowUp size={12} />
                            </button>
                            <button
                              disabled={idx === heads.length - 1}
                              onClick={() => moveHead(idx, 1)}
                              className="p-1 border border-(--border) rounded hover:bg-(--primary-soft) disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                              <ArrowDown size={12} />
                            </button>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => toggleHeadStatus(h.id, h.status)}
                            className={`p-1 px-2.5 rounded text-xs font-bold ${h.status === "active"
                              ? "bg-(--danger-soft) text-(--danger) hover:opacity-85"
                              : "bg-(--status-p-bg) text-(--status-p-text) hover:opacity-85"
                              }`}
                          >
                            {h.status === "active" ? "Disable" : "Enable"}
                          </button>
                        </td>
                      </tr>
                    ))}
                    {heads.length === 0 && (
                      <tr>
                        <td colSpan="6" className="p-8 text-center text-(--text-muted) font-semibold">
                          No fee heads configured yet. Add recommended heads above or write custom ones to start.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="bg-(--bg-card) border border-(--border) rounded-xl p-5 space-y-4 h-fit">
            <div className="flex items-center gap-2 text-sm font-bold text-(--text) uppercase tracking-wider">
              <Plus size={16} className="text-(--primary)" /> Create Custom Head
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-(--text-muted) uppercase block mb-1">Fee Head Name</label>
                <input
                  type="text"
                  className="input w-full"
                  placeholder="e.g. Lab Fee"
                  value={newHeadName}
                  onChange={e => setNewHeadName(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-(--text-muted) uppercase block mb-1">Category</label>
                <select
                  className="input w-full"
                  value={newHeadCategory}
                  onChange={e => setNewHeadCategory(e.target.value)}
                >
                  <option value="academic">Academic</option>
                  <option value="transport">Transport</option>
                  <option value="hostel">Hostel</option>
                  <option value="misc">Miscellaneous</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-(--text-muted) uppercase block mb-1">Frequency</label>
                  <select
                    className="input w-full"
                    value={newHeadFrequency}
                    onChange={e => setNewHeadFrequency(e.target.value)}
                  >
                    <option value="monthly">Monthly</option>
                    <option value="one-time">One Time</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-(--text-muted) uppercase block mb-1">Type</label>
                  <select
                    className="input w-full"
                    value={newHeadType}
                    onChange={e => setNewHeadType(e.target.value)}
                  >
                    <option value="fixed">Fixed</option>
                    <option value="flexible">Flexible</option>
                  </select>
                </div>
              </div>
              <button
                onClick={addCustomHead}
                className="btn-primary w-full mt-2 font-bold justify-center"
              >
                Add Fee Head
              </button>
            </div>
          </div>
        </div>
      </div>
    </RequirePermission>
  );
}
