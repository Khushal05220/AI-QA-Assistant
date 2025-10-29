import React, { useState, useEffect, useCallback } from 'react';
import TestCaseGenerator from './TestCaseGenerator';
import TestScriptGenerator from './TestScriptGenerator';
import AdaAuditor from './AdaAuditor';

// --- ENUMS & TYPES ---
enum Page {
  Home = 'home',
  TestCases = 'test-cases',
  TestScripts = 'test-scripts',
  AdaAuditor = 'ada-auditor',
}

interface PageProps {
  setCurrentPage: (page: Page) => void;
}

// --- CONFIGURATION ---
const pageToPath: { [key in Page]: string } = {
  [Page.Home]: '/',
  [Page.TestCases]: '/test-cases',
  [Page.TestScripts]: '/test-scripts',
  [Page.AdaAuditor]: '/ada-auditor',
};

const pathToPage: { [key: string]: Page } = {
  '/': Page.Home,
  '/test-cases': Page.TestCases,
  '/test-scripts': Page.TestScripts,
  '/ada-auditor': Page.AdaAuditor,
};


// --- SVG ICONS ---
const TestCasesIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
  </svg>
);

const TestScriptsIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75 22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3-4.5 16.5" />
  </svg>
);

const AdaAuditorIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.182 15.182a4.5 4.5 0 0 1-6.364 0M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75s.168-.75.375-.75.375.336.375.75Zm4.5 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75Z" />
  </svg>
);

const navItems = [
    { page: Page.TestCases, text: 'AI Test Case Generator', icon: TestCasesIcon, description: "Automatically generate comprehensive, context-aware test cases from user stories, requirements, or design mockups." },
    { page: Page.TestScripts, text: 'AI Test Script Generator', icon: TestScriptsIcon, description: "Convert plain language test steps into executable automation scripts for popular frameworks like Cypress or Playwright." },
    { page: Page.AdaAuditor, text: 'AI-Powered Accessibility Audit', icon: AdaAuditorIcon, description: "Scan your web pages and components to identify accessibility issues and get AI-powered suggestions for remediation." },
];

// --- UI COMPONENTS ---
const BuiltInAIStatus: React.FC = () => {
    const [isAvailable, setIsAvailable] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        // @ts-ignore - 'ai' is an experimental browser feature
        setIsAvailable(!!window.ai);
    }, []);

    const statusColor = isAvailable ? 'bg-green-500' : 'bg-red-500';

    const handleStatusClick = () => {
        if (!isAvailable) {
            setIsModalOpen(true);
        }
    };

    return (
        <>
            <div
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isAvailable ? 'text-green-300 bg-green-500/10' : 'text-red-300 bg-red-500/10 cursor-pointer hover:bg-red-500/20'}`}
                onClick={handleStatusClick}
                aria-label={isAvailable ? "Chrome's Built-in AI is Active" : "Chrome's Built-in AI is Not Available. Click for instructions."}
                role="button"
                tabIndex={0}
            >
                <div className="flex-shrink-0">
                    <div className={`w-3 h-3 rounded-full ${statusColor} ring-2 ring-offset-2 ring-offset-gray-900 ${isAvailable ? 'ring-green-500' : 'ring-red-500'}`}></div>
                </div>
                <div className="flex-grow">
                    <p className="font-semibold">{isAvailable ? "Built-in AI Active" : "Built-in AI Inactive"}</p>
                    <p className="text-xs text-gray-400">{isAvailable ? "Using on-device model" : "Click to enable"}</p>
                </div>
            </div>
            
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}>
                    <div className="relative bg-gray-800 rounded-xl shadow-2xl p-8 max-w-2xl w-full mx-4 border border-gray-700" onClick={e => e.stopPropagation()}>
                        <h2 className="text-2xl font-bold text-teal-400 mb-4">Enable Chrome's Built-in AI (Gemini Nano)</h2>
                        <p className="text-gray-300 mb-6">
                            To use the on-device AI for enhanced privacy and speed, please follow these steps. This requires Google Chrome version 127 or newer.
                        </p>
                        <ol className="list-decimal list-inside space-y-4 text-gray-400">
                            <li>
                                <strong>Enable Prompt API:</strong> Navigate to <code className="bg-gray-700 text-teal-300 px-2 py-1 rounded">chrome://flags/#prompt-api-for-gemini-nano</code>, set it to "Enabled", and relaunch Chrome.
                            </li>
                            <li>
                                <strong>Enable On-Device Model:</strong> Navigate to <code className="bg-gray-700 text-teal-300 px-2 py-1 rounded">chrome://flags/#optimization-guide-on-device-model</code>, set it to "Enabled BypassPerfRequirement", and relaunch.
                            </li>
                             <li>
                                <strong>Check AI settings:</strong> Navigate to <code className="bg-gray-700 text-teal-300 px-2 py-1 rounded">chrome://settings/ai</code>, and ensure "On-device AI" or a similar feature is enabled. The model will download in the background.
                            </li>
                        </ol>
                        <p className="mt-6 text-sm text-gray-500">
                            These features are experimental and may change. The application will fall back to server-side APIs if the built-in AI is unavailable.
                        </p>
                        <button
                            onClick={() => setIsModalOpen(false)}
                            className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
                            aria-label="Close modal"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>
            )}
        </>
    );
};

const FeatureCard: React.FC<{ title: string; description: string; icon: React.ReactNode; onClick: () => void; }> = ({ title, description, icon, onClick }) => (
    <div
        onClick={onClick}
        className="bg-gray-800/50 rounded-xl p-6 flex flex-col items-start gap-4 cursor-pointer group border border-gray-700/50 hover:border-teal-500/50 hover:bg-gray-800 transition-all duration-300 transform hover:-translate-y-1 shadow-lg hover:shadow-teal-500/10"
        role="button"
        tabIndex={0}
    >
        <div className="bg-gray-700 p-3 rounded-lg text-teal-400 group-hover:bg-teal-500/20 transition-colors">
            {icon}
        </div>
        <h3 className="text-xl font-bold text-gray-100">{title}</h3>
        <p className="text-gray-400 text-sm flex-grow">{description}</p>
        <span className="text-teal-400 text-sm font-semibold group-hover:underline mt-2">
            Open Tool &rarr;
        </span>
    </div>
);

const Header: React.FC<{ onNavigate: (page: Page) => void; currentPage: Page }> = ({ onNavigate, currentPage }) => {
    const getTitle = () => {
        if (currentPage === Page.Home) return 'AI QA Assistant';
        const currentNavItem = navItems.find(item => item.page === currentPage);
        return currentNavItem ? currentNavItem.text : 'AI QA Assistant';
    };

    const isHomePage = currentPage === Page.Home;

    return (
        <header className="flex justify-between items-center py-5 border-b border-gray-800">
            <button onClick={() => onNavigate(Page.Home)} className="flex items-center gap-3 group" aria-label="Go to Home page">
                <div className="bg-gradient-to-br from-teal-400 to-blue-600 p-2 rounded-lg group-hover:scale-105 transition-transform">
                    <svg className="w-6 h-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z" />
                    </svg>
                </div>
                <h1 className="text-xl font-bold text-white group-hover:text-teal-300 transition-colors">
                    {!isHomePage && <span className="text-gray-400 font-medium">AI QA Assistant / </span>}
                    {getTitle()}
                </h1>
            </button>
            <BuiltInAIStatus />
        </header>
    );
};


// --- PAGES ---
const HomePage: React.FC<PageProps> = ({ setCurrentPage }) => {
    return (
        <>
            <header className="my-12 text-center">
                <h1 className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-teal-300 to-blue-500">
                    Welcome to your AI QA Assistant
                </h1>
                <p className="mt-4 max-w-2xl mx-auto text-lg text-gray-400">
                    Empowering QA teams with AI-driven tools for test case generation, script automation, and accessibility compliance.
                </p>
            </header>

            <main className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {navItems.map(item => {
                    const Icon = item.icon;
                    return (
                        <FeatureCard
                            key={item.text}
                            title={item.text}
                            description={item.description}
                            icon={<Icon className="w-8 h-8" />}
                            onClick={() => setCurrentPage(item.page)}
                        />
                    )
                })}
            </main>
             <footer className="text-center py-12">
                <h4 className="text-lg font-semibold text-gray-400 mb-2">More Tools Coming Soon...</h4>
                <p className="text-gray-500">Performance/Load Tester • API Testing • Test Plan Maker</p>
            </footer>
        </>
    );
};

// --- MAIN APP ---
const App: React.FC = () => {
    const [currentPage, setCurrentPage] = useState<Page>(() => {
        const path = window.location.hash.slice(1) || '/';
        return pathToPage[path] ?? Page.Home;
    });
    const [isAnimating, setIsAnimating] = useState(false);
    
    // Listen for browser back/forward navigation
    useEffect(() => {
        const handleHashChange = () => {
            const path = window.location.hash.slice(1) || '/';
            const newPage = pathToPage[path] ?? Page.Home;
            if (newPage !== currentPage) {
                setIsAnimating(true);
                setTimeout(() => {
                    setCurrentPage(newPage);
                    setIsAnimating(false);
                }, 150);
            }
        };

        window.addEventListener('hashchange', handleHashChange);
        return () => window.removeEventListener('hashchange', handleHashChange);
    }, [currentPage]);

    // Handle navigation from clicks within the app
    const handleNavigation = useCallback((page: Page) => {
        const newPath = pageToPath[page];
        const currentPath = window.location.hash.slice(1) || '/';
        if (newPath !== currentPath) {
            window.location.hash = newPath;
        }
    }, []);

    const renderPage = () => {
        switch (currentPage) {
            case Page.TestCases:
                return <TestCaseGenerator />;
            case Page.TestScripts:
                return <TestScriptGenerator />;
            case Page.AdaAuditor:
                return <AdaAuditor />;
            default:
                return <HomePage setCurrentPage={handleNavigation} />;
        }
    };
    
    const containerClass = currentPage === Page.TestCases || currentPage === Page.TestScripts
        ? 'max-w-full' 
        : 'max-w-7xl';

    return (
        <div className="min-h-screen bg-gray-950 text-gray-200 font-sans antialiased">
            <div className={`${containerClass} mx-auto px-4 sm:px-6 lg:px-8`}>
                <Header onNavigate={handleNavigation} currentPage={currentPage} />
                <main className={`transition-opacity duration-150 ${isAnimating ? 'opacity-0' : 'opacity-100'}`}>
                    {renderPage()}
                </main>
            </div>
        </div>
    );
}

export default App;