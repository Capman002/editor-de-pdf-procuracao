import { staticPlugin } from "@elysiajs/static";
import fontkit from "@pdf-lib/fontkit";
import { Elysia, t } from "elysia";
import { PDFDocument, PDFFont, PDFPage, rgb, StandardFonts } from "pdf-lib";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";

const SOURCE_PDF_PATH = "./Procuração UT PDF.pdf";
const PORT = Number(Bun.env.PORT ?? 3000);
const REGULAR_FONT_PATHS = [
  "/usr/share/fonts/truetype/msttcorefonts/Times_New_Roman.ttf",
  "/usr/share/fonts/truetype/msttcorefonts/times.ttf",
  "/usr/share/fonts/truetype/liberation2/LiberationSerif-Regular.ttf",
  "/usr/share/fonts/truetype/liberation/LiberationSerif-Regular.ttf",
  "/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf",
  "C:/Windows/Fonts/times.ttf",
];
const BOLD_FONT_PATHS = [
  "/usr/share/fonts/truetype/msttcorefonts/Times_New_Roman_Bold.ttf",
  "/usr/share/fonts/truetype/msttcorefonts/timesbd.ttf",
  "/usr/share/fonts/truetype/liberation2/LiberationSerif-Bold.ttf",
  "/usr/share/fonts/truetype/liberation/LiberationSerif-Bold.ttf",
  "/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf",
  "C:/Windows/Fonts/timesbd.ttf",
];

const schema = t.Object({
  nome: t.String({ minLength: 1, maxLength: 90 }),
  cpf: t.String({ minLength: 1, maxLength: 20 }),
  endereco: t.String({ minLength: 1, maxLength: 120 }),
  bairro: t.String({ minLength: 1, maxLength: 60 }),
  municipio: t.String({ minLength: 1, maxLength: 70 }),
  cep: t.String({ minLength: 1, maxLength: 20 }),
});

type PdfInput = typeof schema.static;

type FillArea = {
  x: number;
  y: number;
  width: number;
  text: string;
  size?: number;
  minSize?: number;
  bold?: boolean;
  align?: "left" | "center";
};

const sanitize = (value: string) => value.trim().replace(/\s+/g, " ");

const normalizePayload = (payload: PdfInput): PdfInput => ({
  nome: sanitize(payload.nome),
  cpf: sanitize(payload.cpf),
  endereco: sanitize(payload.endereco),
  bairro: sanitize(payload.bairro),
  municipio: sanitize(payload.municipio),
  cep: sanitize(payload.cep),
});

const embedTemplateFont = async (
  pdf: PDFDocument,
  paths: string[],
  fallback: StandardFonts,
) => {
  const path = paths.find((candidate) => existsSync(candidate));

  if (path) {
    const bytes = await readFile(path);
    return await pdf.embedFont(bytes, { subset: true });
  }

  return await pdf.embedFont(fallback);
};

const fitText = (
  font: PDFFont,
  text: string,
  size: number,
  minSize: number,
  width: number,
) => {
  let fittedSize = size;
  let clippedText = text;

  while (
    font.widthOfTextAtSize(clippedText, fittedSize) > width &&
    fittedSize > minSize
  ) {
    fittedSize -= 0.25;
  }

  while (
    font.widthOfTextAtSize(clippedText, fittedSize) > width &&
    clippedText.length > 1
  ) {
    clippedText = clippedText.slice(0, -1);
  }

  return {
    text: clippedText,
    size: fittedSize,
    width: font.widthOfTextAtSize(clippedText, fittedSize),
  };
};

const drawOverlayText = (
  page: PDFPage,
  area: FillArea,
  regular: PDFFont,
  bold: PDFFont,
) => {
  const font = area.bold ? bold : regular;
  const fitted = fitText(
    font,
    area.text,
    area.size ?? 11,
    area.minSize ?? 9.5,
    area.width,
  );
  const textX =
    area.align === "left"
      ? area.x
      : area.x + Math.max((area.width - fitted.width) / 2, 0);

  page.drawRectangle({
    x: textX - 1.5,
    y: area.y - 1,
    width: fitted.width + 3,
    height: fitted.size + 2,
    color: rgb(1, 1, 1),
    borderColor: rgb(1, 1, 1),
  });

  page.drawText(fitted.text, {
    x: textX,
    y: area.y,
    size: fitted.size,
    font,
    color: rgb(0, 0, 0),
  });
};

const generatePdf = async (input: PdfInput) => {
  const data = normalizePayload(input);
  const sourceBytes = await readFile(SOURCE_PDF_PATH);
  const sourcePdf = await PDFDocument.load(sourceBytes);
  const sourcePage = sourcePdf.getPage(0);
  const { width, height } = sourcePage.getSize();
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const [templatePage] = await pdf.embedPdf(sourceBytes, [0]);
  if (!templatePage) {
    throw new Error("Não foi possível carregar a página base do PDF.");
  }

  const page = pdf.addPage([width, height]);
  const timesRoman = await embedTemplateFont(
    pdf,
    REGULAR_FONT_PATHS,
    StandardFonts.TimesRoman,
  );
  const timesBold = await embedTemplateFont(
    pdf,
    BOLD_FONT_PATHS,
    StandardFonts.TimesRomanBold,
  );

  page.drawPage(templatePage, {
    x: 0,
    y: 0,
    width,
    height,
  });

  const areas: FillArea[] = [
    {
      x: 177,
      y: 692.5,
      width: 224,
      text: data.nome,
      size: 11,
      minSize: 9.5,
    },
    {
      x: 181,
      y: 676.4,
      width: 99,
      text: data.cpf,
      size: 11,
      minSize: 9.5,
    },
    {
      x: 88,
      y: 660.3,
      width: 254,
      text: data.endereco,
      size: 11,
      minSize: 9.5,
    },
    {
      x: 412,
      y: 660.3,
      width: 100,
      text: data.bairro,
      size: 11,
      minSize: 9.5,
    },
    {
      x: 183,
      y: 644.2,
      width: 113,
      text: data.municipio,
      size: 11,
      minSize: 9.5,
    },
    {
      x: 89,
      y: 628.1,
      width: 120,
      text: data.cep,
      size: 11,
      minSize: 9.5,
    },
  ];

  for (const area of areas) {
    drawOverlayText(page, area, timesRoman, timesBold);
  }

  return await pdf.save();
};

const app = new Elysia().post(
  "/api/generate",
  async ({ body, set }) => {
    const bytes = await generatePdf(body);
    set.headers["content-type"] = "application/pdf";
    set.headers["content-disposition"] =
      'attachment; filename="procuracao-preenchida.pdf"';
    const buffer = bytes.buffer.slice(
      bytes.byteOffset,
      bytes.byteOffset + bytes.byteLength,
    ) as ArrayBuffer;
    return new Response(new Blob([buffer], { type: "application/pdf" }));
  },
  { body: schema },
);

if (existsSync("./dist")) {
  app.use(staticPlugin({ assets: "dist", prefix: "/" }));
}

app.listen(PORT);

console.log(`Editor de PDF rodando em http://localhost:${PORT}`);
