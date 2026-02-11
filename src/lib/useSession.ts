import { useQuery } from "@tanstack/react-query";
import { getSession } from "./auth-client";

export function useSession() {
    return useQuery({
        queryKey: ["session"],
        queryFn: getSession,
        retry: false,
        staleTime: 5 * 60 * 1000, // 5 minutes
    });
}
