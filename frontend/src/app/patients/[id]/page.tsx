"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { api, Patient } from "@/lib/api";
import { URGENCY_BG, STATUS_COLORS } from "@/lib/theme";
import { getUser } from "@/lib/auth";

export default function PatientHistoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [user] = useState(getUser);

  useEffect(() => {
    api.patients.get(Number(id)).then(setPatient).catch(console.error).finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-gray-400">Loading...</p>
    </div>
  );

  if (!patient) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-gray-400">Patient not found</p>
    </div>
  );

  const cases = patient.cases || [];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white px-4 h-14 flex items-center gap-3">
        <Link href={`/${user.role}`} className="text-sm text-emerald-700 font-medium">← Back to Dashboard</Link>
        <span className="text-xs text-gray-400">Patient #{patient.id}</span>
      </header>

      <div className="max-w-3xl mx-auto p-4 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {patient.name || "Unknown Patient"}
              {patient.abha_id && <Badge variant="outline" className="text-xs">ABHA: {patient.abha_id}</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="border rounded-lg p-3">
                <p className="text-xs text-gray-400 mb-1">Phone</p>
                <p className="font-medium text-sm">{patient.phone || "—"}</p>
              </div>
              <div className="border rounded-lg p-3">
                <p className="text-xs text-gray-400 mb-1">Language</p>
                <p className="font-medium text-sm">{patient.language.toUpperCase()}</p>
              </div>
              <div className="border rounded-lg p-3">
                <p className="text-xs text-gray-400 mb-1">District</p>
                <p className="font-medium text-sm">{patient.district || "—"}</p>
              </div>
              <div className="border rounded-lg p-3">
                <p className="text-xs text-gray-400 mb-1">Total Cases</p>
                <p className="font-medium text-sm">{cases.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">📋 Case History ({cases.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {cases.length === 0 ? (
              <p className="text-sm text-gray-400">No cases recorded for this patient.</p>
            ) : (
              <div className="space-y-3">
                {cases.map((c, i) => {
                  const summary = c.triage_summary ? JSON.parse(c.triage_summary) : null;
                  return (
                    <div
                      key={c.id}
                      className="border rounded-lg p-4 bg-white cursor-pointer hover:shadow-sm transition-shadow"
                      onClick={() => router.push(`/cases/${c.id}`)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-400 font-mono w-6">{cases.length - i}</span>
                          <Badge className={URGENCY_BG[c.urgency]}>{c.urgency.toUpperCase()}</Badge>
                          <Badge variant="outline" className={STATUS_COLORS[c.status]}>{c.status}</Badge>
                          <span className="text-xs text-gray-400">#{c.id}</span>
                        </div>
                        <span className="text-xs text-gray-400">
                          {new Date(c.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700">
                        {c.possible_category || "Unclassified"} · {c.language.toUpperCase()}
                      </p>
                      {summary?.next_question && (
                        <p className="text-xs text-gray-400 mt-1">❓ {summary.next_question}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
