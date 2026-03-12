declare module "pdfkit" {
  interface PDFDocumentOptions {
    size?: string;
    margin?: number;
    autoFirstPage?: boolean;
  }

  interface PDFDocument {
    on(event: "data", listener: (chunk: Buffer) => void): this;
    on(event: "end", listener: () => void): this;
    on(event: "error", listener: (err: Error) => void): this;
    fontSize(size: number): this;
    font(name: string): this;
    text(text: string, x?: number, y?: number, options?: { align?: string; continued?: boolean }): this;
    moveDown(n?: number): this;
    end(): void;
    y: number;
  }

  const PDFDocument: {
    new (options?: PDFDocumentOptions): PDFDocument;
  };
  export default PDFDocument;
}
