"use client";

import { useEffect, useState } from "react";
import {Search, BookOpen, Calendar, User, ArrowDown, RotateCcw, IndianRupee, Download} from "lucide-react";
import {collection, query, where, orderBy, limit, startAfter, getDocs, Timestamp} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useSchool } from "@/context/SchoolContext";
import { useBranch } from "@/context/BranchContext";
import RequirePermission from "@/components/school/RequirePermission";
import { toast } from "react-toastify";
import { exportLedgerToExcel } from "@/lib/exports/fees/exportLedgerExcel";

const PAGE_SIZE = 5;
const toDayRange = (date) => {
  const d = new Date(date);
  const start = new Date(d.setHours(0, 0, 0, 0));
  const end = new Date(d.setHours(23, 59, 59, 999));
  return {
    start: Timestamp.fromDate(start),
    end: Timestamp.fromDate(end),
  };
};

export default function FeeLedgerPage() {
  const { schoolUser, setLoading, currentSession, sessionList } = useSchool();
  const { branch } = useBranch();
  const [sessionId, setSessionId] = useState(null);
  const [searchType, setSearchType] = useState("date");
  const [queryText, setQueryText] = useState("");
  const [rows, setRows] = useState([]);
  const [lastDoc, setLastDoc] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  useEffect(() => {
    if(schoolUser && sessionList && currentSession) {
      setSessionId(currentSession);
    } else {
      return;
    }
  }, [schoolUser, sessionList, currentSession])
  const searchLedger = async (loadMore = false) => {
    if (!queryText) {
      toast.error("Enter search value");
      return;
    }
    setLoading(true);
    try {
      const baseRef = collection(
        db,
        "schools",
        schoolUser.schoolId,
        "branches",
        branch,
        "fees",
        "ledger",
        "items"
      );
      let q;
      if (searchType === "date") {
        const { start, end } = toDayRange(queryText);
        q = query(
          baseRef,
          where("createdAt", ">=", start),
          where("createdAt", "<=", end),
          orderBy("createdAt", "desc"),
          ...(loadMore && lastDoc ? [startAfter(lastDoc)] : []),
          limit(PAGE_SIZE)
        );
      } else {
        q = query(
          baseRef,
          where("appId", "==", queryText.toUpperCase()),
          orderBy("createdAt", "desc"),
          ...(loadMore && lastDoc ? [startAfter(lastDoc)] : []),
          limit(PAGE_SIZE)
        );
      }
      const snap = await getDocs(q);
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setRows(loadMore ? [...rows, ...data] : data);
      setLastDoc(snap.docs[snap.docs.length - 1] || null);
      setHasMore(snap.docs.length === PAGE_SIZE);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load ledger");
    } finally {
      setLoading(false);
    }
  };

  return (
    <RequirePermission permission="fee.view">
      <div className="max-w-7xl mx-auto space-y-5">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-(--primary-soft) text-(--primary)">
            <BookOpen size={20} />
          </div>
          <div>
            <h1 className="text-lg font-semibold">Fee Ledger</h1>
            <p className="text-sm text-(--text-muted)">
              Complete payment & refund history
            </p>
          </div>
        </div>
        <div className="space-y-4">
          <div className="flex overflow-hidden w-fit">
            {["date", "student"].map(t => (
              <button
                key={t}
                onClick={() => {
                  setSearchType(t);
                  setQueryText("");
                  setRows([]);
                  setLastDoc(null);
                }}
                className={`px-4 py-2 text-sm font-medium border rounded-none border-(--border)
                  ${searchType === t ? "bg-(--primary) text-white" : "bg-(--bg-card)"}
                  ${t === "date" ? "rounded-l-md" : "rounded-r-md"}`}
              >
                {t === "date" ? "Date" : "Student App ID"}
              </button>
            ))}
          </div>
          <div className="flex flex-1 flex-col sm:flex-row gap-3 items-start sm:items-end">
            {searchType === "date" ? (
              <div className="flex flex-1 justify-center items-end gap-2">
                <div className="flex flex-col flex-1">
                  <p className="text-sm text-(--text-muted)">Select Date</p>
                  <input
                    type="date"
                    className="input"
                    onChange={e => setQueryText(e.target.value)}
                  />
                </div>
                <button onClick={() => searchLedger()} className="btn-primary py-3">
                  <Search size={18} />
                </button>
              </div>
            ) : (
              <div className="flex flex-1 flex-col sm:flex-row justify-center items-start sm:items-end gap-2">
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
                <div className="flex flex-1 justify-start gap-1 items-end">
                  <div className="flex flex-col flex-1">
                    <p className="text-sm text-(--text-muted) font-medium">Student App ID</p>
                    <input
                      className="input"
                      placeholder="A25000001"
                      value={queryText}
                      onChange={e => setQueryText(e.target.value.toUpperCase())}
                      onKeyDown={e => e.key === "Enter" && searchLedger()}
                    />
                  </div>
                  <button onClick={() => searchLedger()} className="btn-primary py-3">
                    <Search size={18} />
                  </button>
                </div>
              </div>
            )}
            <div className="flex-1"></div>
            <div>
            <button
              onClick={() =>
                exportLedgerToExcel({
                  rows,
                  schoolName: schoolUser.name,
                  branchName: branch,
                  fromLabel: searchType === "date" ? queryText : "Student",
                })
              }
              disabled={!rows.length}
              className="btn-outline flex gap-2"
            >
              <Download size={16} className="text-green-500" />
              Export Excel
            </button>
            </div>
          </div>
        </div>
        <div className="bg-(--bg-card) border border-(--border) rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-(--bg)">
              <tr>
                <th className="px-4 py-3 text-left">Receipt</th>
                <th className="px-4 py-3 text-left">Student</th>
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3 text-right">Type</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-(--text-muted)">
                    No records found
                  </td>
                </tr>
              )}
              {rows.map(r => (
                <tr key={r.id} className="border-t border-(--border)">
                  <td className="px-4 py-3 font-semibold">{r.receiptNo}</td>
                  <td className="px-4 py-3 font-semibold">
                    {r.appId}
                  </td>
                  <td className="px-4 py-3">
                    {r.createdAt?.toDate().toLocaleDateString()}
                  </td>
                  <td className={`px-4 py-3 text-right font-semibold ${
                    r.type === "refund" ? "text-(--danger)" : ""
                  }`}>
                    ₹ {Math.abs(r.amount)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 justify-end items-center">
                    {r.type === "refund" ? (
                      <>
                        <RotateCcw size={14} className="text-(--danger)" /> Refund
                      </>
                    ) : (
                      <>
                        <IndianRupee size={14} className="text-(--accent)" /> Payment
                      </>
                    )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
          {hasMore && (
            <div className="flex justify-center p-4 border-t border-(--border)">
              <button
                onClick={() => searchLedger(true)}
                className="btn-secondary flex gap-2"
              >
                Load More <ArrowDown size={16} />
              </button>
            </div>
          )}
        </div>
      </div>
    </RequirePermission>
  );
}
