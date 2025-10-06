const AWS = require('aws-sdk');
const crypto = require('crypto');

// Initialize SES
const ses = new AWS.SES({ 
  region: process.env.SES_REGION || 'us-east-1',
  apiVersion: '2010-12-01'
});

class EmailService {
  constructor() {
    this.fromEmail = process.env.EMAIL_FROM || 'noreply@endowcast.com';
  }

  async sendVerificationEmail(email, firstName, verificationToken) {
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;
    
    const htmlBody = this.getVerificationEmailTemplate(firstName, verificationUrl);
    const textBody = this.getVerificationEmailText(firstName, verificationUrl);

    const params = {
      Source: this.fromEmail,
      Destination: {
        ToAddresses: [email]
      },
      Message: {
        Subject: {
          Data: 'Verify your EndowCast account',
          Charset: 'UTF-8'
        },
        Body: {
          Html: {
            Data: htmlBody,
            Charset: 'UTF-8'
          },
          Text: {
            Data: textBody,
            Charset: 'UTF-8'
          }
        }
      }
    };

    try {
      const result = await ses.sendEmail(params).promise();
      console.log('Verification email sent:', result.MessageId);
      return { success: true, messageId: result.MessageId };
    } catch (error) {
      console.error('Failed to send verification email:', error);
      throw new Error('Failed to send verification email');
    }
  }

  async sendPasswordResetEmail(email, firstName, resetToken) {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    
    const htmlBody = this.getPasswordResetTemplate(firstName, resetUrl);
    const textBody = this.getPasswordResetText(firstName, resetUrl);

    const params = {
      Source: this.fromEmail,
      Destination: {
        ToAddresses: [email]
      },
      Message: {
        Subject: {
          Data: 'Reset your EndowCast password',
          Charset: 'UTF-8'
        },
        Body: {
          Html: {
            Data: htmlBody,
            Charset: 'UTF-8'
          },
          Text: {
            Data: textBody,
            Charset: 'UTF-8'
          }
        }
      }
    };

    try {
      const result = await ses.sendEmail(params).promise();
      console.log('Password reset email sent:', result.MessageId);
      return { success: true, messageId: result.MessageId };
    } catch (error) {
      console.error('Failed to send password reset email:', error);
      throw new Error('Failed to send password reset email');
    }
  }

  async sendWelcomeEmail(email, firstName) {
    const htmlBody = this.getWelcomeEmailTemplate(firstName);
    const textBody = this.getWelcomeEmailText(firstName);

    const params = {
      Source: this.fromEmail,
      Destination: {
        ToAddresses: [email]
      },
      Message: {
        Subject: {
          Data: 'Welcome to EndowCast! 🎉',
          Charset: 'UTF-8'
        },
        Body: {
          Html: {
            Data: htmlBody,
            Charset: 'UTF-8'
          },
          Text: {
            Data: textBody,
            Charset: 'UTF-8'
          }
        }
      }
    };

    try {
      const result = await ses.sendEmail(params).promise();
      console.log('Welcome email sent:', result.MessageId);
      return { success: true, messageId: result.MessageId };
    } catch (error) {
      console.error('Failed to send welcome email:', error);
      // Don't throw error for welcome email - it's not critical
      return { success: false, error: error.message };
    }
  }

  async sendPaymentConfirmationEmail({ email, firstName, planType, billingCycle, amount, paymentIntentId, planExpiry }) {
    const htmlBody = this.getPaymentConfirmationTemplate({
      firstName, planType, billingCycle, amount, paymentIntentId, planExpiry
    });
    const textBody = this.getPaymentConfirmationText({
      firstName, planType, billingCycle, amount, paymentIntentId, planExpiry
    });

    const params = {
      Source: this.fromEmail,
      Destination: {
        ToAddresses: [email]
      },
      Message: {
        Subject: {
          Data: `Payment Confirmed - Welcome to EndowCast ${planType}! 🎉`,
          Charset: 'UTF-8'
        },
        Body: {
          Html: {
            Data: htmlBody,
            Charset: 'UTF-8'
          },
          Text: {
            Data: textBody,
            Charset: 'UTF-8'
          }
        }
      }
    };

    try {
      const result = await ses.sendEmail(params).promise();
      console.log('Payment confirmation email sent:', result.MessageId);
      return { success: true, messageId: result.MessageId };
    } catch (error) {
      console.error('Failed to send payment confirmation email:', error);
      throw new Error('Failed to send payment confirmation email');
    }
  }

  async sendCancellationEmail({ email, firstName, planType, planExpires }) {
    const htmlBody = this.getCancellationTemplate({ firstName, planType, planExpires });
    const textBody = this.getCancellationText({ firstName, planType, planExpires });

    const params = {
      Source: this.fromEmail,
      Destination: {
        ToAddresses: [email]
      },
      Message: {
        Subject: {
          Data: 'Subscription Cancelled - EndowCast',
          Charset: 'UTF-8'
        },
        Body: {
          Html: {
            Data: htmlBody,
            Charset: 'UTF-8'
          },
          Text: {
            Data: textBody,
            Charset: 'UTF-8'
          }
        }
      }
    };

    try {
      const result = await ses.sendEmail(params).promise();
      console.log('Cancellation email sent:', result.MessageId);
      return { success: true, messageId: result.MessageId };
    } catch (error) {
      console.error('Failed to send cancellation email:', error);
      throw new Error('Failed to send cancellation email');
    }
  }

  async sendInvitationEmail({ email, inviterName, organizationName, invitationToken, role = 'USER' }) {
    const invitationUrl = `${process.env.FRONTEND_URL}/accept-invitation?token=${invitationToken}`;
    
    const htmlBody = this.getInvitationEmailTemplate({
      inviterName, organizationName, invitationUrl, role
    });
    const textBody = this.getInvitationEmailText({
      inviterName, organizationName, invitationUrl, role
    });

    const params = {
      Source: this.fromEmail,
      Destination: {
        ToAddresses: [email]
      },
      Message: {
        Subject: {
          Data: `You're invited to join ${organizationName} on EndowCast`,
          Charset: 'UTF-8'
        },
        Body: {
          Html: {
            Data: htmlBody,
            Charset: 'UTF-8'
          },
          Text: {
            Data: textBody,
            Charset: 'UTF-8'
          }
        }
      }
    };

    try {
      const result = await ses.sendEmail(params).promise();
      console.log('Invitation email sent:', result.MessageId);
      return { success: true, messageId: result.MessageId };
    } catch (error) {
      console.error('Failed to send invitation email:', error);
      throw new Error('Failed to send invitation email');
    }
  }

  generateVerificationToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  generatePasswordResetToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  getVerificationEmailTemplate(firstName, verificationUrl) {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Verify Your EndowCast Account</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .button { display: inline-block; background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }
        .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🏦 EndowCast</h1>
        <h2>Verify Your Account</h2>
    </div>
    <div class="content">
        <p>Hi ${firstName},</p>
        <p>Thank you for signing up for EndowCast! To complete your registration and start modeling your endowment scenarios, please verify your email address.</p>
        <div style="text-align: center;">
            <a href="${verificationUrl}" class="button">Verify Email Address</a>
        </div>
        <p>Or copy and paste this link in your browser:</p>
        <p style="word-break: break-all; background: #eee; padding: 10px; border-radius: 5px;">${verificationUrl}</p>
        <p><strong>This link will expire in 24 hours.</strong></p>
        <p>If you didn't create an account with EndowCast, you can safely ignore this email.</p>
        <p>Best regards,<br>The EndowCast Team</p>
    </div>
    <div class="footer">
        <p>EndowCast - Professional Endowment Modeling</p>
        <p>This is an automated message, please do not reply to this email.</p>
    </div>
</body>
</html>`;
  }

  getVerificationEmailText(firstName, verificationUrl) {
    return `
Hi ${firstName},

Thank you for signing up for EndowCast! 

To complete your registration and start modeling your endowment scenarios, please verify your email address by clicking this link:

${verificationUrl}

This link will expire in 24 hours.

If you didn't create an account with EndowCast, you can safely ignore this email.

Best regards,
The EndowCast Team

---
EndowCast - Professional Endowment Modeling
This is an automated message, please do not reply to this email.
    `;
  }

  getPasswordResetTemplate(firstName, resetUrl) {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reset Your EndowCast Password</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .button { display: inline-block; background: #e74c3c; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }
        .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; }
        .security-notice { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🔒 EndowCast</h1>
        <h2>Password Reset Request</h2>
    </div>
    <div class="content">
        <p>Hi ${firstName},</p>
        <p>We received a request to reset your EndowCast password. If you made this request, click the button below to create a new password:</p>
        <div style="text-align: center;">
            <a href="${resetUrl}" class="button">Reset Password</a>
        </div>
        <p>Or copy and paste this link in your browser:</p>
        <p style="word-break: break-all; background: #eee; padding: 10px; border-radius: 5px;">${resetUrl}</p>
        <div class="security-notice">
            <strong>⚠️ Security Notice:</strong>
            <ul>
                <li>This link will expire in 1 hour</li>
                <li>You can only use this link once</li>
                <li>If you didn't request this reset, please ignore this email</li>
            </ul>
        </div>
        <p>For security reasons, we recommend choosing a strong password that you haven't used elsewhere.</p>
        <p>Best regards,<br>The EndowCast Team</p>
    </div>
    <div class="footer">
        <p>EndowCast - Professional Endowment Modeling</p>
        <p>This is an automated message, please do not reply to this email.</p>
    </div>
</body>
</html>`;
  }

  getPasswordResetText(firstName, resetUrl) {
    return `
Hi ${firstName},

We received a request to reset your EndowCast password.

If you made this request, click this link to create a new password:
${resetUrl}

SECURITY NOTICE:
- This link will expire in 1 hour
- You can only use this link once  
- If you didn't request this reset, please ignore this email

For security reasons, we recommend choosing a strong password that you haven't used elsewhere.

Best regards,
The EndowCast Team

---
EndowCast - Professional Endowment Modeling
This is an automated message, please do not reply to this email.
    `;
  }

  getWelcomeEmailTemplate(firstName) {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to EndowCast!</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .feature-list { background: white; padding: 20px; border-radius: 5px; margin: 20px 0; }
        .feature { margin: 10px 0; padding-left: 25px; position: relative; }
        .feature:before { content: '✅'; position: absolute; left: 0; }
        .cta-button { display: inline-block; background: #27ae60; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🎉 Welcome to EndowCast!</h1>
        <h2>Your endowment modeling journey begins now</h2>
    </div>
    <div class="content">
        <p>Hi ${firstName},</p>
        <p>Congratulations! Your EndowCast account is now verified and ready to use. You now have access to professional-grade endowment modeling tools.</p>
        
        <div class="feature-list">
            <h3>🚀 What you can do with EndowCast:</h3>
            <div class="feature">Run Monte Carlo simulations with up to 10,000 scenarios</div>
            <div class="feature">Model complex asset allocation strategies</div>
            <div class="feature">Test various spending policies and shock scenarios</div>
            <div class="feature">Share scenarios with stakeholders via secure links</div>
            <div class="feature">Export detailed reports and visualizations</div>
            <div class="feature">Access historical market data and assumptions</div>
        </div>

        <div style="text-align: center;">
            <a href="${process.env.FRONTEND_URL}/simulation" class="cta-button">Start Your First Simulation</a>
        </div>

        <p><strong>💡 Pro Tip:</strong> Start with our pre-configured portfolio templates, then customize them to match your institution's investment policy.</p>

        <p>Need help getting started? Check out our <a href="${process.env.FRONTEND_URL}/instructions">Getting Started Guide</a> or reach out to our support team.</p>

        <p>Happy modeling!<br>The EndowCast Team</p>
    </div>
</body>
</html>`;
  }

  getWelcomeEmailText(firstName) {
    return `
Hi ${firstName},

Congratulations! Your EndowCast account is now verified and ready to use.

WHAT YOU CAN DO WITH ENDOWCAST:
✅ Run Monte Carlo simulations with up to 10,000 scenarios
✅ Model complex asset allocation strategies  
✅ Test various spending policies and shock scenarios
✅ Share scenarios with stakeholders via secure links
✅ Export detailed reports and visualizations
✅ Access historical market data and assumptions

Start your first simulation: ${process.env.FRONTEND_URL}/simulation

Pro Tip: Start with our pre-configured portfolio templates, then customize them to match your institution's investment policy.

Need help? Check out our Getting Started Guide: ${process.env.FRONTEND_URL}/instructions

Happy modeling!
The EndowCast Team
    `;
  }

  getPaymentConfirmationTemplate({ firstName, planType, billingCycle, amount, paymentIntentId, planExpiry }) {
    const formattedAmount = (amount / 100).toFixed(2);
    const formattedExpiry = new Date(planExpiry).toLocaleDateString();
    
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Payment Confirmed - EndowCast</title>
    <style>
        body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            line-height: 1.6; 
            color: #333333; 
            max-width: 600px; 
            margin: 0 auto; 
            padding: 20px; 
            background-color: #f8fafc;
        }
        .container { 
            background: white; 
            padding: 40px; 
            border-radius: 12px; 
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); 
        }
        .header { 
            text-align: center; 
            margin-bottom: 30px; 
            padding-bottom: 20px;
            border-bottom: 2px solid #e5e7eb;
        }
        .success-icon {
            color: #10b981;
            font-size: 48px;
            margin-bottom: 10px;
        }
        h1 { 
            color: #1f2937; 
            margin: 0 0 10px 0; 
            font-size: 28px;
        }
        .subtitle {
            color: #6b7280;
            font-size: 16px;
            margin: 0;
        }
        .payment-details {
            background: #f9fafb;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
            border-left: 4px solid #10b981;
        }
        .detail-row {
            display: flex;
            justify-content: space-between;
            margin: 8px 0;
            padding: 8px 0;
        }
        .detail-row:not(:last-child) {
            border-bottom: 1px solid #e5e7eb;
        }
        .detail-label {
            font-weight: 600;
            color: #374151;
        }
        .detail-value {
            color: #1f2937;
        }
        .amount {
            font-size: 18px;
            font-weight: bold;
            color: #10b981;
        }
        .features {
            margin: 30px 0;
        }
        .feature-list {
            list-style: none;
            padding: 0;
        }
        .feature-list li {
            padding: 8px 0;
            color: #374151;
        }
        .feature-list li:before {
            content: "✓";
            color: #10b981;
            font-weight: bold;
            margin-right: 10px;
        }
        .cta {
            text-align: center;
            margin: 30px 0;
        }
        .button {
            display: inline-block;
            background: #3b82f6;
            color: white;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
            transition: background-color 0.3s;
        }
        .button:hover {
            background: #2563eb;
        }
        .footer {
            text-align: center;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            color: #6b7280;
            font-size: 14px;
        }
        .support {
            margin-top: 20px;
            padding: 15px;
            background: #eff6ff;
            border-radius: 8px;
            text-align: center;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="success-icon">🎉</div>
            <h1>Payment Confirmed!</h1>
            <p class="subtitle">Welcome to EndowCast ${planType}</p>
        </div>

        <div class="content">
            <p>Hi ${firstName},</p>
            
            <p>Thank you for your payment! Your EndowCast ${planType} subscription is now active and ready to use.</p>

            <div class="payment-details">
                <div class="detail-row">
                    <span class="detail-label">Plan:</span>
                    <span class="detail-value">EndowCast ${planType}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Billing Cycle:</span>
                    <span class="detail-value">${billingCycle === 'monthly' ? 'Monthly' : 'Annual'}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Amount Paid:</span>
                    <span class="detail-value amount">$${formattedAmount}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Payment ID:</span>
                    <span class="detail-value">${paymentIntentId}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Plan Expires:</span>
                    <span class="detail-value">${formattedExpiry}</span>
                </div>
            </div>

            <div class="features">
                <h3>What's included in your ${planType} plan:</h3>
                <ul class="feature-list">
                    <li>Unlimited endowment simulations</li>
                    <li>Advanced Monte Carlo analysis</li>
                    <li>Professional PDF reports</li>
                    <li>Custom asset allocation modeling</li>
                    <li>Spending policy optimization</li>
                    ${planType === 'INSTITUTION' ? '<li>Multi-user access</li><li>Priority support</li><li>Custom branding options</li>' : ''}
                </ul>
            </div>

            <div class="cta">
                <a href="${process.env.CLIENT_URL}/simulation" class="button">Start Your First Simulation</a>
            </div>

            <div class="support">
                <p><strong>Need help getting started?</strong></p>
                <p>Check out our <a href="${process.env.CLIENT_URL}/instructions">simulation guide</a> or contact our support team.</p>
            </div>
        </div>

        <div class="footer">
            <p>This email confirms your payment for EndowCast. If you have any questions, please don't hesitate to contact us.</p>
            <p><strong>The EndowCast Team</strong></p>
        </div>
    </div>
</body>
</html>`;
  }

  getPaymentConfirmationText({ firstName, planType, billingCycle, amount, paymentIntentId, planExpiry }) {
    const formattedAmount = (amount / 100).toFixed(2);
    const formattedExpiry = new Date(planExpiry).toLocaleDateString();
    
    return `Payment Confirmed - Welcome to EndowCast ${planType}!

Hi ${firstName},

Thank you for your payment! Your EndowCast ${planType} subscription is now active and ready to use.

PAYMENT DETAILS:
- Plan: EndowCast ${planType}
- Billing Cycle: ${billingCycle === 'monthly' ? 'Monthly' : 'Annual'}
- Amount Paid: $${formattedAmount}
- Payment ID: ${paymentIntentId}
- Plan Expires: ${formattedExpiry}

WHAT'S INCLUDED:
✓ Unlimited endowment simulations
✓ Advanced Monte Carlo analysis
✓ Professional PDF reports
✓ Custom asset allocation modeling
✓ Spending policy optimization
${planType === 'INSTITUTION' ? '✓ Multi-user access\n✓ Priority support\n✓ Custom branding options' : ''}

Get started with your first simulation: ${process.env.CLIENT_URL}/simulation

Need help? Check out our simulation guide: ${process.env.CLIENT_URL}/instructions

Best regards,
The EndowCast Team`;
  }

  getCancellationTemplate({ firstName, planType, planExpires }) {
    const formattedExpiry = new Date(planExpires).toLocaleDateString();
    
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Subscription Cancelled - EndowCast</title>
    <style>
        body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            line-height: 1.6; 
            color: #333333; 
            max-width: 600px; 
            margin: 0 auto; 
            padding: 20px; 
            background-color: #f8fafc;
        }
        .container { 
            background: white; 
            padding: 40px; 
            border-radius: 12px; 
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); 
        }
        .header { 
            text-align: center; 
            margin-bottom: 30px; 
            padding-bottom: 20px;
            border-bottom: 2px solid #e5e7eb;
        }
        h1 { 
            color: #1f2937; 
            margin: 0 0 10px 0; 
            font-size: 28px;
        }
        .subtitle {
            color: #6b7280;
            font-size: 16px;
            margin: 0;
        }
        .cancellation-details {
            background: #fef3c7;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
            border-left: 4px solid #f59e0b;
        }
        .detail-row {
            display: flex;
            justify-content: space-between;
            margin: 8px 0;
            padding: 8px 0;
        }
        .detail-row:not(:last-child) {
            border-bottom: 1px solid #e5e7eb;
        }
        .detail-label {
            font-weight: 600;
            color: #374151;
        }
        .detail-value {
            color: #1f2937;
        }
        .important-note {
            background: #eff6ff;
            padding: 15px;
            border-radius: 8px;
            margin: 20px 0;
            border-left: 4px solid #3b82f6;
        }
        .cta {
            text-align: center;
            margin: 30px 0;
        }
        .button {
            display: inline-block;
            background: #3b82f6;
            color: white;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
            margin: 0 10px 10px 0;
        }
        .button.secondary {
            background: #6b7280;
        }
        .footer {
            text-align: center;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            color: #6b7280;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Subscription Cancelled</h1>
            <p class="subtitle">We're sorry to see you go</p>
        </div>

        <div class="content">
            <p>Hi ${firstName},</p>
            
            <p>We've processed your cancellation request for your EndowCast ${planType} subscription.</p>

            <div class="cancellation-details">
                <div class="detail-row">
                    <span class="detail-label">Cancelled Plan:</span>
                    <span class="detail-value">EndowCast ${planType}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Access Until:</span>
                    <span class="detail-value">${formattedExpiry}</span>
                </div>
            </div>

            <div class="important-note">
                <p><strong>Important:</strong> You'll continue to have full access to EndowCast until ${formattedExpiry}. After this date, your account will revert to our free tier.</p>
            </div>

            <p>We'd love to hear why you decided to cancel. Your feedback helps us improve EndowCast for everyone.</p>

            <div class="cta">
                <a href="${process.env.CLIENT_URL}/feedback?type=cancellation" class="button">Share Feedback</a>
                <a href="${process.env.CLIENT_URL}/pricing" class="button secondary">View Plans</a>
            </div>

            <p>If you change your mind, you can always resubscribe at any time. Your simulation history and settings will be preserved.</p>
        </div>

        <div class="footer">
            <p>Thank you for being part of the EndowCast community. We hope to see you again soon!</p>
            <p><strong>The EndowCast Team</strong></p>
        </div>
    </div>
</body>
</html>`;
  }

  getCancellationText({ firstName, planType, planExpires }) {
    const formattedExpiry = new Date(planExpires).toLocaleDateString();
    
    return `Subscription Cancelled - EndowCast

Hi ${firstName},

We've processed your cancellation request for your EndowCast ${planType} subscription.

CANCELLATION DETAILS:
- Cancelled Plan: EndowCast ${planType}
- Access Until: ${formattedExpiry}

IMPORTANT: You'll continue to have full access to EndowCast until ${formattedExpiry}. After this date, your account will revert to our free tier.

We'd love to hear why you decided to cancel. Your feedback helps us improve EndowCast for everyone.

Share feedback: ${process.env.CLIENT_URL}/feedback?type=cancellation
View our plans: ${process.env.CLIENT_URL}/pricing

If you change your mind, you can always resubscribe at any time. Your simulation history and settings will be preserved.

Thank you for being part of the EndowCast community. We hope to see you again soon!

Best regards,
The EndowCast Team`;
  }

  getInvitationEmailTemplate({ inviterName, organizationName, invitationUrl, role }) {
    const roleDescription = role === 'ADMIN' ? 'administrator' : 'member';
    
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Invitation to Join ${organizationName} - EndowCast</title>
    <style>
        body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            line-height: 1.6; 
            color: #333333; 
            max-width: 600px; 
            margin: 0 auto; 
            padding: 20px; 
            background-color: #f8fafc;
        }
        .container { 
            background: white; 
            padding: 40px; 
            border-radius: 12px; 
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); 
        }
        .header { 
            text-align: center; 
            margin-bottom: 30px; 
            padding-bottom: 20px;
            border-bottom: 2px solid #e5e7eb;
        }
        .invitation-icon {
            color: #3b82f6;
            font-size: 48px;
            margin-bottom: 10px;
        }
        h1 { 
            color: #1f2937; 
            margin: 0 0 10px 0; 
            font-size: 28px;
        }
        .subtitle {
            color: #6b7280;
            font-size: 16px;
            margin: 0;
        }
        .invitation-details {
            background: #eff6ff;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
            border-left: 4px solid #3b82f6;
        }
        .detail-row {
            display: flex;
            justify-content: space-between;
            margin: 8px 0;
            padding: 8px 0;
        }
        .detail-row:not(:last-child) {
            border-bottom: 1px solid #e5e7eb;
        }
        .detail-label {
            font-weight: 600;
            color: #374151;
        }
        .detail-value {
            color: #1f2937;
        }
        .role-badge {
            background: #dbeafe;
            color: #1e40af;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 14px;
            font-weight: 600;
        }
        .features {
            margin: 30px 0;
        }
        .feature-list {
            list-style: none;
            padding: 0;
        }
        .feature-list li {
            padding: 8px 0;
            color: #374151;
        }
        .feature-list li:before {
            content: "✓";
            color: #10b981;
            font-weight: bold;
            margin-right: 10px;
        }
        .cta {
            text-align: center;
            margin: 30px 0;
        }
        .button {
            display: inline-block;
            background: #3b82f6;
            color: white;
            padding: 15px 30px;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
            font-size: 16px;
        }
        .expiry-notice {
            background: #fef3c7;
            padding: 15px;
            border-radius: 8px;
            margin: 20px 0;
            border-left: 4px solid #f59e0b;
            text-align: center;
        }
        .footer {
            text-align: center;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            color: #6b7280;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="invitation-icon">📨</div>
            <h1>You're Invited!</h1>
            <p class="subtitle">Join ${organizationName} on EndowCast</p>
        </div>

        <div class="content">
            <p>Hello!</p>
            
            <p><strong>${inviterName}</strong> has invited you to join <strong>${organizationName}</strong> on EndowCast, the professional endowment modeling platform.</p>

            <div class="invitation-details">
                <div class="detail-row">
                    <span class="detail-label">Organization:</span>
                    <span class="detail-value">${organizationName}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Invited by:</span>
                    <span class="detail-value">${inviterName}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Role:</span>
                    <span class="detail-value">
                        <span class="role-badge">${roleDescription.toUpperCase()}</span>
                    </span>
                </div>
            </div>

            <div class="features">
                <h3>🚀 What you'll get access to:</h3>
                <ul class="feature-list">
                    <li>Advanced Monte Carlo endowment simulations</li>
                    <li>Professional portfolio modeling tools</li>
                    <li>Collaborative scenario planning</li>
                    <li>Detailed performance analytics</li>
                    <li>Secure data sharing with your team</li>
                    ${role === 'ADMIN' ? '<li>Organization administration privileges</li>' : ''}
                </ul>
            </div>

            <div class="cta">
                <a href="${invitationUrl}" class="button">Accept Invitation</a>
            </div>

            <div class="expiry-notice">
                <p><strong>⏰ This invitation expires in 7 days</strong></p>
                <p>Don't wait too long to join the team!</p>
            </div>

            <p>If you're new to EndowCast, you'll be guided through creating your account as part of the acceptance process.</p>

            <p>Questions about this invitation? Contact ${inviterName} or reach out to our support team.</p>
        </div>

        <div class="footer">
            <p>You received this email because ${inviterName} invited you to join ${organizationName} on EndowCast.</p>
            <p><strong>EndowCast - Professional Endowment Modeling</strong></p>
        </div>
    </div>
</body>
</html>`;
  }

  getInvitationEmailText({ inviterName, organizationName, invitationUrl, role }) {
    const roleDescription = role === 'ADMIN' ? 'administrator' : 'member';
    
    return `You're Invited to Join ${organizationName} on EndowCast!

Hello!

${inviterName} has invited you to join ${organizationName} on EndowCast, the professional endowment modeling platform.

INVITATION DETAILS:
- Organization: ${organizationName}
- Invited by: ${inviterName}
- Role: ${roleDescription.toUpperCase()}

WHAT YOU'LL GET ACCESS TO:
✓ Advanced Monte Carlo endowment simulations
✓ Professional portfolio modeling tools
✓ Collaborative scenario planning
✓ Detailed performance analytics
✓ Secure data sharing with your team
${role === 'ADMIN' ? '✓ Organization administration privileges' : ''}

Accept your invitation: ${invitationUrl}

⏰ This invitation expires in 7 days - don't wait too long to join the team!

If you're new to EndowCast, you'll be guided through creating your account as part of the acceptance process.

Questions about this invitation? Contact ${inviterName} or reach out to our support team.

---
You received this email because ${inviterName} invited you to join ${organizationName} on EndowCast.
EndowCast - Professional Endowment Modeling`;
  }
}

module.exports = new EmailService();
