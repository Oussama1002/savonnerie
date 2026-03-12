import PDFDocument from "pdfkit";
import bwipjs from "bwip-js";

export interface TicketItemData {
  articleName: string;
  serviceName: string;
  quantity: number;
  width?: number;
  height?: number;
  unitPrice: number;
  totalPrice: number;
  barcode?: string;
  /** Optional status label (e.g. REÇU, PRÊT) to mirror UI ticket. */
  statusLabel?: string;
}

export interface TicketOrderData {
  ticketId: string;
  total: number;
  subtotal: number;
  discount?: number;
  discountRate?: number;
  paid: number;
  pickupDate: string;
  deliveryAddress?: string;
  isDelivery?: boolean;
  note?: string;
  items: TicketItemData[];
  /**
   * UI language so the PDF ticket matches the on-screen ticket.
   * Defaults to 'fr' if not provided.
   */
  language?: "fr" | "ar";
}

/** Build a simple ticket PDF and return as Buffer */
export function buildTicketPdf(data: TicketOrderData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const doc = new PDFDocument({ size: "A5", margin: 25 });
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const rest = data.total - data.paid;
    const lang = data.language === "ar" ? "ar" : "fr";

    const l = {
      title: lang === "ar" ? "مصبنة برو" : "SAVONNERIE PRO",
      subtitle: lang === "ar" ? "المصبنة العصرية" : "LA SAVONNERIE MODERNE",
      ticketClient: lang === "ar" ? "تذكرة الزبون" : "TICKET CLIENT",
      subtotal: lang === "ar" ? "المجموع الفرعي" : "Sous-total",
      discount: lang === "ar" ? "تخفيض" : "Remise",
      total: lang === "ar" ? "المجموع" : "Total",
      paid: lang === "ar" ? "مدفوع" : "Payé",
      rest: lang === "ar" ? "الباقي" : "Reste",
      ticketCode: lang === "ar" ? "رمز التذكرة" : "Code ticket",
    };

    // Header: mirror on-screen client ticket (see TicketView renderClientPrintTicket)
    doc.fontSize(14).font("Helvetica-Bold").text(l.title, { align: "center" });
    doc.moveDown(0.2);
    doc.fontSize(9).font("Helvetica").text(l.subtitle, { align: "center" });
    doc.moveDown(0.5);
    doc.fontSize(18).font("Helvetica-Bold").text(`#${data.ticketId}`, { align: "center" });
    doc.moveDown(0.2);
    doc
      .fontSize(8)
      .font("Helvetica-Bold")
      .text(l.ticketClient, { align: "center" });
    doc.moveDown(0.2);

    const pageWidth = doc.page.width || 595;

    const drawBody = () => {
      // Force articles/totals block to start WELL below the barcode area
      const minArticlesY = 230; // absolute Y position on A5 page
      // @ts-ignore pdfkit allows setting y directly
      if (doc.y < minArticlesY) doc.y = minArticlesY;

      // Define a centered visual block for articles + totals (so they don't touch the barcode)
      const blockWidth = 260; // fixed width for nicer centering
      const blockX = (pageWidth - blockWidth) / 2;
      const blockYStart = doc.y;

      // Articles list (each line: article + service + qty + price), centered
      data.items.forEach((item) => {
        const qtyStr =
          item.width != null && item.height != null
            ? `${(item.width * item.height).toFixed(2)} m²`
            : `x${item.quantity}`;
        const line = `${item.articleName} (${item.serviceName}) ${qtyStr}   ${item.totalPrice.toFixed(2)} DH`;
        doc
          .font("Helvetica")
          .fontSize(9)
          .text(line, blockX, doc.y, { width: blockWidth, align: "center" });
        doc.moveDown(0.25);
      });

      // Visual separator between articles and totals
      doc.moveDown(0.5);
      const sepY = doc.y;
      doc
        .moveTo(blockX, sepY)
        .lineTo(blockX + blockWidth, sepY)
        .lineWidth(0.5)
        .strokeColor("#e5e7eb")
        .stroke();
      doc.strokeColor("#000000");

      // Totals block with colored amounts (Remise orange, Payé green, Reste red), centered
      doc.moveDown(0.4);
      doc.font("Helvetica-Bold").fillColor("#000000");
      doc.text(`${l.subtotal}  ${data.subtotal.toFixed(2)} DH`, blockX, doc.y, {
        width: blockWidth,
        align: "center",
      });
      doc.moveDown(0.3);
      if (data.discount && data.discount > 0) {
        doc.fillColor("#ea580c"); // orange
        doc.text(`${l.discount}  -${data.discount.toFixed(2)} DH`, blockX, doc.y, {
          width: blockWidth,
          align: "center",
        });
        doc.fillColor("#000000");
        doc.moveDown(0.3);
      }
      doc
        .fontSize(11)
        .fillColor("#000000")
        .text(`${l.total}  ${data.total.toFixed(2)} DH`, blockX, doc.y, {
          width: blockWidth,
          align: "center",
        });
      doc.moveDown(0.3);
      doc
        .fontSize(9)
        .fillColor("#16a34a")
        .text(`${l.paid}  ${data.paid.toFixed(2)} DH`, blockX, doc.y, {
          width: blockWidth,
          align: "center",
        }); // green
      if (rest > 0) {
        doc.moveDown(0.3);
        doc
          .fillColor("#dc2626")
          .text(`${l.rest}  ${rest.toFixed(2)} DH`, blockX, doc.y, {
            width: blockWidth,
            align: "center",
          }); // red
      }
      doc.fillColor("#000000");
      doc.moveDown(0.6);

      // Draw a light border around the whole block so it's visually distinct
      const blockYEnd = doc.y;
      const blockHeight = blockYEnd - blockYStart;
      doc
        .lineWidth(0.5)
        .strokeColor("#e5e7eb")
        .roundedRect(blockX - 4, blockYStart - 4, blockWidth + 8, blockHeight + 8, 6)
        .stroke();
      doc.strokeColor("#000000");

      doc.end();
    };

    // Scannable barcode for ticketId directly after "TICKET CLIENT"
    bwipjs.toBuffer(
      {
        bcid: "code128",
        text: data.ticketId,
        scale: 2,          // smaller visual barcode
        height: 8,
        includetext: true,
        textxalign: "center",
      },
      (err: string | Error, png: Buffer) => {
        if (err) {
          console.error("[TicketPDF] Failed to generate ticket barcode:", err);
        } else if (png) {
          const imgWidth = 160; // narrower so it stays compact
          const x = (pageWidth - imgWidth) / 2;
          doc.image(png, x, doc.y, { width: imgWidth });
          // Large spacing directly under barcode so articles start clearly lower
          doc.moveDown(2.0);
        } else {
          // If no barcode image, still leave some space
          doc.moveDown(1.5);
        }
        // Draw the rest of the ticket content
        drawBody();
      },
    );
  });
}
