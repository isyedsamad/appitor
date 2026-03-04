import { useState, useRef, useEffect } from "react";
import { Download, FileDown, Table } from "lucide-react";

export default function AttendanceExportButtons({ onExportPDF, onExportExcel, disabled }) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                disabled={disabled}
                onClick={() => setIsOpen(!isOpen)}
                className={`btn-outline text-xs flex items-center justify-center gap-2 px-4 border-(--status-p-border) text-(--status-p-text) bg-(--status-p-bg)/30 hover:bg-(--status-p-bg)/50 transition-all ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
                <Download size={16} />
                <span className="font-semibold">Export</span>
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-(--bg-card) border border-(--border) rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    <button
                        onClick={() => {
                            onExportPDF();
                            setIsOpen(false);
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm text-(--text) hover:bg-(--bg-soft) transition-colors text-left"
                    >
                        <FileDown size={16} className="text-red-500" />
                        PDF Document
                    </button>
                    <button
                        onClick={() => {
                            onExportExcel();
                            setIsOpen(false);
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm text-(--text) hover:bg-(--bg-soft) transition-colors text-left border-t border-(--border)"
                    >
                        <Table size={16} className="text-green-600" />
                        Excel Sheet
                    </button>
                </div>
            )}
        </div>
    );
}
