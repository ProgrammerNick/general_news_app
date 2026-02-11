// Brief API client (calls backend with credentials)

const getApiBase = () =>
  typeof window !== "undefined"
    ? window.location.origin
    : (process.env.BETTER_AUTH_URL || "http://localhost:3001");

export type BriefListItem = {
  id: number;
  date: string;
  status: string | null;
  audioUrl: string | null;
  createdAt: string | null;
  transcript: string | null;
};

export type BriefDetail = BriefListItem & {
  transcript: string | null;
};

/** List the current user's briefs (newest first) */
export const getMyBriefsFn = async (): Promise<{ briefs: BriefListItem[] }> => {
  const res = await fetch(`${getApiBase()}/api/brief`, { credentials: "include" });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) throw new Error("Please sign in to view your briefs");
  if (!res.ok) throw new Error(data.error || "Failed to load briefs");
  return { briefs: data.briefs ?? [] };
};

/** Get one brief by id (only returns if it belongs to the current user) */
export const getBriefByIdFn = async (id: number): Promise<BriefDetail> => {
  const res = await fetch(`${getApiBase()}/api/brief/${id}`, { credentials: "include" });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) throw new Error("Please sign in");
  if (res.status === 404) throw new Error("Brief not found");
  if (!res.ok) throw new Error(data.error || "Failed to load brief");
  return data;
};

export const generateBriefFn = async () => {
  const res = await fetch(`${getApiBase()}/api/brief/generate`, {
    method: "POST",
    credentials: "include",
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) throw new Error("Please sign in to generate a brief");
  if (!res.ok) throw new Error(data.error || "Failed to generate brief");
  return {
    success: true,
    text: data.text,
    audioUrl: data.audioUrl,
    emailSent: data.emailSent,
  };
};
