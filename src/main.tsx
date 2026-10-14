import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, HashRouter } from 'react-router-dom'
import './index.css'
import App from './App'
import { AuthProvider } from './store/AuthContext'
import { IdiomsProvider } from './data/IdiomsContext'
import { UserDataProvider } from './store/UserData'
import { OverridesProvider } from './store/OverridesContext'
import { VerifyProvider } from './store/VerifyContext'
import { UiProvider } from './store/UiContext'
import { I18nProvider } from './i18n'

const Router = __SINGLE__ ? HashRouter : BrowserRouter

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <I18nProvider>
    <Router {...(__SINGLE__ ? {} : { basename: import.meta.env.BASE_URL.replace(/\/$/, '') })}>
      <AuthProvider>
        <OverridesProvider>
          <IdiomsProvider>
            <VerifyProvider>
              <UserDataProvider>
                <UiProvider>
                  <App />
                </UiProvider>
              </UserDataProvider>
            </VerifyProvider>
          </IdiomsProvider>
        </OverridesProvider>
      </AuthProvider>
    </Router>
    </I18nProvider>
  </StrictMode>,
)
