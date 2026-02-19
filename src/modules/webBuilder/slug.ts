/**
 * Normalizes a string into a URL-friendly slug.
 * - Lowercase
 * - Replaces spaces with hyphens
 * - Removes accents (á -> a, etc)
 * - Removes special characters
 * - Ensures min length 3 (if possible, validation should handle the error)
 */
export const normalizeSlug = (text: string): string => {
    if (!text) return '';

    return text
        .toString()
        .toLowerCase()
        .normalize("NFD") // Split accents
        .replace(/[\u0300-\u036f]/g, "") // Remove accents
        .trim()
        .replace(/\s+/g, '-') // Replace spaces with -
        .replace(/[^\w\-]+/g, '') // Remove all non-word chars
        .replace(/\-\-+/g, '-') // Replace multiple - with single -
        .replace(/^-+/, '') // Trim - from start
        .replace(/-+$/, ''); // Trim - from end
};

export const validateSlug = (slug: string): string | null => {
    if (!slug) return "El slug es obligatorio.";
    if (slug.length < 3) return "El slug debe tener al menos 3 caracteres.";
    if (slug.length > 60) return "El slug es demasiado largo.";
    if (!/^[a-z0-9\-]+$/.test(slug)) return "El slug solo puede contener letras, números y guiones.";
    return null;
};
