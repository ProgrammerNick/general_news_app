// Profile API client (calls backend with credentials)

import { getSession } from "../lib/auth-client";

const getApiBase = () =>
  typeof window !== "undefined"
    ? window.location.origin
    : (process.env.BETTER_AUTH_URL || "http://localhost:3001");

export const getSessionFn = async () => {
  return getSession();
};

export const getProfileFn = async () => {
  const res = await fetch(`${getApiBase()}/api/profile`, {
    credentials: "include",
  });
  if (res.status === 401) return null;
  if (!res.ok) throw new Error("Failed to load profile");
  return res.json();
};

export const saveInterestsFn = async (data: { data: { interests: { categoryId: string; subcategoryIds: string[] }[] } }) => {
  const res = await fetch(`${getApiBase()}/api/profile`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ interests: data.data?.interests ?? [] }),
    credentials: "include",
  });
  if (res.status === 401) throw new Error("Unauthorized");
  if (!res.ok) throw new Error("Failed to save interests");
  return res.json();
};
