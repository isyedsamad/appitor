"use client";

import { useState, useMemo, useEffect } from "react";
import {
    IdCard,
    Search,
    Printer,
    Settings2,
    RefreshCw,
    CheckCircle2,
    Users,
    GraduationCap,
    Layout,
    Palette,
    ChevronRight,
    User,
    QrCode,
    SquareCheck,
    RotateCcw,
    ArrowLeft,
    Maximize2,
    Minimize2,
    Calendar,
    Hash,
    MapPin,
    Building2,
    Briefcase,
    Layers,
    Sparkles,
    Check,
    Square,
    ArrowRight
} from "lucide-react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useSchool } from "@/context/SchoolContext";
import { useBranch } from "@/context/BranchContext";
import { toast } from "react-toastify";
import RequirePermission from "@/components/school/RequirePermission";

import "@/components/school/students/IDPrintLayout.css";

export default function IDCardsPage() {
    const { classData, schoolUser, setLoading, loading, currentSession, sessionList } = useSchool();
    const { branchInfo, branch } = useBranch();

    const [step, setStep] = useState(1);
    const [session, setSession] = useState(currentSession || "");
    const [className, setClassName] = useState("");
    const [section, setSection] = useState("");
    const [students, setStudents] = useState([]);
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [searchTerm, setSearchTerm] = useState("");

    const [orientation, setOrientation] = useState("landscape");
    const [cardWidth, setCardWidth] = useState(3.375);
    const [cardHeight, setCardHeight] = useState(2.125);
    const [gridCols, setGridCols] = useState(2);
    const [gridRows, setGridRows] = useState(4);

    const [format, setFormat] = useState("classic");
    const [accentColor, setAccentColor] = useState("#f97316");
    const [isUpperCase, setIsUpperCase] = useState(true);
    const [showQr, setShowQr] = useState(true);

    const selectedClass = classData?.find(c => c.id === className);

    async function loadStudents() {
        if (!session || !className || !section) {
            toast.error("Select session, class & section");
            return;
        }
        setLoading(true);
        try {
            const rosterId = `${className}_${section}_${session}`;
            const snap = await getDoc(doc(db, "schools", schoolUser.schoolId, "branches", branch, "meta", rosterId));

            if (!snap.exists()) {
                setStudents([]);
                toast.info("No roster found for this section");
                return;
            }

            const results = (snap.data().students || []).sort((a, b) => a.name.localeCompare(b.name));
            setStudents(results);
            setSelectedIds(new Set());
        } catch (err) {
            toast.error("Failed to load students");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        if (orientation === "landscape") {
            setCardWidth(3.375);
            setCardHeight(2.125);
        } else {
            setCardWidth(2.125);
            setCardHeight(3.375);
        }
    }, [orientation]);

    useEffect(() => {
        const netW = 7.4;
        const netH = 10.8;
        const cols = Math.floor(netW / (cardWidth + 0.1));
        const rows = Math.floor(netH / (cardHeight + 0.1));
        setGridCols(Math.max(1, cols));
        setGridRows(Math.max(1, rows));
    }, [cardWidth, cardHeight]);

    const filteredStudents = useMemo(() => {
        if (!searchTerm) return students;
        return students.filter(s =>
            s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            s.appId.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [students, searchTerm]);

    const toggleSelect = (uid) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(uid)) next.delete(uid);
            else next.add(uid);
            return next;
        });
    };

    const selectAll = () => {
        if (selectedIds.size === filteredStudents.length && filteredStudents.length > 0) setSelectedIds(new Set());
        else setSelectedIds(new Set(filteredStudents.map(s => s.uid)));
    };

    const goToDesign = () => {
        if (selectedIds.size === 0) {
            toast.warning("Please select at least one student");
            return;
        }
        setStep(2);
    };

    const handlePrint = () => {
        window.print();
    };

    const getStudentByUid = (uid) => students.find(s => s.uid === uid);

    const containerStyle = {
        "--id-width": `${cardWidth}in`,
        "--id-height": `${cardHeight}in`,
        "--id-grid-cols": gridCols,
        "--id-grid-rows": gridRows,
    };

    return (
        <RequirePermission permission="student.view">
            <div className="space-y-6 pb-20 text-sm" style={containerStyle}>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 no-print">
                    <div className="flex items-center gap-4">
                        <div className="p-2 rounded-lg bg-(--primary-soft) text-(--primary)">
                            <IdCard size={20} />
                        </div>
                        <div>
                            <h1 className="text-lg font-semibold text-(--text)">ID Card Generator</h1>
                            <p className="text-xs text-(--text-muted) font-medium">
                                Design and print student identity cards in bulk
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3 no-print">
                    <WizardTab active={step === 1} label="1. Selection" onClick={() => setStep(1)} icon={Users} />
                    <ChevronRight size={14} className="text-(--text-muted)" />
                    <WizardTab active={step === 2} label="2. Design Studio" onClick={goToDesign} icon={Palette} />
                </div>

                {step === 1 ? (
                    <SelectionStep
                        session={session} setSession={setSession} sessionList={sessionList}
                        className={className} setClassName={setClassName}
                        section={section} setSection={setSection}
                        classData={classData} selectedClass={selectedClass}
                        loadStudents={loadStudents} loading={loading}
                        students={students} filteredStudents={filteredStudents}
                        selectedIds={selectedIds} toggleSelect={toggleSelect}
                        selectAll={selectAll} searchTerm={searchTerm} setSearchTerm={setSearchTerm}
                        onNext={goToDesign}
                    />
                ) : (
                    <DesignStep
                        onBack={() => setStep(1)}
                        onPrint={handlePrint}
                        format={format} setFormat={setFormat}
                        accentColor={accentColor} setAccentColor={setAccentColor}
                        isUpperCase={isUpperCase} setIsUpperCase={setIsUpperCase}
                        orientation={orientation} setOrientation={setOrientation}
                        cardWidth={cardWidth} setCardWidth={setCardWidth}
                        cardHeight={cardHeight} setCardHeight={setCardHeight}
                        gridCols={gridCols} setGridCols={setGridCols}
                        gridRows={gridRows} setGridRows={setGridRows}
                        showQr={showQr} setShowQr={setShowQr}
                        selectedIds={selectedIds}
                        students={students}
                        getStudentByUid={getStudentByUid}
                        branchInfo={branchInfo}
                        schoolUser={schoolUser}
                        classNameId={classData.find(c => c.id === className)?.name}
                        sectionName={selectedClass?.sections.find(s => s.id === section)?.name}
                        currentSession={session}
                    />
                )}

                {/* Hidden Print Container */}
                <div id="id-card-print-container" className="hidden print:block">
                    <div className="id-grid">
                        {Array.from(selectedIds).map(uid => (
                            <div key={uid} className="id-card-wrapper">
                                <IDCard
                                    student={getStudentByUid(uid)}
                                    schoolName={schoolUser.schoolName}
                                    branchInfo={branchInfo}
                                    session={session}
                                    classNameId={classData.find(c => c.id === className)?.name}
                                    sectionName={selectedClass?.sections.find(s => s.id === section)?.name}
                                    format={format}
                                    accentColor={accentColor}
                                    showQr={showQr}
                                    isUpperCase={isUpperCase}
                                    orientation={orientation}
                                />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </RequirePermission>
    );
}

function SelectionStep({
    session, setSession, sessionList,
    className, setClassName, section, setSection, classData, selectedClass,
    loadStudents, loading, students, filteredStudents, selectedIds,
    toggleSelect, selectAll, searchTerm, setSearchTerm, onNext
}) {
    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
            <div className="bg-(--bg-card) border border-(--border) rounded-2xl p-6 shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                    <div className="space-y-1.5">
                        <label className="text-[10px] uppercase font-semibold text-(--text-muted) tracking-wider ml-1">Session</label>
                        <select className="input w-full bg-(--bg-card)" value={session} onChange={e => setSession(e.target.value)}>
                            <option value="">Select</option>
                            {sessionList?.map(s => <option key={s.id} value={s.id}>{s.id}</option>)}
                        </select>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] uppercase font-semibold text-(--text-muted) tracking-wider ml-1">Class</label>
                        <select className="input w-full bg-(--bg-card)" value={className} onChange={e => { setClassName(e.target.value); setSection(""); }}>
                            <option value="">Select Class</option>
                            {classData?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] uppercase font-semibold text-(--text-muted) tracking-wider ml-1">Section</label>
                        <select className="input w-full bg-(--bg-card)" value={section} disabled={!selectedClass} onChange={e => setSection(e.target.value)}>
                            <option value="">Select Section</option>
                            {selectedClass?.sections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </div>
                    <div className="relative">
                        <label className="text-[10px] uppercase font-semibold text-(--text-muted) tracking-wider ml-1">Search Loaded</label>
                        <div className="relative">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-(--text-muted)" />
                            <input
                                placeholder="Name, ID, Roll..."
                                className="input pl-10 w-full bg-(--bg-card)"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                disabled={students.length === 0}
                            />
                        </div>
                    </div>
                    <button onClick={loadStudents} disabled={loading || !session || !className || !section} className="btn-primary h-[42px] flex items-center justify-center gap-2">
                        {loading ? <RefreshCw size={18} className="animate-spin" /> : <Search size={18} />} Load Students
                    </button>
                </div>
            </div>

            <div className="bg-(--bg-card) border border-(--border) rounded-2xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-(--bg) border-b border-(--border)">
                                <th className="px-5 py-3 w-12 text-center">
                                    <button
                                        onClick={selectAll}
                                        disabled={filteredStudents.length === 0}
                                        className="w-5 h-5 rounded border border-(--border) flex items-center justify-center bg-(--bg) mx-auto"
                                    >
                                        {selectedIds.size === filteredStudents.length && filteredStudents.length > 0 ? (
                                            <Check size={14} className="text-(--primary)" />
                                        ) : (
                                            <Square size={14} className="text-(--text-muted)" />
                                        )}
                                    </button>
                                </th>
                                <th className="px-5 py-3 font-semibold text-(--text-muted)">Roll No</th>
                                <th className="px-5 py-3 font-semibold text-(--text-muted)">App ID</th>
                                <th className="px-5 py-3 font-semibold text-(--text-muted)">Name</th>
                                <th className="px-5 py-3 font-semibold text-(--text-muted) text-right whitespace-nowrap">Gender / DOB</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-(--border)">
                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan="5" className="px-5 py-6">
                                            <div className="h-4 bg-(--bg) rounded-full w-3/4 mx-auto"></div>
                                        </td>
                                    </tr>
                                ))
                            ) : filteredStudents.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-5 py-10 text-center">
                                        <div className="flex flex-col items-center">
                                            <div className="w-16 h-16 rounded-full bg-(--bg) flex items-center justify-center text-(--text-muted)">
                                                <Users size={32} />
                                            </div>
                                            <h3 className="text-base mt-4 font-semibold text-(--text)">No students to display</h3>
                                            <p className="text-xs text-(--text-muted)">Select a class and section to load students for ID card generation</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredStudents.map((student) => {
                                    const isSelected = selectedIds.has(student.uid);
                                    return (
                                        <tr
                                            key={student.uid}
                                            onClick={() => toggleSelect(student.uid)}
                                            className={`group cursor-pointer transition-colors ${isSelected ? 'bg-(--primary-soft)/20' : 'hover:bg-(--bg-soft)/30'}`}
                                        >
                                            <td className="px-5 py-3 text-center">
                                                <div className={`mx-auto w-5 h-5 rounded border-2 flex items-center justify-center bg-(--bg) ${isSelected ? 'border-(--primary)' : 'border-(--text-muted)'}`}>
                                                    {isSelected ? <Check size={14} className="text-(--primary)" /> : null}
                                                </div>
                                            </td>
                                            <td className={`px-5 py-3 font-semibold text-xs ${isSelected ? 'text-(--primary)' : 'text-(--text-muted)'}`}>
                                                {student.rollNo ? student.rollNo.toString().padStart(2, '0') : '--'}
                                            </td>
                                            <td className="px-5 py-3 uppercase font-semibold">
                                                {student.appId}
                                            </td>
                                            <td className="px-5 py-3 font-semibold text-(--text) capitalize">
                                                {student.name}
                                            </td>
                                            <td className="px-5 py-3 text-right">
                                                <span className="text-[10px] font-semibold text-(--text-muted) uppercase tracking-wider">
                                                    {student.gender || '-'} / {student.dob || '-'}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {selectedIds.size > 0 && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[95%] max-w-5xl z-40 animate-in slide-in-from-bottom-8 duration-300">
                    <div className="bg-(--bg) border border-(--border) rounded-2xl p-4 shadow-2xl flex items-center justify-between ring-4 ring-black/5 dark:ring-white/5">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-(--primary) text-white flex items-center justify-center shadow-lg shadow-orange-500/20">
                                <span className="font-semibold text-lg">{selectedIds.size}</span>
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-(--text)">Students Selected</p>
                                <p className="text-[10px] font-semibold text-(--text-muted) uppercase tracking-wider">Ready for design</p>
                            </div>
                        </div>

                        <button onClick={onNext} className="btn-primary px-8 h-[44px] flex items-center gap-2 shadow-xl shadow-orange-500/10">
                            Proceed to Design <ArrowRight size={18} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

function DesignStep({
    onBack, onPrint, format, setFormat, accentColor, setAccentColor, isUpperCase, setIsUpperCase,
    orientation, setOrientation, cardWidth, setCardWidth, cardHeight, setCardHeight,
    gridCols, setGridCols, gridRows, setGridRows, showQr, setShowQr,
    selectedIds, students, getStudentByUid, branchInfo, schoolUser, classNameId, sectionName, currentSession
}) {
    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 grid grid-cols-1 lg:grid-cols-12 gap-6 no-print">
            <div className="lg:col-span-4 space-y-5 h-fit lg:sticky lg:top-24">
                <section className="bg-(--bg-card) border border-(--border) rounded-2xl p-5 space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-(--text-muted) flex items-center gap-2">
                            <Layout size={14} className="text-(--primary)" /> Template Style
                        </h3>
                        <button onClick={onBack} className="text-[10px] font-semibold text-(--primary) hover:underline flex items-center gap-1">
                            <ArrowLeft size={10} /> Back to Selection
                        </button>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                        {["classic", "modern", "minimal"].map(f => (
                            <button
                                key={f} onClick={() => setFormat(f)}
                                className={`py-2 rounded-lg border-2 text-xs font-semibold capitalize transition-all ${format === f ? 'border-(--primary) bg-(--primary-soft) text-(--primary)' : 'border-(--border) text-(--text-muted)'}`}
                            >
                                {f}
                            </button>
                        ))}
                    </div>

                    <div className="space-y-3 pt-2">
                        <label className="text-[10px] font-semibold uppercase text-(--text-muted) ml-1">Accent Color</label>
                        <div className="flex flex-wrap gap-2">
                            {["#f97316", "#3b82f6", "#10b981", "#ef4444", "#8b5cf6", "#1f2937"].map(c => (
                                <button key={c} onClick={() => setAccentColor(c)} style={{ backgroundColor: c }} className={`w-7 h-7 rounded-full border-2 ${accentColor === c ? 'ring-2 ring-(--primary) border-white' : 'border-transparent'}`} />
                            ))}
                            <input type="color" value={accentColor} onChange={e => setAccentColor(e.target.value)} className="w-7 h-7 rounded-full border-none p-0 cursor-pointer overflow-hidden" />
                        </div>
                    </div>
                </section>

                {/* Physical Settings */}
                <section className="bg-(--bg-card) border border-(--border) rounded-2xl p-5 space-y-4">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-(--text-muted) flex items-center gap-2">
                        <Maximize2 size={14} className="text-(--primary)" /> Card Dimensions
                    </h3>

                    <div className="grid grid-cols-2 gap-3">
                        <button onClick={() => setOrientation("portrait")} className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${orientation === 'portrait' ? 'border-(--primary) bg-(--primary-soft) text-(--primary)' : 'border-(--border) opacity-50'}`}>
                            <div className="w-6 h-8 border-2 border-current rounded" />
                            <span className="text-[10px] font-semibold uppercase">Portrait</span>
                        </button>
                        <button onClick={() => setOrientation("landscape")} className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${orientation === 'landscape' ? 'border-(--primary) bg-(--primary-soft) text-(--primary)' : 'border-(--border) opacity-50'}`}>
                            <div className="w-8 h-6 border-2 border-current rounded" />
                            <span className="text-[10px] font-semibold uppercase">Landscape</span>
                        </button>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-semibold text-(--text-muted) uppercase ml-1">Width (in)</label>
                            <input type="number" step="0.1" value={cardWidth} onChange={e => setCardWidth(Number(e.target.value))} className="input w-full bg-(--bg-soft)" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-semibold text-(--text-muted) uppercase ml-1">Height (in)</label>
                            <input type="number" step="0.1" value={cardHeight} onChange={e => setCardHeight(Number(e.target.value))} className="input w-full bg-(--bg-soft)" />
                        </div>
                    </div>
                </section>

                {/* Layout Settings */}
                <section className="bg-(--bg-card) border border-(--border) rounded-2xl p-5 space-y-4">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-(--text-muted) flex items-center gap-2">
                        <Printer size={14} className="text-(--primary)" /> Batch Print Layout
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-semibold text-(--text-muted) uppercase ml-1">Grid Columns</label>
                            <input type="number" value={gridCols} onChange={e => setGridCols(Number(e.target.value))} className="input w-full bg-(--bg-soft)" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-semibold text-(--text-muted) uppercase ml-1">Grid Rows</label>
                            <input type="number" value={gridRows} onChange={e => setGridRows(Number(e.target.value))} className="input w-full bg-(--bg-soft)" />
                        </div>
                    </div>
                    <p className="text-[10px] text-(--text-muted) leading-tight italic px-1 font-medium italic">
                        Note: Standard A4 fits approximately 2x4 for Portrait or 1x6 for Landscape.
                    </p>
                </section>

                {/* Content Toggles */}
                <section className="bg-(--bg-card) border border-(--border) rounded-2xl p-5 space-y-3">
                    <Toggle label="Uppercase Name" active={isUpperCase} onClick={() => setIsUpperCase(!isUpperCase)} />
                    <Toggle label="Include QR Code" active={showQr} onClick={() => setShowQr(!showQr)} />
                </section>

                <button onClick={onPrint} className="btn-primary w-full h-[50px] shadow-lg shadow-orange-500/20 flex items-center justify-center gap-3">
                    <Printer size={20} /> <span className="text-base">Print {selectedIds.size} Cards</span>
                </button>
            </div>

            {/* Right Preview Panel */}
            <div className="lg:col-span-8 flex flex-col gap-6">
                <div className="bg-(--bg-card) border border-(--border) rounded-3xl p-10 flex flex-col items-center justify-center min-h-[600px] overflow-hidden relative">
                    <div className="absolute top-6 left-6 flex items-center gap-2">
                        <Sparkles size={16} className="text-(--primary)" />
                        <span className="text-[10px] font-semibold uppercase tracking-widest text-(--text-muted)">Interactive Preview</span>
                    </div>

                    <div className="transform scale-125">
                        <IDCard
                            student={getStudentByUid(Array.from(selectedIds)[0])}
                            schoolName={schoolUser.schoolName}
                            branchInfo={branchInfo}
                            session={currentSession}
                            classNameId={classNameId}
                            sectionName={sectionName}
                            format={format}
                            accentColor={accentColor}
                            showQr={showQr}
                            isUpperCase={isUpperCase}
                            orientation={orientation}
                        />
                    </div>
                </div>

                <div className="bg-blue-50/50 border border-blue-100 p-5 rounded-3xl flex gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-blue-500 shadow-sm flex-shrink-0">
                        <Printer size={22} />
                    </div>
                    <div>
                        <h4 className="font-semibold text-blue-900 text-sm">Pro Printing Tips</h4>
                        <ul className="text-xs text-blue-700 mt-1 space-y-1 list-disc ml-4 font-medium">
                            <li>Set "Layout" to **Portrait** in browser print settings.</li>
                            <li>Set "Margins" to **None** or **Default**.</li>
                            <li>Disable "Headers and Footers" for a clean export.</li>
                            <li>Verify your **accent color** appears correctly in the preview above.</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}

function IDCard({
    student, schoolName, branchInfo, session, classNameId, sectionName,
    format, accentColor, showQr, isUpperCase, orientation = "portrait", className = ""
}) {
    if (!student) return null;

    const displayName = isUpperCase ? student.name.toUpperCase() : student.name;
    const branchName = branchInfo?.name || "Branch Name";
    const city = branchInfo?.city || "City";
    const state = branchInfo?.state || "State";
    const schoolCode = branchInfo?.branchCode || "SC-001";
    const isLandscape = orientation === "landscape";

    const templates = {
        classic: isLandscape ? (
            <div className={`id-card-base ${className} flex-row`} style={{ width: 'var(--id-width)', height: 'var(--id-height)' }}>
                <div className="w-1/3 h-full flex flex-col items-center justify-center border-r border-gray-100 p-3 bg-gray-50/50">
                    <div className="id-photo-frame w-20 h-24 mb-3 bg-white flex items-center justify-center shadow-sm">
                        <User size={36} className="text-gray-200" />
                    </div>
                    <p className="text-[10px] font-bold text-gray-900 uppercase text-center leading-tight mb-1">{displayName}</p>
                    <p className="text-[7px] font-semibold text-(--primary) uppercase tracking-widest" style={{ color: accentColor }}>{student.appId}</p>
                </div>
                <div className="flex-1 flex flex-col">
                    <div className="h-10 w-full px-4 flex flex-col justify-center" style={{ backgroundColor: accentColor }}>
                        <p className="text-[9px] font-bold text-white leading-none uppercase tracking-tight truncate">{schoolName}</p>
                        <p className="text-[6px] font-semibold text-white/80 uppercase mt-0.5 tracking-wider truncate">{branchName}, {city}</p>
                    </div>
                    <div className="flex-1 p-4 space-y-1.5">
                        <DataLine label="Class/Sec" value={`${classNameId} - ${sectionName}`} />
                        <DataLine label="Roll No" value={student.rollNo || '-'} />
                        <DataLine label="Gender" value={student.gender || '-'} />
                        <DataLine label="DOB" value={student.dob || '-'} />
                    </div>
                    <div className="px-4 py-2 border-t border-gray-100 flex justify-between items-center bg-gray-50/30">
                        <div className="flex gap-3">
                            <div>
                                <p className="text-[5px] font-semibold text-gray-400 uppercase leading-none">Code</p>
                                <p className="text-[7px] font-bold text-gray-700">{schoolCode}</p>
                            </div>
                            <div>
                                <p className="text-[5px] font-semibold text-gray-400 uppercase leading-none">Sess</p>
                                <p className="text-[7px] font-bold text-gray-700">{session}</p>
                            </div>
                        </div>
                        {showQr && <QrCode size={20} className="text-gray-300" />}
                    </div>
                </div>
            </div>
        ) : (
            <div className={`id-card-base ${className}`}>
                <div className="relative h-20 w-full px-3 flex flex-col items-center justify-center text-center overflow-hidden" style={{ backgroundColor: accentColor }}>
                    <div className="absolute inset-0 opacity-10 flex items-center justify-center">
                        <Building2 size={80} />
                    </div>
                    <div className="relative z-10 pt-2 pb-6">
                        <p className="text-[11px] font-bold text-white leading-none uppercase tracking-tight">{schoolName}</p>
                        <p className="text-[8px] font-semibold text-white/80 uppercase mt-1 tracking-wider">{branchName}, {city}</p>
                    </div>
                </div>
                <div className="flex flex-col items-center px-4 -mt-8 relative z-10">
                    <div className="id-photo-frame w-20 h-24 mb-3 flex items-center justify-center">
                        <User size={40} className="text-gray-200" />
                    </div>
                    <p className="text-[11px] font-bold text-gray-900 uppercase tracking-wide text-center leading-tight mb-2">{displayName}</p>

                    <div className="w-full space-y-1.5 mb-3">
                        <DataLine label="App ID" value={student.appId} />
                        <DataLine label="Class/Sec" value={`${classNameId} - ${sectionName}`} />
                        <DataLine label="Roll No" value={student.rollNo || '-'} />
                        <DataLine label="Gender" value={student.gender || '-'} />
                        <DataLine label="DOB" value={student.dob || '-'} />
                    </div>
                </div>
                <div className="mt-auto px-4 py-3 bg-gray-50 border-t border-gray-100 flex justify-between items-end">
                    <div className="space-y-1">
                        <p className="text-[6px] font-semibold text-gray-400 uppercase leading-none">School Code</p>
                        <p className="text-[8px] font-bold text-gray-700 leading-none">{schoolCode}</p>
                        <p className="text-[6px] font-semibold text-gray-400 uppercase leading-none mt-1">Session</p>
                        <p className="text-[8px] font-bold text-gray-700 leading-none">{session}</p>
                    </div>
                    {showQr && <QrCode size={28} className="text-gray-300" />}
                </div>
            </div>
        ),
        modern: isLandscape ? (
            <div className={`id-card-base ${className} flex-row border-l-[10px]`} style={{ borderLeftColor: accentColor, borderTopWidth: 1 }}>
                <div className="w-[100px] h-full p-4 flex flex-col items-center justify-center bg-gray-50/50">
                    <div className="id-photo-frame w-20 h-24 bg-white flex items-center justify-center flex-shrink-0">
                        <User size={36} className="text-gray-200" />
                    </div>
                </div>
                <div className="flex-1 flex flex-col p-4">
                    <div className="mb-4">
                        <p className="text-[10px] font-bold text-gray-900 leading-tight uppercase">{schoolName}</p>
                        <p className="text-[7px] font-semibold text-gray-400 uppercase tracking-widest">{branchName}</p>
                    </div>
                    <div className="flex-1">
                        <p className="text-[11px] font-bold text-gray-900 leading-tight mb-1">{displayName}</p>
                        <div className="h-0.5 w-6 rounded-full mb-3" style={{ backgroundColor: accentColor }} />
                        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                            <DataItem label="App ID" value={student.appId} />
                            <DataItem label="Class" value={classNameId} />
                            <DataItem label="Roll No" value={student.rollNo || '-'} />
                            <DataItem label="DOB" value={student.dob || '-'} />
                        </div>
                    </div>
                    <div className="mt-auto flex justify-between items-center pt-3 border-t border-gray-100">
                        <span className="text-[7px] font-semibold uppercase tracking-widest text-gray-400">{session}</span>
                        <span className="text-[7px] font-semibold uppercase tracking-widest text-gray-400">{schoolCode}</span>
                    </div>
                </div>
            </div>
        ) : (
            <div className={`id-card-base ${className} border-t-0`} style={{ borderTop: `10px solid ${accentColor}` }}>
                <div className="p-4 border-b border-gray-100 bg-gray-50/50">
                    <p className="text-[10px] font-bold text-gray-900 leading-tight uppercase">{schoolName}</p>
                    <p className="text-[7px] font-semibold text-gray-400 uppercase tracking-widest">{branchName}</p>
                </div>
                <div className="flex-1 p-4 flex gap-4">
                    <div className="id-photo-frame w-20 h-24 bg-white flex items-center justify-center flex-shrink-0">
                        <User size={36} className="text-gray-200" />
                    </div>
                    <div className="flex flex-col justify-center min-w-0">
                        <p className="text-[11px] font-bold text-gray-900 leading-tight mb-1 truncate">{displayName}</p>
                        <div className="h-0.5 w-6 rounded-full mb-3" style={{ backgroundColor: accentColor }} />
                        <div className="space-y-1">
                            <p className="text-[8px] text-gray-500 font-semibold uppercase leading-none">ID: <span className="text-gray-900">{student.appId}</span></p>
                            <p className="text-[8px] text-gray-500 font-semibold uppercase leading-none">Class: <span className="text-gray-900">{classNameId}</span></p>
                            <p className="text-[8px] text-gray-500 font-semibold uppercase leading-none">Roll: <span className="text-gray-900">{student.rollNo || '-'}</span></p>
                        </div>
                    </div>
                </div>
                <div className="p-4 bg-gray-900 text-white mt-auto grid grid-cols-2 gap-2">
                    <div>
                        <p className="text-[6px] font-semibold text-gray-400 uppercase leading-none">DOB</p>
                        <p className="text-[8px] font-bold leading-none mt-1">{student.dob || '-'}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-[6px] font-semibold text-gray-400 uppercase leading-none">Gender</p>
                        <p className="text-[8px] font-bold leading-none mt-1 uppercase">{student.gender || '-'}</p>
                    </div>
                    <div className="col-span-2 pt-2 border-t border-white/10 flex justify-between items-center">
                        <span className="text-[7px] font-semibold uppercase tracking-widest opacity-50">{session}</span>
                        <span className="text-[7px] font-semibold uppercase tracking-widest ">{schoolCode}</span>
                    </div>
                </div>
            </div>
        ),
        minimal: isLandscape ? (
            <div className={`id-card-base ${className} flex-row p-5 gap-6`}>
                <div className="w-24 h-full flex items-center justify-center">
                    <div className="id-photo-frame w-24 h-24 bg-gray-50 flex items-center justify-center">
                        <User size={48} className="text-gray-200" />
                    </div>
                </div>
                <div className="flex-1 flex flex-col justify-center">
                    <h4 className="text-[9px] font-bold text-gray-800 uppercase leading-none mb-1">{schoolName}</h4>
                    <div className="h-0.5 w-8 mb-4" style={{ backgroundColor: accentColor }} />

                    <p className="text-xs font-bold text-gray-900 uppercase mb-0.5 leading-none">{displayName}</p>
                    <p className="text-[8px] font-semibold uppercase tracking-widest mb-4" style={{ color: accentColor }}>{student.appId}</p>

                    <div className="grid grid-cols-2 gap-y-3 gap-x-6 text-left border-t border-gray-100 pt-4">
                        <DataItem label="Class" value={classNameId} />
                        <DataItem label="Roll No" value={student.rollNo || '-'} />
                        <DataItem label="Session" value={session} />
                        <DataItem label="Code" value={schoolCode} />
                    </div>
                </div>
            </div>
        ) : (
            <div className={`id-card-base ${className} items-center text-center p-5`}>
                <h4 className="text-[9px] font-bold text-gray-800 uppercase leading-none mb-1">{schoolName}</h4>
                <p className="text-[6px] font-semibold text-gray-400 uppercase tracking-widest mb-4">{city}, {state}</p>

                <div className="id-photo-frame w-24 h-24 mb-4 bg-gray-50 flex items-center justify-center">
                    <User size={48} className="text-gray-200" />
                </div>

                <p className="text-xs font-bold text-gray-900 uppercase mb-0.5 leading-none">{displayName}</p>
                <p className="text-[8px] font-semibold text-(--primary) uppercase tracking-widest" style={{ color: accentColor }}>{student.appId}</p>

                <div className="w-full mt-6 grid grid-cols-2 gap-y-3 gap-x-4 text-left border-t border-gray-100 pt-4">
                    <DataItem label="Class" value={classNameId} />
                    <DataItem label="Section" value={sectionName} />
                    <DataItem label="Roll No" value={student.rollNo || '-'} />
                    <DataItem label="Session" value={session} />
                </div>

                {showQr && (
                    <div className="mt-auto pt-4 w-full flex justify-between items-center opacity-30">
                        <span className="text-[6px] font-semibold uppercase tracking-widest">{schoolCode}</span>
                        <QrCode size={20} />
                    </div>
                )}
            </div>
        )
    };

    return templates[format];
}

function WizardTab({ active, label, onClick, icon: Icon }) {
    return (
        <button
            onClick={onClick}
            className={`flex items-center gap-2.5 px-5 py-2.5 rounded-xl border transition-all ${active ? 'bg-(--primary-soft) border-(--primary) text-(--primary) shadow-sm' : 'bg-transparent border-transparent text-(--text-muted) hover:text-(--text)'}`}
        >
            <Icon size={16} />
            <span className="font-semibold text-xs uppercase tracking-tight">{label}</span>
        </button>
    );
}

function DataLine({ label, value }) {
    return (
        <div className="flex justify-between items-center border-b border-gray-100 pb-1 last:border-0 last:pb-0">
            <span className="text-[8px] font-semibold text-gray-400 uppercase">{label}</span>
            <span className="text-[9px] font-bold text-gray-900">{value}</span>
        </div>
    );
}

function DataItem({ label, value }) {
    return (
        <div>
            <p className="text-[6px] font-semibold text-gray-400 uppercase leading-none mb-1">{label}</p>
            <p className="text-[9px] font-bold text-gray-900 uppercase leading-none">{value}</p>
        </div>
    );
}

function Toggle({ label, active, onClick }) {
    return (
        <button onClick={onClick} className="flex items-center justify-between w-full p-2.5 rounded-xl border border-(--border) hover:bg-(--bg-soft) transition-all text-xs font-semibold">
            <span className="text-(--text-muted)">{label}</span>
            <div className={`w-8 h-4 rounded-full transition-all relative ${active ? 'bg-(--primary)' : 'bg-(--border)'}`}>
                <div className={`absolute top-1 w-2 h-2 rounded-full bg-white transition-all ${active ? 'right-1' : 'left-1'}`} />
            </div>
        </button>
    );
}
