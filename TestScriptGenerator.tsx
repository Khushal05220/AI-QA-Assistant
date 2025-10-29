import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI } from "@google/genai";

// Makes the `hljs` global from the script tag available
declare var hljs: any;

// --- CONFIGURATION & TYPES ---
const frameworks = {
  Playwright: ["Python", "TypeScript", "JavaScript", "Java"],
  Selenium: ["Python", "Java", "JavaScript"],
  Cypress: ["TypeScript", "JavaScript"],
  Puppeteer: ["JavaScript"],
  Robot: ["Python"],
  Cucumber: ["TypeScript", "JavaScript"],
};
type Framework = keyof typeof frameworks;

const examples = [
    { name: "Go to google.com...", text: "Navigate to google.com and assert that the title is 'Google'." },
    { name: "Navigate to the Playwright website...", text: "Navigate to the Playwright website, click the 'Get Started' link, and verify the URL is '/docs/intro'."},
    { name: "Visit example.com...", text: "Visit example.com, find the h1 element, and assert that its text contains 'Example Domain'."}
];

// --- ICONS & UI COMPONENTS ---
const CopyIcon: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 0 1-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 0 1 1.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 0 0-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 0 1-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 0 0-3.375-3.375h-1.5a1.125 1.125 0 0 1-1.125-1.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H9.75" /></svg>;
const SparklesIcon: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={className}><path d="M10.868 2.884c.321-.772.117-1.671-.43-2.226s-1.455-.752-2.226-.431L5.334 1.73c-.772.321-1.671.117-2.226-.43s-.752-1.455-.431-2.226L4.1 1.268c.321-.772.117-1.671-.43-2.226s-1.455-.752-2.226-.431l-1.414 3.414c-.321.772-.117 1.671.43 2.226s1.455.752 2.226.431l3.414-1.414c.772-.321 1.671-.117 2.226.43s.752 1.455.431 2.226l-1.414 3.414c-.321.772-.117 1.671.43 2.226s1.455.752 2.226.431l3.414-1.414c.772-.321 1.671-.117 2.226.43s.752 1.455.431 2.226l-1.414 3.414c-.321.772-.117 1.671.43 2.226s1.455.752 2.226.431l3.414-1.414c.772-.321 1.671-.117 2.226.43s.752 1.455.431 2.226l-1.414 3.414c-.321.772-.117 1.671.43 2.226s1.455.752 2.226.431l3.414-1.414c.772-.321 1.671-.117 2.226.43s.752 1.455.431 2.226L15.898 18.73c-.321.772-.117 1.671.43 2.226s1.455.752 2.226.431l1.414-3.414c.321-.772.117-1.671-.43-2.226s-1.455-.752-2.226-.431l-3.414 1.414c-.772.321-1.671.117-2.226-.43s-.752-1.455-.431-2.226l1.414-3.414c.321.772.117-1.671-.43-2.226s-1.455-.752-2.226-.431l-3.414 1.414c-.772.321-1.671.117-2.226-.43s-.752-1.455-.431-2.226l1.414-3.414c.321.772.117-1.671-.43-2.226s-1.455-.752 2.226-.431l3.414 1.414Z" /></svg>

const Toast: React.FC<{ message: string; show: boolean; onDismiss: () => void }> = ({ message, show, onDismiss }) => {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(() => onDismiss(), 3000);
      return () => clearTimeout(timer);
    }
  }, [show, onDismiss]);

  return (
    <div className={`fixed top-20 right-8 transition-all duration-300 ${show ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'} pointer-events-none z-50`}>
      <div className="bg-green-600/90 backdrop-blur-sm text-white font-semibold py-2 px-5 rounded-lg shadow-lg border border-green-500">
        {message}
      </div>
    </div>
  );
};

// --- MAIN COMPONENT ---
const TestScriptGenerator: React.FC = () => {
    const [selectedFramework, setSelectedFramework] = useState<Framework>("Playwright");
    const [selectedLanguage, setSelectedLanguage] = useState(frameworks.Playwright[0]);
    const [displayedFramework, setDisplayedFramework] = useState<Framework>(selectedFramework);
    const [displayedLanguage, setDisplayedLanguage] = useState<string>(selectedLanguage);
    const [userInput, setUserInput] = useState(examples[1].text);
    const [generatedCode, setGeneratedCode] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showToast, setShowToast] = useState(false);
    const codeResultRef = useRef<HTMLDivElement>(null);
    const textAreaRef = useRef<HTMLTextAreaElement>(null);

    const handleFrameworkChange = (framework: Framework) => {
        setSelectedFramework(framework);
        setSelectedLanguage(frameworks[framework][0]);
    };

    const triggerToast = (message: string) => {
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
    };

    const getSystemPrompt = (framework: Framework, language: string) => {
        let prompt = `You are an expert AI programming assistant specializing in test automation for the framework "${framework}" using the language "${language}".
Your task is to generate a clean, complete, and runnable test script based on the user's request.
GENERATE ONLY THE RAW CODE. Do not include any markdown, explanations, or any text other than the code itself.
`;
    
        switch (framework) {
            case 'Playwright':
                prompt += `Use modern locators like page.getByRole, page.getByLabel, page.getByText, etc. Avoid XPath unless absolutely necessary. For Python, use the sync API. For TypeScript/JavaScript, provide a complete example including imports and a test() block.`;
                break;
            case 'Cypress':
                prompt += `Generate a Cypress spec file using 'it()' or 'specify()'. Use cy.get(), cy.contains(), and other standard Cypress commands. Include assertions using .should().`;
                break;
            case 'Cucumber':
                prompt += `IMPORTANT: Generate TWO distinct code blocks separated by a unique delimiter '---CUCUMBER_SEPARATOR---'.
1. The first block must be a Gherkin '.feature' file.
2. The second block must be the corresponding step definitions file in '${language}'.
The step definitions should use a browser automation library like Playwright or Selenium.`;
                break;
            case 'Selenium':
                 prompt += `Use WebDriverWait for explicit waits and the By class for locating elements. Avoid thread sleeps.`;
                 break;
            default:
                 prompt += `Follow the best practices for the "${framework}" framework.`;
        }
        return prompt;
    };
    
    const stateRef = useRef({ isLoading, selectedFramework, selectedLanguage });
    useEffect(() => {
        stateRef.current = { isLoading, selectedFramework, selectedLanguage };
    }, [isLoading, selectedFramework, selectedLanguage]);

    const handleGenerate = useCallback(async () => {
        const currentInput = textAreaRef.current?.value;
        const { isLoading: currentIsLoading, selectedFramework: currentFramework, selectedLanguage: currentLanguage } = stateRef.current;

        if (!currentInput?.trim() || currentIsLoading) return;
        
        setIsLoading(true);
        setError(null);
        setGeneratedCode('');
        setDisplayedFramework(currentFramework);
        setDisplayedLanguage(currentLanguage);
    
        try {
            const systemInstruction = getSystemPrompt(currentFramework, currentLanguage);
            
            // HACKATHON RULE: PRIMARY API - CHROME BUILT-IN AI (STREAMING)
            // @ts-ignore
            if (window.ai && (await window.ai.canCreateTextSession()) === 'readily') {
                console.log("Using Chrome's built-in AI for streaming.");
                // @ts-ignore
                const session = await window.ai.createTextSession();
                const fullPrompt = systemInstruction + "\n\n---\n\n" + currentInput;
                const stream = session.promptStreaming(fullPrompt);

                for await (const chunk of stream) {
                    setGeneratedCode(prev => prev + chunk);
                }
            } else {
                // HACKATHON RULE: SECONDARY API - SERVER-SIDE GEMINI (STREAMING)
                console.log("Falling back to server-side Gemini API for streaming.");
                const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
                const responseStream = await ai.models.generateContentStream({
                    model: 'gemini-2.5-pro',
                    contents: currentInput,
                    config: { systemInstruction },
                });
        
                for await (const chunk of responseStream) {
                    const chunkText = chunk.text;
                    if (chunkText) {
                        setGeneratedCode(prev => prev + chunkText);
                    }
                }
            }
        } catch (e: any) {
            console.error("AI Generation Error:", e.message);
            setError("Failed to generate script. The AI model may be overloaded. Please try again.");
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        // FIX: Only run highlighting when loading is complete to prevent instability
        if (!isLoading && generatedCode && codeResultRef.current) {
            codeResultRef.current.querySelectorAll('pre code').forEach((block) => {
                hljs.highlightElement(block);
            });
        }
    }, [isLoading, generatedCode]);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
                event.preventDefault();
                handleGenerate();
            }
        };
        const textarea = textAreaRef.current;
        if (textarea) {
            textarea.addEventListener('keydown', handleKeyDown);
            return () => textarea.removeEventListener('keydown', handleKeyDown);
        }
    }, [handleGenerate]);
    
    const handleCopy = () => {
        if (!generatedCode) return;
        const codeToCopy = generatedCode.replace(/---CUCUMBER_SEPARATOR---/g, '\n\n');
        navigator.clipboard.writeText(codeToCopy);
        triggerToast("Copied to clipboard!");
    };
    
    const renderGeneratedCode = () => {
        const parts = generatedCode.split('---CUCUMBER_SEPARATOR---');
        if (displayedFramework === 'Cucumber' && parts.length > 1) {
            return (
                <>
                    <h3 className="text-sm font-semibold text-gray-400 mb-2">// *.feature file</h3>
                    <pre className="mb-4"><code className="language-gherkin rounded-md">{parts[0]}</code></pre>
                    <h3 className="text-sm font-semibold text-gray-400 my-2">// Step definitions ({displayedLanguage})</h3>
                    <pre><code className={`language-${displayedLanguage.toLowerCase()} rounded-md`}>{parts[1]}</code></pre>
                </>
            );
        }
        return <pre><code className={`language-${displayedLanguage.toLowerCase()} rounded-md`}>{generatedCode}</code></pre>;
    };

    return (
        <div className="flex flex-col lg:flex-row gap-6 p-2 sm:p-4 lg:p-6 min-h-[calc(100vh-85px)] bg-gray-950">
            <Toast message="Copied to clipboard!" show={showToast} onDismiss={() => setShowToast(false)} />

            {/* Left Panel */}
            <aside className="lg:w-1/2 xl:w-5/12 flex flex-col gap-6">
                <div className="bg-gray-900 border border-gray-800 rounded-xl shadow-lg p-6">
                    <h2 className="text-2xl font-bold text-gray-100">Describe Your Test Case</h2>
                    <div className="grid grid-cols-2 gap-4 mt-4">
                        <div>
                            <label htmlFor="framework" className="block text-sm font-medium text-gray-400 mb-1">Framework</label>
                            <select id="framework" value={selectedFramework} onChange={(e) => handleFrameworkChange(e.target.value as Framework)} className="w-full bg-gray-800 border border-gray-700 rounded-md p-2 text-gray-200 focus:ring-2 focus:ring-teal-500 focus:border-teal-500">
                                {Object.keys(frameworks).map(f => <option key={f} value={f}>{f}</option>)}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="language" className="block text-sm font-medium text-gray-400 mb-1">Language</label>
                            <select id="language" value={selectedLanguage} onChange={(e) => setSelectedLanguage(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-md p-2 text-gray-200 focus:ring-2 focus:ring-teal-500 focus:border-teal-500">
                                {frameworks[selectedFramework].map(l => <option key={l} value={l}>{l}</option>)}
                            </select>
                        </div>
                    </div>
                </div>

                <div className="bg-gray-900 border border-gray-800 rounded-xl shadow-lg p-6 flex-grow flex flex-col">
                    <p className="text-sm text-gray-400 mb-2">Write down the steps you want to automate in plain English. The more specific you are, the better the generated code will be.</p>
                    <textarea
                        ref={textAreaRef}
                        defaultValue={userInput}
                        onChange={(e) => setUserInput(e.target.value)}
                        placeholder="e.g., Go to example.com, find the main heading, and check if it contains 'Example Domain'."
                        className="w-full flex-grow bg-gray-800/50 border border-gray-700 rounded-md p-4 text-gray-300 text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors resize-none"
                        rows={10}
                    />
                     <p className="text-xs text-gray-500 mt-2">Tip: Press <kbd className="font-sans border border-gray-600 rounded px-1.5 py-0.5">Cmd/Ctrl</kbd> + <kbd className="font-sans border border-gray-600 rounded px-1.5 py-0.5">Enter</kbd> to generate.</p>
                </div>
                
                 <div className="bg-gray-900 border border-gray-800 rounded-xl shadow-lg p-6">
                     <p className="text-sm font-medium text-gray-400 mb-3">Or try an example:</p>
                     <div className="flex flex-wrap gap-2">
                        {examples.map(ex => (
                            <button key={ex.name} onClick={() => {
                                setUserInput(ex.text);
                                if (textAreaRef.current) {
                                    textAreaRef.current.value = ex.text;
                                }
                            }} className="text-sm bg-gray-800 hover:bg-gray-700/80 border border-gray-700 text-gray-300 px-3 py-1.5 rounded-md transition-colors">
                                {ex.name}
                            </button>
                        ))}
                     </div>
                </div>
                 <button
                    onClick={handleGenerate}
                    disabled={isLoading}
                    className="w-full bg-teal-600 hover:bg-teal-700 disabled:bg-teal-800/50 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                    {isLoading ? <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> : <SparklesIcon />}
                    {isLoading ? 'Generating...' : 'Generate Code'}
                </button>
            </aside>

            {/* Right Panel */}
            <main className="flex-1 bg-gray-900 border border-gray-800 rounded-xl shadow-lg flex flex-col">
                <div className="p-6 border-b border-gray-800 flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-gray-100">Generated Code</h2>
                </div>
                <div className="p-6 flex-grow overflow-auto relative">
                     <div className="absolute top-4 right-4 z-10 flex gap-2 items-center">
                        <span className="text-xs bg-gray-700/50 text-gray-300 px-2 py-1 rounded-md">{displayedFramework} / {displayedLanguage}</span>
                        <button onClick={handleCopy} disabled={!generatedCode || isLoading} className="p-2 bg-gray-700/50 hover:bg-gray-700 rounded-md text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors" aria-label="Copy code">
                             <CopyIcon />
                        </button>
                    </div>

                    {isLoading && !generatedCode && <div className="text-center text-gray-500">Generating script...</div>}
                    {error && <div className="text-red-400 bg-red-500/10 p-4 rounded-md border border-red-500/30 whitespace-pre-wrap">{error}</div>}
                    {!isLoading && !generatedCode && !error && (
                        <div className="text-center text-gray-500 h-full flex flex-col justify-center items-center">
                           <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-16 h-16 mb-4"><path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75 22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3-4.5 16.5" /></svg>
                           <h3 className="text-xl font-semibold text-gray-400">Your generated code will appear here</h3>
                           <p className="max-w-sm mt-2">Select a framework, describe your test case, and click "Generate Code".</p>
                        </div>
                    )}
                    <div ref={codeResultRef}>
                        {generatedCode && renderGeneratedCode()}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default TestScriptGenerator;