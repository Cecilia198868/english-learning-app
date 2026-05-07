import { NextResponse } from "next/server";
import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";

export const runtime = "nodejs";

function normalizeExtractedText(text: string) {
  return text.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "没有收到文件" },
        { status: 400 }
      );
    }

    const lowerName = file.name.toLowerCase();

    if (lowerName.endsWith(".doc")) {
      return NextResponse.json(
        { error: "当前 .doc 文件暂不支持直接解析，建议保存为 docx 后上传。" },
        { status: 400 }
      );
    }

    if (
      !lowerName.endsWith(".txt") &&
      !lowerName.endsWith(".text") &&
      !lowerName.endsWith(".srt") &&
      !lowerName.endsWith(".docx") &&
      !lowerName.endsWith(".pdf")
    ) {
      return NextResponse.json(
        { error: "当前文件无法读取，请尝试 txt、docx 或可复制文本的 PDF。" },
        { status: 400 }
      );
    }

    let extractedText = "";

    if (
      lowerName.endsWith(".txt") ||
      lowerName.endsWith(".text") ||
      lowerName.endsWith(".srt")
    ) {
      extractedText = await file.text();
    } else if (lowerName.endsWith(".docx")) {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({
        buffer: Buffer.from(arrayBuffer),
      });
      extractedText = result.value || "";
    } else if (lowerName.endsWith(".pdf")) {
      const arrayBuffer = await file.arrayBuffer();
      const parser = new PDFParse({ data: Buffer.from(arrayBuffer) });
      try {
        const result = await parser.getText();
        extractedText = result.text || "";
      } finally {
        await parser.destroy();
      }
    }

    const normalizedText = normalizeExtractedText(extractedText);

    if (!normalizedText) {
      return NextResponse.json(
        { error: "当前文件无法读取，请尝试 txt、docx 或可复制文本的 PDF。" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      text: normalizedText,
      fileName: file.name,
    });
  } catch (error) {
    console.error("extract-text error", error);
    return NextResponse.json(
      { error: "当前文件无法读取，请尝试 txt、docx 或可复制文本的 PDF。" },
      { status: 500 }
    );
  }
}
