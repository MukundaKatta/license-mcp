#!/usr/bin/env node
/**
 * license MCP server. Two tools: `lookup`, `search`.
 *
 * SPDX license metadata: identifier, full name, OSI-approved flag,
 * deprecated flag. Backed by `spdx-license-list/full` so the data set is
 * the official SPDX list.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import LICENSES from 'spdx-license-list/full.js';

const VERSION = '0.1.0';

const DATA: Record<string, { name: string; osiApproved?: boolean; url?: string; licenseText?: string }> = LICENSES as never;

export interface LicenseInfo {
  id: string;
  name: string;
  osi_approved: boolean;
  url?: string;
}

export function lookup(id: string): LicenseInfo | null {
  // Case-insensitive lookup (SPDX IDs are case-sensitive by spec, but
  // pragmatic input often varies). Treat missing/invalid input as not-found
  // rather than throwing, matching the documented "returns null if unknown".
  if (typeof id !== 'string' || id.length === 0) return null;
  const exact = DATA[id];
  if (exact) {
    return { id, name: exact.name, osi_approved: !!exact.osiApproved, url: exact.url };
  }
  const lower = id.toLowerCase();
  for (const key of Object.keys(DATA)) {
    if (key.toLowerCase() === lower) {
      const v = DATA[key];
      return { id: key, name: v.name, osi_approved: !!v.osiApproved, url: v.url };
    }
  }
  return null;
}

export function search(query: string, limit: number = 25): LicenseInfo[] {
  // Treat missing/invalid input as no matches rather than throwing.
  if (typeof query !== 'string' || query.length === 0) return [];
  const q = query.toLowerCase();
  // Collect all matches, then sort so exact id match ranks first, then id
  // prefix, then id substring, then name substring. Keeps "MIT" → MIT at top.
  const matches: { info: LicenseInfo; rank: number }[] = [];
  for (const [id, v] of Object.entries(DATA)) {
    const idLower = id.toLowerCase();
    const nameLower = v.name.toLowerCase();
    let rank = -1;
    if (idLower === q) rank = 0;
    else if (idLower.startsWith(q)) rank = 1;
    else if (idLower.includes(q)) rank = 2;
    else if (nameLower.includes(q)) rank = 3;
    if (rank >= 0) {
      matches.push({ info: { id, name: v.name, osi_approved: !!v.osiApproved, url: v.url }, rank });
    }
  }
  matches.sort((a, b) => a.rank - b.rank || a.info.id.localeCompare(b.info.id));
  // Guard against invalid limits (NaN, <=0, non-integer) so the slice stays sane.
  const safeLimit = Number.isFinite(limit) && limit >= 1 ? Math.floor(limit) : 25;
  return matches.slice(0, safeLimit).map((m) => m.info);
}

const server = new Server({ name: 'license', version: VERSION }, { capabilities: { tools: {} } });

const TOOLS = [
  {
    name: 'lookup',
    description: 'Look up an SPDX license identifier. Returns name, OSI-approved flag, reference URL.',
    inputSchema: {
      type: 'object',
      properties: { id: { type: 'string', description: 'SPDX id, e.g. "MIT", "Apache-2.0".' } },
      required: ['id'],
    },
  },
  {
    name: 'search',
    description: 'Search SPDX licenses by id or name. Returns up to `limit` matches.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string' },
        limit: { type: 'integer', default: 25, minimum: 1, maximum: 200 },
      },
      required: ['query'],
    },
  },
] as const;

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { name, arguments: args } = req.params;
  try {
    if (name === 'lookup') {
      const a = args as unknown as { id: string };
      const r = lookup(a.id);
      return jsonResult(r ?? { id: a.id, found: false });
    }
    if (name === 'search') {
      const a = args as unknown as { query: string; limit?: number };
      return jsonResult({ matches: search(a.query, a.limit ?? 25) });
    }
    return errorResult('unknown tool: ' + name);
  } catch (err) {
    return errorResult('license failed: ' + (err as Error).message);
  }
});

function jsonResult(value: unknown) {
  return { content: [{ type: 'text', text: JSON.stringify(value, null, 2) }] };
}
function errorResult(message: string) {
  return { isError: true, content: [{ type: 'text', text: message }] };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  process.stderr.write(`license MCP server v${VERSION} ready on stdio\n`);
}
