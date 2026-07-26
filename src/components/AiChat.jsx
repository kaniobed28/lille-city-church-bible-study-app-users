import React, { useState, useRef, useEffect, useCallback } from 'react';
import { genAI, aiTools } from '../lib/gemini';
import { formatMessage } from '../lib/formatMessage';
import { getManual, getManualLesson, lessonToText, findLessonNumber } from '../lib/manual';
import { t } from '../lib/i18n';
import './AiChat.css';

const buildSystemInstruction = (language) =>
  "You are the Lille City Church Bible Study Assistant. You have deep knowledge of the entire Bible. If the user asks for a Bible verse, chapter, or theological concept, you must answer them directly from your own knowledge. Do not refuse to quote scriptures. You also have tools to navigate the app and read the current study on the screen. "
  + "The reference manual 'Get Ready to Win Souls' ('Préparez-vous à Gagner des Âmes' in French) is available to you through the get_manual_lesson tool, so when a study refers to the manual, read that lesson and explain it yourself — never send the reader off to find the booklet. "
  + (language === 'fr'
    ? "The reader is using the app in French: reply in French, and quote scripture in French (Louis Segond) unless they ask otherwise. "
    : 'The reader is using the app in English: reply in English unless they write to you in another language. ')
  + 'Keep answers warm, clear, and concise.';

const greetingFor = (language) => ({ role: 'assistant', content: t(language).greeting });

export default function AiChat({ currentStudy, setLanguage, studies, onSelectStudy, externalQuery, clearExternalQuery, language = 'en' }) {
  const [isOpen, setIsOpen] = useState(false);
  /* Only the real exchange lives in state. The opening greeting is derived at
     render time, so it is always in the reader's current language — including
     when the assistant switches language itself mid-session — without an
     effect writing state back on every change. */
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);

  const chatEndRef = useRef(null);
  const chatSessionRef = useRef(null);
  const inputRef = useRef(null);
  const copy = t(language);

  const startSession = useCallback(() => {
    const model = genAI.getGenerativeModel({
      model: 'gemini-flash-latest',
      systemInstruction: buildSystemInstruction(language),
      tools: aiTools,
    });
    chatSessionRef.current = model.startChat();
  }, [language]);

  // Initialize Gemini chat session once
  useEffect(() => {
    if (!chatSessionRef.current) startSession();
  }, [startSession]);

  // Auto-scroll to the newest message
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isLoading]);

  // Focus the input when the window opens
  useEffect(() => {
    if (isOpen) {
      setHasUnread(false);
      const timer = setTimeout(() => inputRef.current?.focus(), 60);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Surface an unread dot when a reply lands while the window is closed
  useEffect(() => {
    const last = messages[messages.length - 1];
    if (last && last.role === 'assistant' && !isOpen) {
      setHasUnread(true);
    }
  }, [messages, isOpen]);

  const handleToolCall = (name, args) => {
    let toolResult = '';

    if (name === 'get_study_context') {
      toolResult = currentStudy
        ? JSON.stringify({
            topic: currentStudy.topic,
            week: currentStudy.week,
            type: currentStudy.type,
            mainTexts: currentStudy.mainTexts,
            memoryVerse: currentStudy.memoryVerse,
            introduction: currentStudy.introduction,
            questions: currentStudy.questions,
            conclusion: currentStudy.conclusion,
          })
        : 'No study is currently open.';
    } else if (name === 'get_manual_lesson') {
      // Fall back to the lesson the open study points at, so "explain what the
      // manual says here" works without the model having to guess a number.
      const number = args?.lesson ?? findLessonNumber(currentStudy?.topic);
      const lesson = number ? getManualLesson(number, language) : null;

      if (lesson) {
        toolResult = lessonToText(lesson, language);
      } else {
        const { manual } = getManual(language);
        toolResult = JSON.stringify({
          manual: manual.title,
          note: number ? `Lesson ${number} is not in this manual.` : 'No lesson specified.',
          lessons: manual.lessons.map((l) => ({ lesson: l.number, title: l.title })),
        });
      }
    } else if (name === 'change_language') {
      const code = args.language_code;
      if (code === 'en' || code === 'fr') {
        setLanguage(code);
        toolResult = `Language successfully switched to ${code === 'en' ? 'English' : 'French'}.`;
      } else {
        toolResult = 'Invalid language code.';
      }
    } else if (name === 'navigate_to_week') {
      const targetWeek = parseInt(args.week, 10);
      const studyIndex = studies.findIndex((s) => parseInt(s.week, 10) === targetWeek);
      if (studyIndex !== -1) {
        onSelectStudy(studyIndex);
        toolResult = `Successfully navigated to week ${targetWeek}.`;
      } else {
        toolResult = `Week ${targetWeek} not found in the current language.`;
      }
    } else {
      toolResult = 'Unknown function called.';
    }

    return { result: toolResult };
  };

  const processMessage = async (userText) => {
    if (!userText.trim() || !chatSessionRef.current) return;

    setMessages((prev) => [...prev, { role: 'user', content: userText }]);
    setIsLoading(true);

    try {
      let result = await chatSessionRef.current.sendMessage(userText);
      let calls = result.response.functionCalls && result.response.functionCalls();
      let loopCount = 0;
      const MAX_LOOPS = 5;

      while (calls && calls.length > 0 && loopCount < MAX_LOOPS) {
        loopCount++;
        const functionResponses = calls.map((call) => ({
          functionResponse: {
            name: call.name,
            response: handleToolCall(call.name, call.args),
          },
        }));

        result = await chatSessionRef.current.sendMessage(functionResponses);
        calls = result.response.functionCalls && result.response.functionCalls();
      }

      if (loopCount >= MAX_LOOPS) {
        console.warn('Max function-call loops reached; stopping to avoid a loop.');
      }

      const textResponse = result.response.text();
      if (textResponse) {
        setMessages((prev) => [...prev, { role: 'assistant', content: textResponse }]);
      }
    } catch (error) {
      console.error('Gemini API Error:', error);
      const isRateLimit = error?.message?.includes('429');
      const errorMessage = isRateLimit ? copy.rateLimit : copy.assistantUnreachable;
      setMessages((prev) => [...prev, { role: 'assistant', content: errorMessage }]);
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

  const handleSuggestion = (text) => {
    if (!isLoading) processMessage(text);
  };

  const handleClear = () => {
    startSession();
    setMessages([]);
    setInput('');
    inputRef.current?.focus();
  };

  // React to a verse tapped in the study viewer
  useEffect(() => {
    if (externalQuery && chatSessionRef.current && !isLoading) {
      setIsOpen(true);
      processMessage(externalQuery);
      clearExternalQuery();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externalQuery, isLoading]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendClick();
    }
  };

  const showSuggestions = messages.length === 0 && !isLoading;
  // The greeting is not part of the thread; it opens it.
  const thread = [greetingFor(language), ...messages];

  return (
    <div className="ai-chat-container">
      {isOpen ? (
        <div className="ai-chat-window" role="dialog" aria-label={copy.bibleStudyAssistant}>
          <div className="ai-chat-header">
            <div className="ai-chat-heading">
              <h3>{copy.companion}</h3>
              {currentStudy?.topic && (
                <span className="ai-chat-context" title={currentStudy.topic}>
                  {copy.reading} {currentStudy.topic}
                </span>
              )}
            </div>
            <div className="ai-chat-header-actions">
              <button onClick={handleClear} className="ai-icon-btn" aria-label={copy.startNewConversation} title={copy.newConversation}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
                  <path d="M3 3v5h5" />
                </svg>
              </button>
              <button onClick={() => setIsOpen(false)} className="ai-icon-btn" aria-label={copy.closeAssistant}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          </div>

          <div className="ai-chat-messages" aria-live="polite">
            {thread.map((msg, idx) => (
              <div key={idx} className={`chat-message ${msg.role}`}>
                <div className="chat-bubble">
                  {msg.role === 'assistant' ? formatMessage(msg.content) : msg.content}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="chat-message assistant">
                <div className="chat-bubble typing" aria-label={copy.assistantTyping}>
                  <span></span><span></span><span></span>
                </div>
              </div>
            )}

            {showSuggestions && (
              <div className="ai-suggestions">
                {copy.suggestions.map((s) => (
                  <button key={s} className="ai-suggestion-chip" onClick={() => handleSuggestion(s)}>
                    {s}
                  </button>
                ))}
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          <div className="ai-chat-input">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={copy.askPlaceholder}
              rows={1}
              disabled={isLoading}
              aria-label={copy.messageCompanion}
            />
            <button onClick={handleSendClick} disabled={isLoading || !input.trim()} aria-label={copy.sendMessage}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </div>
        </div>
      ) : (
        <button className="ai-chat-toggle" onClick={() => setIsOpen(true)} aria-label={copy.openCompanion}>
          <svg className="ai-toggle-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6z" />
            <path d="M5 16l.8 2.2L8 19l-2.2.8L5 22l-.8-2.2L2 19l2.2-.8z" />
          </svg>
          <span>{copy.askCompanion}</span>
          {hasUnread && <span className="ai-unread-dot" aria-hidden="true" />}
        </button>
      )}
    </div>
  );
}
