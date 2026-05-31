import React, { useState, useRef, useEffect } from 'react';
import { genAI, aiTools } from '../lib/gemini';
import './AiChat.css';

export default function AiChat({ currentStudy, setLanguage, studies, onSelectStudy, externalQuery, clearExternalQuery }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hello! I am your new Lille City Church Assistant. I can answer questions about this week\'s study, or help you navigate the app without any rate limits! How can I help?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const chatEndRef = useRef(null);
  const chatSessionRef = useRef(null);

  // Initialize Gemini Chat Session
  useEffect(() => {
    if (!chatSessionRef.current) {
      const model = genAI.getGenerativeModel({ 
        model: "gemini-flash-latest",
        systemInstruction: "You are the Lille City Church Bible Study Assistant. You have deep knowledge of the entire Bible. If the user asks for a Bible verse, chapter, or theological concept, you must answer them directly from your own knowledge. Do not refuse to quote scriptures. You also have tools to navigate the app and read the current study on the screen.",
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

  const processMessage = async (userText) => {
    if (!userText.trim() || !chatSessionRef.current) return;

    setMessages(prev => [...prev, { role: 'user', content: userText }]);
    setIsLoading(true);

    try {
      let result = await chatSessionRef.current.sendMessage(userText);
      
      let calls = result.response.functionCalls && result.response.functionCalls();
      let loopCount = 0;
      const MAX_LOOPS = 5;

      // Handle potential function calling loop
      while (calls && calls.length > 0 && loopCount < MAX_LOOPS) {
        loopCount++;
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
        calls = result.response.functionCalls && result.response.functionCalls();
      }

      if (loopCount >= MAX_LOOPS) {
        console.warn("Max function call loops reached. Stopping to prevent infinite loops.");
      }

      // Finally, display Gemini's text response
      const textResponse = result.response.text();
      if (textResponse) {
        setMessages(prev => [...prev, { role: 'assistant', content: textResponse }]);
      }

    } catch (error) {
      console.error("Gemini API Error:", error);
      let errorMessage = "Sorry, I encountered an error communicating with the AI. Please try again.";
      
      // Friendly rate limit message
      if (error.message && error.message.includes("429")) {
        errorMessage = "Whoa there! We're talking a little too fast and hit the free-tier speed limit. Please wait about 30-60 seconds and try again!";
      } else {
        errorMessage = `DEBUG ERROR: ${error.message}`;
      }
      
      setMessages(prev => [...prev, { role: 'assistant', content: errorMessage }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendClick = () => {
    if (input.trim() && !isLoading) {
      const text = input;
      setInput('');
      processMessage(text);
    }
  };

  useEffect(() => {
    if (externalQuery && chatSessionRef.current && !isLoading) {
      setIsOpen(true);
      processMessage(externalQuery);
      clearExternalQuery();
    }
  }, [externalQuery, isLoading]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSendClick();
    }
  };

  return (
    <div className="ai-chat-container">
      {isOpen ? (
        <div className="ai-chat-window">
          <div className="ai-chat-header">
            <h3>Lille City Church Assistant</h3>
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
            <button onClick={handleSendClick} disabled={isLoading || !input.trim()}>
              ➤
            </button>
          </div>
        </div>
      ) : (
        <button className="ai-chat-toggle" onClick={() => setIsOpen(true)}>
          <span className="sparkle">✨</span> Ask Lille City Church
        </button>
      )}
    </div>
  );
}
