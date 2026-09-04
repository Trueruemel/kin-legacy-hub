import { create } from "zustand";

import {
  CURRENT_USER_ID,
  chatMessages as seedChatMessages,
  events as seedEvents,
  memories as seedMemories,
  mediaItems as seedMediaItems,
  notifications as seedNotifications,
  userById,
  vaultItems as seedVaultItems,
} from "./mock-data";
import type {
  AppNotification,
  ChatMessage,
  FamilyEvent,
  MediaItem,
  Memory,
  ReactionType,
  VaultItem,
} from "./types";

/* ---------------------------------------------------------------- */
/* Simulated AI — canned results, no network calls                    */
/* ---------------------------------------------------------------- */

const TAG_POOL = [
  ["family gathering", "outdoors", "summer", "three generations"],
  ["portrait", "grandparent", "black and white", "1970s"],
  ["kitchen", "cooking", "hands", "tradition"],
  ["celebration", "candles", "birthday", "children"],
  ["lake", "golden hour", "dock", "siblings"],
  ["archive scan", "letters", "handwriting", "keepsake"],
];

const TRANSCRIPTS = [
  "…and that was the summer the dock finally gave way. Your grandfather stood there in the water laughing, still holding his coffee. I want you to remember that laugh more than anything else.",
  "I'm recording this in the kitchen, the one with the yellow light. You can hear the clock. It has been ticking through every important conversation this family ever had.",
  "We arrived with two suitcases and a photograph. Everything after that — the house, the garden, all of you — came from that morning.",
];

const STORIES = [
  "There is a particular kind of light in these pictures — the late, forgiving kind that falls across kitchen tables and dock boards near the end of a day. Look long enough and the collection stops being a set of photographs and becomes a rhythm: people arriving, people cooking, people staying longer than they meant to.\n\nThe faces change across the years, but the gestures do not. A hand on a shoulder. Someone caught mid-sentence. A child held slightly too tightly by someone who already knows how fast this goes.\n\nWhat this archive really records is not events. It is the ordinary, repeated decision to show up for one another — and the quiet confidence that someone, someday, would want to look back.",
  "Every family keeps two histories: the one it tells and the one it photographs. This collection is the second kind. Nobody posed for posterity here; they were simply present, and the camera happened to be nearby.\n\nThere are tables mid-meal, coats still on, a dog moving too fast for the shutter. There are older frames, softened by time, where the clothing dates the year better than any caption could.\n\nRead together, they say something simple and unfashionable: that a life is mostly made of afternoons, and that afternoons are worth keeping.",
];

const pick = <T,>(list: T[]): T => list[Math.floor(Math.random() * list.length)]!;
const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

type Rsvp = "going" | "maybe" | "no";

type AppState = {
  currentUserId: string;
  activeFamilyId: string;
  switching: boolean;
  theme: "light" | "dark";
  memories: Memory[];
  chatMessages: ChatMessage[];
  events: FamilyEvent[];
  notifications: AppNotification[];
  media: MediaItem[];
  vault: VaultItem[];
  rsvps: Record<string, Rsvp>;
  signedIn: boolean;

  signIn: () => void;
  signOut: () => void;
  setFamily: (familyId: string) => void;
  setTheme: (theme: "light" | "dark") => void;
  toggleTheme: () => void;
  addMemory: (input: { text: string; photos: string[] }) => void;
  toggleReaction: (memoryId: string, reaction: ReactionType) => void;
  addComment: (memoryId: string, text: string) => void;
  sendMessage: (chatId: string, text: string) => void;
  setRsvp: (eventId: string, rsvp: Rsvp) => void;
  markNotificationsRead: () => void;
  addMediaItem: (input: {
    file: File;
    caption: string;
    albumId: string | null;
  }) => Promise<{ tags: string[]; transcript: string | null }>;
  sealVaultItem: (input: {
    title: string;
    content: string;
    releaseOn: string;
    recipients: string[];
    file: File | null;
  }) => Promise<{ transcript: string | null }>;
  generateStory: (albumId: string | null) => Promise<string>;
};

const applyThemeClass = (theme: "light" | "dark") => {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", theme === "dark");
};

export const useAppStore = create<AppState>((set, get) => ({
  currentUserId: CURRENT_USER_ID,
  activeFamilyId: "fam_johnson",
  switching: false,
  theme: "light",
  memories: seedMemories,
  chatMessages: seedChatMessages,
  events: seedEvents,
  notifications: seedNotifications,
  media: seedMediaItems,
  vault: seedVaultItems,
  rsvps: {},
  signedIn: false,

  signIn: () => set({ signedIn: true, currentUserId: CURRENT_USER_ID }),
  signOut: () => set({ signedIn: false }),

  setFamily: (familyId) => {
    if (familyId === get().activeFamilyId) return;
    set({ switching: true });
    setTimeout(() => {
      const isChen = familyId === "fam_chen";
      set({
        activeFamilyId: familyId,
        currentUserId: isChen ? "c_daniel" : CURRENT_USER_ID,
        switching: false,
      });
    }, 650);
  },

  setTheme: (theme) => {
    applyThemeClass(theme);
    if (typeof window !== "undefined") window.localStorage.setItem("em.theme", theme);
    set({ theme });
  },

  toggleTheme: () => get().setTheme(get().theme === "dark" ? "light" : "dark"),

  addMemory: ({ text, photos }) =>
    set((state) => ({
      memories: [
        {
          id: `mem_new_${Date.now()}`,
          familyId: state.activeFamilyId,
          authorId: state.currentUserId,
          text,
          photos,
          createdAt: new Date().toISOString(),
          reactions: { heart: 0, joy: 0, sad: 0, wow: 0 },
          myReaction: null,
          comments: [],
          taggedUserIds: [],
        },
        ...state.memories,
      ],
    })),

  toggleReaction: (memoryId, reaction) =>
    set((state) => ({
      memories: state.memories.map((memory) => {
        if (memory.id !== memoryId) return memory;
        const had = memory.myReaction === reaction;
        const reactions = { ...memory.reactions };
        if (memory.myReaction) {
          reactions[memory.myReaction] = Math.max(0, reactions[memory.myReaction] - 1);
        }
        if (!had) reactions[reaction] += 1;
        return { ...memory, reactions, myReaction: had ? null : reaction };
      }),
    })),

  addComment: (memoryId, text) =>
    set((state) => ({
      memories: state.memories.map((memory) =>
        memory.id === memoryId
          ? {
              ...memory,
              comments: [
                ...memory.comments,
                {
                  id: `c_${Date.now()}`,
                  authorId: state.currentUserId,
                  text,
                  createdAt: new Date().toISOString(),
                },
              ],
            }
          : memory,
      ),
    })),

  sendMessage: (chatId, text) =>
    set((state) => ({
      chatMessages: [
        ...state.chatMessages,
        {
          id: `msg_${Date.now()}`,
          chatId,
          authorId: state.currentUserId,
          text,
          createdAt: new Date().toISOString(),
        },
      ],
    })),

  setRsvp: (eventId, rsvp) => set((state) => ({ rsvps: { ...state.rsvps, [eventId]: rsvp } })),

  markNotificationsRead: () =>
    set((state) => ({ notifications: state.notifications.map((n) => ({ ...n, read: true })) })),

  /** Demo upload: the file never leaves the browser — we keep an object URL. */
  addMediaItem: async ({ file, caption, albumId }) => {
    await wait(1200 + Math.random() * 800);
    const isAudio = (file.type || "").startsWith("audio/");
    const tags = isAudio ? [] : pick(TAG_POOL);
    const transcript = isAudio ? pick(TRANSCRIPTS) : null;
    const state = get();
    const item: MediaItem = {
      id: `media_new_${Date.now()}`,
      familyId: state.activeFamilyId,
      albumId: albumId ?? "",
      url: URL.createObjectURL(file),
      caption: caption || file.name,
      takenAt: new Date().toISOString(),
      uploadedBy: state.currentUserId,
      likes: 0,
      mediaMime: file.type || "application/octet-stream",
      aiTags: tags,
      ...(transcript ? { transcript } : {}),
    };
    set((s) => ({ media: [item, ...s.media] }));
    return { tags, transcript };
  },

  /** Demo seal: written to in-memory state only. */
  sealVaultItem: async ({ title, content, releaseOn, recipients, file }) => {
    await wait(1000 + Math.random() * 900);
    const mime = file?.type ?? "";
    const isRecording = mime.startsWith("audio/") || mime.startsWith("video/");
    const transcript = isRecording ? pick(TRANSCRIPTS) : null;
    const kind: VaultItem["kind"] = mime.startsWith("video/")
      ? "video"
      : mime.startsWith("audio/")
        ? "audio"
        : mime.startsWith("image/")
          ? "letter"
          : "message";
    const state = get();
    const item: VaultItem = {
      id: `v_new_${Date.now()}`,
      familyId: state.activeFamilyId,
      title,
      kind,
      authorId: state.currentUserId,
      sealedAt: new Date().toISOString(),
      unlock: { kind: "date", date: releaseOn },
      recipients,
      preview: file
        ? `Sealed attachment · ${file.name}`
        : `Sealed message, ${content.trim().split(/\s+/).filter(Boolean).length} words`,
      sizeLabel: file
        ? file.size >= 1_048_576
          ? `${(file.size / 1_048_576).toFixed(1)} MB`
          : `${Math.max(1, Math.round(file.size / 1024))} KB`
        : `${Math.max(1, Math.round(content.length / 1024))} KB`,
      content,
      ...(file
        ? {
            mediaUrl: URL.createObjectURL(file),
            mediaMime: file.type || "application/octet-stream",
            mediaName: file.name,
          }
        : {}),
      ...(transcript ? { transcript } : {}),
    };
    set((s) => ({ vault: [item, ...s.vault] }));
    return { transcript };
  },

  /** Demo "AI story": canned prose after a simulated delay. */
  generateStory: async () => {
    await wait(1400 + Math.random() * 900);
    return pick(STORIES);
  },
}));

export const useCurrentUser = () => userById(useAppStore((s) => s.currentUserId));
