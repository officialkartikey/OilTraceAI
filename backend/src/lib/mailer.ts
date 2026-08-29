import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_PORT === '465', // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export const sendVerificationEmail = async (to: string, token: string) => {
  const verifyUrl = `${process.env.NEXTAUTH_URL}/api/auth/verify?token=${token}`;

  const mailOptions = {
    from: `"ARGUS System" <${process.env.SMTP_FROM || 'noreply@argus.net'}>`,
    to,
    subject: 'ARGUS System - Verify Your Analyst Credentials',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #0f172a; color: #f1f5f9; padding: 20px; border-radius: 8px;">
        <h2 style="color: #38bdf8; text-transform: uppercase; letter-spacing: 2px;">Credential Verification</h2>
        <p>You have requested access to the ARGUS Maritime Intelligence System.</p>
        <p>To verify your identity and activate your credentials, please click the secure link below:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verifyUrl}" style="background-color: #0ea5e9; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; letter-spacing: 1px;">VERIFY CREDENTIALS</a>
        </div>
        <p style="font-size: 12px; color: #94a3b8;">If you did not request this access, please ignore this communication.</p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error('Error sending email:', error);
    throw new Error('Failed to send verification email');
  }
};
