import { Mistral } from '@mistralai/mistralai';

// API Key directly integrated as requested
const apiKey = "oKnOPGPYxjb0ee7jYZ5PF1o2QMCSj4mz";
export const mistralClient = new Mistral({ apiKey });

export const aiTools = [
  {
    type: "function",
    function: {
      name: "get_study_context",
      description: "Gets the text content of the currently open Bible study so you can answer the user's questions about it.",
      parameters: {
        type: "object",
        properties: {},
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "change_language",
      description: "Switches the application UI language between English and French.",
      parameters: {
        type: "object",
        properties: {
          language_code: {
            type: "string",
            enum: ["en", "fr"],
            description: "The language code to switch to. 'en' for English, 'fr' for French."
          }
        },
        required: ["language_code"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "navigate_to_week",
      description: "Navigates the application to a specific week number of the Bible study.",
      parameters: {
        type: "object",
        properties: {
          week: {
            type: "integer",
            description: "The week number to navigate to (e.g., 18)."
          }
        },
        required: ["week"]
      }
    }
  }
];
