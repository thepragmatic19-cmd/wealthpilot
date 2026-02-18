import type { Portfolio, PortfolioAllocation } from "@/types/database";
import { computeWeightedMer } from "@/lib/portfolio/helpers";

interface PortfolioWithAllocations extends Portfolio {
  allocations: PortfolioAllocation[];
}

const ASSET_CLASS_COLORS: Record<string, [number, number, number]> = {
  'Actions canadiennes': [59, 130, 246],
  'Actions américaines': [99, 102, 241],
  'Actions internationales': [139, 92, 246],
  'Actions marchés émergents': [168, 85, 247],
  'Obligations canadiennes': [6, 182, 212],
  'Obligations mondiales': [20, 184, 166],
  'Immobilier (REITs)': [245, 158, 11],
  'Or / Commodités': [234, 179, 8],
  'Liquidités': [107, 114, 128],
};

function formatPct(value: number): string {
  return `${value.toFixed(1)}%`;
}

export async function generatePortfolioPDF(portfolio: PortfolioWithAllocations) {
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

  let y = 0;

  // --- Helper: add page footer ---
  function addFooter() {
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(
        `Document généré par WealthPilot — ${now} — Page ${i}/${totalPages}`,
        pageWidth / 2,
        pageHeight - 8,
        { align: "center" }
      );
    }
  }

  // --- Helper: check page break ---
  function checkPageBreak(needed: number) {
    if (y + needed > pageHeight - 20) {
      doc.addPage();
      y = margin;
    }
  }

  // --- Helper: get finalY after autoTable ---
  function getFinalY(): number {
    return (doc as unknown as Record<string, { finalY: number }>).lastAutoTable.finalY;
  }

  // ===== 1. HEADER BAND =====
  doc.setFillColor(30, 30, 40);
  doc.rect(0, 0, pageWidth, 32, "F");
  doc.setTextColor(255);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("WealthPilot", margin, 14);
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(portfolio.name, margin, 22);
  doc.setFontSize(9);
  doc.text(now, pageWidth - margin, 14, { align: "right" });
  const typeLabel = portfolio.type.charAt(0).toUpperCase() + portfolio.type.slice(1);
  doc.text(`Profil : ${typeLabel}`, pageWidth - margin, 22, { align: "right" });

  y = 40;

  // ===== 2. KEY METRICS =====
  doc.setTextColor(60);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Metriques cles", margin, y);
  y += 4;

  const avgMer = computeWeightedMer(portfolio.allocations);

  autoTable(doc, {
    startY: y,
    head: [[
      "Rendement attendu",
      "Volatilite",
      "Ratio de Sharpe",
      "Perte max. historique",
      "RFG moyen pondere",
    ]],
    body: [[
      formatPct(portfolio.expected_return || 0),
      formatPct(portfolio.volatility || 0),
      portfolio.sharpe_ratio?.toFixed(2) || "—",
      `-${formatPct(Math.abs(portfolio.max_drawdown || 0))}`,
      avgMer !== null ? `${avgMer}%` : "—",
    ]],
    margin: { left: margin, right: margin },
    theme: "grid",
    headStyles: { fillColor: [59, 130, 246], fontSize: 8, halign: "center" },
    bodyStyles: { fontSize: 10, halign: "center", fontStyle: "bold" },
    tableWidth: contentWidth,
  });

  y = getFinalY() + 10;

  // ===== 3. ALLOCATION TABLE =====
  checkPageBreak(40);
  doc.setTextColor(60);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Allocation d'actifs", margin, y);
  y += 4;

  const allocationBody = portfolio.allocations.map((alloc) => [
    alloc.asset_class,
    alloc.instrument_name,
    alloc.instrument_ticker,
    `${alloc.weight}%`,
    alloc.mer != null ? `${alloc.mer}%` : "—",
    alloc.expected_return != null ? `${alloc.expected_return}%` : "—",
    alloc.suggested_account || "—",
  ]);

  autoTable(doc, {
    startY: y,
    head: [["Classe d'actifs", "Instrument", "Ticker", "Poids", "RFG", "Rendement", "Compte"]],
    body: allocationBody,
    margin: { left: margin, right: margin },
    theme: "striped",
    headStyles: { fillColor: [59, 130, 246], fontSize: 8 },
    bodyStyles: { fontSize: 8 },
    columnStyles: {
      0: { cellWidth: 35 },
      3: { halign: "center" },
      4: { halign: "center" },
      5: { halign: "center" },
      6: { halign: "center" },
    },
    tableWidth: contentWidth,
    didParseCell: (data) => {
      if (data.section === "body" && data.column.index === 0) {
        const assetClass = data.cell.raw as string;
        const color = ASSET_CLASS_COLORS[assetClass];
        if (color) {
          data.cell.styles.textColor = color;
        }
      }
    },
  });

  y = getFinalY() + 10;

  // ===== 4. STRESS TEST =====
  if (portfolio.stress_test) {
    checkPageBreak(35);
    doc.setTextColor(60);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Stress test", margin, y);
    y += 4;

    autoTable(doc, {
      startY: y,
      head: [["Scenario", "Impact estime"]],
      body: [
        ["Choc inflationniste", portfolio.stress_test.inflation_shock],
        ["Krach boursier", portfolio.stress_test.market_crash],
        ["Hausse des taux d'interet", portfolio.stress_test.interest_rate_hike],
      ],
      margin: { left: margin, right: margin },
      theme: "striped",
      headStyles: { fillColor: [239, 68, 68], fontSize: 8 },
      bodyStyles: { fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 50, fontStyle: "bold" },
      },
      tableWidth: contentWidth,
    });

    y = getFinalY() + 10;
  }

  // ===== 5. TAX STRATEGY =====
  if (portfolio.tax_strategy) {
    checkPageBreak(30);
    doc.setTextColor(60);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Strategie fiscale", margin, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(80);
    const taxLines = doc.splitTextToSize(portfolio.tax_strategy, contentWidth);
    doc.text(taxLines, margin, y);
    y += taxLines.length * 4.5 + 8;
  }

  // ===== 6. AI RATIONALE =====
  if (portfolio.ai_rationale) {
    checkPageBreak(30);
    doc.setTextColor(60);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Justification de l'IA", margin, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(80);
    const rationaleLines = doc.splitTextToSize(portfolio.ai_rationale, contentWidth);
    doc.text(rationaleLines, margin, y);
  }

  // ===== FOOTER =====
  addFooter();

  // ===== SAVE =====
  const safeName = portfolio.name.replace(/[^a-zA-Z0-9À-ÿ\s-]/g, "").replace(/\s+/g, "_");
  doc.save(`WealthPilot_${safeName}_${new Date().toISOString().slice(0, 10)}.pdf`);
}
