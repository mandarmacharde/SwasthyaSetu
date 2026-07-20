"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api, Case } from "@/lib/api";
import { URGENCY_COLORS, STATUS_COLORS } from "@/lib/theme";
import { getUser } from "@/lib/auth";

export default function CaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [caseData, setCaseData] = useState<Case | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [user, setUser] = useState<{ name: string; role: string; id?: number }>({ name: "", role: "asha" });
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setUser(getUser()); setMounted(true); }, []);

  useEffect(() => {
    api.cases.get(Number(id)).then(setCaseData).catch(console.error).finally(() => setLoading(false));
  }, [id]);

  const updateCase = async (data: { status?: string; assigned_to?: number }) => {
    setUpdating(true);
    try {
      const updated = await api.cases.update(Number(id), data);
      setCaseData(updated);
    } catch (e) { console.error(e); }
    finally { setUpdating(false); }
  };

  const parseTranscript = (raw: string): { role: string; content: string; timestamp?: string }[] => {
    try { return JSON.parse(raw); } catch { return []; }
  };

  const parseSummary = () => {
    if (!caseData?.triage_summary) return null;
    try { return JSON.parse(caseData.triage_summary); } catch { return null; }
  };

  const handlePrint = () => window.print();

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-gray-400">Loading...</p>
    </div>
  );

  if (!caseData) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-gray-400">Case not found</p>
    </div>
  );

  const summary = parseSummary();
  const transcript = parseTranscript(caseData.transcript);
  const isAsha = user.role === "asha";
  const isDoctor = user.role === "doctor";

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white px-4 h-14 flex items-center gap-3 print:hidden">
        <Link href={`/${user.role}`} className="text-sm text-emerald-700 font-medium">← Back to Dashboard</Link>
        <span className="text-xs text-gray-400">Case #{caseData.id}</span>
        <div className="ml-auto flex gap-2">
          {caseData.patient_id && (
            <Button size="sm" variant="outline" className="text-xs" onClick={() => router.push(`/patients/${caseData.patient_id}`)}>
              Patient History
            </Button>
          )}
          <Button size="sm" variant="outline" className="text-xs" onClick={handlePrint}>
            Print / PDF
          </Button>
        </div>
      </header>

      <div className="max-w-3xl mx-auto p-4 space-y-4" id="case-report">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                Case #{caseData.id}
                <Badge className={STATUS_COLORS[caseData.status]}>{caseData.status}</Badge>
              </CardTitle>
              <p className="text-sm text-gray-500 mt-1">
                {new Date(caseData.created_at).toLocaleString("en-IN")}
              </p>
            </div>
            <div className="flex gap-1 print:hidden">
              {(isAsha || isDoctor) && caseData.status === "open" && (
                <Button size="sm" onClick={() => updateCase({ assigned_to: user.id || 1, status: "assigned" })} disabled={updating}>
                  {updating ? "..." : "Assign to Me"}
                </Button>
              )}
              {isAsha && caseData.status === "assigned" && caseData.assigned_to === (user.id || null) && (
                <Button size="sm" variant="outline" className="border-teal-300 text-teal-700" onClick={() => updateCase({ status: "visited" })} disabled={updating}>
                  {updating ? "..." : "Mark Visited"}
                </Button>
              )}
              {(isAsha || isDoctor) && (caseData.status === "visited" || caseData.status === "assigned") && (
                <Button size="sm" variant="outline" className="border-gray-300" onClick={() => updateCase({ status: "closed" })} disabled={updating}>
                  {updating ? "..." : "Close Case"}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="border rounded-lg p-3 bg-white">
                <p className="text-xs text-gray-400 mb-1">Urgency</p>
                <Badge className={URGENCY_COLORS[caseData.urgency]}>{caseData.urgency.toUpperCase()}</Badge>
              </div>
              <div className="border rounded-lg p-3 bg-white">
                <p className="text-xs text-gray-400 mb-1">Category</p>
                <p className="font-medium text-sm">{caseData.possible_category || "—"}</p>
              </div>
              <div className="border rounded-lg p-3 bg-white">
                <p className="text-xs text-gray-400 mb-1">Language</p>
                <p className="font-medium text-sm">{caseData.language.toUpperCase()}</p>
              </div>
              <div className="border rounded-lg p-3 bg-white">
                <p className="text-xs text-gray-400 mb-1">Assigned</p>
                <p className="font-medium text-sm">{caseData.assigned_to ? `User #${caseData.assigned_to}` : "—"}</p>
              </div>
            </div>

            {summary?.next_question && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-xs text-blue-500 font-medium mb-1">Last AI Question</p>
                <p className="text-sm text-blue-800">{summary.next_question}</p>
              </div>
            )}

            {caseData.callback_number && (
              <div className="text-xs text-gray-400">
                Callback: {caseData.callback_number}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">💬 Conversation Transcript</CardTitle>
          </CardHeader>
          <CardContent>
            {transcript.length === 0 ? (
              <p className="text-sm text-gray-400">No transcript available.</p>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto pr-2 print:max-h-none print:overflow-visible">
                {transcript.map((turn, i) => (
                  <div key={i} className={`flex gap-3 p-3 rounded-lg ${turn.role === "user" ? "bg-gray-50" : "bg-emerald-50"}`}>
                    <span className="text-lg shrink-0">{turn.role === "user" ? "👤" : "🤖"}</span>
                    <div>
                      <p className="text-xs font-medium text-gray-400 mb-0.5">{turn.role === "user" ? "Patient" : "SwasthyaSetu AI"}</p>
                      <p className="text-sm text-gray-700">{turn.content}</p>
                      {turn.timestamp && <p className="text-xs text-gray-300 mt-1">{new Date(turn.timestamp).toLocaleTimeString("en-IN")}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
