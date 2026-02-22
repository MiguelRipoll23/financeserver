import { inject, injectable } from "@needle-di/core";
import { createOpenAI } from "@ai-sdk/openai";
import {
  type ImagePart,
  type ModelMessage,
  stepCountIs,
  streamText,
  type StreamTextResult,
  type TextPart,
  tool as aiTool,
  type Tool,
} from "ai";
import { MCPService } from "../mcp-server.ts";
import { SendMessageRequest } from "../../schemas/conversations-schemas.ts";
import { ServerError } from "../../models/server-error.ts";
import {
  ENV_OPENAI_API_KEY,
  ENV_OPENAI_BASE_URL,
} from "../../constants/environment-constants.ts";
import { OPENAI_SYSTEM_PROMPT } from "../../constants/ai-constants.ts";
import {
  MAX_SESSION_CACHE_ENTRIES,
  SESSION_TTL_MS,
} from "../../constants/api-constants.ts";
import { APICallError, InvalidPromptError, RetryError } from "ai";
import { LRUCache } from "../../utils/lru-cache.ts";
import type { ContentfulStatusCode } from "hono/utils/http-status";

@injectable()
export class ConversationsService {
  // LRU cache with TTL to prevent unbounded growth
  private static sessions = new LRUCache<string, ModelMessage[]>(
    MAX_SESSION_CACHE_ENTRIES,
    SESSION_TTL_MS,
  );

  // Store image attachments per session with LRU cache
  private static imageAttachments = new LRUCache<string, ImagePart[]>(
    MAX_SESSION_CACHE_ENTRIES,
    SESSION_TTL_MS,
  );

  // Cleanup interval for expired sessions (runs every hour)
  private static cleanupInterval: number | null = null;

  constructor(private mcpService = inject(MCPService)) {
    // Start cleanup job if not already started
    if (ConversationsService.cleanupInterval === null) {
      ConversationsService.cleanupInterval = setInterval(
        () => {
          const expiredSessions = ConversationsService.sessions.evictExpired();
          const expiredImages =
            ConversationsService.imageAttachments.evictExpired();
          if (expiredSessions > 0 || expiredImages > 0) {
            console.log(
              `Cleaned up ${expiredSessions} expired sessions and ${expiredImages} expired image attachments`,
            );
          }
        },
        60 * 60 * 1000,
      ); // Run every hour
    }
  }

  private getModel(model: string) {
    const apiKey = Deno.env.get(ENV_OPENAI_API_KEY);
    const baseUrl = Deno.env.get(ENV_OPENAI_BASE_URL);

    if (!apiKey) {
      throw new Error(`${ENV_OPENAI_API_KEY} environment variable is required`);
    }

    if (!baseUrl) {
      throw new Error(
        `${ENV_OPENAI_BASE_URL} environment variable is required`,
      );
    }

    // Use OpenAI-compatible provider
    const openAIProvider = createOpenAI({
      apiKey,
      baseURL: baseUrl,
    });
    return openAIProvider.chat(model);
  }

  public async listModels() {
    const apiKey = Deno.env.get(ENV_OPENAI_API_KEY);
    const baseUrl = Deno.env.get(ENV_OPENAI_BASE_URL);

    if (!apiKey || !baseUrl) {
      throw new Error("OpenAI configuration is missing");
    }

    const fetchUrl = `${baseUrl.replace(/\/+$/, "")}/models`;
    const headers = {
      Authorization: `Bearer ${apiKey}`,
    };

    const response = await fetch(fetchUrl, { headers });

    if (!response.ok) {
      throw new Error(`Failed to fetch models: ${response.statusText}`);
    }

    return response.json();
  }

  public async attachImage(sessionId: string, file: File): Promise<void> {
    // Read file into Uint8Array
    const buffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(buffer);

    // Get existing images for this session or create new array
    const images = ConversationsService.imageAttachments.get(sessionId) || [];

    // Add the new image using the correct ImagePart type
    const imagePart: ImagePart = {
      type: "image",
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

  private getTools(
    mcpServer: "GLOBAL" | "PORTFOLIO" | "EXPENSES",
  ): Record<string, Tool> {
    const mcpTools = this.mcpService.getToolsForServer(mcpServer);
    const tools: Record<string, Tool> = {};

    for (const mcpTool of mcpTools) {
      tools[mcpTool.name] = aiTool({
        description: mcpTool.meta.description || "",
        inputSchema: mcpTool.meta.inputSchema,
        execute: async (args: unknown) => {
          const result = await mcpTool.run(args);
          return result.structured || result.text;
        },
      });
    }

    return tools;
  }

  private handleAIError(error: unknown): ServerError {
    // Handle AI SDK specific errors using instanceof
    if (error instanceof APICallError) {
      // Rate limit errors
      if (error.statusCode === 429) {
        return new ServerError(
          "AI_RATE_LIMIT_EXCEEDED",
          "The AI service rate limit has been exceeded. Please try again later.",
          429,
        );
      }

      // Bad request / validation errors
      if (error.statusCode === 400) {
        return new ServerError(
          "AI_BAD_REQUEST",
          error.message || "Invalid request to AI service",
          400,
        );
      }

      // Authentication errors
      if (error.statusCode === 401 || error.statusCode === 403) {
        return new ServerError(
          "AI_AUTHENTICATION_FAILED",
          "AI service authentication failed",
          500,
        );
      }

      // Service unavailable
      if (error.statusCode === 503) {
        return new ServerError(
          "AI_SERVICE_UNAVAILABLE",
          "AI service is temporarily unavailable. Please try again later.",
          503,
        );
      }

      // Generic API call error
      return new ServerError(
        "AI_API_ERROR",
        error.message || "AI API request failed",
        (error.statusCode as ContentfulStatusCode) || 500,
      );
    }

    // Handle retry errors (max retries exceeded)
    if (error instanceof RetryError) {
      return new ServerError(
        "AI_MAX_RETRIES_EXCEEDED",
        error.message || "AI service request failed after multiple retries",
        503,
      );
    }

    // Handle invalid prompt errors
    if (error instanceof InvalidPromptError) {
      return new ServerError(
        "AI_INVALID_PROMPT",
        error.message || "Invalid prompt provided to AI service",
        400,
      );
    }

    // Generic error fallback
    return new ServerError(
      "AI_REQUEST_FAILED",
      error instanceof Error
        ? error.message
        : "AI request failed with an unknown error",
      500,
    );
  }

  public async streamMessage(
    payload: SendMessageRequest,
    // deno-lint-ignore no-explicit-any
  ): Promise<StreamTextResult<any, any>> {
    const { sessionId, userMessage, mcpServer, model } = payload;

    try {
      const aiModel = this.getModel(model);
      const history = this.getHistory(sessionId);
      const tools = this.getTools(mcpServer);

      // Get any attached images for this session
      const attachedImages =
        ConversationsService.imageAttachments.get(sessionId) || [];

      // Build message content with text and images
      let messageContent: string | Array<TextPart | ImagePart>;

      if (attachedImages.length > 0) {
        // Create multimodal content with text and images
        const textPart: TextPart = { type: "text", text: userMessage };
        messageContent = [textPart, ...attachedImages];

        // Clear images after adding them to the message
        ConversationsService.imageAttachments.delete(sessionId);
      } else {
        // Plain text message
        messageContent = userMessage;
      }

      const newMessage: ModelMessage = {
        role: "user",
        content: messageContent,
      };

      const currentDate = new Date().toISOString().slice(0, 10);

      const systemMessage: ModelMessage = {
        role: "system",
        content: `${OPENAI_SYSTEM_PROMPT} Current date: ${currentDate}.`,
      };

      let messages: ModelMessage[];
      if (history.length === 0 || history[0].role !== "system") {
        messages = [systemMessage, ...history, newMessage];
      } else {
        messages = [...history, newMessage];
      }

      return await streamText({
        model: aiModel,
        messages,
        tools,
        stopWhen: stepCountIs(25), // Allow up to 25 tool call steps
        onFinish: ({ response }) => {
          this.updateHistory(sessionId, [...messages, ...response.messages]);
        },
      });
    } catch (error) {
      throw this.handleAIError(error);
    }
  }
}
