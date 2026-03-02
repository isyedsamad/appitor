"use client";

import { useEffect, useState } from "react";
import {
    Building2,
    Save,
    MapPin,
    Phone,
    Mail,
    Globe,
    Info,
    Building
} from "lucide-react";
import { useSchool } from "@/context/SchoolContext";
import { useBranch } from "@/context/BranchContext";
import secureAxios from "@/lib/secureAxios";
import { toast } from "react-toastify";
import RequirePermission from "@/components/school/RequirePermission";

export default function SchoolProfilePage() {
    const { setLoading } = useSchool();
    const { branch, branchInfo, setBranchInfo } = useBranch();
    const [formData, setFormData] = useState({
        name: "",
        branchCode: "",
        city: "",
        state: "",
        address: "",
        phone: "",
        email: "",
        website: "",
    });

    useEffect(() => {
        if (branchInfo) {
            setFormData({
                name: branchInfo.name || "",
                branchCode: branchInfo.branchCode || "",
                city: branchInfo.city || "",
                state: branchInfo.state || "",
                address: branchInfo.address || "",
                phone: branchInfo.phone || "",
                email: branchInfo.email || "",
                website: branchInfo.website || "",
            });
        }
    }, [branchInfo]);

    async function handleSave() {
        if (!branch) return;
        try {
            setLoading(true);
            const res = await secureAxios.put("/api/school/settings/profile", {
                branchId: branch,
                ...formData,
            });
            setBranchInfo(prev => ({
                ...prev,
                ...formData
            }));
            toast.success(res.data.message || "Profile updated successfully");
        } catch (err) {
            toast.error("Failed to update profile: " + (err.response?.data?.message || err.message));
        } finally {
            setLoading(false);
        }
    }

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    return (
        <RequirePermission permission="system.profile.view">
            <div className="space-y-5">
                <div className="flex flex-col gap-5 md:flex-row justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-lg bg-(--primary-soft) text-(--primary)">
                            <Building size={22} />
                        </div>
                        <div>
                            <h1 className="text-base font-semibold text-(--text) flex items-center gap-2">
                                Branch Profile
                            </h1>
                            <p className="text-[11px] font-medium text-(--text-muted) uppercase tracking-wider">
                                Manage contact and location details for this branch
                            </p>
                        </div>
                    </div>

                    <button
                        className="btn-primary h-10 px-6 gap-2 text-xs font-semibold uppercase tracking-wide"
                        onClick={handleSave}
                    >
                        <Save size={16} /> Save Changes
                    </button>
                </div>

                <div className="grid lg:grid-cols-3 gap-5">
                    <div className="lg:col-span-2 space-y-5">
                        <div className="bg-(--bg-card) border border-(--border) rounded-xl p-5 shadow-sm space-y-4">
                            <div className="flex items-center gap-2 border-b border-(--border) pb-3">
                                <Info size={16} className="text-(--primary)" />
                                <h2 className="text-[11px] font-semibold uppercase tracking-wide text-(--text-muted)">
                                    General Information
                                </h2>
                            </div>

                            <div className="grid md:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <p className="text-[10px] font-semibold text-(--text-muted) uppercase px-1">Branch Name</p>
                                    <input
                                        name="name"
                                        value={formData.name}
                                        onChange={handleChange}
                                        className="input h-10 text-xs font-semibold"
                                        placeholder="Enter branch name"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <p className="text-[10px] font-semibold text-(--text-muted) uppercase px-1">Branch Code</p>
                                    <input
                                        name="branchCode"
                                        value={formData.branchCode}
                                        onChange={handleChange}
                                        className="input h-10 text-xs font-semibold"
                                        placeholder="e.g., BR-01"
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="bg-(--bg-card) border border-(--border) rounded-xl p-5 shadow-sm space-y-4">
                            <div className="flex items-center gap-2 border-b border-(--border) pb-3">
                                <MapPin size={16} className="text-(--primary)" />
                                <h2 className="text-[11px] font-semibold uppercase tracking-wide text-(--text-muted)">
                                    Location Details
                                </h2>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-1.5">
                                    <p className="text-[10px] font-semibold text-(--text-muted) uppercase px-1">Detailed Address</p>
                                    <textarea
                                        name="address"
                                        value={formData.address}
                                        onChange={handleChange}
                                        className="input min-h-[80px] text-xs font-semibold py-2"
                                        placeholder="Building number, street, etc."
                                    />
                                </div>
                                <div className="grid md:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <p className="text-[10px] font-semibold text-(--text-muted) uppercase px-1">City</p>
                                        <input
                                            name="city"
                                            value={formData.city}
                                            onChange={handleChange}
                                            className="input h-10 text-xs font-semibold"
                                            placeholder="City"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <p className="text-[10px] font-semibold text-(--text-muted) uppercase px-1">State</p>
                                        <input
                                            name="state"
                                            value={formData.state}
                                            onChange={handleChange}
                                            className="input h-10 text-xs font-semibold"
                                            placeholder="State"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="space-y-5">
                        <div className="bg-(--bg-card) border border-(--border) rounded-xl p-5 shadow-sm space-y-4">
                            <div className="flex items-center gap-2 border-b border-(--border) pb-3">
                                <Phone size={16} className="text-(--primary)" />
                                <h2 className="text-[11px] font-semibold uppercase tracking-wide text-(--text-muted)">
                                    Contact Gateway
                                </h2>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-1.5">
                                    <div className="flex items-center gap-2 mb-1 px-1">
                                        <Phone size={12} className="text-(--text-muted)" />
                                        <p className="text-[10px] font-semibold text-(--text-muted) uppercase">Contact Number</p>
                                    </div>
                                    <input
                                        name="phone"
                                        value={formData.phone}
                                        onChange={handleChange}
                                        className="input h-10 text-xs font-semibold"
                                        placeholder="+91 XXXXX XXXXX"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <div className="flex items-center gap-2 mb-1 px-1">
                                        <Mail size={12} className="text-(--text-muted)" />
                                        <p className="text-[10px] font-semibold text-(--text-muted) uppercase">Email Address</p>
                                    </div>
                                    <input
                                        name="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                        className="input h-10 text-xs font-semibold"
                                        placeholder="branch@school.com"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <div className="flex items-center gap-2 mb-1 px-1">
                                        <Globe size={12} className="text-(--text-muted)" />
                                        <p className="text-[10px] font-semibold text-(--text-muted) uppercase">Website</p>
                                    </div>
                                    <input
                                        name="website"
                                        value={formData.website}
                                        onChange={handleChange}
                                        className="input h-10 text-xs font-semibold"
                                        placeholder="www.school.com"
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="bg-blue-500/5 border border-blue-500/10 rounded-xl p-5 space-y-3">
                            <div className="flex items-center gap-2">
                                <Building2 size={16} className="text-blue-600" />
                                <h3 className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">Branch Identity</h3>
                            </div>
                            <p className="text-[11px] font-medium text-blue-700/80 leading-relaxed italic">
                                This information appears on student ID cards, fee receipts, and official communications generated for this branch.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </RequirePermission>
    );
}
