import { createCanvas } from "canvas";
import PDFDocument from "pdfkit";
import { Readable } from "stream";
import { logger } from "../../utils/logger.util";
import { console_util } from "../../utils/console.util";
import { ICanvasRenderRequest } from "../../types/core/chat.types";

/*** Rendering Service */
class RenderingService {
  /*** Create paper background based on style */
  private createPaperBackground(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    paperStyle: "lined" | "plain" | "college_ruled"
  ): void {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);

    if (paperStyle === "lined") {
      this.drawLinedPaper(ctx, width, height);
    } else if (paperStyle === "college_ruled") {
      this.drawCollegeRuledPaper(ctx, width, height);
    }
  }

  /*** Draw lined paper pattern */
  private drawLinedPaper(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number
  ): void {
    const lineSpacing = 28;
    const marginLeft = 50;
    const marginRight = 20;

    ctx.strokeStyle = "#b3b3cc";
    ctx.lineWidth = 0.8;

    for (let y = lineSpacing; y < height; y += lineSpacing) {
      ctx.beginPath();
      ctx.moveTo(marginLeft, y);
      ctx.lineTo(width - marginRight, y);
      ctx.stroke();
    }

    ctx.strokeStyle = "#ffcccc";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(marginLeft, 0);
    ctx.lineTo(marginLeft, height);
    ctx.stroke();
  }

  /*** Draw college ruled paper pattern */
  private drawCollegeRuledPaper(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number
  ): void {
    const lineSpacing = 32;
    const marginLeft = 60;
    const marginRight = 20;

    ctx.strokeStyle = "#d0d0f0";
    ctx.lineWidth = 1;

    for (let y = lineSpacing; y < height; y += lineSpacing) {
      ctx.beginPath();
      ctx.moveTo(marginLeft, y);
      ctx.lineTo(width - marginRight, y);
      ctx.stroke();
    }

    ctx.strokeStyle = "#ff9999";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(marginLeft, 0);
    ctx.lineTo(marginLeft, height);
    ctx.stroke();
  }

  /*** Simulate handwriting text with variations */
  private renderHandwritingText(
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    fontSize: number,
    handwritingProfile: ICanvasRenderRequest["handwritingProfile"],
    customizations: ICanvasRenderRequest["customizations"]
  ): number {
    ctx.font = `${fontSize}px "Courier New", monospace`;
    ctx.fillStyle = customizations.inkColor;
    ctx.textBaseline = "top";

    const {
      slant = 0,
      spacing = 1,
      lineIrregularity = 0.1,
      strokeWeight = 1,
    } = handwritingProfile.extractedStyles;

    const lineHeight = fontSize * customizations.lineSpacing;
    const words = text.split(" ");
    let currentX = x;
    let currentY = y;
    const maxWidth = 700;
    let totalHeight = 0;

    for (const word of words) {
      const wordWidth = ctx.measureText(word + " ").width * spacing;

      if (currentX + wordWidth > maxWidth) {
        currentY += lineHeight;
        currentX = x;
      }

      for (let i = 0; i < word.length; i++) {
        const char = word[i];

        const xOffset = currentX + Math.random() * lineIrregularity * 2 - lineIrregularity;
        const yOffset = currentY + Math.random() * lineIrregularity * 2 - lineIrregularity;

        ctx.save();
        ctx.translate(xOffset, yOffset);
        ctx.skewX((slant * Math.PI) / 180);
        ctx.globalAlpha = 0.7 + Math.random() * 0.3;

        ctx.fillText(char, 0, 0);
        ctx.restore();

        const charWidth = ctx.measureText(char).width * spacing;
        currentX += charWidth;
      }

      currentX += ctx.measureText(" ").width * spacing;
    }

    totalHeight = currentY - y + lineHeight;
    return totalHeight;
  }

  /*** Render text to canvas */
  async renderTextToCanvas(request: ICanvasRenderRequest): Promise<string> {
    try {
      const canvas = createCanvas(request.width, request.height);
      const ctx = canvas.getContext("2d");

      this.createPaperBackground(
        ctx,
        request.width,
        request.height,
        request.paperStyle
      );

      this.renderHandwritingText(
        ctx,
        request.text,
        request.customizations.marginLeft,
        request.customizations.marginTop,
        request.customizations.fontSize,
        request.handwritingProfile,
        request.customizations
      );

      const dataUrl = canvas.toDataURL("image/png");

      logger.info("RenderingService", "Canvas render complete", {
        width: request.width,
        height: request.height,
        textLength: request.text.length,
      });

      return dataUrl;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      logger.error("RenderingService", "Canvas rendering failed", {
        error: errorMessage,
      });

      console_util.error("RenderingService", "Canvas render failed", errorMessage);
      throw error;
    }
  }

  /*** Generate PDF from messages */
  async generatePdfFromMessages(
    messages: Array<{
      type: "user_question" | "ai_answer";
      content: string;
      canvasDataUrl?: string;
    }>,
    customizations: {
      fontSize: number;
      lineSpacing: number;
      marginLeft: number;
      marginTop: number;
    },
    paperStyle: "lined" | "plain" | "college_ruled"
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: "A4",
          margin: 50,
        });

        const chunks: Buffer[] = [];

        doc.on("data", (chunk: Buffer) => chunks.push(chunk));
        doc.on("end", () => resolve(Buffer.concat(chunks)));
        doc.on("error", reject);

        /*** Add header */
        doc.fontSize(16).text("Assignment Submission", { align: "center" });
        doc.fontSize(10).text(
          new Date().toLocaleDateString(),
          { align: "center" }
        );
        doc.moveDown();

        /*** Process each message */
        for (const message of messages) {
          if (message.type === "user_question") {
            doc.fontSize(11).font("Helvetica-Bold").text("Q: " + message.content);
            doc.moveDown(0.5);
          } else {
            doc.fontSize(11).text("A: " + message.content);
            doc.moveDown();

            /*** Add canvas preview if available */
            if (message.canvasDataUrl) {
              try {
                const base64Data = message.canvasDataUrl.replace(
                  /^data:image\/png;base64,/,
                  ""
                );
                const buffer = Buffer.from(base64Data, "base64");
                doc.image(buffer, {
                  width: 500,
                  height: 200,
                  align: "center",
                });
              } catch (e) {
                console_util.warn("RenderingService", "Failed to embed canvas", e);
              }
            }

            doc.moveDown();
          }
        }

        /*** Add footer */
        doc.fontSize(8).text("Generated by Assignmate", { align: "center" });

        doc.end();

        logger.info("RenderingService", "PDF generation complete", {
          messageCount: messages.length,
        });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        logger.error("RenderingService", "PDF generation failed", {
          error: errorMessage,
        });

        console_util.error("RenderingService", "PDF generation failed", errorMessage);
        reject(error);
      }
    });
  }
}

export const renderingService = new RenderingService();