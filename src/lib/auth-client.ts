// Stub auth-client for debugging SSR issue
// TODO: Replace with actual better-auth/client once SSR issue is resolved

// Define types inline to avoid import issues
type SignInParams = { email: string; password: string };
type SignUpParams = { email: string; password: string; name: string };
type AuthResponse = { error?: { message?: string } | null };

// Stub signIn that actually calls the API
export const signIn = {
    email: async ({ email, password }: SignInParams): Promise<AuthResponse> => {
        const baseURL = typeof window !== "undefined"
            ? window.location.origin
            : (process.env.BETTER_AUTH_URL || "http://localhost:3001");

        const res = await fetch(`${baseURL}/api/auth/sign-in/email`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
            credentials: "include",
        });

        // Success: 2xx or 3xx (better-auth may return 302 redirect)
        if (res.ok || (res.status >= 300 && res.status < 400)) {
            return { error: null };
        }

        const text = await res.text();
        let message = "Sign in failed";
        try {
            const data = text ? JSON.parse(text) : {};
            message = (data.message ?? data.error?.message ?? data.error ?? message) || message;
        } catch {
            if (text) message = `${message} (${res.status})`;
        }
        return { error: { message } };
    }
};

// Stub signUp
export const signUp = {
    email: async ({ email, password, name }: SignUpParams): Promise<AuthResponse> => {
        const baseURL = typeof window !== "undefined"
            ? window.location.origin
            : (process.env.BETTER_AUTH_URL || "http://localhost:3001");

        const res = await fetch(`${baseURL}/api/auth/sign-up/email`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password, name }),
            credentials: "include",
        });

        if (res.ok || (res.status >= 300 && res.status < 400)) {
            return { error: null };
        }

        const text = await res.text();
        let message = "Sign up failed";
        try {
            const data = text ? JSON.parse(text) : {};
            message = (data.message ?? data.error?.message ?? data.error ?? message) || message;
        } catch {
            if (text) message = `${message} (${res.status})`;
        }
        return { error: { message } };
    }
};

// Stub signOut
export const signOut = async (): Promise<void> => {
    const baseURL = typeof window !== "undefined"
        ? window.location.origin
        : (process.env.BETTER_AUTH_URL || "http://localhost:3001");

    await fetch(`${baseURL}/api/auth/sign-out`, {
        method: "POST",
        credentials: "include",
    });
};

// Stub getSession
export const getSession = async () => {
    const baseURL = typeof window !== "undefined"
        ? window.location.origin
        : (process.env.BETTER_AUTH_URL || "http://localhost:3001");

    const res = await fetch(`${baseURL}/api/auth/get-session`, {
        credentials: "include",
    });

    if (!res.ok) return null;
    return res.json();
};
