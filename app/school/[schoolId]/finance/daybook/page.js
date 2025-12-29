"use client";

import { useEffect, useState } from "react";
import {
  BookOpen,
  Calendar,
  Wallet,
  IndianRupee,
  ArrowDownLeft,
  ArrowUpRight,
  RefreshCcw,
} from "lucide-react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useSchool } from "@/context/SchoolContext";
import { useBranch } from "@/context/BranchContext";
import RequirePermission from "@/components/school/RequirePermission";
import { toast } from "react-toastify";
import { formatDate } from "@/lib/dateUtils";

export default function DayBookPage() {
  const { schoolUser, setLoading } = useSchool();
  const { branch } = useBranch();

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [dayBook, setDayBook] = useState(null);

  const loadDayBook = async (dateObj) => {
    const key = formatDate(dateObj);
    setLoading(true);

    try {
      const ref = doc(
        db,
        "schools",
        schoolUser.schoolId,
        "branches",
        branch,
        "fees",
        "day_book",
        "items",
        key
      );

      const snap = await getDoc(ref);
      setDayBook(snap.exists() ? snap.data() : null);
    } catch (e) {
      toast.error("Failed to load day book");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    if(schoolUser && branch) loadDayBook(selectedDate);
  }, [schoolUser, branch]);
  return (
    <RequirePermission permission="fee.view">
      <div className="max-w-7xl mx-auto space-y-5">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-(--primary-soft) text-(--primary)">
            <BookOpen size={20} />
          </div>
          <div>
            <h1 className="text-lg font-semibold">Day Book</h1>
            <p className="text-sm text-(--text-muted)">
              Daily fee collection & refund summary
            </p>
          </div>
        </div>
        <div className="flex justify-between items-end">
          <div className="flex flex-col">
            <p className="text-sm text-(--text-muted)">Select Date</p>
            <input
              type="date"
              className="input"
              value={selectedDate.toISOString().split("T")[0]}
              onChange={(e) => {
                const d = new Date(e.target.value);
                setSelectedDate(d);
                loadDayBook(d);
              }}
            />
          </div>
          <button
            onClick={() => loadDayBook(selectedDate)}
            className="btn-outline flex gap-2"
          >
            <RefreshCcw size={16} className="text-green-500" />
            Refresh
          </button>
        </div>
        {!dayBook && (
          <div className="bg-(--bg-card) border border-(--border) rounded-xl py-16 text-center text-(--text-muted)">
            No transactions recorded for this day
          </div>
        )}
        {dayBook && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <StatCard
                label="Total Collection"
                value={dayBook.collections?.total || 0}
                icon={Wallet}
                color="text-green-600"
              />
              <StatCard
                label="Total Refund"
                value={dayBook.refunds?.total || 0}
                icon={ArrowDownLeft}
                color="text-red-600"
              />
              <StatCard
                label="Net Amount"
                value={dayBook.net || 0}
                icon={IndianRupee}
                color="text-(--primary)"
              />
              <StatCard
                label="Transactions"
                value={dayBook.transactions || 0}
                icon={ArrowUpRight}
                color="text-blue-600"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <BreakdownCard
                title="Collection Breakdown"
                rows={[
                  { label: "Cash", value: dayBook.collections?.cash || 0 },
                  { label: "UPI", value: dayBook.collections?.upi || 0 },
                  { label: "Card", value: dayBook.collections?.card || 0 },
                  { label: "Net Banking", value: dayBook.collections?.netbanking || 0 },
                  { label: "Wallet (PayTM, PhonePe)", value: dayBook.collections?.wallet || 0 },
                  { label: "Cheque", value: dayBook.collections?.cheque || 0 },
                ]}
              />
              <BreakdownCard
                title="Refund Breakdown"
                rows={[
                  { label: "Cash", value: dayBook.refunds?.cash || 0 },
                  { label: "UPI / QR", value: dayBook.refunds?.upi || 0 },
                  { label: "Card", value: dayBook.refunds?.card || 0 },
                  { label: "Net Banking", value: dayBook.refunds?.netbanking || 0 },
                  { label: "Wallet (PayTM, PhonePe)", value: dayBook.refunds?.wallet || 0 },
                  { label: "Cheque", value: dayBook.refunds?.cheque || 0 },
                ]}
              />
            </div>
            <div className="text-xs text-(--text-muted) text-right">
              Last updated at{" "}
              {dayBook.updatedAt?.toDate
                ? dayBook.updatedAt.toDate().toLocaleString()
                : "-"}
            </div>
          </>
        )}
      </div>
    </RequirePermission>
  );
}

function StatCard({ label, value, icon: Icon, color }) {
  return (
    <div className="bg-(--bg-card) border border-(--border) rounded-xl p-4 flex items-center gap-3">
      <div className={`p-2 rounded-lg bg-(--bg) ${color}`}>
        <Icon size={18} />
      </div>
      <div>
        <p className="text-sm text-(--text-muted)">{label}</p>
        <p className="text-lg font-semibold">{label != 'Transactions' ? '₹' : ''} {(value >= 10 || value == 0) ? value : '0' + value}</p>
      </div>
    </div>
  );
}

function BreakdownCard({ title, rows }) {
  return (
    <div className="bg-(--bg-card) border border-(--border) rounded-xl p-4">
      <p className="text-sm font-semibold mb-3">{title}</p>
      <div className="space-y-2 text-sm">
        {rows.map((r) => (
          <div key={r.label} className="flex justify-between">
            <span className="text-(--text-muted)">{r.label}</span>
            <span className="font-semibold">₹ {r.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
