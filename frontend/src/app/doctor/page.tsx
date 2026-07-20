"use client";

import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { SkeletonDashboard } from "@/components/skeleton-dashboard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { api, Case } from "@/lib/api";
import { getUser } from "@/lib/auth";
import { URGENCY_COLORS as T, STATUS_COLORS } from "@/lib/theme";
import { useRouter } from "next/navigation";

const CARD_GRADIENTS: Record<string, string> = {
  "Open Cases": "from-blue-500 to-indigo-600",
  "Emergency": "from-red-500 to-rose-600",
  "Categories": "from-violet-500 to-purple-600",
  "Today": "from-teal-500 to-emerald-600",
};

const URGENCY_DOT: Record<string, string> = {
  emergency: "bg-red-500", high: "bg-orange-500", medium: "bg-yellow-500", low: "bg-green-500",
};

export default function DoctorDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<{ name: string; role: string; id?: number }>({ name: "", role: "doctor" });
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("open");

  useEffect(() => { setUser(getUser()); }, []);

  const load = (t: string) => {
    setLoading(true);
    const params: any = {};
    if (t === "emergency") params.urgency = "emergency";
    else if (t === "history") params.status = "visited,closed";
    else params.status = "open,assigned";
    api.cases.list(params).then(setCases).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { load(tab); }, [tab]);

  const updateStatus = async (c: Case, status: string) => {
    try {
      const updated = await api.cases.update(c.id, { status });
      setCases((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
    } catch (e) { console.error(e); }
  };

  const emergency = cases.filter((c) => c.urgency === "emergency");
  const categories = [...new Set(cases.map((c) => c.possible_category).filter(Boolean))];
  const today = cases.filter((c) => new Date(c.created_at).toDateString() === new Date().toDateString());

  return (
    <DashboardLayout role="doctor" userName={user.name}>
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">Doctor Console</h1>
        <p className="text-sm text-gray-500 mt-1">AI-triaged cases awaiting review</p>
      </div>

      {loading ? <SkeletonDashboard cols={4} /> : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { title: "Open Cases", value: cases.length, icon: "🩺", subtitle: "Awaiting review" },
              { title: "Emergency", value: emergency.length, icon: "🚨", subtitle: "Immediate attention" },
              { title: "Categories", value: categories.length, icon: "📊", subtitle: "Symptom types" },
              { title: "Today", value: today.length, icon: "📅", subtitle: "New today" },
            ].map((s) => (
              <div key={s.title} className={`rounded-2xl bg-gradient-to-br ${CARD_GRADIENTS[s.title]} p-5 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5`}>
                <div className="flex items-start justify-between mb-2">
                  <span className="text-2xl">{s.icon}</span>
                  <span className="text-3xl font-bold tracking-tight">{s.value}</span>
                </div>
                <p className="text-sm font-medium text-white/90">{s.title}</p>
                <p className="text-xs text-white/60 mt-0.5">{s.subtitle}</p>
              </div>
            ))}
          </div>

          {emergency.length > 0 && (
            <div className="mb-6 rounded-2xl bg-gradient-to-r from-red-500 via-red-600 to-rose-600 p-0.5 shadow-lg shadow-red-500/20">
              <div className="rounded-2xl bg-white p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                  <h3 className="font-semibold text-red-700">Emergency Queue — {emergency.length} case{emergency.length > 1 ? "s" : ""}</h3>
                </div>
                <div className="grid md:grid-cols-2 gap-3">
                  {emergency.map((c) => (
                    <div key={c.id} className="bg-red-50 border border-red-200 rounded-xl p-4 cursor-pointer hover:bg-red-100 transition-colors" onClick={() => router.push(`/cases/${c.id}`)}>
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className={T[c.urgency]}>{c.urgency.toUpperCase()}</Badge>
                        <Badge variant="outline" className={STATUS_COLORS[c.status]}>{c.status}</Badge>
                        <span className="text-xs text-gray-400 ml-auto">#{c.id}</span>
                      </div>
                      <p className="text-sm font-medium text-gray-800">{c.possible_category || "Unclassified"} <span className="text-gray-400">·</span> <span className="text-xs font-mono text-gray-500">{c.language.toUpperCase()}</span></p>
                      <p className="text-xs text-gray-400 mt-1">{new Date(c.created_at).toLocaleString("en-IN")}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-2 mb-6">
            {[
              { key: "open", label: "Open Cases", icon: "📋" },
              { key: "emergency", label: "Emergency", icon: "🚨" },
              { key: "history", label: "History", icon: "📜" },
            ].map((t) => (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  tab === t.key
                    ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/25"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}>
                {t.icon} {t.label}
              </button>
            ))}
          </div>

          {cases.length === 0 ? (
            <div className="text-center py-20">
              <div className="text-6xl mb-4">🩺</div>
              <h3 className="text-xl font-semibold text-gray-700 mb-2">No Cases Found</h3>
              <p className="text-gray-400">Cases will appear here after triage from the demo-call page.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {cases.map((c) => (
                <div key={c.id} className="group bg-white rounded-2xl p-4 border border-gray-100 shadow-sm hover:shadow-md hover:border-gray-200 transition-all duration-200">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0 cursor-pointer" onClick={() => router.push(`/cases/${c.id}`)}>
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className={`w-2 h-2 rounded-full ${URGENCY_DOT[c.urgency]}`} />
                        <Badge className={T[c.urgency]}>{c.urgency.toUpperCase()}</Badge>
                        <Badge variant="outline" className={STATUS_COLORS[c.status]}>{c.status}</Badge>
                        <span className="text-xs text-gray-400">#{c.id}</span>
                        <span className="text-xs text-gray-300">{new Date(c.created_at).toLocaleDateString("en-IN")}</span>
                      </div>
                      <p className="text-sm text-gray-700 font-medium">
                        {c.possible_category || "Unclassified"} <span className="text-gray-300">·</span> {c.language.toUpperCase()}
                      </p>
                    </div>
                    <div className="flex gap-1.5 shrink-0 ml-4 opacity-0 group-hover:opacity-100 transition-opacity">
                      {c.patient_id && (
                        <Button size="sm" variant="ghost" className="text-xs rounded-lg" onClick={(e) => { e.stopPropagation(); router.push(`/patients/${c.patient_id}`); }}>
                          📋 History
                        </Button>
                      )}
                      {c.status === "open" && (
                        <Button size="sm" onClick={() => updateStatus(c, "assigned")}
                          className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg text-xs shadow-md shadow-blue-500/20 hover:shadow-lg">
                          Review
                        </Button>
                      )}
                      {c.status === "assigned" && (
                        <Button size="sm" variant="outline" onClick={() => updateStatus(c, "visited")}
                          className="border-emerald-300 text-emerald-700 rounded-lg text-xs hover:bg-emerald-50">
                          ✅ Mark Treated
                        </Button>
                      )}
                      <Button size="sm" variant="outline" className="text-xs rounded-lg" onClick={() => router.push(`/cases/${c.id}`)}>
                        Details
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </DashboardLayout>
  );
}