import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import morgan from "morgan";
import { env } from "./config/env";
import authRoutes from "./routes/auth.routes";
import taskRoutes from "./routes/task.routes";
import routineRoutes from "./routes/routine.routes";
import planningRoutes from "./routes/planning.routes";
import reviewRoutes from "./routes/review.routes";
import { errorMiddleware } from "./middleware/error.middleware";

export const app = express();

app.use(
  cors({
    origin: env.CORS_ORIGIN,
    credentials: true
  })
);

app.use(helmet());
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (env.NODE_ENV !== "test") {
  app.use(morgan("dev"));
}

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "marketplace-daily-backend",
    timestamp: new Date().toISOString()
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/routines", routineRoutes);
app.use("/api/planning", planningRoutes);
app.use("/api/reviews", reviewRoutes);

app.use((_req, res) => {
  res.status(404).json({
    message: "Rota não encontrada"
  });
});

app.use(errorMiddleware);