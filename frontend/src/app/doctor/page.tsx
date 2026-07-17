"use client";

import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { StatsCard } from "@/components/stats-card";
import { SkeletonDashboard } from "@/components/skeleton-dashboard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { api, Case } from "@/lib/api";
import { getUser } from "@/lib/auth";
import { URGENCY_COLORS, STATUS_COLORS } from "@/lib/theme";
import { useRouter } from "next/navigation";

export default function DoctorDashboard() {
  const router = useRouter();
  const [user] = useState(getUser);
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("open");

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
  const today = cases.filter(
    (c) => new Date(c.created_at).toDateString() === new Date().toDateString()
  );

  return (
    <DashboardLayout role="doctor" userName={user.name}>
      <div className="mb-6">
        <h1 className="text-xl md:text-2xl font-bold">Incoming Cases</h1>
        <p className="text-sm text-gray-500">AI-triaged cases awaiting review</p>
      </div>

      {loading ? <SkeletonDashboard cols={4} /> : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
            <StatsCard title="Open Cases" value={cases.length} icon="🩺" subtitle="Awaiting review" />
            <StatsCard title="Emergency" value={emergency.length} icon="🚨" subtitle="Immediate attention" />
            <StatsCard title="Categories" value={categories.length} icon="📊" subtitle="Symptom types" />
            <StatsCard title="Today" value={today.length} icon="📅" subtitle="New today" />
          </div>

          {emergency.length > 0 && (
            <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg animate-fade-in">
              <h3 className="text-sm font-semibold text-red-700 mb-2">
                🚨 Emergency Queue — {emergency.length} case{emergency.length > 1 ? "s" : ""}
              </h3>
              <div className="grid md:grid-cols-2 gap-3">
                {emergency.map((c) => (
                  <div key={c.id} className="bg-white border border-red-200 rounded-lg p-3 cursor-pointer" onClick={() => router.push(`/cases/${c.id}`)}>
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className={URGENCY_COLORS[c.urgency]}>{c.urgency.toUpperCase()}</Badge>
                      <Badge variant="outline" className={STATUS_COLORS[c.status]}>{c.status}</Badge>
                      <span className="text-xs text-gray-400">#{c.id}</span>
                    </div>
                    <p className="text-sm font-medium">{c.possible_category || "Unclassified"} · {c.language.toUpperCase()}</p>
                    <p className="text-xs text-gray-400 mt-1">{new Date(c.created_at).toLocaleString("en-IN")}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
            {["open", "emergency", "history"].map((t) => (
              <Button
                key={t}
                variant={tab === t ? "default" : "outline"}
                size="sm"
                onClick={() => setTab(t)}
              >
                {t === "open" && "Open Cases"}
                {t === "emergency" && "Emergency"}
                {t === "history" && "History"}
              </Button>
            ))}
          </div>

          {cases.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <p className="text-3xl mb-2">🩺</p>
              <p>No cases found.</p>
              <p className="text-xs mt-1">Cases will appear here after triage.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {cases.map((c) => (
                <div key={c.id} className="border rounded-lg p-3 bg-white hover:shadow-sm transition-shadow flex items-center justify-between">
                  <div className="flex-1 min-w-0 cursor-pointer" onClick={() => router.push(`/cases/${c.id}`)}>
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className={URGENCY_COLORS[c.urgency]}>{c.urgency.toUpperCase()}</Badge>
                      <Badge variant="outline" className={STATUS_COLORS[c.status]}>{c.status}</Badge>
                      <span className="text-xs text-gray-400">#{c.id}</span>
                      <span className="text-xs text-gray-300">{new Date(c.created_at).toLocaleDateString("en-IN")}</span>
                    </div>
                    <p className="text-sm text-gray-700">
                      {c.possible_category || "Unclassified"} · {c.language.toUpperCase()}
                    </p>
                  </div>
                  <div className="flex gap-1 shrink-0 ml-3">
                    {c.status === "open" && (
                      <Button size="sm" className="text-xs" onClick={() => updateStatus(c, "assigned")}>Review</Button>
                    )}
                    {c.status === "assigned" && (
                      <Button size="sm" variant="outline" className="text-xs border-teal-300 text-teal-700" onClick={() => updateStatus(c, "visited")}>Mark Treated</Button>
                    )}
                    <Button size="sm" variant="outline" className="text-xs" onClick={() => router.push(`/cases/${c.id}`)}>Details</Button>
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
