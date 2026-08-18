import crypto from 'crypto';

import bcrypt from 'bcryptjs';
import { NextFunction, Request, Response } from 'express';
import { z } from 'zod';

import { signToken } from '../lib/jwt';
import { sendAuthCode } from '../lib/mail';
import { prisma } from '../lib/prisma';
import { HttpError } from '../middleware/error';

const emailSchema = z.object({
  email: z.string().email(),
});

const verifySchema = z.object({
  email: z.string().email(),
  code: z.string().regex(/^\d{6}$/),
});

const CODE_TTL_MS = 1000 * 60 * 10;
const RESEND_COOLDOWN_MS = 1000 * 60;

export async function requestCode(req: Request, res: Response, next: NextFunction) {
  try {
    const { email } = emailSchema.parse(req.body);
    const normalizedEmail = email.trim().toLowerCase();

    const latest = await prisma.authCode.findFirst({
      where: { email: normalizedEmail },
      orderBy: { createdAt: 'desc' },
    });

    if (latest && Date.now() - latest.createdAt.getTime() < RESEND_COOLDOWN_MS) {
      throw new HttpError(429, 'Please wait before requesting another code');
    }

    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    const code = crypto.randomInt(100000, 1000000).toString();
    const codeHash = await bcrypt.hash(code, 10);

    await prisma.authCode.updateMany({
      where: { email: normalizedEmail, usedAt: null },
      data: { usedAt: new Date() },
    });

    await prisma.authCode.create({
      data: {
        email: normalizedEmail,
        codeHash,
        expiresAt: new Date(Date.now() + CODE_TTL_MS),
        userId: user?.id,
      },
    });

    await sendAuthCode(normalizedEmail, code);

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

export async function verifyCode(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, code } = verifySchema.parse(req.body);
    const normalizedEmail = email.trim().toLowerCase();

    const authCode = await prisma.authCode.findFirst({
      where: {
        email: normalizedEmail,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!authCode) {
      throw new HttpError(400, 'Invalid or expired code');
    }

    const matches = await bcrypt.compare(code, authCode.codeHash);
    if (!matches) {
      throw new HttpError(400, 'Invalid or expired code');
    }

    await prisma.authCode.update({
      where: { id: authCode.id },
      data: { usedAt: new Date() },
    });

    const user = await prisma.user.upsert({
      where: { email: normalizedEmail },
      create: { email: normalizedEmail },
      update: {},
    });

    const token = signToken({ userId: user.id, email: user.email });

    res.json({ token, user });
  } catch (err) {
    next(err);
  }
}

export async function me(req: Request, res: Response) {
  res.json({ user: req.user });
}
