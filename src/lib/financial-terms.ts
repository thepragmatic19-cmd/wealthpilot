export const FINANCIAL_TERMS: Record<string, string> = {
  // Portfolio metrics
  'Rendement attendu':
    "Le rendement annuel moyen espéré du portefeuille, net des frais de gestion (RFG). Basé sur les rendements historiques des classes d'actifs et ajusté pour les conditions actuelles du marché.",
  'Volatilité':
    "Mesure de la fluctuation des rendements du portefeuille (écart-type annualisé). Une volatilité de 10% signifie que le rendement peut varier d'environ ±10% autour de la moyenne dans une année typique.",
  'Ratio de Sharpe':
    "Mesure le rendement excédentaire par unité de risque. Un ratio supérieur à 1,0 est considéré bon ; au-dessus de 1,5, excellent. Calculé comme (rendement - taux sans risque) / volatilité.",
  'RFG moyen':
    "Le Ratio des Frais de Gestion (RFG) pondéré du portefeuille. Représente le coût annuel total prélevé sur vos placements par les fonds. Les ETFs canadiens ont typiquement un RFG entre 0,05% et 0,70%.",
  'Perte max. historique':
    "La perte maximale estimée du sommet au creux (drawdown), basée sur la volatilité du portefeuille. Représente le pire scénario historiquement plausible sur une période de crise.",
  'RFG moyen pondéré':
    "Le Ratio des Frais de Gestion (RFG) pondéré du portefeuille. Représente le coût annuel total prélevé sur vos placements par les fonds. Les ETFs canadiens ont typiquement un RFG entre 0,05% et 0,70%.",
  'Drawdown':
    "La perte maximale entre un sommet et un creux du portefeuille. Un drawdown de 20% signifie que votre placement a chuté de 20% avant de remonter. Mesure de la résilience en période de crise.",

  // Account types
  'CELI':
    "Compte d'Épargne Libre d'Impôt : vos gains (intérêts, dividendes, plus-values) ne sont jamais imposés. Cotisation maximale cumulée en 2024 : 95 000 $ pour les résidents canadiens depuis 18 ans.",
  'REER':
    "Régime Enregistré d'Épargne-Retraite : vos cotisations sont déductibles de votre revenu imposable (remboursement d'impôts), et vos gains croissent à l'abri de l'impôt jusqu'au retrait à la retraite.",
  'REEE':
    "Régime Enregistré d'Épargne-Études : épargne dédiée aux études de vos enfants. Le gouvernement verse la Subvention canadienne pour l'épargne-études (SCEE) : 20% de vos cotisations, jusqu'à 500$/an.",
  'CELIAPP':
    "Compte d'Épargne Libre d'Impôt pour l'Achat d'une Première Propriété : combine les avantages du CELI et du REER. Cotisations déductibles (comme le REER) et retraits non imposés pour l'achat d'une maison. Limite : 8 000$/an, 40 000$ à vie.",
  'CRI':
    "Compte de Retraite Immobilisé : contient des fonds provenant d'un régime de retraite d'employeur que vous avez quitté. Les fonds sont « verrouillés » — vous ne pouvez pas les retirer librement avant la retraite.",
  'FRV':
    "Fonds de Revenu de Retraite : version avec retraits du CRI. Vous pouvez retirer un montant annuel (min et max fixés par la loi) pour votre revenu de retraite. Converti depuis un CRI à votre retraite.",

  // Investment concepts
  'ETF':
    "Fonds négocié en Bourse (Exchange-Traded Fund) : un panier de titres (actions, obligations) qui se négocie en bourse comme une action. Très peu coûteux (RFG 0,05–0,70%), idéal pour la diversification.",
  'Rééquilibrage':
    "Action de ramener votre portefeuille à sa répartition cible (ex: 80% actions / 20% obligations). Avec le temps, les marchés font dériver cette répartition — rééquilibrer annuellement maintient votre niveau de risque voulu.",
  'Monte Carlo':
    "Simulation statistique qui calcule des milliers de scénarios de marché possibles (bons, moyens, mauvais) pour estimer la probabilité d'atteindre votre objectif. Plus la probabilité est élevée (>80%), plus votre plan est solide.",
  'Diversification':
    "Stratégie consistant à répartir vos placements dans différentes classes d'actifs, secteurs et régions géographiques. Réduit le risque : si un placement chute, les autres amortissent la perte.",

  // Retirement-specific
  'RRQ':
    "Régime de Rentes du Québec : pension gouvernementale versée aux Québécois à la retraite. Le montant dépend de vos cotisations pendant votre vie active. Maximum en 2024 : environ 1 364$/mois à 65 ans.",
  'PSV':
    "Pension de Sécurité de la Vieillesse : prestation fédérale versée à presque tous les Canadiens à partir de 65 ans (ou 67 ans si différé pour un montant plus élevé). Environ 713$/mois en 2024.",
  'Taux de remplacement':
    "Le pourcentage de votre revenu actuel que vous visez à reproduire à la retraite. La plupart des planificateurs recommandent 70–80% de votre revenu de pré-retraite pour maintenir votre niveau de vie.",
};
