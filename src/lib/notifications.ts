import { db } from "@/lib/db"

/**
 * Central Notification System helpers (Track 4.3).
 *
 * The `Notification` Prisma model is a per-user, persistent record surfaced
 * by the bell in the sidebar (see `src/components/shared/notifications-bell.tsx`
 * + `src/app/api/notifications/route.ts`).
 *
 * These helpers make it easy for API routes to emit notifications when
 * business events happen. The helpers take care of:
 *   - fanning out to all users who should see the notification (role-based),
 *   - simple de-duplication so the same event doesn't spam a user with N
 *     copies if the underlying event fires repeatedly.
 *
 * Notifications are created OUTSIDE any caller transaction (best-effort):
 * if the notification insert fails (e.g. DB connectivity blip), we don't
 * want to roll back the parent sale/invoice. The `try/catch` swallows the
 * error and logs it via `console.warn` — consistent with the project's
 * non-blocking-side-effect pattern in `src/lib/sale/transaction.ts`.
 */

/** Notification type tags — kept in sync with the comment on the model. */
export type NotificationType =
  | "STOCK_LOW"
  | "SALES_SPIKE"
  | "PAYMENT_DUE"
  | "SHIFT_REMINDER"
  | "SYSTEM"

export interface CreateNotificationInput {
  userId: string
  type: NotificationType
  title: string
  message: string
  /** AppView name to navigate to when clicked (e.g. "inventory"). */
  link?: string | null
}

/**
 * Create a single notification row for one user. Skips creation if there
 * is already an UNREAD notification of the same type + message for this
 * user (simple de-duplication so repeated identical events don't pile up).
 *
 * Best-effort: errors are caught + logged and never thrown.
 */
export async function createNotification(
  input: CreateNotificationInput
): Promise<void> {
  try {
    const existing = await db.notification.findFirst({
      where: {
        userId: input.userId,
        type: input.type,
        message: input.message,
        read: false,
      },
      select: { id: true },
    })
    if (existing) return

    await db.notification.create({
      data: {
        userId: input.userId,
        type: input.type,
        title: input.title,
        message: input.message,
        link: input.link ?? null,
      },
    })
  } catch (e: unknown) {
    console.warn(
      `[notifications] createNotification failed for user ${input.userId} ` +
      `(type=${input.type}): ${e instanceof Error ? e.message : String(e)}`
    )
  }
}

/**
 * Create a STOCK_LOW notification for all users who can see inventory
 * (ADMIN, MANAGER, WAREHOUSE). Called from the sale creation flow when
 * the product's aggregate quantity drops at or below its reorderLevel.
 *
 * De-duplication is per-(user, message): if a user already has an unread
 * low-stock notification for this exact product+warehouse combination,
 * we don't create a duplicate.
 */
export async function createStockLowNotification(
  productId: string,
  productName: string,
  warehouseName?: string | null
): Promise<void> {
  try {
    // Notify users who manage inventory: ADMIN, MANAGER, WAREHOUSE.
    // (OWNER is treated as ADMIN-equivalent via the role union in the
    // API route — but here we look up users with these explicit roles.)
    const targets = await db.user.findMany({
      where: { role: { in: ["ADMIN", "MANAGER", "WAREHOUSE", "OWNER"] } },
      select: { id: true },
    })

    const message = warehouseName
      ? `${productName} — مخزون منخفض في ${warehouseName}`
      : `${productName} — مخزون منخفض`

    await Promise.all(
      targets.map((u) =>
        createNotification({
          userId: u.id,
          type: "STOCK_LOW",
          title: "مخزون منخفض",
          message,
          link: "inventory",
        })
      )
    )
  } catch (e: unknown) {
    console.warn(
      `[notifications] createStockLowNotification failed for ${productId}: ` +
      `${e instanceof Error ? e.message : String(e)}`
    )
  }
}

/**
 * Create a PAYMENT_DUE notification for all users who manage payables
 * (ADMIN, MANAGER, ACCOUNTANT). Called from the purchase-invoice post
 * route when a supplier invoice becomes an actual outstanding balance
 * (status = POSTED + journal entry created).
 *
 * De-duplication is per-(user, message): if a user already has an
 * unread payment-due notification for this exact supplier+amount, we
 * don't create a duplicate.
 */
export async function createPaymentDueNotification(
  supplierId: string,
  supplierName: string,
  amount: number
): Promise<void> {
  try {
    const targets = await db.user.findMany({
      where: { role: { in: ["ADMIN", "MANAGER", "ACCOUNTANT", "OWNER"] } },
      select: { id: true },
    })

    const amountRounded = +Number(amount).toFixed(3)
    const message = `${supplierName} — دفعة مستحقة ${amountRounded} د.ك`

    await Promise.all(
      targets.map((u) =>
        createNotification({
          userId: u.id,
          type: "PAYMENT_DUE",
          title: "دفعة مستحقة",
          message,
          link: "purchases",
        })
      )
    )
  } catch (e: unknown) {
    console.warn(
      `[notifications] createPaymentDueNotification failed for ${supplierId}: ` +
      `${e instanceof Error ? e.message : String(e)}`
    )
  }
}
