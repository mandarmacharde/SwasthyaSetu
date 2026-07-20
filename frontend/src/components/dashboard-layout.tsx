"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

const navItems = {
  asha: [
    { label: "Dashboard", href: "/asha", icon: "🏥" },
  ],
  doctor: [
    { label: "Dashboard", href: "/doctor", icon: "🩺" },
  ],
  admin: [
    { label: "Dashboard", href: "/admin", icon: "📊" },
  ],
};

export function DashboardLayout({
  children,
  role,
  userName,
}: {
  children: React.ReactNode;
  role: "asha" | "doctor" | "admin";
  userName: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const items = navItems[role];
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const signOut = () => { localStorage.removeItem("swasthyasetu_user"); router.push("/login"); };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      <header className="md:hidden flex items-center justify-between p-3 bg-white border-b sticky top-0 z-20">
        <Link href="/" className="text-lg font-bold text-emerald-700">SwasthyaSetu</Link>
        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 text-gray-600 text-2xl">
          {sidebarOpen ? "✕" : "☰"}
        </button>
      </header>

      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/30 z-10 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={`${sidebarOpen ? "fixed inset-y-0 left-0 z-20 w-64" : "hidden"} md:relative md:flex md:w-64 bg-white border-r flex-col shrink-0`}>
        <div className="p-4 border-b hidden md:block">
          <Link href="/" className="text-lg font-bold text-emerald-700">SwasthyaSetu</Link>
          <p className="text-xs text-gray-500 mt-0.5">
            {role === "asha" && "ASHA Worker Dashboard"}
            {role === "doctor" && "Doctor Dashboard"}
            {role === "admin" && "Admin Dashboard"}
          </p>
        </div>
        <div className="p-4 border-b md:hidden flex items-center justify-between">
          <p className="text-sm font-semibold">{userName}</p>
          <button onClick={() => setSidebarOpen(false)} className="text-gray-400">✕</button>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                pathname === item.href || pathname.startsWith(item.href.split("?")[0])
                  ? "bg-emerald-50 text-emerald-700 font-medium"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>
        <Separator />
        <div className="p-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-sm font-medium text-emerald-700">
            {userName.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{userName}</p>
            <Badge variant="outline" className="text-[10px] capitalize">{role}</Badge>
          </div>
        </div>
        <div className="px-4 pb-4">
          <button onClick={signOut} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-500 hover:bg-gray-100 transition-colors">
            Sign Out
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        <div className="p-3 md:p-6 max-w-7xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
