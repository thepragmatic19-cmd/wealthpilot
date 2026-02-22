-- ============================================================
-- WealthPilot — Compte de démonstration complet
-- Persona : Sophie Tremblay, 34 ans, ingénieure logicielle
--
-- INSTRUCTIONS :
-- 1. Créer le compte sur /register avec demo@wealthpilot.ca / DemoWP2026!
-- 2. Coller ce script dans Supabase SQL Editor et exécuter
-- ============================================================

DO $$
DECLARE
  v_user_id     uuid;
  v_portfolio_id uuid;
BEGIN

  -- ── 0. Récupérer l'ID de l'utilisateur ───────────────────
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = 'demo@wealthpilot.ca';

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Utilisateur demo@wealthpilot.ca introuvable. Créez le compte d''abord sur /register.';
  END IF;

  RAISE NOTICE 'Seed pour user_id = %', v_user_id;

  -- ── 1. Profil ─────────────────────────────────────────────
  UPDATE profiles SET
    full_name           = 'Sophie Tremblay',
    onboarding_step     = 'completed',
    onboarding_completed = true,
    preferred_language  = 'fr',
    updated_at          = now() - interval '2 days'
  WHERE id = v_user_id;

  -- ── 2. Informations financières ───────────────────────────
  INSERT INTO client_info (
    user_id, age, profession, family_situation, dependents,
    annual_income, monthly_expenses, total_assets, total_debts,
    monthly_savings, investment_experience,
    has_celi, has_reer, has_reee,
    celi_balance, reer_balance, reee_balance,
    tax_bracket
  ) VALUES (
    v_user_id, 34, 'Ingénieure logicielle', 'célibataire', 0,
    95000.00, 3200.00, 70000.00, 8500.00,
    1500.00, 'intermédiaire',
    true, true, false,
    42000.00, 28000.00, 0.00,
    '53.31'
  )
  ON CONFLICT (user_id) DO UPDATE SET
    age                  = EXCLUDED.age,
    profession           = EXCLUDED.profession,
    family_situation     = EXCLUDED.family_situation,
    dependents           = EXCLUDED.dependents,
    annual_income        = EXCLUDED.annual_income,
    monthly_expenses     = EXCLUDED.monthly_expenses,
    total_assets         = EXCLUDED.total_assets,
    total_debts          = EXCLUDED.total_debts,
    monthly_savings      = EXCLUDED.monthly_savings,
    investment_experience = EXCLUDED.investment_experience,
    has_celi             = EXCLUDED.has_celi,
    has_reer             = EXCLUDED.has_reer,
    has_reee             = EXCLUDED.has_reee,
    celi_balance         = EXCLUDED.celi_balance,
    reer_balance         = EXCLUDED.reer_balance,
    reee_balance         = EXCLUDED.reee_balance,
    tax_bracket          = EXCLUDED.tax_bracket,
    updated_at           = now();

  -- ── 3. Évaluation du risque ───────────────────────────────
  INSERT INTO risk_assessments (
    user_id, answers, ai_follow_up_questions, ai_follow_up_answers,
    risk_score, risk_profile, ai_analysis, key_factors
  ) VALUES (
    v_user_id,
    '{"horizon": "long_terme", "reaction_baisse": "maintiens", "objectif_principal": "croissance", "connaissance": "intermediaire", "revenu_stable": true}'::jsonb,
    '[{"question": "Vous avez mentionné un horizon long terme. Prévoyez-vous des dépenses importantes dans les 5 prochaines années ?"},{"question": "Comment réagiriez-vous si votre portefeuille perdait 20% en 3 mois ?"}]'::jsonb,
    '[{"answer": "Oui, achat d''une propriété vers 2027, mais j''ai un fonds d''urgence séparé."},{"answer": "Je serais inquiète mais je maintiendrais mes cotisations — c''est une opportunité d''acheter à rabais."}]'::jsonb,
    7,
    'croissance',
    'Sophie présente un profil Croissance solide. Son horizon de placement long terme, sa stabilité professionnelle et sa capacité à maintenir les investissements lors de baisses de marché justifient une exposition importante aux actions (75-80%). Son objectif d''achat immobilier à court terme (2027) est bien isolé dans un fonds distinct, ce qui protège son portefeuille de croissance des besoins de liquidité à court terme. Je recommande une allocation 40% actions US / 25% actions CA / 15% actions internationales / 15% obligations / 5% liquidités.',
    '["Horizon long terme (>10 ans)", "Tolérance aux baisses confirmée", "Revenu stable et croissant", "Objectif immobilier isolé des placements", "Expérience intermédiaire en investissement"]'::jsonb
  );

  -- ── 4. Objectifs de vie ───────────────────────────────────
  INSERT INTO goals (user_id, type, label, target_amount, current_amount, target_date, priority, notes) VALUES
    (v_user_id, 'retraite',        'Retraite anticipée à 55 ans',    800000.00, 70000.00, '2045-01-01', 'haute',   'FIRE partiel — continuer à travailler à temps partiel après 55 ans'),
    (v_user_id, 'achat_maison',    'Mise de fonds — condo Montréal',  80000.00, 42000.00, '2027-06-01', 'haute',   'Cible : quartier Rosemont ou Plateau-Mont-Royal, budget ~450k$'),
    (v_user_id, 'fonds_urgence',   'Fonds d''urgence (6 mois)',       19200.00, 17500.00, NULL,         'moyenne', '6× dépenses mensuelles de 3 200$'),
    (v_user_id, 'liberté_financière', 'Indépendance financière',     600000.00, 70000.00, '2040-01-01', 'basse',   'Portfolio générant 2k$/mois de revenus passifs');

  -- ── 5. Portefeuille sélectionné ───────────────────────────
  INSERT INTO portfolios (
    user_id, type, name, description,
    expected_return, volatility, sharpe_ratio, max_drawdown,
    is_selected, ai_rationale, total_mer, tax_strategy, stress_test
  ) VALUES (
    v_user_id,
    'suggéré',
    'Portefeuille Croissance',
    'Portefeuille diversifié axé sur la croissance à long terme, optimisé fiscalement pour profil croissance (score 7/10).',
    7.50, 11.20, 0.49, 28.00,
    true,
    'Ce portefeuille est calibré pour votre profil Croissance (7/10). L''exposition de 80% aux actions offre un rendement attendu de 7,5% net annuellement sur votre horizon de 20+ ans. L''allocation 40% actions américaines capte la croissance mondiale via le marché le plus liquide. Les 15% en obligations ZAG.TO servent d''amortisseur lors des corrections sans sacrifier trop de rendement. La répartition CELI/REER est optimisée : les FNB à rendement élevé en REER pour les déductions fiscales immédiates, les actifs de croissance en CELI pour la croissance libre d''impôt.',
    0.10,
    'Maximiser le CELI annuellement (7 000$/an) avec les FNB de croissance (XUU.TO, XIC.TO). Loger ZAG.TO dans le REER pour les déductions fiscales sur obligations. Les dividendes étrangers de XEF.TO sont plus efficaces en REER (retenue à la source récupérable). CASH.TO en CELI pour les liquidités de la mise de fonds (retrait libre d''impôt).',
    '{"inflation_shock": "Impact limité — les actions et l''immobilier couvrent partiellement l''inflation. Rendement estimé : +2% vs baseline.", "market_crash": "Perte estimée de -22% à -26% en cas de krach -30% (protection partielle via ZAG.TO). Récupération prévue en 18-24 mois sur horizon long terme.", "interest_rate_hike": "Hausse de taux de +2% : impact négatif de -3% à -5% sur ZAG.TO, compensé partiellement par la résilience des actions. Impact net sur le portefeuille : -1,5%."}'::jsonb
  ) RETURNING id INTO v_portfolio_id;

  -- ── 6. Allocations du portefeuille ────────────────────────
  INSERT INTO portfolio_allocations (
    portfolio_id, asset_class, sub_class, instrument_name, instrument_ticker,
    weight, expected_return, description, suggested_account, mer, currency, isin
  ) VALUES
    (v_portfolio_id, 'Actions américaines',    'Marché total US',          'iShares Core S&P U.S. Total Market ETF',       'XUU.TO', 40.00, 9.50, 'Exposition au marché américain total (~4000 titres) via structure corporative, éliminant la retenue à la source sur dividendes.', 'REER', 0.07, 'CAD', 'CA46433M1077'),
    (v_portfolio_id, 'Actions canadiennes',    'Marché total CA',          'iShares Core S&P/TSX Capped Composite ETF',    'XIC.TO', 25.00, 7.50, 'Cœur du marché canadien, 240+ titres, faibles frais. Avantage fiscal sur dividendes canadiens en compte non enregistré.', 'CELI', 0.06, 'CAD', 'CA46433G1019'),
    (v_portfolio_id, 'Actions internationales', 'Marchés développés ex-NA', 'iShares Core MSCI EAFE IMI Index ETF',         'XEF.TO', 15.00, 8.00, 'Marchés développés Europe/Asie/Australie. Diversification géographique hors Amérique du Nord.', 'REER', 0.22, 'CAD', 'CA46436R2063'),
    (v_portfolio_id, 'Obligations canadiennes', 'Marché total CA',         'BMO Aggregate Bond Index ETF',                 'ZAG.TO', 15.00, 3.20, 'Obligations gouvernementales et corporatives canadiennes. Amortisseur de volatilité, corrélation négative avec les actions en période de crise.', 'REER', 0.09, 'CAD', 'CA05590A1049'),
    (v_portfolio_id, 'Liquidités',              NULL,                      'Evolve High Interest Savings Account ETF',     'CASH.TO',  5.00, 4.80, 'Équivalent épargne à taux élevé, capital préservé. Réservé pour la mise de fonds 2027 — retrait libre d''impôt du CELI.', 'CELI', 0.14, 'CAD', 'CA30074Q1054');

  -- ── 7. Historique de transactions (6 mois) ───────────────
  INSERT INTO transactions (
    user_id, portfolio_id, type, instrument_ticker, instrument_name,
    quantity, price, amount, account, notes, executed_at
  ) VALUES
    -- Septembre 2025 — constitution initiale du portefeuille
    (v_user_id, v_portfolio_id, 'achat', 'XUU.TO', 'iShares Core S&P U.S. Total Market ETF',
     45.00, 44.50, 2002.50, 'REER', 'Constitution initiale — actions américaines', '2025-09-15 10:30:00'),
    (v_user_id, v_portfolio_id, 'achat', 'XIC.TO', 'iShares Core S&P/TSX Capped Composite ETF',
     40.00, 36.80, 1472.00, 'CELI', 'Constitution initiale — actions canadiennes', '2025-09-15 10:35:00'),
    (v_user_id, v_portfolio_id, 'achat', 'ZAG.TO', 'BMO Aggregate Bond Index ETF',
     80.00, 14.20, 1136.00, 'REER', 'Constitution initiale — obligations', '2025-09-15 10:40:00'),
    (v_user_id, v_portfolio_id, 'achat', 'CASH.TO', 'Evolve High Interest Savings Account ETF',
     4.00, 50.10, 200.40, 'CELI', 'Liquidités mise de fonds', '2025-09-15 10:45:00'),

    -- Octobre 2025 — cotisation mensuelle
    (v_user_id, v_portfolio_id, 'cotisation', 'XUU.TO', 'iShares Core S&P U.S. Total Market ETF',
     13.00, 46.20, 600.60, 'REER', 'Cotisation mensuelle — octobre', '2025-10-15 09:00:00'),
    (v_user_id, v_portfolio_id, 'cotisation', 'XIC.TO', 'iShares Core S&P/TSX Capped Composite ETF',
     10.00, 37.50, 375.00, 'CELI', 'Cotisation mensuelle — octobre', '2025-10-15 09:05:00'),
    (v_user_id, v_portfolio_id, 'dividende', 'XIC.TO', 'iShares Core S&P/TSX Capped Composite ETF',
     NULL, NULL, 38.40, 'CELI', 'Distribution trimestrielle XIC.TO', '2025-10-20 16:00:00'),

    -- Novembre 2025
    (v_user_id, v_portfolio_id, 'cotisation', 'XUU.TO', 'iShares Core S&P U.S. Total Market ETF',
     12.00, 47.80, 573.60, 'REER', 'Cotisation mensuelle — novembre', '2025-11-15 09:00:00'),
    (v_user_id, v_portfolio_id, 'cotisation', 'XEF.TO', 'iShares Core MSCI EAFE IMI Index ETF',
     8.00, 35.10, 280.80, 'REER', 'Cotisation mensuelle — novembre', '2025-11-15 09:10:00'),
    (v_user_id, v_portfolio_id, 'dividende', 'ZAG.TO', 'BMO Aggregate Bond Index ETF',
     NULL, NULL, 22.50, 'REER', 'Distribution mensuelle obligations', '2025-11-30 16:00:00'),

    -- Décembre 2025 — rééquilibrage fin d'année
    (v_user_id, v_portfolio_id, 'cotisation', 'XUU.TO', 'iShares Core S&P U.S. Total Market ETF',
     10.00, 49.20, 492.00, 'REER', 'Cotisation mensuelle — décembre', '2025-12-15 09:00:00'),
    (v_user_id, v_portfolio_id, 'rééquilibrage', 'XIC.TO', 'iShares Core S&P/TSX Capped Composite ETF',
     NULL, NULL, 0.00, 'CELI', 'Rééquilibrage annuel — retour aux pondérations cibles', '2025-12-28 14:00:00'),

    -- Janvier 2026 — nouvel an fiscal
    (v_user_id, v_portfolio_id, 'cotisation', 'CASH.TO', 'Evolve High Interest Savings Account ETF',
     10.00, 50.15, 501.50, 'CELI', 'Cotisation CELI 2026 — liquidités mise de fonds', '2026-01-02 09:30:00'),
    (v_user_id, v_portfolio_id, 'cotisation', 'XUU.TO', 'iShares Core S&P U.S. Total Market ETF',
     14.00, 50.10, 701.40, 'REER', 'Cotisation mensuelle — janvier 2026', '2026-01-15 09:00:00'),
    (v_user_id, v_portfolio_id, 'dividende', 'XIC.TO', 'iShares Core S&P/TSX Capped Composite ETF',
     NULL, NULL, 41.20, 'CELI', 'Distribution trimestrielle XIC.TO', '2026-01-20 16:00:00'),

    -- Février 2026
    (v_user_id, v_portfolio_id, 'cotisation', 'XUU.TO', 'iShares Core S&P U.S. Total Market ETF',
     12.00, 51.30, 615.60, 'REER', 'Cotisation mensuelle — février 2026', '2026-02-15 09:00:00'),
    (v_user_id, v_portfolio_id, 'cotisation', 'ZAG.TO', 'BMO Aggregate Bond Index ETF',
     20.00, 14.10, 282.00, 'REER', 'Renflouement obligations après hausse des taux', '2026-02-15 09:15:00'),
    (v_user_id, v_portfolio_id, 'dividende', 'ZAG.TO', 'BMO Aggregate Bond Index ETF',
     NULL, NULL, 25.80, 'REER', 'Distribution mensuelle obligations', '2026-02-28 16:00:00');

  -- ── 8. Notifications ─────────────────────────────────────
  INSERT INTO notifications (user_id, type, title, message, severity, is_read, action_url) VALUES
    (v_user_id, 'rééquilibrage', 'Rééquilibrage recommandé', 'Vos actions américaines représentent maintenant 43% de votre portefeuille (cible : 40%). Un rééquilibrage mineur est suggéré.', 'warning', false, '/portfolio'),
    (v_user_id, 'objectif', 'Objectif mise de fonds : 53% atteint!', 'Vous avez accumulé 42 000$ sur votre objectif de 80 000$ pour la mise de fonds. À ce rythme, vous atteignez votre cible en juillet 2027.', 'success', false, '/portfolio'),
    (v_user_id, 'fiscal', 'Cotisation REER — délai approche', 'La date limite de cotisation REER 2025 est le 3 mars 2026. Vous avez des droits non utilisés. Consultez votre avis de cotisation.', 'warning', true, '/fiscal'),
    (v_user_id, 'marché', 'Taux directeur — impact sur ZAG.TO', 'La Banque du Canada a maintenu son taux à 3,25%. Impact neutre sur vos obligations à court terme. Votre portefeuille reste dans les cibles.', 'info', true, '/portfolio'),
    (v_user_id, 'système', 'Bienvenue sur WealthPilot Pro!', 'Votre compte est actif. Explorez le Chat IA pour des conseils personnalisés, et la section Planification fiscale pour optimiser vos comptes enregistrés.', 'info', true, '/dashboard');

  -- ── 9. Insights IA ────────────────────────────────────────
  INSERT INTO ai_insights (user_id, type, title, content, priority, is_read, metadata, expires_at) VALUES
    (v_user_id,
     'portfolio_alert',
     'Dérive d''allocation détectée',
     'Vos actions américaines (XUU.TO) ont progressé de +8,2% depuis le dernier rééquilibrage et représentent maintenant 43% de votre portefeuille vs une cible de 40%. Avec une dérive de 3 points, un rééquilibrage reste optionnel mais à surveiller. Si la pondération dépasse 45%, un rééquilibrage est conseillé pour maintenir votre profil de risque cible.',
     'normal', false,
     '{"ticker": "XUU.TO", "current_weight": 43, "target_weight": 40}'::jsonb,
     now() + interval '30 days'),

    (v_user_id,
     'tax_optimization',
     'Optimisation fiscale REER 2025',
     'Votre revenu imposable de 95 000$ vous place dans la tranche marginale de 53,31% (fédéral + Québec). Une cotisation REER supplémentaire de 5 000$ vous ferait économiser environ 2 665$ en impôts pour 2025. La date limite est le 3 mars 2026. Vos droits de cotisation inutilisés sont disponibles sur Mon ARC.',
     'high', false,
     '{"potential_savings": 2665, "marginal_rate": 53.31, "deadline": "2026-03-03"}'::jsonb,
     '2026-03-03 23:59:00'),

    (v_user_id,
     'goal_progress',
     'Mise de fonds : en avance sur le calendrier',
     'Félicitations! Votre progression vers la mise de fonds (53%) est en avance de 4 mois sur le calendrier prévu. Si vous maintenez vos cotisations mensuelles de 1 500$, vous atteignez 80 000$ en juin 2027, soit 6 mois avant votre cible de décembre 2027. Votre CASH.TO en CELI maximise le rendement tout en gardant les fonds facilement accessibles.',
     'normal', false,
     '{"goal": "achat_maison", "on_track_months": 4}'::jsonb,
     now() + interval '60 days'),

    (v_user_id,
     'rebalancing',
     'Stratégie de rééquilibrage suggérée',
     'Voici une stratégie de rééquilibrage sans frais : orientez vos prochaines cotisations mensuelles uniquement vers ZAG.TO et XEF.TO jusqu''à ce que les pondérations reviennent aux cibles. Cette approche évite de vendre des positions (pas de gains en capital, pas de frais de transaction) et est idéale pour votre horizon long terme.',
     'low', true,
     '{"strategy": "cash_flow_rebalancing"}'::jsonb,
     now() + interval '90 days'),

    (v_user_id,
     'market_update',
     'Marché canadien : contexte favorable pour XIC.TO',
     'Le secteur de l''énergie et des financières (deux piliers du TSX) affiche de bonnes performances ce trimestre. Votre allocation de 25% en actions canadiennes (XIC.TO) bénéficie de ce contexte. Les dividendes canadiens conservent leur avantage fiscal en compte non enregistré grâce au crédit d''impôt pour dividendes.',
     'low', true,
     '{}'::jsonb,
     now() + interval '14 days');

  -- ── 10. Messages de chat (historique IA) ─────────────────
  INSERT INTO chat_messages (user_id, role, content, created_at) VALUES
    (v_user_id, 'user',
     'Bonjour! Je viens de finir l''évaluation. Mon profil est "Croissance" avec un score de 7/10. Est-ce que le portefeuille suggéré est vraiment adapté pour moi?',
     now() - interval '5 days'),
    (v_user_id, 'assistant',
     'Bonjour Sophie! Absolument, le Portefeuille Croissance est bien calibré pour votre profil. Voici pourquoi :

**Pourquoi ce portefeuille vous convient:**
- Votre horizon de **20+ ans** jusqu''à la retraite à 55 ans permet d''absorber les cycles de marché
- Votre score de **7/10** confirme une tolérance au risque au-dessus de la moyenne
- Votre revenu stable (95k$/an) vous permet de maintenir les cotisations même en période de baisse

**Points forts de votre allocation:**
- **40% XUU.TO** : capturer la croissance mondiale via les 4 000+ titres US
- **25% XIC.TO** : exposition domestique avec avantage fiscal sur dividendes
- **15% ZAG.TO** : amortisseur qui se valorise lors des crises actions (corrélation négative)

La volatilité de 11,2% signifie que vous pouvez voir des fluctuations de ±11% par an — c''est normal et attendu pour votre profil.

Avez-vous des questions sur une allocation spécifique?',
     now() - interval '5 days' + interval '2 minutes'),
    (v_user_id, 'user',
     'Pourquoi mettre XUU.TO dans le REER plutôt que dans le CELI?',
     now() - interval '4 days'),
    (v_user_id, 'assistant',
     'Excellente question de fiscalité! C''est une optimisation importante.

**Règle des "actifs les plus efficients fiscalement en CELI":**

📌 **XUU.TO dans le REER** : Les ETF américains versent des dividendes soumis à une **retenue à la source de 15%**. Dans un REER, cette retenue est récupérée grâce à la convention fiscale Canada-États-Unis. Dans un CELI, cette retenue de 15% est définitivement perdue.

📌 **XIC.TO dans le CELI** : Les dividendes canadiens bénéficient du **crédit d''impôt pour dividendes** — peu d''avantage à les protéger dans un compte enregistré. Mieux en CELI pour la croissance libre d''impôt lors du retrait.

📌 **CASH.TO dans le CELI** : Vos liquidités pour la mise de fonds. Retrait du CELI = **100% libre d''impôt**, parfait pour le projet immobilier 2027.

**Résumé simplifié :**
- REER : actifs à rendement élevé avec déduction immédiate (revenus imposables US/intl)
- CELI : actifs de croissance CA + liquidités (retraits toujours libres d''impôt)

Cette stratégie peut vous faire économiser 500-800$/an en impôts vs une allocation non optimisée.',
     now() - interval '4 days' + interval '3 minutes'),
    (v_user_id, 'user',
     'Si les marchés chutent de 30% demain, combien je perdrai approximativement?',
     now() - interval '2 days'),
    (v_user_id, 'assistant',
     'Bonne question — voici une estimation réaliste basée sur votre portefeuille actuel (~70 000$) :

**Scénario krach -30% (type 2008-2009, mars 2020) :**

| Composante | Poids | Impact estimé |
|---|---|---|
| XUU.TO (40%) | -28% | -7 840$ |
| XIC.TO (25%) | -25% | -4 375$ |
| XEF.TO (15%) | -26% | -2 730$ |
| ZAG.TO (15%) | **+4%** | +420$ |
| CASH.TO (5%) | 0% | 0$ |

**Impact net estimé : -14 525$ (-20,8% vs -30%)**

Votre portefeuille est protégé à ~31% grâce à ZAG.TO et CASH.TO.

**Perspective importante :**
- Après le krach de 2020 : les marchés ont récupéré en **6 mois**
- Après 2008-2009 : récupération complète en **3-4 ans**
- À votre horizon de 20 ans : chaque krach historique a été suivi d''un nouveau sommet

**Mon conseil concret :** En cas de baisse >20%, maintenez vos cotisations mensuelles — vous achetez plus d''unités à prix réduit (cost averaging). C''est votre plus grand avantage en tant que jeune investisseure.',
     now() - interval '2 days' + interval '4 minutes');

  -- ── 11. Abonnement Pro (pour tester toutes les fonctionnalités) ──
  INSERT INTO subscriptions (user_id, plan, status, current_period_start, current_period_end)
  VALUES (v_user_id, 'pro', 'active', now(), now() + interval '1 year')
  ON CONFLICT (user_id) DO UPDATE SET
    plan   = 'pro',
    status = 'active',
    current_period_start = now(),
    current_period_end   = now() + interval '1 year',
    updated_at           = now();

  RAISE NOTICE '✅ Seed terminé avec succès pour Sophie Tremblay (%)!', v_user_id;
  RAISE NOTICE '   → Portfolio ID : %', v_portfolio_id;
  RAISE NOTICE '   → 5 allocations | 18 transactions | 5 notifications | 5 insights | 5 messages chat';

END $$;
