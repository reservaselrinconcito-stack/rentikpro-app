import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight, Heart, Zap, Users } from 'lucide-react';

interface Question {
  id: string;
  question: string;
  options: { label: string; value: string; emoji: string }[];
}

const QUESTIONS: Question[] = [
  {
    id: 'who',
    question: '¿Con quién escapas?',
    options: [
      { label: 'En pareja', value: 'pareja', emoji: '❤️' },
      { label: 'En familia', value: 'familia', emoji: '👨‍👩‍👧' },
      { label: 'Con amigos', value: 'amigos', emoji: '🎉' },
      { label: 'Solo/a', value: 'solo', emoji: '🧘' },
    ],
  },
  {
    id: 'vibe',
    question: '¿Qué buscas en tu escapada?',
    options: [
      { label: 'Paz total', value: 'paz', emoji: '🌿' },
      { label: 'Aventura', value: 'aventura', emoji: '🚵' },
      { label: 'Gastronomía', value: 'gastro', emoji: '🍷' },
      { label: 'Desconexión', value: 'desconexion', emoji: '✨' },
    ],
  },
  {
    id: 'style',
    question: '¿Cómo imaginas el apartamento ideal?',
    options: [
      { label: 'Acogedor y íntimo', value: 'intimo', emoji: '🕯️' },
      { label: 'Espacioso', value: 'espacioso', emoji: '🏡' },
      { label: 'Con terraza', value: 'terraza', emoji: '🌄' },
      { label: 'Me da igual, sorpréndeme', value: 'sorpresa', emoji: '🎲' },
    ],
  },
];

// Simple recommendation logic
function recommend(answers: Record<string, string>): string {
  const { who, vibe, style } = answers;
  // La Tirolina — adventure, groups
  if (who === 'amigos' || vibe === 'aventura' || style === 'espacioso') {
    return 'la-tirolina';
  }
  // La Ermita — romantic, solo, intimate
  if (who === 'pareja' || who === 'solo' || style === 'intimo' || vibe === 'paz') {
    return 'la-ermita';
  }
  // Los Almendros — family, gastro, terrace
  return 'los-almendros';
}

const APT_NAMES: Record<string, string> = {
  'la-tirolina': 'La Tirolina',
  'la-ermita': 'La Ermita',
  'los-almendros': 'Los Almendros',
};

const APT_TAGLINES: Record<string, string> = {
  'la-tirolina': 'Para los que necesitan espacio y aventura.',
  'la-ermita': 'Para los que buscan intimidad y silencio.',
  'los-almendros': 'Para los que disfrutan de la vida con calma.',
};

export const ApartmentQuiz: React.FC = () => {
  const { t } = useTranslation();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<string | null>(null);

  const current = QUESTIONS[step];

  const select = (value: string) => {
    const newAnswers = { ...answers, [current.id]: value };
    setAnswers(newAnswers);
    if (step < QUESTIONS.length - 1) {
      setTimeout(() => setStep(step + 1), 180);
    } else {
      setTimeout(() => setResult(recommend(newAnswers)), 180);
    }
  };

  const reset = () => {
    setStep(0);
    setAnswers({});
    setResult(null);
  };

  return (
    <section style={{ background: 'var(--cream-dark)' }} className="py-20 md:py-28">
      <div className="max-w-3xl mx-auto px-8 text-center">
        <p className="font-sans text-xs uppercase tracking-[0.3em] mb-5" style={{ color: 'var(--rust)' }}>{t('common.find_apartment')}</p>
        <h2 className="font-display italic font-light mb-4" style={{ fontSize: 'clamp(32px,4.5vw,60px)', color: 'var(--ink)', letterSpacing: '-0.025em' }}>
          ¿Cuál es el tuyo?
        </h2>
        <p className="font-sans font-light mb-12" style={{ color: 'var(--ink-muted)', fontSize: 16 }}>
          3 preguntas. Tu apartamento perfecto.
        </p>

        {!result ? (
          <div key={step} style={{ animation: 'fadeIn 0.35s ease' }}>
            {/* Progress */}
            <div className="flex justify-center gap-2 mb-10">
              {QUESTIONS.map((_, i) => (
                <div
                  key={i}
                  className="rounded-full transition-all duration-500"
                  style={{
                    width: i === step ? 32 : 8,
                    height: 8,
                    background: i <= step ? 'var(--rust)' : 'var(--cream-dark)',
                    border: `1.5px solid ${i <= step ? 'var(--rust)' : 'rgba(28,24,18,0.15)'}`,
                  }}
                />
              ))}
            </div>

            <p className="font-display italic font-light mb-10" style={{ fontSize: 'clamp(22px,3.5vw,36px)', color: 'var(--ink)', letterSpacing: '-0.01em' }}>
              {current.question}
            </p>

            <div className="grid grid-cols-2 gap-4">
              {current.options.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => select(opt.value)}
                  className="rounded-2xl p-5 text-left group transition-all duration-300 hover:scale-[1.02]"
                  style={{
                    background: 'var(--cream)',
                    border: '1.5px solid transparent',
                    boxShadow: '0 2px 12px rgba(28,24,18,0.06)',
                  }}
                  onMouseEnter={e => {
                    const el = e.currentTarget as HTMLButtonElement;
                    el.style.borderColor = 'var(--rust)';
                    el.style.boxShadow = '0 8px 28px rgba(155,79,46,0.15)';
                  }}
                  onMouseLeave={e => {
                    const el = e.currentTarget as HTMLButtonElement;
                    el.style.borderColor = 'transparent';
                    el.style.boxShadow = '0 2px 12px rgba(28,24,18,0.06)';
                  }}
                >
                  <span className="text-2xl mb-3 block">{opt.emoji}</span>
                  <span className="font-sans font-semibold text-sm" style={{ color: 'var(--ink)' }}>{opt.label}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ animation: 'fadeIn 0.5s ease' }}>
            <div className="text-5xl mb-6">✨</div>
            <p className="font-sans text-xs uppercase tracking-[0.28em] mb-3" style={{ color: 'var(--gold)' }}>{t('common.perfect_apartment')}</p>
            <h3 className="font-display italic font-light mb-4" style={{ fontSize: 'clamp(36px,5vw,72px)', color: 'var(--rust)', letterSpacing: '-0.025em' }}>
              {APT_NAMES[result]}
            </h3>
            <p className="font-sans font-light mb-10" style={{ color: 'var(--ink-muted)', fontSize: 16 }}>
              {APT_TAGLINES[result]}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to={`/apartamentos/${result}`}
                className="btn-primary flex items-center gap-2 justify-center px-8 py-4"
              >
                {t('cta.discoverMore')} {APT_NAMES[result]} <ArrowRight size={16} />
              </Link>
              <button
                onClick={reset}
                className="btn-outline flex items-center gap-2 justify-center px-8 py-4"
              >
                Volver a empezar
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
