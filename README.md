🧠 AI QA Assistant  - https://ai-qa-assistant-835925884833.us-west1.run.app/
<img width="1110" height="617" alt="image" src="https://github.com/user-attachments/assets/63abcb1e-d32b-4fc7-b75c-7a72426a7396" />

AI-Powered Test Case Generator | Script Builder | Accessibility Auditor
Built with React + TypeScript, powered by Google AI Studio APIs and Chrome’s Gemini Nano (window.ai) for local, private, and instant AI execution.

🚀 Project Overview

The AI QA Assistant is a Client-Side Single Page Application (SPA) designed to streamline and automate common QA workflows using Generative AI.
Its unique Hybrid AI Strategy combines on-device and cloud-based AI processing to ensure the best of both worlds:





⚡ Speed and Privacy (On-Device): Utilizes Chrome’s built-in Gemini Nano via window.ai for offline, private execution.



☁️ Reliability (Server-Side Fallback): Automatically switches to Google Gemini API if the local model is unavailable, ensuring consistent performance for all users.

This architecture guarantees speed, data privacy, and universal compatibility — making it an ideal AI-powered tool for testers and developers.

🧩 Core Features

🔹 AI Test Case Generator (TestCaseGenerator.tsx)

Transform plain-text requirements or user stories into structured, categorized test cases.
Key Highlights:





Categorizes tests as Positive, Negative, Boundary, Security, Performance, etc.



Live Editing: Inline edit any test case directly in the UI.



Export Options: Download results as JSON, CSV, or Excel (via SheetJS).



Elaborate Feature: Uses Writer API to enhance expected results with natural, detailed explanations.



Hybrid AI Logic:





✅ Uses window.ai.prompt() (Gemini Nano) when available.



🌐 Falls back to ai.models.generateContent() (Google Gemini API) when offline AI is unavailable.

🔹 AI Test Script Generator (TestScriptGenerator.tsx)

Converts natural-language test steps into runnable automation code for frameworks like Playwright, Pytest, or Cucumber.
Key Highlights:





Real-Time Code Streaming: Generates code token-by-token for instant feedback.



Framework-Specific Prompts: Tailors output for chosen frameworks and languages.



Cucumber Support: Auto-generates both .feature and step definition files separated by a special delimiter.

<img width="650" height="423" alt="image" src="https://github.com/user-attachments/assets/4ce90c73-d486-409c-8288-6ebb079ceaad" />
<img width="1133" height="515" alt="image" src="https://github.com/user-attachments/assets/dd60374d-a57a-4e74-819b-255fd5c35cf3" />



Hybrid AI Logic:





Local execution via session.promptStreaming() (Gemini Nano).



Fallback with ai.models.generateContentStream() for seamless continuity.

🔹 AI Accessibility Auditor (AdaAuditor.tsx)

Automatically scans websites for ADA / WCAG 2.1 accessibility issues.
Key Highlights:





Smart URL Pre-check: Prevents analysis of invalid links.



Comprehensive JSON Report with:





Accessibility Score (0–100)



Executive Summary



List of actionable findings with severity and WCAG mapping



Visual Score Gauge for instant understanding.



PDF Export using jspdf with a clean, professional report layout.



Summarizer API for concise “Key Takeaway” summaries.

⚙️ Built-in AI Insight Feature

A core innovation of the AI QA Assistant — AI Insight acts as an intelligent QA reviewer:





Detects missing validations and edge cases in generated test cases.



Suggests new test ideas based on requirement context.



Provides auto-summarization for lengthy test data and reports.



Powered by Google’s Prompt, Writer, and Summarize APIs.

🧠 Hybrid AI Architecture

LayerEngineRoleKey Advantage🧩 Primary (Client-Side)window.ai (Gemini Nano)Executes locally using Chrome’s on-device AIFast, Private, Offline☁️ Secondary (Server-Side)Google Gemini APIFallback for non-supported devicesReliable, Always Available

Every AI-powered tool (Test Case Generator, Script Generator, Accessibility Auditor) follows this dual-path design.

🛠️ Tech Stack

Frontend: React, TypeScript, Tailwind CSS
AI Integration: Chrome Gemini Nano (window.ai), Google Gemini APIs (Prompt, Writer, Summarize)
Utilities: SheetJS, jsPDF, highlight.js
Architecture: Client-side SPA with built-in offline capability

**Prerequisites:**  


Enable Chrome's Built-in AI (Gemini Nano)
To use the on-device AI for enhanced privacy and speed, please follow these steps. This requires Google Chrome version 127 or newer.

Enable Prompt API: Navigate to chrome://flags/#prompt-api-for-gemini-nano, set it to "Enabled", and relaunch Chrome.
Enable On-Device Model: Navigate to chrome://flags/#optimization-guide-on-device-model, set it to "Enabled BypassPerfRequirement", and relaunch.
Check AI settings: Navigate to chrome://settings/ai, and ensure "On-device AI" or a similar feature is enabled. The model will download in the background.
These features are experimental and may change. The application will fall back to server-side APIs if the built-in AI is unavailable.
