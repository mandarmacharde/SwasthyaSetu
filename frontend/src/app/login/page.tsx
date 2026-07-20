"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface User {
  id: number; name: string; phone: string; role: string; district: string;
}

const ROLE_ICONS: Record<string, string> = { asha: "👩‍⚕️", doctor: "🩺", admin: "👑" };
const ROLE_COLORS: Record<string, string> = {
  asha: "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100",
  doctor: "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100",
  admin: "bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100",
};
const ROLE_ACTIVE: Record<string, string> = {
  asha: "bg-emerald-600 border-emerald-600 text-white shadow-md shadow-emerald-200",
  doctor: "bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-200",
  admin: "bg-purple-600 border-purple-600 text-white shadow-md shadow-purple-200",
};
const ROLE_DOT: Record<string, string> = {
  asha: "bg-emerald-500", doctor: "bg-blue-500", admin: "bg-purple-500",
};

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

  const fetchUsers = () => { fetch(`${API}/api/users/`).then(r => r.json()).then(setUsers).catch(() => {}); };
  useEffect(() => { fetchUsers(); }, []);

  const handleLogin = () => {
    if (!loginName.trim()) { setLoginMsg("Enter your name"); return; }
    const match = users.find(u => u.name.toLowerCase() === loginName.trim().toLowerCase() && u.role === loginRole);
    if (!match && loginRole !== "admin") {
      setLoginMsg(`No ${loginRole} found with that name`);
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
      setTimeout(() => router.push(`/${created.role}`), 500);
    } catch (e: any) { setSignupMsg(e.message); }
  };

  const quickLogin = (u: User) => {
    localStorage.setItem("swasthyasetu_user", JSON.stringify({ role: u.role, name: u.name, id: u.id }));
    router.push(`/${u.role}`);
  };

  const RoleBadge = ({ role, size = "sm" }: { role: string; size?: "sm" | "xs" }) => (
    <span className={`inline-flex items-center gap-1 font-medium rounded-full border ${size === "xs" ? "text-[10px] px-1.5 py-0.5" : "text-xs px-2.5 py-1"} ${ROLE_COLORS[role] || ""}`}>
      {ROLE_ICONS[role] || ""} {role.charAt(0).toUpperCase() + role.slice(1)}
    </span>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 via-white to-white flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-5">
        <div className="text-center pt-4">
          <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
            <span className="text-3xl">🏥</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">SwasthyaSetu</h1>
          <p className="text-sm text-gray-500 mt-0.5">Healthcare Voice Triage Platform</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="flex border-b border-gray-100">
            <button onClick={() => setTab("login")}
              className={`flex-1 py-3 text-sm font-medium text-center transition-colors relative ${tab === "login" ? "text-emerald-700" : "text-gray-400 hover:text-gray-600"}`}>
              Sign In
              {tab === "login" && <span className="absolute bottom-0 left-4 right-4 h-0.5 bg-emerald-500 rounded-full" />}
            </button>
            <button onClick={() => setTab("signup")}
              className={`flex-1 py-3 text-sm font-medium text-center transition-colors relative ${tab === "signup" ? "text-emerald-700" : "text-gray-400 hover:text-gray-600"}`}>
              Sign Up
              {tab === "signup" && <span className="absolute bottom-0 left-4 right-4 h-0.5 bg-emerald-500 rounded-full" />}
            </button>
          </div>

          <div className="p-5">
            {tab === "login" ? (
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1.5 block">Role</label>
                  <div className="grid grid-cols-3 gap-2">
                    {["asha", "doctor", "admin"].map(r => (
                      <button key={r} onClick={() => setLoginRole(r)}
                        className={`py-2.5 rounded-xl text-sm font-medium border transition-all ${loginRole === r ? ROLE_ACTIVE[r] : "border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50"}`}>
                        <div className="text-base mb-0.5">{ROLE_ICONS[r]}</div>
                        <span className="text-[11px]">{r === "asha" ? "ASHA" : r.charAt(0).toUpperCase() + r.slice(1)}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1.5 block">Full Name</label>
                  <Input placeholder="Enter your name" value={loginName} onChange={e => setLoginName(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleLogin()}
                    className="border-gray-200 focus:border-emerald-400 focus:ring-emerald-400/20 rounded-xl h-11" />
                </div>
                <Button onClick={handleLogin} disabled={!loginName.trim()}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 rounded-xl h-11 shadow-sm">
                  Sign In
                </Button>
                {loginMsg && <p className="text-sm text-center text-red-500 bg-red-50 rounded-xl py-2">{loginMsg}</p>}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1.5 block">Full Name</label>
                    <Input placeholder="Priya Sharma" value={signupName} onChange={e => setSignupName(e.target.value)}
                      className="border-gray-200 focus:border-emerald-400 focus:ring-emerald-400/20 rounded-xl h-11" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1.5 block">Phone</label>
                    <Input placeholder="9876543210" value={signupPhone} onChange={e => setSignupPhone(e.target.value)}
                      className="border-gray-200 focus:border-emerald-400 focus:ring-emerald-400/20 rounded-xl h-11" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1.5 block">District</label>
                    <Input placeholder="Pune" value={signupDistrict} onChange={e => setSignupDistrict(e.target.value)}
                      className="border-gray-200 focus:border-emerald-400 focus:ring-emerald-400/20 rounded-xl h-11" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1.5 block">Role</label>
                    <div className="grid grid-cols-2 gap-2 pt-0.5">
                      <button onClick={() => setSignupRole("asha")}
                        className={`py-2.5 rounded-xl text-sm font-medium border transition-all ${signupRole === "asha" ? "bg-emerald-600 border-emerald-600 text-white shadow-sm" : "border-gray-200 text-gray-500 hover:border-gray-300"}`}>
                        👩‍⚕️ ASHA
                      </button>
                      <button onClick={() => setSignupRole("doctor")}
                        className={`py-2.5 rounded-xl text-sm font-medium border transition-all ${signupRole === "doctor" ? "bg-blue-600 border-blue-600 text-white shadow-sm" : "border-gray-200 text-gray-500 hover:border-gray-300"}`}>
                        🩺 Doctor
                      </button>
                    </div>
                  </div>
                </div>
                <Button onClick={handleSignup} disabled={!signupName.trim() || !signupPhone.trim()}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 rounded-xl h-11 shadow-sm">
                  Create Account
                </Button>
                {signupMsg && (
                  <p className={`text-sm text-center rounded-xl py-2 ${signupMsg.includes("fail") || signupMsg.includes("error") ? "text-red-500 bg-red-50" : "text-emerald-600 bg-emerald-50"}`}>
                    {signupMsg}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-800">User Directory</h2>
            <Badge variant="outline" className="text-[10px] text-gray-400 border-gray-200">{users.length} users</Badge>
          </div>
          {users.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-2xl mb-2">👥</p>
              <p className="text-xs text-gray-400">No users loaded. Seed demo data or create one above.</p>
            </div>
          ) : (
            <div className="space-y-1.5 max-h-56 overflow-y-auto">
              {users.map(u => (
                <button key={u.id} onClick={() => quickLogin(u)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors text-left group border border-transparent hover:border-gray-100">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${ROLE_DOT[u.role] + " bg-opacity-10"} ${u.role === "asha" ? "bg-emerald-100 text-emerald-700" : u.role === "doctor" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"}`}>
                    {u.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{u.name}</p>
                    <p className="text-xs text-gray-400 truncate">{u.phone} · {u.district || "—"}</p>
                  </div>
                  <RoleBadge role={u.role} size="xs" />
                  <span className="text-gray-300 group-hover:text-gray-400 text-base ml-0.5">→</span>
                </button>
              ))}
            </div>
          )}
          <p className="text-center text-[10px] text-gray-400 mt-3">Click any user to instantly log in</p>
        </div>
      </div>
    </div>
  );
}