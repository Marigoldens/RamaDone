import { GoogleGenAI, Type } from "@google/genai";
import { format } from "date-fns";

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

let aiClient = null;
if (apiKey) {
  aiClient = new GoogleGenAI({ apiKey });
}

// Map function calls to local Dexie actions
export const executeCalendarAction = async (functionCall, useEventsHook) => {
  const { name, args } = functionCall;
  console.log("Executing calendar action:", name, args);

  try {
    if (name === "add_event") {
      // The addEvent hook requires a 'date' property in 'YYYY-MM-DD' format to query against
      const dateOnly = args.start ? args.start.split('T')[0] : null;
      const eventPayload = { ...args, date: dateOnly };
      
      await useEventsHook.addEvent(eventPayload);
      return { success: true, message: "Event added successfully", event: eventPayload };
    } else if (name === "update_event") {
      await useEventsHook.updateEvent(args.id, args.updates);
      return { success: true, message: "Event updated successfully", updates: args };
    } else if (name === "delete_event") {
      await useEventsHook.deleteEvent(args.id);
      return { success: true, message: "Event deleted successfully", id: args.id };
    }
  } catch (error) {
    console.error("Action execution failed:", error);
    return { success: false, error: error.message };
  }
  
  return { success: false, error: "Unknown action" };
};

export const chatWithGemini = async (messages, currentEvents, preferences) => {
  if (!aiClient) {
    throw new Error("Gemini API key is not configured.");
  }

  // Define tools for the AI to call
  const addEventTool = {
    name: "add_event",
    description: "Adds a new event to the user's Ramadan schedule.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING, description: "The title of the event" },
        start: { type: Type.STRING, description: "Start time in ISO format, e.g., '2026-03-15T15:00:00'" },
        end: { type: Type.STRING, description: "End time in ISO format, e.g., '2026-03-15T16:00:00'" },
        type: { type: Type.STRING, description: "Event type: 'prayer', 'iftar', 'suhoor', or 'custom'" },
        color: { type: Type.STRING, description: "Optional. Color category, e.g., 'indigo', 'rose', 'emerald'" }
      },
      required: ["title", "start", "end", "type"],
    },
  };

  const updateEventTool = {
    name: "update_event",
    description: "Updates an existing event in the user's Ramadan schedule.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        id: { type: Type.INTEGER, description: "The ID of the event to update" },
        updates: { 
          type: Type.OBJECT, 
          description: "An object containing the fields to update (title, start, end, type, color, allDay)" 
        }
      },
      required: ["id", "updates"],
    },
  };

  const deleteEventTool = {
    name: "delete_event",
    description: "Deletes an existing event from the user's Ramadan schedule.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        id: { type: Type.INTEGER, description: "The ID of the event to delete" },
      },
      required: ["id"],
    },
  };

  // Convert previous messages to the format expected by Gemini
  const chatHistory = messages.map(msg => ({
    role: msg.role === "assistant" ? "model" : "user",
    parts: [{ text: msg.content }]
  }));

  // Create a system prompt that includes context
  const todayStr = format(new Date(), "yyyy-MM-dd");
  let contextStr = `Today's date is ${todayStr}. Current Preferences: ${JSON.stringify(preferences)}. `;
  if (currentEvents.length > 0) {
    const minEvents = currentEvents.map(e => ({ id: e.id, title: e.title, start: e.start, end: e.end, type: e.type }));
    contextStr += `Current Scheduled Events for ${todayStr}: ${JSON.stringify(minEvents)}. `;
  }

  let systemInstruction = `You are an AI assistant for the 'Ramadan Rhythm Scheduler' app. 
Your goal is to help users manage their Ramadan schedule, answer questions about Ramadan, and schedule Iftar, Suhoor, and prayers.
When scheduling prayers, ALWAYS use exact 15-minute durations (e.g., 12:30 PM to 12:45 PM), never wide 1-hour ranges.
${preferences.ramadanMode ? "Ramadan Mode is ENABLED: You MUST proactively suggest and propose 15-minute buffer blocks around prayers (like Wudu before, or Sunnah after)." : ""}
Be respectful, concise, and helpful. Use the provided tools to add, update, or remove events from their calendar when they ask you to.
Return Markdown formatting for readability.
Important context: ${contextStr}`;

  const FALLBACK_MODELS = [
    "gemini-2.5-flash"
  ];

  const latestMessage = messages[messages.length - 1].content;
  let lastError = null;

  for (const modelName of FALLBACK_MODELS) {
    try {
      console.log(`Attempting to use Gemini model: ${modelName}`);
      const chatWithHistory = aiClient.chats.create({
        model: modelName,
        history: chatHistory.slice(0, -1), // Everything except the last message
        config: {
          systemInstruction,
          tools: [{ functionDeclarations: [addEventTool, updateEventTool, deleteEventTool] }],
          temperature: 0.7,
        }
      });
      
      const response = await chatWithHistory.sendMessage({ message: latestMessage });

      // Check if the response includes a function call
      if (response.functionCalls && response.functionCalls.length > 0) {
        return {
          isFunctionCall: true,
          functionCalls: response.functionCalls.map(call => ({ name: call.name, args: call.args })),
          chatInstance: chatWithHistory
        };
      }

      return {
        isFunctionCall: false,
        text: response.text,
      };

    } catch (error) {
      console.warn(`Gemini API error with model ${modelName}:`, error.message);
      lastError = error;
      // Continue to the next fallback model on any error (including rate limits/quota)
      continue;
    }
  }

  console.error("All Gemini models failed. Last error:", lastError);
  throw lastError;
};

export const sendFunctionResultsToGemini = async (chatInstance, results) => {
  try {
    const response = await chatInstance.sendMessage({
      message: results.map(r => ({
        functionResponse: {
          name: r.name,
          response: r.result
        }
      }))
    });

    return {
      text: response.text
    };
  } catch (error) {
    console.error("Error sending function results:", error);
    throw error;
  }
};
