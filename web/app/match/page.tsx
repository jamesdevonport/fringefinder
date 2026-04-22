"use client";

import { forwardRef, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { EventCard } from "@/components/EventCard";
import { Squiggle } from "@/components/Squiggle";
import type { EventSearch } from "@/lib/types";

type RankedPick = {
  slug: string;
  reason: string;
  event: EventSearch & { hero_image: string | null };
};

type Message =
  | { id: string; role: "user"; content: string }
  | {
      id: string;
      role: "assistant";
      content: string;
      picks?: RankedPick[];
      loading?: boolean;
      error?: string;
    };

const WELCOME =
  "Hi! Tell me what kind of night you're after — who's with you, the vibe, budget, anything. I'll read all 838 shows and pull out a few that fit.";

const SUGGESTIONS = [
  "A date-night belly laugh",
  "Something quietly beautiful, under £15",
  "Weird and experimental, late night",
  "Family-friendly matinee",
  "Free theatre I can wander into",
  "A hidden gem that'll surprise me",
];

export default function MatchPage() {
  const [messages, setMessages] = useState<Message[]>([
    { id: "welcome", role: "assistant", content: WELCOME },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  async function send(raw: string) {
    const text = raw.trim();
    if (!text || sending) return;

    const userMsg: Message = { id: genId(), role: "user", content: text };
    const loadingMsg: Message = {
      id: genId(),
      role: "assistant",
      content: "",
      loading: true,
    };
    const appended = [...messages, userMsg, loadingMsg];
    setMessages(appended);
    setInput("");
    setSending(true);

    try {
      const history = appended
        .filter((m) => !("loading" in m && m.loading))
        .map((m) => ({ role: m.role, content: m.content }));
      const res = await fetch("/api/match", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: history }),
      });
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(
          `Server replied ${res.status}${body ? `: ${body.slice(0, 140)}` : ""}`,
        );
      }
      const data = (await res.json()) as {
        stage: string;
        reply: string;
        picks: RankedPick[];
      };
      setMessages((prev) =>
        prev.map((m) =>
          m.id === loadingMsg.id
            ? {
                id: loadingMsg.id,
                role: "assistant",
                content: data.reply || "Here's what I'd try:",
                picks: data.picks,
              }
            : m,
        ),
      );
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "Something went squiffy.";
      setMessages((prev) =>
        prev.map((m) =>
          m.id === loadingMsg.id
            ? {
                id: loadingMsg.id,
                role: "assistant",
                content: "",
                error: message,
              }
            : m,
        ),
      );
    } finally {
      setSending(false);
      // return focus for the next turn
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  }

  function reset() {
    setMessages([{ id: "welcome", role: "assistant", content: WELCOME }]);
    setInput("");
  }

  const hasUserTurn = messages.some((m) => m.role === "user");

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-10 pb-32">
      <header className="mb-8 text-center">
        <p
          className="text-xs uppercase tracking-[0.28em] font-bold"
          style={{ color: "var(--color-purple)" }}
        >
          Chat with the matchmaker
        </p>
        <h1
          className="font-display text-4xl sm:text-5xl mt-2"
          style={{ fontWeight: 800, letterSpacing: "-0.035em" }}
        >
          What&apos;s the night looking like?
        </h1>
        <div className="mt-3 flex justify-center">
          <Squiggle width={180} height={12} color="var(--color-coral)" />
        </div>
      </header>

      <div className="flex flex-col gap-5">
        <AnimatePresence initial={false}>
          {messages.map((msg) =>
            msg.role === "user" ? (
              <UserBubble key={msg.id} text={msg.content} />
            ) : (
              <AssistantBubble key={msg.id} msg={msg} />
            ),
          )}
        </AnimatePresence>

        {!hasUserTurn && (
          <SuggestionStickers
            onPick={(s) => {
              setInput(s);
              send(s);
            }}
          />
        )}

        {hasUserTurn && !sending && (
          <div className="flex justify-center pt-2">
            <button onClick={reset} className="chip">
              ↺ Start a fresh chat
            </button>
          </div>
        )}

        <div ref={endRef} />
      </div>

      <Composer
        ref={textareaRef}
        value={input}
        onChange={setInput}
        onSend={() => send(input)}
        disabled={sending}
      />
    </div>
  );
}

/* ---------- bubbles ---------- */

function UserBubble({ text }: { text: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.22 }}
      className="flex justify-end"
    >
      <div
        className="max-w-[80%] rounded-3xl border-2 border-ink px-5 py-3 text-[0.98rem] leading-snug"
        style={{
          background: "var(--color-coral)",
          color: "white",
          boxShadow: "3px 3px 0 var(--color-ink)",
          borderBottomRightRadius: 6,
        }}
      >
        {text}
      </div>
    </motion.div>
  );
}

function AssistantBubble({
  msg,
}: {
  msg: Extract<Message, { role: "assistant" }>;
}) {
  if (msg.loading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="flex items-start gap-3"
      >
        <Avatar />
        <div
          className="rounded-3xl border-2 border-ink px-5 py-4"
          style={{
            background: "white",
            boxShadow: "3px 3px 0 var(--color-ink)",
            borderBottomLeftRadius: 6,
          }}
        >
          <TypingDots />
          <p className="text-xs ink-soft mt-2 italic">
            Reading 838 show blurbs…
          </p>
        </div>
      </motion.div>
    );
  }

  if (msg.error) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="flex items-start gap-3"
      >
        <Avatar />
        <div className="card card--coral p-4 max-w-[88%]">
          <p className="font-display text-lg mb-1">Bother.</p>
          <p className="text-sm opacity-90">{msg.error}</p>
          <p className="text-sm opacity-80 mt-2">
            The AI might not be reachable here.{" "}
            <Link
              href="/browse/"
              className="underline underline-offset-2 font-semibold"
            >
              Browse instead →
            </Link>
          </p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22 }}
      className="flex items-start gap-3"
    >
      <Avatar />
      <div className="flex-1 min-w-0">
        {msg.content && (
          <div
            className="rounded-3xl border-2 border-ink px-5 py-3 text-[0.98rem] leading-snug inline-block max-w-[88%]"
            style={{
              background: "white",
              boxShadow: "3px 3px 0 var(--color-ink)",
              borderBottomLeftRadius: 6,
            }}
          >
            {msg.content}
          </div>
        )}
        {msg.picks && msg.picks.length > 0 && (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {msg.picks.map((p, i) => (
              <PickCard key={p.slug} pick={p} index={i} />
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

function PickCard({ pick, index }: { pick: RankedPick; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, delay: Math.min(index * 0.05, 0.4) }}
      className="flex flex-col gap-2"
    >
      <div
        className="rounded-2xl border-2 border-ink p-3 flex items-start gap-2"
        style={{
          background: "var(--color-lilac-soft)",
          boxShadow: "2px 2px 0 var(--color-ink)",
        }}
      >
        <span
          className="font-display text-2xl leading-none shrink-0"
          style={{ color: "var(--color-purple)" }}
        >
          {index + 1}
        </span>
        <p className="text-sm italic leading-snug">&ldquo;{pick.reason}&rdquo;</p>
      </div>
      <EventCard event={pick.event} />
    </motion.div>
  );
}

function Avatar() {
  return (
    <div
      className="w-10 h-10 shrink-0 rounded-full border-2 border-ink flex items-center justify-center font-display"
      style={{
        background: "var(--color-purple-hot)",
        color: "white",
        boxShadow: "2px 2px 0 var(--color-ink)",
        fontWeight: 800,
        fontSize: "1.1rem",
      }}
      aria-hidden="true"
    >
      ✦
    </div>
  );
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1.5 h-5">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="w-2.5 h-2.5 rounded-full"
          style={{ background: "var(--color-purple)" }}
          animate={{ y: [0, -4, 0] }}
          transition={{
            duration: 0.9,
            repeat: Infinity,
            delay: i * 0.12,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

/* ---------- suggestions ---------- */

function SuggestionStickers({ onPick }: { onPick: (s: string) => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.15 }}
      className="pl-[3.25rem]"
    >
      <p className="text-xs uppercase tracking-[0.2em] font-bold ink-soft mb-3">
        Or tap an idea →
      </p>
      <div className="flex flex-wrap gap-2">
        {SUGGESTIONS.map((s, i) => (
          <button
            key={s}
            onClick={() => onPick(s)}
            className="sticker"
            style={{
              background: i % 2 === 0 ? "white" : "var(--color-butter)",
            }}
          >
            {s}
          </button>
        ))}
      </div>
    </motion.div>
  );
}

/* ---------- composer ---------- */

type ComposerProps = {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  disabled: boolean;
};

const Composer = forwardRef<HTMLTextAreaElement, ComposerProps>(function Composer(
  { value, onChange, onSend, disabled },
  ref,
) {
  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!disabled) onSend();
    }
  }

  return (
    <div className="fixed bottom-0 inset-x-0 z-20 pointer-events-none">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 pb-5 pointer-events-auto">
        <div
          className="flex items-end gap-2 rounded-[26px] border-2 border-ink bg-white p-2"
          style={{ boxShadow: "4px 4px 0 var(--color-ink)" }}
        >
          <textarea
            ref={ref}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKey}
            rows={1}
            placeholder="Tell me the vibe…"
            disabled={disabled}
            className="flex-1 resize-none bg-transparent outline-none px-3 py-2 text-[1rem] leading-snug min-h-[44px] max-h-[160px]"
            style={{ fontFamily: "var(--font-sans)" }}
          />
          <button
            onClick={onSend}
            disabled={disabled || !value.trim()}
            className="btn btn--purple shrink-0"
            style={{
              padding: "0.7rem 1.1rem",
              opacity: disabled || !value.trim() ? 0.5 : 1,
            }}
            aria-label="Send"
          >
            {disabled ? "…" : "Send ✦"}
          </button>
        </div>
        <p className="text-[11px] ink-soft text-center mt-2">
          Enter to send · Shift+Enter for a new line
        </p>
      </div>
    </div>
  );
});

/* ---------- utils ---------- */

function genId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
}
