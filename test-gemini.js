import { GoogleGenAI, Type } from "@google/genai";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const apiKey = process.env.VITE_GEMINI_API_KEY;
const aiClient = new GoogleGenAI({ apiKey });

async function runTest() {
  const addEventTool = {
    name: "add_event",
    description: "Adds a new event.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING },
      },
    },
  };

  const chat = aiClient.chats.create({
    model: "gemini-3-flash-preview",
    config: {
      tools: [{ functionDeclarations: [addEventTool] }],
    }
  });

  console.log("Sending initial message...");
  const response = await chat.sendMessage({ message: "Add an event called 'Meeting'" });
  
  if (response.functionCalls && response.functionCalls.length > 0) {
    const call = response.functionCalls[0];
    console.log("Got function call:", call.name, call.args);

    // Try to send result
    try {
      console.log("Sending function result with 'message: [...]'...");
      const finalResponse = await chat.sendMessage({
        message: [{
          functionResponse: {
             name: call.name,
             response: { success: true }
          }
        }]
      });
      console.log("Final Response 1:", finalResponse.text);
    } catch (e) {
      console.error("Failed 1:", e);
      
      try {
        console.log("Trying 'message: Content object'...");
        const finalResponse2 = await chat.sendMessage({
          message: {
            role: "user", // or "function"
            parts: [{
              functionResponse: {
                 name: call.name,
                 response: { success: true }
              }
            }]
          }
        });
        console.log("Final Response 2:", finalResponse2.text);
      } catch (e2) {
          console.error("Failed 2:", e2);
      }
    }
  } else {
    console.log("No function call returned.", response.text);
  }
}

runTest().catch(console.error);
