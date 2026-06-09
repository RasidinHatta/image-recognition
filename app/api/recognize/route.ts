import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

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

function extractJson(content: string): RecognitionResult {
  const cleaned = content
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();

  try {
    return JSON.parse(cleaned) as RecognitionResult;
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) {
      throw new Error("The vision model did not return JSON.");
    }

    return JSON.parse(match[0]) as RecognitionResult;
  }
}

function normalizeResult(result: RecognitionResult): RecognitionResult {
  return {
    contact: {
      ...emptyContact,
      ...(result.contact ?? {}),
    },
    rawText: result.rawText ?? "",
    confidence: Math.min(Math.max(Number(result.confidence ?? 0), 0), 100),
  };
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.OPENROUTER_API_KEY ?? process.env.API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "OpenRouter API key is missing. Add API_KEY or OPENROUTER_API_KEY to .env.",
      },
      { status: 500 },
    );
  }

  const { image, mimeType } = (await request.json()) as {
    image?: string;
    mimeType?: string;
  };

  if (!image || !mimeType?.startsWith("image/")) {
    return NextResponse.json(
      { error: "A valid business card image is required." },
      { status: 400 },
    );
  }

  const model = process.env.OPENROUTER_MODEL ?? "google/gemini-2.5-flash";

  const prompt = `You are a precise business card OCR and contact extraction engine.
Return only valid JSON with this exact TypeScript shape:
{
  "contact": {
    "fullName": "",
    "companyName": "",
    "jobTitle": "",
    "phoneNumber": "",
    "email": "",
    "website": "",
    "address": "",
    "notes": ""
  },
  "rawText": "",
  "confidence": 0
}

Rules:
- Transcribe all visible text into rawText.
- Extract the most likely person name, company, title, phone, email, website, and address.
- If there are multiple direct phone/mobile/Tel numbers, join them with commas and preserve labels/country/area codes, for example "(MY):012-788 3383, (SG):(65) 9088 4767, (65)-63964767, (607)-3889903".
- Do not put fax numbers in phoneNumber; put fax numbers in notes.
- If there are multiple office addresses, include them in address with line breaks.
- Use notes for extra details like registration numbers, alternate names, QR presence, or uncertain fields.
- Use empty strings for missing fields.
- confidence must be an integer from 0 to 100.`;

  try {
    const openRouterResponse = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "http://localhost:3000",
          "X-Title": "Business Card Scanner",
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: prompt },
                {
                  type: "image_url",
                  image_url: {
                    url: `data:${mimeType};base64,${image}`,
                  },
                },
              ],
            },
          ],
          temperature: 0.1,
          max_tokens: 1200,
          response_format: { type: "json_object" },
        }),
      },
    );

    const payload = await openRouterResponse.json();

    if (!openRouterResponse.ok) {
      return NextResponse.json(
        {
          error:
            payload?.error?.message ??
            "OpenRouter could not process the business card.",
        },
        { status: openRouterResponse.status },
      );
    }

    const content = payload?.choices?.[0]?.message?.content;

    if (!content || typeof content !== "string") {
      return NextResponse.json(
        { error: "No recognizable text was returned by the vision model." },
        { status: 422 },
      );
    }

    const result = normalizeResult(extractJson(content));
    const detectedFields = Object.values(result.contact).filter(Boolean).length;

    if (!result.rawText.trim() && detectedFields === 0) {
      return NextResponse.json(
        { error: "No business card information could be detected." },
        { status: 422 },
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "The card could not be processed.",
      },
      { status: 500 },
    );
  }
}
