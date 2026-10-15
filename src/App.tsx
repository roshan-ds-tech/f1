import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AppProvider } from './state/AppContext';
import { Shell } from './components/Shell';
import { Dashboard } from './pages/Dashboard';
import { Simulator } from './pages/Simulator';
import { Live } from './pages/Live';
import { Telemetry } from './pages/Telemetry';
import { TyreAnalysis } from './pages/TyreAnalysis';
import { WeatherTrack } from './pages/WeatherTrack';
import { Compare } from './pages/Compare';
import { History } from './pages/History';
import { Settings } from './pages/Settings';

export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <Routes>
          <Route element={<Shell />}>
            <Route index element={<Dashboard />} />
            <Route path="simulator" element={<Simulator />} />
            <Route path="live" element={<Live />} />
            <Route path="telemetry" element={<Telemetry />} />
            <Route path="tyres" element={<TyreAnalysis />} />
            <Route path="weather" element={<WeatherTrack />} />
            <Route path="compare" element={<Compare />} />
            <Route path="history" element={<History />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Routes>
      </AppProvider>
    </BrowserRouter>
  );
}
