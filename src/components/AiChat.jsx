import React, { useState, useRef, useEffect } from 'react';
import { mistralClient, aiTools } from '../lib/mistral';
import './AiChat.css';

export default function AiChat({ currentStudy, setLanguage, studies, onSelectStudy }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hello! I am your AI Study Assistant. I can answer questions about this week\'s study, or help you navigate the app! How can I help?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef(null);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleToolCall = async (toolCall, newMessages) => {
    const { name, arguments: argsString } = toolCall.function;
    const args = JSON.parse(argsString || '{}');
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

    // Append tool response
    newMessages.push({
      role: 'tool',
      name: name,
      content: toolResult,
      tool_call_id: toolCall.id
    });

    return newMessages;
  };

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMsg = { role: 'user', content: input };
    let currentMessages = [...messages, userMsg];
    setMessages(currentMessages);
    setInput('');
    setIsLoading(true);

    try {
      let response = await mistralClient.chat.complete({
        model: 'mistral-large-latest',
        messages: currentMessages,
        tools: aiTools,
        toolChoice: 'auto',
      });

      let responseMessage = response.choices[0].message;
      
      // Fix for Mistral SDK: Convert camelCase toolCalls to snake_case tool_calls
      const assistantMessage = {
        role: responseMessage.role,
        content: responseMessage.content || '',
      };
      if (responseMessage.toolCalls) {
        assistantMessage.tool_calls = responseMessage.toolCalls;
      }
      currentMessages.push(assistantMessage);

      // Handle function calling loop
      while (responseMessage.toolCalls && responseMessage.toolCalls.length > 0) {
        for (const toolCall of responseMessage.toolCalls) {
          currentMessages = await handleToolCall(toolCall, currentMessages);
        }

        // Send tool results back to Mistral
        response = await mistralClient.chat.complete({
          model: 'mistral-large-latest',
          messages: currentMessages,
          tools: aiTools,
          toolChoice: 'auto',
        });
        
        responseMessage = response.choices[0].message;
        currentMessages.push(responseMessage);
      }

      setMessages([...currentMessages]);
    } catch (error) {
      console.error("Mistral API Error:", error);
      setMessages([...currentMessages, { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' }]);
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
            <h3>AI Study Assistant</h3>
            <button onClick={() => setIsOpen(false)} className="close-chat-btn">✕</button>
          </div>
          <div className="ai-chat-messages">
            {messages.filter(m => m.role !== 'tool' && !m.toolCalls).map((msg, idx) => (
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
          <span className="sparkle">✨</span> Ask AI
        </button>
      )}
    </div>
  );
}
