import { Router } from "express";
import { TaskStatus } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { authMiddleware } from "../middleware/auth.middleware";
import { calculateDailyPlan } from "../services/planner.service";

const router = Router();

router.use(authMiddleware);

const workdaySchema = z.object({
  weekday: z.number().int().min(0).max(6),
  enabled: z.boolean().default(true),
  startMinutes: z.number().int().min(0).max(1439),
  endMinutes: z.number().int().min(0).max(1439),
  availableMinutes: z.number().int().positive().optional()
});

router.put("/workdays/:weekday", async (req, res, next) => {
  try {
    const userId = req.userId as string;
    const weekday = Number(req.params.weekday);

    const data = workdaySchema.parse({
      ...req.body,
      weekday
    });

    if (data.endMinutes <= data.startMinutes) {
      res.status(400).json({
        message: "O horário final deve ser posterior ao horário inicial"
      });
      return;
    }

    const workday = await prisma.workday.upsert({
      where: {
        userId_weekday: {
          userId,
          weekday
        }
      },
      update: {
        enabled: data.enabled,
        startMinutes: data.startMinutes,
        endMinutes: data.endMinutes,
        availableMinutes: data.availableMinutes
      },
      create: {
        userId,
        weekday,
        enabled: data.enabled,
        startMinutes: data.startMinutes,
        endMinutes: data.endMinutes,
        availableMinutes: data.availableMinutes
      }
    });

    res.json(workday);
  } catch (error) {
    next(error);
  }
});

router.get("/workdays", async (req, res, next) => {
  try {
    const userId = req.userId as string;

    const workdays = await prisma.workday.findMany({
      where: {
        userId
      },
      orderBy: {
        weekday: "asc"
      }
    });

    res.json(workdays);
  } catch (error) {
    next(error);
  }
});

router.get("/today", async (req, res, next) => {
  try {
    const userId = req.userId as string;

    const date = req.query.date
      ? new Date(String(req.query.date))
      : new Date();

    const plan = await calculateDailyPlan(userId, date);

    res.json(plan);
  } catch (error) {
    next(error);
  }
});

router.post("/recalculate", async (req, res, next) => {
  try {
    const userId = req.userId as string;

    const date = req.body.date
      ? new Date(req.body.date)
      : new Date();

    const plan = await calculateDailyPlan(userId, date);

    res.json(plan);
  } catch (error) {
    next(error);
  }
});

router.post("/tasks/:id/complete", async (req, res, next) => {
  try {
    const userId = req.userId as string;

    const task = await prisma.task.findFirst({
      where: {
        id: req.params.id,
        userId
      }
    });

    if (!task) {
      res.status(404).json({
        message: "Tarefa não encontrada"
      });
      return;
    }

    const updatedTask = await prisma.task.update({
      where: {
        id: task.id
      },
      data: {
        status: TaskStatus.COMPLETED,
        completedAt: new Date(),
        actualMinutes: req.body.actualMinutes
      }
    });

    res.json(updatedTask);
  } catch (error) {
    next(error);
  }
});

router.post("/tasks/:id/postpone", async (req, res, next) => {
  try {
    const userId = req.userId as string;

    const postponedUntil = z.coerce.date().parse(req.body.postponedUntil);

    const task = await prisma.task.findFirst({
      where: {
        id: req.params.id,
        userId
      }
    });

    if (!task) {
      res.status(404).json({
        message: "Tarefa não encontrada"
      });
      return;
    }

    const updatedTask = await prisma.task.update({
      where: {
        id: task.id
      },
      data: {
        status: TaskStatus.POSTPONED,
        postponedUntil,
        scheduledDate: postponedUntil
      }
    });

    res.json(updatedTask);
  } catch (error) {
    next(error);
  }
});

router.post("/tasks/:id/block", async (req, res, next) => {
  try {
    const userId = req.userId as string;

    const blockedReason = z.string().min(1).parse(req.body.blockedReason);

    const task = await prisma.task.findFirst({
      where: {
        id: req.params.id,
        userId
      }
    });

    if (!task) {
      res.status(404).json({
        message: "Tarefa não encontrada"
      });
      return;
    }

    const updatedTask = await prisma.task.update({
      where: {
        id: task.id
      },
      data: {
        status: TaskStatus.BLOCKED,
        blockedReason
      }
    });

    res.json(updatedTask);
  } catch (error) {
    next(error);
  }
});

export default router;