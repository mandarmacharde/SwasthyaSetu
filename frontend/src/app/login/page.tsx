"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Heart, ArrowRight, UserCheck, Stethoscope, Shield, LogIn, Users } from "lucide-react";
import Link from "next/link";

const DEMO_USERS = [
  { role: "asha" as const, name: "Anita Sharma", id: 1, phone: "+919000000001" },
  { role: "asha" as const, name: "Priya Verma", id: 3, phone: "+919000000003" },
  { role: "doctor" as const, name: "Dr. Rajesh Kumar", id: 2, phone: "+919000000002" },
];

export default function LoginPage() {
  const router = useRouter();
  const [role, setRole] = useState<"asha" | "doctor" | "admin">("asha");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const login = (name: string, targetRole: string, id?: number) => {
    localStorage.setItem("swasthyasetu_user", JSON.stringify({ role: targetRole, name, id }));
    router.push(`/${targetRole}`);
  };

  const handleFormLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;
    login(username.trim(), role);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 via-white to-white flex flex-col items-center justify-center p-4 selection:bg-emerald-100">
      <Link href="/" className="absolute top-6 left-6 flex items-center gap-2 group hover:opacity-80 transition-opacity">
        <div className="w-7 h-7 rounded-md bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-sm">
          <Heart className="w-3.5 h-3.5 text-white" />
        </div>
        <span className="font-bold text-emerald-800 text-sm">SwasthyaSetu</span>
      </Link>

      <div className="w-full max-w-md animate-fade-in">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-100 to-teal-50 flex items-center justify-center mx-auto mb-4 border border-emerald-200/50">
            <LogIn className="w-5 h-5 text-emerald-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Welcome back</h1>
          <p className="text-sm text-slate-500 mt-1">Sign in to your dashboard to continue</p>
        </div>

        <Card className="border border-emerald-100/50 shadow-sm rounded-2xl overflow-hidden">
          <CardContent className="p-6 space-y-5">
            <div className="flex bg-slate-100/80 p-1 rounded-xl">
              {(["asha", "doctor", "admin"] as const).map((r) => (
                <button
                  key={r}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-medium rounded-lg transition-all ${
                    role === r
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                  onClick={() => setRole(r)}
                >
                  {r === "asha" && <UserCheck className="w-3.5 h-3.5" />}
                  {r === "doctor" && <Stethoscope className="w-3.5 h-3.5" />}
                  {r === "admin" && <Shield className="w-3.5 h-3.5" />}
                  <span className="capitalize text-xs">{r === "asha" ? "ASHA" : r}</span>
                </button>
              ))}
            </div>

            <form onSubmit={handleFormLogin} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">
                  Username
                </label>
                <Input
                  placeholder="Enter your username"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className="rounded-xl border-slate-200/60 h-10"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">
                  Password
                </label>
                <Input
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="rounded-xl border-slate-200/60 h-10"
                />
              </div>
              <Button
                type="submit"
                disabled={!username.trim()}
                className="w-full rounded-xl h-10 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-sm shadow-emerald-200 disabled:opacity-50"
              >
                <LogIn className="w-4 h-4 mr-2" /> Sign in as {role === "asha" ? "ASHA" : role}
              </Button>
            </form>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-100" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-white px-3 text-slate-400 font-medium">or quick login</span>
              </div>
            </div>

            <div className="space-y-2">
              {DEMO_USERS.filter((u) => u.role === role || role === "admin").map((u) => (
                <button
                  key={u.id}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-emerald-50/60 transition-all text-left border border-transparent hover:border-emerald-100/50 group"
                  onClick={() => login(u.name, role, u.id)}
                >
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-100 to-teal-50 border border-emerald-200/60 flex items-center justify-center text-emerald-700 font-bold text-sm group-hover:shadow-sm transition-shadow">
                    {u.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-slate-800">{u.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-slate-400 font-mono">{u.phone}</span>
                      <Badge variant="secondary" className="text-[10px] bg-emerald-50 text-emerald-700 font-semibold px-1.5 py-0 border border-emerald-200/50">
                        {u.role.toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-500 group-hover:translate-x-0.5 transition-all" />
                </button>
              ))}
              {role === "admin" && (
                <button
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-emerald-50/60 transition-all text-left border border-transparent hover:border-emerald-100/50 group"
                  onClick={() => login("System Admin", "admin")}
                >
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-100 to-blue-50 border border-blue-200/60 flex items-center justify-center text-blue-700 font-bold text-sm group-hover:shadow-sm transition-shadow">
                    A
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-slate-800">System Admin</p>
                    <Badge variant="secondary" className="text-[10px] mt-0.5 bg-blue-50 text-blue-700 font-semibold px-1.5 py-0 border border-blue-200/50">
                      ADMIN
                    </Badge>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all" />
                </button>
              )}
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-slate-400 mt-6">
          Demo mode — enter any name or click a user to log in
        </p>
      </div>
    </div>
  );
}
