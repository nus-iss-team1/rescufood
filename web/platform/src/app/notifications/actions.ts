"use server";

import { auth } from "@/auth";
import {
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
  deleteAllNotifications,
  NotificationsApiError,
} from "@/lib/notifications";

export type MarkReadResult = {
  success: boolean;
  id?: string;
  readAt?: string;
  error?: string;
};

export async function markNotificationReadAction(
  id: string,
): Promise<MarkReadResult> {
  const session = await auth();
  const idToken = session?.idToken;
  if (!idToken) {
    return {
      success: false,
      error: "Your session has expired. Please sign in again.",
    };
  }

  const trimmedId = id?.trim();
  if (!trimmedId) {
    return { success: false, error: "Missing notification ID." };
  }

  try {
    const result = await markNotificationRead(idToken, trimmedId);
    return { success: true, id: result.id, readAt: result.readAt };
  } catch (err) {
    if (err instanceof NotificationsApiError) {
      if (err.status === 404) {
        return { success: false, error: "Notification not found." };
      }
      return { success: false, error: err.message };
    }
    return {
      success: false,
      error: "Could not reach the notifications service. Please try again.",
    };
  }
}

export async function markAllNotificationsReadAction(): Promise<{
  success: boolean;
  updated?: number;
  error?: string;
}> {
  const session = await auth();
  const idToken = session?.idToken;
  if (!idToken) {
    return {
      success: false,
      error: "Your session has expired. Please sign in again.",
    };
  }

  try {
    const result = await markAllNotificationsRead(idToken);
    return { success: true, updated: result.updated };
  } catch (err) {
    if (err instanceof NotificationsApiError) {
      return { success: false, error: err.message };
    }
    return {
      success: false,
      error: "Could not reach the notifications service. Please try again.",
    };
  }
}

export async function deleteNotificationAction(id: string): Promise<{
  success: boolean;
  id?: string;
  error?: string;
}> {
  const session = await auth();
  const idToken = session?.idToken;
  if (!idToken) {
    return {
      success: false,
      error: "Your session has expired. Please sign in again.",
    };
  }

  const trimmedId = id?.trim();
  if (!trimmedId) {
    return { success: false, error: "Missing notification ID." };
  }

  try {
    await deleteNotification(idToken, trimmedId);
    return { success: true, id: trimmedId };
  } catch (err) {
    if (err instanceof NotificationsApiError) {
      return { success: false, error: err.message };
    }
    return {
      success: false,
      error: "Could not reach the notifications service. Please try again.",
    };
  }
}

export async function deleteAllNotificationsAction(): Promise<{
  success: boolean;
  deleted?: number;
  error?: string;
}> {
  const session = await auth();
  const idToken = session?.idToken;
  if (!idToken) {
    return {
      success: false,
      error: "Your session has expired. Please sign in again.",
    };
  }

  try {
    const result = await deleteAllNotifications(idToken);
    return { success: true, deleted: result.deleted };
  } catch (err) {
    if (err instanceof NotificationsApiError) {
      return { success: false, error: err.message };
    }
    return {
      success: false,
      error: "Could not reach the notifications service. Please try again.",
    };
  }
}
