import React, { useState, useEffect } from 'react';
import { GoogleGenAI, Type } from "@google/genai";

// Makes the `jspdf` global from the script tag available
declare var jspdf: any;

// --- TYPES ---
interface Finding {
    title: string;
    description: string;
    wcagGuideline: string;
    severity: 'Error' | 'Warning';
    problematicCode: string;
    suggestedSolution: string;
}

interface AuditResult {
    score: number;
    summary: string;
    findings: Finding[];
}

type FilterType = 'All' | 'Error' | 'Warning';


// --- ICONS ---
const ErrorIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" /></svg>;
const WarningIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" /></svg>;
const DownloadIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>;

// --- UI COMPONENTS ---
const ScoreGauge: React.FC<{ score: number }> = ({ score }) => {
    const getScoreColor = () => {
        if (score >= 90) return 'text-green-400';
        if (score >= 50) return 'text-yellow-400';
        return 'text-red-400';
    };

    const circumference = 2 * Math.PI * 45; // r=45
    const offset = circumference - (score / 100) * circumference;

    return (
        <div className={`relative w-32 h-32 ${getScoreColor()}`}>
            <svg className="w-full h-full" viewBox="0 0 100 100">
                <circle className="text-gray-700" strokeWidth="10" stroke="currentColor" fill="transparent" r="45" cx="50" cy="50" />
                <circle
                    strokeWidth="10"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="transparent"
                    r="45"
                    cx="50"
                    cy="50"
                    className="transform -rotate-90 origin-center transition-all duration-1000 ease-out"
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold text-white">{score}</span>
                <span className="text-sm font-medium text-gray-400">Score</span>
            </div>
        </div>
    );
};

const SummaryModal: React.FC<{ show: boolean; content: string; onClose: () => void }> = ({ show, content, onClose }) => {
    if (!show) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <div className="relative bg-gray-800 rounded-xl shadow-2xl p-8 max-w-2xl w-full mx-4 border border-gray-700" onClick={e => e.stopPropagation()}>
                <h2 className="text-xl font-bold text-teal-400 mb-4">Key Points</h2>
                <p className="text-gray-300">{content}</p>
                <button onClick={onClose} className="mt-6 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-colors w-full sm:w-auto">Close</button>
            </div>
        </div>
    );
};

// --- MAIN COMPONENT ---
const AdaAuditor: React.FC = () => {
    const [url, setUrl] = useState('https://demoqa.com/');
    const [auditResult, setAuditResult] = useState<AuditResult | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [activeFilter, setActiveFilter] = useState<FilterType>('All');
    const [isSummarizing, setIsSummarizing] = useState(false);
    const [showSummaryModal, setShowSummaryModal] = useState(false);
    const [condensedSummary, setCondensedSummary] = useState('');

    const generateAdaReport = async () => {
        setError(null);
        setAuditResult(null);

        let validatedUrl;
        try {
            if (!url.trim()) throw new Error("Please enter a URL.");
            validatedUrl = new URL(url);
            if (validatedUrl.protocol !== 'http:' && validatedUrl.protocol !== 'https:') {
                throw new Error('Please enter a valid HTTP or HTTPS URL.');
            }
        } catch (e: any) {
            setError(e.message || "Invalid URL format. Please enter a full URL (e.g., https://example.com).");
            return;
        }

        setIsLoading(true);

        try {
            // Pre-check: Verify if the URL is accessible before calling the AI
            await fetch(validatedUrl.href, { method: 'HEAD', mode: 'no-cors' });
        } catch (e) {
            setIsLoading(false);
            setError(`The provided URL is not accessible. This could be due to a typo, the website being down, or a network issue. Please check the address and try again.`);
            return;
        }

        let jsonResponseText = '';

        try {
            const prompt = `
            Act as an expert accessibility engineer. Analyze the website at the URL "${url}" for ADA and WCAG 2.1 compliance issues.
            Your response must be a single, valid JSON object. CRITICALLY IMPORTANT: Do not include any text, markdown, or explanations outside of this single JSON object.
            The JSON object must have three properties: "score", "summary", and "findings".
            - "score": An integer between 0 and 100 representing the overall accessibility score.
            - "summary": A 2-3 sentence string summarizing the key accessibility barriers and areas for improvement.
            - "findings": An array of 5-7 of the most critical and actionable findings. Each object in the array must contain:
                - "title": A concise string (e.g., "Missing Alt Text for Informative Images").
                - "description": A string explaining the issue in 2-3 sentences.
                - "wcagGuideline": A string with the specific WCAG guideline and level (e.g., "1.1.1 Non-text Content (A)").
                - "severity": A string, either "Error" or "Warning".
                - "problematicCode": A string containing a short, representative snippet of the problematic HTML code.
                - "suggestedSolution": A string explaining how to fix the issue, including a corrected code snippet enclosed in markdown backticks (\`\`\`html ... \`\`\`).
            `;

            // HACKATHON RULE: PRIMARY API - CHROME BUILT-IN AI
            // @ts-ignore
            if (window.ai && (await window.ai.canCreateTextSession()) === 'readily') {
                 console.log("Using Chrome's built-in AI.");
                // @ts-ignore
                const session = await window.ai.createTextSession();
                jsonResponseText = await session.prompt(prompt);
            } else {
                 // HACKATHON RULE: SECONDARY API - SERVER-SIDE GEMINI
                console.log("Falling back to server-side Gemini API.");
                const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

                const responseSchema = {
                    type: Type.OBJECT,
                    properties: {
                        score: { type: Type.INTEGER },
                        summary: { type: Type.STRING },
                        findings: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    title: { type: Type.STRING },
                                    description: { type: Type.STRING },
                                    wcagGuideline: { type: Type.STRING },
                                    severity: { type: Type.STRING, enum: ['Error', 'Warning'] },
                                    problematicCode: { type: Type.STRING },
                                    suggestedSolution: { type: Type.STRING }
                                },
                                required: ["title", "description", "wcagGuideline", "severity", "problematicCode", "suggestedSolution"]
                            }
                        }
                    },
                    required: ["score", "summary", "findings"]
                };

                const response = await ai.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents: prompt,
                    config: {
                        responseMimeType: "application/json",
                        responseSchema,
                    }
                });
                jsonResponseText = response.text;
            }

            const result = JSON.parse(jsonResponseText);
            setAuditResult(result);
        } catch (e: any) {
            console.error(e);
            setError("Failed to generate audit report. The AI model may be overloaded. Please try again later.");
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleGetKeyPoints = async () => {
        if (!auditResult?.summary || isSummarizing) return;
        setIsSummarizing(true);
        setError(null);
        try {
            let summaryText = '';
            const prompt = `Summarize the following accessibility report summary into a single, concise sentence highlighting the main takeaway. Original summary: "${auditResult.summary}"`;

            // HACKATHON RULE: PRIMARY API - CHROME BUILT-IN SUMMARIZER API
            // @ts-ignore
            if (window.ai && window.ai.createSummarizer) {
                console.log("Using built-in Summarizer API.");
                // @ts-ignore
                const summarizer = await window.ai.createSummarizer();
                summaryText = await summarizer.summarize(auditResult.summary);
            } else {
                // HACKATHON RULE: SECONDARY API - SERVER-SIDE GEMINI
                console.log("Falling back to server-side API for summarizer.");
                const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
                const response = await ai.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents: prompt,
                });
                summaryText = response.text;
            }

            setCondensedSummary(summaryText);
            setShowSummaryModal(true);

        } catch (e) {
            console.error("Failed to summarize", e);
            setError("Failed to get key points.");
        } finally {
            setIsSummarizing(false);
        }
    };
    
    const handleDownloadPdf = () => {
        if (!auditResult || !url) return;

        try {
            const { jsPDF } = jspdf;
            const doc = new jsPDF({ orientation: 'p', unit: 'pt', format: 'a4' });

            // --- DOCUMENT CONSTANTS ---
            const PAGE_WIDTH = doc.internal.pageSize.getWidth();
            const PAGE_HEIGHT = doc.internal.pageSize.getHeight();
            const MARGIN = 50;
            const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
            const FOOTER_HEIGHT = 30;
            const HEADER_HEIGHT = 30;
            const USABLE_PAGE_HEIGHT = PAGE_HEIGHT - HEADER_HEIGHT - FOOTER_HEIGHT;

            const FONT_SIZES = { h1: 24, h2: 18, h3: 14, body: 10, small: 8, code: 9 };
            const COLORS = { text: '#333333', heading: '#111111', primary: '#4f46e5', error: '#d9534f', warning: '#f0ad4e', lightGray: '#f3f4f6', mediumGray: '#6b7280', border: '#e5e7eb' };
            let y = MARGIN;

            // --- HELPER FUNCTIONS ---
            const addPageHeaderAndFooter = (pageNum: number, totalPages: number) => {
              doc.setFont('Helvetica', 'normal');
              doc.setFontSize(FONT_SIZES.small);
              doc.setTextColor(COLORS.mediumGray);
              doc.text(`AI Accessibility Audit Report | ${url}`, MARGIN, HEADER_HEIGHT);
              
              doc.text(`Page ${pageNum} of ${totalPages}`, PAGE_WIDTH / 2, PAGE_HEIGHT - (FOOTER_HEIGHT / 2), { align: 'center' });

              doc.setDrawColor(COLORS.border);
              doc.line(MARGIN, HEADER_HEIGHT + 5, PAGE_WIDTH - MARGIN, HEADER_HEIGHT + 5);
            };
            
            const addPage = () => {
              doc.addPage();
              y = HEADER_HEIGHT + MARGIN;
            };

            const renderText = (text: string, x: number, maxWidth: number, size: number, options: {font?: string, style?: string, color?: string} = {}) => {
              const { font = 'Helvetica', style = 'normal', color = COLORS.text } = options;
              doc.setFont(font, style);
              doc.setFontSize(size);
              doc.setTextColor(color);
              const lines = doc.splitTextToSize(text, maxWidth);
              lines.forEach((line: string) => {
                  if (y > USABLE_PAGE_HEIGHT + HEADER_HEIGHT) {
                      addPage();
                  }
                  doc.text(line, x, y);
                  y += size * 1.2;
              });
            };
            
             const calculateTextHeight = (text: string, maxWidth: number, size: number) => {
               const lines = doc.splitTextToSize(text, maxWidth);
               return lines.length * size * 1.2;
            }
            
            const renderCodeBlock = (code: string, x: number, maxWidth: number) => {
              const lines = doc.splitTextToSize(code, maxWidth - 20);
              const blockHeight = (lines.length * FONT_SIZES.code * 1.2) + 20;

              if (y + blockHeight > USABLE_PAGE_HEIGHT + HEADER_HEIGHT) {
                  addPage();
              }

              doc.setFillColor(COLORS.lightGray);
              doc.roundedRect(x, y, maxWidth, blockHeight, 3, 3, 'F');
              const startY = y;
              y += 15;
              renderText(code, x + 10, maxWidth - 20, FONT_SIZES.code, {font: 'Courier'});
              y = startY + blockHeight;
            }
            
             const calculateCodeBlockHeight = (code: string, maxWidth: number) => {
              const lines = doc.splitTextToSize(code, maxWidth - 20);
              return (lines.length * FONT_SIZES.code * 1.2) + 20;
            }

             const renderSolution = (solutionText: string, x: number, maxWidth: number) => {
                  const parts = solutionText.split(/(```(?:[a-zA-Z]+)?\n[\s\S]*?\n```)/g);
                  const filteredParts = parts.filter(part => part.trim() !== '');

                  filteredParts.forEach((part, index) => {
                      if (y > USABLE_PAGE_HEIGHT + HEADER_HEIGHT) addPage();
                      
                      if (part.startsWith('```')) {
                          const codeMatch = part.match(/```(?:[a-zA-Z]+)?\n([\s\S]*?)\n```/);
                          const code = codeMatch ? codeMatch[1].trim() : '';
                          renderCodeBlock(code, x, maxWidth);
                      } else {
                          const textWithInlineCode = part.replace(/`([^`]+)`/g, '$1');
                          renderText(textWithInlineCode, x, maxWidth, FONT_SIZES.body);
                      }
                      if (index < filteredParts.length - 1) {
                          y += 10;
                      }
                  });
              };

              const calculateSolutionHeight = (solutionText: string, maxWidth: number): number => {
                  let totalHeight = 0;
                  const parts = solutionText.split(/(```(?:[a-zA-Z]+)?\n[\s\S]*?\n```)/g);
                  const filteredParts = parts.filter(part => part.trim() !== '');
                  filteredParts.forEach((part, index) => {
                      if (part.startsWith('```')) {
                          const codeMatch = part.match(/```(?:[a-zA-Z]+)?\n([\s\S]*?)\n```/);
                          const code = codeMatch ? codeMatch[1].trim() : '';
                          totalHeight += calculateCodeBlockHeight(code, maxWidth);
                      } else {
                          const textWithInlineCode = part.replace(/`([^`]+)`/g, '$1');
                          totalHeight += calculateTextHeight(textWithInlineCode, maxWidth, FONT_SIZES.body);
                      }
                      if (index < filteredParts.length - 1) {
                          totalHeight += 10;
                      }
                  });
                  return totalHeight;
              };


            // --- COVER PAGE ---
            y = MARGIN + HEADER_HEIGHT;
            doc.setFont('Helvetica', 'bold');
            doc.setFontSize(32);
            doc.setTextColor(COLORS.heading);
            doc.text('AI Accessibility Audit Report', PAGE_WIDTH / 2, y + 80, { align: 'center' });
            y += 120;
            doc.setFont('Helvetica', 'normal');
            doc.setFontSize(14);
            doc.setTextColor(COLORS.primary);
            doc.textWithLink(url, PAGE_WIDTH / 2, y, { align: 'center', url });
            y += 100;

            const boxWidth = CONTENT_WIDTH * 0.8;
            const boxX = (PAGE_WIDTH - boxWidth) / 2;
            doc.setDrawColor(COLORS.border);
            doc.roundedRect(boxX, y, boxWidth, 120, 5, 5, 'S');
            
            const getProgressColor = (progress: number) => {
              if (progress < 50) return COLORS.error;
              if (progress < 90) return COLORS.warning;
              return '#5cb85c';
            };
            
            const scoreX = boxX + boxWidth / 4;
            doc.setFontSize(12); doc.setTextColor(COLORS.text); doc.text('Overall Score', scoreX, y + 30, { align: 'center' });
            doc.setFont('Helvetica', 'bold'); doc.setFontSize(48); doc.setTextColor(getProgressColor(auditResult.score));
            doc.text(auditResult.score.toString(), scoreX, y + 80, { align: 'center' });
            
            doc.setDrawColor(COLORS.border); doc.line(boxX + boxWidth / 2, y + 15, boxX + boxWidth / 2, y + 105);

            const issuesX = boxX + (boxWidth / 4) * 3;
            const errorCount = auditResult.findings.filter(i => i.severity === 'Error').length;
            const warningCount = auditResult.findings.filter(i => i.severity === 'Warning').length;
            doc.setFont('Helvetica', 'normal'); doc.setFontSize(12); doc.setTextColor(COLORS.text);
            doc.text('Issue Summary', issuesX, y + 30, { align: 'center' });
            doc.setFont('Helvetica', 'bold'); doc.setFontSize(14);
            doc.setTextColor(COLORS.error); doc.text(`${errorCount} Errors`, issuesX, y + 65, { align: 'center' });
            doc.setTextColor(COLORS.warning); doc.text(`${warningCount} Warnings`, issuesX, y + 85, { align: 'center' });
            
            y += 200;
            const reportDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
            doc.setFont('Helvetica', 'normal'); doc.setFontSize(FONT_SIZES.small); doc.setTextColor(COLORS.mediumGray);
            doc.text(`Report Generated: ${reportDate}`, PAGE_WIDTH / 2, y, { align: 'center' });

            // --- CONTENT PAGES ---
            if (auditResult.findings.length > 0) addPage();

            renderText('Executive Summary', MARGIN, CONTENT_WIDTH, FONT_SIZES.h2, {style: 'bold', color: COLORS.heading});
            y += 15;
            renderText(auditResult.summary, MARGIN, CONTENT_WIDTH, FONT_SIZES.body);
            y += 30;

            if (y > USABLE_PAGE_HEIGHT + HEADER_HEIGHT - 50) addPage();
            renderText('Detailed Findings', MARGIN, CONTENT_WIDTH, FONT_SIZES.h2, {style: 'bold', color: COLORS.heading});
            y += 20;

            auditResult.findings.forEach(issue => {
              const PADDING = { card: 20, section: 20, item: 8 };
              const cardContentX = MARGIN + 15;
              const cardContentWidth = CONTENT_WIDTH - 25;

              const cardContentHeight = 
                  PADDING.card + // Top padding
                  calculateTextHeight(issue.title, cardContentWidth, FONT_SIZES.h3) + 5 +
                  calculateTextHeight(`Severity: ${issue.severity} | WCAG: ${issue.wcagGuideline}`, cardContentWidth, FONT_SIZES.small) +
                  PADDING.section +
                  calculateTextHeight(issue.description, cardContentWidth, FONT_SIZES.body) +
                  PADDING.section +
                  calculateTextHeight('Problematic Code', cardContentWidth, FONT_SIZES.body) + PADDING.item +
                  calculateCodeBlockHeight(issue.problematicCode, cardContentWidth) +
                  PADDING.section +
                  calculateTextHeight('Suggested Solution', cardContentWidth, FONT_SIZES.body) + PADDING.item +
                  calculateSolutionHeight(issue.suggestedSolution, cardContentWidth) +
                  PADDING.card; // Bottom padding

              if (y + cardContentHeight > USABLE_PAGE_HEIGHT + HEADER_HEIGHT) {
                  addPage();
              }

              const cardStartY = y;
              const severityColor = issue.severity === 'Error' ? COLORS.error : COLORS.warning;
              
              doc.setDrawColor(COLORS.border);
              doc.roundedRect(MARGIN, cardStartY, CONTENT_WIDTH, cardContentHeight, 5, 5, 'S');
              
              doc.setFillColor(severityColor);
              doc.rect(MARGIN, cardStartY, 5, cardContentHeight, 'F');
              
              y = cardStartY + PADDING.card;
              renderText(issue.title, cardContentX, cardContentWidth, FONT_SIZES.h3, { style: 'bold', color: COLORS.heading });
              y += 5;
              renderText(`Severity: ${issue.severity} | WCAG: ${issue.wcagGuideline}`, cardContentX, cardContentWidth, FONT_SIZES.small, { color: COLORS.mediumGray });
              y += PADDING.section;
              renderText(issue.description, cardContentX, cardContentWidth, FONT_SIZES.body);
              y += PADDING.section;
              renderText('Problematic Code', cardContentX, cardContentWidth, FONT_SIZES.body, {style: 'bold'});
              y += PADDING.item;
              renderCodeBlock(issue.problematicCode, cardContentX, cardContentWidth);
              y += PADDING.section;
              renderText('Suggested Solution', cardContentX, cardContentWidth, FONT_SIZES.body, {style: 'bold'});
              y += PADDING.item;
              renderSolution(issue.suggestedSolution, cardContentX, cardContentWidth);
              
              y = cardStartY + cardContentHeight + 20;
            });
            
            // --- FINALIZATION: ADD HEADERS & FOOTERS ---
            const totalPages = doc.internal.getNumberOfPages();
            for (let i = 1; i <= totalPages; i++) {
                doc.setPage(i);
                addPageHeaderAndFooter(i, totalPages);
            }
            
            doc.save(`Accessibility_Audit_Report_${new URL(url).hostname}.pdf`);

        } catch (err) {
            console.error("Failed to generate PDF:", err);
            setError("There was an error creating the PDF report.");
        }
    };

    const filteredFindings = auditResult?.findings.filter(f =>
        activeFilter === 'All' || f.severity === activeFilter
    );
    const errorCount = auditResult?.findings.filter(f => f.severity === 'Error').length || 0;
    const warningCount = auditResult?.findings.filter(f => f.severity === 'Warning').length || 0;
    
    const processSolutionHtml = (solution: string) => {
        // First, remove markdown images
        const withoutImages = solution.replace(/!\[.*?\]\(.*?\)/g, '');
        // Then, convert markdown code blocks to HTML pre/code tags
        return withoutImages.replace(/```(html)?\n([\s\S]*?)```/g, '<pre class="bg-gray-900 p-2 rounded-md overflow-x-auto"><code class="language-html">$2</code></pre>');
    };

    return (
        <div className="max-w-4xl mx-auto py-8">
            <SummaryModal show={showSummaryModal} content={condensedSummary} onClose={() => setShowSummaryModal(false)} />
            <header className="text-center mb-8">
                <h1 className="text-4xl font-extrabold text-white">AI-Powered Accessibility Audit</h1>
                <p className="mt-2 text-lg text-gray-400">Instantly analyze your website for ADA & WCAG compliance issues and get expert, code-level recommendations from Gemini.</p>
            </header>

            <div className="bg-gray-900/50 border border-gray-700/50 rounded-xl p-6 shadow-lg">
                <div className="flex flex-col sm:flex-row gap-4">
                    <input
                        type="url"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        placeholder="https://example.com"
                        className="flex-grow bg-gray-800 border border-gray-600 rounded-md py-3 px-4 text-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    />
                    <button
                        onClick={generateAdaReport}
                        disabled={isLoading}
                        className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800/50 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                         {isLoading && <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>}
                        {isLoading ? 'Auditing...' : 'Audit Website'}
                    </button>
                </div>
            </div>

            {error && <div className="mt-6 text-red-400 bg-red-500/10 p-4 rounded-md border border-red-500/30">{error}</div>}

            {!isLoading && !auditResult && !error && (
                <div className="text-center text-gray-500 mt-12">
                     <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-16 h-16 mx-auto mb-4"><path strokeLinecap="round" strokeLinejoin="round" d="M15.182 15.182a4.5 4.5 0 0 1-6.364 0M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75s.168-.75.375-.75.375.336.375.75Zm4.5 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75Z" /></svg>
                    <h3 className="text-xl font-semibold text-gray-400">Your audit results will appear here</h3>
                    <p className="max-w-sm mt-2 mx-auto">Enter a website URL above and click "Audit Website" to begin your analysis.</p>
                </div>
            )}
            
            {auditResult && (
                <div className="mt-8 space-y-8">
                    <div className="bg-gray-900/50 border border-gray-700/50 rounded-xl p-6 shadow-lg">
                        <h2 className="text-2xl font-bold mb-4">Audit Results</h2>
                        <div className="flex flex-col md:flex-row items-start gap-6">
                           <div className="flex-1">
                                <p className="text-sm font-medium text-gray-400">For: <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">{url}</a></p>
                                <p className="mt-2 text-gray-300">{auditResult.summary}</p>
                                <button 
                                    onClick={handleGetKeyPoints} 
                                    disabled={isSummarizing || isLoading}
                                    className="text-sm text-blue-400 hover:underline mt-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                                >
                                    {isSummarizing ? (
                                        <>
                                            <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                            <span>Getting points...</span>
                                        </>
                                    ) : (
                                        <span>Get Key Points</span>
                                    )}
                                </button>
                                <div className="mt-4 flex items-center gap-4 text-sm">
                                    <span className="flex items-center gap-1.5 text-red-400"><ErrorIcon /> {errorCount} Errors</span>
                                    <span className="flex items-center gap-1.5 text-yellow-400"><WarningIcon /> {warningCount} Warnings</span>
                                </div>
                           </div>
                           <div className="flex flex-col items-center gap-4">
                               <ScoreGauge score={auditResult.score} />
                               <button onClick={handleDownloadPdf} className="w-full bg-blue-600/20 hover:bg-blue-600/40 border border-blue-500/30 text-blue-300 font-semibold py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm"><DownloadIcon /> Download PDF Report</button>
                           </div>
                        </div>
                    </div>

                    <div>
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-2xl font-bold">Detailed Findings</h2>
                            <div className="flex items-center gap-2 bg-gray-800 p-1 rounded-lg">
                                {(['All', 'Error', 'Warning'] as FilterType[]).map(filter => (
                                    <button
                                        key={filter}
                                        onClick={() => setActiveFilter(filter)}
                                        className={`px-3 py-1 text-sm font-semibold rounded-md transition-colors ${activeFilter === filter ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-700'}`}
                                    >
                                        {filter} {filter !== 'All' ? `(${filter === 'Error' ? errorCount : warningCount})` : `(${(errorCount + warningCount)})`}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="space-y-4">
                            {filteredFindings?.map((finding, index) => (
                                <div key={index} className={`bg-gray-900/50 border rounded-xl p-5 ${finding.severity === 'Error' ? 'border-red-500/30' : 'border-yellow-500/30'}`}>
                                    <div className="flex items-start gap-3">
                                         <span className={`mt-1 ${finding.severity === 'Error' ? 'text-red-500' : 'text-yellow-500'}`}>{finding.severity === 'Error' ? <ErrorIcon /> : <WarningIcon />}</span>
                                        <div className="flex-1">
                                            <h3 className="text-lg font-bold text-gray-100">{finding.title}</h3>
                                            <p className="text-xs text-gray-500 mt-1">{finding.wcagGuideline}</p>
                                            <p className="text-sm text-gray-400 mt-2">{finding.description}</p>
                                        </div>
                                    </div>
                                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <h4 className="font-semibold mb-2 text-gray-300">Problematic Code</h4>
                                            <pre className="bg-gray-800 p-3 rounded-md overflow-x-auto"><code className="language-html text-gray-400">{finding.problematicCode}</code></pre>
                                        </div>
                                         <div>
                                            <h4 className="font-semibold mb-2 text-gray-300">Suggested Solution</h4>
                                            <div className="bg-gray-800/50 p-3 rounded-md text-gray-400 space-y-2" dangerouslySetInnerHTML={{ __html: processSolutionHtml(finding.suggestedSolution) }}></div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdaAuditor;