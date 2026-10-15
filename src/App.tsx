import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AppProvider } from './state/AppContext';
import { Shell } from './components/Shell';
import { Dashboard } from './pages/Dashboard';
import { Simulator } from './pages/Simulator';
import { Live } from './pages/Live';
import { TyreAnalysis } from './pages/TyreAnalysis';
import { Compare } from './pages/Compare';
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
            <Route path="tyres" element={<TyreAnalysis />} />
            <Route path="compare" element={<Compare />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Routes>
      </AppProvider>
    </BrowserRouter>
  );
}
