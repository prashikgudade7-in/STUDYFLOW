import { PDFParse } from "pdf-parse";

const MAX_PDF_SIZE = 20 * 1024 * 1024;

// Extract text from an uploaded PDF
export async function extractPdfText(req, res) {
    let parser;

    try {
        const data = req.body?.data;

        if (typeof data !== "string" || !data.trim()) {
            return res.status(400).json({
                error: "Please upload a valid PDF."
            });
        }

        // Validate Base64 format
        const base64 = data.replace(/\s/g, "");

        if (
            base64.length % 4 !== 0 ||
            !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(base64)
        ) {
            return res.status(400).json({
                error: "Invalid PDF data."
            });
        }

        // Decode PDF
        const raw = Buffer.from(base64, "base64");

        // Maximum PDF size: 20 MB
        if (raw.length > MAX_PDF_SIZE) {
            return res.status(413).json({
                error: "PDF exceeds the 20 MB limit."
            });
        }

        if (!raw.length) {
            return res.status(400).json({
                error: "Please upload a valid PDF."
            });
        }

        // Check PDF signature
        if (raw.subarray(0, 5).toString("ascii") !== "%PDF-") {
            return res.status(400).json({
                error: "The uploaded file is not a valid PDF."
            });
        }

        parser = new PDFParse({ data: raw });

        const result = await parser.getText();

        const extracted = String(result.text || "").trim();

        if (!extracted) {
            return res.status(400).json({
                error: "No selectable text was found in this PDF."
            });
        }

        return res.json({
            text: extracted.slice(0, 60000)
        });

    } catch (error) {
        console.error("PDF extraction failed:", error?.name || "PDFProcessingError");

        return res.status(400).json({
            error: "Could not read this PDF. Please check that the file is valid."
        });

    } finally {
        if (parser) {
            await parser.destroy().catch(() => {});
        }
    }
}
