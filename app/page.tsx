import Link from "next/link";
import type React from "react";
import {
  ArrowRight,
  BadgeCheck,
  ClipboardList,
  ContactRound,
  FileText,
  ScanLine,
  ShieldCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function Home() {
  return (
    <main className="min-h-screen bg-[linear-gradient(135deg,#f8fafc_0%,#eef5f2_46%,#f4f0e8_100%)] text-slate-950">
      <section className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-5 sm:px-6 lg:px-8">
        <nav className="flex items-center justify-between rounded-lg border border-white/80 bg-white/78 px-4 py-3 shadow-sm backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-slate-950 text-white">
              <ScanLine className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                Document Intake
              </p>
              <p className="font-semibold">SwiftOCR</p>
            </div>
          </div>
          <Badge className="bg-emerald-50 text-emerald-700">
            <ShieldCheck className="mr-1 h-3.5 w-3.5" />
            OpenRouter Vision
          </Badge>
        </nav>

        <div className="grid flex-1 items-center gap-10 py-10 lg:grid-cols-[0.92fr_1.08fr]">
          <div className="max-w-2xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white/72 px-3 py-2 text-sm text-slate-600 shadow-sm">
              <BadgeCheck className="h-4 w-4 text-emerald-600" />
              Scan, review, and structure business documents
            </div>
            <h1 className="text-5xl font-semibold leading-[0.98] tracking-tight text-slate-950 sm:text-6xl lg:text-7xl">
              Capture paper into clean usable data.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">
              Choose a scanner workflow. Business cards become contacts.
              Delivery order PDFs become structured document records ready for
              review.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/business-card"
                className={buttonVariants({ size: "lg" })}
              >
                <ContactRound className="h-4 w-4" />
                Business Card Scanner
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/delivery-order"
                className={buttonVariants({ variant: "outline", size: "lg" })}
              >
                <ClipboardList className="h-4 w-4" />
                Delivery Order Scanner
              </Link>
            </div>
          </div>

          <div className="grid gap-4">
            <ScannerLink
              href="/business-card"
              icon={<ContactRound className="h-6 w-6" />}
              label="Business Card"
              title="Contact recognition"
              description="Upload, take a photo, or auto-scan a card and extract contact details."
              meta="JPG / PNG / WEBP"
            />
            <ScannerLink
              href="/delivery-order"
              icon={<FileText className="h-6 w-6" />}
              label="Delivery Order"
              title="PDF delivery order extraction"
              description="Upload a delivery order PDF and ask the same LLM workflow to structure order fields and line items."
              meta="PDF"
            />
          </div>
        </div>
      </section>
    </main>
  );
}

function ScannerLink({
  href,
  icon,
  label,
  title,
  description,
  meta,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  title: string;
  description: string;
  meta: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group grid gap-5 rounded-lg border border-white/80 bg-white/86 p-6 shadow-[0_18px_50px_rgba(15,23,42,0.08)] transition-all hover:-translate-y-0.5 hover:bg-white",
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-md bg-slate-950 text-white shadow-sm">
          {icon}
        </div>
        <Badge className="bg-slate-100 text-slate-700">{meta}</Badge>
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          {label}
        </p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight">{title}</h2>
        <p className="mt-3 leading-7 text-slate-600">{description}</p>
      </div>
      <span className="inline-flex items-center gap-2 text-sm font-semibold text-slate-950">
        Open scanner
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
      </span>
    </Link>
  );
}
