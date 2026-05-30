import React, { useState, useRef, useEffect } from 'react';
import { genAI, aiTools } from '../lib/gemini';
import './AiChat.css';

export default function AiChat({ currentStudy, setLanguage, studies, onSelectStudy }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hello! I am your new Gemini Study Assistant. I can answer questions about this week\'s study, or help you navigate the app without any rate limits! How can I help?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const chatEndRef = useRef(null);
  const chatSessionRef = useRef(null);

  // Initialize Gemini Chat Session
  useEffect(() => {
    if (!chatSessionRef.current) {
      const model = genAI.getGenerativeModel({ 
        model: "gemini-2.5-pro", 
        tools: aiTools 
      });
      chatSessionRef.current = model.startChat();
    }
  }, []);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleToolCall = (name, args) => {
    let toolResult = "";
    console.log(`AI called function: ${name}`, args);

    if (name === 'get_study_context') {
      if (currentStudy) {
        toolResult = JSON.stringify({
          topic: currentStudy.topic,
          week: currentStudy.week,
          mainTexts: currentStudy.mainTexts,
          memoryVerse: currentStudy.memoryVerse,
          introduction: currentStudy.introduction,
          questions: currentStudy.questions,
          conclusion: currentStudy.conclusion
        });
      } else {
        toolResult = "No study is currently open.";
      }
    } 
    else if (name === 'change_language') {
      const code = args.language_code;
      if (code === 'en' || code === 'fr') {
        setLanguage(code);
        toolResult = `Language successfully switched to ${code === 'en' ? 'English' : 'French'}.`;
      } else {
        toolResult = "Invalid language code.";
      }
    }
    else if (name === 'navigate_to_week') {
      const targetWeek = parseInt(args.week, 10);
      const studyIndex = studies.findIndex(s => parseInt(s.week, 10) === targetWeek);
      if (studyIndex !== -1) {
        onSelectStudy(studyIndex);
        toolResult = `Successfully navigated to week ${targetWeek}.`;
      } else {
        toolResult = `Week ${targetWeek} not found in the current language.`;
      }
    }
    else {
      toolResult = "Unknown function called.";
    }

    return { result: toolResult };
  };

  const sendMessage = async () => {
    if (!input.trim() || !chatSessionRef.current) return;

    const userText = input;
    setMessages(prev => [...prev, { role: 'user', content: userText }]);
    setInput('');
    setIsLoading(true);

    try {
      let result = await chatSessionRef.current.sendMessage(userText);
      
      // Handle potential function calling loop
      while (result.response.functionCalls && result.response.functionCalls().length > 0) {
        const calls = result.response.functionCalls();
        const functionResponses = [];

        for (const call of calls) {
          const functionResponseData = handleToolCall(call.name, call.args);
          functionResponses.push({
            functionResponse: {
              name: call.name,
              response: functionResponseData
            }
          });
        }

        // Send the tool results back to Gemini
        result = await chatSessionRef.current.sendMessage(functionResponses);
      }

      // Finally, display Gemini's text response
      const textResponse = result.response.text();
      if (textResponse) {
        setMessages(prev => [...prev, { role: 'assistant', content: textResponse }]);
      }

    } catch (error) {
      console.error("Gemini API Error:", error);
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error communicating with Gemini. Please try again.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      sendMessage();
    }
  };

  return (
    <div className="ai-chat-container">
      {isOpen ? (
        <div className="ai-chat-window">
          <div className="ai-chat-header">
            <h3>Gemini Study Assistant</h3>
            <button onClick={() => setIsOpen(false)} className="close-chat-btn">✕</button>
          </div>
          <div className="ai-chat-messages">
            {messages.map((msg, idx) => (
              <div key={idx} className={`chat-message ${msg.role}`}>
                <div className="chat-bubble">
                  {msg.content}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="chat-message assistant">
                <div className="chat-bubble loading">Thinking...</div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
          <div className="ai-chat-input">
            <input 
              type="text" 
              value={input} 
              onChange={(e) => setInput(e.target.value)} 
              onKeyDown={handleKeyDown}
              placeholder="Ask a question or command..."
              disabled={isLoading}
            />
            <button onClick={sendMessage} disabled={isLoading || !input.trim()}>
              ➤
            </button>
          </div>
        </div>
      ) : (
        <button className="ai-chat-toggle" onClick={() => setIsOpen(true)}>
          <span className="sparkle">✨</span> Ask Gemini
        </button>
      )}
    </div>
  );
}
