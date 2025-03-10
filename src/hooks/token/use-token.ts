import { type AnyUseQueryOptions, useQuery } from "@tanstack/react-query"
import { useContext, useEffect, useMemo } from "react"

import { AuthQueryContext } from "../../lib/auth-query-provider"

import type { AuthClient } from "../../types/auth-client"
import { useSession } from "../session/use-session"

export const decodeJwt = (token: string) => {
    const parts = token.split('.').map((part) =>
        atob(part.replace(/-/g, '+').replace(/_/g, '/'))
    )

    return JSON.parse(parts[1]);
}

export function useToken<TAuthClient extends AuthClient>(
    authClient: TAuthClient,
    options?: Partial<AnyUseQueryOptions>
) {
    const { tokenKey, tokenQueryOptions, queryOptions } = useContext(AuthQueryContext)
    const { user } = useSession(authClient, options)

    const mergedOptions = { ...queryOptions, ...tokenQueryOptions, ...options }

    const queryResult = useQuery<{ token: string } | null>({
        staleTime: 600 * 1000,
        queryKey: tokenKey,
        queryFn: () => authClient.$fetch("/token", { throw: true }),
        ...mergedOptions,
        enabled: !!user && (mergedOptions.enabled ?? true)
    })

    const { data, refetch } = queryResult
    const payload = useMemo(() => (data ? decodeJwt(data.token) : null), [data])

    useEffect(() => {
        if (!data?.token) return

        const payload = decodeJwt(data.token)
        if (!payload?.exp) return

        const expiresAt = payload.exp * 1000
        const expiresIn = expiresAt - Date.now()

        const timeout = setTimeout(() => refetch(), expiresIn)

        return () => clearTimeout(timeout)
    }, [data, refetch])

    const isTokenExpired = () => {
        if (!data?.token) return true

        const payload = decodeJwt(data.token)
        if (!payload?.exp) return true

        return payload.exp < Date.now() / 1000
    }

    const tokenData = !user || isTokenExpired() || user?.id !== payload?.sub ? undefined : data

    return { ...queryResult, data: tokenData, token: tokenData?.token, payload }
}
