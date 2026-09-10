import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  LockKeyhole,
  Mic,
  Send,
  Square,
  Trash2,
  Upload,
} from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { toast } from "sonner";

import { Wordmark } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useActiveFamily } from "@/hooks/use-active-family";
import { DEFAULT_PROMPT_ID, MEMORY_PROMPTS, findPrompt } from "@/lib/eternal-copy";
import { formatBytes } from "@/lib/file-upload";
import { createInvite } from "@/lib/invites.functions";
import {
  MEMORY_MEANING_MAX,
  MEMORY_RECORDING_MAX_BYTES,
  MEMORY_STORY_MAX,
  MEMORY_TITLE_MAX,
  memoryRecordingPath,
} from "@/lib/memory";
import { createMemory, listMemoryPeople } from "@/lib/memory.functions";
import { cn } from "@/lib/utils";

/**
 * First memory — the protected landing spot behind "Start with one question".
 *
 * Question → answer (text and/or voice) → context → save → success → optional
 * invite. All writes go through server functions that re-check the session
 * and the family membership; the browser never decides which family it is.
 */
export const Route = createFileRoute("/_authenticated/create-memory")({
  validateSearch: (search: Record<string, unknown>): { prompt?: string } => {
    const raw = search["prompt"];
    const prompt = typeof raw === "string" && MEMORY_PROMPTS.some((p) => p.id === raw) ? raw : null;
    return prompt ? { prompt } : {};
  },
  head: () => ({
    meta: [
      { title: "Your first memory — Eternal Memories" },
      {
        name: "description",
        content:
          "Answer one question in writing or in your own voice, add a name, a date and a place, and keep it privately for the people you invite.",
      },
      { property: "og:title", content: "Your first memory — Eternal Memories" },
      {
        property: "og:description",
        content: "Start your family archive with one question.",
      },
    ],
  }),
  component: CreateMemoryPage,
});

const STEPS = ["Question", "Answer", "Context", "Saved"] as const;

const NEW_PERSON = "__new__";
const NO_PERSON = "";

type Recording = { blob: Blob; url: string; mime: string; name: string; source: "mic" | "file" };

export function CreateMemoryPage() {
  const { family, loading } = useActiveFamily();

  if (loading) {
    return (
      <Shell>
        <p className="py-24 text-center text-sm text-muted-foreground" role="status">
          Opening your family archive…
        </p>
      </Shell>
    );
  }

  if (!family) {
    return (
      <Shell>
        <Card className="mx-auto max-w-lg p-6">
          <h1 className="font-display text-2xl font-semibold">First, a family to keep it in</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            A memory always belongs to a family archive. Create yours — it takes a minute — and we
            bring you straight back to your first question.
          </p>
          <Button asChild className="mt-5 min-h-11 w-full">
            <Link to="/setup">
              Set up your family archive <ArrowRight aria-hidden="true" />
            </Link>
          </Button>
        </Card>
      </Shell>
    );
  }

  return (
    <Shell>
      <FirstMemoryFlow familyId={family.id} familyName={family.name} role={family.role} />
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
      >
        Skip to content
      </a>
      <header className="border-b border-border bg-card/90">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-3 px-5 py-3 sm:px-6">
          <Link
            to="/feed"
            className="inline-flex min-h-11 items-center rounded-md text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:text-gold"
            aria-label="Open your family feed"
          >
            <Wordmark />
          </Link>
          <Link
            to="/feed"
            className="ml-auto inline-flex min-h-11 items-center gap-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ArrowLeft className="size-4" aria-hidden="true" /> Open the archive
          </Link>
        </div>
      </header>
      <main id="main-content" tabIndex={-1} className="mx-auto max-w-3xl px-5 py-10 sm:px-6">
        {children}
      </main>
    </div>
  );
}

function FirstMemoryFlow({
  familyId,
  familyName,
  role,
}: {
  familyId: string;
  familyName: string;
  role: "owner" | "steward" | "member" | "viewer";
}) {
  const search = Route.useSearch();
  const queryClient = useQueryClient();
  const save = useServerFn(createMemory);
  const people = useServerFn(listMemoryPeople);
  const invite = useServerFn(createInvite);

  const [step, setStep] = useState(0);
  const [promptId, setPromptId] = useState(search.prompt ?? DEFAULT_PROMPT_ID);
  const prompt = findPrompt(promptId);

  const [title, setTitle] = useState("");
  const [story, setStory] = useState("");
  const [recording, setRecording] = useState<Recording | null>(null);

  const [personChoice, setPersonChoice] = useState<string>(NO_PERSON);
  const [personName, setPersonName] = useState("");
  const [happenedOn, setHappenedOn] = useState("");
  const [place, setPlace] = useState("");
  const [meaning, setMeaning] = useState("");

  const [status, setStatus] = useState("");
  const [saved, setSaved] = useState<{ id: string; title: string } | null>(null);

  const stepHeadingRef = useRef<HTMLHeadingElement | null>(null);
  useEffect(() => {
    stepHeadingRef.current?.focus();
  }, [step]);

  const personsQuery = useQuery({
    queryKey: ["memory-people", familyId],
    queryFn: () => people({ data: { familyId } }),
    enabled: step >= 2,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      let recordingInput: { path: string; mime: string; size: number } | undefined;
      if (recording) {
        setStatus("Uploading your recording…");
        const path = memoryRecordingPath(familyId, crypto.randomUUID(), recording.name);
        const { error } = await supabase.storage
          .from("memories")
          .upload(path, recording.blob, { contentType: recording.mime, upsert: false });
        if (error) throw new Error(error.message);
        recordingInput = { path, mime: recording.mime, size: recording.blob.size };
      }
      setStatus("Saving your memory…");
      const trimmedName = personName.trim();
      return save({
        data: {
          familyId,
          promptId: prompt.id,
          question: prompt.question,
          title: title.trim() || prompt.title,
          story: story.trim(),
          ...(happenedOn ? { happenedOn } : {}),
          ...(place.trim() ? { place: place.trim() } : {}),
          ...(meaning.trim() ? { meaning: meaning.trim() } : {}),
          ...(personChoice && personChoice !== NEW_PERSON ? { personId: personChoice } : {}),
          ...(personChoice === NEW_PERSON && trimmedName ? { personName: trimmedName } : {}),
          ...(recordingInput ? { recording: recordingInput } : {}),
        },
      });
    },
    onSuccess: (result) => {
      setSaved({ id: result.id, title: title.trim() || prompt.title });
      setStatus("Saved. Your first memory is in the archive.");
      setStep(3);
      void queryClient.invalidateQueries({ queryKey: ["memory-people", familyId] });
      void queryClient.invalidateQueries({ queryKey: ["family-overview", familyId] });
    },
    onError: (e: Error) => {
      setStatus("");
      toast.error(e.message);
    },
  });

  const reset = () => {
    setStep(0);
    setTitle("");
    setStory("");
    if (recording) URL.revokeObjectURL(recording.url);
    setRecording(null);
    setPersonChoice(NO_PERSON);
    setPersonName("");
    setHappenedOn("");
    setPlace("");
    setMeaning("");
    setStatus("");
    setSaved(null);
  };

  const canWrite = role !== "viewer";
  const answerReady = story.trim().length > 0;

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary dark:text-gold">
        {familyName}
      </p>
      <h1 className="mt-2 font-display text-3xl font-semibold">Your first memory</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        One question, one answer, a little context. It stays private inside your family archive.
      </p>

      <ol className="mt-6 flex flex-wrap gap-2" aria-label="Progress">
        {STEPS.map((label, i) => (
          <li
            key={label}
            aria-current={i === step ? "step" : undefined}
            className={cn(
              "inline-flex min-h-8 items-center gap-1 rounded-full border px-3 text-xs font-medium",
              i === step
                ? "border-primary bg-primary text-primary-foreground"
                : i < step
                  ? "border-border bg-secondary text-secondary-foreground"
                  : "border-border text-muted-foreground",
            )}
          >
            {i < step ? <Check className="size-3" aria-hidden="true" /> : null}
            {i + 1}. {label}
          </li>
        ))}
      </ol>

      <p className="sr-only" role="status" aria-live="polite">
        {status}
      </p>

      {!canWrite && (
        <p role="alert" className="mt-6 rounded-lg border border-gold/40 bg-gold/10 p-3 text-sm">
          Your role in {familyName} is “viewer”, which can read the archive but not add to it. Ask
          an owner or steward to change your role, and this page will open up.
        </p>
      )}

      {/* Step 1 — question ------------------------------------------------ */}
      {step === 0 && (
        <Card className="mt-6 p-6">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setStep(1);
            }}
          >
            <fieldset>
              <legend>
                <h2
                  ref={stepHeadingRef}
                  tabIndex={-1}
                  className="font-display text-xl font-semibold"
                >
                  Choose a question
                </h2>
              </legend>
              <p className="mt-1 text-sm text-muted-foreground">
                Pick the one that brings a moment to mind. You can always add more later.
              </p>
              <div className="mt-4 grid gap-2">
                {MEMORY_PROMPTS.map((p) => {
                  const selected = p.id === promptId;
                  return (
                    <label
                      key={p.id}
                      className={cn(
                        "flex cursor-pointer items-start gap-3 rounded-lg border p-3 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring",
                        selected ? "border-gold bg-gold/10" : "border-border hover:border-gold/60",
                      )}
                    >
                      <input
                        type="radio"
                        name="prompt"
                        value={p.id}
                        checked={selected}
                        onChange={() => setPromptId(p.id)}
                        className="mt-1 size-4 shrink-0 accent-[var(--gold)]"
                      />
                      <span>
                        <span className="block text-sm font-semibold">{p.title}</span>
                        <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                          {p.question}
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
            <div className="mt-5 flex justify-end">
              <Button type="submit" className="min-h-11" disabled={!canWrite}>
                Answer this question <ArrowRight aria-hidden="true" />
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Step 2 — answer -------------------------------------------------- */}
      {step === 1 && (
        <Card className="mt-6 p-6">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (answerReady) setStep(2);
            }}
          >
            <h2 ref={stepHeadingRef} tabIndex={-1} className="font-display text-xl font-semibold">
              {prompt.question}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Write it the way you would tell it. Or record it in your own voice and add a few
              written lines, so it can be read as well as heard.
            </p>

            <div className="mt-5 space-y-1.5">
              <Label htmlFor="memory-story">Your answer</Label>
              <Textarea
                id="memory-story"
                rows={7}
                maxLength={MEMORY_STORY_MAX}
                required
                value={story}
                onChange={(e) => setStory(e.target.value)}
                placeholder="It was the summer of…"
                aria-describedby="memory-story-hint"
              />
              <p id="memory-story-hint" className="text-xs text-muted-foreground">
                {recording
                  ? "A short written version is required alongside the recording."
                  : `${story.length} / ${MEMORY_STORY_MAX} characters`}
              </p>
            </div>

            <VoiceRecorder recording={recording} onChange={setRecording} />

            <div className="mt-5 space-y-1.5">
              <Label htmlFor="memory-title">Title (optional)</Label>
              <Input
                id="memory-title"
                maxLength={MEMORY_TITLE_MAX}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={prompt.title}
              />
            </div>

            <div className="mt-6 flex flex-wrap justify-between gap-3">
              <Button
                type="button"
                variant="outline"
                className="min-h-11"
                onClick={() => setStep(0)}
              >
                <ArrowLeft aria-hidden="true" /> Back
              </Button>
              <Button type="submit" className="min-h-11" disabled={!answerReady}>
                Add context <ArrowRight aria-hidden="true" />
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Step 3 — context ------------------------------------------------- */}
      {step === 2 && (
        <Card className="mt-6 p-6">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!saveMutation.isPending) saveMutation.mutate();
            }}
          >
            <h2 ref={stepHeadingRef} tabIndex={-1} className="font-display text-xl font-semibold">
              Give it context
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Everything here is optional. A name, a date and a place are what make a memory
              findable in ten years.
            </p>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="memory-person">Who is this memory about?</Label>
                <select
                  id="memory-person"
                  value={personChoice}
                  onChange={(e) => setPersonChoice(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring md:text-sm"
                >
                  <option value={NO_PERSON}>Nobody in particular</option>
                  {(personsQuery.data ?? []).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                  <option value={NEW_PERSON}>Someone not in the tree yet…</option>
                </select>
              </div>
              {personChoice === NEW_PERSON && (
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="memory-person-name">Their name</Label>
                  <Input
                    id="memory-person-name"
                    required
                    maxLength={120}
                    value={personName}
                    onChange={(e) => setPersonName(e.target.value)}
                    placeholder="Helen Johnson"
                    aria-describedby="memory-person-name-hint"
                  />
                  <p id="memory-person-name-hint" className="text-xs text-muted-foreground">
                    They will be added to your family tree with this memory attached.
                  </p>
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="memory-date">When did it happen?</Label>
                <Input
                  id="memory-date"
                  type="date"
                  value={happenedOn}
                  onChange={(e) => setHappenedOn(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="memory-place">Where?</Label>
                <Input
                  id="memory-place"
                  maxLength={120}
                  value={place}
                  onChange={(e) => setPlace(e.target.value)}
                  placeholder="Lake Simcoe, Ontario"
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="memory-meaning">Why does it matter?</Label>
                <Textarea
                  id="memory-meaning"
                  rows={3}
                  maxLength={MEMORY_MEANING_MAX}
                  value={meaning}
                  onChange={(e) => setMeaning(e.target.value)}
                  placeholder="What someone reading this later should understand."
                />
              </div>
            </div>

            <p className="mt-5 flex items-start gap-2 text-xs text-muted-foreground">
              <LockKeyhole className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
              Saved to {familyName} only. Members of your family can read it; nobody else can.
            </p>

            <div className="mt-6 flex flex-wrap justify-between gap-3">
              <Button
                type="button"
                variant="outline"
                className="min-h-11"
                onClick={() => setStep(1)}
              >
                <ArrowLeft aria-hidden="true" /> Back
              </Button>
              <Button
                type="submit"
                className="min-h-11"
                disabled={saveMutation.isPending || !canWrite}
              >
                {saveMutation.isPending ? "Saving…" : "Save this memory"}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Step 4 — saved --------------------------------------------------- */}
      {step === 3 && saved && (
        <div className="mt-6 space-y-6">
          <Card className="p-6 text-center">
            <span className="mx-auto grid size-12 place-items-center rounded-full bg-gold text-gold-foreground">
              <Check className="size-6" aria-hidden="true" />
            </span>
            <p className="mt-4 text-xs font-semibold uppercase tracking-[0.15em] text-primary dark:text-gold">
              First memory complete
            </p>
            <h2
              ref={stepHeadingRef}
              tabIndex={-1}
              className="mt-2 font-display text-2xl font-semibold"
            >
              “{saved.title}” is in your family archive.
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              This is the beginning. Add another memory whenever a moment comes to mind, or invite
              someone from your family when you are ready.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <Button className="min-h-11" onClick={reset}>
                Add another memory <ArrowRight aria-hidden="true" />
              </Button>
              <Button asChild variant="outline" className="min-h-11">
                <Link to="/feed">Open the archive</Link>
              </Button>
              <Button asChild variant="ghost" className="min-h-11">
                <Link to="/tree">See the family tree</Link>
              </Button>
            </div>
          </Card>

          <InviteAfterSuccess
            familyId={familyId}
            familyName={familyName}
            canInvite={role === "owner" || role === "steward"}
            onInvite={(email) => invite({ data: { familyId, email, role: "member" } })}
          />
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Voice recorder                                                              */
/* -------------------------------------------------------------------------- */

function pickMimeType(): string {
  if (typeof MediaRecorder === "undefined") return "";
  for (const candidate of ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"]) {
    if (MediaRecorder.isTypeSupported(candidate)) return candidate;
  }
  return "";
}

function VoiceRecorder({
  recording,
  onChange,
}: {
  recording: Recording | null;
  onChange: (next: Recording | null) => void;
}) {
  const [isRecording, setIsRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const labelId = useId();
  const supportsMic =
    typeof navigator !== "undefined" &&
    !!navigator.mediaDevices?.getUserMedia &&
    typeof MediaRecorder !== "undefined";

  useEffect(() => {
    if (!isRecording) return;
    const timer = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => window.clearInterval(timer);
  }, [isRecording]);

  useEffect(
    () => () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    },
    [],
  );

  const accept = (blob: Blob, mime: string, name: string, source: Recording["source"]) => {
    if (blob.size > MEMORY_RECORDING_MAX_BYTES) {
      setError(
        `That recording is ${formatBytes(blob.size)} — the limit is ${formatBytes(MEMORY_RECORDING_MAX_BYTES)}.`,
      );
      return;
    }
    if (recording) URL.revokeObjectURL(recording.url);
    setError(null);
    onChange({ blob, url: URL.createObjectURL(blob), mime, name, source });
  };

  const start = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = pickMimeType();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        const mime = recorder.mimeType || mimeType || "audio/webm";
        const ext = mime.includes("mp4") ? "m4a" : mime.includes("ogg") ? "ogg" : "webm";
        accept(new Blob(chunksRef.current, { type: mime }), mime, `voice-answer.${ext}`, "mic");
        setIsRecording(false);
      };
      recorderRef.current = recorder;
      streamRef.current = stream;
      setSeconds(0);
      recorder.start();
      setIsRecording(true);
    } catch {
      setError("We could not reach your microphone. You can upload a recording instead.");
    }
  };

  const stop = () => {
    recorderRef.current?.stop();
  };

  const remove = () => {
    if (recording) URL.revokeObjectURL(recording.url);
    onChange(null);
    setSeconds(0);
    if (fileRef.current) fileRef.current.value = "";
  };

  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");

  return (
    <div
      className="mt-5 rounded-lg border border-dashed border-border p-4"
      aria-labelledby={labelId}
    >
      <p id={labelId} className="text-sm font-medium">
        In your own voice (optional)
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        Recordings are kept in private storage and only opened through expiring links.
      </p>

      {recording ? (
        <div className="mt-3 space-y-3">
          <audio
            controls
            src={recording.url}
            className="w-full"
            aria-label="Your recorded answer"
          />
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span>
              {recording.source === "mic" ? "Recorded here" : recording.name} ·{" "}
              {formatBytes(recording.blob.size)}
            </span>
            <Button type="button" variant="ghost" size="sm" className="min-h-9" onClick={remove}>
              <Trash2 aria-hidden="true" /> Remove recording
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {supportsMic &&
            (isRecording ? (
              <Button type="button" variant="destructive" className="min-h-11" onClick={stop}>
                <Square aria-hidden="true" /> Stop recording
                <span className="tabular-nums" aria-live="off">
                  {mm}:{ss}
                </span>
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                className="min-h-11"
                onClick={() => void start()}
              >
                <Mic aria-hidden="true" /> Record an answer
              </Button>
            ))}
          <input
            ref={fileRef}
            id="memory-recording-file"
            type="file"
            accept="audio/*"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) accept(file, file.type || "audio/mpeg", file.name, "file");
            }}
          />
          <Button
            type="button"
            variant="ghost"
            className="min-h-11"
            disabled={isRecording}
            onClick={() => fileRef.current?.click()}
          >
            <Upload aria-hidden="true" /> Upload a recording
          </Button>
          {isRecording && (
            <p className="text-xs text-muted-foreground" role="status">
              Recording… {mm}:{ss}
            </p>
          )}
        </div>
      )}

      {error && (
        <p role="alert" className="mt-3 text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Invite — only offered after the first memory is safely saved                */
/* -------------------------------------------------------------------------- */

function InviteAfterSuccess({
  familyId,
  familyName,
  canInvite,
  onInvite,
}: {
  familyId: string;
  familyName: string;
  canInvite: boolean;
  onInvite: (email: string) => Promise<{ token: string; email: string; reused: boolean }>;
}) {
  const [email, setEmail] = useState("");
  const [links, setLinks] = useState<{ email: string; link: string }[]>([]);

  const mutation = useMutation({
    mutationFn: () => onInvite(email.trim()),
    onSuccess: (result) => {
      const link = `${window.location.origin}/invite/${result.token}`;
      setLinks((prev) => [{ email: result.email, link }, ...prev]);
      setEmail("");
      void navigator.clipboard?.writeText(link).catch(() => undefined);
      toast.success(
        result.reused
          ? "That person already has an open invite — the link is copied again."
          : "Invite created — the link is copied to your clipboard.",
      );
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card className="p-6">
      <h2 className="flex items-center gap-2 font-display text-xl font-semibold">
        <Send className="size-4 text-gold" aria-hidden="true" /> Invite someone, when you are ready
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Nobody is invited automatically. An invitation is bound to one email address, expires on its
        own, and only opens {familyName}.
      </p>
      {canInvite ? (
        <form
          className="mt-4 flex flex-wrap gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate();
          }}
        >
          <Label htmlFor="memory-invite-email" className="sr-only">
            Email address of the relative you want to invite
          </Label>
          <Input
            id="memory-invite-email"
            type="email"
            required
            autoComplete="email"
            placeholder="aunt@example.com"
            className="min-w-52 flex-1"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Button type="submit" className="min-h-11" disabled={mutation.isPending}>
            {mutation.isPending ? "Creating invite…" : "Create invite link"}
          </Button>
        </form>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">
          Owners and stewards of {familyName} can send invitations. You can ask them from the{" "}
          <Link
            to="/members"
            className="font-medium text-primary underline-offset-4 hover:underline dark:text-gold"
          >
            members page
          </Link>
          .
        </p>
      )}
      {links.length > 0 && (
        <ul className="mt-4 space-y-2 text-sm" aria-label="Invites created">
          {links.map((entry) => (
            <li key={entry.link} className="rounded-lg border border-border p-3">
              <span className="font-medium">{entry.email}</span>
              <span className="mt-1 block truncate text-xs text-muted-foreground">
                {entry.link}
              </span>
            </li>
          ))}
        </ul>
      )}
      <p className="sr-only">{familyId}</p>
    </Card>
  );
}
