module.exports = {
  apps: [
    // ─── Express Backend ──────────────────────────────────────────────────────
    {
      name: "pickle-backend",
      cwd: "./ecom-v1-backend",
      script: "dist/server.js",         // compiled output (tsc)
      instances: 2,                      // use both cores
      exec_mode: "cluster",
      wait_ready: true,
      listen_timeout: 10000,
      kill_timeout: 5000,
      env_production: {
        NODE_ENV: "production",
        PORT: 5000,
      },
    },

    // ─── Next.js Frontend ─────────────────────────────────────────────────────
    // MUST be fork mode (1 instance) — global.__db is in-process memory.
    // Two instances = split state, coupon conflicts.
    {
      name: "pickle-frontend",
      cwd: "./ecom-v1-frontend",
      script: "node_modules/.bin/next",
      args: "start -p 3000",
      instances: 1,
      exec_mode: "fork",
      env_production: {
        NODE_ENV: "production",
        PORT: 3000,
      },
    },
  ],
};
