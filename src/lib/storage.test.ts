import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

// Supabase mode: env is read once per test file, so set it before importing storage.
beforeAll(() => {
  process.env.DATABASE_URL ??= "file:./test.db";
  process.env.SESSION_SECRET ??= "x".repeat(40);
  process.env.SUPABASE_URL = "https://project.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-key";
  process.env.SUPABASE_BUCKET = "grace-files";
});
afterAll(() => vi.unstubAllGlobals());

describe("storage on Supabase", () => {
  it("uploads to the private bucket with the service key and the real content type", async () => {
    const fetchMock = vi.fn(async () => new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const { saveFile } = await import("./storage");
    const key = await saveFile(Buffer.from([1, 2, 3]), "jpg", "vehicles/abc");
    expect(key).toMatch(/^vehicles\/abc\/[0-9a-f-]{36}\.jpg$/);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(`https://project.supabase.co/storage/v1/object/grace-files/${key}`);
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer service-key");
    expect((init.headers as Record<string, string>)["Content-Type"]).toBe("image/jpeg");
  });

  it("reads through the authenticated endpoint, never a public URL", async () => {
    const fetchMock = vi.fn(async () => new Response(new Uint8Array([9, 8, 7]), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const { readFile } = await import("./storage");
    const bytes = await readFile("vehicles/abc/file.jpg");
    expect([...bytes]).toEqual([9, 8, 7]);
    expect((fetchMock.mock.calls[0] as unknown as [string])[0]).toBe("https://project.supabase.co/storage/v1/object/authenticated/grace-files/vehicles/abc/file.jpg");
  });

  it("refuses keys that try to leave the bucket", async () => {
    const { readFile } = await import("./storage");
    await expect(readFile("../secrets.txt")).rejects.toThrow("Invalid storage key");
    await expect(readFile("/etc/passwd")).rejects.toThrow("Invalid storage key");
  });

  it("reports a failed upload instead of pretending it worked", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("bucket not found", { status: 404 })));
    const { saveFile } = await import("./storage");
    await expect(saveFile(Buffer.from([1]), "png", "x")).rejects.toThrow("Storage upload failed (404)");
  });
});
