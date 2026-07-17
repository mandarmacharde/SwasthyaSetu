const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface Case {
  id: number;
  session_id: string;
  patient_id: number | null;
  assigned_to: number | null;
  urgency: string;
  possible_category: string;
  transcript: string;
  triage_summary: string;
  status: string;
  language: string;
  callback_number: string;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: number;
  name: string;
  phone: string;
  role: "asha" | "doctor" | "admin";
  district: string;
  health_center_id: number | null;
}

async function fetchJSON<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`API ${res.status}: ${err}`);
  }
  return res.json();
}

export const api = {
  cases: {
    list: (params?: { status?: string; urgency?: string; assigned_to?: number }) => {
      const q = new URLSearchParams();
      if (params?.status) q.set("status", params.status);
      if (params?.urgency) q.set("urgency", params.urgency);
      if (params?.assigned_to) q.set("assigned_to", String(params.assigned_to));
      const qs = q.toString();
      return fetchJSON<Case[]>(`/api/cases/${qs ? `?${qs}` : ""}`);
    },
    get: (id: number) => fetchJSON<Case>(`/api/cases/${id}`),
    update: (id: number, data: { status?: string; assigned_to?: number }) =>
      fetchJSON<Case>(`/api/cases/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
  },

  users: {
    list: () => fetchJSON<User[]>("/api/users/"),
  },

  triage: {
    text: (text: string, session_id?: string, language = "mr") =>
      fetchJSON<{
        session_id: string;
        transcript: string;
        urgency: string;
        possible_category: string;
        next_question: string;
        complete: boolean;
      }>("/api/triage", {
        method: "POST",
        body: JSON.stringify({ text, session_id, language }),
      }),
    detectLanguage: (text: string) =>
      fetchJSON<{ language: string; label: string }>("/api/detect-language", {
        method: "POST",
        body: JSON.stringify({ text }),
      }),
    audio: async (audioBlob: Blob, session_id?: string, language = "mr") => {
      const formData = new FormData();
      formData.append("audio", audioBlob, "recording.webm");
      if (session_id) formData.append("session_id", session_id);
      formData.append("language", language);
      const res = await fetch(`${API_BASE}/api/audio-triage`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) { const err = await res.text(); throw new Error(`API ${res.status}: ${err}`); }
      return res.json() as Promise<{
        session_id: string; transcript: string; urgency: string;
        possible_category: string; next_question: string;
        reply_audio_base64?: string; complete: boolean; error?: string;
      }>;
    },
  },

  seed: {
    demo: () => fetchJSON<{ message: string; cases: number; users: number; patients: number }>("/api/seed/demo", { method: "POST" }),
  },
};
