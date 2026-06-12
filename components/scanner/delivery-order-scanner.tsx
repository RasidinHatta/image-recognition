"use client";

import * as React from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  Download,
  Check,
  ClipboardList,
  FileText,
  Loader2,
  RefreshCcw,
  ScanLine,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

type DeliveryOrderItem = {
  type: string;
  itemCode: string;
  description: string;
  quantity: string;
  uom: string;
  unitPrice: string;
  amount: string;
  remarks: string;
};

type SalesPerson = {
  salesPerson: string;
  poNumber: string;
  contactPerson: string;
  telNumber: string;
  faxNumber: string;
  term: string;
  name: string;
  phoneNumber: string;
  email: string;
  remarks: string;
};

type DeliveryOrderDetails = {
  deliveryOrderNumber: string;
  date: string;
  customerName: string;
  companyName: string;
  deliveryAddress: string;
  email: string;
  contactPerson: string;
  phoneNumber: string;
  referenceNumber: string;
  vehicleNumber: string;
  driverName: string;
  notes: string;
  remark: string;
  totalAmount: string;
  gstAmount: string;
  grandTotal: string;
  salesPersons: SalesPerson[];
  items: DeliveryOrderItem[];
};

type DeliveryOrderResult = {
  deliveryOrder: DeliveryOrderDetails;
  rawText: string;
  confidence: number;
};

const emptyDeliveryOrder: DeliveryOrderDetails = {
  deliveryOrderNumber: "",
  date: "",
  customerName: "",
  companyName: "",
  deliveryAddress: "",
  email: "",
  contactPerson: "",
  phoneNumber: "",
  referenceNumber: "",
  vehicleNumber: "",
  driverName: "",
  notes: "",
  remark: "",
  totalAmount: "",
  gstAmount: "",
  grandTotal: "",
  salesPersons: [],
  items: [],
};

function fileToBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? "");
      resolve(result.split(",")[1] ?? "");
    };
    reader.onerror = () => reject(new Error("Could not read the selected PDF."));
    reader.readAsDataURL(file);
  });
}

export function DeliveryOrderScanner() {
  const { toast } = useToast();
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = React.useState(false);
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const [previewUrl, setPreviewUrl] = React.useState("");
  const [fileName, setFileName] = React.useState("");
  const [rawText, setRawText] = React.useState("");
  const [confidence, setConfidence] = React.useState(0);
  const [deliveryOrder, setDeliveryOrder] =
    React.useState<DeliveryOrderDetails>(emptyDeliveryOrder);

  React.useEffect(() => {
    if (!isProcessing) {
      return;
    }

    const interval = window.setInterval(() => {
      setProgress((current) => (current >= 88 ? current : current + 6));
    }, 430);

    return () => window.clearInterval(interval);
  }, [isProcessing]);

  const updateDeliveryOrder = (
    field: keyof Omit<DeliveryOrderDetails, "items">,
    value: string,
  ) => {
    setDeliveryOrder((current) => ({ ...current, [field]: value }));
  };

  const updateItem = (
    index: number,
    field: keyof DeliveryOrderItem,
    value: string,
  ) => {
    setDeliveryOrder((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item,
      ),
    }));
  };

  const exportCsv = () => {
    const rows = [
      ["Section", "Field", "Value"],
      ["Delivery Order", "DO Number", deliveryOrder.deliveryOrderNumber],
      ["Delivery Order", "Date", deliveryOrder.date],
      ["To", "Company", deliveryOrder.companyName],
      ["To", "Address", deliveryOrder.deliveryAddress],
      ["To", "Email", deliveryOrder.email],
      [],
      ["Sales Person", "P/O No", "Contact Person", "Tel No", "Fax No", "Term"],
      ...deliveryOrder.salesPersons.map((person) => [
        person.salesPerson || person.name,
        person.poNumber,
        person.contactPerson,
        person.telNumber || person.phoneNumber,
        person.faxNumber,
        person.term || person.remarks,
      ]),
      [],
      ["#", "Type", "Description", "Qty", "Unit", "Unit Price (S$)", "Amount (S$)"],
      ...deliveryOrder.items.map((item, index) => [
        String(index + 1),
        getDisplayItemType(deliveryOrder.items, index),
        [item.description, item.itemCode ? `Code: ${item.itemCode}` : "", item.remarks]
          .filter(Boolean)
          .join("\n"),
        item.quantity,
        item.uom,
        item.unitPrice,
        item.amount,
      ]),
      [],
      ["Remark", deliveryOrder.remark],
      ["Total Amount (S$)", deliveryOrder.totalAmount],
      ["9% GST (S$)", deliveryOrder.gstAmount],
      ["Grand Total (S$)", deliveryOrder.grandTotal],
    ];
    const csv = rows
      .map((row) =>
        row
          .map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`)
          .join(","),
      )
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `${deliveryOrder.deliveryOrderNumber || "delivery-order"}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const runRecognition = async (file: File) => {
    if (file.type !== "application/pdf") {
      toast({
        title: "Unsupported file type",
        description: "Upload a PDF delivery order.",
        variant: "error",
      });
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl((current) => {
      if (current) {
        URL.revokeObjectURL(current);
      }
      return objectUrl;
    });
    setFileName(file.name);
    setRawText("");
    setDeliveryOrder(emptyDeliveryOrder);
    setConfidence(0);
    setProgress(12);
    setIsProcessing(true);

    try {
      const pdf = await fileToBase64(file);
      setProgress(35);

      const response = await fetch("/api/delivery-order/recognize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pdf, mimeType: file.type, fileName: file.name }),
      });

      const payload = (await response.json()) as DeliveryOrderResult & {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "The delivery order could not be processed.");
      }

      setProgress(100);
      setRawText(payload.rawText);
      setDeliveryOrder({
        ...emptyDeliveryOrder,
        ...payload.deliveryOrder,
        salesPersons: payload.deliveryOrder?.salesPersons ?? [],
        items: payload.deliveryOrder?.items ?? [],
      });
      setConfidence(payload.confidence);

      toast({
        title: "Delivery order recognized",
        description: "Review the extracted document details and line items.",
      });
    } catch (error) {
      setRawText("");
      setDeliveryOrder(emptyDeliveryOrder);
      setConfidence(0);
      toast({
        title: "Recognition failed",
        description:
          error instanceof Error
            ? error.message
            : "No delivery order information could be detected.",
        variant: "error",
      });
    } finally {
      window.setTimeout(() => {
        setIsProcessing(false);
        setProgress(0);
      }, 650);
    }
  };

  const handleFiles = (files: FileList | null) => {
    const file = files?.[0];

    if (file) {
      void runRecognition(file);
    }
  };

  const handleClear = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setPreviewUrl("");
    setFileName("");
    setRawText("");
    setDeliveryOrder(emptyDeliveryOrder);
    setConfidence(0);
    setProgress(0);
    setIsProcessing(false);

    if (inputRef.current) {
      inputRef.current.value = "";
    }

    toast({
      title: "Workspace cleared",
      description: "Upload another delivery order PDF when ready.",
    });
  };

  const detectedFields = Object.entries(deliveryOrder).filter(([key, value]) => {
    if (key === "items") {
      return deliveryOrder.items.length > 0;
    }

    return String(value).trim();
  }).length;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#e8f3ef,transparent_30rem),linear-gradient(180deg,#f8fafc_0%,#edf1f5_100%)] text-foreground">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 rounded-lg border border-white/70 bg-white/78 px-5 py-4 shadow-sm backdrop-blur md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-md bg-slate-950 text-white shadow-sm">
              <ClipboardList className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Document Intake
              </p>
              <h1 className="text-2xl font-semibold tracking-tight text-slate-950">
                Delivery Order Scanner
              </h1>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/"
              className={buttonVariants({
                variant: "outline",
                size: "sm",
                className: "bg-white/80",
              })}
            >
              <ArrowLeft className="h-4 w-4" />
              Home
            </Link>
            <Badge className="bg-emerald-50 text-emerald-700">
              <Check className="mr-1 h-3.5 w-3.5" />
              OpenRouter LLM
            </Badge>
            <Badge className="bg-slate-100 text-slate-700">PDF</Badge>
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-[minmax(0,0.92fr)_minmax(430px,1.08fr)]">
          <div className="flex flex-col gap-6">
            <Card className="overflow-hidden border-white/80 bg-white/92 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <CardTitle>Upload Delivery Order</CardTitle>
                    <CardDescription>
                      Drop the delivery order PDF or choose it from your device.
                    </CardDescription>
                  </div>
                  {confidence > 0 ? (
                    <Badge className="bg-blue-50 text-blue-700">
                      {confidence}% confidence
                    </Badge>
                  ) : null}
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                <div
                  className={cn(
                    "group flex min-h-44 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50/75 px-6 py-8 text-center transition-all hover:border-slate-950 hover:bg-emerald-50/50",
                    isDragging && "border-slate-950 bg-emerald-50",
                  )}
                  onDragOver={(event) => {
                    event.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(event) => {
                    event.preventDefault();
                    setIsDragging(false);
                    handleFiles(event.dataTransfer.files);
                  }}
                  onClick={() => inputRef.current?.click()}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      inputRef.current?.click();
                    }
                  }}
                >
                  <input
                    ref={inputRef}
                    type="file"
                    accept="application/pdf,.pdf"
                    className="hidden"
                    onChange={(event) => handleFiles(event.target.files)}
                  />
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-md bg-white text-slate-950 shadow-sm ring-1 ring-slate-200 transition-transform group-hover:-translate-y-0.5">
                    <FileText className="h-5 w-5" />
                  </div>
                  <p className="text-sm font-semibold text-slate-950">
                    Drag and drop your delivery order PDF here
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    or click to browse PDF files
                  </p>
                </div>

                {isProcessing ? (
                  <div className="rounded-lg border border-emerald-100 bg-emerald-50/70 p-4">
                    <div className="mb-3 flex items-center justify-between gap-3 text-sm">
                      <span className="flex items-center gap-2 font-medium text-emerald-950">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Reading PDF and extracting delivery details
                      </span>
                      <span className="font-mono text-xs text-emerald-800">
                        {progress}%
                      </span>
                    </div>
                    <Progress value={progress} />
                  </div>
                ) : null}

                {previewUrl ? (
                  <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-950">
                    <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 text-white">
                      <span className="flex min-w-0 items-center gap-2 text-sm">
                        <FileText className="h-4 w-4 shrink-0" />
                        <span className="truncate">{fileName}</span>
                      </span>
                    </div>
                    <iframe
                      src={previewUrl}
                      title="Delivery order PDF preview"
                      className="h-[520px] w-full bg-white"
                    />
                  </div>
                ) : null}
              </CardContent>
            </Card>

            <Card className="border-white/80 bg-white/90 shadow-sm">
              <CardHeader>
                <CardTitle>Recognition Output</CardTitle>
                <CardDescription>
                  Compare the raw OCR text with extracted delivery order fields.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Metric label="Detected fields" value={String(detectedFields)} />
                  <Metric
                    label="Line items"
                    value={String(deliveryOrder.items.length)}
                  />
                </div>
                <Textarea
                  value={rawText}
                  readOnly
                  placeholder="Raw delivery order text will appear after recognition."
                  className="min-h-52 resize-y bg-slate-50 font-mono text-xs leading-5"
                />
              </CardContent>
            </Card>
          </div>

          <Card className="border-white/80 bg-white/95 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle>Review Delivery Order</CardTitle>
                  <CardDescription>
                    Review only the recipient, sales person table, and item table.
                  </CardDescription>
                </div>
                <Badge className="bg-slate-100 text-slate-700">
                  <ScanLine className="mr-1 h-3.5 w-3.5" />
                  Review
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  id="deliveryOrderNumber"
                  label="DO number"
                  value={deliveryOrder.deliveryOrderNumber}
                  onChange={(value) => updateDeliveryOrder("deliveryOrderNumber", value)}
                />
                <Field
                  id="date"
                  label="Date"
                  value={deliveryOrder.date}
                  onChange={(value) => updateDeliveryOrder("date", value)}
                />
                <Field
                  id="companyName"
                  label="To company"
                  value={deliveryOrder.companyName}
                  onChange={(value) => updateDeliveryOrder("companyName", value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="deliveryAddress">Delivery address</Label>
                <Textarea
                  id="deliveryAddress"
                  value={deliveryOrder.deliveryAddress}
                  onChange={(event) =>
                    updateDeliveryOrder("deliveryAddress", event.target.value)
                  }
                  placeholder="Delivery address"
                  className="min-h-24"
                />
              </div>

              <Field
                id="email"
                label="Email"
                value={deliveryOrder.email}
                onChange={(value) => updateDeliveryOrder("email", value)}
              />

              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <Label>Sales person table</Label>
                  <Badge className="bg-slate-100 text-slate-700">
                    {deliveryOrder.salesPersons.length} rows
                  </Badge>
                </div>
                <div className="overflow-x-auto rounded-lg border border-slate-200">
                  <div className="grid min-w-[760px] grid-cols-[0.9fr_1.35fr_1.45fr_0.95fr_0.8fr_1.15fr] bg-slate-100 px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                    <span>Sales Person</span>
                    <span>P/O No</span>
                    <span>Contact Person</span>
                    <span>Tel No</span>
                    <span>Fax No</span>
                    <span>Term</span>
                  </div>
                  {deliveryOrder.salesPersons.length > 0 ? (
                    deliveryOrder.salesPersons.map((person, index) => (
                      <div
                        key={`${person.salesPerson || person.name}-${index}`}
                        className="grid min-w-[760px] grid-cols-[0.9fr_1.35fr_1.45fr_0.95fr_0.8fr_1.15fr] gap-3 border-t border-slate-200 px-3 py-3 text-sm"
                      >
                        <span className="font-medium text-slate-950">
                          {person.salesPerson || person.name || "-"}
                        </span>
                        <span className="whitespace-pre-wrap break-words font-medium text-red-600">
                          {person.poNumber || "-"}
                        </span>
                        <span className="break-words">{person.contactPerson || "-"}</span>
                        <span className="break-words">
                          {person.telNumber || person.phoneNumber || "-"}
                        </span>
                        <span className="break-words">{person.faxNumber || "-"}</span>
                        <span className="break-words">
                          {person.term ||
                            [person.email, person.remarks].filter(Boolean).join(" | ") ||
                            "-"}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="flex gap-2 p-4 text-sm text-muted-foreground">
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                      Sales person rows will appear if the PDF contains that table.
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <Label>
                    Delivery Order {deliveryOrder.deliveryOrderNumber || ""} - Item List
                  </Label>
                  <Badge className="bg-slate-100 text-slate-700">
                    {deliveryOrder.items.length} rows
                  </Badge>
                </div>
                <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
                  <Table className="min-w-[920px]">
                    <TableHeader className="bg-slate-100">
                      <TableRow className="hover:bg-slate-100">
                        <TableHead className="w-14">#</TableHead>
                        <TableHead className="w-44">Type</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="w-20 text-right">Qty</TableHead>
                        <TableHead className="w-24 text-center">Unit</TableHead>
                        <TableHead className="w-36 text-right">
                          Unit Price (S$)
                        </TableHead>
                        <TableHead className="w-36 text-right">Amount (S$)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {deliveryOrder.items.length > 0 ? (
                        deliveryOrder.items.map((item, index) => {
                          const itemType = getDisplayItemType(
                            deliveryOrder.items,
                            index,
                          );

                          return (
                          <TableRow key={`${item.description}-${index}`}>
                            <TableCell className="font-semibold text-slate-500">
                              {index + 1}
                            </TableCell>
                            <TableCell>
                              <span
                                className={cn(
                                  "inline-flex rounded-md px-3 py-1.5 font-medium",
                                  getItemTypeClass(itemType),
                                )}
                              >
                                {itemType || "-"}
                              </span>
                            </TableCell>
                            <TableCell className="min-w-80 whitespace-pre-line font-medium leading-6 text-slate-950">
                              <button
                                type="button"
                                className="text-left"
                                onClick={() => {
                                  const next = window.prompt(
                                    "Edit item description",
                                    item.description,
                                  );

                                  if (next !== null) {
                                    updateItem(index, "description", next);
                                  }
                                }}
                              >
                                {item.description || "-"}
                              </button>
                              {item.itemCode ? (
                                <span className="block text-xs font-normal text-slate-500">
                                  Code: {item.itemCode}
                                </span>
                              ) : null}
                              {item.remarks ? (
                                <span className="block text-xs font-normal text-slate-500">
                                  {item.remarks}
                                </span>
                              ) : null}
                            </TableCell>
                            <TableCell className="text-right font-semibold">
                              <button
                                type="button"
                                onClick={() => {
                                  const next = window.prompt(
                                    "Edit quantity",
                                    item.quantity,
                                  );

                                  if (next !== null) {
                                    updateItem(index, "quantity", next);
                                  }
                                }}
                              >
                                {item.quantity || "-"}
                              </button>
                            </TableCell>
                            <TableCell className="text-center font-semibold">
                              {item.uom || "-"}
                            </TableCell>
                            <TableCell className="text-right font-semibold">
                              {item.unitPrice || "-"}
                            </TableCell>
                            <TableCell className="text-right font-semibold">
                              {item.amount || "-"}
                            </TableCell>
                          </TableRow>
                          );
                        })
                      ) : (
                        <TableRow>
                          <TableCell
                            colSpan={7}
                            className="h-24 text-muted-foreground"
                          >
                            <span className="flex items-center gap-2">
                              <AlertCircle className="h-4 w-4 shrink-0" />
                              Line items will appear after scanning a delivery
                              order PDF.
                            </span>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                    <TableFooter>
                      <TableRow>
                        <TableCell colSpan={6} className="text-right">
                          Total Amount (S$)
                        </TableCell>
                        <TableCell className="text-right">
                          {deliveryOrder.totalAmount || "-"}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell colSpan={6} className="text-right">
                          9% GST (S$)
                        </TableCell>
                        <TableCell className="text-right">
                          {deliveryOrder.gstAmount || "-"}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell colSpan={6} className="text-right">
                          Grand Total (S$)
                        </TableCell>
                        <TableCell className="text-right">
                          {deliveryOrder.grandTotal || "-"}
                        </TableCell>
                      </TableRow>
                    </TableFooter>
                  </Table>
                </div>
              </div>

              {deliveryOrder.remark ? (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">
                  <span className="font-semibold text-slate-950">RMK: </span>
                  <span className="text-slate-700">{deliveryOrder.remark}</span>
                </div>
              ) : null}

              <Separator />

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClear}
                  disabled={!previewUrl && detectedFields === 0}
                >
                  <RefreshCcw className="h-4 w-4" />
                  Clear / Upload Another
                </Button>
                <Button
                  type="button"
                  onClick={exportCsv}
                  disabled={detectedFields === 0}
                >
                  <Download className="h-4 w-4" />
                  Export CSV
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 text-xl font-semibold text-slate-950">{value}</p>
    </div>
  );
}

function getItemTypeClass(type: string) {
  const normalized = type.toLowerCase();

  if (normalized.includes("service")) {
    return "bg-emerald-50 text-emerald-900";
  }

  if (normalized.includes("maintenance")) {
    return "bg-amber-50 text-amber-900";
  }

  if (normalized.includes("dismantle")) {
    return "bg-red-50 text-red-900";
  }

  return "bg-blue-50 text-blue-900";
}

function getDisplayItemType(items: DeliveryOrderItem[], index: number) {
  for (let current = index; current >= 0; current -= 1) {
    const type = items[current]?.type?.trim();

    if (type) {
      return type;
    }
  }

  return "";
}
