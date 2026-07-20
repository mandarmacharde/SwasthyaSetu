import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 via-white to-white">
      <header className="border-b border-emerald-100/40 bg-white/80 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
              <span className="text-white text-xs font-bold">S</span>
            </div>
            <h1 className="text-lg font-bold text-emerald-800">SwasthyaSetu</h1>
          </div>
          <div className="flex gap-2 md:gap-3">
            <Link href="/demo-call" className={buttonVariants({ variant: "default", size: "sm", className: "bg-emerald-600 hover:bg-emerald-700 shadow-sm" })}>
              Try Demo
            </Link>
            <Link href="/login" className={buttonVariants({ variant: "outline", size: "sm", className: "border-emerald-200 text-emerald-700 hover:bg-emerald-50" })}>
              Login
            </Link>
          </div>
        </div>
      </header>

      <section className="max-w-5xl mx-auto px-4 pt-20 md:pt-28 pb-16 md:pb-20 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 mb-6 rounded-full bg-emerald-100/60 border border-emerald-200 text-sm font-medium text-emerald-700">
          <span className="flex h-2 w-2 rounded-full bg-emerald-500" />
          AI for Bharat Hackathon 2026
        </div>
        <h2 className="text-4xl md:text-6xl font-bold text-slate-900 mb-5 leading-[1.1] tracking-tight">
          Bridging every village<br />
          <span className="text-emerald-600">to healthcare</span>
        </h2>
        <p className="text-lg md:text-xl text-slate-500 mb-3 max-w-2xl mx-auto">
          One phone call, in one&apos;s own tongue.
        </p>
        <p className="text-sm md:text-base text-slate-400 max-w-xl mx-auto mb-10 leading-relaxed">
          AI-powered triage for rural India. Patients speak symptoms in Marathi, Hindi, or English
          — no smartphone, no typing, no app required.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/demo-call"
            className={buttonVariants({ size: "lg", className: "bg-emerald-600 hover:bg-emerald-700 text-base px-8 w-full sm:w-auto shadow-lg shadow-emerald-200 h-12" })}
          >
            Try the Demo
          </Link>
          <Link
            href="/login"
            className={buttonVariants({ size: "lg", variant: "outline", className: "text-base px-8 w-full sm:w-auto h-12 border-slate-200 text-slate-700" })}
          >
            ASHA / Doctor Login
          </Link>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 pb-20">
        <div className="text-center mb-12">
          <h3 className="text-2xl md:text-3xl font-bold text-slate-900 mb-3">How it works</h3>
          <p className="text-slate-500 max-w-md mx-auto">From a simple phone call to the right care — in three steps.</p>
        </div>
        <div className="grid sm:grid-cols-3 gap-5">
          {[
            { step: "01", icon: "📞", title: "Call & Speak", desc: "Patient dials toll-free and speaks symptoms naturally in Marathi, Hindi, or English. No app, no typing." },
            { step: "02", icon: "🧠", title: "AI Triage", desc: "WHO-protocol AI asks structured questions. It classifies urgency — never diagnoses — ensuring safe, reliable triage." },
            { step: "03", icon: "🏥", title: "Routed to Care", desc: "ASHA worker, PHC doctor, or emergency services get notified instantly. The right responder reaches the patient." },
          ].map((item) => (
            <Card key={item.step} className="border border-emerald-100/50 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
              <CardContent className="p-6 md:p-7">
                <span className="text-[10px] font-bold text-emerald-500 tracking-widest">{item.step}</span>
                <p className="text-2xl mt-3 mb-3">{item.icon}</p>
                <h4 className="font-semibold text-slate-800 mb-1.5">{item.title}</h4>
                <p className="text-sm text-slate-500 leading-relaxed">{item.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="bg-emerald-700 py-16 md:py-20">
        <div className="max-w-6xl mx-auto px-4">
          <h3 className="text-2xl md:text-3xl font-bold text-white text-center mb-12">Built for everyone in the chain</h3>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                role: "Patients",
                who: "Rural villagers",
                color: "bg-emerald-500",
                features: ["Speak in your own language", "No smartphone needed", "Toll-free number", "Get help fast"],
              },
              {
                role: "ASHA Workers",
                who: "Frontline health workers",
                color: "bg-amber-500",
                features: ["Receive assigned cases", "Track visit schedules", "Patient call-back numbers", "Simple dashboard"],
              },
              {
                role: "Doctors",
                who: "PHC & emergency staff",
                color: "bg-blue-500",
                features: ["AI-triaged case queue", "Urgency-based sorting", "Patient history access", "Mark treatment done"],
              },
            ].map((group) => (
              <div key={group.role} className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 md:p-7 border border-white/10">
                <div className={`w-10 h-10 rounded-xl ${group.color} flex items-center justify-center text-white text-lg font-bold mb-4`}>
                  {group.role.charAt(0)}
                </div>
                <h4 className="text-lg font-bold text-white mb-0.5">{group.role}</h4>
                <p className="text-sm text-emerald-200 mb-4">{group.who}</p>
                <ul className="space-y-2">
                  {group.features.map((f) => (
                    <li key={f} className="text-sm text-emerald-100 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 py-16 md:py-20">
        <div className="text-center mb-10">
          <h3 className="text-2xl md:text-3xl font-bold text-slate-900 mb-3">Why SwasthyaSetu</h3>
          <p className="text-slate-500 max-w-lg mx-auto">Purpose-built for India&apos;s rural healthcare challenges.</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon: "🌐", title: "Multilingual", desc: "Marathi, Hindi, and English — with more languages coming." },
            { icon: "🎤", title: "Voice-first", desc: "Works entirely by voice. No literacy, no typing required." },
            { icon: "🧠", title: "WHO Protocol", desc: "Triage follows WHO IMCI guidelines. Safe, consistent, reliable." },
            { icon: "📱", title: "No app needed", desc: "Works on any phone. No smartphone, no internet required." },
          ].map((item) => (
            <Card key={item.title} className="border border-emerald-100/30 shadow-sm bg-emerald-50/20">
              <CardContent className="p-5 text-center">
                <p className="text-2xl mb-3">{item.icon}</p>
                <h4 className="font-semibold text-slate-800 mb-1 text-sm">{item.title}</h4>
                <p className="text-xs text-slate-500 leading-relaxed">{item.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="bg-slate-50 border-t border-slate-100 py-14">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h3 className="text-xl md:text-2xl font-bold text-slate-900 mb-3">Ready to see it in action?</h3>
          <p className="text-sm text-slate-500 mb-6">Experience the AI voice triage firsthand with our live demo.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/demo-call" className={buttonVariants({ size: "lg", className: "bg-emerald-600 hover:bg-emerald-700 text-base px-8 shadow-sm" })}>
              Try the Demo
            </Link>
            <Link href="/login" className={buttonVariants({ size: "lg", variant: "outline", className: "text-base px-8 border-slate-200" })}>
              Staff Login
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-100 py-10 text-center">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
              <span className="text-white text-[9px] font-bold">S</span>
            </div>
            <span className="text-sm font-bold text-slate-600">SwasthyaSetu</span>
          </div>
          <p className="text-xs text-slate-400">AI for Bharat Hackathon 2026 · IIIT Delhi</p>
          <p className="text-xs text-slate-400 mt-1">Built by Mandar Prakash Macharde · SPIT, Mumbai</p>
        </div>
      </footer>
    </div>
  );
}
