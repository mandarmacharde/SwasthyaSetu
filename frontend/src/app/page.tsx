import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white">
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <h1 className="text-lg md:text-xl font-bold text-emerald-700">SwasthyaSetu</h1>
          <div className="flex gap-2 md:gap-3">
            <Link href="/demo-call" className={buttonVariants({ variant: "default", size: "sm" })}>
              Try Demo
            </Link>
            <Link href="/login" className={buttonVariants({ variant: "outline", size: "sm" })}>
              Login
            </Link>
          </div>
        </div>
      </header>

      <section className="max-w-5xl mx-auto px-4 pt-16 md:pt-20 pb-10 md:pb-12 text-center">
        <div className="flex flex-wrap items-center justify-center gap-2 mb-4">
          <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">Marathi</Badge>
          <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">Hindi</Badge>
          <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">English</Badge>
        </div>
        <h2 className="text-3xl md:text-5xl font-bold text-gray-900 mb-4 leading-tight">
          Bridging every village<br />to healthcare
        </h2>
        <p className="text-lg md:text-xl text-gray-600 mb-2">
          One phone call, in one&apos;s own tongue.
        </p>
        <p className="text-xs md:text-sm text-gray-400 max-w-2xl mx-auto mb-8 px-2">
          AI-powered triage for rural India. Dial a number, speak your symptoms,
          get routed to the right care — no smartphone, no typing, no English required.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center px-4">
          <Link 
            href="/demo-call" 
            className={buttonVariants({ size: "lg", className: "bg-emerald-600 hover:bg-emerald-700 text-base px-8 w-full sm:w-auto" })}
          >
            Try the Demo
          </Link>
          <Link 
            href="/login" 
            className={buttonVariants({ size: "lg", variant: "outline", className: "text-base px-8 w-full sm:w-auto" })}
          >
            ASHA / Doctor Login
          </Link>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-4 pb-16">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6 mb-12 md:mb-16">
          <Card className="text-center">
            <CardContent className="p-4 md:p-6">
              <p className="text-2xl md:text-3xl font-bold text-emerald-600">10.4L</p>
              <p className="text-xs md:text-sm text-gray-500 mt-1">ASHA frontline workers</p>
            </CardContent>
          </Card>
          <Card className="text-center">
            <CardContent className="p-4 md:p-6">
              <p className="text-2xl md:text-3xl font-bold text-emerald-600">3</p>
              <p className="text-xs md:text-sm text-gray-500 mt-1">Indian languages supported</p>
            </CardContent>
          </Card>
          <Card className="text-center">
            <CardContent className="p-4 md:p-6">
              <p className="text-2xl md:text-3xl font-bold text-emerald-600">65%+</p>
              <p className="text-xs md:text-sm text-gray-500 mt-1">Rural population underserved</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid sm:grid-cols-3 gap-4 text-left">
          <Card>
            <CardContent className="p-5">
              <p className="text-2xl mb-2">📞</p>
              <h3 className="font-semibold mb-1">Call & Speak</h3>
              <p className="text-sm text-gray-500">
                Dial the toll-free number. Speak in your language — Marathi, Hindi,
                Tamil, and more.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <p className="text-2xl mb-2">🤖</p>
              <h3 className="font-semibold mb-1">AI Triage</h3>
              <p className="text-sm text-gray-500">
                WHO-protocol driven AI asks structured questions. Never diagnoses —
                only classifies urgency.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <p className="text-2xl mb-2">🏥</p>
              <h3 className="font-semibold mb-1">Routed to Care</h3>
              <p className="text-sm text-gray-500">
                ASHA worker, PHC doctor, or emergency services — the right human
                responder gets notified.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      <footer className="border-t py-6 md:py-8 text-center text-xs md:text-sm text-gray-400">
        <p>SwasthyaSetu — AI for Bharat Hackathon 2026 · IIIT Delhi</p>
        <p className="mt-1">Built by Mandar Prakash Macharde · SPIT, Mumbai</p>
      </footer>
    </div>
  );
}
