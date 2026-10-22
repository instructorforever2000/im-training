import { LoginScreen } from "./LoginScreen"
import { useAccess, type AccessApi } from "./useAccess"

/** Shows the login flow until the person has approved access to this platform. */
export function AuthGate({ children }: { children: (access: AccessApi) => React.ReactNode }): React.JSX.Element {
  const access = useAccess()
  if (access.phase === "granted") return <>{children(access)}</>
  return <LoginScreen access={access} />
}
