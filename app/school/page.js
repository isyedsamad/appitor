"use client";
import { useEffect, useState } from "react";
import { School, Mail, Lock, LogIn, Shield } from "lucide-react";
import Loading from "@/components/ui/Loading";
import { fetchSchools, loginSchoolUser } from "@/lib/school/authSchool";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";

export default function SchoolLoginPage() {
  const router = useRouter();
  const [schools, setSchools] = useState([]);
  const [schoolId, setSchoolId] = useState("");
  const [schoolCode, setSchoolCode] = useState("")
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchSchools().then(setSchools);
  }, []);

  async function handleLogin(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const newMail = email.trim() + "@" + schoolCode.toLowerCase() + ".appitor";
    try {
      const data = await loginSchoolUser({ schoolId, email: newMail, password });
      if(data.success) {
        router.replace(`/school/${data.schoolId}/dashboard`);
      }
    } catch (err) {
      setError(err.message);
      toast.error('Error: ' + error, {
        theme: 'colored'
      })
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {loading && <Loading />}
      <div className="min-h-[100dvh] flex items-center justify-center bg-[var(--bg)] p-5">
        <div className="w-full max-w-md bg-[var(--bg-card)] rounded-2xl shadow-xl border border-[var(--border)] p-6 sm:p-8">
          
          <div className="mb-5 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-[var(--border)]">
                <Shield className="h-6 w-6 text-(--primary)" />
            </div>

            <h1 className="text-2xl font-semibold">School Login</h1>
            <p className="mt-1 text-sm text-muted">
                Secure access for schools & staff
            </p>
            </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-sm text-(--text-muted)">School</label>
              <div className="relative">
                <School className="absolute left-3 top-3 h-4 w-4 text-(--text-muted)" />
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

            {/* Email */}
            <div>
              <label className="text-sm text-[var(--text-muted)]">School ID / Username</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-[var(--text-muted)]" />
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

            {/* Password */}
            <div>
              <label className="text-sm text-[var(--text-muted)]">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-[var(--text-muted)]" />
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
              className="w-full mt-2 flex items-center justify-center gap-2 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white py-2 rounded-lg font-medium transition"
            >
              <LogIn size={18} />
              Login
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
