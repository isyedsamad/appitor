const CORE_P = [
    "dashboard.view", "dashboard.manage",
    "academic.classes.view", "academic.classes.manage",
    "academic.subjects.view", "academic.subjects.manage",
    "student.profile.view", "student.profile.manage",
    "student.promote.view", "student.promote.manage",
    "student.alumni.view", "student.alumni.manage",
    "student.rollno.view", "student.rollno.manage",
    "student.idcard.view", "student.idcard.manage",
    "employee.admit.view", "employee.admit.manage",
    "employee.profile.view", "employee.profile.manage",
    "attendance.mark.student.view", "attendance.mark.student.manage",
    "attendance.mark.employee.view", "attendance.mark.employee.manage",
    "attendance.mark.past.manage",
    "attendance.pending.view", "attendance.pending.manage",
    "attendance.student.view", "attendance.student.manage",
    "attendance.employee.view", "attendance.employee.manage",
    "fee.setup.view", "fee.setup.manage",
    "fee.operations.view", "fee.operations.manage",
    "fee.reports.view", "fee.reports.manage",
    "admission.new.view", "admission.new.manage",
    "admission.enquiry.view", "admission.enquiry.manage",
    "admission.import.view", "admission.import.manage",
    "holiday.view", "holiday.manage",
    "system.profile.view", "system.profile.manage",
    "system.academic.view", "system.academic.manage",
    "system.roles.view", "system.roles.manage"
];

const CONNECT_P = [
    ...CORE_P,
    "payroll.view", "payroll.manage",
    "timetable.mapping.view", "timetable.mapping.manage",
    "timetable.view.view", "timetable.view.manage",
    "timetable.edit.view", "timetable.edit.manage",
    "timetable.settings.view", "timetable.settings.manage",
    "learning.homework.view", "learning.homework.manage",
    "learning.assignments.view", "learning.assignments.manage",
    "learning.materials.view", "learning.materials.manage",
    "communication.noticeboard.view", "communication.noticeboard.manage"
];

const PLUS_P = [
    ...CONNECT_P,
    "communication.class.view", "communication.class.manage",
    "communication.employee.view", "communication.employee.manage",
    "communication.student.view", "communication.student.manage",
    "communication.whatsapp.view", "communication.whatsapp.manage",
    "timetable.substitute.view", "timetable.substitute.manage",
    "exam.terms.view", "exam.terms.manage",
    "exam.setup.view", "exam.setup.manage",
    "exam.marks.view", "exam.marks.manage",
    "exam.reports.view", "exam.reports.manage",
    "leave.view", "leave.manage",
    "complaint.view", "complaint.manage",
    "report.student.view", "report.student.manage",
    "report.attendance.view", "report.attendance.manage",
    "report.workload.view", "report.workload.manage",
    "website.view", "website.manage"
];

const PLAN_MAP = {
    // Basic/Base plans
    core: new Set(CORE_P),
    basic: new Set(CORE_P),
    base: new Set(CORE_P),

    // Standard/Enhanced plans
    connect: new Set(CONNECT_P),
    standard: new Set(CONNECT_P),
    pro: new Set(CONNECT_P),

    // Premium/Enterprise plans
    plus: new Set(PLUS_P),
    enterprise: new Set(PLUS_P),
    premium: new Set(PLUS_P),
    elite: new Set(PLUS_P),

    // Full access
    trial: new Set(["*"]),
    admin: new Set(["*"]),
};

export function hasPlanAccess(plan, requiredPermission) {
    if (!requiredPermission) return true;
    if (!plan) return false;

    const activePlan = plan.toLowerCase();
    const granted = PLAN_MAP[activePlan];
    if (!granted) return false;

    if (granted.has("*")) return true;

    const check = (p) => {
        if (granted.has(p)) return true;
        const prefix = p.split('.')[0];
        if (granted.has(`${prefix}.*`)) return true;
        return false;
    };

    if (Array.isArray(requiredPermission)) {
        return requiredPermission.some(check);
    }

    return check(requiredPermission);
}
