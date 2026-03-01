import React, { useEffect } from 'react';
import { useSiteConfigContext } from '../site/SiteConfigProvider';

interface SEOProps {
    title?: string;
    description?: string;
    image?: string;
    canonical?: string;
}

export const SEO: React.FC<SEOProps> = ({ title, description, image, canonical }) => {
    const { config } = useSiteConfigContext();

    useEffect(() => {
        if (!config) return;

        const brandName = config.brand.name;
        const finalTitle = title
            ? config.seo.titleTemplate.replace('%s', title)
            : config.seo.defaultTitle;

        document.title = finalTitle;

        const metaDescription = description || config.seo.defaultDescription;
        let metaDescTag = document.querySelector('meta[name="description"]');
        if (!metaDescTag) {
            metaDescTag = document.createElement('meta');
            metaDescTag.setAttribute('name', 'description');
            document.head.appendChild(metaDescTag);
        }
        metaDescTag.setAttribute('content', metaDescription);

        // OG Tags
        const ogTags = {
            'og:title': finalTitle,
            'og:description': metaDescription,
            'og:image': image || config.seo.ogImage || '',
            'og:type': 'website',
            'og:site_name': brandName,
        };

        Object.entries(ogTags).forEach(([property, content]) => {
            let tag = document.querySelector(`meta[property="${property}"]`);
            if (!tag) {
                tag = document.createElement('meta');
                tag.setAttribute('property', property);
                document.head.appendChild(tag);
            }
            tag.setAttribute('content', content);
        });

        // Canonical
        let canonicalTag = document.querySelector('link[rel="canonical"]');
        if (!canonicalTag) {
            canonicalTag = document.createElement('link');
            canonicalTag.setAttribute('rel', 'canonical');
            document.head.appendChild(canonicalTag);
        }
        canonicalTag.setAttribute('href', canonical || window.location.href);

    }, [config, title, description, image, canonical]);

    return null;
};
