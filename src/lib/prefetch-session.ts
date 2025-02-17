import { type AnyUseQueryOptions, QueryClient } from "@tanstack/react-query"
import type { createAuthClient } from "better-auth/react"

import type { AuthQueryOptions } from "./auth-query-provider"

export async function prefetchSession<
    TAuthClient extends Omit<ReturnType<typeof createAuthClient>, "signUp">
>(
    authClient: TAuthClient,
    queryClient: QueryClient,
    queryOptions?: AuthQueryOptions,
    options?: Omit<AnyUseQueryOptions, "queryKey" | "queryFn">
) {
    type SessionData = TAuthClient["$Infer"]["Session"] | null
    type User = TAuthClient["$Infer"]["Session"]["user"] | undefined
    type Session = TAuthClient["$Infer"]["Session"]["session"] | undefined

    const { error, data } = await authClient.getSession()

    const mergedOptions = {
        ...queryOptions?.queryOptions,
        ...queryOptions?.sessionQueryOptions,
        ...options
    }

    await queryClient.prefetchQuery({
        ...mergedOptions,
        queryKey: queryOptions?.sessionKey ?? ["session"],
        queryFn: () => data as SessionData
    })

    return {
        error,
        data: data as SessionData,
        session: data?.session as Session,
        user: data?.user as User
    }
}