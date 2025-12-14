import React, { useState } from 'react';
import { generatePhotoshootIdeas } from '../services/geminiService';
import { useLanguage } from '../useLanguage';

interface GeminiIdeaGeneratorProps {
    onIdeaSelect: (idea: string) => void;
}

const GeminiIdeaGenerator: React.FC<GeminiIdeaGeneratorProps> = ({ onIdeaSelect }) => {
    const { t, language } = useLanguage();
    const [prompt, setPrompt] = useState('');
    const [ideas, setIdeas] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleGenerate = async () => {
        if (!prompt.trim()) {
            setError(t('ai_generator.error.prompt_required'));
            return;
        }
        setIsLoading(true);
        setError('');
        setIdeas([]);
        try {
            const result = await generatePhotoshootIdeas(prompt, language);
            const formattedIdeas = result.split(/\n\d+\.\s/).filter(idea => idea.trim() !== '');
            setIdeas(formattedIdeas.length > 1 ? formattedIdeas : [result]);
        } catch (err: any) {
            setError(err.message || t('ai_generator.error.failed'));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="bg-[#0B132B] p-4 rounded-lg border border-gray-700 mt-4">
            <h3 className="text-lg font-bold text-[#F7C873] mb-3 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 me-2" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293z" clipRule="evenodd" /></svg>
                {t('ai_generator.title')}
            </h3>
            <div className="flex gap-2">
                <input
                    type="text"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder={t('ai_generator.prompt_placeholder')}
                    className="flex-grow bg-[#2A3450] border border-gray-600 text-white rounded-md p-2 focus:ring-[#F7C873] focus:border-[#F7C873]"
                    disabled={isLoading}
                />
                <button
                    type="button"
                    onClick={handleGenerate}
                    disabled={isLoading}
                    className="bg-[#F7C873] text-[#0B132B] font-bold py-2 px-4 rounded-lg hover:bg-yellow-400 transition-colors disabled:bg-gray-500 disabled:cursor-not-allowed"
                >
                    {isLoading ? t('ai_generator.button.generating') : t('ai_generator.button.generate')}
                </button>
            </div>
            {error && <p className="text-red-400 mt-2 text-sm">{error}</p>}
            
            {isLoading && (
                 <div className="text-center p-4 text-gray-400">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400 mx-auto"></div>
                    <p className="mt-2">{t('ai_generator.thinking')}</p>
                 </div>
            )}

            {ideas.length > 0 && (
                <div className="mt-4 space-y-4">
                    <h4 className="font-semibold text-white">{t('ai_generator.suggested_ideas')}</h4>
                    {ideas.map((idea, index) => (
                        <div key={index} className="bg-[#1C2541] p-3 rounded-md border border-gray-600">
                            <p className="text-gray-300 whitespace-pre-wrap">{idea}</p>
                            <button
                                onClick={() => onIdeaSelect(idea)}
                                className="text-xs text-[#F7C873] hover:underline mt-2"
                            >
                                {t('ai_generator.add_to_notes')}
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default GeminiIdeaGenerator;
