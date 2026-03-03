import React from 'react';
import { HashRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ChatProvider } from './context/ChatContext';
import { SiteConfigProvider } from './context/SiteConfigContext';

// Core pages
import Home from './pages/Home';
import Apartments from './pages/Apartments';
import ApartmentDetail from './pages/ApartmentDetail';
import Experiences from './pages/Experiences';
import ExperienceDetail from './pages/ExperienceDetail';
import Guides from './pages/Guides';
import GuideDetail from './pages/GuideDetail';
import RentikPro from './pages/RentikPro';
import Availability from './pages/Availability';
import ComingSoon from './pages/ComingSoon';
import Contact from './pages/Contact';

// New premium pages
import Eclipse2026 from './pages/Eclipse2026';
import Gastronomia from './pages/Gastronomia';
import ViasVerdes from './pages/ViasVerdes';
import Astroturismo from './pages/Astroturismo';

const DEBUG_ROUTE_ENABLED = import.meta.env.DEV || import.meta.env.VITE_ENABLE_DEBUG_ROUTE === 'true';
const DebugRoute = React.lazy(() => import('./pages/Debug'));

const ScrollToTop = () => {
  const { pathname } = useLocation();
  React.useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
};

const App: React.FC = () => {
  return (
    <SiteConfigProvider>
      <Router>
        <ChatProvider>
          <ScrollToTop />
          <Layout>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/apartamentos" element={<Apartments />} />
              <Route path="/apartamentos/:slug" element={<ApartmentDetail />} />
              <Route path="/experiencias" element={<Experiences />} />
              <Route path="/experiencias/:slug" element={<ExperienceDetail />} />
              <Route path="/guias" element={<Guides />} />
              <Route path="/guias/:slug" element={<GuideDetail />} />
              <Route path="/blog" element={<Guides />} />
              <Route path="/rentikpro" element={<RentikPro />} />
              <Route path="/disponibilidad" element={<Availability />} />
              <Route path="/proximamente" element={<ComingSoon />} />
              <Route path="/contacto" element={<Contact />} />
              {/* New premium pages */}
              <Route path="/eclipse-2026" element={<Eclipse2026 />} />
              <Route path="/gastronomia" element={<Gastronomia />} />
              <Route path="/vias-verdes" element={<ViasVerdes />} />
              <Route path="/astroturismo" element={<Astroturismo />} />

              {DEBUG_ROUTE_ENABLED && (
                <Route
                  path="/__debug"
                  element={
                    <React.Suspense fallback={<div className="p-8 text-sm">Loading debug...</div>}>
                      <DebugRoute />
                    </React.Suspense>
                  }
                />
              )}
            </Routes>
          </Layout>
        </ChatProvider>
      </Router>
    </SiteConfigProvider>
  );
};

export default App;
