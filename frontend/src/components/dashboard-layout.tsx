"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";

const SIDEBAR_GRADIENT = "from-emerald-700 via-emerald-800 to-teal-900";

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

const ROLE_LABELS: Record<string, string> = {
  asha: "ASHA Worker", doctor: "Doctor", admin: "Admin",
};

export function DashboardLayout({
  children, role, userName,
}: {
  children: React.ReactNode; role: "asha" | "doctor" | "admin"; userName: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const items = navItems[role];
  const [open, setOpen] = useState(false);

  const signOut = () => { localStorage.removeItem("swasthyasetu_user"); router.push("/login"); };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      <header className="md:hidden flex items-center justify-between px-4 py-3 bg-white border-b sticky top-0 z-30">
        <Link href="/" className="text-base font-bold text-emerald-700">SwasthyaSetu</Link>
        <button onClick={() => setOpen(true)} className="p-1.5 text-gray-500 hover:text-gray-700">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
        </button>
      </header>

      {open && <div className="fixed inset-0 bg-black/40 z-20 md:hidden" onClick={() => setOpen(false)} />}

      <aside className={`${open ? "fixed inset-y-0 left-0 z-30 w-64" : "hidden"} md:relative md:flex md:w-60 bg-white border-r flex-col shrink-0`}>
        <div className={`bg-gradient-to-br ${SIDEBAR_GRADIENT} p-5 ${open ? "" : "hidden md:block"}`}>
          {open && (
            <div className="flex items-center justify-between mb-3 md:hidden">
              <span className="text-white font-bold text-sm">SwasthyaSetu</span>
              <button onClick={() => setOpen(false)} className="text-white/70 hover:text-white"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
          )}
          <div className="hidden md:block">
            <Link href="/" className="text-white font-bold text-lg tracking-tight">SwasthyaSetu</Link>
            <p className="text-emerald-200 text-xs mt-0.5">{ROLE_LABELS[role] || role}</p>
          </div>
          <div className="flex items-center gap-3 mt-4 md:mt-6">
            <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-sm font-bold text-white">{userName.charAt(0)}</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{userName}</p>
              <Badge variant="outline" className="text-[10px] text-emerald-200 border-emerald-500/30 capitalize">{role}</Badge>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-0.5">
          {items.map(item => (
            <Link key={item.href} href={item.href} onClick={() => setOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
                pathname === item.href
                  ? "bg-emerald-50 text-emerald-700 font-medium shadow-sm"
                  : "text-gray-600 hover:bg-gray-100"
              }`}>
              <span className="text-lg">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="border-t border-gray-100 p-3 mt-auto">
          <button onClick={signOut}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            Sign Out
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <div className="p-4 md:p-8 max-w-7xl mx-auto">{children}</div>
      </main>
    </div>
  );
}