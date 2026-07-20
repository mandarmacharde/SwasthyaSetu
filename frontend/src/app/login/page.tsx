"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";

interface User {
  id: number; name: string; phone: string; role: string; district: string;
}

const ROLE_ICONS: Record<string, string> = { asha: "👩‍⚕️", doctor: "🩺", admin: "👑" };
const AVATAR_BG: Record<string, string> = {
  asha: "bg-emerald-100 text-emerald-700",
  doctor: "bg-blue-100 text-blue-700",
  admin: "bg-purple-100 text-purple-700",
};

const DEMO_USERS: User[] = [
  { role: "asha", name: "Anita Sharma", id: 1, phone: "+919000000001", district: "" },
  { role: "asha", name: "Priya Verma", id: 3, phone: "+919000000003", district: "" },
  { role: "doctor", name: "Dr. Rajesh Kumar", id: 2, phone: "+919000000002", district: "" },
];

export default function LoginPage() {
  const router = useRouter();
  const [apiUsers, setApiUsers] = useState<User[]>([]);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/users/`)
      .then(r => r.json()).then(setApiUsers).catch(() => {});
  }, []);

  const login = (name: string, targetRole: string, id?: number) => {
    localStorage.setItem("swasthyasetu_user", JSON.stringify({ role: targetRole, name, id }));
    router.push(`/${targetRole}`);
  };

  const allUsers = [
    { name: "Admin", id: 0, phone: "—", role: "admin", district: "" },
    ...DEMO_USERS,
    ...apiUsers.filter(u => !DEMO_USERS.some(d => d.name === u.name) && u.role !== "admin"),
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 via-white to-white flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-5">
        <div className="text-center">
          <div className="w-14 h-14 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-sm">
            <span className="text-2xl">🏥</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">SwasthyaSetu</h1>
          <p className="text-xs text-gray-500 mt-0.5">Select your account to continue</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          {(["admin", "asha", "doctor"] as const).map(role => {
            const users = allUsers.filter(u => u.role === role);
            if (users.length === 0) return null;
            return (
              <div key={role}>
                <div className="px-4 pt-4 pb-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm">{ROLE_ICONS[role]}</span>
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{role === "asha" ? "ASHA Workers" : role === "doctor" ? "Doctors" : "Administrator"}</span>
                  </div>
                </div>
                <div className="divide-y divide-gray-50">
                  {users.map((u, i) => (
                    <button key={`${u.role}-${u.id || i}`} onClick={() => login(u.name, u.role, u.id)}
                      className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors text-left group">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${AVATAR_BG[u.role]}`}>
                        {u.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-gray-800">{u.name}</p>
                        <p className="text-xs text-gray-400">{u.phone} · {u.district || u.role}</p>
                      </div>
                      <span className="text-gray-300 group-hover:text-gray-400 text-lg">→</span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <p className="text-center text-[10px] text-gray-400">Click any user to enter their dashboard</p>
      </div>
    </div>
  );
}