import { GoogleGenAI } from "@google/genai";

// Ensure the API key is available in the environment variables
const apiKey = process.env.API_KEY;
if (!apiKey) {
    console.error("API_KEY environment variable not set.");
}

// Initialize the GoogleGenAI client
const ai = new GoogleGenAI({ apiKey: apiKey || '' });

const getPrompt = (prompt: string, language: 'en' | 'ar'): string => {
    if (language === 'ar') {
        return `
            أنا مصور فوتوغرافي في مصر. أحتاج إلى أفكار إبداعية لجلسة تصوير.
            
            الموضوع الأساسي للجلسة هو: "${prompt}".

            من فضلك، اقترح 3-4 أفكار فريدة ومفصلة. يجب أن تكون الأفكار مناسبة للتنفيذ في مصر.
            لكل فكرة، اذكر:
            1. المفهوم العام.
            2. اقتراحات للموقع (مثال: شاطئ في الساحل الشمالي، شارع المعز في القاهرة القديمة, صحراء الفيوم).
            3. اقتراحات للملابس أو الألوان.
            4. أفكار لوضعيات (poses) أو تفاعلات.

            اعرض النتائج كنقاط واضحة ومنظمة.
        `;
    }
    return `
        I am a photographer in Egypt. I need creative ideas for a photoshoot.
        
        The main theme for the session is: "${prompt}".

        Please suggest 3-4 unique and detailed ideas. The ideas must be suitable for execution in Egypt.
        For each idea, mention:
        1. The general concept.
        2. Location suggestions (e.g., a beach on the North Coast, El Moez Street in Old Cairo, Fayoum Desert).
        3. Suggestions for outfits or color palettes.
        4. Ideas for poses or interactions.

        Present the results as clear, organized points.
    `;
}

export const generatePhotoshootIdeas = async (prompt: string, language: 'en' | 'ar'): Promise<string> => {
    if (!apiKey) {
        return language === 'ar' ? "عذراً, مفتاح API غير مهيأ. لا يمكن الاتصال بالذكاء الاصطناعي." : "Sorry, the API key is not configured. Cannot connect to the AI.";
    }

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: getPrompt(prompt, language),
        });

        return response.text;
    } catch (error) {
        console.error("Error generating content from Gemini:", error);
        const errorMessage = language === 'ar' ? "حدث خطأ أثناء توليد الأفكار." : "An error occurred while generating ideas.";
        if (error instanceof Error) {
            return `${errorMessage} ${error.message}`;
        }
        return language === 'ar' ? "حدث خطأ غير معروف أثناء توليد الأفكار." : "An unknown error occurred while generating ideas.";
    }
};
