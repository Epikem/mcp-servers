#!/usr/bin/env node

import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 빌드된 index.js 파일을 실행
import(join(__dirname, "..", "build", "index.js")).catch((error) => {
  console.error("Error starting MCP server:", error);
  process.exit(1);
});
