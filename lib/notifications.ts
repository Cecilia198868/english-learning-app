import { randomUUID } from "node:crypto";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export type NotificationType =
  | "subscription"
  | "learning"
  | "account"
  | "system";

export type UserNotification = {
  createdAt: string;
  id: string;
  isRead: boolean;
  message: string;
  title: string;
  type: NotificationType;
  userEmail: string;
};

type NotificationRow = {
  created_at: string;
  id: string;
  is_read: boolean;
  message: string;
  title: string;
  type: NotificationType;
  user_email: string;
};

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function rowToNotification(row: NotificationRow): UserNotification {
  return {
    createdAt: row.created_at,
    id: row.id,
    isRead: row.is_read,
    message: row.message,
    title: row.title,
    type: row.type,
    userEmail: normalizeEmail(row.user_email),
  };
}

export async function createNotification(
  userEmail: string,
  title: string,
  message: string,
  type: NotificationType
) {
  const normalizedEmail = normalizeEmail(userEmail);

  if (!normalizedEmail || !title.trim() || !message.trim()) {
    throw new Error("Invalid notification");
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("notifications")
    .insert({
      created_at: new Date().toISOString(),
      id: randomUUID(),
      is_read: false,
      message: message.trim(),
      title: title.trim(),
      type,
      user_email: normalizedEmail,
    })
    .select("id, user_email, title, message, type, is_read, created_at")
    .single<NotificationRow>();

  if (error) {
    throw error;
  }

  return rowToNotification(data);
}

export async function createNotificationIfMissing(
  userEmail: string,
  title: string,
  message: string,
  type: NotificationType
) {
  const normalizedEmail = normalizeEmail(userEmail);
  const normalizedTitle = title.trim();
  const normalizedMessage = message.trim();

  if (!normalizedEmail || !normalizedTitle || !normalizedMessage) {
    throw new Error("Invalid notification");
  }

  const supabase = getSupabaseAdmin();
  const { data: existingNotification, error: existingError } = await supabase
    .from("notifications")
    .select("id, user_email, title, message, type, is_read, created_at")
    .eq("user_email", normalizedEmail)
    .eq("type", type)
    .eq("title", normalizedTitle)
    .eq("message", normalizedMessage)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<NotificationRow>();

  if (existingError) {
    throw existingError;
  }

  if (existingNotification) {
    return rowToNotification(existingNotification);
  }

  return createNotification(
    normalizedEmail,
    normalizedTitle,
    normalizedMessage,
    type
  );
}

export async function listNotificationsForUser(userEmail: string) {
  const normalizedEmail = normalizeEmail(userEmail);

  if (!normalizedEmail) {
    return [];
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("notifications")
    .select("id, user_email, title, message, type, is_read, created_at")
    .eq("user_email", normalizedEmail)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data || []).map((row) => rowToNotification(row as NotificationRow));
}

export async function markNotificationAsRead(
  userEmail: string,
  notificationId: string
) {
  const normalizedEmail = normalizeEmail(userEmail);

  if (!normalizedEmail || !notificationId.trim()) {
    return null;
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("id", notificationId.trim())
    .eq("user_email", normalizedEmail)
    .select("id, user_email, title, message, type, is_read, created_at")
    .maybeSingle<NotificationRow>();

  if (error) {
    throw error;
  }

  return data ? rowToNotification(data) : null;
}
