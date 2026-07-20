"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const DEMO_USERS = [
  { role: "asha" as const, name: "Anita Sharma", id: 1, phone: "+919000000001" },
  { role: "asha" as const, name: "Priya Verma", id: 3, phone: "+919000000003" },
  { role: "doctor" as const, name: "Dr. Rajesh Kumar", id: 2, phone: "+919000000002" },
];

export default function LoginPage() {
  const router = useRouter();
  const [role, setRole] = useState<"asha" | "doctor" | "admin">("asha");

  const login = (name: string, targetRole: string, id?: number) => {
    localStorage.setItem("swasthyasetu_user", JSON.stringify({ role: targetRole, name, id }));
    router.push(`/${targetRole}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl text-emerald-700">SwasthyaSetu</CardTitle>
          <p className="text-sm text-gray-500 mt-1">Sign in to your dashboard</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            {(["asha", "doctor", "admin"] as const).map((r) => (
              <Button
                key={r}
                variant={role === r ? "default" : "outline"}
                className="flex-1 capitalize"
                onClick={() => setRole(r)}
              >
                {r === "asha" ? "ASHA" : r === "doctor" ? "Doctor" : "Admin"}
              </Button>
            ))}
          </div>

          <div className="border rounded-lg divide-y">
            {role === "admin" ? (
              <button
                className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors text-left"
                onClick={() => login("Admin", "admin")}
              >
                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold">A</div>
                <div className="flex-1">
                  <p className="font-medium text-sm">Admin</p>
                  <p className="text-xs text-gray-400"><Badge variant="outline" className="text-[10px]">admin</Badge></p>
                </div>
                <span className="text-gray-300 text-lg">→</span>
              </button>
            ) : (
              DEMO_USERS.filter((u) => u.role === role).map((u) => (
                <button
                  key={u.id}
                  className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors text-left"
                  onClick={() => login(u.name, role, u.id)}
                >
                  <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold">
                    {u.name.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{u.name}</p>
                    <p className="text-xs text-gray-400">{u.phone} · <Badge variant="outline" className="text-[10px]">{u.role}</Badge></p>
                  </div>
                  <span className="text-gray-300 text-lg">→</span>
                </button>
              ))
            )}
          </div>

          <div className="text-center pt-2">
            <p className="text-xs text-gray-400">Demo mode — click a user to enter</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
