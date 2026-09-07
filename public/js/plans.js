/* QUIZORA subscriptions — single source of truth (client + server via module.exports).
   Feature flags + limits per plan. Turkish-market pricing (₺). Yearly = per-month rate. */

(function () {
  const PLANS = {
    free: {
      id: 'free',
      name: { en: 'Free', ar: 'مجاني', tr: 'Ücretsiz' },
      tagline: { en: 'For casual games', ar: 'للمباريات العادية', tr: 'Keyifli oyunlar için' },
      priceTRY: { monthly: 0, yearly: 0 },
      players: 20,
      customMonthly: 0,
      recommendsRate: 0.5,
      features: {
        examPacks: false,
        customQuestions: false,
        weakTopics: false,
        reports: false,
        noBranding: false,
        customTheme: false,
        unlimitedPlayers: false,
        multiLang: true,
        stats: true,
        powerups: true,
      },
    },
    premium: {
      id: 'premium',
      name: { en: 'Premium', ar: 'بريميوم', tr: 'Premium' },
      tagline: { en: 'For serious students', ar: 'للطلاب الجادين', tr: 'Ciddi öğrenciler için' },
      priceTRY: { monthly: 99, yearly: 79 },
      players: 100,
      customMonthly: 50,
      recommendsRate: 0.55,
      features: {
        examPacks: true,
        customQuestions: true,
        weakTopics: true,
        reports: false,
        noBranding: true,
        customTheme: false,
        unlimitedPlayers: false,
        multiLang: true,
        stats: true,
        powerups: true,
      },
    },
    ultimate: {
      id: 'ultimate',
      name: { en: 'Ultimate', ar: 'الترايمت', tr: 'Ultimate' },
      tagline: { en: 'For classrooms & hosts', ar: 'للفصول والمضيفين', tr: 'Sınıflar ve ev sahipleri için' },
      priceTRY: { monthly: 249, yearly: 199 },
      players: null,
      customMonthly: Infinity,
      recommendsRate: 0.6,
      features: {
        examPacks: true,
        customQuestions: true,
        weakTopics: true,
        reports: true,
        noBranding: true,
        customTheme: true,
        unlimitedPlayers: true,
        multiLang: true,
        stats: true,
        powerups: true,
      },
    },
  };

  const ORDER = ['free', 'premium', 'ultimate'];

  function planGet(planId) {
    return PLANS[planId] || PLANS.free;
  }

  function planPrice(planId, interval) {
    const p = planGet(planId);
    return interval === 'yearly' ? p.priceTRY.yearly : p.priceTRY.monthly;
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { PLANS, ORDER, planGet, planPrice };
  }
  if (typeof window !== 'undefined') {
    window.PLANS = PLANS;
    window.PLAN_ORDER = ORDER;
    window.planGet = planGet;
    window.planPrice = planPrice;
  }
})();