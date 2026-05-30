import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = process.env.GROQ_MODEL ?? 'llama-3.3-70b-versatile';

interface ParsedInvoice {
  clientName: string | null;
  clientEmail: string | null;
  description: string | null;
  amountUSD: number | null;
  dueDate: string | null;
  notes: string | null;
}

export async function POST(req: NextRequest) {
  const key = process.env.GROQ_API_KEY;
  if (!key) {
    return NextResponse.json({ error: 'AI parsing unavailable — GROQ_API_KEY not set' }, { status: 503 });
  }

  let invoiceText: string;
  try {
    const body = await req.json();
    invoiceText = String(body?.invoiceText ?? '').trim();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  if (invoiceText.length < 5) {
    return NextResponse.json({ error: 'Invoice text too short' }, { status: 400 });
  }
  if (invoiceText.length > 8000) {
    return NextResponse.json({ error: 'Invoice text too long (max 8000 chars)' }, { status: 400 });
  }

  const today = new Date().toISOString().split('T')[0];

  const systemPrompt = `You are an invoice parsing assistant for freelancers.
Extract the following fields from the invoice text provided by the user.

RULES:
- If amount is in words (e.g. "three hundred dollars"), convert to number (300)
- If amounts are in non-USD currencies, convert to USD using reasonable rates. MXN: divide by 17. EUR: multiply by 1.1. GBP: multiply by 1.27.
- Include taxes/VAT in the total amount
- dueDate must be YYYY-MM-DD format. If "net 30" or "30 days", calculate from today: ${today}
- If "immediate" or "upon receipt", use today: ${today}
- If a field is not found, return null. Never invent data.
- amountUSD must be a number (not a string)

Respond ONLY with valid JSON. No text before or after. No markdown fences.

{
  "clientName": string | null,
  "clientEmail": string | null,
  "description": string | null,
  "amountUSD": number | null,
  "dueDate": string | null,
  "notes": string | null
}`;

  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), 20_000);

  try {
    const res = await fetch(GROQ_URL, {
      method: 'POST',
      signal: ctrl.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: invoiceText },
        ],
        temperature: 0.1,
        max_tokens: 512,
      }),
    });

    if (!res.ok) {
      return NextResponse.json({ error: 'AI parsing failed — upstream error' }, { status: 502 });
    }

    const json = await res.json();
    const rawText: string = json?.choices?.[0]?.message?.content ?? '';

    const cleaned = rawText
      .replace(/```json\n?/gi, '')
      .replace(/```\n?/g, '')
      .trim();

    let parsed: ParsedInvoice;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      return NextResponse.json(
        { error: 'AI parsing failed — fill fields manually' },
        { status: 422 }
      );
    }

    // Sanitize amountUSD
    if (parsed.amountUSD !== null && typeof parsed.amountUSD !== 'number') {
      parsed.amountUSD = parseFloat(String(parsed.amountUSD).replace(/[^0-9.]/g, '')) || null;
    }

    // Sanitize dueDate
    if (parsed.dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(parsed.dueDate)) {
      parsed.dueDate = null;
    }

    return NextResponse.json(parsed);
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      return NextResponse.json({ error: 'AI parsing timed out — fill fields manually' }, { status: 504 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  } finally {
    clearTimeout(timeout);
  }
}
