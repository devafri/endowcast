const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const nodemailer = require('nodemailer');

// POST /api/contact
// Accepts: { name, email, subject, message }
router.post(
  '/',
  // basic validation
  body('name').trim().isLength({ min: 1 }).withMessage('Name required'),
  body('email').isEmail().withMessage('Valid email required'),
  body('subject').trim().isLength({ min: 1 }).withMessage('Subject required'),
  body('message').trim().isLength({ min: 5 }).withMessage('Message required'),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { name, email, subject, message } = req.body;

      // Store submission in DB if prisma is available
      try {
        await prisma.contactSubmission.create({
          data: { name, email, subject, message }
        });
      } catch (dbErr) {
        // If DB isn't available or migrations not run, continue and still attempt email
        console.warn('Contact: failed to store submission in DB', dbErr.message || dbErr);
      }

      // If SMTP is configured, try to send email
      if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: parseInt(process.env.SMTP_PORT || '587'),
          secure: process.env.SMTP_SECURE === 'true',
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
        });

        const mailOpts = {
          from: `${name} <${email}>`,
          to: process.env.CONTACT_EMAIL || 'support@endowcast.com',
          subject: `[Website Contact] ${subject}`,
          text: `Name: ${name}\nEmail: ${email}\n\n${message}`,
        };

        try {
          await transporter.sendMail(mailOpts);
        } catch (mailErr) {
          console.warn('Contact: failed to send mail', mailErr.message || mailErr);
          // do not fail the request if mail fails
        }
      }

      return res.json({ message: 'Contact submission received' });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
