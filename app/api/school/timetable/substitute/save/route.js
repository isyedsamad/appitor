import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { verifyUser } from "@/lib/verifyUser";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { nanoid } from "nanoid";

async function sendExpoPush({ title, body, schoolId, branchId, roles, classId, sectionId }) {
    try {
        const tokenSnap = await adminDb
            .collection("fcmTokens")
            .where("schoolId", "==", schoolId)
            .where("branchId", "==", branchId)
            .where("active", "==", true)
            .where("role", "array-contains-any", roles)
            .where("classId", "==", classId)
            .where("sectionId", "==", sectionId)
            .get();

        if (tokenSnap.empty) return;
        const messages = [];
        tokenSnap.forEach((doc) => {
            const data = doc.data();
            messages.push({
                to: data.token,
                sound: "default",
                title,
                body,
                data: {
                    type: "class_notice",
                    classId,
                    sectionId,
                },
            });
        });

        for (let i = 0; i < messages.length; i += 100) {
            await fetch("https://exp.host/--/api/v2/push/send", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(messages.slice(i, i + 100)),
            });
        }
    } catch (err) {
        console.error("Substitution notice Expo push failed:", err);
    }
}

export async function POST(req) {
    try {
        const user = await verifyUser(req, "timetable.edit");
        const body = await req.json();
        const { branch, classId, sectionId, date, substitutions, day, sessionId, schoolName, shouldNotify } = body;

        if (!branch || !classId || !sectionId || !date || !substitutions || !day) {
            return NextResponse.json({ message: "Invalid payload" }, { status: 400 });
        }

        const docId = `${classId}_${sectionId}_${date}`;
        const baseRef = adminDb
            .collection("schools")
            .doc(user.schoolId)
            .collection("branches")
            .doc(branch)
            .collection("timetable")
            .doc("items")
            .collection("substitutions")
            .doc(docId);

        await baseRef.set({
            date,
            day,
            classId,
            sectionId,
            substitutions,
            meta: {
                updatedAt: FieldValue.serverTimestamp(),
                updatedBy: user.uid,
            },
        }, { merge: true });

        // Notification Logic
        if (shouldNotify && sessionId && schoolName) {
            const noticeId = nanoid(12);
            const now = Timestamp.now();
            const title = `Timetable Update`;
            const description = `Teacher substitution has been updated for Period(s): ${substitutions.map(s => `P${s.period}`).join(", ")} on ${new Date(date).toLocaleDateString('en-GB')} (${day}).`;

            const notice = {
                noticeId,
                title,
                description,
                roles: ["student", "parent"],
                priority: "high",
                classId,
                sectionId,
                createdBy: user.uid,
                createdByName: user.name || "Admin",
                createdAt: now,
                expiresAt: null
            };

            const noticeDocId = `${classId}_${sectionId}_${sessionId}`;
            const noticeRef = adminDb
                .collection("schools")
                .doc(user.schoolId)
                .collection("branches")
                .doc(branch)
                .collection("communication")
                .doc("items")
                .collection("class_notices")
                .doc(noticeDocId);

            const indexRef = adminDb
                .collection("schools")
                .doc(user.schoolId)
                .collection("branches")
                .doc(branch)
                .collection("system")
                .doc("notificationIndex");

            await adminDb.runTransaction(async (tx) => {
                const snap = await tx.get(noticeRef);
                const items = snap.exists ? snap.data().items || [] : [];
                tx.set(noticeRef, {
                    sessionId,
                    classId,
                    sectionId,
                    items: [...items, notice],
                    updatedAt: now,
                }, { merge: true });

                tx.set(indexRef, {
                    classNoticeAt: {
                        [`${classId}_${sectionId}`]: now,
                    },
                }, { merge: true });
            });

            // Send Push
            sendExpoPush({
                title: `${title} - ${schoolName}`,
                body: description,
                schoolId: user.schoolId,
                branchId: branch,
                roles: ["student", "parent"],
                classId,
                sectionId,
            });
        }

        return NextResponse.json({ success: true });

    } catch (err) {
        console.error(err);
        return NextResponse.json(
            { message: err.message || "Internal error" },
            { status: 500 }
        );
    }
}
