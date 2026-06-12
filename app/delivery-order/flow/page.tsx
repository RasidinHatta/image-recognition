import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  BrainCircuit,
  ClipboardList,
  Database,
  FileText,
  MonitorSmartphone,
  ServerCog,
} from "lucide-react";

const frontendSteps = [
  ["Upload", "User selects delivery order PDF"],
  ["Check", "Validate PDF file type"],
  ["Preview", "Show PDF + progress"],
  ["Encode", "Convert PDF to base64"],
  ["Send", "POST to /api/delivery-order/recognize"],
];

const backendSteps = [
  ["Receive", "Next.js API route"],
  ["Validate", "API key + PDF type"],
  ["Prompt", "PDF + DO JSON schema"],
  ["Clean", "Parse LLM JSON"],
  ["Normalize", "Filter RMK + fill item types"],
];

const outputSteps = [
  ["TO", "Show recipient company, address, email"],
  ["Sales", "Show sales person table"],
  ["Items", "Show item table + RMK + totals"],
  ["Export", "Download reviewed result as CSV"],
];

function Step({
  index,
  title,
  detail,
  tone,
}: {
  index: number;
  title: string;
  detail: string;
  tone: "blue" | "amber" | "violet" | "green";
}) {
  const tones = {
    blue: "border-blue-200 bg-blue-50 text-blue-950",
    amber: "border-amber-200 bg-amber-50 text-amber-950",
    violet: "border-violet-200 bg-violet-50 text-violet-950",
    green: "border-emerald-200 bg-emerald-50 text-emerald-950",
  };

  return (
    <li
      className={`grid min-h-24 grid-cols-[3.25rem_1fr] items-center gap-4 rounded-lg border px-4 py-3 shadow-sm ${tones[tone]}`}
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-md bg-white/85 font-mono text-lg font-bold shadow-sm">
        {index}
      </span>
      <span>
        <span className="block text-xl font-semibold leading-tight">
          {title}
        </span>
        <span className="mt-1 block text-base leading-snug opacity-75">
          {detail}
        </span>
      </span>
    </li>
  );
}

function FlowArrow({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-2 text-sm font-semibold uppercase tracking-[0.18em] text-slate-500 lg:flex-col lg:px-2 lg:py-0">
      <ArrowRight className="hidden h-7 w-7 lg:block" />
      <span>{label}</span>
      <ArrowRight className="h-7 w-7 lg:hidden" />
    </div>
  );
}

export default function DeliveryOrderFlowPage() {
  return (
    <main className="min-h-screen bg-[linear-gradient(135deg,#f7fbff_0%,#eef5f1_48%,#fff8ed_100%)] text-slate-950">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-5 border-b border-slate-200 pb-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-3xl">
            <p className="text-sm font-bold uppercase tracking-[0.22em] text-slate-500">
              PDF Recognition Flow
            </p>
            <h1 className="mt-3 text-4xl font-semibold leading-none tracking-normal text-slate-950 sm:text-5xl">
              Delivery order to structured tables
            </h1>
            <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-600">
              The browser prepares the PDF. The backend asks the same OpenRouter
              model to extract only the TO section, sales person table, and item
              table.
            </p>
          </div>
          <Link
            href="/delivery-order"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold shadow-sm transition hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Scanner
          </Link>
        </header>

        <section className="grid gap-5 lg:grid-cols-[1fr_auto_1fr_auto_1fr] lg:items-stretch">
          <section className="rounded-lg border border-blue-200 bg-white/80 p-4 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <MonitorSmartphone className="h-7 w-7 text-blue-600" />
              <div>
                <h2 className="text-2xl font-semibold">Frontend</h2>
                <p className="text-sm font-medium text-slate-500">
                  Browser process
                </p>
              </div>
            </div>
            <ol className="grid gap-3">
              {frontendSteps.map(([title, detail], index) => (
                <Step
                  key={title}
                  index={index + 1}
                  title={title}
                  detail={detail}
                  tone="blue"
                />
              ))}
            </ol>
          </section>

          <FlowArrow label="API call" />

          <section className="rounded-lg border border-amber-200 bg-white/80 p-4 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <ServerCog className="h-7 w-7 text-amber-600" />
              <div>
                <h2 className="text-2xl font-semibold">Backend</h2>
                <p className="text-sm font-medium text-slate-500">
                  Next.js route
                </p>
              </div>
            </div>
            <ol className="grid gap-3">
              {backendSteps.map(([title, detail], index) => (
                <Step
                  key={title}
                  index={index + 6}
                  title={title}
                  detail={detail}
                  tone="amber"
                />
              ))}
            </ol>
          </section>

          <FlowArrow label="LLM" />

          <section className="flex flex-col gap-5">
            <section className="rounded-lg border border-violet-200 bg-white/80 p-4 shadow-sm">
              <div className="mb-4 flex items-center gap-3">
                <BrainCircuit className="h-7 w-7 text-violet-600" />
                <div>
                  <h2 className="text-2xl font-semibold">OpenRouter LLM</h2>
                  <p className="text-sm font-medium text-slate-500">
                    PDF extraction
                  </p>
                </div>
              </div>
              <Step
                index={11}
                title="Read PDF"
                detail="Return structured JSON"
                tone="violet"
              />
            </section>

            <section className="rounded-lg border border-emerald-200 bg-white/80 p-4 shadow-sm">
              <div className="mb-4 flex items-center gap-3">
                <Database className="h-7 w-7 text-emerald-600" />
                <div>
                  <h2 className="text-2xl font-semibold">Output</h2>
                  <p className="text-sm font-medium text-slate-500">
                    Reviewed data
                  </p>
                </div>
              </div>
              <ol className="grid gap-3">
                {outputSteps.map(([title, detail], index) => (
                  <Step
                    key={title}
                    index={index + 12}
                    title={title}
                    detail={detail}
                    tone="green"
                  />
                ))}
              </ol>
            </section>
          </section>
        </section>

        <section className="grid gap-4 rounded-lg border border-red-200 bg-red-50 px-5 py-4 text-red-950 shadow-sm md:grid-cols-[auto_1fr] md:items-center">
          <FileText className="h-8 w-8" />
          <div>
            <h2 className="text-xl font-semibold">Error path</h2>
            <p className="text-base leading-7">
              Invalid PDF, API failure, or LLM parse failure returns an error.
              The frontend shows a toast and keeps the user in the review flow.
            </p>
          </div>
        </section>

        <section className="grid gap-4 rounded-lg border border-slate-200 bg-white/80 px-5 py-4 shadow-sm md:grid-cols-[auto_1fr] md:items-center">
          <ClipboardList className="h-8 w-8 text-slate-700" />
          <div>
            <h2 className="text-xl font-semibold">Extraction scope</h2>
            <p className="text-base leading-7 text-slate-600">
              SwiftOCR ignores content after the item table. RMK is shown below
              the item table instead of being treated as an item.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
