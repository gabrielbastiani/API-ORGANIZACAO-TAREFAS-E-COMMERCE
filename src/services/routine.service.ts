import {
  RecurrenceFrequency,
  TaskPriority
} from "@prisma/client";
import {
  addDays,
  getDate,
  getDay,
  getMonth,
  getYear,
  isSameDay,
  startOfDay
} from "date-fns";
import { prisma } from "../lib/prisma";

type GenerateRoutineParams = {
  userId: string;
  date: Date;
};

function isRoutineDue(
  frequency: RecurrenceFrequency,
  weekdays: number[],
  targetDate: Date,
  createdAt: Date
): boolean {
  const weekday = getDay(targetDate);

  if (frequency === "DAILY") {
    return true;
  }

  if (frequency === "WEEKLY") {
    return weekdays.includes(weekday);
  }

  if (frequency === "BIWEEKLY") {
    if (!weekdays.includes(weekday)) {
      return false;
    }

    const differenceInDays = Math.floor(
      (startOfDay(targetDate).getTime() - startOfDay(createdAt).getTime()) /
        (1000 * 60 * 60 * 24)
    );

    return differenceInDays >= 0 && Math.floor(differenceInDays / 7) % 2 === 0;
  }

  if (frequency === "MONTHLY") {
    return getDate(targetDate) === getDate(createdAt);
  }

  return false;
}

export async function generateTasksFromRoutines({
  userId,
  date
}: GenerateRoutineParams): Promise<void> {
  const targetDate = startOfDay(date);

  const routines = await prisma.routine.findMany({
    where: {
      userId,
      active: true
    }
  });

  for (const routine of routines) {
    const alreadyCreated = await prisma.task.findFirst({
      where: {
        userId,
        routineId: routine.id,
        scheduledDate: targetDate
      }
    });

    if (alreadyCreated) {
      continue;
    }

    const due = isRoutineDue(
      routine.frequency,
      routine.weekdays,
      targetDate,
      routine.createdAt
    );

    if (!due) {
      continue;
    }

    await prisma.task.create({
      data: {
        userId,
        routineId: routine.id,
        title: routine.title,
        description: routine.description,
        category: routine.category,
        priority: routine.priority,
        estimatedMinutes: routine.estimatedMinutes,
        preferredStartMin: routine.preferredStartMin,
        scheduledDate: targetDate,
        status: "PENDING"
      }
    });
  }
}