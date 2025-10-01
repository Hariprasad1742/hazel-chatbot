import React, { useState, useEffect, useRef } from 'react';

// --- TypeScript Interfaces ---
interface IMessage {
    id: number;
    sender: 'user' | 'bot';
    text: string;
}

interface IQuestion {
    id: number;
    text: string;
    options: string[];
}

// --- Main Questions Data ---
const QUESTIONS: IQuestion[] = [
    {
        id: 1,
        text: "What's the most urgent issue right now?",
        options: [
            "Daughter's Drug Use",
            "Mother's Mental Health",
            "Parents' Conflict",
            "Job Risk",
            "Son's Behavior"
        ]
    },
    {
        id: 2,
        text: "How long has this issue been affecting your family?",
        options: ["A few weeks", "Several months", "A year or more"]
    },
    {
        id: 3,
        text: "Would you like Hazel to suggest professional help?",
        options: ["Yes, please", "No, not right now"]
    }
];

// --- Components ---

// SVG Icon for the Bot Avatar
const BotAvatar: React.FC = () => (
    <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center mr-3 flex-shrink-0">
        <svg className="w-6 h-6 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v3a3 3 0 01-3 3z"></path>
        </svg>
    </div>
);

// Main Application Component
export default function App(): JSX.Element {
    const [chatStarted, setChatStarted] = useState<boolean>(false);
    const [messages, setMessages] = useState<IMessage[]>([]);
    const [answers, setAnswers] = useState<string[]>([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
    const [isTyping, setIsTyping] = useState<boolean>(false);
    const [isLoadingAiResponse, setIsLoadingAiResponse] = useState<boolean>(false);
    const [quizFinished, setQuizFinished] = useState<boolean>(false);
    const chatEndRef = useRef<HTMLDivElement>(null);

    // Effect to scroll to the bottom of the chat on new messages
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isTyping, isLoadingAiResponse]);

    const handleStartChat = (): void => {
        setChatStarted(true);
        setIsTyping(true);
        setTimeout(() => {
            setIsTyping(false);
            setMessages([{
                sender: 'bot',
                text: QUESTIONS[0].text,
                id: Date.now()
            }]);
        }, 1200);
    };

    const getAiAdvice = async () => {
        setIsLoadingAiResponse(true);
        setQuizFinished(true); // Disable option buttons

        const systemPrompt = `You are Hazel, a compassionate and helpful family support assistant. Your goal is to provide supportive and actionable advice based on the user's answers. Be empathetic, non-judgmental, and focus on providing helpful next steps and potential resources. The user has provided the following information about their situation:
        1. Main Issue: ${answers[0]}
        2. Duration: ${answers[1]}
        3. Openness to professional help: ${answers[2]}

        Please provide a concise, single-paragraph summary of advice. Use Google Search to find relevant, up-to-date resources like articles, support groups, or professional organizations that could help. Frame your response in a caring and encouraging tone.`;

        const userQuery = `Based on my situation (${answers.join(', ')}), what advice and resources can you offer?`;
        const apiKey = ""; // API key will be injected by the environment
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;

        const payload = {
            contents: [{ parts: [{ text: userQuery }] }],
            tools: [{ "google_search": {} }],
            systemInstruction: {
                parts: [{ text: systemPrompt }]
            },
        };

        try {
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error(`API call failed with status: ${response.status}`);
            }

            const result = await response.json();
            const candidate = result.candidates?.[0];
            let aiText = "I had trouble processing that request. It's important to remember that I'm an AI assistant, and for immediate crises, you should contact a professional. Please try again later.";

            if (candidate && candidate.content?.parts?.[0]?.text) {
                aiText = candidate.content.parts[0].text;
            }
            
            const aiMessage: IMessage = {
                id: Date.now(),
                sender: 'bot',
                text: aiText
            };
            setMessages(prev => [...prev, aiMessage]);

        } catch (error) {
            console.error("Gemini API call failed:", error);
            const errorMessage: IMessage = {
                id: Date.now(),
                sender: 'bot',
                text: "I'm sorry, I couldn't connect to my support resources right now. Please check your connection and try again."
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoadingAiResponse(false);
        }
    };


    const handleOptionClick = (option: string): void => {
        // Add user's selected option as a new message and store the answer
        const userMessage: IMessage = { sender: 'user', text: option, id: Date.now() };
        setMessages(prev => [...prev, userMessage]);
        setAnswers(prev => [...prev, option]);

        const nextQuestionIndex = currentQuestionIndex + 1;

        // Simulate bot "thinking" then respond
        setIsTyping(true);
        setTimeout(() => {
            setIsTyping(false);
            if (nextQuestionIndex < QUESTIONS.length) {
                // If there's a next question, ask it
                const botMessage: IMessage = {
                    sender: 'bot',
                    text: QUESTIONS[nextQuestionIndex].text,
                    id: Date.now() + 1 // Ensure unique key
                };
                setMessages(prev => [...prev, botMessage]);
                setCurrentQuestionIndex(nextQuestionIndex);
            } else {
                // If it's the last question, provide a concluding message with the AI option.
                const endMessage: IMessage = {
                    sender: 'bot',
                    text: "Thank you for sharing. I can now provide some AI-powered suggestions and resources based on your answers.",
                    id: Date.now() + 1
                };
                setMessages(prev => [...prev, endMessage]);
                setQuizFinished(true); // Show the AI button now
            }
        }, 1500);
    };
    
    // Determine the options for the current question
    const lastMessage = messages[messages.length - 1];
    const isLastMessageFromBot = lastMessage && lastMessage.sender === 'bot';
    const currentOptions = isLastMessageFromBot && !isTyping && !quizFinished ? QUESTIONS[currentQuestionIndex].options : [];

    return (
        <div className="bg-slate-50 font-sans flex items-center justify-center min-h-screen">
            <div className="w-full max-w-lg mx-auto bg-white rounded-2xl shadow-xl h-[95vh] flex flex-col">
                
                {/* Header */}
                <div className="p-4 border-b bg-slate-100 rounded-t-2xl flex items-center space-x-3">
                    <div className="w-12 h-12 rounded-full bg-slate-300 flex items-center justify-center">
                       <svg className="w-7 h-7 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-slate-800">Hazel</h1>
                        <p className="text-sm text-slate-500">Family Support Assistant</p>
                    </div>
                </div>

                {/* Main Content: Welcome Screen or Chat Interface */}
                {!chatStarted ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                        <h2 className="text-3xl font-bold text-slate-800 mb-2">Welcome</h2>
                        <p className="text-slate-600 mb-8 max-w-sm">This is a safe space to understand your family's challenges. Click below to start a quick, confidential assessment.</p>
                        <button 
                            onClick={handleStartChat}
                            className="bg-blue-600 text-white font-bold py-3 px-8 rounded-full hover:bg-blue-700 transition-all duration-300 transform hover:scale-105 shadow-lg"
                        >
                            Begin Assessment
                        </button>
                    </div>
                ) : (
                    <>
                        {/* Messages List */}
                        <div className="flex-1 p-6 overflow-y-auto">
                            {messages.map((msg) => (
                                <div key={msg.id} className={`flex my-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    {msg.sender === 'bot' && <BotAvatar />}
                                    <div className={`rounded-2xl p-3 max-w-md shadow-sm ${msg.sender === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-slate-200 text-slate-800 rounded-bl-none'}`}>
                                        <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                                    </div>
                                </div>
                            ))}
                            {isTyping && (
                                <div className="flex my-3 justify-start">
                                    <BotAvatar />
                                    <div className="rounded-2xl p-3 max-w-sm shadow-sm bg-slate-200 text-slate-800 rounded-bl-none">
                                        <div className="flex items-center space-x-1">
                                            <span className="w-2 h-2 bg-slate-400 rounded-full animate-pulse delay-75"></span>
                                            <span className="w-2 h-2 bg-slate-400 rounded-full animate-pulse delay-150"></span>
                                            <span className="w-2 h-2 bg-slate-400 rounded-full animate-pulse delay-300"></span>
                                        </div>
                                    </div>
                                </div>
                            )}
                             {isLoadingAiResponse && (
                                <div className="flex my-3 justify-start">
                                    <BotAvatar />
                                    <div className="rounded-2xl p-3 max-w-sm shadow-sm bg-slate-200 text-slate-800 rounded-bl-none">
                                        <p className="text-sm italic">Hazel is thinking...</p>
                                    </div>
                                </div>
                            )}
                            <div ref={chatEndRef} />
                        </div>

                        {/* Options Area */}
                        <div className="p-4 border-t bg-slate-50 rounded-b-2xl">
                            <div className="flex flex-wrap justify-center gap-2">
                                {currentOptions.map((option, i) => (
                                    <button 
                                        key={i} 
                                        onClick={() => handleOptionClick(option)}
                                        className="bg-white border border-slate-300 text-slate-700 font-semibold py-2 px-4 rounded-full hover:bg-blue-50 hover:border-blue-400 transition-all duration-200"
                                    >
                                        {option}
                                    </button>
                                ))}
                                {quizFinished && !isLoadingAiResponse && lastMessage.sender === 'bot' && (
                                     <button 
                                        onClick={getAiAdvice}
                                        className="bg-purple-600 text-white font-bold py-3 px-6 rounded-full hover:bg-purple-700 transition-all duration-300 transform hover:scale-105 shadow-lg animate-pulse"
                                    >
                                       ✨ Get AI-powered Advice
                                    </button>
                                )}
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

