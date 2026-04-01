import nodemailer, { Transporter } from 'nodemailer';
import { logger } from '@utils/logger';

let transporter: Transporter;

export const connectEmail = async (): Promise<void> => {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: false, // TLS
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  // Verify connection
  await transporter.verify();
  logger.info('Email service connected successfully');
};

export const getTransporter = (): Transporter => {
  if (!transporter) {
    throw new Error('Email transporter not initialized');
  }
  return transporter;
};
