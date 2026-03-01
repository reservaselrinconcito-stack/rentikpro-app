import React from 'react';
import { useTranslation } from 'react-i18next';

interface PriceDisplayProps {
    price?: number;
    currency?: string;
    showFrom?: boolean;
    showPerNight?: boolean;
    className?: string;
    priceClassName?: string;
    labelClassName?: string;
}

export const PriceDisplay: React.FC<PriceDisplayProps> = ({
    price,
    currency = 'EUR',
    showFrom = true,
    showPerNight = true,
    className = '',
    priceClassName = '',
    labelClassName = '',
}) => {
    const { t, i18n } = useTranslation();

    if (price === undefined || price === null || price <= 0) {
        return (
            <span className={`text-stone-500 italic ${className}`}>
                {t('price.ask')}
            </span>
        );
    }

    const formattedPrice = new Intl.NumberFormat(i18n.language, {
        style: 'currency',
        currency: currency,
        maximumFractionDigits: 0,
    }).format(price);

    return (
        <div className={`flex items-baseline gap-1 ${className}`}>
            {showFrom && (
                <span className={`text-[10px] uppercase tracking-widest font-black text-stone-400 ${labelClassName}`}>
                    {t('price.from')}
                </span>
            )}
            <span className={`font-serif text-stone-900 ${priceClassName}`}>
                {formattedPrice}
            </span>
            {showPerNight && (
                <span className={`text-xs text-stone-500 font-light ${labelClassName}`}>
                    {t('price.perNight')}
                </span>
            )}
        </div>
    );
};
