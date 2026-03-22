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
    ArrowRight,
    FileText,
    Clock,
} from "lucide-react";
import { doc, getDoc, collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useSchool } from "@/context/SchoolContext";
import { useBranch } from "@/context/BranchContext";
import { toast } from "react-toastify";
import RequirePermission from "@/components/school/RequirePermission";
import { canManage } from "@/lib/school/permissionUtils";

import "@/components/school/exams/AdmitCardPrintLayout.css";

export default function AdmitCardsPage() {
    const { classData, schoolUser, setLoading, loading, currentSession, sessionList } = useSchool();
    const { branchInfo, branch } = useBranch();

    const [step, setStep] = useState(1);
    const [session, setSession] = useState(currentSession || "");
    const [termId, setTermId] = useState("");
    const [terms, setTerms] = useState([]);
    const [className, setClassName] = useState("");
    const [section, setSection] = useState("");
    const [students, setStudents] = useState([]);
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [searchTerm, setSearchTerm] = useState("");
    const [layoutType, setLayoutType] = useState("10");
    const [examTitle, setExamTitle] = useState("");
    const [examDate, setExamDate] = useState("");
    const [examTime, setExamTime] = useState("");
    const [instructions, setInstructions] = useState("1. Bring this admit card to the exam hall.\n2. Arrive 15 minutes before the exam.");

    const selectedClass = classData?.find(c => c.id === className);
    const selectedTerm = terms?.find(t => t.id === termId);
    const currentPlan = branchInfo?.plan || schoolUser?.plan || "trial";
    const editable = canManage(schoolUser, "exam.admitcard.manage", currentPlan);

    useEffect(() => {
        if (session) {
            fetchTerms(session);
        } else {
            setTerms([]);
            setTermId("");
        }
    }, [session]);

    useEffect(() => {
        if (selectedTerm) {
            setExamTitle(selectedTerm.name || selectedTerm.id);
        }
    }, [selectedTerm]);

    async function fetchTerms(session) {
        setLoading(true);
        try {
            const q = query(
                collection(db, "schools", schoolUser.schoolId, "branches", branch, "exams", "items", "exam_terms"),
                where("session", "==", session)
            );
            const snap = await getDocs(q);
            setTerms(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (err) {
            toast.error("Failed to load terms");
        } finally {
            setLoading(false);
        }
    }

    async function loadStudents() {
        if (!session || !termId || !className || !section) {
            toast.error("Select session, term, class & section");
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

            const results = (snap.data().students || []).sort((a, b) => {
                const rA = parseInt(a.rollNo) || 999;
                const rB = parseInt(b.rollNo) || 999;
                return rA - rB;
            });
            setStudents(results);
            setSelectedIds(new Set());
        } catch (err) {
            toast.error("Failed to load students");
        } finally {
            setLoading(false);
        }
    }

    const filteredStudents = useMemo(() => {
        if (!searchTerm) return students;
        const lower = searchTerm.toLowerCase();
        return students.filter(s =>
            s.name.toLowerCase().includes(lower) ||
            s.appId.toLowerCase().includes(lower) ||
            (s.rollNo && s.rollNo.toString().includes(lower))
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
        "--card-width": "3.5in",
        "--card-height": layoutType === "10" ? "2in" : "3.3in",
        "--grid-cols": 2,
    };

    return (
        <RequirePermission permission="exam.admitcard.view">
            <div className="space-y-5 pb-20 text-sm" style={containerStyle}>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 no-print">
                    <div className="flex items-start gap-3">
                        <div className="p-3 rounded-lg shadow-sm border border-(--primary)/20 bg-(--primary-soft) text-(--primary)">
                            <FileText size={20} />
                        </div>
                        <div>
                            <h1 className="text-lg font-semibold text-(--text)">Admit Card Generator</h1>
                            <p className="text-xs font-semibold text-(--text-muted)">
                                Bulk generate and print examination admit cards
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3 no-print">
                    <WizardTab active={step === 1} label="1. Selection" onClick={() => setStep(1)} icon={Users} />
                    <ChevronRight size={14} className="text-(--text-muted)" />
                    <WizardTab active={step === 2} label="2. Layout & Info" onClick={goToDesign} icon={Layout} />
                </div>

                {step === 1 ? (
                    <SelectionStep
                        session={session} setSession={setSession} sessionList={sessionList}
                        termId={termId} setTermId={setTermId} terms={terms}
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
                        layoutType={layoutType} setLayoutType={setLayoutType}
                        examTitle={examTitle} setExamTitle={setExamTitle}
                        examDate={examDate} setExamDate={setExamDate}
                        examTime={examTime} setExamTime={setExamTime}
                        instructions={instructions} setInstructions={setInstructions}
                        selectedIds={selectedIds}
                        students={students}
                        getStudentByUid={getStudentByUid}
                        branchInfo={branchInfo}
                        schoolUser={schoolUser}
                        classNameId={classData.find(c => c.id === className)?.name}
                        sectionName={selectedClass?.sections.find(s => s.id === section)?.name}
                        currentSession={session}
                        selectedTerm={selectedTerm}
                    />
                )}

                <div id="admit-card-print-container" className="hidden print:block">
                    <div className="admit-grid">
                        {Array.from(selectedIds).map(uid => (
                            <div key={uid} className="admit-card-wrapper">
                                <AdmitCard
                                    student={getStudentByUid(uid)}
                                    schoolName={schoolUser.schoolName}
                                    branchInfo={branchInfo}
                                    session={session}
                                    classNameId={classData.find(c => c.id === className)?.name}
                                    sectionName={selectedClass?.sections.find(s => s.id === section)?.name}
                                    examTitle={examTitle}
                                    examDate={examDate}
                                    examTime={examTime}
                                    instructions={instructions}
                                    layoutType={layoutType}
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
    termId, setTermId, terms,
    className, setClassName, section, setSection, classData, selectedClass,
    loadStudents, loading, students, filteredStudents, selectedIds,
    toggleSelect, selectAll, searchTerm, setSearchTerm, onNext
}) {
    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
            <div>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
                    <div className="space-y-1.5">
                        <label className="text-[10px] uppercase font-semibold text-(--text-muted) tracking-wider ml-1">Session</label>
                        <select className="input w-full bg-(--bg-card)" value={session} onChange={e => setSession(e.target.value)}>
                            <option value="">Select</option>
                            {sessionList?.map(s => <option key={s.id} value={s.id}>{s.id}</option>)}
                        </select>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] uppercase font-semibold text-(--text-muted) tracking-wider ml-1">Exam Term</label>
                        <select className="input w-full bg-(--bg-card)" value={termId} onChange={e => setTermId(e.target.value)}>
                            <option value="">Select Term</option>
                            {terms?.map(t => <option key={t.id} value={t.id}>{t.name || t.id}</option>)}
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
                    <div className="relative hidden">
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
                    <button onClick={loadStudents} disabled={loading || !session || !termId || !className || !section} className="btn-primary h-[42px] flex items-center justify-center gap-2">
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
                                <th className="px-5 py-3 font-semibold text-(--text-muted) text-right whitespace-nowrap">Status</th>
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
                                            <p className="text-xs text-(--text-muted)">Select term, class and section to load students</p>
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
                                                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${student.status === 'active' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-red-500/10 text-red-600'}`}>
                                                    {student.status}
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
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[95%] max-w-2xl z-40 animate-in slide-in-from-bottom-8 duration-300">
                    <div className="bg-(--bg) border border-(--border) rounded-xl py-4 px-5 shadow-2xl flex items-center justify-between ring-4 ring-black/5 dark:ring-white/5">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-(--primary) text-white flex items-center justify-center shadow-lg shadow-orange-500/20">
                                <span className="font-semibold text-lg">{selectedIds.size.toString().padStart(2, '0')}</span>
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-(--text)">Students Selected</p>
                                <p className="text-[10px] font-semibold text-(--text-muted) uppercase tracking-wider">Ready for admit cards</p>
                            </div>
                        </div>

                        <button onClick={onNext} className="btn-primary px-8 h-[44px] flex items-center gap-2 shadow-xl shadow-orange-500/10">
                            Configure Layout <ArrowRight size={18} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

function DesignStep({
    onBack, onPrint, layoutType, setLayoutType, examTitle, setExamTitle, examDate, setExamDate, examTime, setExamTime, instructions, setInstructions,
    selectedIds, students, getStudentByUid, branchInfo, schoolUser, classNameId, sectionName, currentSession, selectedTerm
}) {
    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 grid grid-cols-1 lg:grid-cols-12 gap-6 no-print">
            <div className="lg:col-span-4 space-y-5 h-fit lg:sticky lg:top-24">
                <section className="bg-(--bg-card) border border-(--border) rounded-2xl p-5 space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-(--text-muted) flex items-center gap-2">
                            <Layout size={14} className="text-(--primary)" /> Card Layout
                        </h3>
                        <button onClick={onBack} className="text-[10px] font-semibold text-(--primary) hover:underline flex items-center gap-1">
                            <ArrowLeft size={10} /> Back
                        </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        <button
                            onClick={() => setLayoutType("10")}
                            className={`py-3 rounded-xl border-2 flex flex-col items-center gap-1 transition-all ${layoutType === "10" ? 'border-(--primary) bg-(--primary-soft) text-(--primary)' : 'border-(--border) text-(--text-muted)'}`}
                        >
                            <span className="text-sm font-bold">10 Per Page</span>
                            <span className="text-[10px] uppercase font-semibold opacity-60">Small (2x5 Grid)</span>
                        </button>
                        <button
                            onClick={() => setLayoutType("6")}
                            className={`py-3 rounded-xl border-2 flex flex-col items-center gap-1 transition-all ${layoutType === "6" ? 'border-(--primary) bg-(--primary-soft) text-(--primary)' : 'border-(--border) text-(--text-muted)'}`}
                        >
                            <span className="text-sm font-bold">6 Per Page</span>
                            <span className="text-[10px] uppercase font-semibold opacity-60">Bigger (2x3 Grid)</span>
                        </button>
                    </div>
                </section>

                <section className="bg-(--bg-card) border border-(--border) rounded-2xl p-5 space-y-4">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-(--text-muted) flex items-center gap-2">
                        <FileText size={14} className="text-(--primary)" /> Exam Details
                    </h3>
                    <div className="space-y-3">
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-(--text-muted) uppercase ml-1">Examination Title</label>
                            <input
                                value={examTitle}
                                onChange={e => setExamTitle(e.target.value)}
                                className="input w-full bg-(--bg-soft)"
                                placeholder="e.g. Annual Exam 2025"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-(--text-muted) uppercase ml-1">Start Date</label>
                                <input
                                    type="text"
                                    value={examDate}
                                    onChange={e => setExamDate(e.target.value)}
                                    className="input w-full bg-(--bg-soft)"
                                    placeholder="20th March"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-(--text-muted) uppercase ml-1">Time Slot</label>
                                <input
                                    type="text"
                                    value={examTime}
                                    onChange={e => setExamTime(e.target.value)}
                                    className="input w-full bg-(--bg-soft)"
                                    placeholder="9 AM - 12 PM"
                                />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-(--text-muted) uppercase ml-1">Instructions</label>
                            <textarea
                                value={instructions}
                                onChange={e => setInstructions(e.target.value)}
                                className="input w-full bg-(--bg-soft) h-20 py-2 resize-none"
                                placeholder="Add instructions..."
                            />
                        </div>
                    </div>
                </section>

                <button onClick={onPrint} className="btn-primary w-full h-[50px] shadow-lg shadow-orange-500/20 flex items-center justify-center gap-3">
                    <Printer size={20} /> <span className="text-base">Print {selectedIds.size} Admit Cards</span>
                </button>
            </div>

            <div className="lg:col-span-8 flex flex-col gap-6">
                <div className="bg-(--bg-card) border border-(--border) rounded-3xl p-10 flex flex-col items-center justify-center min-h-[600px] overflow-hidden relative">
                    <div className="absolute top-6 left-6 flex items-center gap-2">
                        <Sparkles size={16} className="text-(--primary)" />
                        <span className="text-[10px] font-semibold uppercase tracking-widest text-(--text-muted)">Live Preview</span>
                    </div>

                    <div className={`transform transition-all ${layoutType === '10' ? 'scale-110' : 'scale-100'}`}>
                        <AdmitCard
                            student={getStudentByUid(Array.from(selectedIds)[0])}
                            schoolName={schoolUser.schoolName}
                            branchInfo={branchInfo}
                            session={currentSession}
                            classNameId={classNameId}
                            sectionName={sectionName}
                            examTitle={examTitle}
                            examDate={examDate}
                            examTime={examTime}
                            instructions={instructions}
                            layoutType={layoutType}
                        />
                    </div>
                </div>

                <div className="bg-emerald-50/50 border border-emerald-100 p-5 rounded-3xl flex gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-emerald-500 shadow-sm flex-shrink-0">
                        <CheckCircle2 size={22} />
                    </div>
                    <div>
                        <h4 className="font-semibold text-emerald-900 text-sm">Printing Guidelines</h4>
                        <ul className="text-xs text-emerald-700 mt-1 space-y-1 list-disc ml-4 font-medium">
                            <li>Use **A4 Size** paper for printing.</li>
                            <li>Set **Margins to None** in browser print settings.</li>
                            <li>Enable **Background Graphics** to show colors.</li>
                            <li>Ensure the exam details are correct before bulk printing.</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}

function AdmitCard({
    student, schoolName, branchInfo, session, classNameId, sectionName,
    examTitle, examDate, examTime, instructions, layoutType, className = ""
}) {
    if (!student) return null;

    const isSmall = layoutType === "10";
    const branchName = branchInfo?.name || "";
    const city = branchInfo?.city || "";

    return (
        <div className={`admit-card-base ${className} flex flex-col p-3 border-2 border-slate-200 relative`}>
            <div className="text-center border-b border-slate-100 pb-1 mb-2">
                <h3 className="text-[10px] font-black uppercase text-slate-900 tracking-tight leading-none mb-1">{schoolName}</h3>
                <p className="text-[7px] font-bold text-slate-500 uppercase tracking-widest leading-none">{branchName} {city && `| ${city}`}</p>
                <div className="mt-1.5 inline-block px-3 py-0.5 bg-slate-900 rounded-full max-w-[90%] truncate">
                    <p className="text-[8px] font-bold text-white uppercase tracking-wider leading-none whitespace-nowrap overflow-hidden text-ellipsis">{examTitle || 'ADMIT CARD'}</p>
                </div>
            </div>

            <div className={`flex gap-4 items-start ${isSmall ? '' : 'flex-1'}`}>
                <div className="flex-1 space-y-1">
                    <InfoRow label="Student Name" value={student.name} highlight />
                    <InfoRow label="Admission No" value={student.appId} />
                    <div className="grid grid-cols-2 gap-2">
                        <InfoRow label="Class / Sec" value={`${classNameId} - ${sectionName}`} />
                        <InfoRow label="Roll No" value={student.rollNo ? student.rollNo.toString().padStart(2, "0") : '-'} />
                    </div>
                    {(examDate || examTime) && (
                        <div className="grid grid-cols-2 gap-2 mt-0.5">
                            <InfoRow label="Exam Date" value={examDate} icon={Calendar} />
                            <InfoRow label="Time Slot" value={examTime} icon={Clock} />
                        </div>
                    )}
                </div>
                <div className="w-14 h-16 admit-photo-placeholder flex-shrink-0 border border-slate-200 rounded">
                    <User size={20} className="text-slate-200" />
                </div>
            </div>

            {!isSmall && (
                <div className="mt-4 pt-3 border-t border-slate-100 flex-1 overflow-hidden">
                    <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-1.5 leading-none">Important Instructions</p>
                    <p className="text-[8px] text-slate-600 leading-snug italic whitespace-pre-line overflow-hidden max-h-[60px]">
                        {instructions || "No instructions provided."}
                    </p>
                </div>
            )}

            <div className="mt-auto pt-2 flex justify-between items-end border-t border-slate-50">
                <div className="text-[7px] font-bold text-slate-400">
                    <p>Session: {session}</p>
                    <p>ID: {student.uid.slice(-6).toUpperCase()}</p>
                </div>
                <div className="text-center">
                    <div className="w-16 border-t border-slate-400 mb-0.5"></div>
                    <p className="text-[6px] font-bold text-slate-900 uppercase">Principle Signature</p>
                </div>
            </div>

            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.03] rotate-[-25deg] pointer-events-none select-none">
                <GraduationCap size={100} />
            </div>
        </div>
    );
}

function InfoRow({ label, value, highlight = false, icon: Icon = null }) {
    return (
        <div className="flex flex-col">
            <div className="flex items-center gap-1">
                {Icon && <Icon size={8} className="text-slate-400" />}
                <span className="text-[6px] font-black uppercase text-slate-400 tracking-widest leading-none">{label}</span>
            </div>
            <span className={`text-[9px] font-bold leading-tight truncate uppercase ${highlight ? 'text-slate-900 border-b border-slate-100' : 'text-slate-700'}`}>
                {value || '-'}
            </span>
        </div>
    );
}

function WizardTab({ active, label, onClick, icon: Icon }) {
    return (
        <button
            onClick={onClick}
            className={`flex items-center gap-2.5 px-5 py-2.5 rounded-md border transition-all ${active ? 'bg-(--primary-soft) border-(--primary) text-(--primary) shadow-sm' : 'bg-(--bg-card) border-(--border) text-(--text-muted) hover:text-(--text)'}`}
        >
            <Icon size={16} />
            <span className="font-semibold text-xs uppercase tracking-tight">{label}</span>
        </button>
    );
}
