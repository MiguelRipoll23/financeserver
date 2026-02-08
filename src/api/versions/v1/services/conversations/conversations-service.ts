import { inject, injectable } from "@needle-di/core";
import { createOpenAI } from "@ai-sdk/openai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { streamText, type ModelMessage, tool as aiTool, stepCountIs, type TextPart, type ImagePart } from "ai";
import { MCPService } from "../mcp-server.ts";
import { SendMessageRequest } from "../../schemas/conversations-schemas.ts";
import { ServerError } from "../../models/server-error.ts";
import { 
  ENV_OPENAI_API_KEY, 
  ENV_OPENAI_BASE_URL 
} from "../../constants/environment-constants.ts";
import {
  APICallError,
  InvalidPromptError,
  RetryError,
} from "ai";

@injectable()
export class ConversationsService {
  // Simple in-memory session cache to maintain context across HTTP requests
  private static sessions = new Map<string, ModelMessage[]>();
  
  // Store image attachments per session
  private static imageAttachments = new Map<string, ImagePart[]>();

  constructor(private mcpService = inject(MCPService)) {}

  private getModel(model: string) {
    const apiKey = Deno.env.get(ENV_OPENAI_API_KEY);
    const baseUrl = Deno.env.get(ENV_OPENAI_BASE_URL);

    if (!apiKey) {
      throw new Error(`${ENV_OPENAI_API_KEY} environment variable is required`);
    }

    if (!baseUrl) {
      throw new Error(`${ENV_OPENAI_BASE_URL} environment variable is required`);
    }

    // Detect provider and return appropriate model
    const isGoogleGemini = baseUrl.includes('generativelanguage.googleapis.com');

    if (isGoogleGemini) {
      // Use Google native SDK
      const googleProvider = createGoogleGenerativeAI({ apiKey });
      return googleProvider(model);
    } else {
      // Use OpenAI-compatible provider
      const openAIProvider = createOpenAI({
        apiKey,
        baseURL: baseUrl,
      });
      return openAIProvider.chat(model);
    }
  }

  public async listModels() {
    const apiKey = Deno.env.get(ENV_OPENAI_API_KEY);
    const baseUrl = Deno.env.get(ENV_OPENAI_BASE_URL);
    
    if (!apiKey || !baseUrl) {
       throw new Error("OpenAI configuration is missing");
    }

    // Detect if using Google Gemini API
    const isGoogleGemini = baseUrl.includes('generativelanguage.googleapis.com');
    
    let fetchUrl: string;
    let headers: Record<string, string>;

    if (isGoogleGemini) {
      // Google Gemini API uses different auth and endpoint
      fetchUrl = 'https://generativelanguage.googleapis.com/v1beta/models';
      headers = {
        'X-Goog-Api-Key': apiKey,
      };
    } else {
      // Standard OpenAI-compatible endpoint
      fetchUrl = `${baseUrl}/models`;
      headers = {
        'Authorization': `Bearer ${apiKey}`,
      };
    }

    const response = await fetch(fetchUrl, { headers });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch models: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Google returns { models: [...] }, OpenAI returns { data: [...] }
    return data.models || data.data || [];
  }

  public async attachImage(sessionId: string, file: File): Promise<void> {
    // Read file into Uint8Array
    const buffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(buffer);
    
    // Get existing images for this session or create new array
    const images = ConversationsService.imageAttachments.get(sessionId) || [];
    
    // Add the new image using the correct ImagePart type
    const imagePart: ImagePart = {
      type: 'image',
      image: uint8Array,
      mediaType: file.type, // Correct property name is mediaType, not mimeType
    };
    
    images.push(imagePart);
    
    // Store back in the map
    ConversationsService.imageAttachments.set(sessionId, images);
  }

  private getHistory(sessionId: string): ModelMessage[] {
    return ConversationsService.sessions.get(sessionId) || [];
  }

  private updateHistory(sessionId: string, messages: ModelMessage[]) {
    ConversationsService.sessions.set(sessionId, messages);
  }

  private getTools(mcpServer: "GLOBAL" | "PORTFOLIO" | "EXPENSES"): Record<string, any> {
    const mcpTools = this.mcpService.getToolsForServer(mcpServer);
    const tools: Record<string, any> = {};

    for (const mcpTool of mcpTools) {
      tools[mcpTool.name] = aiTool({
        description: mcpTool.meta.description || "",
        inputSchema: mcpTool.meta.inputSchema,
        execute: async (args: any) => {
          const result = await mcpTool.run(args);
          return result.structured || result.text;
        },
      });
    }

    return tools;
  }

  private handleAIError(error: unknown): ServerError {
    // Handle AI SDK specific errors
    if (error && typeof error === 'object') {
      const err = error as any;
      
      // Rate limit errors
      if (err.statusCode === 429 || err.message?.includes('rate limit') || err.message?.includes('Rate limit')) {
        return new ServerError(
          "AI_RATE_LIMIT_EXCEEDED",
          "The AI service rate limit has been exceeded. Please try again later.",
          429
        );
      }
      
      // Bad request / validation errors
      if (err.statusCode === 400 || err.message?.includes('Bad Request')) {
        return new ServerError(
          "AI_BAD_REQUEST",
          err.message || "Invalid request to AI service",
          400
        );
      }
      
      // Authentication errors
      if (err.statusCode === 401 || err.statusCode === 403) {
        return new ServerError(
          "AI_AUTHENTICATION_FAILED",
          "AI service authentication failed",
          500
        );
      }
      
      // Service unavailable
      if (err.statusCode === 503 || err.message?.includes('unavailable')) {
        return new ServerError(
          "AI_SERVICE_UNAVAILABLE",
          "AI service is temporarily unavailable. Please try again later.",
          503
        );
      }
      
      // Retry errors (max retries exceeded)
      if (err.reason === 'maxRetriesExceeded' || err.constructor?.name === 'RetryError') {
        return new ServerError(
          "AI_MAX_RETRIES_EXCEEDED",
          err.message || "AI service request failed after multiple retries",
          503
        );
      }
    }
    
    // Generic error fallback
    return new ServerError(
      "AI_REQUEST_FAILED",
      error instanceof Error ? error.message : "AI request failed with an unknown error",
      500
    );
  }

  public async streamMessage(
    payload: SendMessageRequest,
    requestUrl: string,
    authHeader?: string,
  ): Promise<ReadableStream<string>> {
    const { sessionId, userMessage, mcpServer, model } = payload;
    
    try {
      const aiModel = this.getModel(model);
      const history = this.getHistory(sessionId);
      const tools = this.getTools(mcpServer);

      // Get any attached images for this session
      const attachedImages = ConversationsService.imageAttachments.get(sessionId) || [];
      
      // Build message content with text and images
      let messageContent: string | Array<TextPart | ImagePart>;
      
      if (attachedImages.length > 0) {
        // Create multimodal content with text and images
        const textPart: TextPart = { type: 'text', text: userMessage };
        messageContent = [textPart, ...attachedImages];
        
        // Clear images after adding them to the message
        ConversationsService.imageAttachments.delete(sessionId);
      } else {
        // Plain text message
        messageContent = userMessage;
      }

      const newMessage: ModelMessage = { 
        role: 'user', 
        content: messageContent
      };
      const messages = [...history, newMessage];

      const result = await streamText({
        model: aiModel,
        messages,
        tools,
        stopWhen: stepCountIs(25), // Allow up to 25 tool call steps
        onFinish: async ({ response }) => {
          this.updateHistory(sessionId, [...messages, ...response.messages]);
        },
      });

      return result.textStream;
    } catch (error) {
      throw this.handleAIError(error);
    }
  }
}
