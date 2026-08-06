import Expo, { type ExpoPushMessage } from "expo-server-sdk";
import { prisma } from "./prisma";
import { authLogger } from "./log";

const expo = new Expo();

export type PushNotificationType =
  | "LOW_BALANCE"
  | "WEEKLY_SUMMARY"
  | "TRANSACTION_ADDED"
  | "SAVINGS_GOAL_REACHED";

interface SendPushOptions {
  userId: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  type: PushNotificationType;
}

export async function sendPushNotification({
  userId,
  title,
  body,
  data,
  type,
}: SendPushOptions) {
  try {
    await prisma.notification.create({
      data: {
        user_id: userId,
        type,
        title,
        body,
        data: data ? JSON.stringify(data) : undefined,
      },
    });

    const tokens = await prisma.pushToken.findMany({
      where: { user_id: userId },
    });

    if (tokens.length === 0) return;

    const messages: ExpoPushMessage[] = [];

    for (const { token } of tokens) {
      if (!Expo.isExpoPushToken(token)) {
        authLogger.warn({ token }, "Invalid Expo push token");
        continue;
      }

      messages.push({
        to: token,
        title,
        body,
        data: { type, ...data },
        sound: "default",
      });
    }

    const chunks = expo.chunkPushNotifications(messages);

    for (const chunk of chunks) {
      try {
        const receipts = await expo.sendPushNotificationsAsync(chunk);

        for (let i = 0; i < receipts.length; i++) {
          const receipt = receipts[i];
          if (
            receipt &&
            receipt.status === "error" &&
            receipt.details?.error === "DeviceNotRegistered"
          ) {
            const token = messages[i]?.to as string;
            await prisma.pushToken.deleteMany({ where: { token } });
            authLogger.info({ token }, "Removed invalid push token");
          }
        }
      } catch (err) {
        authLogger.error({ err }, "Failed to send push chunk");
      }
    }
  } catch (err) {
    authLogger.error({ err, userId }, "Failed to send push notification");
  }
}

export const notifyLowBalance = (
  userId: string,
  sourceName: string,
  remaining: number,
  percentage: number,
) =>
  sendPushNotification({
    userId,
    type: "LOW_BALANCE",
    title: "Low balance warning",
    body: `${sourceName} is ${percentage}% spent. ₦${remaining.toLocaleString()} remaining.`,
    data: { remaining, percentage },
  });

export const notifyTransactionAdded = (
  userId: string,
  type: "INCOME" | "EXPENSE",
  amount: number,
  sourceName: string,
) =>
  sendPushNotification({
    userId,
    type: "TRANSACTION_ADDED",
    title: type === "INCOME" ? "Income recorded" : "Expense recorded",
    body: `${sourceName} — ₦${amount.toLocaleString()}`,
    data: { amount, transaction_type: type },
  });

export const notifySavingsGoalReached = (userId: string, savingsRate: number) =>
  sendPushNotification({
    userId,
    type: "SAVINGS_GOAL_REACHED",
    title: "Savings goal reached!",
    body: `You've saved ${savingsRate}% of your income this month. Keep it up!`,
    data: { savings_rate: savingsRate },
  });

export const notifyWeeklySummary = (
  userId: string,
  income: number,
  expenses: number,
  savings: number,
) =>
  sendPushNotification({
    userId,
    type: "WEEKLY_SUMMARY",
    title: "Your weekly summary",
    body: `Income ₦${income.toLocaleString()} · Expenses ₦${expenses.toLocaleString()} · Saved ₦${savings.toLocaleString()}`,
    data: { income, expenses, savings },
  });
