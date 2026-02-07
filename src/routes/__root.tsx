import { Outlet, createRootRoute } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'

import Header from '../components/Header'

export const Route = createRootRoute({
  component: RootComponent,
})

function RootComponent() {
  const [queryClient] = useState(() => new QueryClient())

  return (
    <QueryClientProvider client={queryClient}>
      <Header />
      <Outlet />
      <TanStackRouterDevtools position="bottom-right" />
    </QueryClientProvider>
  )
}
