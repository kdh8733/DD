import { useEffect, useRef } from 'react'
import Keycloak from 'keycloak-js'
import { useAuthStore } from '@/stores/authStore'

const keycloak = new Keycloak({
  url: import.meta.env.VITE_KEYCLOAK_URL,
  realm: import.meta.env.VITE_KEYCLOAK_REALM,
  clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID,
})

export function useAuth() {
  const { setAuth, logout } = useAuthStore()
  const initialized = useRef(false)

  useEffect(() => {
    if (initialized.current) return
    initialized.current = true

    keycloak.init({ onLoad: 'login-required', checkLoginIframe: false }).then((authenticated) => {
      if (authenticated && keycloak.token && keycloak.tokenParsed) {
        setAuth(
          {
            id: keycloak.tokenParsed.sub ?? '',
            username: keycloak.tokenParsed.preferred_username ?? '',
            email: keycloak.tokenParsed.email ?? '',
            name: keycloak.tokenParsed.name ?? '',
            roles: keycloak.tokenParsed.realm_access?.roles ?? [],
            groups: (keycloak.tokenParsed.groups as string[]) ?? [],
          },
          keycloak.token,
        )
      }
    })

    keycloak.onTokenExpired = () => {
      keycloak.updateToken(30).then((refreshed) => {
        if (refreshed && keycloak.token) {
          const parsed = keycloak.tokenParsed
          if (parsed) {
            setAuth(
              {
                id: parsed.sub ?? '',
                username: parsed.preferred_username ?? '',
                email: parsed.email ?? '',
                name: parsed.name ?? '',
                roles: parsed.realm_access?.roles ?? [],
                groups: (parsed.groups as string[]) ?? [],
              },
              keycloak.token!,
            )
          }
        } else {
          logout()
        }
      })
    }
  }, [setAuth, logout])

  return { keycloak }
}
