import { FastMCP } from "fastmcp";
import { z } from "zod";
import * as services from "./services/index.js";

/**
 * Register all tools with the MCP server
 * 
 * @param server The FastMCP server instance
 */
export function registerTools(server: FastMCP) {
  // Greeting tool
  server.addTool({
    name: "hello_world",
    description: "A simple hello world tool",
    parameters: z.object({
      name: z.string().describe("Name to greet")
    }),
    execute: async (params) => {
      const greeting = services.GreetingService.generateGreeting(params.name);
      return greeting;
    }
  });

  // Farewell tool
  server.addTool({
    name: "goodbye",
    description: "A simple goodbye tool",
    parameters: z.object({
      name: z.string().describe("Name to bid farewell to")
    }),
    execute: async (params) => {
      const farewell = services.GreetingService.generateFarewell(params.name);
      return farewell;
    }
  });

  // Gtree tool
  server.addTool({
    name: "gtree",
    description: "Generate a tree view of directory structure, respecting .gitignore patterns (similar to tree command with fd filtering)",
    parameters: z.object({
      path: z.string().optional().describe("Target directory path (default: current directory)"),
      maxDepth: z.number().optional().describe("Maximum depth to traverse (equivalent to -L flag)"),
      showHidden: z.boolean().optional().describe("Show hidden files (equivalent to -a flag)"),
      args: z.array(z.string()).optional().describe("Additional tree-style arguments like ['-L', '2'] or ['-a']")
    }),
    execute: async (params) => {
      try {
        // Parse arguments if provided
        let targetPath = params.path || '.';
        let options: services.GtreeOptions = {
          maxDepth: params.maxDepth,
          showHidden: params.showHidden || false,
          excludeGit: true
        };

        // If args are provided, parse them
        if (params.args && params.args.length > 0) {
          const parsed = services.GtreeService.parseTreeArgs(params.args);
          if (parsed.path !== '.') {
            targetPath = parsed.path;
          }
          options = { ...options, ...parsed.options };
        }

        const result = await services.GtreeService.generateTree(targetPath, options);
        return result;
      } catch (error) {
        return `Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
      }
    }
  });
}