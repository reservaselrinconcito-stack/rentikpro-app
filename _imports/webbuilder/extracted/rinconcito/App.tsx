import React from 'react';
import { HashRouter as Router, Routes, Route, ScrollRestoration } from 'react-router-dom';
import { Layout } from './components/Layout';

// Pages
import Home from './pages/Home';
import Apartments from './pages/Apartments';
import ApartmentDetail from './pages/ApartmentDetail';
import Blog from './pages/Blog';
import GuidePage from './pages/GuidePage';
import RentikPro from './pages/RentikPro';
import ComingSoon from './pages/ComingSoon';
import Contact from './pages/Contact';

// ScrollToTop component to fix scroll position on navigation
const ScrollToTop = () => {
  const { pathname } = React.useMemo(() => new URL(window.location.href), []);
  
  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

const App: React.FC = () => {
  return (
    <Router>
      <ScrollToTop />
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/apartamentos" element={<Apartments />} />
          <Route path="/apartamentos/:slug" element={<ApartmentDetail />} />
          
          <Route path="/blog" element={<Blog />} />
          <Route path="/blog/:slug" element={<div className="p-20 text-center">Detalle Blog (Mock)</div>} />
          
          {/* Dynamic Guide Route */}
          <Route path="/guias/:type" element={<GuidePage />} />
          
          <Route path="/rentikpro" element={<RentikPro />} />
          <Route path="/proximamente" element={<ComingSoon />} />
          <Route path="/contacto" element={<Contact />} />
        </Routes>
      </Layout>
    </Router>
  );
};

export default App;