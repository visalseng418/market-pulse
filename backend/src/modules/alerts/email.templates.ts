import type { MarketPrice, AlertEmailData } from '@shared/types/market.types';

export const priceAlertTemplate = (
  data: AlertEmailData,
): {
  subject: string;
  html: string;
} => {
  const direction = data.condition === 'above' ? '📈 Above' : '📉 Below';
  const subject = `MarketPulse Alert: ${data.assetSymbol} is ${direction} $${data.targetPrice}`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #1a1a2e; padding: 20px; border-radius: 8px 8px 0 0;">
        <h1 style="color: #e94560; margin: 0;">MarketPulse</h1>
        <p style="color: #a8a8b3; margin: 5px 0 0 0;">Price Alert Triggered</p>
      </div>

      <div style="background: #16213e; padding: 30px; border-radius: 0 0 8px 8px;">
        <h2 style="color: #ffffff;">
          ${direction} Target: ${data.assetSymbol}
        </h2>

        <div style="background: #0f3460; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <table style="width: 100%; color: #ffffff;">
            <tr>
              <td style="padding: 8px 0; color: #a8a8b3;">Asset</td>
              <td style="padding: 8px 0; font-weight: bold;">
                ${data.assetName} (${data.assetSymbol})
              </td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #a8a8b3;">Your Target</td>
              <td style="padding: 8px 0; font-weight: bold;">
                $${data.targetPrice.toLocaleString()}
              </td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #a8a8b3;">Triggered At</td>
              <td style="padding: 8px 0; font-weight: bold; color: #e94560;">
                $${data.triggeredPrice.toLocaleString()}
              </td>
            </tr>
          </table>
        </div>

        <p style="color: #a8a8b3; font-size: 12px; margin-top: 30px;">
          This alert has been automatically disabled. 
          Log in to MarketPulse to set a new alert.
        </p>
      </div>
    </div>
  `;

  return { subject, html };
};
