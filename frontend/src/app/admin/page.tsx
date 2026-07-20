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

export default function AdminDashboard() {
  const router = useRouter();
  const [cases, setCases] = useState<Case[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{ name: string; role: string; id?: number }>({ name: "", role: "admin" });
  const [mounted, setMounted] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formName, setFormName] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formRole, setFormRole] = useState<"asha" | "doctor">("asha");
  const [formDistrict, setFormDistrict] = useState("");
  const [formMsg, setFormMsg] = useState("");

  useEffect(() => { setUser(getUser()); setMounted(true); }, []);

  const loadCases = () => {
    setLoading(true);
    api.cases.list().then(setCases).catch(console.error).finally(() => setLoading(false));
  };

  const loadUsers = () => {
    api.users.list().then(setUsers).catch(console.error);
  };

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
  const today = cases.filter(
    (c) => new Date(c.created_at).toDateString() === new Date().toDateString()
  );

  const langBreakdown = languages.map((lang) => ({
    lang,
    count: cases.filter((c) => c.language === lang).length,
  }));

  return (
    <DashboardLayout role="admin" userName={user.name}>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Admin Overview</h1>
          <p className="text-sm text-gray-500">System-wide triage analytics</p>
        </div>
        <Button size="sm" variant="outline" onClick={() => setShowForm(!showForm)}>
          {showForm ? "Close" : "+ New User"}
        </Button>
      </div>

      {showForm && (
        <div className="mb-6 border rounded-lg p-4 bg-white space-y-3">
          <h3 className="font-semibold">Create ASHA / Doctor</h3>
          <div className="grid sm:grid-cols-2 gap-3">
            <Input placeholder="Name" value={formName} onChange={e => setFormName(e.target.value)} />
            <Input placeholder="Phone" value={formPhone} onChange={e => setFormPhone(e.target.value)} />
            <Input placeholder="District" value={formDistrict} onChange={e => setFormDistrict(e.target.value)} />
            <div className="flex gap-2">
              <Button variant={formRole === "asha" ? "default" : "outline"} size="sm" onClick={() => setFormRole("asha")}>ASHA</Button>
              <Button variant={formRole === "doctor" ? "default" : "outline"} size="sm" onClick={() => setFormRole("doctor")}>Doctor</Button>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={createUser}>Create</Button>
            {formMsg && <span className={`text-sm ${formMsg.includes("Created") ? "text-emerald-600" : "text-red-600"}`}>{formMsg}</span>}
          </div>
        </div>
      )}

      {users.length > 0 && (
        <div className="mb-6 border rounded-lg p-4 bg-white">
          <h3 className="font-semibold mb-2">Users ({users.length})</h3>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {users.map((u) => (
              <div key={u.id} className="flex items-center gap-2 text-sm text-gray-600">
                <Badge variant="outline" className="text-[10px]">{u.role}</Badge>
                <span>{u.name}</span>
                <span className="text-xs text-gray-400">{u.phone}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {loading ? <SkeletonDashboard cols={4} /> : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
            <StatsCard title="Total Calls" value={cases.length} icon="📞" subtitle="All time" />
            <StatsCard title="Today" value={today.length} icon="📅" subtitle="New today" />
            <StatsCard title="Emergency" value={emergency.length} icon="🚨" subtitle={`${cases.length > 0 ? ((emergency.length / cases.length) * 100).toFixed(0) : 0}% of total`} />
            <StatsCard title="Languages" value={languages.length} icon="🌐" subtitle={`${categories.length} symptom categories`} />
          </div>

          {cases.length > 0 && (
            <div className="grid md:grid-cols-2 gap-4 md:gap-6 mb-6">
              <div className="border rounded-lg p-4 bg-white">
                <h3 className="font-semibold mb-3">🌐 Languages Used</h3>
                <div className="space-y-2">
                  {langBreakdown.map(({ lang, count }) => (
                    <div key={lang} className="flex items-center gap-2">
                      <span className="text-xs md:text-sm w-8 font-mono">{lang.toUpperCase()}</span>
                      <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full transition-all duration-700" style={{ width: `${(count / cases.length) * 100}%` }} />
                      </div>
                      <span className="text-xs text-gray-500 w-8 text-right">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="border rounded-lg p-4 bg-white">
                <h3 className="font-semibold mb-3">📊 Urgency Distribution</h3>
                <div className="space-y-2">
                  {["emergency", "high", "medium", "low"].map((level) => {
                    const count = cases.filter((c) => c.urgency === level).length;
                    const pct = cases.length > 0 ? (count / cases.length) * 100 : 0;
                    return (
                      <div key={level} className="flex items-center gap-2">
                        <span className="text-xs md:text-sm w-20 capitalize">{level}</span>
                        <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all duration-700 ${level === "emergency" ? "bg-red-500" : level === "high" ? "bg-orange-500" : level === "medium" ? "bg-yellow-500" : "bg-green-500"}`} style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs text-gray-500 w-8 text-right">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          <div>
            <h3 className="font-semibold mb-3">Recent Cases</h3>
            {cases.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <p className="text-3xl mb-2">📊</p>
                <p>No cases yet. Run a triage from the demo-call page.</p>
              </div>
            ) : (
              <CaseTable cases={cases.slice(0, 20)} onCaseClick={(c) => router.push(`/cases/${c.id}`)} />
            )}
          </div>
        </>
      )}
    </DashboardLayout>
  );
}
