import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://urdsvyzkgrmilyekzyca.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVyZHN2eXprZ3JtaWx5ZWt6eWNhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDU4OTI5MSwiZXhwIjoyMDg2MTY1MjkxfQ.vNl-7Y2Zmu8TQ6rXeIdPywcpfO6jx4AR3LA_FmraztY';
const DEMO_EMAIL = 'demo@wealthpilot.ca';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function ok(label, data) {
  console.log(`  ✅ ${label}`);
  return data;
}
function fail(label, error) {
  console.error(`  ❌ ${label}: ${error?.message || JSON.stringify(error)}`);
  process.exit(1);
}

// ── 0. Récupérer l'utilisateur ─────────────────────────────
console.log(`\n🔍  Recherche de ${DEMO_EMAIL}...`);
const { data: { users }, error: listErr } = await supabase.auth.admin.listUsers();
if (listErr) fail('listUsers', listErr);

const user = users.find(u => u.email === DEMO_EMAIL);
if (!user) {
  console.error(`\n❌  Utilisateur "${DEMO_EMAIL}" introuvable.`);
  console.error('   → Créez d\'abord le compte sur http://localhost:3000/register\n');
  process.exit(1);
}
const uid = user.id;
ok(`Utilisateur trouvé : ${uid}`, uid);

// ── 1. Profil ──────────────────────────────────────────────
console.log('\n📋  Profil...');
const { error: profErr } = await supabase.from('profiles').update({
  full_name: 'Sophie Tremblay',
  onboarding_step: 'completed',
  onboarding_completed: true,
  preferred_language: 'fr',
  updated_at: new Date(Date.now() - 2 * 86400000).toISOString(),
}).eq('id', uid);
if (profErr) fail('profiles.update', profErr);
ok('Profil mis à jour', null);

// ── 2. Informations financières ────────────────────────────
console.log('\n💰  Informations financières...');
const { error: ciErr } = await supabase.from('client_info').upsert({
  user_id: uid,
  age: 34,
  profession: 'Ingénieure logicielle',
  family_situation: 'célibataire',
  dependents: 0,
  annual_income: 95000,
  monthly_expenses: 3200,
  total_assets: 70000,
  total_debts: 8500,
  monthly_savings: 1500,
  investment_experience: 'intermédiaire',
  has_celi: true,
  has_reer: true,
  has_reee: false,
  celi_balance: 42000,
  reer_balance: 28000,
  reee_balance: 0,
  tax_bracket: '53.31',
}, { onConflict: 'user_id' });
if (ciErr) fail('client_info.upsert', ciErr);
ok('Informations financières', null);

// ── 3. Évaluation du risque ────────────────────────────────
console.log('\n🎯  Évaluation du risque...');
const { error: raErr } = await supabase.from('risk_assessments').insert({
  user_id: uid,
  answers: { horizon: 'long_terme', reaction_baisse: 'maintiens', objectif_principal: 'croissance', connaissance: 'intermediaire', revenu_stable: true },
  ai_follow_up_questions: [
    { question: 'Vous avez mentionné un horizon long terme. Prévoyez-vous des dépenses importantes dans les 5 prochaines années ?' },
    { question: 'Comment réagiriez-vous si votre portefeuille perdait 20% en 3 mois ?' },
  ],
  ai_follow_up_answers: [
    { answer: "Oui, achat d'une propriété vers 2027, mais j'ai un fonds d'urgence séparé." },
    { answer: "Je serais inquiète mais je maintiendrais mes cotisations — c'est une opportunité d'acheter à rabais." },
  ],
  risk_score: 7,
  risk_profile: 'croissance',
  ai_analysis: "Sophie présente un profil Croissance solide. Son horizon de placement long terme, sa stabilité professionnelle et sa capacité à maintenir les investissements lors de baisses de marché justifient une exposition importante aux actions (75-80%). Son objectif d'achat immobilier à court terme (2027) est bien isolé dans un fonds distinct, ce qui protège son portefeuille de croissance des besoins de liquidité à court terme.",
  key_factors: ['Horizon long terme (>10 ans)', 'Tolérance aux baisses confirmée', 'Revenu stable et croissant', 'Objectif immobilier isolé des placements', 'Expérience intermédiaire en investissement'],
});
if (raErr) fail('risk_assessments.insert', raErr);
ok('Évaluation du risque', null);

// ── 4. Objectifs de vie ────────────────────────────────────
console.log('\n🏆  Objectifs de vie...');
const { error: goalsErr } = await supabase.from('goals').insert([
  { user_id: uid, type: 'retraite',           label: 'Retraite anticipée à 55 ans',     target_amount: 800000, current_amount: 70000, target_date: '2045-01-01', priority: 'haute',   notes: 'FIRE partiel — continuer à travailler à temps partiel après 55 ans' },
  { user_id: uid, type: 'achat_maison',       label: 'Mise de fonds — condo Montréal',  target_amount: 80000,  current_amount: 42000, target_date: '2027-06-01', priority: 'haute',   notes: "Cible : quartier Rosemont ou Plateau-Mont-Royal, budget ~450k$" },
  { user_id: uid, type: 'fonds_urgence',      label: "Fonds d'urgence (6 mois)",        target_amount: 19200,  current_amount: 17500, target_date: null,         priority: 'moyenne', notes: '6× dépenses mensuelles de 3 200$' },
  { user_id: uid, type: 'liberté_financière', label: 'Indépendance financière',         target_amount: 600000, current_amount: 70000, target_date: '2040-01-01', priority: 'basse',   notes: 'Portfolio générant 2k$/mois de revenus passifs' },
]);
if (goalsErr) fail('goals.insert', goalsErr);
ok('4 objectifs insérés', null);

// ── 5. Portefeuille ────────────────────────────────────────
console.log('\n📈  Portefeuille...');
const { data: portData, error: portErr } = await supabase.from('portfolios').insert({
  user_id: uid,
  type: 'suggéré',
  name: 'Portefeuille Croissance',
  description: 'Portefeuille diversifié axé sur la croissance à long terme, optimisé fiscalement pour profil croissance (score 7/10).',
  expected_return: 7.50,
  volatility: 11.20,
  sharpe_ratio: 0.49,
  max_drawdown: 28.00,
  is_selected: true,
  ai_rationale: "Ce portefeuille est calibré pour votre profil Croissance (7/10). L'exposition de 80% aux actions offre un rendement attendu de 7,5% net annuellement sur votre horizon de 20+ ans.",
  total_mer: 0.10,
  tax_strategy: "Maximiser le CELI annuellement (7 000$/an) avec les FNB de croissance (XUU.TO, XIC.TO). Loger ZAG.TO dans le REER pour les déductions fiscales sur obligations. Les dividendes étrangers de XEF.TO sont plus efficaces en REER (retenue à la source récupérable). CASH.TO en CELI pour les liquidités de la mise de fonds (retrait libre d'impôt).",
  stress_test: {
    inflation_shock: "Impact limité — les actions et l'immobilier couvrent partiellement l'inflation. Rendement estimé : +2% vs baseline.",
    market_crash: "Perte estimée de -22% à -26% en cas de krach -30% (protection partielle via ZAG.TO). Récupération prévue en 18-24 mois sur horizon long terme.",
    interest_rate_hike: "Hausse de taux de +2% : impact négatif de -3% à -5% sur ZAG.TO, compensé partiellement par la résilience des actions. Impact net sur le portefeuille : -1,5%.",
  },
}).select('id').single();
if (portErr) fail('portfolios.insert', portErr);
const portfolioId = portData.id;
ok(`Portefeuille créé : ${portfolioId}`, null);

// ── 6. Allocations ─────────────────────────────────────────
console.log('\n🥧  Allocations...');
const { error: allocErr } = await supabase.from('portfolio_allocations').insert([
  { portfolio_id: portfolioId, asset_class: 'Actions américaines',    sub_class: 'Marché total US',           instrument_name: 'iShares Core S&P U.S. Total Market ETF',    instrument_ticker: 'XUU.TO', weight: 40, expected_return: 9.50, suggested_account: 'REER',           mer: 0.07, currency: 'CAD', isin: 'CA46433M1077', description: "Exposition au marché américain total (~4000 titres), retenue à la source récupérée en REER." },
  { portfolio_id: portfolioId, asset_class: 'Actions canadiennes',    sub_class: 'Marché total CA',           instrument_name: 'iShares Core S&P/TSX Capped Composite ETF', instrument_ticker: 'XIC.TO', weight: 25, expected_return: 7.50, suggested_account: 'CELI',           mer: 0.06, currency: 'CAD', isin: 'CA46433G1019', description: "Cœur du marché canadien, 240+ titres, faibles frais." },
  { portfolio_id: portfolioId, asset_class: 'Actions internationales', sub_class: 'Marchés développés ex-NA', instrument_name: 'iShares Core MSCI EAFE IMI Index ETF',         instrument_ticker: 'XEF.TO', weight: 15, expected_return: 8.00, suggested_account: 'REER',           mer: 0.22, currency: 'CAD', isin: 'CA46436R2063', description: "Marchés développés Europe/Asie/Australie." },
  { portfolio_id: portfolioId, asset_class: 'Obligations canadiennes', sub_class: 'Marché total CA',           instrument_name: 'BMO Aggregate Bond Index ETF',                 instrument_ticker: 'ZAG.TO', weight: 15, expected_return: 3.20, suggested_account: 'REER',           mer: 0.09, currency: 'CAD', isin: 'CA05590A1049', description: "Obligations gouvernementales et corporatives canadiennes." },
  { portfolio_id: portfolioId, asset_class: 'Liquidités',              sub_class: null,                       instrument_name: 'Evolve High Interest Savings Account ETF',     instrument_ticker: 'CASH.TO',weight:  5, expected_return: 4.80, suggested_account: 'CELI',           mer: 0.14, currency: 'CAD', isin: 'CA30074Q1054', description: "Équivalent épargne à taux élevé, capital préservé pour mise de fonds 2027." },
]);
if (allocErr) fail('portfolio_allocations.insert', allocErr);
ok('5 allocations insérées', null);

// ── 7. Transactions (6 mois) ───────────────────────────────
console.log('\n💳  Transactions...');
const txs = [
  { user_id: uid, portfolio_id: portfolioId, type: 'achat',         instrument_ticker: 'XUU.TO', instrument_name: 'iShares Core S&P U.S. Total Market ETF',    quantity: 45,   price: 44.50, amount: 2002.50, account: 'REER', notes: 'Constitution initiale',                   executed_at: '2025-09-15T10:30:00Z' },
  { user_id: uid, portfolio_id: portfolioId, type: 'achat',         instrument_ticker: 'XIC.TO', instrument_name: 'iShares Core S&P/TSX Capped Composite ETF', quantity: 40,   price: 36.80, amount: 1472.00, account: 'CELI', notes: 'Constitution initiale',                   executed_at: '2025-09-15T10:35:00Z' },
  { user_id: uid, portfolio_id: portfolioId, type: 'achat',         instrument_ticker: 'ZAG.TO', instrument_name: 'BMO Aggregate Bond Index ETF',                quantity: 80,   price: 14.20, amount: 1136.00, account: 'REER', notes: 'Constitution initiale',                   executed_at: '2025-09-15T10:40:00Z' },
  { user_id: uid, portfolio_id: portfolioId, type: 'achat',         instrument_ticker: 'CASH.TO',instrument_name: 'Evolve High Interest Savings Account ETF',   quantity: 4,    price: 50.10, amount: 200.40,  account: 'CELI', notes: 'Liquidités mise de fonds',                executed_at: '2025-09-15T10:45:00Z' },
  { user_id: uid, portfolio_id: portfolioId, type: 'cotisation',    instrument_ticker: 'XUU.TO', instrument_name: 'iShares Core S&P U.S. Total Market ETF',    quantity: 13,   price: 46.20, amount: 600.60,  account: 'REER', notes: 'Cotisation mensuelle — octobre',           executed_at: '2025-10-15T09:00:00Z' },
  { user_id: uid, portfolio_id: portfolioId, type: 'cotisation',    instrument_ticker: 'XIC.TO', instrument_name: 'iShares Core S&P/TSX Capped Composite ETF', quantity: 10,   price: 37.50, amount: 375.00,  account: 'CELI', notes: 'Cotisation mensuelle — octobre',           executed_at: '2025-10-15T09:05:00Z' },
  { user_id: uid, portfolio_id: portfolioId, type: 'dividende',     instrument_ticker: 'XIC.TO', instrument_name: 'iShares Core S&P/TSX Capped Composite ETF', quantity: null, price: null,  amount: 38.40,   account: 'CELI', notes: 'Distribution trimestrielle XIC.TO',        executed_at: '2025-10-20T16:00:00Z' },
  { user_id: uid, portfolio_id: portfolioId, type: 'cotisation',    instrument_ticker: 'XUU.TO', instrument_name: 'iShares Core S&P U.S. Total Market ETF',    quantity: 12,   price: 47.80, amount: 573.60,  account: 'REER', notes: 'Cotisation mensuelle — novembre',          executed_at: '2025-11-15T09:00:00Z' },
  { user_id: uid, portfolio_id: portfolioId, type: 'cotisation',    instrument_ticker: 'XEF.TO', instrument_name: 'iShares Core MSCI EAFE IMI Index ETF',       quantity: 8,    price: 35.10, amount: 280.80,  account: 'REER', notes: 'Cotisation mensuelle — novembre',          executed_at: '2025-11-15T09:10:00Z' },
  { user_id: uid, portfolio_id: portfolioId, type: 'dividende',     instrument_ticker: 'ZAG.TO', instrument_name: 'BMO Aggregate Bond Index ETF',                quantity: null, price: null,  amount: 22.50,   account: 'REER', notes: 'Distribution mensuelle obligations',      executed_at: '2025-11-30T16:00:00Z' },
  { user_id: uid, portfolio_id: portfolioId, type: 'cotisation',    instrument_ticker: 'XUU.TO', instrument_name: 'iShares Core S&P U.S. Total Market ETF',    quantity: 10,   price: 49.20, amount: 492.00,  account: 'REER', notes: 'Cotisation mensuelle — décembre',          executed_at: '2025-12-15T09:00:00Z' },
  { user_id: uid, portfolio_id: portfolioId, type: 'rééquilibrage', instrument_ticker: 'XIC.TO', instrument_name: 'iShares Core S&P/TSX Capped Composite ETF', quantity: null, price: null,  amount: 0,       account: 'CELI', notes: 'Rééquilibrage annuel — retour aux cibles',  executed_at: '2025-12-28T14:00:00Z' },
  { user_id: uid, portfolio_id: portfolioId, type: 'cotisation',    instrument_ticker: 'CASH.TO',instrument_name: 'Evolve High Interest Savings Account ETF',   quantity: 10,   price: 50.15, amount: 501.50,  account: 'CELI', notes: 'Cotisation CELI 2026 — liquidités mise de fonds', executed_at: '2026-01-02T09:30:00Z' },
  { user_id: uid, portfolio_id: portfolioId, type: 'cotisation',    instrument_ticker: 'XUU.TO', instrument_name: 'iShares Core S&P U.S. Total Market ETF',    quantity: 14,   price: 50.10, amount: 701.40,  account: 'REER', notes: 'Cotisation mensuelle — janvier 2026',      executed_at: '2026-01-15T09:00:00Z' },
  { user_id: uid, portfolio_id: portfolioId, type: 'dividende',     instrument_ticker: 'XIC.TO', instrument_name: 'iShares Core S&P/TSX Capped Composite ETF', quantity: null, price: null,  amount: 41.20,   account: 'CELI', notes: 'Distribution trimestrielle XIC.TO',        executed_at: '2026-01-20T16:00:00Z' },
  { user_id: uid, portfolio_id: portfolioId, type: 'cotisation',    instrument_ticker: 'XUU.TO', instrument_name: 'iShares Core S&P U.S. Total Market ETF',    quantity: 12,   price: 51.30, amount: 615.60,  account: 'REER', notes: 'Cotisation mensuelle — février 2026',      executed_at: '2026-02-15T09:00:00Z' },
  { user_id: uid, portfolio_id: portfolioId, type: 'cotisation',    instrument_ticker: 'ZAG.TO', instrument_name: 'BMO Aggregate Bond Index ETF',                quantity: 20,   price: 14.10, amount: 282.00,  account: 'REER', notes: 'Renflouement obligations après hausse taux', executed_at: '2026-02-15T09:15:00Z' },
  { user_id: uid, portfolio_id: portfolioId, type: 'dividende',     instrument_ticker: 'ZAG.TO', instrument_name: 'BMO Aggregate Bond Index ETF',                quantity: null, price: null,  amount: 25.80,   account: 'REER', notes: 'Distribution mensuelle obligations',      executed_at: '2026-02-28T16:00:00Z' },
];
const { error: txErr } = await supabase.from('transactions').insert(txs);
if (txErr) fail('transactions.insert', txErr);
ok(`${txs.length} transactions insérées`, null);

// ── 8. Notifications ───────────────────────────────────────
console.log('\n🔔  Notifications...');
const { error: notifErr } = await supabase.from('notifications').insert([
  { user_id: uid, type: 'rééquilibrage', title: 'Rééquilibrage recommandé', message: 'Vos actions américaines représentent maintenant 43% de votre portefeuille (cible : 40%). Un rééquilibrage mineur est suggéré.', severity: 'warning', is_read: false, action_url: '/portfolio' },
  { user_id: uid, type: 'objectif', title: 'Objectif mise de fonds : 53% atteint!', message: 'Vous avez accumulé 42 000$ sur votre objectif de 80 000$. À ce rythme, vous atteignez votre cible en juillet 2027.', severity: 'success', is_read: false, action_url: '/portfolio' },
  { user_id: uid, type: 'fiscal', title: 'Cotisation REER — délai approche', message: 'La date limite de cotisation REER 2025 est le 3 mars 2026. Vous avez des droits non utilisés. Consultez votre avis de cotisation.', severity: 'warning', is_read: true, action_url: '/fiscal' },
  { user_id: uid, type: 'marché', title: 'Taux directeur — impact sur ZAG.TO', message: 'La Banque du Canada a maintenu son taux à 3,25%. Impact neutre sur vos obligations. Votre portefeuille reste dans les cibles.', severity: 'info', is_read: true, action_url: '/portfolio' },
  { user_id: uid, type: 'système', title: 'Bienvenue sur WealthPilot!', message: 'Votre compte est actif. Explorez le Chat IA pour des conseils personnalisés, et la section Planification fiscale.', severity: 'info', is_read: true, action_url: '/dashboard' },
]);
if (notifErr) fail('notifications.insert', notifErr);
ok('5 notifications insérées', null);

// ── 9. Insights IA ─────────────────────────────────────────
console.log('\n🤖  Insights IA...');
const now = new Date();
const { error: insightErr } = await supabase.from('ai_insights').insert([
  { user_id: uid, type: 'portfolio_alert',   title: "Dérive d'allocation détectée",      content: "Vos actions américaines (XUU.TO) représentent maintenant 43% vs une cible de 40%. Un rééquilibrage reste optionnel mais à surveiller.", priority: 'normal', is_read: false, metadata: { ticker: 'XUU.TO', current_weight: 43, target_weight: 40 }, expires_at: new Date(+now + 30*86400000).toISOString() },
  { user_id: uid, type: 'tax_optimization',  title: 'Optimisation fiscale REER 2025',    content: "Votre revenu imposable de 95 000$ vous place dans la tranche marginale de 53,31%. Une cotisation REER supplémentaire de 5 000$ vous ferait économiser environ 2 665$ en impôts.", priority: 'high',   is_read: false, metadata: { potential_savings: 2665, marginal_rate: 53.31, deadline: '2026-03-03' }, expires_at: '2026-03-03T23:59:00Z' },
  { user_id: uid, type: 'goal_progress',     title: 'Mise de fonds : en avance!',        content: "Félicitations! Votre progression vers la mise de fonds (53%) est en avance de 4 mois sur le calendrier prévu. Vous atteignez 80 000$ en juin 2027.", priority: 'normal', is_read: false, metadata: { goal: 'achat_maison', on_track_months: 4 }, expires_at: new Date(+now + 60*86400000).toISOString() },
  { user_id: uid, type: 'rebalancing',       title: 'Stratégie de rééquilibrage',        content: "Rééquilibrage sans frais : orientez vos prochaines cotisations vers ZAG.TO et XEF.TO jusqu'au retour aux pondérations cibles. Évite de vendre des positions.", priority: 'low',    is_read: true,  metadata: { strategy: 'cash_flow_rebalancing' }, expires_at: new Date(+now + 90*86400000).toISOString() },
  { user_id: uid, type: 'market_update',     title: 'Marché CA : contexte favorable',    content: "Le secteur de l'énergie et des financières affiche de bonnes performances. Votre allocation de 25% en XIC.TO bénéficie de ce contexte.", priority: 'low',    is_read: true,  metadata: {}, expires_at: new Date(+now + 14*86400000).toISOString() },
]);
if (insightErr) fail('ai_insights.insert', insightErr);
ok('5 insights insérés', null);

// ── 10. Messages de chat ───────────────────────────────────
console.log('\n💬  Messages de chat...');
const base = new Date(+now - 5*86400000);
const { error: chatErr } = await supabase.from('chat_messages').insert([
  { user_id: uid, role: 'user',      content: "Bonjour! Je viens de finir l'évaluation. Mon profil est \"Croissance\" avec un score de 7/10. Est-ce que le portefeuille suggéré est vraiment adapté pour moi?", created_at: new Date(+base).toISOString() },
  { user_id: uid, role: 'assistant', content: "Bonjour Sophie! Absolument, le Portefeuille Croissance est bien calibré pour votre profil.\n\n**Pourquoi ce portefeuille vous convient :**\n- Votre horizon de **20+ ans** jusqu'à la retraite à 55 ans permet d'absorber les cycles de marché\n- Votre score de **7/10** confirme une tolérance au risque au-dessus de la moyenne\n- Votre revenu stable (95k$/an) vous permet de maintenir les cotisations même en période de baisse\n\n**Points forts de votre allocation :**\n- **40% XUU.TO** : capturer la croissance mondiale via les 4 000+ titres US\n- **25% XIC.TO** : exposition domestique avec avantage fiscal sur dividendes\n- **15% ZAG.TO** : amortisseur qui se valorise lors des crises actions\n\nLa volatilité de 11,2% signifie que vous pouvez voir des fluctuations de ±11% par an — c'est normal pour votre profil.", created_at: new Date(+base + 2*60000).toISOString() },
  { user_id: uid, role: 'user',      content: 'Pourquoi mettre XUU.TO dans le REER plutôt que dans le CELI?', created_at: new Date(+base + 86400000).toISOString() },
  { user_id: uid, role: 'assistant', content: "Excellente question de fiscalité! C'est une optimisation importante.\n\n**Règle : actifs les plus efficients fiscalement en CELI**\n\n📌 **XUU.TO dans le REER** : Les ETF américains versent des dividendes soumis à une **retenue à la source de 15%**. Dans un REER, cette retenue est récupérée grâce à la convention fiscale Canada-États-Unis. Dans un CELI, elle est définitivement perdue.\n\n📌 **XIC.TO dans le CELI** : Les dividendes canadiens bénéficient du crédit d'impôt pour dividendes — mieux en CELI pour la croissance libre d'impôt lors du retrait.\n\n📌 **CASH.TO dans le CELI** : Vos liquidités pour la mise de fonds. Retrait du CELI = **100% libre d'impôt** ✓\n\nCette stratégie peut vous faire économiser 500-800$/an vs une allocation non optimisée.", created_at: new Date(+base + 86400000 + 3*60000).toISOString() },
  { user_id: uid, role: 'user',      content: 'Si les marchés chutent de 30% demain, combien je perdrai approximativement?', created_at: new Date(+base + 3*86400000).toISOString() },
  { user_id: uid, role: 'assistant', content: "Bonne question — voici une estimation réaliste basée sur votre portefeuille (~70 000$) :\n\n**Scénario krach -30% :**\n\n| Composante | Poids | Impact estimé |\n|---|---|---|\n| XUU.TO (40%) | -28% | -7 840$ |\n| XIC.TO (25%) | -25% | -4 375$ |\n| XEF.TO (15%) | -26% | -2 730$ |\n| ZAG.TO (15%) | **+4%** | +420$ |\n| CASH.TO (5%) | 0% | 0$ |\n\n**Impact net estimé : -14 525$ (-20,8% vs -30%)**\n\nVotre portefeuille est protégé à ~31% grâce à ZAG.TO et CASH.TO.\n\n**Perspective :** Après le krach de 2020, les marchés ont récupéré en 6 mois. À votre horizon de 20 ans, maintenez vos cotisations en période de baisse — vous achetez plus d'unités à prix réduit.", created_at: new Date(+base + 3*86400000 + 4*60000).toISOString() },
]);
if (chatErr) fail('chat_messages.insert', chatErr);
ok('6 messages de chat insérés', null);

// ── 11. Abonnement Pro ─────────────────────────────────────
console.log('\n⭐  Abonnement Pro...');
const { error: subErr } = await supabase.from('subscriptions').upsert({
  user_id: uid,
  plan: 'pro',
  status: 'active',
  current_period_start: now.toISOString(),
  current_period_end: new Date(+now + 365*86400000).toISOString(),
}, { onConflict: 'user_id' });
if (subErr) fail('subscriptions.upsert', subErr);
ok('Abonnement Pro activé', null);

// ── Résumé ─────────────────────────────────────────────────
console.log(`
✅  Seed terminé avec succès!
    Utilisateur : Sophie Tremblay (${uid})
    Portfolio   : ${portfolioId}
    Données     : 4 objectifs · 5 allocations · ${txs.length} transactions · 5 notifications · 5 insights · 6 messages chat

→  Rafraîchis http://localhost:3000/dashboard
`);
