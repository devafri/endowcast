const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../../auth/middleware/auth');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Create and send a one-time invoice (root POST route)
router.post('/', authenticateToken, async (req, res) => {
  const { 
    lineItems, 
    description, 
    dueDate, 
    sendEmail = true 
  } = req.body;

  try {
    if (!lineItems || lineItems.length === 0) {
      return res.status(400).json({ error: 'Line items are required' });
    }

    // Get organization and subscription details
    const organization = await prisma.organization.findUnique({
      where: { id: req.user.organizationId },
      include: { subscription: true }
    });

    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    // Get or create Stripe customer
    let customer;
    try {
      if (organization.subscription?.stripeCustomerId) {
        try {
          customer = await stripe.customers.retrieve(organization.subscription.stripeCustomerId);
        } catch (retrieveError) {
          console.log('Customer not found, creating new one');
          customer = null;
        }
      }
      
      if (!customer) {
        customer = await stripe.customers.create({
          name: organization.name,
          email: organization.contactEmail,
          metadata: {
            organizationId: req.user.organizationId.toString()
          }
        });

        // Update subscription with Stripe customer ID
        if (organization.subscription) {
          await prisma.subscription.update({
            where: { id: organization.subscription.id },
            data: { stripeCustomerId: customer.id }
          });
        } else {
          // Create subscription if it doesn't exist
          await prisma.subscription.create({
            data: {
              organizationId: req.user.organizationId,
              stripeCustomerId: customer.id,
              planType: 'FREE'
            }
          });
        }
      }
    } catch (stripeError) {
      console.error('Stripe customer error:', stripeError);
      return res.status(500).json({ 
        error: 'Failed to create/retrieve customer',
        details: stripeError.message 
      });
    }

    // Create invoice
    const invoiceParams = {
      customer: customer.id,
      description: description || `Invoice for ${organization.name}`,
      collection_method: 'send_invoice', // Required for due_date
      auto_advance: false, // Don't auto-finalize for send_invoice
      metadata: {
        organizationId: req.user.organizationId,
        createdBy: req.user.id
      }
    };

    // Set due_date for send_invoice collection method
    if (dueDate) {
      invoiceParams.due_date = Math.floor(new Date(dueDate).getTime() / 1000);
    }

    const invoice = await stripe.invoices.create(invoiceParams);

    // Add line items to the invoice
    for (const item of lineItems) {
      await stripe.invoiceItems.create({
        customer: customer.id,
        invoice: invoice.id,
        amount: Math.round(item.amount * 100 * (item.quantity || 1)), // Total amount in cents
        currency: item.currency || 'usd',
        description: `${item.description}${item.quantity > 1 ? ` (${item.quantity}x)` : ''}`
      });
    }

    // Finalize and send the invoice
    const finalizedInvoice = await stripe.invoices.finalizeInvoice(invoice.id);
    
    if (sendEmail) {
      await stripe.invoices.sendInvoice(finalizedInvoice.id);
    }

    // Store invoice record in database
    const invoiceRecord = await prisma.invoice.create({
      data: {
        organizationId: req.user.organizationId,
        stripeInvoiceId: invoice.id,
        amount: lineItems.reduce((sum, item) => sum + (item.amount * (item.quantity || 1)), 0),
        currency: lineItems[0]?.currency || 'usd',
        description: description || `Invoice for ${organization.name}`,
        status: finalizedInvoice.status,
        dueDate: dueDate ? new Date(dueDate) : null,
        createdBy: req.user.id
      }
    });

    res.json({
      success: true,
      invoice: {
        id: invoiceRecord.id,
        stripeInvoiceId: invoice.id,
        hostedInvoiceUrl: finalizedInvoice.hosted_invoice_url,
        invoicePdf: finalizedInvoice.invoice_pdf,
        status: finalizedInvoice.status,
        amount: invoiceRecord.amount,
        currency: invoiceRecord.currency,
        description: invoiceRecord.description,
        dueDate: invoiceRecord.dueDate,
        createdAt: invoiceRecord.createdAt
      }
    });

  } catch (error) {
    console.error('Invoice creation error:', error);
    res.status(500).json({ 
      error: 'Failed to create invoice',
      details: error.message 
    });
  }
});

// Create and send a one-time invoice (alternative endpoint)
router.post('/create-invoice', authenticateToken, async (req, res) => {
  const { 
    lineItems, 
    description, 
    dueDate, 
    autoAdvance = true,
    sendEmail = true 
  } = req.body;

  if (!process.env.STRIPE_SECRET_KEY) {
    return res.status(500).json({ error: 'Stripe not configured on this server' });
  }

  try {
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

    // Get or create Stripe customer for the organization
    let customer;
    const organization = await prisma.organization.findUnique({
      where: { id: req.user.organizationId },
      include: { subscription: true }
    });

    if (organization.subscription?.stripeCustomerId) {
      customer = await stripe.customers.retrieve(organization.subscription.stripeCustomerId);
    } else {
      // Create new customer
      customer = await stripe.customers.create({
        email: req.user.email,
        name: organization.name,
        metadata: {
          organizationId: req.user.organizationId,
          userId: req.user.id
        }
      });

      // Update subscription record with customer ID
      if (organization.subscription) {
        await prisma.subscription.update({
          where: { organizationId: req.user.organizationId },
          data: { stripeCustomerId: customer.id }
        });
      }
    }

    // Create invoice
    const invoiceParams = {
      customer: customer.id,
      description: description || `Invoice for ${organization.name}`,
      collection_method: 'send_invoice', // Required for due_date
      auto_advance: false, // Don't auto-finalize for send_invoice
      metadata: {
        organizationId: req.user.organizationId,
        createdBy: req.user.id
      }
    };

    // Set due_date for send_invoice collection method
    if (dueDate) {
      invoiceParams.due_date = Math.floor(new Date(dueDate).getTime() / 1000);
    }

    const invoice = await stripe.invoices.create(invoiceParams);

    // Add line items to invoice
    for (const item of lineItems) {
      const totalAmount = item.amount * (item.quantity || 1);
      await stripe.invoiceItems.create({
        customer: customer.id,
        invoice: invoice.id,
        amount: Math.round(totalAmount * 100), // Convert to cents
        currency: item.currency || 'usd',
        description: `${item.description}${item.quantity > 1 ? ` (${item.quantity}x)` : ''}`
      });
    }

    // Finalize and send the invoice
    const finalizedInvoice = await stripe.invoices.finalizeInvoice(invoice.id);
    
    if (sendEmail) {
      await stripe.invoices.sendInvoice(finalizedInvoice.id);
    }

    // Store invoice record in database
    const invoiceRecord = await prisma.invoice.create({
      data: {
        organizationId: req.user.organizationId,
        stripeInvoiceId: invoice.id,
        amount: lineItems.reduce((sum, item) => sum + (item.amount * (item.quantity || 1)), 0),
        currency: lineItems[0]?.currency || 'usd',
        description: description || `Invoice for ${organization.name}`,
        status: finalizedInvoice.status,
        dueDate: dueDate ? new Date(dueDate) : null,
        createdBy: req.user.id
      }
    });

    res.json({
      success: true,
      invoice: {
        id: invoiceRecord.id,
        stripeInvoiceId: invoice.id,
        hostedInvoiceUrl: finalizedInvoice.hosted_invoice_url,
        invoicePdf: finalizedInvoice.invoice_pdf,
        status: finalizedInvoice.status,
        amount: invoiceRecord.amount,
        currency: invoiceRecord.currency,
        description: invoiceRecord.description,
        dueDate: invoiceRecord.dueDate,
        createdAt: invoiceRecord.createdAt
      }
    });

  } catch (error) {
    console.error('Invoice creation error:', error);
    res.status(500).json({ 
      error: 'Failed to create invoice',
      details: error.message 
    });
  }
});

// Get organization invoices
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    
    const where = {
      organizationId: req.user.organizationId,
      ...(status && { status })
    };

    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: parseInt(limit),
        include: {
          creator: {
            select: {
              firstName: true,
              lastName: true,
              email: true
            }
          }
        }
      }),
      prisma.invoice.count({ where })
    ]);

    res.json({
      invoices,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get invoices error:', error);
    res.status(500).json({ error: 'Failed to get invoices' });
  }
});

// Get specific invoice details
router.get('/:invoiceId', authenticateToken, async (req, res) => {
  try {
    const { invoiceId } = req.params;

    const invoice = await prisma.invoice.findFirst({
      where: {
        id: invoiceId,
        organizationId: req.user.organizationId
      },
      include: {
        creator: {
          select: {
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    // Get detailed info from Stripe
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    const stripeInvoice = await stripe.invoices.retrieve(invoice.stripeInvoiceId, {
      expand: ['lines']
    });

    res.json({
      invoice: {
        ...invoice,
        stripeDetails: {
          hostedInvoiceUrl: stripeInvoice.hosted_invoice_url,
          invoicePdf: stripeInvoice.invoice_pdf,
          status: stripeInvoice.status,
          amountPaid: stripeInvoice.amount_paid / 100,
          amountDue: stripeInvoice.amount_due / 100,
          lines: stripeInvoice.lines.data.map(line => ({
            description: line.description,
            amount: line.amount / 100,
            quantity: line.quantity,
            currency: line.currency
          }))
        }
      }
    });

  } catch (error) {
    console.error('Get invoice error:', error);
    res.status(500).json({ error: 'Failed to get invoice details' });
  }
});

// Resend invoice email
router.post('/:invoiceId/resend', authenticateToken, async (req, res) => {
  try {
    const { invoiceId } = req.params;

    const invoice = await prisma.invoice.findFirst({
      where: {
        id: invoiceId,
        organizationId: req.user.organizationId
      }
    });

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    await stripe.invoices.sendInvoice(invoice.stripeInvoiceId);

    res.json({ 
      success: true, 
      message: 'Invoice email sent successfully' 
    });

  } catch (error) {
    console.error('Resend invoice error:', error);
    res.status(500).json({ error: 'Failed to resend invoice' });
  }
});

// Mark invoice as paid (for manual payments)
router.post('/:invoiceId/mark-paid', authenticateToken, async (req, res) => {
  try {
    const { invoiceId } = req.params;

    const invoice = await prisma.invoice.findFirst({
      where: {
        id: invoiceId,
        organizationId: req.user.organizationId
      }
    });

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    const stripeInvoice = await stripe.invoices.pay(invoice.stripeInvoiceId, {
      paid_out_of_band: true
    });

    // Update local invoice status
    const updatedInvoice = await prisma.invoice.update({
      where: { id: invoiceId },
      data: { status: 'paid' }
    });

    res.json({
      success: true,
      invoice: updatedInvoice
    });

  } catch (error) {
    console.error('Mark invoice paid error:', error);
    res.status(500).json({ error: 'Failed to mark invoice as paid' });
  }
});

// Cancel/void invoice
router.post('/:invoiceId/void', authenticateToken, async (req, res) => {
  try {
    const { invoiceId } = req.params;

    const invoice = await prisma.invoice.findFirst({
      where: {
        id: invoiceId,
        organizationId: req.user.organizationId
      }
    });

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    const stripeInvoice = await stripe.invoices.voidInvoice(invoice.stripeInvoiceId);

    // Update local invoice status
    const updatedInvoice = await prisma.invoice.update({
      where: { id: invoiceId },
      data: { status: 'void' }
    });

    res.json({
      success: true,
      invoice: updatedInvoice
    });

  } catch (error) {
    console.error('Void invoice error:', error);
    res.status(500).json({ error: 'Failed to void invoice' });
  }
});

module.exports = router;
