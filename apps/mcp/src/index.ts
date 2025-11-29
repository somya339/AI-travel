import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const server = new McpServer({
    name: "AI Travel Planner",
    version: "1.0.0",
    title: "AI Travel Planner",
    websiteUrl: "http://localhost:4000",
});

server.registerTool(
    "ping_server",
    {
        title: "Ping the server",
        description: "Ping the server to check if it is running",
        inputSchema: z.object({
            message: z.string().describe("The message to send to the server"),
        }),
    },
    async ({ message }) => {
        return {
            content: [
                {
                    type: "text",
                    text: `Pong! Received message: ${message}`,
                },
            ],
        };
    }
);

async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("Weather MCP Server running on stdio");
}

main().catch((error) => {
    console.error("Fatal error in main():", error);
});
