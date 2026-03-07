import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';

const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60 * 1000;
const MAX_REQUESTS = 3;

export async function POST(req) {
    try {
        const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';

        if (ip !== 'unknown') {
            const now = Date.now();
            const windowStart = now - RATE_LIMIT_WINDOW;
            const requests = rateLimitMap.get(ip) || [];
            const validRequests = requests.filter(time => time > windowStart);

            if (validRequests.length >= MAX_REQUESTS) {
                return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
            }

            validRequests.push(now);
            rateLimitMap.set(ip, validRequests);
        }


        const body = await req.json();
        const { firstName, lastName, schoolName, email, message, source = "Contact Form" } = body;

        if (!firstName || !lastName || !schoolName || !email || !message) {
            return NextResponse.json({ error: "All fields are required" }, { status: 400 });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
        }

        const leadRef = adminDb.collection("contact").doc();
        await leadRef.set({
            firstName,
            lastName,
            schoolName,
            email,
            message,
            source,
            status: "new",
            createdAt: new Date(),
        });

        return NextResponse.json({ success: true, message: "Request received successfully." }, { status: 200 });

    } catch (error) {
        console.error("Error processing contact request:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
