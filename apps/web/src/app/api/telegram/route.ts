import { or, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { authUser } from "@/lib/db/schema/auth";
import { extractContactFromText } from "@/lib/ai/contact-extraction";
import { answerSearchQuery } from "@/lib/ai/search";
import { createContact } from "@/lib/repo/contacts";
import { addNote } from "@/lib/repo/notes";
import { upsertEmbedding } from "@/lib/repo/embeddings";
import {
  TELEGRAM_HELP,
  isAllowedChat,
  sendTelegramMessage,
  telegramEnabled,
  verifyTelegramSecret,
} from "@/lib/telegram";

interface TelegramUpdate {
  message?: {
    chat?: { id?: number };
    text?: string;
  };
}

/**
 * Telegram is owner-only (one bot per deployment) — resolve the instance
 * owner's account once and use it for the AI calls' per-user metering.
 * Per-user Telegram linking (multiple accounts, one bot) is out of scope.
 */
let cachedOwnerId: string | null | undefined;

async function resolveOwnerUserId(): Promise<string | null> {
  if (cachedOwnerId !== undefined) return cachedOwnerId;
  const db = await getDb();
  const ownerEmail = process.env.DHAGA_OWNER_EMAIL;
  const [owner] = await db
    .select({ id: authUser.id })
    .from(authUser)
    .where(
      ownerEmail
        ? or(eq(authUser.isAdmin, true), eq(authUser.email, ownerEmail))
        : eq(authUser.isAdmin, true),
    )
    .limit(1);
  cachedOwnerId = owner?.id ?? null;
  return cachedOwnerId;
}

/**
 * Telegram webhook (docs/ideas.md #6). Auth is layered: the setWebhook secret
 * header proves the request came from Telegram, and the chat-id allowlist
 * proves it's the owner. Always answers 200 so Telegram doesn't retry.
 */
export async function POST(request: Request): Promise<Response> {
  if (!telegramEnabled()) {
    return Response.json({ error: "Telegram not configured." }, { status: 404 });
  }
  if (!verifyTelegramSecret(request.headers.get("x-telegram-bot-api-secret-token"))) {
    return Response.json({ error: "Bad secret." }, { status: 401 });
  }

  let update: TelegramUpdate;
  try {
    update = (await request.json()) as TelegramUpdate;
  } catch {
    return Response.json({ ok: true });
  }
  const chatId = update.message?.chat?.id;
  const text = update.message?.text?.trim() ?? "";
  if (chatId == null || !text) return Response.json({ ok: true });
  if (!isAllowedChat(chatId)) return Response.json({ ok: true });

  const ownerId = await resolveOwnerUserId();
  if (!ownerId) {
    await sendTelegramMessage(chatId, "No Dhaga account is set up as the owner yet.");
    return Response.json({ ok: true });
  }
  await handleMessage(ownerId, chatId, text);
  return Response.json({ ok: true });
}

async function handleMessage(ownerId: string, chatId: number, text: string): Promise<void> {
  if (text.startsWith("/start") || text.startsWith("/help")) {
    await sendTelegramMessage(chatId, TELEGRAM_HELP);
    return;
  }

  if (text.startsWith("?")) {
    const query = text.slice(1).trim();
    if (!query) {
      await sendTelegramMessage(chatId, "Ask something after the ? — e.g. ?who did I meet in fintech");
      return;
    }
    const result = await answerSearchQuery(ownerId, query);
    await sendTelegramMessage(chatId, result.answer ?? result.notice ?? "No answer.");
    return;
  }

  const extraction = await extractContactFromText(ownerId, text);
  if (!extraction.contact.name.trim()) {
    await sendTelegramMessage(
      chatId,
      "Couldn't find a person in that. Send their details (name, title, email…) or ask with a leading ?",
    );
    return;
  }
  const id = await createContact(extraction.contact, "quick_add");
  const noteId = await addNote(id, "capture_source", text);
  await upsertEmbedding("note", noteId, id, text);
  const parts = [
    `Saved <b>${extraction.contact.name}</b>`,
    extraction.contact.company ? ` (${extraction.contact.company})` : "",
    extraction.via === "heuristic" ? " — parsed offline, review the fields" : "",
    ".",
  ];
  await sendTelegramMessage(chatId, parts.join(""));
}
