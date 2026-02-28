import { FieldValue } from "firebase-admin/firestore";

export const getAnalyticsRef = (adminDb, schoolId, branchId) => {
    return adminDb
        .collection("schools")
        .doc(schoolId)
        .collection("branches")
        .doc(branchId)
        .collection("analytics")
        .doc("dashboard");
};

export async function incrementStudentCount(tx, adminDb, schoolId, branchId, amount, gender) {
    const ref = getAnalyticsRef(adminDb, schoolId, branchId);
    const updates = {
        studentCount: FieldValue.increment(amount),
        updatedAt: FieldValue.serverTimestamp()
    };

    if (gender) {
        const genderKey = gender.toLowerCase() === 'male' ? 'genderMale' :
            gender.toLowerCase() === 'female' ? 'genderFemale' : 'genderOther';
        updates[genderKey] = FieldValue.increment(amount);
    }

    tx.set(ref, updates, { merge: true });
}

export async function incrementEmployeeCount(tx, adminDb, schoolId, branchId, amount) {
    const ref = getAnalyticsRef(adminDb, schoolId, branchId);
    tx.set(ref, {
        teacherCount: FieldValue.increment(amount),
        updatedAt: FieldValue.serverTimestamp()
    }, { merge: true });
}

export async function updateAttendanceAnalytics(tx, adminDb, schoolId, branchId, type, date, oldRecords = {}, newRecords = {}) {
    const dashboardRef = getAnalyticsRef(adminDb, schoolId, branchId);
    const dateRef = adminDb
        .collection("schools")
        .doc(schoolId)
        .collection("branches")
        .doc(branchId)
        .collection("analytics")
        .doc(date);

    const statuses = ['P', 'A', 'L', 'M', 'H', 'O'];
    const diff = {};
    statuses.forEach(s => diff[s] = 0);
    diff.Total = 0;

    const allUids = new Set([...Object.keys(oldRecords), ...Object.keys(newRecords)]);

    allUids.forEach(uid => {
        const oldVal = oldRecords[uid];
        const newVal = newRecords[uid];

        if (!oldVal && newVal) {
            diff.Total += 1;
            if (diff[newVal] !== undefined) diff[newVal] += 1;
        }
        else if (oldVal && !newVal) {
            diff.Total -= 1;
            if (diff[oldVal] !== undefined) diff[oldVal] -= 1;
        }
        else if (oldVal !== newVal) {
            if (diff[oldVal] !== undefined) diff[oldVal] -= 1;
            if (diff[newVal] !== undefined) diff[newVal] += 1;
        }
    });

    if (diff.Total === 0 && statuses.every(s => diff[s] === 0)) return;

    const prefix = type === 'student' ? 'student' : 'employee';
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const isToday = date === today.split('-').reverse().join('-');

    // 1. Dashboard Aggregate Updates
    const dashboardUpdates = { updatedAt: FieldValue.serverTimestamp() };

    if (isToday) {
        if (diff.Total !== 0) dashboardUpdates[`${prefix}AttendanceTotal`] = FieldValue.increment(diff.Total);
        if (type === 'student') {
            if (diff.P !== 0) dashboardUpdates.attendancePresent = FieldValue.increment(diff.P);
            if (diff.A !== 0) dashboardUpdates.attendanceAbsent = FieldValue.increment(diff.A);
            if (diff.Total !== 0) dashboardUpdates.attendanceTotal = FieldValue.increment(diff.Total);
        }
    }

    // Deep object structure for Dashboard `history` and `stats`
    const statsObj = {};
    const historyObj = { [date]: { [prefix]: {} } };
    let hasDashboardStats = false;
    let hasDashboardHistory = false;

    statuses.forEach(s => {
        if (diff[s] !== 0) {
            if (isToday) {
                statsObj[s] = FieldValue.increment(diff[s]);
                hasDashboardStats = true;
            }
            historyObj[date][prefix][s] = FieldValue.increment(diff[s]);
            hasDashboardHistory = true;
        }
    });

    if (diff.Total !== 0) {
        historyObj[date][prefix].Total = FieldValue.increment(diff.Total);
        hasDashboardHistory = true;
    }

    // Manually construct the nested updates instead of dotted keys so `merge: true` respects the tree
    if (hasDashboardStats) {
        dashboardUpdates.stats = { [prefix]: statsObj };
    }
    if (hasDashboardHistory) {
        dashboardUpdates.history = historyObj;
    }

    if (Object.keys(dashboardUpdates).length > 1) {
        tx.set(dashboardRef, dashboardUpdates, { merge: true });
    }

    // 2. Specific Date Document Updates (New structure)
    // Structure: analytics/01-03-2026 => { student: { P: 1, A: 2, Total: 3 }, employee: { P: 1, Total: 1 } }
    const dateDocUpdates = {
        updatedAt: FieldValue.serverTimestamp(),
        [prefix]: {}
    };

    statuses.forEach(s => {
        if (diff[s] !== 0) {
            dateDocUpdates[prefix][s] = FieldValue.increment(diff[s]);
        }
    });
    if (diff.Total !== 0) {
        dateDocUpdates[prefix].Total = FieldValue.increment(diff.Total);
    }

    tx.set(dateRef, dateDocUpdates, { merge: true });
}
