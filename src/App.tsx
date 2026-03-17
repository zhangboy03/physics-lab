import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './routes/Home'
import ExperimentPage from './routes/ExperimentPage'
import IonInjectionPage from './routes/IonInjectionPage'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/experiment/:id" element={<ExperimentPage />} />
        <Route path="/challenge/ion-injection" element={<IonInjectionPage />} />
      </Route>
    </Routes>
  )
}
