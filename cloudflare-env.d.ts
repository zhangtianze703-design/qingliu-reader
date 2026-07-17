declare namespace Cloudflare {
  interface Env {
    DB: D1Database;
    MEDIA: R2Bucket;
    IMPORT_TOKEN?: string;
    AI?: {
      run(model: string, input: unknown): Promise<unknown>;
    };
  }
}
