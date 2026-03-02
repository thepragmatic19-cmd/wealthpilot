import type { SuggestedAccount } from '@/types/database';

// ============================================================
// Asset class types aligned with ASSET_CLASS_COLORS in utils.ts
// ============================================================

export type AssetClass =
  | 'Actions canadiennes'
  | 'Actions américaines'
  | 'Actions internationales'
  | 'Actions marchés émergents'
  | 'Obligations canadiennes'
  | 'Obligations mondiales'
  | 'Immobilier (REITs)'
  | 'Or / Commodités'
  | 'Liquidités';

export type SubClass =
  | 'Marché large'
  | 'Dividendes'
  | 'Petites/moyennes cap.'
  | 'Croissance'
  | 'Valeur'
  | 'Technologie'
  | 'S&P 500'
  | 'NASDAQ'
  | 'Développés (EAEO)'
  | 'Asie-Pacifique'
  | 'Marché large EM'
  | 'Gouvernemental'
  | 'Corporatif'
  | 'Agrégé'
  | 'Court terme'
  | 'Long terme'
  | 'Global agrégé'
  | 'Immobilier canadien'
  | 'Immobilier américain'
  | 'Or physique'
  | 'Commodités larges'
  | 'Agrégé US'
  | 'Épargne à intérêt élevé'
  | 'Marché monétaire';

export interface Instrument {
  ticker: string;
  name: string;
  isin: string;
  asset_class: AssetClass;
  sub_class: SubClass;
  mer: number;
  currency: 'CAD' | 'USD';
  exchange: 'TSX' | 'NYSE' | 'NASDAQ';
  expected_return: number;
  volatility: number;
  preferred_account: SuggestedAccount;
  account_rationale: string;
}

// ============================================================
// INSTRUMENTS DATABASE (~90 ETFs)
// ============================================================

export const INSTRUMENTS: Instrument[] = [
  // ──────────────────────────────────────────────────────────
  // ACTIONS CANADIENNES (12)
  // ──────────────────────────────────────────────────────────
  {
    ticker: 'XIC.TO',
    name: 'iShares Core S&P/TSX Capped Composite Index ETF',
    isin: 'CA46434G1046',
    asset_class: 'Actions canadiennes',
    sub_class: 'Marché large',
    mer: 0.06,
    currency: 'CAD',
    exchange: 'TSX',
    expected_return: 7.5,
    volatility: 14.0,
    preferred_account: 'CELI',
    account_rationale: 'Gains en capital tax-free au CELI, dividendes canadiens avantageux',
  },
  {
    ticker: 'VCN.TO',
    name: 'Vanguard FTSE Canada All Cap Index ETF',
    isin: 'CA92206H1047',
    asset_class: 'Actions canadiennes',
    sub_class: 'Marché large',
    mer: 0.05,
    currency: 'CAD',
    exchange: 'TSX',
    expected_return: 7.5,
    volatility: 14.0,
    preferred_account: 'CELI',
    account_rationale: 'Alternative à XIC avec MER légèrement inférieur',
  },
  {
    ticker: 'XIU.TO',
    name: 'iShares S&P/TSX 60 Index ETF',
    isin: 'CA46428A1084',
    asset_class: 'Actions canadiennes',
    sub_class: 'Marché large',
    mer: 0.18,
    currency: 'CAD',
    exchange: 'TSX',
    expected_return: 7.3,
    volatility: 13.8,
    preferred_account: 'CELI',
    account_rationale: 'Top 60 compagnies canadiennes, très liquide',
  },
  {
    ticker: 'XEI.TO',
    name: 'iShares S&P/TSX Composite High Dividend Index ETF',
    isin: 'CA46432F1009',
    asset_class: 'Actions canadiennes',
    sub_class: 'Dividendes',
    mer: 0.22,
    currency: 'CAD',
    exchange: 'TSX',
    expected_return: 6.8,
    volatility: 12.5,
    preferred_account: 'non_enregistré',
    account_rationale: 'Dividendes canadiens éligibles au crédit d\'impôt en compte non-enregistré',
  },
  {
    ticker: 'CDZ.TO',
    name: 'iShares S&P/TSX Canadian Dividend Aristocrats Index ETF',
    isin: 'CA46434G7062',
    asset_class: 'Actions canadiennes',
    sub_class: 'Dividendes',
    mer: 0.66,
    currency: 'CAD',
    exchange: 'TSX',
    expected_return: 6.5,
    volatility: 12.0,
    preferred_account: 'non_enregistré',
    account_rationale: 'Aristocrates de dividendes, crédit d\'impôt optimal en non-enregistré',
  },
  {
    ticker: 'ZDV.TO',
    name: 'BMO Canadian Dividend ETF',
    isin: 'CA05586B1040',
    asset_class: 'Actions canadiennes',
    sub_class: 'Dividendes',
    mer: 0.39,
    currency: 'CAD',
    exchange: 'TSX',
    expected_return: 6.6,
    volatility: 12.2,
    preferred_account: 'non_enregistré',
    account_rationale: 'Dividendes canadiens avec crédit d\'impôt',
  },
  {
    ticker: 'XMD.TO',
    name: 'iShares S&P/TSX Completion Index ETF',
    isin: 'CA46434G5041',
    asset_class: 'Actions canadiennes',
    sub_class: 'Petites/moyennes cap.',
    mer: 0.61,
    currency: 'CAD',
    exchange: 'TSX',
    expected_return: 8.0,
    volatility: 16.5,
    preferred_account: 'CELI',
    account_rationale: 'Potentiel de croissance élevé, gains en capital au CELI',
  },
  {
    ticker: 'HXT.TO',
    name: 'Global X S&P/TSX 60 Index Corporate Class ETF',
    isin: 'CA40573A1021',
    asset_class: 'Actions canadiennes',
    sub_class: 'Marché large',
    mer: 0.03,
    currency: 'CAD',
    exchange: 'TSX',
    expected_return: 7.3,
    volatility: 13.8,
    preferred_account: 'non_enregistré',
    account_rationale: 'Structure swap élimine distributions, idéal en non-enregistré',
  },
  {
    ticker: 'VDY.TO',
    name: 'Vanguard FTSE Canadian High Dividend Yield Index ETF',
    isin: 'CA92206H2037',
    asset_class: 'Actions canadiennes',
    sub_class: 'Dividendes',
    mer: 0.22,
    currency: 'CAD',
    exchange: 'TSX',
    expected_return: 6.7,
    volatility: 12.3,
    preferred_account: 'non_enregistré',
    account_rationale: 'Dividendes canadiens admissibles au crédit d\'impôt',
  },
  {
    ticker: 'XCS.TO',
    name: 'iShares S&P/TSX SmallCap Index ETF',
    isin: 'CA46434G6031',
    asset_class: 'Actions canadiennes',
    sub_class: 'Petites/moyennes cap.',
    mer: 0.61,
    currency: 'CAD',
    exchange: 'TSX',
    expected_return: 8.5,
    volatility: 18.0,
    preferred_account: 'CELI',
    account_rationale: 'Forte croissance potentielle, maximiser au CELI',
  },
  {
    ticker: 'ZCN.TO',
    name: 'BMO S&P/TSX Capped Composite Index ETF',
    isin: 'CA05577W1095',
    asset_class: 'Actions canadiennes',
    sub_class: 'Marché large',
    mer: 0.06,
    currency: 'CAD',
    exchange: 'TSX',
    expected_return: 7.5,
    volatility: 14.0,
    preferred_account: 'CELI',
    account_rationale: 'Équivalent BMO de XIC, même stratégie indicielle',
  },
  {
    ticker: 'XDIV.TO',
    name: 'iShares Core MSCI Canadian Quality Dividend Index ETF',
    isin: 'CA46435U1084',
    asset_class: 'Actions canadiennes',
    sub_class: 'Dividendes',
    mer: 0.11,
    currency: 'CAD',
    exchange: 'TSX',
    expected_return: 6.9,
    volatility: 12.0,
    preferred_account: 'non_enregistré',
    account_rationale: 'Dividendes de qualité, crédit d\'impôt en non-enregistré',
  },

  // ──────────────────────────────────────────────────────────
  // ACTIONS AMÉRICAINES (14)
  // ──────────────────────────────────────────────────────────
  {
    ticker: 'VFV.TO',
    name: 'Vanguard S&P 500 Index ETF',
    isin: 'CA92206H1039',
    asset_class: 'Actions américaines',
    sub_class: 'S&P 500',
    mer: 0.09,
    currency: 'CAD',
    exchange: 'TSX',
    expected_return: 10.0,
    volatility: 14.5,
    preferred_account: 'CELI',
    account_rationale: 'S&P 500 en CAD, gains en capital exempts au CELI',
  },
  {
    ticker: 'ZSP.TO',
    name: 'BMO S&P 500 Index ETF',
    isin: 'CA05586A1030',
    asset_class: 'Actions américaines',
    sub_class: 'S&P 500',
    mer: 0.09,
    currency: 'CAD',
    exchange: 'TSX',
    expected_return: 10.0,
    volatility: 14.5,
    preferred_account: 'CELI',
    account_rationale: 'Alternative BMO au S&P 500, même stratégie',
  },
  {
    ticker: 'XUS.TO',
    name: 'iShares Core S&P 500 Index ETF',
    isin: 'CA46435U2074',
    asset_class: 'Actions américaines',
    sub_class: 'S&P 500',
    mer: 0.10,
    currency: 'CAD',
    exchange: 'TSX',
    expected_return: 10.0,
    volatility: 14.5,
    preferred_account: 'CELI',
    account_rationale: 'S&P 500 iShares en CAD',
  },
  {
    ticker: 'QQC.TO',
    name: 'Invesco NASDAQ 100 Index ETF',
    isin: 'CA46138R1047',
    asset_class: 'Actions américaines',
    sub_class: 'NASDAQ',
    mer: 0.25,
    currency: 'CAD',
    exchange: 'TSX',
    expected_return: 11.5,
    volatility: 17.5,
    preferred_account: 'CELI',
    account_rationale: 'NASDAQ 100 en CAD, croissance tech au CELI',
  },
  {
    ticker: 'XQQ.TO',
    name: 'iShares NASDAQ 100 Index ETF (CAD-Hedged)',
    isin: 'CA46434G8052',
    asset_class: 'Actions américaines',
    sub_class: 'NASDAQ',
    mer: 0.39,
    currency: 'CAD',
    exchange: 'TSX',
    expected_return: 11.5,
    volatility: 17.0,
    preferred_account: 'CELI',
    account_rationale: 'NASDAQ couvert contre le risque de change',
  },
  {
    ticker: 'VTI',
    name: 'Vanguard Total Stock Market ETF',
    isin: 'US9229087690',
    asset_class: 'Actions américaines',
    sub_class: 'Marché large',
    mer: 0.03,
    currency: 'USD',
    exchange: 'NYSE',
    expected_return: 9.5,
    volatility: 15.0,
    preferred_account: 'REER',
    account_rationale: 'ETF US-listed : retenue à la source de 15% éliminée au REER',
  },
  {
    ticker: 'VOO',
    name: 'Vanguard S&P 500 ETF',
    isin: 'US9229083632',
    asset_class: 'Actions américaines',
    sub_class: 'S&P 500',
    mer: 0.03,
    currency: 'USD',
    exchange: 'NYSE',
    expected_return: 10.0,
    volatility: 14.5,
    preferred_account: 'REER',
    account_rationale: 'MER ultra-bas, exonération retenue au REER',
  },
  {
    ticker: 'QQQ',
    name: 'Invesco QQQ Trust',
    isin: 'US46090E1038',
    asset_class: 'Actions américaines',
    sub_class: 'NASDAQ',
    mer: 0.20,
    currency: 'USD',
    exchange: 'NASDAQ',
    expected_return: 11.5,
    volatility: 18.0,
    preferred_account: 'REER',
    account_rationale: 'NASDAQ en USD, exonération retenue au REER',
  },
  {
    ticker: 'VUG',
    name: 'Vanguard Growth ETF',
    isin: 'US9229087286',
    asset_class: 'Actions américaines',
    sub_class: 'Croissance',
    mer: 0.04,
    currency: 'USD',
    exchange: 'NYSE',
    expected_return: 9.5,
    volatility: 17.5,
    preferred_account: 'REER',
    account_rationale: 'Croissance US, retenue éliminée au REER',
  },
  {
    ticker: 'SCHD',
    name: 'Schwab U.S. Dividend Equity ETF',
    isin: 'US8085247976',
    asset_class: 'Actions américaines',
    sub_class: 'Dividendes',
    mer: 0.06,
    currency: 'USD',
    exchange: 'NYSE',
    expected_return: 8.0,
    volatility: 13.5,
    preferred_account: 'REER',
    account_rationale: 'Dividendes US exonérés de retenue au REER',
  },
  {
    ticker: 'VGG.TO',
    name: 'Vanguard U.S. Dividend Appreciation Index ETF',
    isin: 'CA92206H3027',
    asset_class: 'Actions américaines',
    sub_class: 'Dividendes',
    mer: 0.30,
    currency: 'CAD',
    exchange: 'TSX',
    expected_return: 8.0,
    volatility: 14.0,
    preferred_account: 'CELI',
    account_rationale: 'Dividendes croissants US en CAD sur TSX',
  },
  {
    ticker: 'XUU.TO',
    name: 'iShares Core S&P U.S. Total Market Index ETF',
    isin: 'CA46435U3064',
    asset_class: 'Actions américaines',
    sub_class: 'Marché large',
    mer: 0.07,
    currency: 'CAD',
    exchange: 'TSX',
    expected_return: 8.5,
    volatility: 15.5,
    preferred_account: 'CELI',
    account_rationale: 'Marché total US en CAD',
  },
  {
    ticker: 'ZNQ.TO',
    name: 'BMO NASDAQ 100 Equity Index ETF',
    isin: 'CA05590B1013',
    asset_class: 'Actions américaines',
    sub_class: 'NASDAQ',
    mer: 0.39,
    currency: 'CAD',
    exchange: 'TSX',
    expected_return: 11.0,
    volatility: 18.0,
    preferred_account: 'CELI',
    account_rationale: 'NASDAQ 100 BMO en CAD',
  },
  {
    ticker: 'HXS.TO',
    name: 'Global X S&P 500 Index Corporate Class ETF',
    isin: 'CA40573B1022',
    asset_class: 'Actions américaines',
    sub_class: 'S&P 500',
    mer: 0.10,
    currency: 'CAD',
    exchange: 'TSX',
    expected_return: 9.8,
    volatility: 14.5,
    preferred_account: 'non_enregistré',
    account_rationale: 'Structure swap sans distributions, optimal en non-enregistré',
  },

  // ──────────────────────────────────────────────────────────
  // ACTIONS INTERNATIONALES (9)
  // ──────────────────────────────────────────────────────────
  {
    ticker: 'XEF.TO',
    name: 'iShares Core MSCI EAFE IMI Index ETF',
    isin: 'CA46432F2007',
    asset_class: 'Actions internationales',
    sub_class: 'Développés (EAEO)',
    mer: 0.22,
    currency: 'CAD',
    exchange: 'TSX',
    expected_return: 7.0,
    volatility: 14.5,
    preferred_account: 'CELI',
    account_rationale: 'Marchés développés hors Amérique du Nord',
  },
  {
    ticker: 'VIU.TO',
    name: 'Vanguard FTSE Developed All Cap ex North America Index ETF',
    isin: 'CA92206H4017',
    asset_class: 'Actions internationales',
    sub_class: 'Développés (EAEO)',
    mer: 0.22,
    currency: 'CAD',
    exchange: 'TSX',
    expected_return: 7.0,
    volatility: 14.5,
    preferred_account: 'CELI',
    account_rationale: 'Alternative Vanguard à XEF',
  },
  {
    ticker: 'ZEA.TO',
    name: 'BMO MSCI EAFE Index ETF',
    isin: 'CA05577W2085',
    asset_class: 'Actions internationales',
    sub_class: 'Développés (EAEO)',
    mer: 0.22,
    currency: 'CAD',
    exchange: 'TSX',
    expected_return: 7.0,
    volatility: 14.5,
    preferred_account: 'CELI',
    account_rationale: 'EAFE BMO en CAD',
  },
  {
    ticker: 'VXUS',
    name: 'Vanguard Total International Stock ETF',
    isin: 'US9219097683',
    asset_class: 'Actions internationales',
    sub_class: 'Développés (EAEO)',
    mer: 0.07,
    currency: 'USD',
    exchange: 'NYSE',
    expected_return: 7.5,
    volatility: 15.0,
    preferred_account: 'REER',
    account_rationale: 'International en USD, retenue éliminée au REER',
  },
  {
    ticker: 'VEA',
    name: 'Vanguard FTSE Developed Markets ETF',
    isin: 'US9220428588',
    asset_class: 'Actions internationales',
    sub_class: 'Développés (EAEO)',
    mer: 0.05,
    currency: 'USD',
    exchange: 'NYSE',
    expected_return: 7.0,
    volatility: 14.5,
    preferred_account: 'REER',
    account_rationale: 'Marchés développés, MER très bas, au REER',
  },
  {
    ticker: 'XAW.TO',
    name: 'iShares Core MSCI All Country World ex Canada Index ETF',
    isin: 'CA46432F3005',
    asset_class: 'Actions internationales',
    sub_class: 'Marché large',
    mer: 0.22,
    currency: 'CAD',
    exchange: 'TSX',
    expected_return: 8.0,
    volatility: 15.0,
    preferred_account: 'CELI',
    account_rationale: 'Monde entier sauf Canada en un seul ETF',
  },
  {
    ticker: 'VXC.TO',
    name: 'Vanguard FTSE Global All Cap ex Canada Index ETF',
    isin: 'CA92206H5006',
    asset_class: 'Actions internationales',
    sub_class: 'Marché large',
    mer: 0.21,
    currency: 'CAD',
    exchange: 'TSX',
    expected_return: 8.0,
    volatility: 15.0,
    preferred_account: 'CELI',
    account_rationale: 'Monde entier sauf Canada, alternative Vanguard',
  },
  {
    ticker: 'ZDM.TO',
    name: 'BMO MSCI EAFE Hedged to CAD Index ETF',
    isin: 'CA05577W3075',
    asset_class: 'Actions internationales',
    sub_class: 'Développés (EAEO)',
    mer: 0.24,
    currency: 'CAD',
    exchange: 'TSX',
    expected_return: 6.8,
    volatility: 13.5,
    preferred_account: 'CELI',
    account_rationale: 'EAFE couvert contre le risque de change',
  },
  {
    ticker: 'VIDY.TO',
    name: 'Vanguard FTSE Developed ex North America High Dividend Yield Index ETF',
    isin: 'CA92206H6004',
    asset_class: 'Actions internationales',
    sub_class: 'Dividendes',
    mer: 0.32,
    currency: 'CAD',
    exchange: 'TSX',
    expected_return: 6.5,
    volatility: 13.0,
    preferred_account: 'CELI',
    account_rationale: 'Dividendes internationaux, au CELI pour éviter la double imposition',
  },

  // ──────────────────────────────────────────────────────────
  // ACTIONS MARCHÉS ÉMERGENTS (7)
  // ──────────────────────────────────────────────────────────
  {
    ticker: 'XEC.TO',
    name: 'iShares Core MSCI Emerging Markets IMI Index ETF',
    isin: 'CA46432F4003',
    asset_class: 'Actions marchés émergents',
    sub_class: 'Marché large EM',
    mer: 0.27,
    currency: 'CAD',
    exchange: 'TSX',
    expected_return: 8.0,
    volatility: 18.0,
    preferred_account: 'CELI',
    account_rationale: 'Gains en capital élevés, maximiser la croissance tax-free au CELI',
  },
  {
    ticker: 'ZEM.TO',
    name: 'BMO MSCI Emerging Markets Index ETF',
    isin: 'CA05577W4065',
    asset_class: 'Actions marchés émergents',
    sub_class: 'Marché large EM',
    mer: 0.29,
    currency: 'CAD',
    exchange: 'TSX',
    expected_return: 8.0,
    volatility: 18.0,
    preferred_account: 'CELI',
    account_rationale: 'Croissance EM tax-free au CELI',
  },
  {
    ticker: 'VEE.TO',
    name: 'Vanguard FTSE Emerging Markets All Cap Index ETF',
    isin: 'CA92206H7002',
    asset_class: 'Actions marchés émergents',
    sub_class: 'Marché large EM',
    mer: 0.24,
    currency: 'CAD',
    exchange: 'TSX',
    expected_return: 8.0,
    volatility: 18.0,
    preferred_account: 'CELI',
    account_rationale: 'EM Vanguard en CAD, croissance tax-free au CELI',
  },
  {
    ticker: 'VWO',
    name: 'Vanguard FTSE Emerging Markets ETF',
    isin: 'US9220428745',
    asset_class: 'Actions marchés émergents',
    sub_class: 'Marché large EM',
    mer: 0.08,
    currency: 'USD',
    exchange: 'NYSE',
    expected_return: 8.0,
    volatility: 18.5,
    preferred_account: 'REER',
    account_rationale: 'EM en USD, retenue éliminée au REER',
  },
  {
    ticker: 'IEMG',
    name: 'iShares Core MSCI Emerging Markets ETF',
    isin: 'US46434G1031',
    asset_class: 'Actions marchés émergents',
    sub_class: 'Marché large EM',
    mer: 0.09,
    currency: 'USD',
    exchange: 'NYSE',
    expected_return: 8.0,
    volatility: 18.5,
    preferred_account: 'REER',
    account_rationale: 'EM iShares, MER bas, au REER',
  },
  {
    ticker: 'HXEM.TO',
    name: 'Global X Emerging Markets Equity Index Corporate Class ETF',
    isin: 'CA40573C1012',
    asset_class: 'Actions marchés émergents',
    sub_class: 'Marché large EM',
    mer: 0.28,
    currency: 'CAD',
    exchange: 'TSX',
    expected_return: 8.0,
    volatility: 18.0,
    preferred_account: 'non_enregistré',
    account_rationale: 'Structure swap sans distributions',
  },
  {
    ticker: 'XEM.TO',
    name: 'iShares MSCI Emerging Markets Index ETF',
    isin: 'CA46428R1010',
    asset_class: 'Actions marchés émergents',
    sub_class: 'Marché large EM',
    mer: 0.82,
    currency: 'CAD',
    exchange: 'TSX',
    expected_return: 8.0,
    volatility: 18.5,
    preferred_account: 'REEE',
    account_rationale: 'EM ancien fonds iShares, MER plus élevé',
  },

  // ──────────────────────────────────────────────────────────
  // OBLIGATIONS CANADIENNES (10)
  // ──────────────────────────────────────────────────────────
  {
    ticker: 'ZAG.TO',
    name: 'BMO Aggregate Bond Index ETF',
    isin: 'CA05577W5054',
    asset_class: 'Obligations canadiennes',
    sub_class: 'Agrégé',
    mer: 0.09,
    currency: 'CAD',
    exchange: 'TSX',
    expected_return: 3.5,
    volatility: 5.5,
    preferred_account: 'REER',
    account_rationale: 'Revenus d\'intérêts pleinement imposables, au REER',
  },
  {
    ticker: 'VAB.TO',
    name: 'Vanguard Canadian Aggregate Bond Index ETF',
    isin: 'CA92206H8000',
    asset_class: 'Obligations canadiennes',
    sub_class: 'Agrégé',
    mer: 0.09,
    currency: 'CAD',
    exchange: 'TSX',
    expected_return: 3.5,
    volatility: 5.5,
    preferred_account: 'REER',
    account_rationale: 'Obligations agrégées Vanguard, au REER',
  },
  {
    ticker: 'XBB.TO',
    name: 'iShares Core Canadian Universe Bond Index ETF',
    isin: 'CA46434B1040',
    asset_class: 'Obligations canadiennes',
    sub_class: 'Agrégé',
    mer: 0.10,
    currency: 'CAD',
    exchange: 'TSX',
    expected_return: 3.5,
    volatility: 5.5,
    preferred_account: 'REER',
    account_rationale: 'Univers obligataire canadien complet',
  },
  {
    ticker: 'ZFL.TO',
    name: 'BMO Long Federal Bond Index ETF',
    isin: 'CA05577W6044',
    asset_class: 'Obligations canadiennes',
    sub_class: 'Long terme',
    mer: 0.20,
    currency: 'CAD',
    exchange: 'TSX',
    expected_return: 4.2,
    volatility: 12.0,
    preferred_account: 'REER',
    account_rationale: 'Obligations long terme, sensibles aux taux',
  },
  {
    ticker: 'XSB.TO',
    name: 'iShares Core Canadian Short Term Bond Index ETF',
    isin: 'CA46434B2032',
    asset_class: 'Obligations canadiennes',
    sub_class: 'Court terme',
    mer: 0.10,
    currency: 'CAD',
    exchange: 'TSX',
    expected_return: 3.2,
    volatility: 2.5,
    preferred_account: 'REER',
    account_rationale: 'Court terme, faible volatilité, au REER',
  },
  {
    ticker: 'VSB.TO',
    name: 'Vanguard Canadian Short-Term Bond Index ETF',
    isin: 'CA92206H9008',
    asset_class: 'Obligations canadiennes',
    sub_class: 'Court terme',
    mer: 0.11,
    currency: 'CAD',
    exchange: 'TSX',
    expected_return: 3.2,
    volatility: 2.5,
    preferred_account: 'REER',
    account_rationale: 'Court terme Vanguard',
  },
  {
    ticker: 'ZCS.TO',
    name: 'BMO Short Corporate Bond Index ETF',
    isin: 'CA05577W7034',
    asset_class: 'Obligations canadiennes',
    sub_class: 'Court terme',
    mer: 0.12,
    currency: 'CAD',
    exchange: 'TSX',
    expected_return: 3.5,
    volatility: 3.0,
    preferred_account: 'REER',
    account_rationale: 'Corporatif court terme, rendement légèrement supérieur',
  },
  {
    ticker: 'XCB.TO',
    name: 'iShares Canadian Corporate Bond Index ETF',
    isin: 'CA46434B3024',
    asset_class: 'Obligations canadiennes',
    sub_class: 'Corporatif',
    mer: 0.44,
    currency: 'CAD',
    exchange: 'TSX',
    expected_return: 4.0,
    volatility: 5.0,
    preferred_account: 'REER',
    account_rationale: 'Obligations corporatives, meilleur rendement, au REER',
  },
  {
    ticker: 'CLF.TO',
    name: 'iShares 1-5 Year Laddered Government Bond Index ETF',
    isin: 'CA46434B4014',
    asset_class: 'Obligations canadiennes',
    sub_class: 'Gouvernemental',
    mer: 0.17,
    currency: 'CAD',
    exchange: 'TSX',
    expected_return: 3.0,
    volatility: 2.0,
    preferred_account: 'REER',
    account_rationale: 'Obligations gouvernementales échelonnées, très sûr',
  },
  {
    ticker: 'ZDB.TO',
    name: 'BMO Discount Bond Index ETF',
    isin: 'CA05577W8024',
    asset_class: 'Obligations canadiennes',
    sub_class: 'Agrégé',
    mer: 0.09,
    currency: 'CAD',
    exchange: 'TSX',
    expected_return: 3.5,
    volatility: 5.0,
    preferred_account: 'non_enregistré',
    account_rationale: 'Obligations à escompte, plus de gains en capital que d\'intérêts',
  },

  // ──────────────────────────────────────────────────────────
  // OBLIGATIONS MONDIALES (5)
  // ──────────────────────────────────────────────────────────
  {
    ticker: 'VGAB.TO',
    name: 'Vanguard Global Aggregate Bond Index ETF (CAD-hedged)',
    isin: 'CA92206HA006',
    asset_class: 'Obligations mondiales',
    sub_class: 'Global agrégé',
    mer: 0.30,
    currency: 'CAD',
    exchange: 'TSX',
    expected_return: 3.0,
    volatility: 5.0,
    preferred_account: 'REER',
    account_rationale: 'Obligations mondiales couvertes, au REER',
  },
  {
    ticker: 'BND',
    name: 'Vanguard Total Bond Market ETF',
    isin: 'US9219378356',
    asset_class: 'Obligations mondiales',
    sub_class: 'Agrégé US',
    mer: 0.03,
    currency: 'USD',
    exchange: 'NYSE',
    expected_return: 3.5,
    volatility: 5.0,
    preferred_account: 'REER',
    account_rationale: 'Obligations US, MER minimal, au REER',
  },
  {
    ticker: 'AGG',
    name: 'iShares Core U.S. Aggregate Bond ETF',
    isin: 'US4642872349',
    asset_class: 'Obligations mondiales',
    sub_class: 'Agrégé US',
    mer: 0.03,
    currency: 'USD',
    exchange: 'NYSE',
    expected_return: 3.5,
    volatility: 5.0,
    preferred_account: 'REER',
    account_rationale: 'Alternative à BND, même stratégie',
  },
  {
    ticker: 'BNDX',
    name: 'Vanguard Total International Bond ETF',
    isin: 'US92203J4076',
    asset_class: 'Obligations mondiales',
    sub_class: 'Global agrégé',
    mer: 0.07,
    currency: 'USD',
    exchange: 'NYSE',
    expected_return: 2.5,
    volatility: 4.5,
    preferred_account: 'REER',
    account_rationale: 'Obligations internationales, diversification',
  },
  {
    ticker: 'XGB.TO',
    name: 'iShares Canadian Government Bond Index ETF',
    isin: 'CA46434B5003',
    asset_class: 'Obligations canadiennes',
    sub_class: 'Gouvernemental',
    mer: 0.39,
    currency: 'CAD',
    exchange: 'TSX',
    expected_return: 3.0,
    volatility: 5.5,
    preferred_account: 'REER',
    account_rationale: 'Obligations gouvernementales canadiennes',
  },

  // ──────────────────────────────────────────────────────────
  // IMMOBILIER (5)
  // ──────────────────────────────────────────────────────────
  {
    ticker: 'ZRE.TO',
    name: 'BMO Equal Weight REITs Index ETF',
    isin: 'CA05577W9014',
    asset_class: 'Immobilier (REITs)',
    sub_class: 'Immobilier canadien',
    mer: 0.61,
    currency: 'CAD',
    exchange: 'TSX',
    expected_return: 6.5,
    volatility: 14.0,
    preferred_account: 'CELI',
    account_rationale: 'REITs canadiens, distributions au CELI pour éviter l\'imposition',
  },
  {
    ticker: 'XRE.TO',
    name: 'iShares S&P/TSX Capped REIT Index ETF',
    isin: 'CA46434B6001',
    asset_class: 'Immobilier (REITs)',
    sub_class: 'Immobilier canadien',
    mer: 0.61,
    currency: 'CAD',
    exchange: 'TSX',
    expected_return: 6.5,
    volatility: 14.0,
    preferred_account: 'CELI',
    account_rationale: 'REITs iShares, au CELI',
  },
  {
    ticker: 'VRE.TO',
    name: 'Vanguard FTSE Canadian Capped REIT Index ETF',
    isin: 'CA92206HB004',
    asset_class: 'Immobilier (REITs)',
    sub_class: 'Immobilier canadien',
    mer: 0.38,
    currency: 'CAD',
    exchange: 'TSX',
    expected_return: 6.5,
    volatility: 14.0,
    preferred_account: 'CELI',
    account_rationale: 'REITs Vanguard, MER plus bas',
  },
  {
    ticker: 'VNQ',
    name: 'Vanguard Real Estate ETF',
    isin: 'US9229085538',
    asset_class: 'Immobilier (REITs)',
    sub_class: 'Immobilier américain',
    mer: 0.12,
    currency: 'USD',
    exchange: 'NYSE',
    expected_return: 7.0,
    volatility: 16.0,
    preferred_account: 'REER',
    account_rationale: 'REITs US, retenue éliminée au REER',
  },
  {
    ticker: 'USRT',
    name: 'iShares Core U.S. REIT ETF',
    isin: 'US46434V6056',
    asset_class: 'Immobilier (REITs)',
    sub_class: 'Immobilier américain',
    mer: 0.08,
    currency: 'USD',
    exchange: 'NYSE',
    expected_return: 7.0,
    volatility: 16.0,
    preferred_account: 'REER',
    account_rationale: 'REITs US iShares, MER bas',
  },

  // ──────────────────────────────────────────────────────────
  // OR / COMMODITÉS (4)
  // ──────────────────────────────────────────────────────────
  {
    ticker: 'CGL-C.TO',
    name: 'iShares Gold Bullion ETF (CAD-Hedged)',
    isin: 'CA46434C1041',
    asset_class: 'Or / Commodités',
    sub_class: 'Or physique',
    mer: 0.55,
    currency: 'CAD',
    exchange: 'TSX',
    expected_return: 3.5,
    volatility: 15.0,
    preferred_account: 'CELI',
    account_rationale: 'Or couvert en CAD, gains exempts au CELI',
  },
  {
    ticker: 'CGL.TO',
    name: 'iShares Gold Bullion ETF (Non-Hedged)',
    isin: 'CA46434C2031',
    asset_class: 'Or / Commodités',
    sub_class: 'Or physique',
    mer: 0.55,
    currency: 'CAD',
    exchange: 'TSX',
    expected_return: 4.0,
    volatility: 16.0,
    preferred_account: 'CELI',
    account_rationale: 'Or non-couvert, profite de la dépréciation du CAD',
  },
  {
    ticker: 'GLD',
    name: 'SPDR Gold Shares',
    isin: 'US78463V1070',
    asset_class: 'Or / Commodités',
    sub_class: 'Or physique',
    mer: 0.40,
    currency: 'USD',
    exchange: 'NYSE',
    expected_return: 3.5,
    volatility: 15.5,
    preferred_account: 'REER',
    account_rationale: 'ETF US-listed — risque de taxe successorale US si détenu au CELI, REER plus sûr',
  },
  {
    ticker: 'MNT.TO',
    name: 'CI Gold Bullion Fund',
    isin: 'CA12557T1030',
    asset_class: 'Or / Commodités',
    sub_class: 'Or physique',
    mer: 0.18,
    currency: 'CAD',
    exchange: 'TSX',
    expected_return: 3.5,
    volatility: 15.0,
    preferred_account: 'CELI',
    account_rationale: 'Or physique MER bas, au CELI',
  },

  // ──────────────────────────────────────────────────────────
  // LIQUIDITÉS (4)
  // ──────────────────────────────────────────────────────────
  {
    ticker: 'CASH.TO',
    name: 'Global X High Interest Savings ETF',
    isin: 'CA40573D1002',
    asset_class: 'Liquidités',
    sub_class: 'Épargne à intérêt élevé',
    mer: 0.11,
    currency: 'CAD',
    exchange: 'TSX',
    expected_return: 3.0, // Taux BdC ~3.0% (fév. 2026, après baisses 2024-2025)
    volatility: 0.2,
    preferred_account: 'REER',
    account_rationale: 'Intérêts pleinement imposables, au REER',
  },
  {
    ticker: 'PSA.TO',
    name: 'Purpose High Interest Savings ETF',
    isin: 'CA74642K1012',
    asset_class: 'Liquidités',
    sub_class: 'Épargne à intérêt élevé',
    mer: 0.17,
    currency: 'CAD',
    exchange: 'TSX',
    expected_return: 3.0, // Taux BdC ~3.0% (fév. 2026)
    volatility: 0.2,
    preferred_account: 'REER',
    account_rationale: 'Alternative populaire pour le cash, au REER',
  },
  {
    ticker: 'CSAV.TO',
    name: 'CI High Interest Savings ETF',
    isin: 'CA12557U1021',
    asset_class: 'Liquidités',
    sub_class: 'Épargne à intérêt élevé',
    mer: 0.16,
    currency: 'CAD',
    exchange: 'TSX',
    expected_return: 3.0, // Taux BdC ~3.0% (fév. 2026)
    volatility: 0.2,
    preferred_account: 'REER',
    account_rationale: 'Épargne haut rendement CI',
  },
  {
    ticker: 'ZMMK.TO',
    name: 'BMO Money Market Fund ETF Series',
    isin: 'CA05590C1003',
    asset_class: 'Liquidités',
    sub_class: 'Marché monétaire',
    mer: 0.14,
    currency: 'CAD',
    exchange: 'TSX',
    expected_return: 2.9, // Marché monétaire légèrement sous le taux directeur
    volatility: 0.1,
    preferred_account: 'REER',
    account_rationale: 'Marché monétaire BMO, très stable',
  },
];

// ============================================================
// HELPER FUNCTIONS
// ============================================================

const instrumentMap = new Map<string, Instrument>(
  INSTRUMENTS.map((inst) => [inst.ticker, inst])
);

export function getInstrumentByTicker(ticker: string): Instrument | undefined {
  return instrumentMap.get(ticker);
}

export function getValidTickers(): Set<string> {
  return new Set(INSTRUMENTS.map((inst) => inst.ticker));
}

export function getInstrumentsByAssetClass(assetClass: AssetClass): Instrument[] {
  return INSTRUMENTS.filter((inst) => inst.asset_class === assetClass);
}

export function getInstrumentsSummaryForPrompt(): string {
  const grouped: Record<string, Instrument[]> = {};
  for (const inst of INSTRUMENTS) {
    if (!grouped[inst.asset_class]) grouped[inst.asset_class] = [];
    grouped[inst.asset_class].push(inst);
  }

  let summary = '';
  for (const [assetClass, instruments] of Object.entries(grouped)) {
    summary += `\n### ${assetClass}\n`;
    summary += '| Ticker | Nom | MER | Rend.att. | Volatilité | Devise | Compte préféré |\n';
    summary += '|--------|-----|-----|-----------|------------|--------|----------------|\n';
    for (const inst of instruments) {
      summary += `| ${inst.ticker} | ${inst.name} | ${inst.mer}% | ${inst.expected_return}% | ${inst.volatility}% | ${inst.currency} | ${inst.preferred_account} |\n`;
    }
  }
  return summary;
}

/**
 * Compact summary — top 2-3 ETFs per asset class (lowest MER + best return).
 * Reduces prompt size from ~3000 → ~600 tokens, leaving more room for AI JSON output.
 */
export function getInstrumentsSummaryCompact(): string {
  // Curated "best-in-class" ETFs per asset class: MER-optimized, broad market exposure
  const CURATED: Record<string, string[]> = {
    'Actions canadiennes': ['XIC.TO', 'VCN.TO', 'ZCN.TO'],
    'Actions américaines': ['VFV.TO', 'ZSP.TO', 'QQC.TO', 'VTI', 'VOO'],
    'Actions internationales': ['XEF.TO', 'VIU.TO', 'XAW.TO'],
    'Actions marchés émergents': ['XEC.TO', 'VEE.TO', 'VWO'],
    'Obligations canadiennes': ['ZAG.TO', 'VAB.TO', 'XSB.TO', 'ZFL.TO'],
    'Obligations mondiales': ['VGAB.TO', 'ZGB.TO'],
    'Immobilier (REITs)': ['ZRE.TO', 'VRE.TO'],
    'Or / Commodités': ['CGL-C.TO', 'MNT.TO'],
    'Liquidités': ['CASH.TO', 'PSA.TO'],
  };

  const grouped: Record<string, Instrument[]> = {};
  for (const inst of INSTRUMENTS) {
    if (!grouped[inst.asset_class]) grouped[inst.asset_class] = [];
    grouped[inst.asset_class].push(inst);
  }

  let summary = '';
  for (const [assetClass, tickers] of Object.entries(CURATED)) {
    const instruments = grouped[assetClass] || [];
    // Filter to only the curated tickers, preserving the curated order
    const selected = tickers
      .map(t => instruments.find(i => i.ticker === t))
      .filter((i): i is Instrument => i !== undefined);
    if (selected.length === 0) continue;

    summary += `\n**${assetClass}**\n`;
    summary += '| Ticker | MER | Rend.att. | Vol. | Devise | Compte |\n';
    summary += '|--------|-----|-----------|------|--------|--------|\n';
    for (const inst of selected) {
      summary += `| ${inst.ticker} | ${inst.mer}% | ${inst.expected_return}% | ${inst.volatility}% | ${inst.currency} | ${inst.preferred_account} |\n`;
    }
  }
  return summary;
}

