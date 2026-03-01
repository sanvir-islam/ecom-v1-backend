# ecom-v1-backend

<!-- creating the folder structure -->
mkdir -p src/{config,lib,middleware,modules/{auth,user,product,order},jobs}
touch src/config/env.ts
touch src/config/db.ts
touch src/lib/{jwt.ts,bcrypt.ts,resend.ts}
touch src/middleware/{requireAuth.ts,rateLimiter.ts,errorHandler.ts}
touch src/modules/auth/{auth.controller.ts,auth.service.ts,auth.schema.ts,auth.routes.ts}
touch src/jobs/email.worker.ts
touch src/server.ts