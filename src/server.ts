import { app } from "./app";
import { env } from "./config/env";
import { prisma } from "./lib/prisma";

const server = app.listen(env.PORT, () => {
  console.log(
    `Marketplace Daily Backend executando em http://localhost:${env.PORT}`
  );
});

async function shutdown() {
  console.log("Encerrando servidor...");

  await prisma.$disconnect();

  server.close(() => {
    process.exit(0);
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);