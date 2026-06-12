import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

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

function extractJson(content: string): DeliveryOrderResult {
  const cleaned = content
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();

  try {
    return JSON.parse(cleaned) as DeliveryOrderResult;
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);

    if (!match) {
      throw new Error("The model did not return JSON.");
    }

    return JSON.parse(match[0]) as DeliveryOrderResult;
  }
}

function normalizeResult(result: DeliveryOrderResult): DeliveryOrderResult {
  let lastType = "";
  const remarkLines: string[] = [];
  const items = Array.isArray(result.deliveryOrder?.items)
    ? result.deliveryOrder.items.flatMap((item) => {
        const rawDescription = item.description?.trim() ?? "";
        const rawType = item.type?.trim() ?? "";
        const isRemark =
          rawType.toLowerCase() === "rmk" ||
          rawType.toLowerCase() === "remark" ||
          rawDescription.toLowerCase().startsWith("*rmk") ||
          rawDescription.toLowerCase().startsWith("rmk");

        if (isRemark) {
          remarkLines.push(
            rawDescription.replace(/^\*?rmk\s*:?\s*/i, "").trim() ||
              item.remarks ||
              "",
          );
          return [];
        }

        const type = item.type?.trim() || lastType;

        if (type) {
          lastType = type;
        }

        return [
          {
            type,
            itemCode: item.itemCode ?? "",
            description: item.description ?? "",
            quantity: item.quantity ?? "",
            uom: item.uom ?? "",
            unitPrice: item.unitPrice ?? "",
            amount: item.amount ?? "",
            remarks: item.remarks ?? "",
          },
        ];
      })
    : [];

  return {
    deliveryOrder: {
      ...emptyDeliveryOrder,
      ...(result.deliveryOrder ?? {}),
      remark: [result.deliveryOrder?.remark, ...remarkLines]
        .filter(Boolean)
        .join("\n"),
      items,
      salesPersons: Array.isArray(result.deliveryOrder?.salesPersons)
        ? result.deliveryOrder.salesPersons.map((person) => ({
            salesPerson: person.salesPerson ?? person.name ?? "",
            poNumber: person.poNumber ?? "",
            contactPerson: person.contactPerson ?? "",
            telNumber: person.telNumber ?? person.phoneNumber ?? "",
            faxNumber: person.faxNumber ?? "",
            term: person.term ?? "",
            name: person.name ?? "",
            phoneNumber: person.phoneNumber ?? "",
            email: person.email ?? "",
            remarks: person.remarks ?? "",
          }))
        : [],
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

  const { pdf, mimeType, fileName } = (await request.json()) as {
    pdf?: string;
    mimeType?: string;
    fileName?: string;
  };

  if (!pdf || mimeType !== "application/pdf") {
    return NextResponse.json(
      { error: "A valid delivery order PDF is required." },
      { status: 400 },
    );
  }

  const model = process.env.OPENROUTER_MODEL ?? "google/gemini-2.5-flash";

  const prompt = `You are a precise delivery order OCR and extraction engine.
Read the attached delivery order PDF and return only valid JSON with this exact TypeScript shape:
{
  "deliveryOrder": {
    "deliveryOrderNumber": "",
    "date": "",
    "customerName": "",
    "companyName": "",
    "deliveryAddress": "",
    "email": "",
    "contactPerson": "",
    "phoneNumber": "",
    "referenceNumber": "",
    "vehicleNumber": "",
    "driverName": "",
    "notes": "",
    "remark": "",
    "totalAmount": "",
    "gstAmount": "",
    "grandTotal": "",
    "salesPersons": [
      {
        "name": "",
        "salesPerson": "",
        "poNumber": "",
        "contactPerson": "",
        "telNumber": "",
        "faxNumber": "",
        "term": "",
        "phoneNumber": "",
        "email": "",
        "remarks": ""
      }
    ],
    "items": [
      {
        "type": "",
        "itemCode": "",
        "description": "",
        "quantity": "",
        "uom": "",
        "unitPrice": "",
        "amount": "",
        "remarks": ""
      }
    ]
  },
  "rawText": "",
  "confidence": 0
}

Rules:
- Only scan these sections:
  1. The recipient / to-whom the delivery order is for.
  2. The sales person table.
  3. The item table.
- Ignore all content after the item table, including signatures, receiving sections, terms, stamps, footers and unrelated notes.
- Transcribe only the allowed sections into rawText.
- Extract delivery order number and date only if they appear before or with the allowed sections.
- For the TO section, extract only the recipient company/name into companyName, the address lines into deliveryAddress, and the visible Email value into email.
- If the Email field is blank, empty, covered, or unreadable, return an empty string for email.
- Do not invent customerName, contactPerson or phoneNumber from the sales table.
- Extract each SALES PERSON table row exactly into salesPersons: SALES PERSON -> salesPerson, P/O NO -> poNumber, CONTACT PERSON -> contactPerson, TEL NO -> telNumber, FAX NO -> faxNumber, TERM -> term.
- Extract all line items in reading order.
- RMK, *RMK, remark, or remarks rows are not item rows. Put their text into remark and do not include them in items.
- Use type for item categories such as Hardware, Service, Maintenance, Dismantle, or the closest visible category.
- If a visible item category spans multiple rows, repeat that category on every affected item row.
- Do not put row numbers like 1, 2, 3, 4 in itemCode. itemCode is only for real SKU/product/reference codes.
- Preserve multi-line descriptions, serial numbers, units, quantities, unit prices, amounts, remarks and uncertain text.
- Extract totalAmount, gstAmount, and grandTotal if visible. Use "-" only if the PDF explicitly shows "-".
- Leave notes empty unless an allowed section has uncertainty.
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
          "X-Title": "SwiftOCR",
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: prompt },
                {
                  type: "file",
                  file: {
                    filename: fileName || "delivery-order.pdf",
                    file_data: `data:application/pdf;base64,${pdf}`,
                  },
                },
              ],
            },
          ],
          temperature: 0.1,
          max_tokens: 2600,
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
            "OpenRouter could not process the delivery order PDF.",
        },
        { status: openRouterResponse.status },
      );
    }

    const content = payload?.choices?.[0]?.message?.content;

    if (!content || typeof content !== "string") {
      return NextResponse.json(
        { error: "No recognizable text was returned by the model." },
        { status: 422 },
      );
    }

    const result = normalizeResult(extractJson(content));
    const detectedFields =
      Object.entries(result.deliveryOrder).filter(([key, value]) =>
        key === "items" ? result.deliveryOrder.items.length > 0 : Boolean(value),
      ).length;

    if (!result.rawText.trim() && detectedFields === 0) {
      return NextResponse.json(
        { error: "No delivery order information could be detected." },
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
            : "The delivery order PDF could not be processed.",
      },
      { status: 500 },
    );
  }
}
