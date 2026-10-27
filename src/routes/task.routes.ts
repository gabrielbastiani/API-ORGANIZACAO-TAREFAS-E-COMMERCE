import { Router } from "express";
import { TaskPriority, TaskStatus } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

router.use(authMiddleware);

const createTaskSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  category: z.string().optional(),
  priority: z.nativeEnum(TaskPriority).default(TaskPriority.MEDIUM),
  estimatedMinutes: z.number().int().positive().default(30),
  scheduledDate: z.coerce.date().optional(),
  dueAt: z.coerce.date().optional(),
  preferredStartMin: z.number().int().min(0).max(1439).optional(),
  checklistId: z.string().optional()
});

router.post("/", async (req, res, next) => {
  try {
    const userId = req.userId as string;
    const data = createTaskSchema.parse(req.body);

    const task = await prisma.task.create({
      data: {
        userId,
        title: data.title,
        description: data.description,
        category: data.category,
        priority: data.priority,
        estimatedMinutes: data.estimatedMinutes,
        scheduledDate: data.scheduledDate,
        dueAt: data.dueAt,
        preferredStartMin: data.preferredStartMin,
        checklistId: data.checklistId
      }
    });

    res.status(201).json(task);
  } catch (error) {
    next(error);
  }
});

router.get("/", async (req, res, next) => {
  try {
    const userId = req.userId as string;

    const status = req.query.status as TaskStatus | undefined;
    const date = req.query.date
      ? new Date(String(req.query.date))
      : undefined;

    const tasks = await prisma.task.findMany({
      where: {
        userId,
        ...(status ? { status } : {}),
        ...(date
          ? {
              scheduledDate: {
                gte: new Date(date.setHours(0, 0, 0, 0)),
                lt: new Date(date.setHours(24, 0, 0, 0))
              }
            }
          : {})
      },
      orderBy: [
        {
          position: "asc"
        },
        {
          priorityScore: "desc"
        },
        {
          createdAt: "asc"
        }
      ]
    });

    res.json(tasks);
  } catch (error) {
    next(error);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const userId = req.userId as string;

    const task = await prisma.task.findFirst({
      where: {
        id: req.params.id,
        userId
      },
      include: {
        checklist: {
          include: {
            items: {
              orderBy: {
                position: "asc"
              }
            }
          }
        }
      }
    });

    if (!task) {
      res.status(404).json({
        message: "Tarefa não encontrada"
      });
      return;
    }

    res.json(task);
  } catch (error) {
    next(error);
  }
});

const updateTaskSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  priority: z.nativeEnum(TaskPriority).optional(),
  status: z.nativeEnum(TaskStatus).optional(),
  estimatedMinutes: z.number().int().positive().optional(),
  actualMinutes: z.number().int().nonnegative().optional(),
  scheduledDate: z.coerce.date().nullable().optional(),
  dueAt: z.coerce.date().nullable().optional(),
  postponedUntil: z.coerce.date().nullable().optional(),
  blockedReason: z.string().nullable().optional(),
  preferredStartMin: z.number().int().min(0).max(1439).nullable().optional(),
  position: z.number().int().nonnegative().optional()
});

router.patch("/:id", async (req, res, next) => {
  try {
    const userId = req.userId as string;
    const data = updateTaskSchema.parse(req.body);

    const existingTask = await prisma.task.findFirst({
      where: {
        id: req.params.id,
        userId
      }
    });

    if (!existingTask) {
      res.status(404).json({
        message: "Tarefa não encontrada"
      });
      return;
    }

    const updateData: Record<string, unknown> = {
      ...data
    };

    if (data.status === TaskStatus.COMPLETED) {
      updateData.completedAt = new Date();
    }

    if (data.status && data.status !== TaskStatus.COMPLETED) {
      updateData.completedAt = null;
    }

    const task = await prisma.task.update({
      where: {
        id: req.params.id
      },
      data: updateData
    });

    res.json(task);
  } catch (error) {
    next(error);
  }
});

router.delete("/:id", async (req, res, next) => {
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

    await prisma.task.delete({
      where: {
        id: task.id
      }
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;