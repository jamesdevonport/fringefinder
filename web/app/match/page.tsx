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
    <div
      className="max-w-4xl mx-auto px-3 sm:px-6 pt-6 sm:pt-10"
      style={{
        paddingBottom: "calc(10rem + env(safe-area-inset-bottom))",
      }}
    >
      <header className="mb-6 sm:mb-8 text-center">
        <p
          className="text-[10px] sm:text-xs uppercase tracking-[0.24em] sm:tracking-[0.28em] font-bold"
          style={{ color: "var(--color-purple)" }}
        >
          Chat with the matchmaker
        </p>
        <h1
          className="font-display text-[2rem] sm:text-5xl mt-2 leading-[1.05]"
          style={{ fontWeight: 800, letterSpacing: "-0.03em" }}
        >
          What&apos;s the night looking like?
        </h1>
        <div className="mt-3 flex justify-center">
          <Squiggle width={140} height={12} color="var(--color-coral)" />
        </div>
      </header>

      <div className="flex flex-col gap-4 sm:gap-5">
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
        className="max-w-[86%] sm:max-w-[80%] rounded-3xl border-2 border-ink px-4 sm:px-5 py-2.5 sm:py-3 text-[0.95rem] sm:text-base leading-snug break-words"
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
        className="flex items-start gap-2 sm:gap-3"
      >
        <Avatar />
        <div
          className="rounded-3xl border-2 border-ink px-4 sm:px-5 py-3 sm:py-4"
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
        className="flex items-start gap-2 sm:gap-3"
      >
        <Avatar />
        <div className="card card--coral p-4 max-w-[90%] min-w-0">
          <p className="font-display text-lg mb-1">Bother.</p>
          <p className="text-sm opacity-90 break-words">{msg.error}</p>
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
      className="flex items-start gap-2 sm:gap-3"
    >
      <Avatar />
      <div className="flex-1 min-w-0">
        {msg.content && (
          <div
            className="rounded-3xl border-2 border-ink px-4 sm:px-5 py-2.5 sm:py-3 text-[0.95rem] sm:text-base leading-snug inline-block max-w-full sm:max-w-[88%] break-words"
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
      className="w-8 h-8 sm:w-10 sm:h-10 shrink-0 rounded-full border-2 border-ink flex items-center justify-center font-display text-base sm:text-lg"
      style={{
        background: "var(--color-purple-hot)",
        color: "white",
        boxShadow: "2px 2px 0 var(--color-ink)",
        fontWeight: 800,
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
      className="pl-0 sm:pl-[3.25rem]"
    >
      <p className="text-[10px] sm:text-xs uppercase tracking-[0.2em] font-bold ink-soft mb-2 sm:mb-3">
        Or tap an idea →
      </p>
      <div className="flex flex-wrap gap-2">
        {SUGGESTIONS.map((s, i) => (
          <button
            key={s}
            onClick={() => onPick(s)}
            className="sticker text-left"
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

  const canSend = !disabled && !!value.trim();
  const footerVisible = useFooterVisible();

  return (
    <div
      className="fixed bottom-0 inset-x-0 z-20 pointer-events-none transition-transform duration-200 ease-out"
      style={{
        paddingBottom: "env(safe-area-inset-bottom)",
        transform: footerVisible ? "translateY(100%)" : "translateY(0)",
      }}
      aria-hidden={footerVisible ? "true" : undefined}
    >
      {/* Fade above the composer so content scrolling behind it doesn't hard-cut */}
      <div
        aria-hidden="true"
        className="h-6 sm:h-8 pointer-events-none"
        style={{
          background:
            "linear-gradient(to top, var(--color-cream), transparent)",
        }}
      />
      <div
        className="max-w-4xl mx-auto px-3 sm:px-6 pb-3 sm:pb-5 pointer-events-auto"
        style={{ background: "var(--color-cream)" }}
      >
        <div
          className="flex items-end gap-2 rounded-[22px] sm:rounded-[26px] border-2 border-ink bg-white p-1.5 sm:p-2"
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
            className="flex-1 resize-none bg-transparent outline-none px-3 py-2 leading-snug min-h-[44px] max-h-[140px]"
            // 16px minimum font-size prevents iOS Safari from auto-zooming on focus
            style={{ fontFamily: "var(--font-sans)", fontSize: "16px" }}
          />
          <button
            onClick={onSend}
            disabled={!canSend}
            className="btn btn--purple shrink-0 px-3 sm:px-4 h-11 sm:h-auto"
            style={{
              opacity: canSend ? 1 : 0.5,
              padding: undefined,
            }}
            aria-label={disabled ? "Sending" : "Send"}
          >
            {disabled ? (
              <span aria-hidden="true">…</span>
            ) : (
              <>
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M4 12l16-8-6 16-3-7-7-1z" />
                </svg>
                <span className="hidden sm:inline">Send</span>
              </>
            )}
          </button>
        </div>
        <p className="text-[11px] ink-soft text-center mt-1.5 sm:mt-2 hidden sm:block">
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

// Slide the composer away when the site footer scrolls into view so it
// doesn't hover over the footer text.
function useFooterVisible(): boolean {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (typeof document === "undefined") return;
    const footer = document.querySelector("footer");
    if (!footer || typeof IntersectionObserver === "undefined") return;
    const obs = new IntersectionObserver(
      (entries) => setVisible(entries[0]?.isIntersecting ?? false),
      { threshold: 0 },
    );
    obs.observe(footer);
    return () => obs.disconnect();
  }, []);
  return visible;
}
