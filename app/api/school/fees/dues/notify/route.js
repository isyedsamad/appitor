import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { verifyUser } from "@/lib/verifyUser";

async function sendExpoPush({ tokens, title, body, studentUids }) {
    try {
        const messages = [];
        tokens.forEach(token => {
            messages.push({
                to: token,
                sound: "default",
                title,
                body,
                data: {
                    type: "fee_reminder",
                    studentUids,
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
        console.error("Fee reminder push failed:", err);
    }
}

export async function POST(req) {
    try {
        const user = await verifyUser(req, "fee.manage");
        const body = await req.json();
        const { branch, studentUids, period, schoolName } = body;

        if (!branch || !studentUids || !studentUids.length || !period) {
            return NextResponse.json(
                { message: "Missing required fields or student list" },
                { status: 400 }
            );
        }

        const title = `Fee Reminder - ${schoolName || "School"}`;
        const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        const [year, monthNum] = period.split("-");
        const formattedPeriod = monthNum && year ? `${monthNames[parseInt(monthNum, 10) - 1]} ${year}` : period;

        const messageBody = `Fees are pending for ${formattedPeriod}. Kindly clear the dues as soon as possible.`;

        // Chunk UIDs into batches of 30 for Firestore "in" query limits
        const targetTokens = [];
        for (let i = 0; i < studentUids.length; i += 30) {
            const chunk = studentUids.slice(i, i + 30);
            const tokenSnap = await adminDb
                .collection("fcmTokens")
                .where("uid", "in", chunk)
                .where("schoolId", "==", user.schoolId)
                .where("active", "==", true)
                .get();

            if (!tokenSnap.empty) {
                tokenSnap.forEach(doc => {
                    targetTokens.push(doc.data().token);
                });
            }
        }

        if (targetTokens.length === 0) {
            return NextResponse.json(
                { message: "None of the selected students have active app devices registered." },
                { status: 400 }
            );
        }

        // De-duplicate token list
        const uniqueTokens = [...new Set(targetTokens)];

        await sendExpoPush({
            tokens: uniqueTokens,
            title,
            body: messageBody,
            studentUids,
        });

        return NextResponse.json({ success: true });

    } catch (err) {
        console.error("Fee reminder send failed:", err);
        return NextResponse.json(
            { message: "Failed to send fee reminder" },
            { status: 500 }
        );
    }
}
