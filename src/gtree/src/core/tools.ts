import { FastMCP } from "fastmcp";
import { z } from "zod";
import * as services from "./services/index.js";

/**
 * Register all tools with the MCP server
 * 
 * @param server The FastMCP server instance
 */
export function registerTools(server: FastMCP) {
  // Gtree tool
  server.addTool({
    name: "gtree",
    description: "Generate a tree view of directory structure, respecting .gitignore patterns by using 'fd' and 'tree' commands.",
    parameters: z.object({
      path: z.string().optional().describe("Target directory path (default: current directory)"),
      args: z.array(z.string()).optional().describe("Additional arguments to pass to the underlying 'tree' command (e.g., ['-L', '2', '-d', '--dirsfirst']). '.gitignore' is respected via 'fd'.")
    }),
    execute: async (params) => {
      try {
        const targetPath = params.path || '.';
        const treeArgs = params.args || [];

        const result = await services.GtreeService.generateTree(targetPath, treeArgs);
        return result;
      } catch (error) {
        return `Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
      }
    }
  });

  // Current Working Directory tool
  server.addTool({
    name: "cwd",
    description: "Get the current working directory information.",
    parameters: z.object({
      basePath: z.string().optional().describe("Base path to calculate relative path from (optional)")
    }),
    execute: async (params) => {
      try {
        if (params.basePath) {
          const result = await services.CwdService.getCwdInfo(params.basePath);
          return `Current working directory:
Absolute path: ${result.absolute}
Base path: ${result.basePath}
Relative path: ${result.relative || '(same as base)'}`;
        } else {
          const result = await services.CwdService.getCurrentWorkingDirectory();
          return `Current working directory: ${result}`;
        }
      } catch (error) {
        return `Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
      }
    }
  });
}
