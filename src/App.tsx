import { Suspense, lazy } from 'react'
import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'

const Home = lazy(() => import('./routes/Home'))
const ExperimentPage = lazy(() => import('./routes/ExperimentPage'))
const IonInjectionPage = lazy(() => import('./routes/IonInjectionPage'))

function RouteLoading() {
  return (
    <div className="space-y-6 pb-8">
      <section className="lab-shell hero-grid relative overflow-hidden rounded-[2rem] px-6 py-8 sm:px-10 sm:py-12">
        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-4">
            <div className="route-loading-line h-8 w-40 rounded-full" />
            <div className="route-loading-line h-20 w-full max-w-[560px] rounded-[1.6rem]" />
            <div className="route-loading-line h-6 w-full max-w-[640px] rounded-full" />
            <div className="route-loading-line h-6 w-full max-w-[520px] rounded-full" />
            <div className="mt-8 flex gap-3">
              <div className="route-loading-line h-12 w-36 rounded-full" />
              <div className="route-loading-line h-12 w-44 rounded-full" />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="metric-tile space-y-3">
                <div className="route-loading-line h-4 w-24 rounded-full" />
                <div className="route-loading-line h-10 w-16 rounded-full" />
                <div className="route-loading-line h-4 w-full rounded-full" />
                <div className="route-loading-line h-4 w-4/5 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route
          path="/"
          element={(
            <Suspense fallback={<RouteLoading />}>
              <Home />
            </Suspense>
          )}
        />
        <Route
          path="/experiment/:id"
          element={(
            <Suspense fallback={<RouteLoading />}>
              <ExperimentPage />
            </Suspense>
          )}
        />
        <Route
          path="/challenge/ion-injection"
          element={(
            <Suspense fallback={<RouteLoading />}>
              <IonInjectionPage />
            </Suspense>
          )}
        />
      </Route>
    </Routes>
  )
}
