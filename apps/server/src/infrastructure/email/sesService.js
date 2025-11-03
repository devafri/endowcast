const { SESv2Client, SendEmailCommand } = require('@aws-sdk/client-sesv2');

// Support both AWS_REGION and SES_REGION for flexibility
const REGION = process.env.AWS_REGION || process.env.SES_REGION || 'us-east-1';
const sesClient = new SESv2Client({ region: REGION });

// Support both SES_FROM_EMAIL and EMAIL_FROM
const FROM_EMAIL = process.env.SES_FROM_EMAIL || process.env.EMAIL_FROM;

function hasAwsCreds() {
  return !!(
    process.env.AWS_ACCESS_KEY_ID &&
    process.env.AWS_SECRET_ACCESS_KEY
  ) || !!process.env.AWS_PROFILE;
}

/**
 * Sends an email using AWS SES.
 * @param {object} params
 * @param {string} params.to - The recipient's email address.
 * @param {string} params.subject - The email subject.
 * @param {string} params.htmlBody - The HTML body of the email.
 * @param {string} params.textBody - The plain text body of the email.
 * @returns {Promise<void>}
 */
async function sendEmail({ to, subject, htmlBody, textBody }) {
  // In dev or when credentials are missing, log instead of sending
  const devMode = process.env.NODE_ENV !== 'production' || process.env.SES_DEV_LOG === 'true';
  if (devMode && (!hasAwsCreds() || !FROM_EMAIL)) {
    console.log('\n[DEV MAIL] Email not sent via SES (using console fallback)');
    console.log(`From: ${FROM_EMAIL || '(unset)'}`);
    console.log(`To:   ${to}`);
    console.log(`Subj: ${subject}`);
    console.log(`Text: ${textBody}`);
    console.log('[END DEV MAIL]\n');
    return;
  }

  const command = new SendEmailCommand({
    FromEmailAddress: FROM_EMAIL,
    Destination: {
      ToAddresses: [to],
    },
    Content: {
      Simple: {
        Subject: {
          Data: subject,
          Charset: 'UTF-8',
        },
        Body: {
          Html: {
            Data: htmlBody,
            Charset: 'UTF-8',
          },
          Text: {
            Data: textBody,
            Charset: 'UTF-8',
          },
        },
      },
    },
  });

  try {
    await sesClient.send(command);
    console.log(`Email sent to ${to}`);
  } catch (error) {
    console.error('Failed to send email via SES:', {
      name: error.name,
      message: error.message,
      code: error.code,
      region: REGION,
    });
    if (devMode) {
      console.log('[DEV MAIL FALLBACK] Logging email since SES send failed');
      console.log(`From: ${FROM_EMAIL || '(unset)'}`);
      console.log(`To:   ${to}`);
      console.log(`Subj: ${subject}`);
      console.log(`Text: ${textBody}`);
    }
  }
}

module.exports = {
  sendEmail,
};
