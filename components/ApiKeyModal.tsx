import React, { useState } from 'react';

interface ApiKeyModalProps {
  onSubmit: (key: string) => void;
}

const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ onSubmit }) => {
  const [key, setKey] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (key.length < 10) {
      setError('Please enter a valid Google Gemini API Key.');
      return;
    }
    onSubmit(key);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-8 border border-slate-200 dark:border-slate-700">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <i className="fa-solid fa-key text-2xl text-blue-600 dark:text-blue-400"></i>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Welcome to MediLex</h2>
          <p className="text-slate-600 dark:text-slate-400 text-sm">
            To use the AI features, please enter your Google Gemini API Key. This key is stored locally in your browser.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="apiKey" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              API Key
            </label>
            <input
              type="text"
              id="apiKey"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="AIzaSy..."
              className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition"
              autoComplete="off"
              spellCheck="false"
            />
            {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
          </div>

          <button
            type="submit"
            className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-semibold py-3 rounded-lg transition shadow-lg transform hover:scale-[1.02] active:scale-95"
          >
            Start Exploring
          </button>
        </form>
        
        <div className="mt-6 text-center">
             <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-xs text-blue-500 hover:underline">
                Get an API Key
             </a>
        </div>
      </div>
    </div>
  );
};

export default ApiKeyModal;