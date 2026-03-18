import { describe, it, expect, vi, beforeEach } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { SvgRecord } from '@ai-ds-auditor/shared';
import type { CacheEntry } from '../cache/store.js';
import { registerGetComponentSvg } from './get-component-svg.js';

// ---------------------------------------------------------------------------
// Mock DesignSystemCache
// ---------------------------------------------------------------------------

function makeCacheEntry(svgs: SvgRecord[]): CacheEntry {
  return {
    fileKey: 'test-file-key',
    fileName: 'Test Design System',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    report: {} as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    meta: {} as any,
    svgs,
    fetchedAt: Date.now(),
  };
}

function makeMockCache(svgs: SvgRecord[]) {
  return {
    configuredFileKeys: ['test-file-key'],
    defaultFileKey: () => 'test-file-key',
    ensureLoaded: vi.fn().mockResolvedValue(makeCacheEntry(svgs)),
  };
}

// ---------------------------------------------------------------------------
// Helpers to invoke a registered MCP tool directly
// ---------------------------------------------------------------------------

type ToolHandler = (args: Record<string, unknown>) => Promise<{ content: Array<{ type: string; text: string }> }>;

function captureToolHandler(server: McpServer): ToolHandler {
  // McpServer.tool registers on a server; we capture the registered handler
  // by intercepting the internal `_registeredTools` map via cast.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tools = (server as any)._registeredTools as Map<string, { handler: ToolHandler }>;
  const handler = tools.get('get_component_svg');
  if (!handler) throw new Error('get_component_svg not registered');
  return handler.handler;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('registerGetComponentSvg', () => {
  let server: McpServer;

  beforeEach(() => {
    server = new McpServer({ name: 'test', version: '0.0.0' });
  });

  it('returns ERROR when neither componentName nor componentId is provided', async () => {
    const cache = makeMockCache([]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    registerGetComponentSvg(server, cache as any);
    const handler = captureToolHandler(server);

    const result = await handler({ fileKey: 'test-file-key' });

    expect(result.content[0]!.text).toMatch(/^ERROR:/);
    expect(result.content[0]!.text).toMatch(/componentName or componentId/);
  });

  it('returns ERROR when svgs array is empty (no SVG store injected)', async () => {
    const cache = makeMockCache([]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    registerGetComponentSvg(server, cache as any);
    const handler = captureToolHandler(server);

    const result = await handler({ fileKey: 'test-file-key', componentName: 'Button' });

    expect(result.content[0]!.text).toMatch(/^ERROR:/);
    expect(result.content[0]!.text).toMatch(/No SVG data found/);
  });

  describe('SVG-02: success path', () => {
    const svgs: SvgRecord[] = [
      {
        componentId: 'c1',
        name: 'Logo',
        viewBox: '0 0 100 40',
        svg: '<svg viewBox="0 0 100 40">...</svg>',
      },
      {
        componentId: 'c2',
        name: 'Button',
        viewBox: '0 0 120 40',
        svg: '<svg viewBox="0 0 120 40"><rect/></svg>',
      },
    ];

    it('finds component by name (case-insensitive) and returns structured JSON', async () => {
      const cache = makeMockCache(svgs);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      registerGetComponentSvg(server, cache as any);
      const handler = captureToolHandler(server);

      const result = await handler({ fileKey: 'test-file-key', componentName: 'logo' });

      expect(result.content[0]!.type).toBe('text');
      const parsed = JSON.parse(result.content[0]!.text) as Record<string, unknown>;
      expect(parsed.name).toBe('Logo');
      expect(parsed.type).toBe('COMPONENT');
      expect(parsed.componentId).toBe('c1');
      expect(parsed.viewBox).toBe('0 0 100 40');
      expect(parsed.svg).toBe('<svg viewBox="0 0 100 40">...</svg>');
    });

    it('finds component by componentId (takes precedence over name)', async () => {
      const cache = makeMockCache(svgs);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      registerGetComponentSvg(server, cache as any);
      const handler = captureToolHandler(server);

      const result = await handler({ fileKey: 'test-file-key', componentId: 'c2', componentName: 'Logo' });

      const parsed = JSON.parse(result.content[0]!.text) as Record<string, unknown>;
      expect(parsed.name).toBe('Button');
      expect(parsed.componentId).toBe('c2');
    });

    it('returns undefined viewBox when not present in SvgRecord', async () => {
      const svgsNoViewBox: SvgRecord[] = [
        { componentId: 'c3', name: 'Icon', svg: '<svg/>' },
      ];
      const cache = makeMockCache(svgsNoViewBox);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      registerGetComponentSvg(server, cache as any);
      const handler = captureToolHandler(server);

      const result = await handler({ fileKey: 'test-file-key', componentName: 'Icon' });

      const parsed = JSON.parse(result.content[0]!.text) as Record<string, unknown>;
      expect(parsed.name).toBe('Icon');
      expect(parsed.viewBox).toBeUndefined();
      expect(parsed.svg).toBe('<svg/>');
    });
  });

  describe('SVG-03: error field (non-extractable component)', () => {
    it('returns ERROR when found SvgRecord has error field', async () => {
      const svgs: SvgRecord[] = [
        { componentId: 'c2', name: 'RemoteButton', error: 'SVG export failed: Remote component' },
      ];
      const cache = makeMockCache(svgs);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      registerGetComponentSvg(server, cache as any);
      const handler = captureToolHandler(server);

      const result = await handler({ fileKey: 'test-file-key', componentName: 'RemoteButton' });

      expect(result.content[0]!.text).toMatch(/^ERROR:/);
      expect(result.content[0]!.text).toMatch(/SVG export failed: Remote component/);
    });
  });

  describe('not found', () => {
    it('returns ERROR with available component list when name not matched', async () => {
      const svgs: SvgRecord[] = [
        { componentId: 'c1', name: 'Logo', svg: '<svg/>' },
        { componentId: 'c2', name: 'Button', svg: '<svg/>' },
      ];
      const cache = makeMockCache(svgs);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      registerGetComponentSvg(server, cache as any);
      const handler = captureToolHandler(server);

      const result = await handler({ fileKey: 'test-file-key', componentName: 'Unknown' });

      expect(result.content[0]!.text).toMatch(/^ERROR: Component not found/);
      expect(result.content[0]!.text).toMatch(/Logo/);
      expect(result.content[0]!.text).toMatch(/Button/);
    });
  });
});
