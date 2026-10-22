import { AuthGate } from "@/features/auth/AuthGate"
import { AccessGranted } from "@/features/home/AccessGranted"

export default function App(): React.JSX.Element {
  return <AuthGate>{(access) => <AccessGranted access={access} />}</AuthGate>
}
