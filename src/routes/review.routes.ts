import { Router } from "express";
import { startOfWeek, endOfWeek } from "date-fns";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

router.use(authMiddleware);

router.get("/", async (req, res, next) => {
  try {
    const userId = req.userId as string;
    const referenceDate = req.query.date
      ? new Date(String(req.query.date))
      : new Date();

    const weekStart = startOfWeek(referenceDate, {
      weekStartsOn: 1
    });

    const weekEnd = endOfWeek(referenceDate, {
      weekStartsOn: 1
    });

    const [tasks, review] = await Promise.all([
      prisma.task.findMany({
        where: {
          userId,
          OR: [
            {
              scheduledDate: {
                gte: weekStart,
                lte: weekEnd
              }
            },
            {
              completedAt: {
                gte: weekStart,
                lte: weekEnd
              }
            }
          ]
        },
        orderBy: {
          updatedAt: "desc"
        }
      }),
      prisma.weeklyReview.findUnique({
        where: {
          userId_weekStart: {
            userId,
            weekStart
          }
        }
      })
    ]);

    const completed = tasks.filter(
      (task) => task.status === "COMPLETED"
    );

    const postponed = tasks.filter(
      (task) => task.status === "POSTPONED"
    );

    const blocked = tasks.filter(
      (task) => task.status === "BLOCKED"
    );

    const pending = tasks.filter(
      (task) =>
        task.status === "PENDING" ||
        task.status === "IN_PROGRESS"
    );

    const frequentPostponements = Object.entries(
      tasks
        .filter((task) => task.status === "POSTPONED")
        .reduce<Record<string, number>>((acc, task) => {
          acc[task.title] = (acc[task.title] ?? 0) + 1;
          return acc;
        }, {})
    )
      .sort((a, b) => b[1] - a[1])
      .map(([title, count]) => ({
        title,
        count
      }));

    res.json({
      period: {
        start: weekStart,
        end: weekEnd
      },
      summary: {
        total: tasks.length,
        completed: completed.length,
        postponed: postponed.length,
        blocked: blocked.length,
        pending: pending.length,
        completionRate: tasks.length
          ? Math.round((completed.length / tasks.length) * 100)
          : 0
      },
      frequentPostponements,
      tasks,
      review
    });
  } catch (error) {
    next(error);
  }
});

const reviewSchema = z.object({
  weekStart: z.coerce.date(),
  notes: z.string().optional(),
  obstacles: z.string().optional(),
  nextWeekObjectives: z.string().optional()
});

router.put("/", async (req, res, next) => {
  try {
    const userId = req.userId as string;
    const data = reviewSchema.parse(req.body);

    const weekEnd = endOfWeek(data.weekStart, {
      weekStartsOn: 1
    });

    const review = await prisma.weeklyReview.upsert({
      where: {
        userId_weekStart: {
          userId,
          weekStart: startOfWeek(data.weekStart, {
            weekStartsOn: 1
          })
        }
      },
      update: {
        notes: data.notes,
        obstacles: data.obstacles,
        nextWeekObjectives: data.nextWeekObjectives,
        weekEnd
      },
      create: {
        userId,
        weekStart: startOfWeek(data.weekStart, {
          weekStartsOn: 1
        }),
        weekEnd,
        notes: data.notes,
        obstacles: data.obstacles,
        nextWeekObjectives: data.nextWeekObjectives
      }
    });

    res.json(review);
  } catch (error) {
    next(error);
  }
});

export default router;