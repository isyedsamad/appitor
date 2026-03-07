"use client";

import { useEffect, useState } from "react";
import {
    Mail,
    Phone,
    Building2,
    Calendar,
    Trash2,
    CheckCircle2,
    Clock,
    MoreVertical,
    Search,
    Filter,
    ArrowUpRight
} from "lucide-react";
import {
    fetchContactRequests,
    updateRequestStatus,
    deleteRequest
} from "@/lib/admin/requestService";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/dateUtils";

export default function RequestsPage() {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        loadRequests();
    }, []);

    async function loadRequests() {
        try {
            const data = await fetchContactRequests();
            setRequests(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }

    const handleStatusChange = async (id, status) => {
        try {
            await updateRequestStatus(id, status);
            setRequests(requests.map(r => r.id === id ? { ...r, status } : r));
        } catch (error) {
            console.error(error);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm("Are you sure you want to delete this request?")) return;
        try {
            await deleteRequest(id);
            setRequests(requests.filter(r => r.id !== id));
        } catch (error) {
            console.error(error);
        }
    };

    const filteredRequests = requests.filter(r =>
        r.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.schoolName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) return <div className="p-8 text-center text-xs font-bold animate-pulse">Initializing Request Matrix...</div>;

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <p className="text-[10px] font-bold text-(--primary) uppercase mb-1">Lead Management</p>
                    <h1 className="text-2xl font-bold text-(--text)">Institutional Requests</h1>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <div className="relative flex-grow sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-(--text-muted) opacity-40" />
                        <input
                            type="text"
                            placeholder="Search requests..."
                            className="w-full bg-(--bg-card) border border-(--border) rounded-xl pl-10 pr-4 py-2 text-xs font-bold outline-none focus:border-(--primary) transition-all"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            <div className="grid gap-4">
                {filteredRequests.length === 0 ? (
                    <div className="p-12 text-center bg-(--bg-card) border border-(--border) rounded-[2rem]">
                        <p className="text-xs font-bold text-(--text-muted) uppercase">No active requests found</p>
                    </div>
                ) : (
                    <div className="bg-(--bg-card) border border-(--border) rounded-[2rem] overflow-hidden shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-(--border) bg-(--bg-card)/50">
                                        <th className="px-6 py-4 text-[9px] font-bold text-(--text-muted) uppercase tracking-widest">Institution</th>
                                        <th className="px-6 py-4 text-[9px] font-bold text-(--text-muted) uppercase tracking-widest">Contact</th>
                                        <th className="px-6 py-4 text-[9px] font-bold text-(--text-muted) uppercase tracking-widest">Details</th>
                                        <th className="px-6 py-4 text-[9px] font-bold text-(--text-muted) uppercase tracking-widest">Status</th>
                                        <th className="px-6 py-4 text-[9px] font-bold text-(--text-muted) uppercase tracking-widest">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredRequests.map((req) => (
                                        <tr key={req.id} className="border-b border-(--border)/50 hover:bg-(--bg)/40 transition-colors group">
                                            <td className="px-6 py-5">
                                                <div className="space-y-1">
                                                    <p className="text-sm font-bold text-(--text)">{req.schoolName}</p>
                                                    <p className="text-[10px] text-(--text-muted) flex items-center gap-1">
                                                        <Calendar size={10} /> {formatDate(new Date(req.createdAt))}
                                                    </p>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="space-y-1">
                                                    <p className="text-[11px] font-bold text-(--text)">{req.firstName} {req.lastName}</p>
                                                    <p className="text-[11px] text-(--text-muted) font-medium">{req.email}</p>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5 max-w-xs">
                                                <p className="text-[11px] text-(--text-muted) line-clamp-2 leading-relaxed">
                                                    {req.message}
                                                </p>
                                            </td>
                                            <td className="px-6 py-5">
                                                <StatusBadge status={req.status} />
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => handleStatusChange(req.id, req.status === "new" ? "contacted" : "new")}
                                                        className={cn(
                                                            "p-2 rounded-lg border transition-all active:scale-95",
                                                            req.status === "new"
                                                                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500 hover:bg-emerald-500 hover:text-white"
                                                                : "bg-blue-500/10 border-blue-500/20 text-blue-500 hover:bg-blue-500 hover:text-white"
                                                        )}
                                                        title="Toggle Status"
                                                    >
                                                        <CheckCircle2 size={14} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(req.id)}
                                                        className="p-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white transition-all active:scale-95"
                                                        title="Delete"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function StatusBadge({ status }) {
    const configs = {
        new: { label: "New Lead", className: "bg-orange-500/10 text-orange-600 border-orange-500/20" },
        contacted: { label: "Contacted", className: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
        closed: { label: "Closed", className: "bg-(--text-muted)/10 text-(--text-muted) border-(--border)" }
    };

    const config = configs[status] || configs.new;

    return (
        <span className={cn("px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest border", config.className)}>
            {config.label}
        </span>
    );
}
