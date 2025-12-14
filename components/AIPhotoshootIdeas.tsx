import React from 'react';
import GeminiIdeaGenerator from './GeminiIdeaGenerator';
import { useLanguage } from '../useLanguage';

const AIPhotoshootIdeas: React.FC = () => {
    const { t } = useLanguage();

    // A dummy function since this is a standalone view. 
    // In a more complex app, we might save these ideas or link them to a new booking.
    const handleIdeaSelection = (idea: string) => {
        console.log("Selected Idea:", idea);
        alert("Idea logged to console. In a real app, this could be saved or used to start a new booking.");
    };

    return (
        <div className="max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold text-white mb-4 text-center">{t('ai_ideas.title')}</h1>
            <p className="text-gray-400 mb-8 text-center">{t('ai_ideas.description')}</p>
            
            <div className="bg-[#1C2541] p-6 rounded-xl shadow-lg">
                <GeminiIdeaGenerator onIdeaSelect={handleIdeaSelection} />
            </div>
        </div>
    );
};

export default AIPhotoshootIdeas;
