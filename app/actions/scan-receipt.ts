"use server";

import { GoogleGenerativeAI } from "@google/generative-ai";

// Ensure the API key is set
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// These are the categories from the Prisma schema
const categories = [
  "Food",
  "Groceries",
  "Transportation",
  "Internet",
  "Health",
  "Sport",
  "Shopping",
  "Entertainment",
  "BadHabits",
  "Other",
];

// This is the prompt that instructs Gemini
const prompt = `
You are an expert receipt scanner for an expense tracker.
Analyze the provided receipt image and extract the following:

1. "name": The merchant name or a short description (e.g., "Starbucks", "Grocery Store").
2. "amount": The final, total amount paid. Return this as a number, not a string.
3. "date": The date of the transaction. Return in "YYYY-MM-DD" format.
4. "category": The category that best fits this transaction.
   You MUST choose ONE of the following categories:
   [${categories.join(", ")}]
   If no category fits, use "Other".

Return your answer ONLY as a valid JSON object in the following format:
{
  "name": "...",
  "amount": 12.34,
  "date": "YYYY-MM-DD",
  "category": "..."
}
`;

// Helper function to convert client-side base64 to the format Gemini needs
function base64ToGenerativePart(image: string) {
  // A base64 string from the client looks like "data:image/jpeg;base64,..."
  // We need to extract the mime type and the data
  const [header, data] = image.split(",");
  const mimeType = header.match(/:(.*?);/)?.[1];
  
  if (!mimeType || !data) {
    throw new Error("Invalid image data");
  }

  return {
    inlineData: {
      data: data,
      mimeType: mimeType,
    },
  };
}

// Define the expected JSON response structure for type safety
export type AiScanResponse = {
  name: string;
  amount: number;
  category: string;
  date: string; // "YYYY-MM-DD"
};

// The main server action
export async function scanReceipt(base64Image: string): Promise<{
  success: boolean;
  data?: AiScanResponse;
  error?: string;
}> {
  try {
    console.log("Starting receipt scan...");
    
    // Check if API key is configured
    if (!process.env.GEMINI_API_KEY) {
      console.error("API key not found in environment");
      return { 
        success: false, 
        error: "Gemini API key not configured. Please add GEMINI_API_KEY to your .env file." 
      };
    }

    console.log("API key found, initializing model...");
    
    // Validate base64 image format
    if (!base64Image || !base64Image.startsWith('data:image/')) {
      console.error("Invalid image format:", base64Image?.substring(0, 50));
      return {
        success: false,
        error: "Invalid image format. Please select a valid image file."
      };
    }

    // We'll use gemini-flash-lite-latest as it supports vision tasks
    const model = genAI.getGenerativeModel({ model: "gemini-flash-lite-latest" });

    console.log("Converting image to Gemini format...");
    const imagePart = base64ToGenerativePart(base64Image);
    
    console.log("Sending request to Gemini API...");
    const result = await model.generateContent([prompt, imagePart]);
    const response = result.response;
    const text = response.text();
    
    console.log("Received response from Gemini:", text);

    // Clean the text in case Gemini adds markdown backticks
    const cleanedText = text.replace(/```json/g, "").replace(/```/g, "").trim();
    console.log("Cleaned response text:", cleanedText);

    // Parse the JSON string into an object
    const jsonData: AiScanResponse = JSON.parse(cleanedText);
    console.log("Parsed JSON data:", jsonData);

    // Basic validation
    if (!jsonData.name || !jsonData.amount || !jsonData.date || !jsonData.category) {
      throw new Error("AI returned incomplete data.");
    }

    if (!categories.includes(jsonData.category)) {
      jsonData.category = "Other"; // Default to "Other" if AI hallucinates a category
    }

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(jsonData.date)) {
      // Try to parse and reformat the date
      const parsedDate = new Date(jsonData.date);
      if (isNaN(parsedDate.getTime())) {
        // If parsing fails, use today's date
        jsonData.date = new Date().toISOString().split('T')[0];
      } else {
        jsonData.date = parsedDate.toISOString().split('T')[0];
      }
    }

    // Validate amount is a positive number
    if (typeof jsonData.amount !== 'number' || jsonData.amount <= 0) {
      throw new Error("Invalid amount extracted from receipt.");
    }

    return { success: true, data: jsonData };

  } catch (error) {
    console.error("Error scanning receipt:", error);
    
    // Provide more specific error messages
    if (error instanceof Error) {
      console.error("Error details:", {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      
      if (error.message.includes("API key") || error.message.includes("API_KEY")) {
        return { success: false, error: "Invalid API key. Please check your Gemini API configuration." };
      }
      if (error.message.includes("JSON") || error.message.includes("parse")) {
        return { success: false, error: `Failed to parse AI response. Raw error: ${error.message}` };
      }
      if (error.message.includes("quota") || error.message.includes("limit") || error.message.includes("QUOTA")) {
        return { success: false, error: "API quota exceeded. Please try again later." };
      }
      if (error.message.includes("PERMISSION_DENIED")) {
        return { success: false, error: "API access denied. Please check your API key permissions." };
      }
      if (error.message.includes("INVALID_ARGUMENT")) {
        return { success: false, error: "Invalid image format. Please try with a different image." };
      }
      if (error.message.includes("UNAVAILABLE") || error.message.includes("network")) {
        return { success: false, error: "Service temporarily unavailable. Please try again." };
      }
      
      // Return the actual error message for debugging
      return { success: false, error: `Scan failed: ${error.message}` };
    }
    
    return { success: false, error: "Failed to scan receipt. Please try again with a clearer image." };
  }
}
