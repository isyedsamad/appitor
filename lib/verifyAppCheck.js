import { adminAppCheck } from "@/lib/firebaseAdmin";

export async function verifyAppCheck(req) {
  const token = req.headers.get("X-Firebase-AppCheck");

  if (!token) {
    throw new Error("Missing App Check token");
  }

  await adminAppCheck.verifyToken(token);
}
