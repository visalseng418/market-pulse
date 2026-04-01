import { eq, and } from 'drizzle-orm';
import { db } from '@config/database';
import { priceAlerts, alertHistory, users } from '@config/schema';
import { getTransporter } from '@config/email';
import { priceAlertTemplate } from './email.templates';
import { logger } from '@utils/logger';
import { NotFoundError, ForbiddenError } from '@utils/errors';
import type { CreateAlertBody, MarketPrice } from '@shared/types/market.types';

export const createAlert = async (userId: string, body: CreateAlertBody) => {
  const [alert] = await db
    .insert(priceAlerts)
    .values({
      userId,
      assetSymbol: body.assetSymbol,
      assetType: body.assetType,
      condition: body.condition,
      targetPrice: body.targetPrice.toString(),
    })
    .returning();

  logger.info(`Alert created for ${body.assetSymbol} by user ${userId}`);
  return alert;
};

export const getUserAlerts = async (userId: string) => {
  return db.select().from(priceAlerts).where(eq(priceAlerts.userId, userId));
};

export const deleteAlert = async (
  alertId: string,
  userId: string,
): Promise<void> => {
  const [alert] = await db
    .select()
    .from(priceAlerts)
    .where(eq(priceAlerts.id, alertId))
    .limit(1);

  if (!alert) {
    throw new NotFoundError('Alert not found');
  }

  // Users can only delete their own alerts
  if (alert.userId !== userId) {
    throw new ForbiddenError('You can only delete your own alerts');
  }

  await db.delete(priceAlerts).where(eq(priceAlerts.id, alertId));
};

// Called by price broadcaster on every price update
export const checkAndTriggerAlerts = async (
  prices: MarketPrice[],
): Promise<void> => {
  // Get all untriggered alerts
  const activeAlerts = await db
    .select({
      alert: priceAlerts,
      userName: users.name,
      userEmail: users.email,
    })
    .from(priceAlerts)
    .innerJoin(users, eq(priceAlerts.userId, users.id))
    .where(eq(priceAlerts.isTriggered, false));

  if (activeAlerts.length === 0) return;

  // Build price map for quick lookup
  const priceMap = new Map<string, MarketPrice>();
  prices.forEach((p) => priceMap.set(p.symbol, p));

  for (const { alert, userName, userEmail } of activeAlerts) {
    const currentPrice = priceMap.get(alert.assetSymbol);
    if (!currentPrice) continue;

    const targetPrice = parseFloat(alert.targetPrice.toString());
    const isTriggered =
      alert.condition === 'above'
        ? currentPrice.price >= targetPrice
        : currentPrice.price <= targetPrice;

    if (!isTriggered) continue;

    // Mark alert as triggered
    await db
      .update(priceAlerts)
      .set({
        isTriggered: true,
        triggeredAt: new Date(),
      })
      .where(eq(priceAlerts.id, alert.id));

    // Store in alert history
    await db.insert(alertHistory).values({
      alertId: alert.id,
      userId: alert.userId,
      assetSymbol: alert.assetSymbol,
      triggeredPrice: currentPrice.price.toString(),
    });

    // Send email notification
    await sendAlertEmail({
      userEmail,
      userName,
      assetSymbol: alert.assetSymbol,
      assetName: currentPrice.name,
      condition: alert.condition,
      targetPrice,
      triggeredPrice: currentPrice.price,
    });

    logger.info(
      `Alert triggered for ${alert.assetSymbol} at ${currentPrice.price} — email sent to ${userEmail}`,
    );
  }
};

const sendAlertEmail = async (data: {
  userEmail: string;
  userName: string;
  assetSymbol: string;
  assetName: string;
  condition: 'above' | 'below';
  targetPrice: number;
  triggeredPrice: number;
}): Promise<void> => {
  const { subject, html } = priceAlertTemplate({
    userName: data.userName,
    assetSymbol: data.assetSymbol,
    assetName: data.assetName,
    condition: data.condition,
    targetPrice: data.targetPrice,
    triggeredPrice: data.triggeredPrice,
  });

  await getTransporter().sendMail({
    from: process.env.SMTP_FROM,
    to: data.userEmail,
    subject,
    html,
  });
};
