import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, Type } from "@google/genai";

// Makes the `XLSX` global from the script tag available
declare var XLSX: any;

// --- TYPES ---
interface TestCase {
  id: string;
  title: string;
  steps: string[];
  expectedResult: string;
  // FIX: Added category property to match the expected JSON structure from the AI model.
  category: string;
}

interface TestGroups {
  [category: string]: TestCase[];
}

// --- CONSTANTS ---
const sampleUserInput = `As a user of an e-commerce website,
I want to be able to add multiple items to my shopping cart,
So that I can purchase them together in a single transaction.

Acceptance Criteria:
- A user can add an item to the cart from the product detail page.
- A user can add an item to the cart from the product listing page.
- The cart icon in the header should update with the correct number of items.
- If a user adds the same item multiple times, the quantity in the cart should update, not add a new line item.
- A user can view the items in their cart by clicking the cart icon.
- A user can remove an item from the cart.
- A user can change the quantity of an item in the cart.
- The cart should persist even if the user navigates away from the page and comes back later (session persistence).
- The cart subtotal, taxes, and total should be calculated and displayed correctly.
- The system should handle adding out-of-stock items gracefully (e.g., by displaying a message and not allowing the add-to-cart action).`;


// --- ICONS ---
const CopyIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 0 1-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 0 1 1.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 0 0-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 0 1-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 0 0-3.375-3.375h-1.5a1.125 1.125 0 0 1-1.125-1.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H9.75" /></svg>;
const DownloadIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>;
const ChevronDownIcon = ({ open }: { open: boolean }) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={`w-5 h-5 transition-transform ${open ? 'rotate-180' : ''}`}><path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" /></svg>;
const SparklesIcon: React.FC<{ className?: string }> = ({ className = "w-4 h-4" }) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={className}><path d="M10.868 2.884c.321-.772.117-1.671-.43-2.226s-1.455-.752-2.226-.431L5.334 1.73c-.772.321-1.671.117-2.226-.43s-.752-1.455-.431-2.226L4.1 1.268c.321-.772.117-1.671-.43-2.226s-1.455-.752-2.226-.431l-1.414 3.414c-.321.772-.117 1.671.43 2.226s1.455.752 2.226.431l3.414-1.414c.772-.321 1.671-.117 2.226.43s.752 1.455.431 2.226l-1.414 3.414c-.321.772-.117 1.671.43 2.226s1.455.752 2.226.431l3.414-1.414c.772-.321 1.671-.117 2.226.43s.752 1.455.431 2.226l-1.414 3.414c-.321.772-.117 1.671.43 2.226s1.455.752 2.226.431l3.414-1.414c.772-.321 1.671-.117 2.226.43s.752 1.455.431 2.226l-1.414 3.414c-.321.772-.117 1.671.43 2.226s1.455.752 2.226.431l3.414-1.414c.772-.321 1.671-.117 2.226.43s.752 1.455.431 2.226L15.898 18.73c-.321.772-.117 1.671.43 2.226s1.455.752 2.226.431l1.414-3.414c.321-.772.117-1.671-.43-2.226s-1.455-.752-2.226-.431l-3.414 1.414c-.772.321-1.671.117-2.226-.43s-.752-1.455-.431-2.226l1.414-3.414c.321.772.117-1.671-.43-2.226s-1.455-.752-2.226-.431l-3.414 1.414c-.772.321-1.671.117-2.226-.43s-.752-1.455-.431-2.226l1.414-3.414c.321.772.117-1.671-.43-2.226s-1.455-.752 2.226-.431l3.414 1.414Z" /></svg>


// --- UI COMPONENTS ---
const Toast: React.FC<{ message: string; show: boolean; onDismiss: () => void }> = ({ message, show, onDismiss }) => {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(() => onDismiss(), 3000);
      return () => clearTimeout(timer);
    }
  }, [show, onDismiss]);

  return (
    <div className={`fixed top-20 right-8 transition-all duration-300 ${show ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'} pointer-events-none`}>
      <div className="bg-green-600/90 backdrop-blur-sm text-white font-semibold py-2 px-5 rounded-lg shadow-lg border border-green-500">
        {message}
      </div>
    </div>
  );
};

const SkeletonLoader: React.FC = () => (
  <div className="animate-pulse">
    <div className="h-8 bg-gray-700 rounded-md w-1/3 mb-4"></div>
    <div className="space-y-4">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="bg-gray-800 rounded-lg p-4">
          <div className="h-6 bg-gray-700 rounded-md w-1/4 mb-4"></div>
          <div className="space-y-2">
            <div className="h-4 bg-gray-700 rounded w-full"></div>
            <div className="h-4 bg-gray-700 rounded w-5/6"></div>
            <div className="h-4 bg-gray-700 rounded w-full"></div>
            <div className="h-4 bg-gray-700 rounded w-3/4"></div>
          </div>
        </div>
      ))}
    </div>
  </div>
);


const Accordion: React.FC<{ title: string; count: number; children: React.ReactNode; isOpen: boolean; onToggle: () => void; }> = ({ title, count, children, isOpen, onToggle }) => (
  <div className="border border-gray-700/50 rounded-lg overflow-hidden">
    <button onClick={onToggle} className="w-full flex justify-between items-center p-4 bg-gray-800 hover:bg-gray-700/50 transition-colors">
      <div className="flex items-center gap-3">
        <span className="font-semibold text-lg text-gray-200">{title}</span>
        <span className="bg-gray-700 text-gray-300 text-xs font-mono px-2 py-0.5 rounded-full">{count}</span>
      </div>
      <ChevronDownIcon open={isOpen} />
    </button>
    {isOpen && <div className="bg-gray-900/50">{children}</div>}
  </div>
);

// --- MAIN COMPONENT ---
const TestCaseGenerator: React.FC = () => {
    const [userInput, setUserInput] = useState(sampleUserInput);
    const [generatedTestCases, setGeneratedTestCases] = useState<TestGroups | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [totalCases, setTotalCases] = useState(0);
    const [isDropdownOpen, setDropdownOpen] = useState(false);
    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const [activeAccordions, setActiveAccordions] = useState<string[]>([]);
    const [elaboratingId, setElaboratingId] = useState<string | null>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const triggerToast = (message: string) => {
        setToastMessage(message);
        setShowToast(true);
    };

    const handleGenerate = async () => {
        setIsLoading(true);
        setError(null);
        setGeneratedTestCases(null);

        let jsonResponseText = '';

        try {
            const prompt = `
            You are a senior QA engineer. Based on the following user story and acceptance criteria, generate a comprehensive suite of test cases.
            The output must be a valid JSON array of test case objects. CRITICALLY IMPORTANT: Do not include any text, markdown, or explanations outside of the single JSON array.
            Each test case object must have the following properties: "category", "id", "title", "steps", and "expectedResult".
            - "category": A string representing the test type (e.g., "Positive", "Negative", "Boundary", "UI/Accessibility", "Integration", "Performance", "Security").
            - "id": A unique identifier string, prefixed based on the category (e.g., "TC-POS-001", "TC-NEG-001").
            - "title": A concise, descriptive string for the test case.
            - "steps": An array of strings, where each string is a clear, actionable step for the tester.
            - "expectedResult": A string describing the expected outcome after executing the steps.

            Generate a diverse range of test cases covering all specified acceptance criteria and edge cases.

            User Story / Requirements:
            ---
            ${userInput}
            ---
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
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            category: { type: Type.STRING },
                            id: { type: Type.STRING },
                            title: { type: Type.STRING },
                            steps: { type: Type.ARRAY, items: { type: Type.STRING } },
                            expectedResult: { type: Type.STRING },
                        },
                        required: ["category", "id", "title", "steps", "expectedResult"],
                    }
                };

                const response = await ai.models.generateContent({
                    model: 'gemini-2.5-pro',
                    contents: prompt,
                    config: {
                        responseMimeType: "application/json",
                        responseSchema,
                    }
                });
                jsonResponseText = response.text;
            }

            // Process the unified response
            const rawTestCases = JSON.parse(jsonResponseText) as TestCase[];
            
            const groupedCases = rawTestCases.reduce((acc: TestGroups, tc) => {
                const category = tc.category || "General";
                if (!acc[category]) {
                    acc[category] = [];
                }
                acc[category].push(tc);
                return acc;
            }, {});

            setGeneratedTestCases(groupedCases);
            setTotalCases(rawTestCases.length);
            setActiveAccordions(Object.keys(groupedCases));

        } catch (e: any) {
            console.error(e);
            setError("Failed to generate test cases. The AI model may be overloaded or the input is invalid. Please try again later.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleEdit = (category: string, id: string, field: keyof TestCase, value: string | string[]) => {
      setGeneratedTestCases(prev => {
        if (!prev) return null;
        const newGroups = { ...prev };
        const newTestCases = [...newGroups[category]];
        const caseIndex = newTestCases.findIndex(tc => tc.id === id);
        if (caseIndex > -1) {
          const updatedCase = { ...newTestCases[caseIndex], [field]: value };
          newTestCases[caseIndex] = updatedCase;
          newGroups[category] = newTestCases;
          return newGroups;
        }
        return prev;
      });
    };
    
    const handleElaborateResult = async (category: string, id: string, currentText: string) => {
        setElaboratingId(id);
        try {
            const prompt = `Elaborate on the following expected result for a test case, providing more detail about what the user should see or verify. Make the response natural and descriptive, but keep it as a single paragraph. Original text: "${currentText}"`;
            let elaboratedText = '';

            // HACKATHON RULE: PRIMARY API - CHROME BUILT-IN WRITER API
            // @ts-ignore
            if (window.ai && window.ai.createWriter) {
                console.log("Using built-in Writer API.");
                // @ts-ignore
                const writer = await window.ai.createWriter();
                elaboratedText = await writer.prompt(prompt);
            } else {
                 // HACKATHON RULE: SECONDARY API - SERVER-SIDE GEMINI
                console.log("Falling back to server-side API for writer.");
                const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
                const response = await ai.models.generateContent({
                    model: 'gemini-2.5-pro',
                    contents: prompt,
                });
                elaboratedText = response.text;
            }

            handleEdit(category, id, 'expectedResult', elaboratedText);
        } catch (e) {
            console.error("Failed to elaborate text", e);
            triggerToast("Elaboration failed.");
        } finally {
            setElaboratingId(null);
        }
    };

    const getFlatTestCases = () => Object.values(generatedTestCases || {}).flat();

    const handleCopy = () => {
      const flatCases = getFlatTestCases();
      if (flatCases.length === 0) return;

      const headers = ["ID", "Category", "Title", "Steps", "Expected Result"];
      // FIX: Explicitly type `tc` as TestCase to prevent type inference issues.
      const rows = flatCases.map((tc: TestCase) => [
          tc.id,
          Object.keys(generatedTestCases!).find(cat => generatedTestCases![cat].includes(tc)),
          tc.title,
          `"${tc.steps.map(s => `- ${s}`).join('\n')}"`,
          `"${tc.expectedResult}"`
      ]);
      const tsvContent = [headers.join('\t'), ...rows.map(row => row.join('\t'))].join('\n');
      
      navigator.clipboard.writeText(tsvContent);
      triggerToast("Copied to clipboard!");
    };
    
    const handleDownload = (format: 'json' | 'csv' | 'excel') => {
      const flatCases = getFlatTestCases();
      if (flatCases.length === 0) return;
      
      // FIX: Explicitly type `tc` as TestCase to prevent type inference issues.
      const dataToExport = flatCases.map((tc: TestCase) => ({
          ID: tc.id,
          Category: Object.keys(generatedTestCases!).find(cat => generatedTestCases![cat].includes(tc)),
          Title: tc.title,
          Steps: tc.steps.join('\n'),
          "Expected Result": tc.expectedResult
      }));

      if (format === 'json') {
          const jsonString = JSON.stringify(getFlatTestCases(), null, 2);
          const blob = new Blob([jsonString], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'test-cases.json';
          a.click();
          URL.revokeObjectURL(url);
      } else if (format === 'csv') {
          const headers = Object.keys(dataToExport[0]);
          const csvRows = [
              headers.join(','),
              ...dataToExport.map(row => 
                  headers.map(header => `"${((row as any)[header] || '').replace(/"/g, '""')}"`).join(',')
              )
          ];
          const csvString = csvRows.join('\n');
          const blob = new Blob([csvString], { type: 'text/csv' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'test-cases.csv';
          a.click();
          URL.revokeObjectURL(url);
      } else if (format === 'excel') {
          const worksheet = XLSX.utils.json_to_sheet(dataToExport);
          const workbook = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(workbook, worksheet, 'Test Cases');
          XLSX.writeFile(workbook, 'test-cases.xlsx');
      }
      setDropdownOpen(false);
      triggerToast(`Downloading ${format.toUpperCase()}...`);
    };
    
    const toggleAccordion = (category: string) => {
        setActiveAccordions(prev => 
            prev.includes(category) 
                ? prev.filter(c => c !== category)
                : [...prev, category]
        );
    };

    return (
        <div className="flex flex-col lg:flex-row gap-6 p-2 sm:p-4 lg:p-6 h-[calc(100vh-85px)] bg-gray-950">
            <Toast message={toastMessage} show={showToast} onDismiss={() => setShowToast(false)} />
            {/* Left Panel */}
            <aside className="lg:w-[40%] xl:w-1/3 flex flex-col bg-gray-900 border border-gray-800 rounded-xl shadow-lg">
                <div className="p-6 border-b border-gray-800">
                    <h2 className="text-2xl font-bold text-gray-100">AI Test Case Generator</h2>
                    <p className="text-sm text-gray-400 mt-1">Provide a detailed user story and acceptance criteria for more accurate and comprehensive test case generation.</p>
                </div>
                <div className="p-6 flex-grow flex flex-col">
                     <div className="flex justify-between items-center mb-2">
                        <label htmlFor="user-story" className="text-sm font-medium text-gray-300">User Story / Requirements</label>
                        <button onClick={() => setUserInput('')} className="text-xs text-gray-400 hover:text-teal-400 transition-colors">Clear</button>
                    </div>
                    <textarea
                        id="user-story"
                        value={userInput}
                        onChange={(e) => setUserInput(e.target.value)}
                        placeholder="Paste your user story, requirements, or acceptance criteria here..."
                        className="w-full flex-grow bg-gray-800/50 border border-gray-700 rounded-md p-4 text-gray-300 text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors resize-none"
                        rows={20}
                    />
                </div>
                <div className="p-6 border-t border-gray-800">
                    <button
                        onClick={handleGenerate}
                        disabled={isLoading || userInput.trim() === ''}
                        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-400 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                        {isLoading && <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>}
                        {isLoading ? 'Generating...' : 'Generate Test Cases'}
                    </button>
                </div>
            </aside>

            {/* Right Panel */}
            <main className="flex-1 bg-gray-900 border border-gray-800 rounded-xl shadow-lg flex flex-col">
                <div className="p-6 border-b border-gray-800 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <h2 className="text-2xl font-bold text-gray-100">Generated Test Cases</h2>
                        {totalCases > 0 && <span className="bg-gray-700 text-gray-300 text-sm font-mono px-3 py-1 rounded-full">{totalCases} total</span>}
                    </div>
                    {generatedTestCases && (
                         <div className="flex items-center gap-2">
                             <button onClick={handleCopy} className="bg-gray-700/50 hover:bg-gray-700 border border-gray-600/50 text-gray-300 font-semibold py-2 px-4 rounded-lg transition-colors flex items-center gap-2 text-sm"><CopyIcon /> Copy Table</button>
                             <div className="relative" ref={dropdownRef}>
                                <button onClick={() => setDropdownOpen(o => !o)} className="bg-gray-700/50 hover:bg-gray-700 border border-gray-600/50 text-gray-300 font-semibold py-2 px-4 rounded-lg transition-colors flex items-center gap-2 text-sm"><DownloadIcon /> Download</button>
                                {isDropdownOpen && (
                                    <div className="absolute right-0 mt-2 w-48 bg-gray-800 border border-gray-700 rounded-md shadow-lg z-10">
                                        <a onClick={() => handleDownload('json')} className="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 cursor-pointer">as JSON</a>
                                        <a onClick={() => handleDownload('csv')} className="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 cursor-pointer">as CSV</a>
                                        <a onClick={() => handleDownload('excel')} className="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 cursor-pointer">as Excel</a>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
                <div className="p-6 flex-grow overflow-y-auto">
                    {isLoading && <SkeletonLoader />}
                    {error && <div className="text-red-400 bg-red-500/10 p-4 rounded-md border border-red-500/30">{error}</div>}
                    {!isLoading && !error && !generatedTestCases && (
                        <div className="text-center text-gray-500 h-full flex flex-col justify-center items-center">
                            <svg className="w-16 h-16 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>
                            <h3 className="text-xl font-semibold text-gray-400">Your test cases will appear here</h3>
                            <p className="max-w-sm mt-2">Enter a user story or requirements on the left and click "Generate Test Cases" to start.</p>
                        </div>
                    )}
                    {generatedTestCases && (
                        <div>
                             <div className="bg-blue-900/40 text-blue-300 text-sm p-3 rounded-lg border border-blue-800/50 flex items-start gap-3 mb-6">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 flex-shrink-0 mt-0.5"><path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" /></svg>
                                <span>Click on any cell in the table below to edit its content.</span>
                            </div>
                            <div className="space-y-4">
                                {/* FIX: Refactored to use Object.keys for more reliable type inference. */}
                                {Object.keys(generatedTestCases).map((category) => {
                                    const tests = generatedTestCases[category];
                                    return (
                                    <Accordion key={category} title={category} count={tests.length} isOpen={activeAccordions.includes(category)} onToggle={() => toggleAccordion(category)}>
                                        <div className="overflow-x-auto">
                                          <table className="w-full text-sm text-left text-gray-400">
                                              <thead className="text-xs text-gray-300 uppercase bg-gray-800/50">
                                                  <tr>
                                                      <th scope="col" className="px-6 py-3 w-[12%]">ID</th>
                                                      <th scope="col" className="px-6 py-3 w-[20%]">Title</th>
                                                      <th scope="col" className="px-6 py-3 w-[34%]">Steps</th>
                                                      <th scope="col" className="px-6 py-3 w-[34%]">Expected Result</th>
                                                  </tr>
                                              </thead>
                                              <tbody>
                                                  {tests.map((tc) => (
                                                      <tr key={tc.id} className="border-t border-gray-700/50 hover:bg-gray-800/40 transition-colors">
                                                          <td className="px-6 py-4 font-mono text-gray-300">{tc.id}</td>
                                                          <td className="px-6 py-4" contentEditable suppressContentEditableWarning onBlur={e => handleEdit(category, tc.id, 'title', e.currentTarget.innerText)}>{tc.title}</td>
                                                          <td className="px-6 py-4" contentEditable suppressContentEditableWarning onBlur={e => handleEdit(category, tc.id, 'steps', e.currentTarget.innerText.split('\n'))}>
                                                              <ul className="list-disc list-inside space-y-1">
                                                                  {tc.steps.map((step, i) => <li key={i}>{step}</li>)}
                                                              </ul>
                                                          </td>
                                                          <td className="px-6 py-4 relative group">
                                                              <span contentEditable suppressContentEditableWarning onBlur={e => handleEdit(category, tc.id, 'expectedResult', e.currentTarget.innerText)}>{tc.expectedResult}</span>
                                                              <button
                                                                onClick={() => handleElaborateResult(category, tc.id, tc.expectedResult)}
                                                                disabled={!!elaboratingId}
                                                                className="absolute top-2 right-2 p-1 bg-gray-700/50 hover:bg-gray-600 rounded-md text-teal-400 opacity-0 group-hover:opacity-100 transition-all disabled:opacity-50"
                                                                aria-label="Elaborate result"
                                                                title="Elaborate on this result"
                                                              >
                                                                {elaboratingId === tc.id ? (
                                                                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                                                ) : (
                                                                    <SparklesIcon />
                                                                )}
                                                              </button>
                                                          </td>
                                                      </tr>
                                                  ))}
                                              </tbody>
                                          </table>
                                        </div>
                                    </Accordion>
                                )})}
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default TestCaseGenerator;