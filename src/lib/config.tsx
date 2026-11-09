/**
 * Central content + SEO config for the whole app.
 * Every visible string lives here (English). Components import from this file.
 */

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const siteConfig = {
  name: "TeamNotify",
  shortName: "TeamNotify",
  description:
    "Internal notification system for teams. Admins send messages by position and workers read them in real time.",
  url: siteUrl,
  locale: "en_US",
  keywords: [
    "team notifications",
    "internal messaging",
    "worker inbox",
    "admin dashboard",
  ],
} as const;

/** Roles available in the system (stored in profiles.role). */
export const roles = ["admin", "worker"] as const;
export type Role = (typeof roles)[number];

/**
 * Positions are specific to each deployment (stored in profiles.position
 * and messages.recipient_position). Edit this list for each client.
 */
export const positions = [
  "Operator",
  "Supervisor",
  "Technician",
  "Warehouse",
  "Sales",
] as const;
export type Position = (typeof positions)[number];

/** Single source of truth for every route in the app. */
export const routes = {
  login: "/login",
  forgotPassword: "/forgot-password",
  resetPassword: "/reset-password",
  changePassword: "/change-password",
  dashboard: "/dashboard",
  inbox: "/inbox",
  noAccess: "/no-access",
  authCallback: "/api/auth/callback",
} as const;

/** Per-page SEO. The app is private, so every page is noindex. */
export const pagesMetadata = {
  login: {
    title: "Sign in",
    description: "Sign in to access your messages or the admin dashboard.",
  },
  forgotPassword: {
    title: "Forgot password",
    description: "Request a link to reset your password.",
  },
  resetPassword: {
    title: "Reset password",
    description: "Choose a new password for your account.",
  },
  changePassword: {
    title: "Change password",
    description: "Set a new password to finish activating your account.",
  },
  noAccess: {
    title: "No access",
    description: "Your account is not set up in this system.",
  },
  dashboard: {
    title: "Dashboard",
    description: "Manage workers, positions and messages.",
  },
  inbox: {
    title: "Inbox",
    description: "Read the messages sent to your position.",
  },
} as const;

export const authContent = {
  login: {
    title: "Welcome back",
    description: "Sign in with the credentials provided by your administrator.",
    emailLabel: "Email",
    emailPlaceholder: "you@company.com",
    passwordLabel: "Password",
    passwordPlaceholder: "Your password",
    submit: "Sign in",
    submitting: "Signing in...",
    forgotPassword: "Forgot your password?",
    linkError:
      "This link is invalid, expired or was already used. Request a new one and open it in the same browser.",
  },
  forgotPassword: {
    title: "Forgot your password?",
    description: "Enter your email and we will send you a reset link.",
    emailLabel: "Email",
    emailPlaceholder: "you@company.com",
    submit: "Send reset link",
    submitting: "Sending...",
    success:
      "If the email exists, you will receive a reset link shortly. Open it in this same browser.",
    resendIn: "Request another link in",
    backToLogin: "Back to sign in",
  },
  resetPassword: {
    title: "Reset your password",
    description: "Choose a new password for your account.",
    newPasswordLabel: "New password",
    confirmPasswordLabel: "Confirm password",
    submit: "Update password",
    submitting: "Updating...",
  },
  changePassword: {
    title: "Set your new password",
    description:
      "You are using a temporary password. Choose a new one to continue.",
    newPasswordLabel: "New password",
    confirmPasswordLabel: "Confirm password",
    submit: "Save and continue",
    submitting: "Saving...",
  },
  noAccess: {
    title: "No access",
    description:
      "Your account does not have a profile in this system. Contact your administrator.",
  },
  errors: {
    invalid_credentials: "Invalid email or password.",
    email_not_verified: "Your email is not verified. Contact your administrator.",
    weak_password: "Password is too weak. Use at least 8 characters.",
    same_password: "Your new password must be different from the current one.",
    session_expired: "Your session has expired. Please sign in again.",
    rate_limited: "Too many attempts. Please try again later.",
    passwordMismatch: "Passwords do not match.",
    unknown: "Something went wrong. Please try again.",
  },
  signOut: "Sign out",
} as const;

/** Maps an auth error code to a user-facing message (never leaks details). */
export function getAuthErrorMessage(code: string): string {
  const errors: Record<string, string> = authContent.errors;
  return errors[code] ?? authContent.errors.unknown;
}

export const dashboardContent = {
  header: {
    title: "Admin dashboard",
    addWorker: "Add worker",
    sendMessage: "Send message",
  },
  filters: {
    searchPlaceholder: "Search by name...",
    searchMessagesPlaceholder: "Search by description...",
    positionPlaceholder: "Filter by position",
    allPositions: "All positions",
    workersView: "Workers",
    messagesView: "Messages",
  },
  workersTable: {
    columns: {
      name: "Name",
      position: "Position",
      createdAt: "Created",
      role: "Role",
      actions: "Actions",
    },
    edit: "Edit",
    delete: "Delete",
    empty: "No workers found.",
    noPosition: "Unassigned",
    roleLabels: { admin: "Admin", worker: "Worker" },
  },
  messagesTable: {
    columns: {
      createdAt: "Created",
      description: "Description",
      position: "Position",
      actions: "Actions",
    },
    open: "Open",
    edit: "Edit",
    delete: "Delete",
    empty: "No messages sent yet.",
  },
  addWorkerModal: {
    title: "Add worker",
    description:
      "Create the account with a temporary password. The worker must change it on first sign in.",
    nameLabel: "Full name",
    namePlaceholder: "John Doe",
    emailLabel: "Email",
    emailPlaceholder: "john@company.com",
    passwordLabel: "Temporary password",
    passwordPlaceholder: "Temporary password",
    positionLabel: "Position",
    positionPlaceholder: "Select a position",
    submit: "Create worker",
    submitting: "Creating...",
    success: "Worker created successfully.",
    emailExists: "A user with this email already exists.",
    generate: "Generate",
  },
  editWorkerModal: {
    title: "Edit worker",
    description: "Change the position assigned to this worker.",
    positionLabel: "Position",
    positionPlaceholder: "Select a position",
    submit: "Save changes",
    submitting: "Saving...",
    success: "Worker updated successfully.",
  },
  deleteWorkerDialog: {
    title: "Delete worker?",
    description:
      "This will permanently delete the worker and their account. This action cannot be undone.",
    cancel: "Cancel",
    confirm: "Delete worker",
    success: "Worker deleted.",
  },
  sendMessageModal: {
    title: "Send message",
    description: "The message will be delivered to every worker in the selected position.",
    positionLabel: "Position",
    positionPlaceholder: "Select a position",
    descriptionLabel: "Short description",
    descriptionPlaceholder: "Summary shown in the list",
    contentLabel: "Message",
    contentPlaceholder: "Write your message...",
    submit: "Send message",
    submitting: "Sending...",
    success: "Message sent.",
  },
  editMessageModal: {
    title: "Edit message",
    description:
      "Change the position this message is sent to. It will be removed from the previous position's inboxes and delivered to the new one.",
    positionLabel: "Position",
    positionPlaceholder: "Select a position",
    submit: "Save changes",
    submitting: "Saving...",
    success: "Message updated.",
  },
  readMessageModal: {
    title: "Message",
    sentTo: "Sent to",
    close: "Close",
  },
  deleteMessageDialog: {
    title: "Delete message?",
    description:
      "This will remove the message for every recipient. This action cannot be undone.",
    cancel: "Cancel",
    confirm: "Delete message",
    success: "Message deleted.",
  },
} as const;

export const inboxContent = {
  header: { title: "Your messages", unreadSuffix: "unread" },
  status: { unread: "New", read: "Read" },
  empty: "You have no messages yet.",
  newMessageToast: "New message",
  detail: { close: "Close" },
} as const;

export const commonContent = {
  loading: "Loading...",
  genericError: "Something went wrong. Please try again.",
  forbidden: "You do not have permission to do this.",
  invalidInput: "Please check the fields and try again.",
} as const;