import { Suspense, lazy } from 'react'
import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'

const Home = lazy(() => import('./routes/Home'))
const ExperimentPage = lazy(() => import('./routes/ExperimentPage'))
const IonInjectionPage = lazy(() => import('./routes/IonInjectionPage'))

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route
          path="/"
          element={(
            <Suspense fallback={null}>
              <Home />
            </Suspense>
          )}
        />
        <Route
          path="/experiment/:id"
          element={(
            <Suspense fallback={null}>
              <ExperimentPage />
            </Suspense>
          )}
        />
        <Route
          path="/challenge/ion-injection"
          element={(
            <Suspense fallback={null}>
              <IonInjectionPage />
            </Suspense>
          )}
        />
      </Route>
    </Routes>
  )
}
