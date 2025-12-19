import {
  LayoutDashboard,
  GraduationCap,
  Users,
  UserCog,
  ClipboardList,
  Calendar,
  FileText,
  IndianRupee,
  BookOpen,
  MessageSquare,
  Bus,
  Building,
  BarChart3,
  Settings,
} from "lucide-react";

export const MENU = [
  /* ================= DASHBOARD ================= */
  {
    label: "Dashboard",
    icon: LayoutDashboard,
    href: "/dashboard",
    permission: "dashboard.view",
  },

  /* ================= ACADEMICS ================= */
  {
    label: "Academics",
    icon: GraduationCap,
    permission: "academics.manage",
    children: [
      { label: "Classes & Sections", href: "/academics/classes", permission: "academics.manage" },
      { label: "Subjects", href: "/academics/subjects", permission: "academics.manage" },
      { label: "Subject-Teacher Mapping", href: "academics/mapping", permission: "academics.manage" },
      { label: "Streams / Groups", href: "academics/streams", permission: "academics.manage" },
      { label: "Class Promotions Setup", href: "academics/promotions", permission: "academics.manage" },
    ],
  },

  /* ================= ADMISSIONS ================= */
  {
    label: "Admissions",
    icon: FileText,
    permission: "admissions.manage",
    children: [
      { label: "New Admission", href: "admissions/new", permission: "admissions.manage" },
      { label: "Enquiry Management", href: "admissions/enquiry", permission: "admissions.manage" },
      { label: "Admission Follow-ups", href: "admissions/followups", permission: "admissions.manage" },
      { label: "Admission Reports", href: "admissions/reports", permission: "admissions.manage" },
    ],
  },

  /* ================= STUDENTS ================= */
  {
    label: "Students",
    icon: Users,
    permission: "students.manage",
    children: [
      { label: "Student Profile", href: "students", permission: "students.view" },
      { label: "Promote / Demote", href: "students/promote", permission: "students.manage" },
      { label: "Assign Roll Numbers", href: "students/rollno", permission: "students.manage" },
      { label: "ID Cards", href: "students/idcards", permission: "students.manage" },
      { label: "Import / Export", href: "students/import-export", permission: "students.manage" },
    ],
  },

  /* ================= EMPLOYEES ================= */
  {
    label: "Employees",
    icon: UserCog,
    permission: "employees.manage",
    children: [
      { label: "Admit Employee", href: "employees/admit", permission: "employees.manage" },
      { label: "Employee Profile", href: "employees", permission: "employees.view" },
      { label: "Employee Attendance", href: "employees/attendance", permission: "employees.manage" },
      { label: "Import / Export", href: "employees/import-export", permission: "employees.manage" },
    ],
  },

  /* ================= ATTENDANCE ================= */
  {
    label: "Attendance",
    icon: ClipboardList,
    permission: "attendance.manage",
    children: [
      { label: "Student Attendance", href: "attendance/students", permission: "attendance.manage" },
      { label: "Employee Attendance", href: "attendance/employees", permission: "attendance.manage" },
    ],
  },

  /* ================= TIMETABLE ================= */
  {
    label: "Timetable",
    icon: Calendar,
    permission: "timetable.manage",
    children: [
      { label: "View Timetable", href: "timetable/view", permission: "timetable.view" },
      { label: "Edit Timetable", href: "timetable/manage", permission: "timetable.manage" },
      { label: "Timetable Settings", href: "timetable/settings", permission: "timetable.manage" },
      { label: "Substitutions", href: "timetable/substitutions", permission: "timetable.manage" },
      { label: "Temporary Timetable", href: "timetable/temp", permission: "timetable.manage" },
    ],
  },

  /* ================= EXAMS ================= */
  {
    label: "Exams & Results",
    icon: BookOpen,
    permission: "exams.manage",
    children: [
      { label: "Exam Terms", href: "exams/terms", permission: "exams.manage" },
      { label: "Exam Setup", href: "exams/setup", permission: "exams.manage" },
      { label: "Marks Entry", href: "exams/marks", permission: "exams.manage" },
      { label: "Exam Reports", href: "exams/reports", permission: "exams.view" },
    ],
  },

  /* ================= FEES ================= */
  {
    label: "Fees & Accounts",
    icon: IndianRupee,
    permission: "fees.manage",
    children: [
      { label: "Fee Heads", href: "fees/heads", permission: "fees.manage" },
      { label: "Fee Templates", href: "fees/templates", permission: "fees.manage" },
      { label: "Student Fee Assignment", href: "fees/assign", permission: "fees.manage" },
      { label: "Fee Dues", href: "fees/dues", permission: "fees.manage" },
      { label: "Collect Fees", href: "fees/collect", permission: "fees.manage" },
      { label: "Receipts", href: "fees/receipts", permission: "fees.manage" },
      { label: "Fee Ledger", href: "fees/ledger", permission: "fees.manage" },
      { label: "Day Book", href: "finance/daybook", permission: "fees.manage" },
      { label: "Finance Reports", href: "finance/reports", permission: "fees.view" },
    ],
  },

  /* ================= LEARNING ================= */
  {
    label: "Learning",
    icon: BookOpen,
    permission: "learning.manage",
    children: [
      { label: "Homework", href: "learning/homework", permission: "learning.manage" },
      { label: "Assignments", href: "learning/assignments", permission: "learning.manage" },
      { label: "Study Materials", href: "learning/materials", permission: "learning.manage" },
      { label: "Submission Tracking", href: "learning/submissions", permission: "learning.manage" },
      { label: "Teacher Lesson Plans", href: "learning/lesson-plans", permission: "learning.manage" },
    ],
  },

  /* ================= COMMUNICATION ================= */
  {
    label: "Communication",
    icon: MessageSquare,
    permission: "communication.manage",
    children: [
      { label: "Noticeboard", href: "communication/noticeboard", permission: "communication.manage" },
      { label: "Class Notice", href: "communication/class", permission: "communication.manage" },
      { label: "Student Messaging", href: "communication/student", permission: "communication.manage" },
      { label: "Templates", href: "communication/templates", permission: "communication.manage" },
    ],
  },

  /* ================= LEAVE / COMPLAINT ================= */
  {
    label: "Leave Portal",
    icon: ClipboardList,
    href: "leave",
    permission: "leave.manage",
  },
  {
    label: "Complaint Portal",
    icon: MessageSquare,
    href: "complaints",
    permission: "complaints.manage",
  },

  /* ================= TRANSPORT ================= */
  {
    label: "Transport",
    icon: Bus,
    permission: "transport.manage",
    children: [
      { label: "Routes", href: "transport/routes", permission: "transport.manage" },
      { label: "Vehicles", href: "transport/vehicles", permission: "transport.manage" },
      { label: "Drivers", href: "transport/drivers", permission: "transport.manage" },
      { label: "Student Allocation", href: "transport/allocation", permission: "transport.manage" },
      { label: "Transport Fees", href: "transport/fees", permission: "transport.manage" },
    ],
  },

  /* ================= HOSTEL ================= */
  {
    label: "Hostel",
    icon: Building,
    permission: "hostel.manage",
    children: [
      { label: "Hostels", href: "hostel/list", permission: "hostel.manage" },
      { label: "Rooms", href: "hostel/rooms", permission: "hostel.manage" },
      { label: "Student Allocation", href: "hostel/allocation", permission: "hostel.manage" },
      { label: "Hostel Attendance", href: "hostel/attendance", permission: "hostel.manage" },
      { label: "Hostel Fees", href: "hostel/fees", permission: "hostel.manage" },
    ],
  },

  /* ================= REPORTS ================= */
  {
    label: "Reports & Analytics",
    icon: BarChart3,
    permission: "reports.view",
    children: [
      { label: "Student Reports", href: "reports/students", permission: "reports.view" },
      { label: "Attendance Reports", href: "reports/attendance", permission: "reports.view" },
      { label: "Fee Reports", href: "reports/fees", permission: "reports.view" },
      { label: "Exam Reports", href: "reports/exams", permission: "reports.view" },
      { label: "Payroll Reports", href: "reports/payroll", permission: "reports.view" },
      { label: "Teacher Workload", href: "reports/workload", permission: "reports.view" },
      { label: "Class Performance", href: "reports/performance", permission: "reports.view" },
      { label: "Export Reports", href: "reports/export", permission: "reports.view" },
    ],
  },

  /* ================= SYSTEM ================= */
  {
    label: "System Settings",
    icon: Settings,
    permission: "system.manage",
    children: [
      { label: "School Profile", href: "system/profile", permission: "system.manage" },
      { label: "Academic Settings", href: "system/academic", permission: "system.manage" },
      { label: "Roles & Permissions", href: "system/roles", permission: "system.manage" },
      { label: "Automation Rules", href: "system/automation", permission: "system.manage" },
      { label: "Import / Export", href: "system/import-export", permission: "system.manage" },
      { label: "Data Backup", href: "system/backup", permission: "system.manage" },
      { label: "Audit Logs", href: "system/audit", permission: "system.manage" },
      { label: "API & Integrations", href: "system/integrations", permission: "system.manage" },
      { label: "App Settings", href: "system/app", permission: "system.manage" },
    ],
  },
];
