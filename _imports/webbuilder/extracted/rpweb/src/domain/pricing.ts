/**
 * domain/pricing.ts — Lógica centralizada de precios para el frontend.
 * 
 * Basado en las reglas del SaaS:
 * - Si publicBasePrice > 0 -> "Desde X€/noche"
 * - Si publicBasePrice <= 0 o null -> "Consultar precio"
 */

import { TFunction } from 'i18next';

export interface PriceDisplay {
    hasPrice: boolean;
    formattedPrice: string;
    labelBefore: string; // "Desde"
    labelAfter: string;  // "/noche"
    fullText: string;    // "Desde 100€/noche" o "Consultar precio"
}

export function getPriceDisplay(
    price: number | null | undefined,
    currency: string | null | undefined,
    t: TFunction,
    i18n: { language: string }
): PriceDisplay {
    const isValidPrice = typeof price === 'number' && price > 0;

    if (!isValidPrice) {
        return {
            hasPrice: false,
            formattedPrice: '',
            labelBefore: '',
            labelAfter: '',
            fullText: t('price.ask'),
        };
    }

    const formatted = new Intl.NumberFormat(i18n.language, {
        style: 'currency',
        currency: currency || 'EUR',
        maximumFractionDigits: 0, // Normalmente los base prices son enteros
    }).format(price as number);

    const from = t('price.from');
    const perNight = t('price.perNight');

    return {
        hasPrice: true,
        formattedPrice: formatted,
        labelBefore: from,
        labelAfter: perNight,
        fullText: `${from} ${formatted}${perNight}`,
    };
}
