import { inject, injectable } from "@needle-di/core";
import { CopilotClient, defineTool } from "npm:@github/copilot-sdk@^0.1.23";
import { MCPService } from "../mcp-server.ts";
import { SendMessageRequest, SendMessageSchema } from "../../schemas/conversations-schemas.ts";
import type { Context } from "hono";
import process from "node:process";

@injectable()
export class CopilotService {
  private client: CopilotClient;
  private clientStarted = false;
  // Simple in-memory session cache to maintain context across HTTP requests
  private static sessions = new Map<string, any>();
  // Store attachments separately to be sent with the next message
  private static attachments = new Map<string, File[]>();

  constructor(private mcpService = inject(MCPService)) {
    const apiKey = Deno.env.get("BYOK_API_KEY");
    const baseUrl = Deno.env.get("BYOK_BASE_URL");
    
    if (!apiKey) {
      throw new Error("BYOK_API_KEY environment variable is required");
    }

    if (!baseUrl) {
      throw new Error("BYOK_BASE_URL environment variable is required");
    }

    this.client = new CopilotClient({
      logLevel: "all",
    });
    
    // Listen for client state changes
    this.client.on("stateChange", (state: any) => {
      console.log(`[Copilot] Client state changed to: ${state}`);
    });
  }

  private async ensureClientStarted() {
    if (!this.clientStarted) {
      console.log("[Copilot] Starting SDK...");
      await this.client.start();
      this.clientStarted = true;
      console.log("[Copilot] SDK started successfully");
    }
  }

  public async listModels() {
    const apiKey = Deno.env.get("BYOK_API_KEY");
    const baseUrl = Deno.env.get("BYOK_BASE_URL");
    
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
    const sessionAttachments = CopilotService.attachments.get(sessionId) || [];
    sessionAttachments.push(file);
    CopilotService.attachments.set(sessionId, sessionAttachments);
  }

  public async sendAndWaitMessage(
    payload: SendMessageRequest,
  ): Promise<string> {
    const { sessionId, userMessage, mcpServer, model } = payload;
    
    await this.ensureClientStarted();

    const pendingAttachments = CopilotService.attachments.get(sessionId) || [];
    const hasImages = pendingAttachments.length > 0;
    
    const session = await this.getOrCreateSession(sessionId, mcpServer, model);

    let attachments: any[] | undefined;
    if (hasImages) {
      attachments = await Promise.all(
        pendingAttachments.map(async (file) => ({
          type: "image" as const,
          url: `data:${file.type};base64,${await this.fileToBase64(file)}`
        }))
      );
      CopilotService.attachments.delete(sessionId);
    }

    console.log(`[Copilot] Using sendAndWait for session: ${sessionId}`);
    const response = await session.sendAndWait({
      prompt: userMessage,
      ...(attachments ? { attachments } : {}),
    });

    console.log(`[Copilot] sendAndWait completed. Response type:`, response?.type);
    
    if (response?.type === "assistant.message") {
      return response.data.content;
    }
    
    throw new Error("No assistant message received");
  }

  public async streamMessage(
    payload: SendMessageRequest,
  ): Promise<ReadableStream<string>> {
    const { sessionId, userMessage, mcpServer, model } = payload;
    
    await this.ensureClientStarted();

    const pendingAttachments = CopilotService.attachments.get(sessionId) || [];
    const hasImages = pendingAttachments.length > 0;
    
    const session = await this.getOrCreateSession(sessionId, mcpServer, model);

    let attachments: any[] | undefined;
    if (hasImages) {
      attachments = await Promise.all(
        pendingAttachments.map(async (file) => ({
          type: "image" as const,
          url: `data:${file.type};base64,${await this.fileToBase64(file)}`
        }))
      );
      CopilotService.attachments.delete(sessionId);
    }

    return new ReadableStream({
      async start(controller) {
        console.debug(`[Copilot] Starting stream for session: ${sessionId}`);
        
        let isControllerClosed = false;

        const unsubscribe = session.on((event: any) => {
          try {
            console.debug(`[Copilot] Received event:`, event.type);
            
            switch (event.type) {
              case "assistant.message_delta":  // Use underscore, not dot
                if (event.data?.deltaContent && !isControllerClosed) {
                  console.debug(`[Copilot] Enqueueing delta: ${event.data.deltaContent}`);
                  controller.enqueue(event.data.deltaContent);
                }
                break;
              
              case "assistant.message":
                console.debug(`[Copilot] Final message received: ${event.data?.content?.substring(0, 50)}...`);
                break;
              
              case "session.idle":
                console.debug(`[Copilot] Session idle, closing stream`);
                if (!isControllerClosed) {
                  isControllerClosed = true;
                  unsubscribe();
                  try {
                    controller.close();
                    console.debug(`[Copilot] Controller closed for session: ${sessionId}`);
                  } catch (e) {
                    console.error(`[Copilot] Error closing controller:`, e);
                  }
                }
                break;
              
              case "session.error":
                console.error(`[Copilot] Session error:`, event.data?.message);
                if (!isControllerClosed) {
                  isControllerClosed = true;
                  unsubscribe();
                  try {
                    controller.error(event.data?.message || "Unknown error");
                  } catch (e) {
                    console.error(`[Copilot] Error reporting error to controller:`, e);
                  }
                }
                break;
              
              case "error":
                console.error(`[Copilot] Error event:`, JSON.stringify(event.data));
                if (!isControllerClosed) {
                  isControllerClosed = true;
                  unsubscribe();
                  try {
                    controller.error(event.data?.message || event.data || "Unknown error");
                  } catch (e) {
                    console.error(`[Copilot] Error reporting error to controller:`, e);
                  }
                }
                break;
              
              default:
                // Log all other events with partial data to understand what's happening
                if (event.data) {
                  const dataStr = JSON.stringify(event.data);
                  console.debug(`[Copilot] Other event: ${event.type}, data: ${dataStr.substring(0, 200)}`);
                } else {
                  console.debug(`[Copilot] Other event: ${event.type}`);
                }
            }
          } catch (e) {
            console.error(`[Copilot] Error in event handler:`, e);
          }
        });

        try {
          console.debug(`[Copilot] Invoking session.send for: ${sessionId}`);
          const result = await session.send({
            prompt: userMessage,
            ...(attachments ? { attachments } : {}),
          });
          console.debug(`[Copilot] session.send completed for: ${sessionId}. Result:`, result);
        } catch (err) {
          console.error(`[Copilot] Error in session.send:`, err);
          if (!isControllerClosed) {
            isControllerClosed = true;
            unsubscribe();
            try {
              controller.error(String(err));
            } catch (e) {
              console.error(`[Copilot] Error reporting error to controller:`, e);
            }
          }
        }
      }
    });
  }

  private async getOrCreateSession(sessionId: string, mcpServer: "GLOBAL" | "PORTFOLIO" | "EXPENSES", model: string = "gpt-4o-mini") {
    const cacheKey = `${sessionId}:${mcpServer}:${model}`;
    if (CopilotService.sessions.has(cacheKey)) {
      console.debug(`[Copilot] Using cached session for: ${cacheKey}`);
      return CopilotService.sessions.get(cacheKey);
    }

    console.log(`[Copilot] Creating new session for: ${cacheKey}`);
    const apiKey = Deno.env.get("BYOK_API_KEY");
    const baseUrl = Deno.env.get("BYOK_BASE_URL");

    const session = await this.client.createSession({
      model: model,
      streaming: true,  // RE-ENABLE STREAMING
      provider: {
        type: "openai",
        baseUrl: baseUrl,
        apiKey: apiKey,
        wireApi: "completions",
      },
      hooks: {
        onSessionStart: async (input: any, invocation: any) => {
          console.log(`[Copilot] Session started: ${invocation.sessionId}`);
          console.log(`  Source: ${input.source}`);
          console.log(`  CWD: ${input.cwd}`);
          console.log(`  Initial prompt: ${input.initialPrompt || 'none'}`);
          return null;
        },
        onSessionEnd: async (input: any, invocation: any) => {
          console.log(`[Copilot] Session ended: ${invocation.sessionId}`);
          console.log(`  Reason: ${input.reason}`);
          console.log(`  Final message: ${input.finalMessage?.substring(0, 100) || 'none'}`);
          if (input.error) {
            console.error(`  Error: ${input.error}`);
          }
          return null;
        },
        onErrorOccurred: async (input: any, invocation: any) => {
          console.error(`[Copilot] Error occurred in session ${invocation.sessionId}:`);
          console.error(`  Error: ${input.error}`);
          console.error(`  Context: ${input.errorContext}`);
          console.error(`  Recoverable: ${input.recoverable}`);
          console.error(`  Timestamp: ${new Date(input.timestamp).toISOString()}`);
          return null;
        },
      },
    });
    
    // Get MCP Tools
    const mcpTools = this.mcpService.getToolsForServer(mcpServer);
    
    // Map MCP Tools to Copilot Tools
    const tools = mcpTools.map((tool) => {
      return defineTool(tool.name, {
        description: tool.meta.description || "",
        parameters: tool.meta.inputSchema as any,
        handler: async (args: any) => {
          try {
            const result = await tool.run(args);
            return result.structured || { result: result.text };
          } catch (error) {
            throw error;
          }
        },
      });
    });

    // Register Tools ONLY ONCE per session
    session.registerTools(tools);

    CopilotService.sessions.set(cacheKey, session);
    return session;
  }

  private async fileToBase64(file: File): Promise<string> {
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }
}