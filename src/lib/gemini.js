import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';

const apiKey = import.meta.env.VITE_GEMINI_API_KEY || "API_KEY_NOT_SET";
export const genAI = new GoogleGenerativeAI(apiKey);

export const aiTools = [
  {
    functionDeclarations: [
      {
        name: "get_study_context",
        description: "Gets the text content of the currently open Bible study so you can answer the user's questions about it.",
      },
      {
        name: "get_manual_lesson",
        description:
          "Gets the full text of a lesson from the reference manual 'Get Ready to Win Souls' "
          + "(French: 'Préparez-vous à Gagner des Âmes'), which the studies frequently refer to. "
          + "Call this whenever the study says to refer to the manual, or when the user asks about "
          + "a manual lesson. Never tell the user to go and find the manual — read it with this tool "
          + "and answer from it. Omit the lesson number to get the list of lessons.",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            lesson: {
              type: SchemaType.INTEGER,
              description: "The manual lesson number, 1 to 12. Omit to list all lessons."
            }
          }
        }
      },
      {
        name: "change_language",
        description: "Switches the application UI language between English and French.",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            language_code: {
              type: SchemaType.STRING,
              description: "The language code to switch to. 'en' for English, 'fr' for French."
            }
          },
          required: ["language_code"]
        }
      },
      {
        name: "navigate_to_week",
        description: "Navigates the application to a specific week number of the Bible study.",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            week: {
              type: SchemaType.INTEGER,
              description: "The week number to navigate to (e.g., 18)."
            }
          },
          required: ["week"]
        }
      }
    ]
  }
];
