"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface User {
  id: number; name: string; phone: string; role: string; district: string;
}

export default function LoginPage() {
  const router = useRouter();
  const [tab, setTab] = useState<"login" | "signup">("login");
  const [users, setUsers] = useState<User[]>([]);

  const [loginName, setLoginName] = useState("");
  const [loginRole, setLoginRole] = useState("asha");
  const [loginMsg, setLoginMsg] = useState("");

  const [signupName, setSignupName] = useState("");
  const [signupPhone, setSignupPhone] = useState("");
  const [signupRole, setSignupRole] = useState<"asha" | "doctor">("asha");
  const [signupDistrict, setSignupDistrict] = useState("");
  const [signupMsg, setSignupMsg] = useState("");

  const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  const fetchUsers = () => {
    fetch(`${API}/api/users/`)
      .then((r) => r.json())
      .then(setUsers)
      .catch(() => {});
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleLogin = () => {
    if (!loginName.trim()) { setLoginMsg("Enter your name"); return; }
    const match = users.find((u) => u.name.toLowerCase() === loginName.trim().toLowerCase() && u.role === loginRole);
    if (!match && loginRole !== "admin") {
      setLoginMsg(`No ${loginRole} found with that name. Try Sign Up first.`);
      return;
    }
    const id = loginRole === "admin" ? 0 : match!.id;
    localStorage.setItem("swasthyasetu_user", JSON.stringify({ role: loginRole, name: loginName.trim(), id }));
    router.push(`/${loginRole}`);
  };

  const handleSignup = async () => {
    if (!signupName.trim() || !signupPhone.trim()) { setSignupMsg("Name and phone required"); return; }
    setSignupMsg("");
    try {
      const res = await fetch(`${API}/api/users/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: signupName.trim(), phone: signupPhone.trim(), role: signupRole, district: signupDistrict.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed");
      const created = data.user;
      localStorage.setItem("swasthyasetu_user", JSON.stringify({ role: created.role, name: created.name, id: created.id }));
      fetchUsers();
      setSignupMsg(`✅ Created! Logging in...`);
      setTimeout(() => router.push(`/${created.role}`), 800);
    } catch (e: any) { setSignupMsg(e.message); }
  };

  const quickLogin = (u: User) => {
    localStorage.setItem("swasthyasetu_user", JSON.stringify({ role: u.role, name: u.name, id: u.id }));
    router.push(`/${u.role}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-lg space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">SwasthyaSetu</h1>
          <p className="text-sm text-gray-400 mt-1">Healthcare Voice Triage Platform</p>
        </div>

        <div className="bg-gray-800/50 backdrop-blur border border-gray-700 rounded-2xl p-6 shadow-2xl">
          <div className="flex gap-2 mb-6">
            {(["login", "signup"] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  tab === t
                    ? "bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg"
                    : "bg-gray-700 text-gray-400 hover:bg-gray-600"
                }`}>
                {t === "login" ? "🔑 Sign In" : "📝 Sign Up"}
              </button>
            ))}
          </div>

          {tab === "login" ? (
            <div className="space-y-4">
              <div>
                <label className="text-xs text-gray-400 mb-1.5 block">Full Name</label>
                <Input placeholder="e.g. Priya Sharma" value={loginName} onChange={e => setLoginName(e.target.value)}
                  className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-500" />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1.5 block">Role</label>
                <div className="flex gap-2">
                  {(["asha", "doctor", "admin"] as const).map((r) => (
                    <button key={r} onClick={() => setLoginRole(r)}
                      className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${
                        loginRole === r
                          ? r === "asha" ? "bg-emerald-600 text-white shadow-lg"
                            : r === "doctor" ? "bg-blue-600 text-white shadow-lg"
                            : "bg-purple-600 text-white shadow-lg"
                          : "bg-gray-700 text-gray-400 hover:bg-gray-600"
                      }`}>
                      {r === "asha" ? "👩‍⚕️ ASHA" : r === "doctor" ? "🩺 Doctor" : "👑 Admin"}
                    </button>
                  ))}
                </div>
              </div>
              <Button onClick={handleLogin} disabled={!loginName.trim()}
                className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 rounded-xl h-11">
                Sign In
              </Button>
              {loginMsg && (
                <p className={`text-sm text-center py-2 px-3 rounded-lg ${loginMsg.startsWith("No") ? "bg-red-900/50 text-red-300" : "bg-emerald-900/50 text-emerald-300"}`}>
                  {loginMsg}
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-400 mb-1.5 block">Full Name</label>
                  <Input placeholder="e.g. Priya Sharma" value={signupName} onChange={e => setSignupName(e.target.value)}
                    className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-500" />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1.5 block">Phone</label>
                  <Input placeholder="e.g. 9876543210" value={signupPhone} onChange={e => setSignupPhone(e.target.value)}
                    className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-500" />
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-400 mb-1.5 block">District</label>
                  <Input placeholder="e.g. Pune" value={signupDistrict} onChange={e => setSignupDistrict(e.target.value)}
                    className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-500" />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1.5 block">Role</label>
                  <div className="flex gap-2 pt-1">
                    <button onClick={() => setSignupRole("asha")}
                      className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${signupRole === "asha" ? "bg-emerald-600 text-white shadow-lg" : "bg-gray-700 text-gray-400 hover:bg-gray-600"}`}>
                      👩‍⚕️ ASHA
                    </button>
                    <button onClick={() => setSignupRole("doctor")}
                      className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${signupRole === "doctor" ? "bg-blue-600 text-white shadow-lg" : "bg-gray-700 text-gray-400 hover:bg-gray-600"}`}>
                      🩺 Doctor
                    </button>
                  </div>
                </div>
              </div>
              <Button onClick={handleSignup} disabled={!signupName.trim() || !signupPhone.trim()}
                className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 rounded-xl h-11">
                Create Account & Sign In
              </Button>
              {signupMsg && (
                <p className={`text-sm text-center py-2 px-3 rounded-lg ${signupMsg.startsWith("✅") ? "bg-emerald-900/50 text-emerald-300" : "bg-red-900/50 text-red-300"}`}>
                  {signupMsg}
                </p>
              )}
            </div>
          )}
        </div>

        <div className="bg-gray-800/50 backdrop-blur border border-gray-700 rounded-2xl p-5 shadow-xl">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-300">👥 User Directory</h2>
            <Badge variant="outline" className="text-[10px] text-gray-400 border-gray-600">{users.length} users</Badge>
          </div>
          {users.length === 0 ? (
            <p className="text-xs text-gray-500 text-center py-6">No users loaded. Seed demo data or create one above.</p>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {users.map((u) => (
                <button key={u.id} onClick={() => quickLogin(u)}
                  className="w-full flex items-center gap-3 bg-gray-700/50 hover:bg-gray-700 rounded-xl p-3 transition-all text-left group">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                    u.role === "asha" ? "bg-emerald-900/50 text-emerald-300" :
                    u.role === "doctor" ? "bg-blue-900/50 text-blue-300" :
                    "bg-purple-900/50 text-purple-300"
                  }`}>
                    {u.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-200 truncate">{u.name}</p>
                    <p className="text-xs text-gray-500 truncate">{u.phone} · {u.district || "—"}</p>
                  </div>
                  <Badge className={`text-[10px] shrink-0 ${
                    u.role === "asha" ? "bg-emerald-900/50 text-emerald-300 border-emerald-700" :
                    u.role === "doctor" ? "bg-blue-900/50 text-blue-300 border-blue-700" :
                    "bg-purple-900/50 text-purple-300 border-purple-700"
                  }`} variant="outline">{u.role}</Badge>
                  <span className="text-gray-600 group-hover:text-gray-400 text-lg ml-1">→</span>
                </button>
              ))}
            </div>
          )}
          <p className="text-xs text-gray-600 text-center mt-3">Click any user to instantly log in</p>
        </div>
      </div>
    </div>
  );
}