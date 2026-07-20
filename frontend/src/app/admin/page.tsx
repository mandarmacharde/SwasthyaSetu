"use client";

import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { StatsCard } from "@/components/stats-card";
import { CaseTable } from "@/components/case-table";
import { SkeletonDashboard } from "@/components/skeleton-dashboard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { api, Case, User } from "@/lib/api";
import { getUser } from "@/lib/auth";
import { useRouter } from "next/navigation";

const GRADIENTS: Record<string, string> = {
  "Total Calls": "from-emerald-500 to-teal-600",
  "Today": "from-blue-500 to-indigo-600",
  "Emergency": "from-red-500 to-rose-600",
  "Languages": "from-violet-500 to-purple-600",
};

const URGENCY_COLORS: Record<string, string> = {
  emergency: "bg-red-500", high: "bg-orange-500", medium: "bg-yellow-500", low: "bg-green-500",
};

export default function AdminDashboard() {
  const router = useRouter();
  const [cases, setCases] = useState<Case[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{ name: string; role: string; id?: number }>({ name: "", role: "admin" });
  const [showForm, setShowForm] = useState(false);
  const [formName, setFormName] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formRole, setFormRole] = useState<"asha" | "doctor">("asha");
  const [formDistrict, setFormDistrict] = useState("");
  const [formMsg, setFormMsg] = useState("");

  useEffect(() => { setUser(getUser()); }, []);

  const loadCases = () => {
    setLoading(true);
    api.cases.list().then(setCases).catch(console.error).finally(() => setLoading(false));
  };
  const loadUsers = () => { api.users.list().then(setUsers).catch(console.error); };
  useEffect(() => { loadCases(); loadUsers(); }, []);

  const createUser = async () => {
    if (!formName || !formPhone) return;
    setFormMsg("");
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/users/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: formName, phone: formPhone, role: formRole, district: formDistrict }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed");
      setFormMsg(`Created ${formRole}: ${formName}`);
      setFormName(""); setFormPhone(""); setFormDistrict("");
      loadUsers();
    } catch (e: any) { setFormMsg(e.message); }
  };

  const emergency = cases.filter((c) => c.urgency === "emergency");
  const languages = [...new Set(cases.map((c) => c.language))];
  const categories = [...new Set(cases.map((c) => c.possible_category).filter(Boolean))];
  const today = cases.filter((c) => new Date(c.created_at).toDateString() === new Date().toDateString());

  const langBreakdown = languages.map((lang) => ({ lang, count: cases.filter((c) => c.language === lang).length }));
  const urgencyCounts = ["emergency", "high", "medium", "low"].map((level) => ({
    level, count: cases.filter((c) => c.urgency === level).length,
  }));
  const maxUrgency = Math.max(...urgencyCounts.map((u) => u.count), 1);

  return (
    <DashboardLayout role="admin" userName={user.name}>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">Admin Console</h1>
          <p className="text-sm text-gray-500 mt-1">System-wide triage analytics</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}
          className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-lg shadow-emerald-500/25 rounded-xl">
          {showForm ? "Close" : "+ New User"}
        </Button>
      </div>

      {showForm && (
        <div className="mb-8 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-2xl p-6 border border-gray-700 shadow-2xl">
          <h3 className="text-lg font-semibold text-white mb-4">👤 Create New User</h3>
          <div className="grid sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Full Name</label>
              <Input placeholder="e.g. Priya Sharma" value={formName} onChange={e => setFormName(e.target.value)}
                className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-600" />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Phone Number</label>
              <Input placeholder="e.g. 9876543210" value={formPhone} onChange={e => setFormPhone(e.target.value)}
                className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-600" />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">District</label>
              <Input placeholder="e.g. Pune" value={formDistrict} onChange={e => setFormDistrict(e.target.value)}
                className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-600" />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Role</label>
              <div className="flex gap-2 pt-1">
                <button onClick={() => setFormRole("asha")}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${formRole === "asha" ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/25" : "bg-gray-800 text-gray-400 hover:bg-gray-700 border border-gray-700"}`}>
                  👩‍⚕️ ASHA
                </button>
                <button onClick={() => setFormRole("doctor")}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${formRole === "doctor" ? "bg-blue-600 text-white shadow-lg shadow-blue-600/25" : "bg-gray-800 text-gray-400 hover:bg-gray-700 border border-gray-700"}`}>
                  🩺 Doctor
                </button>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={createUser} disabled={!formName || !formPhone}
              className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 rounded-xl">
              Create Account
            </Button>
            {formMsg && (
              <span className={`text-sm px-3 py-1 rounded-lg ${formMsg.includes("Created") ? "bg-emerald-900/50 text-emerald-300" : "bg-red-900/50 text-red-300"}`}>
                {formMsg}
              </span>
            )}
          </div>
        </div>
      )}

      {users.length > 0 && (
        <div className="mb-8 bg-gradient-to-br from-gray-50 to-white rounded-2xl p-5 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-800">👥 Team Members <span className="text-gray-400 font-normal text-sm">({users.length})</span></h3>
          </div>
          <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
            {users.map((u) => (
              <div key={u.id} className="inline-flex items-center gap-2 bg-gray-100 rounded-full px-3 py-1.5 text-sm">
                <span className={`w-2 h-2 rounded-full ${u.role === "asha" ? "bg-emerald-500" : u.role === "doctor" ? "bg-blue-500" : "bg-purple-500"}`} />
                <span className="font-medium text-gray-700">{u.name}</span>
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">{u.role}</Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {loading ? <SkeletonDashboard cols={4} /> : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { title: "Total Calls", value: cases.length, icon: "📞", subtitle: "All time" },
              { title: "Today", value: today.length, icon: "📅", subtitle: "New today" },
              { title: "Emergency", value: emergency.length, icon: "🚨", subtitle: `${cases.length > 0 ? ((emergency.length / cases.length) * 100).toFixed(0) : 0}% of total` },
              { title: "Languages", value: languages.length, icon: "🌐", subtitle: `${categories.length} categories` },
            ].map((s) => (
              <div key={s.title} className={`rounded-2xl bg-gradient-to-br ${GRADIENTS[s.title]} p-5 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5`}>
                <div className="flex items-start justify-between mb-2">
                  <span className="text-2xl">{s.icon}</span>
                  <span className="text-3xl font-bold tracking-tight">{s.value}</span>
                </div>
                <p className="text-sm font-medium text-white/90">{s.title}</p>
                <p className="text-xs text-white/60 mt-0.5">{s.subtitle}</p>
              </div>
            ))}
          </div>

          {cases.length > 0 && (
            <>
              <div className="grid md:grid-cols-2 gap-6 mb-8">
                <div className="bg-gradient-to-br from-gray-50 to-white rounded-2xl p-5 border border-gray-200 shadow-sm">
                  <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <span className="w-1 h-5 bg-emerald-500 rounded-full inline-block" />
                    Language Distribution
                  </h3>
                  <div className="space-y-3">
                    {langBreakdown.map(({ lang, count }) => {
                      const pct = (count / cases.length) * 100;
                      return (
                        <div key={lang}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="font-medium text-gray-700">{lang.toUpperCase()}</span>
                            <span className="text-gray-400">{count} calls</span>
                          </div>
                          <div className="h-2.5 bg-gray-200 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full transition-all duration-1000" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="bg-gradient-to-br from-gray-50 to-white rounded-2xl p-5 border border-gray-200 shadow-sm">
                  <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <span className="w-1 h-5 bg-violet-500 rounded-full inline-block" />
                    Urgency Distribution
                  </h3>
                  <div className="space-y-3">
                    {urgencyCounts.map(({ level, count }) => {
                      const pct = (count / maxUrgency) * 100;
                      return (
                        <div key={level}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="capitalize font-medium text-gray-700">{level}</span>
                            <span className="text-gray-400">{count}</span>
                          </div>
                          <div className="h-2.5 bg-gray-200 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full transition-all duration-1000 ${URGENCY_COLORS[level]}`} style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-gray-50 to-white rounded-2xl p-5 border border-gray-200 shadow-sm">
                <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <span className="w-1 h-5 bg-blue-500 rounded-full inline-block" />
                  Recent Cases
                </h3>
                <CaseTable cases={cases.slice(0, 20)} onCaseClick={(c) => router.push(`/cases/${c.id}`)} />
              </div>
            </>
          )}

          {cases.length === 0 && !loading && (
            <div className="text-center py-20">
              <div className="text-6xl mb-4">📊</div>
              <h3 className="text-xl font-semibold text-gray-700 mb-2">No Cases Yet</h3>
              <p className="text-gray-400 max-w-md mx-auto">Run a triage from the demo-call page or seed demo data to see analytics here.</p>
            </div>
          )}
        </>
      )}
    </DashboardLayout>
  );
}