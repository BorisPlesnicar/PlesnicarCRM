"use client";

export const ROLE_ADMIN = "admin";
export const ROLE_VIEW_MODERATOR = "view_moderator";

export type AppRole = typeof ROLE_ADMIN | typeof ROLE_VIEW_MODERATOR | string | null;

export function isViewModerator(role: AppRole) {
  return role === ROLE_VIEW_MODERATOR;
}

export function hasWriteAccess(role: AppRole) {
  return !isViewModerator(role);
}

