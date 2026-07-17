"use client";

import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { StatsCard } from "@/components/stats-card";
import { CaseTable } from "@/components/case-table";
import { SkeletonDashboard } from "@/components/skeleton-dashboard";
import { Button } from "@/components/ui/button";
import { api, Case } from "@/lib/api";
import { getUser } from "@/lib/auth";
import { useRouter } from "next/navigation";

export default function AdminDashboard() {
  const router = useRouter();
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [user] = useState(getUser);

  const loadCases = () => {
    setLoading(true);
    api.cases.list().then(setCases).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { loadCases(); }, []);

  const seedDemo = async () => {
    setSeeding(true);
    try {
      await api.seed.demo();
      loadCases();
    } catch (e) { console.error(e); }
    finally { setSeeding(false); }
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
        <Button size="sm" variant="outline" onClick={seedDemo} disabled={seeding}>
          {seeding ? "Seeding..." : "🌱 Seed Demo Data"}
        </Button>
      </div>

      {loading ? <SkeletonDashboard cols={4} /> : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
            <StatsCard title="Total Calls" value={cases.length} icon="📞" subtitle="All time" />
            <StatsCard title="Today" value={today.length} icon="📅" subtitle="New today" />
            <StatsCard title="Emergency" value={emergency.length} icon="🚨" subtitle={`${cases.length > 0 ? ((emergency.length / cases.length) * 100).toFixed(0) : 0}% of total`} />
            <StatsCard title="Languages" value={languages.length} icon="🌐" subtitle={`${categories.length} symptom categories`} />
          </div>

          {cases.length === 0 && (
            <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg text-center animate-fade-in">
              <p className="text-sm text-amber-700 mb-2">No data yet. Seed demo data to see the dashboards in action.</p>
              <Button size="sm" onClick={seedDemo} disabled={seeding}>
                {seeding ? "Seeding..." : "🌱 Seed Demo Data"}
              </Button>
            </div>
          )}

          {cases.length > 0 && (
            <div className="grid md:grid-cols-2 gap-4 md:gap-6 mb-6">
              <div className="border rounded-lg p-4 bg-white">
                <h3 className="font-semibold mb-3">🌐 Languages Used</h3>
                <div className="space-y-2">
                  {langBreakdown.map(({ lang, count }) => (
                    <div key={lang} className="flex items-center gap-2">
                      <span className="text-xs md:text-sm w-8 font-mono">{lang.toUpperCase()}</span>
                      <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full transition-all duration-700"
                          style={{ width: `${(count / cases.length) * 100}%` }}
                        />
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
                          <div
                            className={`h-full rounded-full transition-all duration-700 ${
                              level === "emergency" ? "bg-red-500"
                              : level === "high" ? "bg-orange-500"
                              : level === "medium" ? "bg-yellow-500"
                              : "bg-green-500"
                            }`}
                            style={{ width: `${pct}%` }}
                          />
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
                <p>No cases yet.</p>
                <p className="text-xs mt-1">Run a triage or seed demo data to populate.</p>
              </div>
            ) : (
              <CaseTable
                cases={cases.slice(0, 20)}
                onCaseClick={(c) => router.push(`/cases/${c.id}`)}
              />
            )}
          </div>
        </>
      )}
    </DashboardLayout>
  );
}
