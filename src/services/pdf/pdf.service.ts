import { PDFDocument, rgb, PageSizes } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import axios from "axios";
import { IHandwritingSnapshot } from "../../types/core/chat.types";
import { logger } from "../../utils/logger.util";
import { console_util } from "../../utils/console.util";

export interface IPdfRenderOptions {
    paperStyle: "lined" | "plain" | "college_ruled";
    customizations: {
        inkColor: string;   // hex e.g. "#1a1a6e"
        fontSize: number;   // e.g. 18
        lineSpacing: number; // multiplier e.g. 1.8
        marginLeft: number;  // points e.g. 72
        marginTop: number;   // points e.g. 72
    };
}

export interface IPdfRenderResult {
    pdfBytes: Uint8Array;
    pageCount: number;
    fileSize: number;
}

/*** Paper dimensions — A4 */
const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;

/*** Convert hex color "#1a1a6e" → pdf-lib rgb() */
function hexToRgb(hex: string): { r: number; g: number; b: number } {
    const clean = hex.replace("#", "");
    return {
        r: parseInt(clean.substring(0, 2), 16) / 255,
        g: parseInt(clean.substring(2, 4), 16) / 255,
        b: parseInt(clean.substring(4, 6), 16) / 255,
    };
}

/*** Apply slant-based character jitter — makes text look hand-placed */
function applyHandwritingVariation(
    snapshot: IHandwritingSnapshot,
    charIndex: number
): { xOffset: number; yOffset: number; sizeVariation: number } {
    const { slant, lineIrregularity, spacing } = snapshot.extractedStyles;

    // Slight random vertical wobble based on lineIrregularity
    const wobble = (Math.sin(charIndex * 2.3 + 0.7) * lineIrregularity * 3);

    // Slant causes progressive x-shift per character
    const slantOffset = (slant - 0.5) * 0.4; // -0.2 to +0.2 pts per char

    // Very subtle size variation (±5% max)
    const sizeVar = 1 + Math.sin(charIndex * 1.7) * 0.025;

    return {
        xOffset: slantOffset,
        yOffset: wobble,
        sizeVariation: sizeVar,
    };
}

/*** Draw lined paper background */
function drawLinedBackground(
    page: ReturnType<PDFDocument["addPage"]>,
    lineSpacingPts: number,
    marginTop: number,
    style: "lined" | "college_ruled"
): void {
    const lineColor = style === "college_ruled"
        ? rgb(0.53, 0.71, 0.89)  // college blue
        : rgb(0.75, 0.85, 0.95); // lighter ruled

    // Horizontal lines
    let y = PAGE_HEIGHT - marginTop;
    while (y > 60) {
        page.drawLine({
            start: { x: 40, y },
            end: { x: PAGE_WIDTH - 40, y },
            thickness: 0.5,
            color: lineColor,
            opacity: 0.6,
        });
        y -= lineSpacingPts;
    }

    // Red margin line for college ruled
    if (style === "college_ruled") {
        page.drawLine({
            start: { x: 72, y: PAGE_HEIGHT - 40 },
            end: { x: 72, y: 40 },
            thickness: 1,
            color: rgb(0.9, 0.3, 0.3),
            opacity: 0.5,
        });
    }
}

/*** Core service: renders text to PDF using the user's TTF font */
export class HandwritingPdfService {

    /*** Download font bytes from a URL (Cloudinary TTF link) */
    private async fetchFontBytes(fontUrl: string): Promise<Uint8Array> {
        console_util.verbose("HandwritingPdfService", "Fetching font from Cloudinary", { fontUrl });
        const response = await axios.get(fontUrl, { responseType: "arraybuffer" });
        return new Uint8Array(response.data);
    }

    /*** Wrap text into lines that fit within maxWidth using the embedded font */
    private wrapText(
        text: string,
        font: Awaited<ReturnType<PDFDocument["embedFont"]>>,
        fontSize: number,
        maxWidth: number
    ): string[] {
        const paragraphs = text.split("\n");
        const lines: string[] = [];

        for (const para of paragraphs) {
            if (para.trim() === "") {
                lines.push("");
                continue;
            }

            const words = para.split(" ");
            let currentLine = "";

            for (const word of words) {
                const testLine = currentLine ? `${currentLine} ${word}` : word;
                const testWidth = font.widthOfTextAtSize(testLine, fontSize);

                if (testWidth > maxWidth && currentLine !== "") {
                    lines.push(currentLine);
                    currentLine = word;
                } else {
                    currentLine = testLine;
                }
            }

            if (currentLine) {
                lines.push(currentLine);
            }
        }

        return lines;
    }

    /*** Main method: render Q&A messages into a handwriting-style PDF */
    async renderChatToPdf(
        messages: Array<{ type: "user_question" | "ai_answer"; content: string }>,
        handwritingSnapshot: IHandwritingSnapshot,
        options: IPdfRenderOptions,
        fontUrl?: string  // Cloudinary TTF URL from the user's profile
    ): Promise<IPdfRenderResult> {
        const startTime = Date.now();
        const { customizations, paperStyle } = options;

        const pdfDoc = await PDFDocument.create();
        pdfDoc.registerFontkit(fontkit);

        // --- Load font: use custom TTF if available, else fall back to Helvetica ---
        let font: Awaited<ReturnType<PDFDocument["embedFont"]>>;
        let usingCustomFont = false;

        if (fontUrl) {
            try {
                const fontBytes = await this.fetchFontBytes(fontUrl);
                font = await pdfDoc.embedFont(fontBytes);
                usingCustomFont = true;
                console_util.success("HandwritingPdfService", "Custom handwriting font embedded", {});
            } catch (err) {
                logger.error("HandwritingPdfService", "Failed to load custom font, using fallback", { err });
                const { StandardFonts } = await import("pdf-lib");
                font = await pdfDoc.embedFont(StandardFonts.Helvetica);
            }
        } else {
            // No font yet — use a cursive-looking standard font as placeholder
            const { StandardFonts } = await import("pdf-lib");
            font = await pdfDoc.embedFont(StandardFonts.Helvetica);
            logger.error("HandwritingPdfService", "No TTF font URL provided — using fallback", {});
        }

        const {
            inkColor,
            fontSize,
            lineSpacing,
            marginLeft,
            marginTop,
        } = customizations;

        const { slant, strokeWeight, lineIrregularity } = handwritingSnapshot.extractedStyles;

        // Ink colour
        const inkRgb = hexToRgb(inkColor);
        const ink = rgb(inkRgb.r, inkRgb.g, inkRgb.b);

        // Effective fontSize adjusted by strokeWeight (heavier = slightly larger)
        const effectiveFontSize = fontSize * (0.9 + strokeWeight * 0.2);

        // Line height in points
        const lineHeight = effectiveFontSize * lineSpacing;

        // Usable width
        const marginRight = 40;
        const usableWidth = PAGE_WIDTH - marginLeft - marginRight;

        // Build flat list of lines with labels
        interface RenderLine {
            text: string;
            isLabel: boolean;
            isEmpty: boolean;
        }

        const allLines: RenderLine[] = [];

        for (const msg of messages) {
            if (msg.type === "user_question") {
                allLines.push({ text: `Q: ${msg.content}`, isLabel: true, isEmpty: false });
            } else {
                // Clean markdown bold/headers from AI response for cleaner handwriting look
                const cleaned = msg.content
                    .replace(/#{1,6}\s*/g, "")
                    .replace(/\*\*(.*?)\*\*/g, "$1")
                    .replace(/\*(.*?)\*/g, "$1");

                const wrapped = this.wrapText(cleaned, font, effectiveFontSize, usableWidth);
                for (const line of wrapped) {
                    allLines.push({
                        text: line,
                        isLabel: false,
                        isEmpty: line.trim() === "",
                    });
                }
            }
            // Gap between messages
            allLines.push({ text: "", isLabel: false, isEmpty: true });
        }

        // --- Paginate lines ---
        let currentPage = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
        if (paperStyle !== "plain") {
            drawLinedBackground(currentPage, lineHeight, marginTop, paperStyle);
        }

        // Draw title / date header on first page
        const titleFont = font;
        currentPage.drawText("Assignment Submission", {
            x: PAGE_WIDTH / 2 - titleFont.widthOfTextAtSize("Assignment Submission", 14) / 2,
            y: PAGE_HEIGHT - marginTop + 20,
            size: 14,
            font: titleFont,
            color: ink,
            opacity: 0.8,
        });

        const dateStr = new Date().toLocaleDateString("en-IN", {
            day: "numeric", month: "long", year: "numeric"
        });
        currentPage.drawText(dateStr, {
            x: PAGE_WIDTH / 2 - titleFont.widthOfTextAtSize(dateStr, 10) / 2,
            y: PAGE_HEIGHT - marginTop + 4,
            size: 10,
            font: titleFont,
            color: ink,
            opacity: 0.5,
        });

        let cursorY = PAGE_HEIGHT - marginTop - lineHeight;
        let charGlobalIndex = 0;
        let pageCount = 1;

        for (const line of allLines) {
            // Need a new page?
            if (cursorY < marginTop + lineHeight) {
                currentPage.drawText("— continued —", {
                    x: PAGE_WIDTH / 2 - 30,
                    y: 30,
                    size: 8,
                    font,
                    color: ink,
                    opacity: 0.3,
                });

                currentPage = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
                pageCount++;

                if (paperStyle !== "plain") {
                    drawLinedBackground(currentPage, lineHeight, marginTop, paperStyle);
                }

                cursorY = PAGE_HEIGHT - marginTop - lineHeight;
            }

            if (line.isEmpty) {
                cursorY -= lineHeight * 0.5;
                continue;
            }

            const renderSize = line.isLabel
                ? effectiveFontSize * 0.95
                : effectiveFontSize;

            const labelInk = line.isLabel
                ? rgb(inkRgb.r * 0.7, inkRgb.g * 0.7, inkRgb.b * 0.7)
                : ink;

            if (usingCustomFont && !line.isLabel) {
                // Render character-by-character with handwriting variation
                let cursorX = marginLeft;

                for (let ci = 0; ci < line.text.length; ci++) {
                    const char = line.text[ci];
                    const { xOffset, yOffset, sizeVariation } = applyHandwritingVariation(
                        handwritingSnapshot,
                        charGlobalIndex + ci
                    );

                    const charSize = renderSize * sizeVariation;
                    const charWidth = font.widthOfTextAtSize(char, charSize);

                    // Apply slant as a slight x skew per line position
                    const slantX = (slant - 0.5) * (cursorY / PAGE_HEIGHT) * 2;

                    currentPage.drawText(char, {
                        x: cursorX + xOffset + slantX,
                        y: cursorY + yOffset,
                        size: charSize,
                        font,
                        color: ink,
                        opacity: 0.85 + (strokeWeight * 0.15),
                    });

                    // Spacing: adjusted by the spacing profile value
                    const spacingMultiplier = 0.85 + handwritingSnapshot.extractedStyles.spacing * 0.1;
                    cursorX += charWidth * spacingMultiplier + xOffset * 0.1;
                }

                charGlobalIndex += line.text.length;
            } else {
                // Fallback: draw whole line at once
                currentPage.drawText(line.text, {
                    x: marginLeft,
                    y: cursorY,
                    size: renderSize,
                    font,
                    color: labelInk,
                    opacity: 0.9,
                });
            }

            cursorY -= lineHeight;
        }

        // Footer on last page
        currentPage.drawText("Generated by Assignmate", {
            x: PAGE_WIDTH / 2 - font.widthOfTextAtSize("Generated by Assignmate", 8) / 2,
            y: 20,
            size: 8,
            font,
            color: ink,
            opacity: 0.3,
        });

        const pdfBytes = await pdfDoc.save();

        logger.info("HandwritingPdfService", "PDF rendered", {
            pageCount,
            fileSize: pdfBytes.length,
            usingCustomFont,
            processingTimeMs: Date.now() - startTime,
        });

        return {
            pdfBytes,
            pageCount,
            fileSize: pdfBytes.length,
        };
    }
}

export const handwritingPdfService = new HandwritingPdfService();