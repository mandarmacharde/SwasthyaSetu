"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";

interface User {
  id: number; name: string; phone: string; role: string; district: string;
}

const ROLE_ICONS: Record<string, string> = { asha: "👩‍⚕️", doctor: "🩺", admin: "👑" };
const ROLE_COLORS: Record<string, string> = {
  asha: "from-emerald-500 to-teal-600",
  doctor: "from-blue-500 to-indigo-600",
  admin: "from-purple-500 to-violet-600",
};
const AVATAR_BG: Record<string, string> = {
  asha: "bg-emerald-100 text-emerald-700",
  doctor: "bg-blue-100 text-blue-700",
  admin: "bg-purple-100 text-purple-700",
};
const ROLE_BADGE: Record<string, string> = {
  asha: "bg-emerald-100 text-emerald-700 border-emerald-200",
  doctor: "bg-blue-100 text-blue-700 border-blue-200",
  admin: "bg-purple-100 text-purple-700 border-purple-200",
};

const DEMO_USERS = [
  { role: "asha" as const, name: "Anita Sharma", id: 1, phone: "+919000000001" },
  { role: "asha" as const, name: "Priya Verma", id: 3, phone: "+919000000003" },
  { role: "doctor" as const, name: "Dr. Rajesh Kumar", id: 2, phone: "+919000000002" },
];

export default function LoginPage() {
  const router = useRouter();
  const [role, setRole] = useState<"asha" | "doctor" | "admin">("asha");
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/users/`)
      .then(r => r.json()).then(setUsers).catch(() => {});
  }, []);

  const login = (name: string, targetRole: string, id?: number) => {
    localStorage.setItem("swasthyasetu_user", JSON.stringify({ role: targetRole, name, id }));
    router.push(`/${targetRole}`);
  };

  const displayed = role === "admin"
    ? [{ name: "Admin", id: 0, phone: "—", role: "admin" }]
    : [...DEMO_USERS.filter(u => u.role === role), ...users.filter(u => u.role === role && !DEMO_USERS.some(d => d.name === u.name))];

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 via-white to-white flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-5">
        <div className="text-center">
          <div className="w-14 h-14 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-sm">
            <span className="text-2xl">🏥</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">SwasthyaSetu</h1>
          <p className="text-xs text-gray-500 mt-0.5">Healthcare Voice Triage Platform</p>
        </div>

        <div className="flex gap-2 bg-gray-100 rounded-xl p-1">
          {(["asha", "doctor", "admin"] as const).map(r => (
            <button key={r} onClick={() => setRole(r)}
              className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${
                role === r ? "bg-white text-gray-800 shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}>
              {ROLE_ICONS[r]} {r === "asha" ? "ASHA" : r.charAt(0).toUpperCase() + r.slice(1)}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm divide-y divide-gray-100">
          {displayed.map((u, i) => (
            <button key={`${u.role}-${u.id || i}`} onClick={() => login(u.name, u.role, u.id)}
              className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors text-left group">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${AVATAR_BG[u.role] || "bg-gray-100 text-gray-600"}`}>
                {u.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-gray-800">{u.name}</p>
                <p className="text-xs text-gray-400">{u.phone}</p>
              </div>
              <Badge variant="outline" className={`text-[10px] shrink-0 ${ROLE_BADGE[u.role] || ""}`}>
                {ROLE_ICONS[u.role]} {u.role}
              </Badge>
              <span className="text-gray-300 group-hover:text-gray-400 text-lg">→</span>
            </button>
          ))}
        </div>

        {users.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">All Users</h2>
              <Badge variant="outline" className="text-[10px] text-gray-400 border-gray-200">{users.length}</Badge>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {users.map(u => (
                <button key={u.id} onClick={() => login(u.name, u.role, u.id)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors hover:bg-gray-50 ${
                    u.role === "asha" ? "border-emerald-200 text-emerald-700 bg-emerald-50/50" :
                    u.role === "doctor" ? "border-blue-200 text-blue-700 bg-blue-50/50" :
                    "border-purple-200 text-purple-700 bg-purple-50/50"
                  }`}>
                  {u.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <p className="text-center text-[10px] text-gray-400">Select a user to enter their dashboard</p>
      </div>
    </div>
  );
}