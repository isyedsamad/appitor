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
        if (schoolUser?.schoolId && branch && session) {
            fetchTerms(session);
        } else {
            setTerms([]);
            setTermId("");
        }
    }, [schoolUser?.schoolId, branch, session]);

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
                                    type="date"
                                    value={examDate}
                                    onChange={e => setExamDate(e.target.value)}
                                    className="input w-full bg-(--bg-soft)"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-(--text-muted) uppercase ml-1">Time Slot</label>
                                <input
                                    type="time"
                                    value={examTime}
                                    onChange={e => setExamTime(e.target.value)}
                                    className="input w-full bg-(--bg-soft)"
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

const generateBarcode = (text) => {
    const code39 = {
        '0': '000110100', '1': '100100001', '2': '001100001', '3': '101100000',
        '4': '000110001', '5': '100110000', '6': '001110000', '7': '000100101',
        '8': '100100100', '9': '001100100', 'A': '100001001', 'B': '001001001',
        'C': '101001000', 'D': '000011001', 'E': '100011000', 'F': '001011000',
        'G': '000001101', 'H': '100001100', 'I': '001001100', 'J': '000011100',
        'K': '100000011', 'L': '001000011', 'M': '101000010', 'N': '000010011',
        'O': '100010010', 'P': '001010010', 'Q': '000000111', 'R': '100000110',
        'S': '001000110', 'T': '000010110', 'U': '110000001', 'V': '011000001',
        'W': '111000000', 'X': '010010001', 'Y': '110010000', 'Z': '011010000',
        '-': '010000101', '.': '110000100', ' ': '011000100', '*': '010010100'
    };
    const cleanText = `*${(text || "").toUpperCase().replace(/[^0-9A-Z\-.\s]/g, "")}*`;
    let x = 0;
    const bars = [];
    for (let i = 0; i < cleanText.length; i++) {
        const char = cleanText[i];
        const pattern = code39[char] || code39[' '];
        for (let j = 0; j < 9; j++) {
            const isWide = pattern[j] === '1';
            const width = isWide ? 3 : 1;
            const isBar = j % 2 === 0;
            if (isBar) {
                bars.push({ x, width });
            }
            x += width;
        }
        x += 1;
    }
    return { bars, totalWidth: x };
};

const renderBarcode = (text) => {
    const { bars, totalWidth } = generateBarcode(text);
    return (
        <svg viewBox={`0 0 ${totalWidth} 20`} className="w-16 h-4">
            {bars.map((bar, idx) => (
                <rect key={idx} x={bar.x} y="0" width={bar.width} height="20" fill="black" />
            ))}
        </svg>
    );
};

function AdmitCard({
    student, schoolName, branchInfo, session, classNameId, sectionName,
    examTitle, examDate, examTime, instructions, layoutType, className = ""
}) {
    if (!student) return null;

    const isSmall = layoutType === "10";
    const branchName = branchInfo?.name || "";
    const city = branchInfo?.city || "";

    const formatDate = (dateStr) => {
        if (!dateStr) return "TBA";
        try {
            const d = new Date(dateStr);
            if (isNaN(d.getTime())) return dateStr;
            return d.toLocaleDateString("en-US", { day: 'numeric', month: 'short', year: 'numeric' });
        } catch {
            return dateStr;
        }
    };

    const formatTime = (timeStr) => {
        if (!timeStr) return "TBA";
        try {
            const parts = timeStr.split(":");
            if (parts.length < 2) return timeStr;
            const h = parseInt(parts[0], 10);
            const m = parts[1];
            if (isNaN(h)) return timeStr;
            const ampm = h >= 12 ? "PM" : "AM";
            const displayHour = h % 12 || 12;
            return `${displayHour}:${m} ${ampm}`;
        } catch {
            return timeStr;
        }
    };

    return (
        <div className={`admit-card-base ${className}`}>
            <div className="admit-card-inner-border" />
            <div className="admit-card-content">
                <div className="text-center border-b border-black pb-1 mb-2 relative">
                    <h3 className="text-[11px] font-bold uppercase text-black tracking-normal leading-none">{schoolName}</h3>
                    <p className="text-[7px] font-bold text-gray-500 uppercase tracking-wide leading-none">{branchName} {city && `| ${city}`}</p>
                    <div className="mt-1.5 inline-block px-3 py-0.5 bg-black border border-black rounded-sm max-w-[90%] truncate">
                        <p className="text-[7px] font-bold text-white uppercase tracking-widest leading-none whitespace-nowrap overflow-hidden text-ellipsis">{examTitle || 'EXAMINATION HALL TICKET'}</p>
                    </div>
                </div>

                {isSmall ? (
                    <div className="grid grid-cols-12 gap-2 items-center flex-1">
                        <div className="col-span-8 space-y-1">
                            <div className="flex flex-col border-b border-gray-100 pb-0.5">
                                <span className="text-[5.5px] font-bold text-gray-500 uppercase tracking-wider">Student Name</span>
                                <span className="text-[13px] font-bold text-black uppercase truncate">{student.name}</span>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div className="flex flex-col">
                                    <span className="text-[5.5px] font-bold text-gray-500 uppercase tracking-wider">Admission No</span>
                                    <span className="text-[8px] font-bold text-black uppercase truncate">{student.appId}</span>
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[5.5px] font-bold text-gray-500 uppercase tracking-wider">Class & Section</span>
                                    <span className="text-[8px] font-bold text-black uppercase truncate">{classNameId} - {sectionName}</span>
                                </div>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[5.5px] font-bold text-gray-500 uppercase tracking-wider">Schedule Time & Date</span>
                                <span className="text-[7.5px] font-bold text-black truncate">{formatDate(examDate)} | {formatTime(examTime)}</span>
                            </div>
                        </div>

                        <div className="col-span-4 flex flex-col items-center justify-center">
                            <div className="p-1.5 border border-black rounded-sm bg-gray-50 w-full text-center">
                                <span className="block font-bold text-[6px] text-gray-500 tracking-wider">ROLL NO</span>
                                <span className="block text-[16px] font-bold text-black leading-none">{student.rollNo ? student.rollNo.toString().padStart(2, "0") : '-'}</span>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-2">
                        <div className="grid grid-cols-3 gap-3 border-b border-gray-200 pb-2">
                            <div className="space-y-1.5">
                                <div className="flex flex-col">
                                    <span className="text-[6px] font-bold text-gray-500 uppercase tracking-wider">Student Name</span>
                                    <span className="text-[12px] font-bold text-black uppercase truncate">{student.name}</span>
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[6px] font-bold text-gray-500 uppercase tracking-wider">Admission Number</span>
                                    <span className="text-[8px] font-bold text-black uppercase truncate">{student.appId}</span>
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <div className="flex flex-col">
                                    <span className="text-[6px] font-bold text-gray-500 uppercase tracking-wider">Class / Section</span>
                                    <span className="text-[8px] font-bold text-black uppercase truncate">{classNameId} - {sectionName}</span>
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[6px] font-bold text-gray-500 uppercase tracking-wider">Academic Session</span>
                                    <span className="text-[8px] font-bold text-black uppercase truncate">{session}</span>
                                </div>
                            </div>

                            <div className="flex flex-col items-center justify-between">
                                <div className="border border-black rounded-sm p-1.5 w-full text-center bg-gray-50">
                                    <span className="block font-black text-[6px] text-gray-500 tracking-wider leading-none">ROLL NUMBER</span>
                                    <span className="block text-[13px] font-extrabold text-black leading-none mt-1">{student.rollNo ? student.rollNo.toString().padStart(2, "0") : '-'}</span>
                                </div>
                                <div className="text-right w-full mt-1">
                                    <span className="text-[5.5px] font-bold text-gray-500 uppercase block tracking-wider leading-none">Exam Center</span>
                                    <span className="text-[7px] font-bold text-black block truncate leading-tight uppercase">School Exam Hall</span>
                                </div>
                            </div>
                        </div>

                        <div className="mt-1">
                            <table className="admit-schedule-table">
                                <thead>
                                    <tr>
                                        <th className="w-1/3">Subject / Paper</th>
                                        <th>Exam Date</th>
                                        <th>Time / Session</th>
                                        <th>Reporting</th>
                                        <th>Room</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td className="font-bold text-black uppercase truncate max-w-[120px]">{examTitle || 'Term Exam'}</td>
                                        <td>{formatDate(examDate)}</td>
                                        <td className="truncate max-w-[80px]">{formatTime(examTime)}</td>
                                        <td>8:45 AM</td>
                                        <td>Exam Hall</td>
                                    </tr>
                                    <tr>
                                        <td className="text-gray-400">Next Scheduled Paper</td>
                                        <td className="text-gray-400">As per date sheet</td>
                                        <td className="text-gray-400">As per date sheet</td>
                                        <td className="text-gray-400">8:45 AM</td>
                                        <td className="text-gray-400">Exam Hall</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        <div className="mt-1.5 border-t border-gray-200 pt-1">
                            <p className="text-[5.5px] font-bold text-gray-500 uppercase tracking-widest mb-0.5">Instructions to Candidate</p>
                            <p className="text-[6.5px] text-gray-700 leading-tight italic line-clamp-2">
                                {instructions || "1. Bring this card. 2. No electronic devices. 3. Arrive 15m early."}
                            </p>
                        </div>
                    </div>
                )}

                <div className="mt-auto pt-1 flex justify-between items-end border-t border-gray-300 relative">
                    <div className="absolute bottom-1 right-28 pointer-events-none opacity-[0.08]">
                        <svg width="45" height="45" viewBox="0 0 100 100" className="text-black">
                            <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" strokeWidth="2" />
                            <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="0.5" strokeDasharray="3 3" />
                            <path id="stamp-text-path" fill="none" d="M 15 50 A 35 35 0 1 1 85 50" />
                            <text className="font-bold text-[8px]" fill="currentColor">
                                <textPath href="#stamp-text-path" startOffset="50%" textAnchor="middle">
                                    APPTOR SCHOOL
                                </textPath>
                            </text>
                            <path id="stamp-text-path-bottom" fill="none" d="M 85 50 A 35 35 0 1 1 15 50" />
                            <text className="font-bold text-[8px]" fill="currentColor">
                                <textPath href="#stamp-text-path-bottom" startOffset="50%" textAnchor="middle">
                                    OFFICIAL SEAL
                                </textPath>
                            </text>
                            <polygon points="50,32 53,40 62,40 55,45 57,53 50,48 43,53 45,45 38,40 47,40" fill="currentColor" />
                        </svg>
                    </div>

                    <div className="text-[6px] font-bold text-gray-400 flex items-center gap-2">
                        <div>
                            <p>Session: {session}</p>
                            <p>ID: {student.uid.slice(-6).toUpperCase()}</p>
                        </div>
                        <div className="border-l border-gray-200 pl-2">
                            {renderBarcode(student.appId)}
                        </div>
                    </div>

                    <div className="flex gap-4 items-end">
                        <div className="text-center flex flex-col items-center relative">
                            <div className="w-12 border-t border-gray-400 mb-0.5"></div>
                            <p className="text-[5.5px] font-bold text-black uppercase">Principal Sign</p>
                        </div>
                    </div>
                </div>

                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.02] rotate-[-25deg] pointer-events-none select-none text-black">
                    <GraduationCap size={90} />
                </div>
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
