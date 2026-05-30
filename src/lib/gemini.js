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
