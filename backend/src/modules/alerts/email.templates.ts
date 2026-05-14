import type { MarketPrice, AlertEmailData } from '@shared/types/market.types';

export const priceAlertTemplate = (
  data: AlertEmailData,
): {
  subject: string;
  html: string;
} => {
  const subject = `MarketPulse Alert: ${data.assetSymbol} is ${data.condition === 'above' ? 'above' : 'below'} $${data.targetPrice}`;

  const percentDiff = (((data.triggeredPrice - data.targetPrice) / data.targetPrice) * 100).toFixed(2);
  const directionColor = data.condition === 'above' ? '#16a34a' : '#e94560';
  const directionIcon = data.condition === 'above' ? '↑' : '↓';

  const html = `
<div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0;">

  <div style="background: #0f172a; padding: 24px 28px 20px;">
    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 4px;">
      <div style="width: 28px; height: 28px; border-radius: 6px; background: #e94560; display: flex; align-items: center; justify-content: center; font-size: 16px;">📈</div>
      <span style="font-size: 18px; font-weight: 600; color: #ffffff;">MarketPulse</span>
    </div>
    <p style="font-size: 13px; color: #94a3b8; margin: 6px 0 0 0;">Price alert triggered</p>
  </div>

  <div style="padding: 24px 28px;">

    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 20px;">
      <div style="width: 36px; height: 36px; border-radius: 50%; background: #fef3c7; display: flex; align-items: center; justify-content: center; font-size: 18px; flex-shrink: 0;">
        ${data.condition === 'above' ? '📈' : '📉'}
      </div>
      <div>
        <p style="font-size: 15px; font-weight: 600; margin: 0; color: #0f172a;">${data.assetName} crossed your target</p>
        <p style="font-size: 13px; color: #64748b; margin: 2px 0 0 0;">${data.condition === 'above' ? 'Above' : 'Below'} alert · ${data.assetSymbol}/USD</p>
      </div>
    </div>

    <div style="background: #f8fafc; border-radius: 8px; padding: 16px 20px; margin-bottom: 20px;">
      <table style="width: 100%; text-align: center; border-collapse: collapse;">
        <tr>
          <td style="padding: 0 12px 4px; font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px;">Asset</td>
          <td style="padding: 0 12px 4px; font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; border-left: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0;">Your target</td>
          <td style="padding: 0 12px 4px; font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px;">Triggered at</td>
        </tr>
        <tr>
          <td style="padding: 4px 12px 2px; font-size: 15px; font-weight: 600; color: #0f172a;">${data.assetSymbol}</td>
          <td style="padding: 4px 12px 2px; font-size: 15px; font-weight: 600; color: #0f172a; border-left: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0;">$${data.targetPrice.toLocaleString()}</td>
          <td style="padding: 4px 12px 2px; font-size: 15px; font-weight: 600; color: ${directionColor};">$${data.triggeredPrice.toLocaleString()}</td>
        </tr>
        <tr>
          <td style="padding: 2px 12px 0; font-size: 11px; color: #94a3b8;">${data.assetName}</td>
          <td style="padding: 2px 12px 0; font-size: 11px; color: #94a3b8; border-left: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0;">threshold</td>
          <td style="padding: 2px 12px 0; font-size: 11px; color: ${directionColor};">${directionIcon}${percentDiff}% ${data.condition}</td>
        </tr>
      </table>
    </div>

    <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 12px 16px; margin-bottom: 20px;">
      <p style="font-size: 13px; color: #15803d; margin: 0;">This alert has been automatically disabled. Set a new alert when you're ready.</p>
    </div>

    <a href="${process.env.CLIENT_URL}/dashboard" style="display: block; text-align: center; background: #e94560; color: #ffffff; text-decoration: none; padding: 11px 20px; border-radius: 8px; font-size: 14px; font-weight: 600;">View dashboard</a>
  </div>

  <div style="border-top: 1px solid #e2e8f0; padding: 14px 28px; display: flex; justify-content: space-between;">
    <p style="font-size: 12px; color: #94a3b8; margin: 0;">Sent by MarketPulse</p>
    <a href="${process.env.CLIENT_URL}/alerts" style="font-size: 12px; color: #94a3b8; margin: 0; text-decoration: none;">Manage alerts</a>
  </div>
</div>
`;

  return { subject, html };
};
