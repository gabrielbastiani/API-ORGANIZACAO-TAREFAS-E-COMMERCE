import {
  Prisma,
  Task,
  TaskPriority,
  TaskStatus
} from "@prisma/client";
import {
  differenceInCalendarDays,
  endOfDay,
  isBefore,
  startOfDay
} from "date-fns";
import { prisma } from "../lib/prisma";
import { generateTasksFromRoutines } from "./routine.service";

type TaskWithRelations = Task & {
  routine: {
    frequency: string;
  } | null;
};

function priorityValue(priority: TaskPriority): number {
  if (priority === "CRITICAL") return 40;
  if (priority === "HIGH") return 30;
  if (priority === "MEDIUM") return 20;
  return 10;
}

function calculateTaskScore(
  task: TaskWithRelations,
  now: Date
): {
  score: number;
  reason: string;
} {
  let score = priorityValue(task.priority);
  const reasons: string[] = [];

  if (task.priority === "CRITICAL" || task.priority === "HIGH") {
    reasons.push("prioridade definida como alta");
  }

  if (task.dueAt) {
    const daysUntilDue = differenceInCalendarDays(task.dueAt, now);

    if (daysUntilDue < 0) {
      score += 50;
      reasons.push("prazo atrasado");
    } else if (daysUntilDue === 0) {
      score += 40;
      reasons.push("vence hoje");
    } else if (daysUntilDue === 1) {
      score += 25;
      reasons.push("vence amanhã");
    }
  }

  if (task.status === "BLOCKED") {
    score -= 20;
    reasons.push("está bloqueada");
  }

  if (task.status === "POSTPONED") {
    score += 15;
    reasons.push("foi adiada anteriormente");
  }

  if (task.routine?.frequency === "DAILY") {
    score += 10;
    reasons.push("faz parte da rotina diária");
  }

  if (task.routine?.frequency === "WEEKLY") {
    score += 5;
    reasons.push("faz parte da rotina semanal");
  }

  if (task.category === "expedicao" || task.category === "atendimento") {
    score += 12;
    reasons.push("impacta diretamente a operação");
  }

  if (reasons.length === 0) {
    reasons.push("atividade planejada para o período");
  }

  return {
    score,
    reason: reasons.join("; ")
  };
}

export async function calculateDailyPlan(
  userId: string,
  date: Date
) {
  await generateTasksFromRoutines({
    userId,
    date
  });

  const dayStart = startOfDay(date);
  const dayEnd = endOfDay(date);

  const tasks = await prisma.task.findMany({
    where: {
      userId,
      OR: [
        {
          scheduledDate: {
            gte: dayStart,
            lte: dayEnd
          }
        },
        {
          status: {
            in: ["PENDING", "POSTPONED", "BLOCKED"]
          },
          dueAt: {
            lte: dayEnd
          }
        }
      ]
    },
    include: {
      routine: {
        select: {
          frequency: true
        }
      }
    }
  });

  const scoredTasks = tasks.map((task) => {
    const result = calculateTaskScore(task, new Date());

    return {
      task,
      score: result.score,
      reason: result.reason
    };
  });

  scoredTasks.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }

    return a.task.estimatedMinutes - b.task.estimatedMinutes;
  });

  for (let index = 0; index < scoredTasks.length; index++) {
    const item = scoredTasks[index];

    await prisma.task.update({
      where: {
        id: item.task.id
      },
      data: {
        priorityScore: item.score,
        priorityReason: item.reason,
        position: index
      }
    });
  }

  const workday = await prisma.workday.findFirst({
    where: {
      userId,
      weekday: date.getDay(),
      enabled: true
    }
  });

  const totalAvailableMinutes = workday
    ? workday.availableMinutes ??
      Math.max(0, workday.endMinutes - workday.startMinutes)
    : 0;

  const plannedMinutes = scoredTasks.reduce(
    (total, item) => total + item.task.estimatedMinutes,
    0
  );

  const orderedTasks = scoredTasks.map((item) => ({
    ...item.task,
    priorityScore: item.score,
    priorityReason: item.reason
  }));

  return {
    date: dayStart,
    workday,
    tasks: orderedTasks,
    summary: {
      planned: orderedTasks.length,
      completed: orderedTasks.filter(
        (task) => task.status === TaskStatus.COMPLETED
      ).length,
      pending: orderedTasks.filter(
        (task) => task.status !== TaskStatus.COMPLETED
      ).length,
      plannedMinutes,
      availableMinutes: totalAvailableMinutes,
      remainingMinutes: Math.max(
        0,
        totalAvailableMinutes - plannedMinutes
      ),
      overloaded: plannedMinutes > totalAvailableMinutes
    }
  };
}