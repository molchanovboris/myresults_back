import { config } from './config';

export async function sendAuthCode(email: string, code: string): Promise<void> {
  if (!config.resendApiKey) {
    console.log(`[mail] Auth code for ${email}: ${code}`);
    return;
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: config.mailFrom,
      to: [email],
      subject: 'Your My Results login code',
      text: `Your login code is ${code}. It expires in 10 minutes.`,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to send email: ${res.status} ${body}`);
  }
}
