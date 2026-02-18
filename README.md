# 🧭 WealthPilot

**Gestionnaire de portefeuille propulsé par l'intelligence artificielle** pour les investisseurs canadiens.

WealthPilot évalue votre profil de risque, génère des portefeuilles personnalisés (CELI, REER, REEE) et vous accompagne avec un conseiller IA disponible 24/7.

---

## ✨ Fonctionnalités

| Catégorie | Fonctionnalité |
|---|---|
| 🤖 **IA** | Évaluation de profil de risque, portefeuilles personnalisés, conseiller conversationnel |
| 📊 **Portefeuille** | 3 portefeuilles (conservateur, suggéré, ambitieux), allocation par ETFs canadiens |
| 💰 **Fiscal** | Suivi CELI/REER/REEE, estimation des économies d'impôt, rééquilibrage |
| 📝 **Transactions** | Historique d'opérations, filtrage par type, ajout de transactions |
| 🔔 **Notifications** | Alertes de rééquilibrage, objectifs, marché |
| 📈 **Dashboard** | KPIs, allocation chart, objectifs, stress tests, timeline d'activité |
| 💬 **Chat** | Streaming en temps réel, markdown, suggestions rapides |
| 🌙 **Thème** | Dark/light mode avec toggle |
| 🔒 **Sécurité** | Rate limiting, validation Zod, RLS, Error Boundary, middleware auth |

## 🛠 Stack Technique

- **Framework** : [Next.js 15](https://nextjs.org/) (App Router)
- **UI** : [Tailwind CSS](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/)
- **Backend** : [Supabase](https://supabase.com/) (Auth, PostgreSQL, RLS)
- **IA** : [Anthropic Claude](https://anthropic.com/)
- **Graphiques** : [Recharts](https://recharts.org/)
- **Animations** : [Framer Motion](https://www.framer.com/motion/)

## 🚀 Démarrage rapide

### Prérequis

- Node.js 18+
- Un projet [Supabase](https://supabase.com/)
- Une clé API [Anthropic](https://console.anthropic.com/)

### Installation

```bash
# Cloner le repo
git clone https://github.com/votre-utilisateur/wealthpilot.git
cd wealthpilot

# Installer les dépendances
npm install

# Copier les variables d'environnement
cp .env.example .env.local
```

### Configuration `.env.local`

```env
NEXT_PUBLIC_SUPABASE_URL=https://votre-projet.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=votre-clé-anon
SUPABASE_SERVICE_ROLE_KEY=votre-clé-service-role
ANTHROPIC_API_KEY=votre-clé-anthropic
```

### Base de données

Exécutez les migrations SQL dans l'éditeur Supabase (dans l'ordre) :

```
supabase/migrations/001_initial_schema.sql
supabase/migrations/002_instruments.sql
supabase/migrations/003_portfolio_constraints.sql
supabase/migrations/004_portfolio_enhancements.sql
supabase/migrations/005_transactions_notifications.sql
```

### Lancement

```bash
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000).

## 📁 Structure du projet

```
src/
├── app/                    # Pages Next.js (App Router)
│   ├── (dashboard)/        # Pages protégées (dashboard, portfolio, chat, etc.)
│   ├── api/ai/             # Routes API pour l'IA (chat, follow-up, risk-profile, portfolio)
│   └── layout.tsx          # Layout racine (SEO, thème, i18n)
├── components/
│   ├── chat/               # Interface chat + markdown renderer
│   ├── dashboard/          # Sidebar, topbar, notifications, activity timeline
│   ├── landing/            # Composants de la landing page
│   ├── portfolio/          # Graphiques et composants de portefeuille
│   └── ui/                 # Composants shadcn/ui
├── hooks/                  # Custom React hooks (useInterval)
├── lib/
│   ├── ai/                 # Client Anthropic, prompts système
│   ├── supabase/           # Client Supabase (server, client, middleware)
│   ├── portfolio/          # Validation, fallback, contraintes
│   └── rate-limit.ts       # Rate limiter in-memory
├── types/                  # TypeScript types (database.ts)
└── middleware.ts            # Auth middleware (Supabase SSR)
```

## 🔐 Sécurité

- **Rate Limiting** : Limiteur en mémoire sur toutes les routes `/api/ai/*`
- **Validation** : Schemas Zod côté serveur sur les API routes
- **Auth** : Middleware Supabase SSR, redirection automatique
- **RLS** : Row Level Security sur toutes les tables PostgreSQL
- **Error Boundary** : Composant React global pour capturer les erreurs

## 📜 Licence

MIT
