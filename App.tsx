import React, { useState, useEffect, useRef } from 'react';
import { GeminiService } from './services/geminiService';
import { SearchResult, ChatMessage, Language, LoadingState, HistoryItem } from './types';
import ApiKeyModal from './components/ApiKeyModal';
import ChatInterface from './components/ChatInterface';

function App() {
  // State
  const [apiKey, setApiKey] = useState<string | null>(localStorage.getItem('medilex_api_key'));
  const [geminiService, setGeminiService] = useState<GeminiService | null>(null);
  const [language, setLanguage] = useState<Language>(Language.English);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingState, setLoadingState] = useState<LoadingState>(LoadingState.Idle);
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  // Side Effects
  useEffect(() => {
    if (apiKey) {
      setGeminiService(new GeminiService(apiKey));
    }
    const savedHistory = localStorage.getItem('medilex_history');
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error("Failed to parse history");
      }
    }
  }, [apiKey]);

  const handleApiKeySubmit = (key: string) => {
    localStorage.setItem('medilex_api_key', key);
    setApiKey(key);
  };

  const addToHistory = (term: string) => {
    const newItem: HistoryItem = {
      id: Date.now().toString(),
      term,
      timestamp: Date.now()
    };
    const updatedHistory = [newItem, ...history.filter(h => h.term.toLowerCase() !== term.toLowerCase())].slice(0, 20);
    setHistory(updatedHistory);
    localStorage.setItem('medilex_history', JSON.stringify(updatedHistory));
  };

  const handleSearch = async (e?: React.FormEvent, termOverride?: string) => {
    if (e) e.preventDefault();
    const term = termOverride || searchQuery;
    
    if (!term.trim() || !geminiService) return;

    setLoadingState(LoadingState.Searching);
    setError(null);
    setSearchResult(null);
    setChatMessages([]); // Reset chat for new term

    try {
      const result = await geminiService.searchMedicalTerm(term, language);
      setSearchResult(result);
      addToHistory(result.term);
      setLoadingState(LoadingState.Success);
    } catch (err) {
      console.error(err);
      setError("Failed to retrieve information. Please check your API key or try again.");
      setLoadingState(LoadingState.Error);
    }
  };

  const handleChat = async (text: string) => {
    if (!geminiService || !searchResult) return;

    // Add user message
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text,
      timestamp: Date.now()
    };
    setChatMessages(prev => [...prev, userMsg]);
    setLoadingState(LoadingState.Thinking);

    try {
      // Prepare history for Gemini
      const chatHistory = [
        {
          role: 'user',
          parts: [{ text: `Context: Definition of ${searchResult.term}: ${searchResult.definition}` }]
        },
        {
          role: 'model',
          parts: [{ text: "Understood. I am ready to answer questions about this medical term." }]
        },
        ...chatMessages.map(m => ({
          role: m.role === 'user' ? 'user' : 'model',
          parts: [{ text: m.text }]
        }))
      ];

      const responseText = await geminiService.chatAboutTerm(searchResult.term, chatHistory, text, language);

      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: responseText,
        timestamp: Date.now()
      };
      setChatMessages(prev => [...prev, aiMsg]);
      setLoadingState(LoadingState.Success);
    } catch (err) {
      const errorMsg: ChatMessage = {
        id: Date.now().toString(),
        role: 'model',
        text: "Sorry, I encountered an error responding to that.",
        timestamp: Date.now()
      };
      setChatMessages(prev => [...prev, errorMsg]);
      setLoadingState(LoadingState.Success); // Reset loading state even on error for chat
    }
  };

  if (!apiKey) {
    return <ApiKeyModal onSubmit={handleApiKeySubmit} />;
  }

  const isRtl = language === Language.Arabic;

  return (
    <div className={`h-screen flex flex-col md:flex-row bg-slate-50 dark:bg-slate-900 ${isRtl ? 'dir-rtl' : 'dir-ltr'}`} dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Sidebar - History */}
      <aside className="w-full md:w-64 bg-white dark:bg-slate-800 border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-700 flex-shrink-0 flex flex-col h-auto md:h-full z-10 transition-all duration-300">
        <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white">
            <i className="fa-solid fa-heart-pulse"></i>
          </div>
          <h1 className="font-bold text-lg text-slate-800 dark:text-white tracking-tight">MediLex AI</h1>
        </div>
        
        <div className="p-4 overflow-y-auto flex-1 max-h-48 md:max-h-full">
          <h3 className="text-xs font-semibold text-slate-400 uppercase mb-3 tracking-wider">
            {language === Language.Arabic ? 'سجل البحث' : 'History'}
          </h3>
          <ul className="space-y-2">
            {history.length === 0 ? (
              <li className="text-sm text-slate-400 italic text-center py-4">No history yet</li>
            ) : (
              history.map(item => (
                <li key={item.id}>
                  <button
                    onClick={() => {
                      setSearchQuery(item.term);
                      handleSearch(undefined, item.term);
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition flex items-center gap-2 truncate"
                  >
                    <i className="fa-regular fa-clock text-slate-400 text-xs"></i>
                    <span className="truncate">{item.term}</span>
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>

        <div className="p-4 border-t border-slate-100 dark:border-slate-700">
          <button 
            onClick={() => {
              localStorage.removeItem('medilex_api_key');
              setApiKey(null);
            }}
            className="text-xs text-slate-500 hover:text-red-500 flex items-center gap-2 transition"
          >
            <i className="fa-solid fa-right-from-bracket"></i>
            Change API Key
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {/* Header */}
        <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-700 p-4 flex justify-between items-center z-20">
          <div className="flex-1 max-w-2xl mx-auto w-full">
            <form onSubmit={(e) => handleSearch(e)} className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={language === Language.Arabic ? "أدخل مصطلحًا طبيًا..." : "Enter a medical term..."}
                className={`w-full pl-12 pr-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 border-none focus:ring-2 focus:ring-blue-500 outline-none transition shadow-inner text-slate-800 dark:text-white ${isRtl ? 'text-right pr-12 pl-4' : 'text-left'}`}
              />
              <i className={`fa-solid fa-search absolute top-1/2 transform -translate-y-1/2 text-slate-400 ${isRtl ? 'right-4' : 'left-4'}`}></i>
              <button 
                type="submit"
                disabled={loadingState === LoadingState.Searching}
                className={`absolute top-1/2 transform -translate-y-1/2 bg-blue-600 text-white w-8 h-8 rounded-lg flex items-center justify-center hover:bg-blue-700 transition ${isRtl ? 'left-2' : 'right-2'}`}
              >
                {loadingState === LoadingState.Searching ? (
                  <i className="fa-solid fa-spinner fa-spin text-xs"></i>
                ) : (
                  <i className={`fa-solid ${isRtl ? 'fa-arrow-left' : 'fa-arrow-right'} text-xs`}></i>
                )}
              </button>
            </form>
          </div>

          <div className="flex items-center gap-4 ml-4">
            <button
              onClick={() => setLanguage(language === Language.English ? Language.Arabic : Language.English)}
              className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition"
            >
              {language === Language.English ? 'AR' : 'EN'}
            </button>
          </div>
        </header>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 relative">
          {/* Initial State */}
          {loadingState === LoadingState.Idle && !searchResult && (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-4">
              <div className="w-24 h-24 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                <i className="fa-solid fa-user-doctor text-4xl text-slate-300 dark:text-slate-600"></i>
              </div>
              <h2 className="text-xl font-medium text-slate-600 dark:text-slate-300">
                {language === Language.Arabic ? 'مستعد للبحث' : 'Ready to explore'}
              </h2>
              <p className="max-w-md text-center text-sm">
                {language === Language.Arabic 
                  ? 'أدخل اسم الحالة أو المصطلح الطبي في شريط البحث أعلاه للحصول على شرح علمي مبسط.'
                  : 'Enter a medical condition or term in the search bar above for a simple, scientific explanation.'}
              </p>
            </div>
          )}

          {/* Loading Search */}
          {loadingState === LoadingState.Searching && (
            <div className="flex flex-col items-center justify-center h-full space-y-4">
              <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
              <p className="text-slate-500 animate-pulse">
                {language === Language.Arabic ? 'جاري البحث وإنشاء رسم توضيحي...' : 'Searching sources and generating illustration...'}
              </p>
            </div>
          )}

          {/* Error State */}
          {loadingState === LoadingState.Error && (
            <div className="flex flex-col items-center justify-center h-full text-red-500">
              <i className="fa-solid fa-triangle-exclamation text-4xl mb-4"></i>
              <p>{error}</p>
            </div>
          )}

          {/* Results */}
          {searchResult && (
            <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6 pb-20">
              
              {/* Left Column: Info */}
              <div className="lg:col-span-2 space-y-6">
                {/* Main Card */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
                  <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-4 capitalize flex items-center gap-3">
                    {searchResult.term}
                    <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-300 text-xs rounded-full font-normal">Medical Term</span>
                  </h1>
                  
                  <div className="prose dark:prose-invert max-w-none">
                    <p className="text-lg leading-relaxed text-slate-700 dark:text-slate-300">
                      {searchResult.definition}
                    </p>
                  </div>

                  <div className="mt-8">
                    <h3 className="text-sm font-bold uppercase text-slate-400 mb-3 tracking-wider flex items-center gap-2">
                      <i className="fa-solid fa-list-check"></i>
                      {language === Language.Arabic ? 'نقاط أساسية' : 'Key Points'}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {searchResult.keyPoints.map((point, idx) => (
                        <div key={idx} className="flex items-start gap-3 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg">
                          <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                          <span className="text-sm text-slate-700 dark:text-slate-300">{point}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Image Card */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl overflow-hidden shadow-sm border border-slate-200 dark:border-slate-700">
                  <div className="p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex justify-between items-center">
                     <h3 className="font-semibold text-slate-800 dark:text-white">
                      <i className="fa-solid fa-image mr-2 text-blue-500"></i>
                      {language === Language.Arabic ? 'رسم توضيحي (مُولد بالذكاء الاصطناعي)' : 'Illustration (AI Generated)'}
                    </h3>
                    <span className="text-xs text-slate-400">Gemini Generated</span>
                  </div>
                  <div className="relative bg-slate-100 dark:bg-black min-h-[300px] flex items-center justify-center">
                    {searchResult.imageUrl ? (
                      <img 
                        src={searchResult.imageUrl} 
                        alt={`Illustration of ${searchResult.term}`} 
                        className="w-full h-auto max-h-[500px] object-contain"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = `https://placehold.co/600x400?text=${encodeURIComponent(searchResult.term)}`;
                        }}
                      />
                    ) : (
                      <div className="text-center text-slate-400">
                        <i className="fa-regular fa-image text-4xl mb-2"></i>
                        <p>No image generated</p>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Sources */}
                {searchResult.sources.length > 0 && (
                  <div className="text-xs text-slate-400 flex flex-wrap gap-x-4 gap-y-2 items-center px-2">
                    <span className="font-semibold">Sources (Text):</span>
                    {searchResult.sources.map((source, idx) => (
                      <span key={idx} className="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded border border-slate-200 dark:border-slate-700">
                        {source}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Right Column: Chat - Fixed on desktop, follows scroll */}
              <div className="lg:col-span-1 lg:sticky lg:top-0 lg:h-[calc(100vh-120px)]">
                <ChatInterface 
                  messages={chatMessages}
                  onSendMessage={handleChat}
                  isLoading={loadingState === LoadingState.Thinking}
                  language={language}
                />
              </div>

            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;