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

export default function AshaDashboard() {
  const router = useRouter();
  const [user] = useState(getUser);
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("all");

  const load = (t: string) => {
    setLoading(true);
    const params: any = {};
    if (t === "urgent") params.urgency = "emergency";
    if (t === "mine") params.assigned_to = user.id;
    api.cases.list(params).then(setCases).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { load(tab); }, [tab]);

  const assignToMe = async (c: Case) => {
    try {
      const updated = await api.cases.update(c.id, { assigned_to: user.id, status: "assigned" });
      setCases((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
    } catch (e) { console.error(e); }
  };

  const markVisited = async (c: Case) => {
    try {
      const updated = await api.cases.update(c.id, { status: "visited" });
      setCases((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
    } catch (e) { console.error(e); }
  };

  const urgent = cases.filter((c) => c.urgency === "emergency");
  const myCases = cases.filter((c) => c.assigned_to === user.id);
  const today = cases.filter(
    (c) => new Date(c.created_at).toDateString() === new Date().toDateString()
  );

  return (
    <DashboardLayout role="asha" userName={user.name}>
      <div className="mb-6">
        <h1 className="text-xl md:text-2xl font-bold">My Patients</h1>
        <p className="text-sm text-gray-500">Today&apos;s assigned cases and pending visits</p>
      </div>

      {loading ? <SkeletonDashboard cols={3} /> : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 mb-6">
            <StatsCard title="Total Cases" value={cases.length} icon="📋" subtitle="All assigned" />
            <StatsCard title="High Priority" value={urgent.length} icon="🔴" subtitle="Needs immediate attention" />
            <StatsCard title="My Patients" value={myCases.length} icon="🏥" subtitle="Assigned to me" />
          </div>

          {urgent.length > 0 && (
            <div className="mb-6 p-3 bg-red-50 border-2 border-red-300 rounded-lg animate-pulse">
              <h3 className="text-sm font-semibold text-red-700 mb-2">
                🚨 {urgent.length} emergency case{urgent.length > 1 ? "s" : ""} — action required
              </h3>
              <div className="grid gap-3">
                {urgent.map((c) => (
                  <div key={c.id} className="bg-white border border-red-200 rounded-lg p-3 flex items-center justify-between">
                    <div className="flex-1 min-w-0 cursor-pointer" onClick={() => router.push(`/cases/${c.id}`)}>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className={URGENCY_COLORS[c.urgency]}>{c.urgency.toUpperCase()}</Badge>
                        <Badge variant="outline" className={STATUS_COLORS[c.status]}>{c.status}</Badge>
                        <span className="text-xs text-gray-400">#{c.id}</span>
                      </div>
                      <p className="text-sm font-medium">{c.possible_category || "Unclassified"} · {c.language.toUpperCase()}</p>
                    </div>
                    <div className="flex gap-1 shrink-0 ml-3">
                      {!c.assigned_to && (
                        <Button size="sm" variant="outline" className="text-xs" onClick={() => assignToMe(c)}>
                          Assign
                        </Button>
                      )}
                      {c.status === "assigned" && c.assigned_to === user.id && (
                        <Button size="sm" variant="outline" className="text-xs border-teal-300 text-teal-700" onClick={() => markVisited(c)}>
                          Visit
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
            {["all", "urgent", "mine", "visits"].map((t) => (
              <Button
                key={t}
                variant={tab === t ? "default" : "outline"}
                size="sm"
                onClick={() => setTab(t)}
              >
                {t === "all" && "All Cases"}
                {t === "urgent" && "High Priority"}
                {t === "mine" && "My Patients"}
                {t === "visits" && "Visit Log"}
              </Button>
            ))}
          </div>

          {cases.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <p className="text-3xl mb-2">🏥</p>
              <p>No cases found.</p>
              <p className="text-xs mt-1">Run a triage from the demo-call page to see cases here.</p>
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
                      {c.assigned_to && <span className="text-xs text-gray-400 ml-2">→ User #{c.assigned_to}</span>}
                    </p>
                  </div>
                  <div className="flex gap-1 shrink-0 ml-3">
                    {c.patient_id && (
                      <Button size="sm" variant="ghost" className="text-xs text-gray-400" onClick={(e) => { e.stopPropagation(); router.push(`/patients/${c.patient_id}`); }}>
                        History
                      </Button>
                    )}
                    {!c.assigned_to && (
                      <Button size="sm" variant="outline" className="text-xs" onClick={() => assignToMe(c)}>Assign</Button>
                    )}
                    {c.status === "assigned" && c.assigned_to === user.id && (
                      <Button size="sm" variant="outline" className="text-xs border-teal-300 text-teal-700" onClick={() => markVisited(c)}>Mark Visited</Button>
                    )}
                    <Button size="sm" variant="outline" className="text-xs" onClick={() => router.push(`/cases/${c.id}`)}>View</Button>
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
