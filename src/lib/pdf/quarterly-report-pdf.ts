import type { Portfolio, PortfolioAllocation } from "@/types/database";
import { computeWeightedMer } from "@/lib/portfolio/helpers";

interface PortfolioWithAllocations extends Portfolio {
  allocations: PortfolioAllocation[];
}

interface NetWorthSnapshot {
  snapshot_date: string;
  total_assets: number | null;
  total_debts: number | null;
  net_worth: number | null;
}

interface Goal {
  label: string;
  type: string;
  target_amount: number;
  current_amount: number;
  target_date: string | null;
}

interface QuarterlyReportData {
  netWorth: {
    current: number;
    threeMonthsAgo: number | null;
    oneYearAgo: number | null;
    snapshots: NetWorthSnapshot[];
  };
  portfolioData: {
    name: string;
    type: string;
    expected_return: number | null;
    volatility: number | null;
    sharpe_ratio: number | null;
    total_mer: number | null;
  };
  goals: Goal[];
  fiscalData: {
    celiRoom: number;
    reerRoom: number;
    reerTaxSaving: number;
  };
}

interface GenerateQuarterlyReportPDFParams {
  portfolio: PortfolioWithAllocations;
  narrative: string;
  reportData: QuarterlyReportData;
}

function getQuarterLabel(): string {
  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();
  const quarter = Math.floor(month / 3) + 1;
  return `Q${quarter} ${year}`;
}

const CAD = new Intl.NumberFormat("fr-CA", {
  style: "currency",
  currency: "CAD",
  maximumFractionDigits: 0,
});

function formatPct(v: number | null): string {
  if (v == null) return "—";
  return `${v.toFixed(1)}%`;
}

export async function generateQuarterlyReportPDF({
  portfolio,
  narrative,
  reportData,
}: GenerateQuarterlyReportPDFParams) {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  const now = new Date().toLocaleDateString("fr-CA", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const quarter = getQuarterLabel();

  let y = 0;

  function addFooter() {
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(
        `Rapport trimestriel WealthPilot — ${quarter} — Généré le ${now} — Page ${i}/${totalPages}`,
        pageWidth / 2,
        pageHeight - 8,
        { align: "center" }
      );
    }
  }

  function checkPageBreak(needed: number) {
    if (y + needed > pageHeight - 20) {
      doc.addPage();
      y = margin;
    }
  }

  function getFinalY(): number {
    return (doc as unknown as Record<string, { finalY: number }>).lastAutoTable.finalY;
  }

  function sectionTitle(title: string) {
    checkPageBreak(16);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(40, 40, 60);
    doc.text(title, margin, y);
    y += 6;
  }

  // ===== 1. HEADER BAND =====
  doc.setFillColor(30, 30, 50);
  doc.rect(0, 0, pageWidth, 38, "F");

  // Accent line
  doc.setFillColor(99, 102, 241);
  doc.rect(0, 38, pageWidth, 2, "F");

  doc.setTextColor(255);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("WealthPilot", margin, 14);

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text("Rapport trimestriel de performance", margin, 22);

  doc.setFontSize(9);
  doc.setTextColor(180, 180, 220);
  doc.text(quarter, pageWidth - margin, 14, { align: "right" });
  doc.text(`Généré le ${now}`, pageWidth - margin, 22, { align: "right" });

  // Portfolio type badge
  const typeLabel = portfolio.type.charAt(0).toUpperCase() + portfolio.type.slice(1);
  doc.setFontSize(8);
  doc.text(`Portefeuille : ${portfolio.name} (${typeLabel})`, pageWidth - margin, 30, { align: "right" });

  y = 50;

  // ===== 2. NET WORTH SECTION =====
  sectionTitle("Valeur nette");

  const nw = reportData.netWorth;
  const currentNW = nw.current;
  const var3m =
    nw.threeMonthsAgo && nw.threeMonthsAgo > 0
      ? Math.round(((currentNW - nw.threeMonthsAgo) / nw.threeMonthsAgo) * 1000) / 10
      : null;
  const var1y =
    nw.oneYearAgo && nw.oneYearAgo > 0
      ? Math.round(((currentNW - nw.oneYearAgo) / nw.oneYearAgo) * 1000) / 10
      : null;

  autoTable(doc, {
    startY: y,
    head: [["Valeur nette actuelle", "Variation 3 mois", "Variation 1 an"]],
    body: [
      [
        CAD.format(currentNW),
        var3m !== null ? `${var3m >= 0 ? "+" : ""}${var3m}%` : "—",
        var1y !== null ? `${var1y >= 0 ? "+" : ""}${var1y}%` : "—",
      ],
    ],
    margin: { left: margin, right: margin },
    theme: "grid",
    headStyles: { fillColor: [99, 102, 241], fontSize: 8, halign: "center" },
    bodyStyles: { fontSize: 11, halign: "center", fontStyle: "bold" },
    tableWidth: contentWidth,
  });

  y = getFinalY() + 10;

  // ===== 3. PORTFOLIO SECTION =====
  sectionTitle("Portefeuille sélectionné");

  const avgMer = computeWeightedMer(portfolio.allocations);

  autoTable(doc, {
    startY: y,
    head: [["Rendement attendu", "Volatilité", "Sharpe", "RFG moyen"]],
    body: [
      [
        formatPct(portfolio.expected_return),
        formatPct(portfolio.volatility),
        portfolio.sharpe_ratio?.toFixed(2) || "—",
        avgMer !== null ? `${avgMer}%` : "—",
      ],
    ],
    margin: { left: margin, right: margin },
    theme: "grid",
    headStyles: { fillColor: [59, 130, 246], fontSize: 8, halign: "center" },
    bodyStyles: { fontSize: 10, halign: "center", fontStyle: "bold" },
    tableWidth: contentWidth,
  });

  y = getFinalY() + 6;

  // Allocations table
  const allocationBody = portfolio.allocations.map((a) => [
    a.asset_class,
    a.instrument_name,
    a.instrument_ticker,
    `${a.weight}%`,
    a.mer != null ? `${a.mer}%` : "—",
    a.suggested_account || "—",
  ]);

  autoTable(doc, {
    startY: y,
    head: [["Classe d'actifs", "Instrument", "Ticker", "Poids", "RFG", "Compte"]],
    body: allocationBody,
    margin: { left: margin, right: margin },
    theme: "striped",
    headStyles: { fillColor: [59, 130, 246], fontSize: 7 },
    bodyStyles: { fontSize: 7 },
    columnStyles: {
      3: { halign: "center" },
      4: { halign: "center" },
      5: { halign: "center" },
    },
    tableWidth: contentWidth,
  });

  y = getFinalY() + 10;

  // ===== 4. OBJECTIVES SECTION =====
  if (reportData.goals.length > 0) {
    sectionTitle("Objectifs de vie");

    const goalsBody = reportData.goals.map((g) => {
      const pct = g.target_amount > 0 ? Math.round((g.current_amount / g.target_amount) * 100) : 0;
      let daysLeft = "—";
      if (g.target_date) {
        const days = Math.floor(
          (new Date(g.target_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        );
        daysLeft = days < 0 ? "Dépassé" : days < 365 ? `${days} j` : `${Math.round(days / 365 * 10) / 10} ans`;
      }
      return [
        g.label,
        CAD.format(g.current_amount),
        CAD.format(g.target_amount),
        `${pct}%`,
        daysLeft,
      ];
    });

    autoTable(doc, {
      startY: y,
      head: [["Objectif", "Actuel", "Cible", "Progression", "Délai"]],
      body: goalsBody,
      margin: { left: margin, right: margin },
      theme: "striped",
      headStyles: { fillColor: [34, 197, 94], fontSize: 8 },
      bodyStyles: { fontSize: 8 },
      columnStyles: {
        3: { halign: "center" },
        4: { halign: "center" },
      },
      tableWidth: contentWidth,
    });

    y = getFinalY() + 10;
  }

  // ===== 5. FISCAL SECTION =====
  sectionTitle("Optimisations fiscales");

  autoTable(doc, {
    startY: y,
    head: [["Compte", "Espace disponible", "Opportunité"]],
    body: [
      [
        "CELI",
        CAD.format(reportData.fiscalData.celiRoom),
        "Croissance libre d'impôt",
      ],
      [
        "REER",
        CAD.format(reportData.fiscalData.reerRoom),
        `Économie fiscale potentielle : ${CAD.format(reportData.fiscalData.reerTaxSaving)}`,
      ],
    ],
    margin: { left: margin, right: margin },
    theme: "striped",
    headStyles: { fillColor: [245, 158, 11], fontSize: 8 },
    bodyStyles: { fontSize: 8 },
    tableWidth: contentWidth,
  });

  y = getFinalY() + 10;

  // ===== 6. AI NARRATIVE =====
  sectionTitle("Commentaire IA — Bilan trimestriel");

  if (narrative) {
    checkPageBreak(40);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(60);
    const lines = doc.splitTextToSize(narrative, contentWidth);
    doc.text(lines, margin, y);
    y += lines.length * 4.5 + 6;
  }

  // ===== FOOTER =====
  addFooter();

  // ===== SAVE =====
  doc.save(`WealthPilot_Rapport_${quarter.replace(" ", "_")}_${new Date().toISOString().slice(0, 10)}.pdf`);
}
