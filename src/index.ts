#!/usr/bin/env node
/**
 * TalkToPlanB MCP server
 * ----------------------
 * Exposes TalkToPlanB's developer REST API to MCP-compatible AI assistants
 * (e.g. Claude Desktop) over stdio.
 *
 * Environment:
 *   TALKTOPLANB_API_KEY   (required)  — a "ttpb_..." key from /portal
 *   TALKTOPLANB_BASE_URL  (optional)  — defaults to https://talktoplanb.duckdns.org
 *
 * NOTE: stdout is reserved for the MCP protocol. All logging goes to stderr.
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

const BASE_URL = (process.env.TALKTOPLANB_BASE_URL || 'https://talktoplanb.duckdns.org').replace(/\/+$/, '');
const API_KEY = process.env.TALKTOPLANB_API_KEY || '';

async function apiCall(method: string, apiPath: string, body?: unknown): Promise<unknown> {
  if (!API_KEY) {
    throw new Error(`TALKTOPLANB_API_KEY is not set. Create one at ${BASE_URL}/portal`);
  }
  const res = await fetch(BASE_URL + apiPath, {
    method,
    headers: {
      'X-API-Key': API_KEY,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const raw = await res.text();
  let data: unknown;
  try {
    data = raw ? JSON.parse(raw) : {};
  } catch {
    data = { raw };
  }
  if (!res.ok) {
    throw new Error(`${method} ${apiPath} failed (HTTP ${res.status}): ${JSON.stringify(data)}`);
  }
  return data;
}

function ok(data: unknown) {
  return {
    content: [
      { type: 'text' as const, text: typeof data === 'string' ? data : JSON.stringify(data, null, 2) },
    ],
  };
}

function fail(err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  return { content: [{ type: 'text' as const, text: `Error: ${message}` }], isError: true };
}

const server = new McpServer({ name: 'talktoplanb', version: '1.0.0' });

server.tool(
  'whoami',
  'Get information about the TalkToPlanB account that owns the current API key (user id, username, scopes).',
  {},
  async () => {
    try {
      return ok(await apiCall('GET', '/api/v1/me'));
    } catch (e) {
      return fail(e);
    }
  },
);

server.tool(
  'list_rooms',
  'List the TalkToPlanB chat rooms (group chats and direct messages) the account belongs to. Returns room ids you can use with read_messages and send_message.',
  {},
  async () => {
    try {
      return ok(await apiCall('GET', '/api/v1/rooms'));
    } catch (e) {
      return fail(e);
    }
  },
);

server.tool(
  'read_messages',
  'Read recent messages in a TalkToPlanB room. Provide a roomId obtained from list_rooms.',
  {
    roomId: z.string().describe('The room ID to read messages from'),
    limit: z.number().int().min(1).max(200).optional().describe('How many recent messages to return (default 50, max 200)'),
  },
  async ({ roomId, limit }) => {
    try {
      const q = `/api/v1/messages?roomId=${encodeURIComponent(roomId)}${limit ? `&limit=${limit}` : ''}`;
      return ok(await apiCall('GET', q));
    } catch (e) {
      return fail(e);
    }
  },
);

server.tool(
  'send_message',
  'Send a TalkToPlanB message. Provide text plus EITHER roomId (an existing room from list_rooms) OR toPhone (the recipient’s phone number, which finds or creates a direct message).',
  {
    text: z.string().min(1).describe('The message text to send'),
    roomId: z.string().optional().describe('Target room ID (use this OR toPhone)'),
    toPhone: z.string().optional().describe('Recipient phone number (use this OR roomId)'),
  },
  async ({ text, roomId, toPhone }) => {
    if (!roomId && !toPhone) {
      return fail('Provide either roomId or toPhone.');
    }
    try {
      return ok(await apiCall('POST', '/api/v1/messages', { text, roomId, toPhone }));
    } catch (e) {
      return fail(e);
    }
  },
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`TalkToPlanB MCP server running on stdio. Base URL: ${BASE_URL}`);
  if (!API_KEY) {
    console.error('WARNING: TALKTOPLANB_API_KEY is not set — tool calls will fail until it is provided.');
  }
}

main().catch((err) => {
  console.error('Fatal error starting TalkToPlanB MCP server:', err);
  process.exit(1);
});
