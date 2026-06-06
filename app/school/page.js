"use client";
import { useEffect, useState } from "react";
import { School, Mail, Lock, LogIn, Shield, Link, ChevronRight } from "lucide-react";
import Loading from "@/components/ui/Loading";
import { fetchSchools, loginSchoolUser } from "@/lib/school/authSchool";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import Image from "next/image";

export default function SchoolLoginPage() {
  const router = useRouter();
  const [schools, setSchools] = useState([]);
  const [schoolId, setSchoolId] = useState("");
  const [schoolCode, setSchoolCode] = useState("")
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchSchools().then(setSchools);

    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, "schoolUsers", user.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            router.replace(`/school/${userData.schoolId}/dashboard`);
          } else {
            setLoading(false);
          }
        } catch (err) {
          console.error("Redirect check error:", err);
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    });

    return () => unsub();
  }, [router]);

  async function handleLogin(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const newMail = email.trim() + "@" + schoolCode.toLowerCase() + ".appitor";
    try {
      const data = await loginSchoolUser({ schoolId, email: newMail, password });
      if (data.success) {
        router.replace(`/school/${data.schoolId}/dashboard`);
      } else {
        setLoading(false);
      }
    } catch (err) {
      setError(err.message);
      toast.error('Error: ' + err, {
        theme: 'colored'
      })
      setLoading(false);
    }
  }

  return (
    <>
      {loading && <Loading />}
      <div className="min-h-[100dvh] flex items-center justify-center bg-(--bg)">
        <div className="flex-1/2 hidden lg:flex h-dvh bg-(--primary) shadow-md flex-col items-center justify-center">
          <div>
            <div className="flex w-fit items-center gap-1 bg-white rounded-full p-3">
              <Image src="/logo.png" alt="Logo" width={35} height={35} />
              {/* <span className="font-bold text-xl tracking-tight text-(--primary)">Appitor</span> */}
            </div>
            <p className="text-white/75 font-bold text-4xl mt-8">WHERE</p>
            <p className="text-white font-bold text-6xl">INNOVATION</p>
            <p className="text-white/75 font-bold text-4xl">MEETS EDUCATION..</p>
            <div className="mt-10 flex flex-col gap-1 items-start">
              <div className="divide-x-2 divide-white/50 flex ">
                <div className="text-white/90 uppercase px-2 font-medium text-xs cursor-pointer hover:underline hover:text-white transition">About us</div>
                <div className="text-white/90 uppercase px-2 font-medium text-xs cursor-pointer hover:underline hover:text-white transition">Privacy Policy</div>
                <div className="text-white/90 uppercase px-2 font-medium text-xs cursor-pointer hover:underline hover:text-white transition">Terms & Conditions</div>
                <div className="text-white/90 uppercase px-2 font-medium text-xs cursor-pointer hover:underline hover:text-white transition">Help & Support</div>
              </div>
              <p className="text-white px-2 text-xs text-center font-medium mt-2">Copyright &copy; 2026 Appitor. All Rights Reserved.</p>
            </div>
          </div>
        </div>
        <div className="flex-1 px-5 lg:px-0 lg:flex-1/2 flex justify-center items-center">
          <div className="w-full max-w-md bg-(--bg-card) rounded-2xl shadow-none border border-(--border) p-6 sm:p-8">
            <div className="mb-5 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-(--primary)/30">
                <Shield className="h-6 w-6 text-(--primary)" />
              </div>
              <h1 className="text-xl font-bold uppercase tracking-wide">Portal Login</h1>
              <p className="text-sm text-(--text-muted) font-medium">
                Secure access for schools & staff
              </p>
            </div>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-(--text-muted)">School</label>
                <div className="relative">
                  <School className="absolute left-3.5 top-3.5 h-4 w-4 text-(--text-muted)" />
                  <select
                    required
                    value={schoolId}
                    onChange={(e) => {
                      setSchoolId(e.target.value);
                      setSchoolCode(e.target.value != '' ? e.target.options[e.target.selectedIndex].text.split(' (')[1].replace(')', '') : '')
                    }}
                    className="w-full pl-10 pr-3 py-2 rounded-lg border border-(--border) focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  >
                    <option value="">Select School</option>
                    {schools.map((s) => (
                      <option key={s.id} value={s.id}>
                        {`${s.name} (${s.code.toUpperCase()})`}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-[var(--text-muted)]">School ID / Username</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-[var(--text-muted)]" />
                  <input
                    type="text"
                    required
                    placeholder="enter school id"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 rounded-lg bg-transparent border border-[var(--border)]"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-[var(--text-muted)]">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-[var(--text-muted)]" />
                  <input
                    type="password"
                    required
                    placeholder="enter password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 rounded-lg bg-transparent border border-[var(--border)]"
                  />
                </div>
              </div>

              {error && (
                <p className="text-sm text-[var(--danger)]">{error}</p>
              )}

              <button
                type="submit"
                className="w-full h-11 mt-2 flex items-center justify-center gap-2 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white py-2 rounded-lg font-medium transition"
              >
                Sign in
                <ChevronRight className="h-4 w-4 stroke-3" />
              </button>
              <div className="text-center text-(--text-muted) -mt-1 font-medium text-xs"><p>Need access? Contact School Admin</p></div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
