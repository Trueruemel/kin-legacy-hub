export type UserRole = "family_admin" | "moderator" | "member" | "youth" | "elder";
export type UserStatus = "living" | "deceased" | "invited_pending";

export type LifeEvent = { id: string; year: number; title: string; description?: string };

export type User = {
  id: string;
  familyId: string;
  email: string;
  firstName: string;
  lastName: string;
  displayName: string;
  avatarUrl: string;
  coverPhotoUrl: string;
  bio: string;
  birthDate: string;
  deathDate?: string;
  status: UserStatus;
  location?: string;
  role: UserRole;
  generation: number;
  relationshipToViewer: string;
  lifeTimeline: LifeEvent[];
  stats: { memoriesShared: number; photosUploaded: number; vaultItems: number; children: number };
};

export type Family = {
  id: string;
  name: string;
  slug: string;
  founderName: string;
  foundedYear: number;
  coverPhotoUrl: string;
  description: string;
  subscription: "basic" | "standard" | "premium" | "founder" | "enterprise";
  storageUsedGB: number;
  storageQuotaGB: number;
};

export type RelationshipType = "spouse" | "parent";
export type TreeRelationship = { id: string; from: string; to: string; type: RelationshipType };

export type ReactionType = "heart" | "joy" | "sad" | "wow";

export type Comment = {
  id: string;
  authorId: string;
  text: string;
  createdAt: string;
};

export type Memory = {
  id: string;
  familyId: string;
  authorId: string;
  text: string;
  photos: string[];
  createdAt: string;
  reactions: Record<ReactionType, number>;
  myReaction?: ReactionType | null;
  comments: Comment[];
  taggedUserIds: string[];
};

export type MediaItem = {
  id: string;
  familyId: string;
  albumId: string;
  url: string;
  caption: string;
  takenAt: string;
  uploadedBy: string;
  likes: number;
  mediaMime?: string;
  aiCaption?: string;
  aiTags?: string[];
  transcript?: string;
};

export type Album = {
  id: string;
  familyId: string;
  name: string;
  coverUrl: string;
  description: string;
  year: number;
};

export type EventType = "birthday" | "anniversary" | "reunion" | "other";

export type FamilyEvent = {
  id: string;
  familyId: string;
  title: string;
  type: EventType;
  date: string;
  time?: string;
  location: string;
  description: string;
  coverPhotoUrl: string;
  attendees: string[];
  maybe: string[];
  photos: string[];
  comments: Comment[];
};

export type VaultKind = "message" | "video" | "letter" | "audio";
export type VaultUnlock =
  { kind: "date"; date: string } | { kind: "passing" } | { kind: "age"; age: number };

export type VaultItem = {
  id: string;
  familyId: string;
  title: string;
  kind: VaultKind;
  authorId: string;
  sealedAt: string;
  unlock: VaultUnlock;
  recipients: string[];
  preview: string;
  sizeLabel: string;
  content?: string;
  mediaUrl?: string;
  mediaMime?: string;
  mediaName?: string;
  transcript?: string;
};

export type ChatMessage = {
  id: string;
  chatId: string;
  authorId: string;
  text: string;
  createdAt: string;
};

export type Chat = {
  id: string;
  familyId: string;
  name: string;
  kind: "group" | "direct";
  participantIds: string[];
  avatarUrl?: string;
};

export type ForumCategory = {
  id: string;
  familyId: string;
  name: string;
  description: string;
  icon: "utensils" | "sparkles" | "search" | "heart";
};

export type ForumPost = { id: string; authorId: string; body: string; createdAt: string };

export type ForumThread = {
  id: string;
  categoryId: string;
  familyId: string;
  title: string;
  authorId: string;
  createdAt: string;
  posts: ForumPost[];
};

export type Recipe = {
  id: string;
  familyId: string;
  title: string;
  authorId: string;
  originStory: string;
  photoUrl: string;
  servings: number;
  minutes: number;
  ingredients: string[];
  steps: string[];
};

export type AppNotification = {
  id: string;
  actorId: string;
  text: string;
  createdAt: string;
  read: boolean;
};
