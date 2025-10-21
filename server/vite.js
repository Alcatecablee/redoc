import fs from "fs";
import path from "path";
import { createServer as createViteServer } from "vite";
export async function setupVite(app, server) {
    const vite = await createViteServer({
        server: {
            middlewareMode: true,
            hmr: { server },
        },
        appType: "custom",
    });
    app.use(vite.middlewares);
    app.use(async (req, res, next) => {
        const url = req.originalUrl;
        // Skip API routes
        if (url.startsWith("/api")) {
            return next();
        }
        // Only handle GET requests for HTML
        if (req.method !== "GET") {
            return next();
        }
        try {
            let template = fs.readFileSync(path.resolve("index.html"), "utf-8");
            template = await vite.transformIndexHtml(url, template);
            res.status(200).set({ "Content-Type": "text/html" }).end(template);
        }
        catch (e) {
            vite.ssrFixStacktrace(e);
            next(e);
        }
    });
}
