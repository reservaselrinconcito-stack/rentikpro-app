/**
 * src/pages/WebsiteBuilderRoute.tsx
 *
 * Thin route wrapper that gates on the "web_builder" feature flag.
 * Import this in your main router (App.tsx / Router.tsx):
 *
 *   import { WebsiteBuilderRoute } from './pages/WebsiteBuilderRoute';
 *   // ...
 *   <Route path="/website-builder" element={<WebsiteBuilderRoute />} />
 *
 * If you use a NavBar/Sidebar component, add an entry like:
 *   { icon: Globe, label: 'Website Builder', path: '/website-builder' }
 */

import React from 'react';
import { WebsiteBuilder } from './WebsiteBuilder';

const WebsiteBuilderRoute: React.FC = () => {
    return <WebsiteBuilder />;
};

export default WebsiteBuilderRoute;
