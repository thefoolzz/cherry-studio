import PlatformAccountsPage from '@renderer/pages/platformAccounts/PlatformAccountsPage'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/platform-accounts')({
  component: PlatformAccountsPage
})
