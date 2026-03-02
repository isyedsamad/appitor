export const PERMISSIONS = {
  Dashboard: ["dashboard.view", "dashboard.manage"],
  Academics: [
    "academic.classes.view", "academic.classes.manage",
    "academic.subjects.view", "academic.subjects.manage"
  ],
  Admissions: [
    "admission.new.view", "admission.new.manage",
    "admission.enquiry.view", "admission.enquiry.manage",
    "admission.import.view", "admission.import.manage"
  ],
  Students: [
    "student.profile.view", "student.profile.manage",
    "student.promote.view", "student.promote.manage",
    "student.alumni.view", "student.alumni.manage",
    "student.rollno.view", "student.rollno.manage",
    "student.idcard.view", "student.idcard.manage"
  ],
  Employees: [
    "employee.admit.view", "employee.admit.manage",
    "employee.profile.view", "employee.profile.manage",
    "employee.attendance.view", "employee.attendance.manage"
  ],
  Attendance: [
    "attendance.mark.view", "attendance.mark.manage",
    "attendance.pending.view", "attendance.pending.manage",
    "attendance.student.view", "attendance.student.manage",
    "attendance.employee.view", "attendance.employee.manage"
  ],
  "Fees & Accounts": [
    "fee.setup.view", "fee.setup.manage",
    "fee.operations.view", "fee.operations.manage",
    "fee.reports.view", "fee.reports.manage"
  ],
  Learning: [
    "learning.homework.view", "learning.homework.manage",
    "learning.assignments.view", "learning.assignments.manage",
    "learning.materials.view", "learning.materials.manage"
  ],
  Timetable: [
    "timetable.mapping.view", "timetable.mapping.manage",
    "timetable.view.view", "timetable.view.manage",
    "timetable.edit.view", "timetable.edit.manage",
    "timetable.settings.view", "timetable.settings.manage",
    "timetable.substitute.view", "timetable.substitute.manage"
  ],
  Exams: [
    "exam.terms.view", "exam.terms.manage",
    "exam.setup.view", "exam.setup.manage",
    "exam.marks.view", "exam.marks.manage",
    "exam.reports.view", "exam.reports.manage"
  ],
  Communication: [
    "communication.noticeboard.view", "communication.noticeboard.manage",
    "communication.class.view", "communication.class.manage",
    "communication.employee.view", "communication.employee.manage",
    "communication.student.view", "communication.student.manage",
    "communication.whatsapp.view", "communication.whatsapp.manage"
  ],
  "Leave & Complaints": [
    "leave.view", "leave.manage",
    "complaint.view", "complaint.manage"
  ],
  Holiday: [
    "holiday.view", "holiday.manage"
  ],
  "Reports & Analytics": [
    "report.student.view", "report.student.manage",
    "report.attendance.view", "report.attendance.manage",
    "report.workload.view", "report.workload.manage"
  ],
  "System Settings": [
    "system.profile.view", "system.profile.manage",
    "system.academic.view", "system.academic.manage",
    "system.roles.view", "system.roles.manage"
  ],
  Other: [
    "transport.manage.view", "transport.manage.manage",
    "hostel.manage.view", "hostel.manage.manage"
  ]
};
