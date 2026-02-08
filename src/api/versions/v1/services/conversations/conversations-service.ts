import { inject, injectable } from "@needle-di/core";
import { createOpenAI } from "@ai-sdk/openai";
import { streamText, generateText, type CoreMessage, tool as aiTool, zodSchema } from "ai";
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
import { z } from "zod";

@injectable()
export class ConversationsService {
  // Simple in-memory session cache to maintain context across HTTP requests
  private static sessions = new Map<string, CoreMessage[]>();

  constructor(private mcpService = inject(MCPService)) {}

  private getClient(baseUrl?: string, apiKey?: string) {
    const finalApiKey = apiKey || Deno.env.get(ENV_OPENAI_API_KEY);
    const finalBaseUrl = baseUrl || Deno.env.get(ENV_OPENAI_BASE_URL);

    if (!finalApiKey) {
      throw new Error(`${ENV_OPENAI_API_KEY} environment variable is required`);
    }

    if (!finalBaseUrl) {
      throw new Error(`${ENV_OPENAI_BASE_URL} environment variable is required`);
    }

    return createOpenAI({
      apiKey: finalApiKey,
      baseURL: finalBaseUrl,
    });
  }

  public async listModels() {
    const apiKey = Deno.env.get(ENV_OPENAI_API_KEY);
    const baseUrl = Deno.env.get(ENV_OPENAI_BASE_URL);
    
    if (!apiKey || !baseUrl) {
       throw new Error("OpenAI configuration is missing");
    }

    // Fetch models from provider
    const response = await fetch(`${baseUrl}/models`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch models: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.data || [];
  }

  public async attachImage(sessionId: string, file: File): Promise<void> {
    // TODO: Implement image attachment support
    throw new ServerError("NOT_IMPLEMENTED", "Image attachments not yet supported", 501);
  }

  private getHistory(sessionId: string): CoreMessage[] {
    return ConversationsService.sessions.get(sessionId) || [];
  }

  private updateHistory(sessionId: string, messages: CoreMessage[]) {
    ConversationsService.sessions.set(sessionId, messages);
  }

  private getTools(mcpServer: "GLOBAL" | "PORTFOLIO" | "EXPENSES"): Record<string, any> {
    const mcpTools = this.mcpService.getToolsForServer(mcpServer);
    const tools: Record<string, any> = {};

    for (const mcpTool of mcpTools) {
      const schema = z.object(mcpTool.meta.inputSchema);
      
      tools[mcpTool.name] = aiTool({
        description: mcpTool.meta.description || "",
        parameters: zodSchema(schema),
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

  public async sendAndWaitMessage(
    payload: SendMessageRequest,
    requestUrl: string,
    authHeader?: string,
  ): Promise<string> {
    const { sessionId, userMessage, mcpServer, model } = payload;
    
    try {
      const client = this.getClient();
      const history = this.getHistory(sessionId);
      const tools = this.getTools(mcpServer);

      const newMessage: CoreMessage = { 
        role: 'user', 
        content: userMessage 
      };
      const messages = [...history, newMessage];

      const result = await generateText({
        model: client(model),
        messages,
        tools,
        maxSteps: 10, // Allow more tool calls
      });

      this.updateHistory(sessionId, [...messages, ...result.response.messages]);

      return result.text;
    } catch (error) {
      throw this.handleAIError(error);
    }
  }

  public async streamMessage(
    payload: SendMessageRequest,
    requestUrl: string,
    authHeader?: string,
  ): Promise<ReadableStream<string>> {
    const { sessionId, userMessage, mcpServer, model } = payload;
    
    try {
      const client = this.getClient();
      const history = this.getHistory(sessionId);
      const tools = this.getTools(mcpServer);

      const newMessage: CoreMessage = { 
        role: 'user', 
        content: userMessage 
      };
      const messages = [...history, newMessage];

      const result = await streamText({
        model: client(model),
        messages,
        tools,
        maxSteps: 10, // Allow more tool calls
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
