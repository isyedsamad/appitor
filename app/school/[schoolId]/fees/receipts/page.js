"use client";

import { useEffect, useState } from "react";
import { Search, History, Calendar, User, ArrowDown, Download, Printer, FileText, ChevronRight, X, Hash, FileWarning, MessageCircleWarning, Receipt } from "lucide-react";
import { collection, query, where, orderBy, limit, startAfter, getDocs, doc, getDoc, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useSchool } from "@/context/SchoolContext";
import { useBranch } from "@/context/BranchContext";
import RequirePermission from "@/components/school/RequirePermission";
import { toast } from "react-toastify";
import { generateReceiptPDF } from "@/lib/exports/fees/receiptPdf";
import { formatDateSlash } from "@/lib/dateUtils";

const PAGE_SIZE = 10;
const toDayRange = (date) => {
    const d = new Date(date);
    const start = new Date(d.setHours(0, 0, 0, 0));
    const end = new Date(d.setHours(23, 59, 59, 999));
    return {
        start: Timestamp.fromDate(start),
        end: Timestamp.fromDate(end),
    };
};

export default function FeeReceiptsPage() {
    const { schoolUser, setLoading, currentSession, sessionList, classData } = useSchool();
    const { branch, branchInfo } = useBranch();
    const [searchType, setSearchType] = useState("date");
    const [queryText, setQueryText] = useState("");
    const [rows, setRows] = useState([]);
    const [lastDoc, setLastDoc] = useState(null);
    const [hasMore, setHasMore] = useState(false);
    const [showDownloadModal, setShowDownloadModal] = useState(false);
    const [selectedReceipt, setSelectedReceipt] = useState(null);
    const [pdfOptions, setPdfOptions] = useState({ size: '1/2', copies: 2 });

    useEffect(() => {
        if (!queryText && searchType === 'date') {
            const today = new Date().toISOString().split('T')[0];
            setQueryText(today);
        }
    }, [searchType]);

    const searchReceipts = async (loadMore = false) => {
        if (!queryText) {
            toast.error("Enter search value");
            return;
        }
        setLoading(true);
        try {
            const baseRef = collection(db, "schools", schoolUser.schoolId, "branches", branch, "fees", "payments", "items");
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
            } else if (searchType === "receipt") {
                q = query(
                    baseRef,
                    where("receiptNo", "==", queryText.trim().toUpperCase()),
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

            if (!loadMore && data.length === 0) {
                toast.info("No receipts found for this search.");
            }
        } catch (e) {
            console.error(e);
            toast.error("Search failed");
        } finally {
            setLoading(false);
        }
    };

    const handleDownloadRequest = async (receipt) => {
        const studentDocId = receipt.studentId || receipt.uid;
        if (!studentDocId) {
            toast.error("Invalid receipt data: missing student ID");
            return;
        }

        setLoading(true);
        try {
            const studentRef = doc(db, "schools", schoolUser.schoolId, "branches", branch, "students", studentDocId);
            const studentSnap = await getDoc(studentRef);

            if (!studentSnap.exists()) {
                toast.error("Student details not found");
                return;
            }

            setSelectedReceipt({
                receipt,
                student: studentSnap.data()
            });
            setShowDownloadModal(true);
        } catch (error) {
            console.error(error);
            toast.error("Failed to load details");
        } finally {
            setLoading(false);
        }
    };

    const confirmDownload = () => {
        const studentInfo = selectedReceipt.student;
        const className = classData?.find(c => c.id === studentInfo.className)?.name || studentInfo.className || "N/A";
        const sectionName = classData?.find(c => c.id === studentInfo.className)?.sections?.find(s => s.id === studentInfo.section)?.name || studentInfo.section || "N/A";

        generateReceiptPDF({
            receipt: selectedReceipt.receipt,
            student: {
                ...studentInfo,
                className,
                sectionName
            },
            schoolUser,
            branchInfo,
            options: pdfOptions
        });
        setShowDownloadModal(false);
    };

    return (
        <RequirePermission permission="fee.reports.view">
            <div className="space-y-5">
                <div className="flex items-start gap-3">
                    <div className="p-3 rounded-lg shadow-sm border border-(--primary)/20 bg-(--primary-soft) text-(--primary)">
                        <Receipt size={20} />
                    </div>
                    <div>
                        <h1 className="text-lg font-semibold text-(--text)">Fee Receipts</h1>
                        <p className="text-xs font-semibold text-(--text-muted)">
                            Search and reprint payment receipts
                        </p>
                    </div>
                </div>
                <div className="space-y-4">
                    <div className="flex overflow-hidden w-fit">
                        {["date", "student", "receipt"].map(t => (
                            <button
                                key={t}
                                onClick={() => {
                                    setSearchType(t);
                                    setQueryText(t === 'date' ? new Date().toISOString().split('T')[0] : "");
                                    setRows([]);
                                    setLastDoc(null);
                                }}
                                className={`px-4 py-2 text-sm font-medium border rounded-none
                                    ${searchType === t ? "bg-(--primary) text-white border-(--primary)" : "bg-(--bg-card) border-(--border)"}
                                    ${t === "date" ? "rounded-l-md" : t === "receipt" ? "rounded-r-md" : ""}`}
                            >
                                {t === "date" ? (<><Calendar size={16} /> Date</>) : t === "student" ? (<><User size={16} /> App ID</>) : (<><Hash size={16} /> Receipt No</>)}
                            </button>
                        ))}
                    </div>

                    <div className="flex flex-1 flex-col sm:flex-row gap-3 items-start sm:items-end">
                        <div className="flex flex-1 w-full max-w-xs gap-2 items-end">
                            {searchType === "date" ? (
                                <div className="flex flex-col flex-1">
                                    <p className="text-sm text-(--text-muted) font-medium">Select Date</p>
                                    <input
                                        type="date"
                                        className="input"
                                        value={queryText}
                                        onChange={e => setQueryText(e.target.value)}
                                    />
                                </div>
                            ) : searchType === "receipt" ? (
                                <div className="flex flex-col flex-1">
                                    <p className="text-sm text-(--text-muted) font-medium">Receipt Number</p>
                                    <input
                                        className="input"
                                        placeholder="e.g. RCPT/2023-24/001"
                                        value={queryText}
                                        onChange={e => setQueryText(e.target.value.toUpperCase())}
                                        onKeyDown={e => e.key === "Enter" && searchReceipts()}
                                    />
                                </div>
                            ) : (
                                <div className="flex flex-col flex-1">
                                    <p className="text-sm text-(--text-muted) font-medium">Student App ID</p>
                                    <input
                                        className="input"
                                        placeholder="e.g. A25001"
                                        value={queryText}
                                        onChange={e => setQueryText(e.target.value.toUpperCase())}
                                        onKeyDown={e => e.key === "Enter" && searchReceipts()}
                                    />
                                </div>
                            )}
                            <button
                                onClick={() => searchReceipts()}
                                disabled={!queryText}
                                className="btn-primary"
                            >
                                <Search size={18} /> Search
                            </button>
                        </div>
                        <div className="md:flex-1"></div>
                    </div>
                </div>
                <div className="bg-(--bg-card) border border-(--border) rounded-xl overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-(--bg-soft)">
                                <tr>
                                    <th className="px-4 py-3 text-left">Receipt No</th>
                                    <th className="px-4 py-3 text-left">Student Info</th>
                                    <th className="px-4 py-3 text-left">Date</th>
                                    <th className="px-4 py-3 text-right">Amount</th>
                                    <th className="px-4 py-3 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-4 py-10 text-center text-(--text-muted)">
                                            <FileWarning size={30} className="mx-auto mb-2" />
                                            No receipts found. Search by Date, App ID or Receipt No.
                                        </td>
                                    </tr>
                                ) : (
                                    rows.map(r => (
                                        <tr key={r.id} className="border-t border-(--border) hover:bg-(--bg-soft)/50 transition-colors">
                                            <td className="px-4 py-2 font-semibold">
                                                {r.receiptNo}
                                            </td>
                                            <td className="px-4 py-2">
                                                <div className="flex flex-col">
                                                    <span className="font-semibold text-(--text)">{r.appId}</span>
                                                    {/* <span className="text-[11px] text-(--text-muted) font-medium">
                                                        {r.className} - {r.section}
                                                    </span> */}
                                                </div>
                                            </td>
                                            <td className="px-4 py-2 text-(--text-muted)">
                                                {formatDateSlash(r.createdAt?.toDate())}
                                            </td>
                                            <td className="px-4 py-2 text-right font-bold text-(--primary)">
                                                ₹ {(r.paidAmount || r.amount)?.toLocaleString()}
                                            </td>
                                            <td className="px-4 py-2 text-right">
                                                <button
                                                    onClick={() => handleDownloadRequest(r)}
                                                    className="btn-outline font-medium py-1.5 px-3 text-xs flex gap-2 ml-auto bg-(--status-p-bg) text-(--status-p-text) border-(--status-p-border)"
                                                >
                                                    <Printer size={14} /> Print
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                    {hasMore && (
                        <div className="flex justify-center p-4 border-t border-(--border)">
                            <button
                                onClick={() => searchReceipts(true)}
                                className="btn-secondary flex gap-2"
                            >
                                Load More <ArrowDown size={16} />
                            </button>
                        </div>
                    )}
                </div>
            </div>
            {showDownloadModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-(--bg-card) w-full max-w-md rounded-2xl border border-(--border) shadow-2xl overflow-hidden">
                        <div className="p-4 border-b border-(--border) flex justify-between items-center bg-(--bg-soft)">
                            <h3 className="font-bold flex items-center gap-2">
                                <Printer size={18} className="text-(--primary)" /> Print Receipt
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
                                        // { id: '1/3', label: '1/3 A4' },
                                        // { id: '1/4', label: '1/4 A4' },
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
                                    <span className="font-semibold">{selectedReceipt?.receipt.receiptNo}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-(--text-muted)">Paid:</span>
                                    <span className="font-bold text-(--primary)">₹{(selectedReceipt?.receipt?.paidAmount || selectedReceipt?.receipt?.amount)?.toLocaleString()}</span>
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
