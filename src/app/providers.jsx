import { ToastProvider } from '../components/ui'

// Shared domain state provider is added here in M1.
export default function Providers({ children }) {
  return <ToastProvider>{children}</ToastProvider>
}
