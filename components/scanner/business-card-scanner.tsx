"use client";

import * as React from "react";
import Image from "next/image";
import {
  AlertCircle,
  BriefcaseBusiness,
  Check,
  ClipboardCheck,
  FileImage,
  Loader2,
  Mail,
  Phone,
  RefreshCcw,
  Save,
  ScanLine,
  Upload,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

type ContactDetails = {
  fullName: string;
  companyName: string;
  jobTitle: string;
  phoneNumber: string;
  email: string;
  website: string;
  address: string;
  notes: string;
};

type RecognitionResult = {
  contact: ContactDetails;
  rawText: string;
  confidence: number;
};

const emptyContact: ContactDetails = {
  fullName: "",
  companyName: "",
  jobTitle: "",
  phoneNumber: "",
  email: "",
  website: "",
  address: "",
  notes: "",
};

const acceptedTypes = ["image/jpeg", "image/png", "image/webp"];

function fileToBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? "");
      resolve(result.split(",")[1] ?? "");
    };
    reader.onerror = () => reject(new Error("Could not read the selected file."));
    reader.readAsDataURL(file);
  });
}

function validateEmail(value: string) {
  if (!value.trim()) {
    return true;
  }

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function validatePhone(value: string) {
  const entries = value
    .split(/[,\n;]+/)
    .map((entry) => entry.trim())
    .filter(Boolean);

  if (entries.length === 0) {
    return true;
  }

  return entries.every((entry) => {
    const digits = entry.replace(/\D/g, "");
    return digits.length >= 7 && /^[A-Za-z()+\d\s.:-]+$/.test(entry);
  });
}

export function BusinessCardScanner() {
  const { toast } = useToast();
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = React.useState(false);
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const [previewUrl, setPreviewUrl] = React.useState("");
  const [fileName, setFileName] = React.useState("");
  const [rawText, setRawText] = React.useState("");
  const [confidence, setConfidence] = React.useState(0);
  const [contact, setContact] = React.useState<ContactDetails>(emptyContact);
  const [saveDialogOpen, setSaveDialogOpen] = React.useState(false);

  React.useEffect(() => {
    if (!isProcessing) {
      return;
    }

    const interval = window.setInterval(() => {
      setProgress((current) => (current >= 88 ? current : current + 7));
    }, 420);

    return () => window.clearInterval(interval);
  }, [isProcessing]);

  const updateContact = (field: keyof ContactDetails, value: string) => {
    setContact((current) => ({ ...current, [field]: value }));
  };

  const runRecognition = async (file: File) => {
    if (!acceptedTypes.includes(file.type)) {
      toast({
        title: "Unsupported image type",
        description: "Upload a JPG, PNG, or WEBP business card image.",
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
    setContact(emptyContact);
    setConfidence(0);
    setProgress(12);
    setIsProcessing(true);

    try {
      const image = await fileToBase64(file);
      setProgress(34);

      const response = await fetch("/api/recognize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image, mimeType: file.type }),
      });

      const payload = (await response.json()) as RecognitionResult & {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "The card could not be processed.");
      }

      setProgress(100);
      setRawText(payload.rawText);
      setContact({ ...emptyContact, ...payload.contact });
      setConfidence(payload.confidence);

      toast({
        title: "Business card recognized",
        description: "Review the extracted fields before saving the contact.",
      });
    } catch (error) {
      setRawText("");
      setContact(emptyContact);
      setConfidence(0);
      toast({
        title: "Recognition failed",
        description:
          error instanceof Error
            ? error.message
            : "No information could be detected.",
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
    setContact(emptyContact);
    setConfidence(0);
    setProgress(0);
    setIsProcessing(false);

    if (inputRef.current) {
      inputRef.current.value = "";
    }

    toast({
      title: "Workspace cleared",
      description: "Upload another business card when ready.",
    });
  };

  const hasAnyContactData = Object.values(contact).some((value) => value.trim());
  const emailValid = validateEmail(contact.email);
  const phoneValid = validatePhone(contact.phoneNumber);
  const canSave = hasAnyContactData && emailValid && phoneValid && !isProcessing;

  const saveContact = () => {
    if (!canSave) {
      toast({
        title: "Check the contact details",
        description: "Fix invalid email or phone fields before saving.",
        variant: "error",
      });
      return;
    }

    const savedContacts = JSON.parse(
      window.localStorage.getItem("business-card-contacts") ?? "[]",
    ) as ContactDetails[];

    window.localStorage.setItem(
      "business-card-contacts",
      JSON.stringify([{ ...contact, notes: contact.notes }, ...savedContacts]),
    );

    setSaveDialogOpen(true);
    toast({
      title: "Contact saved",
      description: `${contact.fullName || "Contact"} was saved locally.`,
    });
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#e7f0ff,transparent_32rem),linear-gradient(180deg,#f8fafc_0%,#eef2f7_100%)] text-foreground">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 rounded-lg border border-white/70 bg-white/76 px-5 py-4 shadow-sm backdrop-blur md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-sm">
              <ScanLine className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Contact Intake
              </p>
              <h1 className="text-2xl font-semibold tracking-tight text-slate-950">
                Business Card Scanner
              </h1>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="bg-emerald-50 text-emerald-700">
              <Check className="mr-1 h-3.5 w-3.5" />
              OpenRouter Vision
            </Badge>
            <Badge className="bg-slate-100 text-slate-700">
              JPG, PNG, WEBP
            </Badge>
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-[minmax(0,0.96fr)_minmax(380px,1.04fr)]">
          <div className="flex flex-col gap-6">
            <Card className="overflow-hidden border-white/80 bg-white/90 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <CardTitle>Upload Card</CardTitle>
                    <CardDescription>
                      Drop a business card image or choose one from your device.
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
                    "group flex min-h-44 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50/75 px-6 py-8 text-center transition-all hover:border-primary hover:bg-blue-50/50",
                    isDragging && "border-primary bg-blue-50",
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
                    accept={acceptedTypes.join(",")}
                    className="hidden"
                    onChange={(event) => handleFiles(event.target.files)}
                  />
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-md bg-white text-primary shadow-sm ring-1 ring-slate-200 transition-transform group-hover:-translate-y-0.5">
                    <Upload className="h-5 w-5" />
                  </div>
                  <p className="text-sm font-semibold text-slate-950">
                    Drag and drop your business card here
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    or click to browse image files
                  </p>
                </div>

                {isProcessing ? (
                  <div className="rounded-lg border border-blue-100 bg-blue-50/70 p-4">
                    <div className="mb-3 flex items-center justify-between gap-3 text-sm">
                      <span className="flex items-center gap-2 font-medium text-blue-900">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Reading card and structuring details
                      </span>
                      <span className="font-mono text-xs text-blue-700">
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
                        <FileImage className="h-4 w-4 shrink-0" />
                        <span className="truncate">{fileName}</span>
                      </span>
                    </div>
                    <div className="bg-[linear-gradient(45deg,#111827_25%,#0f172a_25%,#0f172a_50%,#111827_50%,#111827_75%,#0f172a_75%)] bg-[length:22px_22px] p-3">
                      <div className="relative mx-auto h-[min(58vw,440px)] min-h-56 w-full overflow-hidden rounded-md shadow-2xl">
                        <Image
                          src={previewUrl}
                          alt="Uploaded business card preview"
                          fill
                          unoptimized
                          sizes="(min-width: 1024px) 46vw, 100vw"
                          className="object-contain"
                        />
                      </div>
                    </div>
                  </div>
                ) : null}
              </CardContent>
            </Card>

            <Card className="border-white/80 bg-white/90 shadow-sm">
              <CardHeader>
                <CardTitle>Recognition Output</CardTitle>
                <CardDescription>
                  Compare the original OCR text with the structured result.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="raw">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="raw">Raw OCR Text</TabsTrigger>
                    <TabsTrigger value="summary">Summary</TabsTrigger>
                  </TabsList>
                  <TabsContent value="raw">
                    <Textarea
                      value={rawText}
                      readOnly
                      placeholder="Raw OCR text will appear after recognition."
                      className="min-h-52 resize-y bg-slate-50 font-mono text-xs leading-5"
                    />
                  </TabsContent>
                  <TabsContent value="summary">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Metric
                        label="Detected fields"
                        value={String(
                          Object.values(contact).filter((value) => value.trim()).length,
                        )}
                      />
                      <Metric
                        label="Review status"
                        value={hasAnyContactData ? "Ready" : "Waiting"}
                      />
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>

          <Card className="border-white/80 bg-white/95 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle>Editable Contact</CardTitle>
                  <CardDescription>
                    Correct the extracted fields before saving.
                  </CardDescription>
                </div>
                <Badge className="bg-slate-100 text-slate-700">
                  <ClipboardCheck className="mr-1 h-3.5 w-3.5" />
                  Review
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  id="fullName"
                  label="Full name"
                  value={contact.fullName}
                  onChange={(value) => updateContact("fullName", value)}
                  icon={<BriefcaseBusiness className="h-4 w-4" />}
                />
                <Field
                  id="companyName"
                  label="Company name"
                  value={contact.companyName}
                  onChange={(value) => updateContact("companyName", value)}
                />
                <Field
                  id="jobTitle"
                  label="Job title"
                  value={contact.jobTitle}
                  onChange={(value) => updateContact("jobTitle", value)}
                />
                <Field
                  id="phoneNumber"
                  label="Phone number"
                  value={contact.phoneNumber}
                  onChange={(value) => updateContact("phoneNumber", value)}
                  error={
                    !phoneValid
                      ? "Enter valid phone numbers separated by commas or new lines."
                      : ""
                  }
                  icon={<Phone className="h-4 w-4" />}
                  multiline
                />
                <Field
                  id="email"
                  label="Email address"
                  value={contact.email}
                  onChange={(value) => updateContact("email", value)}
                  error={!emailValid ? "Enter a valid email address." : ""}
                  icon={<Mail className="h-4 w-4" />}
                />
                <Field
                  id="website"
                  label="Website"
                  value={contact.website}
                  onChange={(value) => updateContact("website", value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Textarea
                  id="address"
                  value={contact.address}
                  onChange={(event) => updateContact("address", event.target.value)}
                  placeholder="Office or mailing address"
                  className="min-h-28"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={contact.notes}
                  onChange={(event) => updateContact("notes", event.target.value)}
                  placeholder="Additional context, alternate numbers, uncertainty, QR code notes"
                  className="min-h-24"
                />
              </div>

              <Separator />

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClear}
                  disabled={!previewUrl && !hasAnyContactData}
                >
                  <RefreshCcw className="h-4 w-4" />
                  Clear / Upload Another
                </Button>
                <Button type="button" onClick={saveContact} disabled={!canSave}>
                  <Save className="h-4 w-4" />
                  Save Contact
                </Button>
              </div>

              {!emailValid || !phoneValid ? (
                <div className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  Fix highlighted fields before saving the contact.
                </div>
              ) : null}
            </CardContent>
          </Card>
        </section>
      </div>

      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogHeader>
          <DialogTitle>Contact saved locally</DialogTitle>
          <DialogDescription>
            The reviewed contact was stored in this browser using localStorage.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-5 rounded-lg border bg-slate-50 p-4 text-sm">
          <p className="font-semibold text-slate-950">
            {contact.fullName || "Unnamed contact"}
          </p>
          <p className="mt-1 text-muted-foreground">
            {[contact.jobTitle, contact.companyName].filter(Boolean).join(", ")}
          </p>
        </div>
        <DialogFooter>
          <Button type="button" onClick={() => setSaveDialogOpen(false)}>
            Done
          </Button>
        </DialogFooter>
      </Dialog>
    </main>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  error,
  icon,
  multiline = false,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  icon?: React.ReactNode;
  multiline?: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        {icon ? (
          <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            {icon}
          </div>
        ) : null}
        {multiline ? (
          <Textarea
            id={id}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            className={cn(
              "min-h-20 resize-y",
              icon && "pl-9",
              error && "border-red-300 ring-red-100",
            )}
            placeholder={label}
          />
        ) : (
          <Input
            id={id}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            className={cn(icon && "pl-9", error && "border-red-300 ring-red-100")}
            placeholder={label}
          />
        )}
      </div>
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
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
