import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './shared/components/layout/Layout'
import { CasePage } from './features/cases/pages/CasePage'
import { HomePage } from './features/cases/pages/HomePage'
import { InventoryPage } from './features/inventory/pages/InventoryPage'
import { BattlesPage } from './features/battles/pages/BattlesPage'
import { BattleRoomPage } from './features/battles/pages/BattleRoomPage'
import { UpgradePage } from './features/upgrade/pages/UpgradePage'
import { LoginPage } from './features/auth/pages/LoginPage'
import { RegisterPage } from './features/auth/pages/RegisterPage'
import { RequireAuth } from './features/auth/components/RequireAuth'
import { RequireAdmin } from './features/auth/components/RequireAdmin'
import { AdminPage } from './features/admin/pages/AdminPage'

function AuthedLayout() {
  return (
    <RequireAuth>
      <Layout />
    </RequireAuth>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />

        <Route element={<AuthedLayout />}>
          <Route index element={<HomePage />} />
          <Route path="case/:caseId" element={<CasePage />} />
          <Route path="inventory" element={<InventoryPage />} />
          <Route path="battles" element={<BattlesPage />} />
          <Route path="battles/:battleId" element={<BattleRoomPage />} />
          <Route path="upgrade" element={<UpgradePage />} />
          <Route
            path="admin"
            element={
              <RequireAdmin>
                <AdminPage />
              </RequireAdmin>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
