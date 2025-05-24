# @epikem/gtree

![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6)

Vibe coded MCP server that provides directory tree visualization with git-aware filtering

## 📋 Usage

```bash
npm init @epikem/gtree
```

## 🔭 What's Included

This MCP server provides:

- **gtree tool**: Generate directory tree visualizations respecting .gitignore patterns
- **CLI compatibility**: Works as both MCP tool and standalone CLI command
- **Git-aware filtering**: Automatically excludes files/directories based on .gitignore rules
- **Tree command compatibility**: Supports common tree command arguments like `-L` (depth) and `-a` (show hidden)

## ✨ Features

- **Git-aware filtering**: Automatically reads and respects .gitignore patterns
- **Depth control**: Limit tree depth with `-L` flag or `maxDepth` parameter
- **Hidden files support**: Show hidden files with `-a` flag or `showHidden` parameter
- **Fast performance**: Built with Node.js filesystem APIs for optimal performance
- **TypeScript**: Full TypeScript implementation for type safety
- **Dual mode**: Works as both MCP server tool and standalone CLI

## 🚀 Getting Started

### As MCP Server

1. Install the package:

   ```bash
   npm install @epikem/gtree
   ```

2. Add to your MCP configuration (`.cursor/mcp.json`):

   ```json
   {
     "mcpServers": {
       "gtree": {
         "command": "npx",
         "args": ["@epikem/gtree"]
       }
     }
   }
   ```

3. Use the `gtree` tool in your MCP client (like Cursor) to visualize directory structures

### As Standalone CLI

You can also use gtree as a standalone command-line tool:

```bash
# Install globally
npm install -g @epikem/gtree

# Or use with npx
npx @epikem/gtree [path] [options]
```

## 📖 Tool Usage

### MCP Tool: `gtree`

Generate a tree view of directory structure, respecting .gitignore patterns.

**Parameters:**

- `path` (optional): Target directory path (default: current directory)
- `maxDepth` (optional): Maximum depth to traverse (equivalent to `-L` flag)
- `showHidden` (optional): Show hidden files (equivalent to `-a` flag)
- `args` (optional): Additional tree-style arguments like `['-L', '2']` or `['-a']`

**Examples:**

```typescript
// Basic usage - current directory
gtree();

// Specific path with depth limit
gtree({ path: "./src", maxDepth: 2 });

// Show hidden files
gtree({ showHidden: true });

// Using tree-style arguments
gtree({ args: ["-L", "3", "-a"] });

// Combine parameters and args
gtree({ path: "./docs", args: ["-L", "2"] });
```

### CLI Usage

```bash
# Basic usage
gtree

# Specific directory
gtree ./src

# Limit depth to 2 levels
gtree -L 2

# Show hidden files
gtree -a

# Combine options
gtree ./src -L 3 -a
```

## 🔧 How It Works

1. **Git-aware filtering**: Reads `.gitignore` files and filters out ignored patterns
2. **Default exclusions**: Automatically excludes common files like `.git`, `.DS_Store`, `node_modules`
3. **Tree formatting**: Uses Unicode box-drawing characters for clean tree visualization
4. **Depth control**: Respects maximum depth settings to prevent overly deep trees
5. **Sorting**: Directories appear first, followed by files, both sorted alphabetically

## 🎯 Examples

### Basic directory tree:

```
src
├── core
│   ├── services
│   │   ├── gtree-service.ts
│   │   └── index.ts
│   ├── tools.ts
│   └── resources.ts
├── server
│   └── server.ts
└── index.ts
```

### With depth limit (`-L 2`):

```
src
├── core
│   ├── services
│   ├── tools.ts
│   └── resources.ts
├── server
│   └── server.ts
└── index.ts
```

## 📚 Documentation

For more information about the Model Context Protocol, visit the [MCP Documentation](https://modelcontextprotocol.io/introduction).

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
