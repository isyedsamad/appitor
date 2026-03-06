"use client";

import React from 'react';
import Link from 'next/link';
import {
    CheckCircle2,
    Circle,
    ArrowRight,
    Settings2,
    Layers,
    BookMarked,
    Sparkles,
    ChevronRight,
    CalendarClock
} from 'lucide-react';
import { usePathname } from 'next/navigation';

export default function OnboardingWizard({ schoolId, sessions = [], classes = [], subjects = [], timetableReady = false }) {
    const pathname = usePathname();

    const steps = [
        {
            id: 'sessions',
            title: 'Academic Sessions',
            description: 'Set up your first academic year or term.',
            path: `/school/${schoolId}/system/academic`,
            isComplete: (sessions || []).length > 0,
            icon: Settings2
        },
        {
            id: 'classes',
            title: 'Academic Classes',
            description: 'Add classes like Class 1, Grade 10, etc.',
            path: `/school/${schoolId}/academics/classes`,
            isComplete: (classes || []).length > 0,
            icon: Layers
        },
        {
            id: 'subjects',
            title: 'Academic Subjects',
            description: 'Define the curriculum for your school.',
            path: `/school/${schoolId}/academics/subjects`,
            isComplete: (subjects || []).length > 0,
            icon: BookMarked
        },
        {
            id: 'timetable',
            title: 'Timetable Settings',
            description: 'Define your school hours and periods.',
            path: `/school/${schoolId}/timetable/settings`,
            isComplete: timetableReady,
            icon: CalendarClock
        }
    ];

    const completedCount = steps.filter(s => s.isComplete).length;
    const progressPercent = (completedCount / steps.length) * 100;

    if (completedCount === steps.length) return null;

    return (
        <div className="bg-(--bg-card) border border-(--border) shadow-sm rounded-2xl overflow-hidden animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <div className="flex items-start gap-4">
                        <div className="p-3 rounded-xl bg-(--primary-soft) text-(--primary)">
                            <Sparkles size={24} />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-(--text)">Welcome to Appitor!</h2>
                            <p className="text-[11px] text-(--text-muted) font-semibold">Let's get your school ready in a few easy steps.</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 bg-(--bg-soft) px-4 py-2 rounded-xl border border-(--border)">
                        <div className="text-[10px] font-semibold text-(--text-muted) uppercase tracking-widest">Setup Progress</div>
                        <div className="w-24 h-1.5 bg-(--border) rounded-full overflow-hidden">
                            <div
                                className="h-full bg-(--primary) transition-all duration-700 ease-out"
                                style={{ width: `${progressPercent}%` }}
                            />
                        </div>
                        <div className="text-xs font-bold text-(--primary)">{completedCount}/{steps.length}</div>
                    </div>
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                    {steps.map((step, idx) => (
                        <Link
                            key={step.id}
                            href={step.path}
                            className={`group p-5 rounded-2xl border transition-all duration-300 ${step.isComplete
                                ? 'bg-(--bg-soft)/50 border-(--border) opacity-80'
                                : 'bg-(--bg-card) border-(--border) hover:border-(--primary)/30 hover:shadow-xl hover:shadow-(--primary)/5'
                                }`}
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div className={`p-2.5 rounded-xl ${step.isComplete ? 'bg-green-500/10 text-green-500' : 'bg-(--primary-soft) text-(--primary)'
                                    }`}>
                                    <step.icon size={20} />
                                </div>
                                {step.isComplete ? (
                                    <CheckCircle2 size={20} className="text-green-500" />
                                ) : (
                                    <div className="w-5 h-5 rounded-full border-2 border-(--border) flex items-center justify-center text-[10px] font-bold text-(--text-muted)">
                                        {idx + 1}
                                    </div>
                                )}
                            </div>
                            <h3 className={`text-sm font-bold transition-colors ${step.isComplete ? 'text-(--text-muted)' : 'text-(--text) group-hover:text-(--primary)'
                                }`}>
                                {step.title}
                            </h3>
                            <p className="text-[11px] text-(--text-muted) font-semibold">
                                {step.description}
                            </p>

                            {!step.isComplete && (
                                <div className="mt-3 flex items-center text-[10px] font-bold text-(--primary) uppercase tracking-widest gap-1 group-hover:gap-2 transition-all">
                                    Setup Now <ChevronRight size={12} />
                                </div>
                            )}
                            {step.isComplete && (
                                <div className="mt-3 flex items-center text-[10px] font-bold text-green-500 uppercase tracking-widest gap-1">
                                    Completed
                                </div>
                            )}
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
}
