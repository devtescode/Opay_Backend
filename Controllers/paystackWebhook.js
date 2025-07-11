const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const { PaymentDB } = require('../Models/webhookModel');
const { log } = require('console');
const { Userschema } = require('../Models/user.models');
require('dotenv').config();

const PAYSTACK_SECRET = process.env.API_SECRET;

// Ensure raw body is captured before any other parsing middleware
router.use(express.raw({ type: 'application/json', limit: '10kb' }));

router.post('/webhook', async (req, res) => {
    try {
        const rawBody = req.rawBody;
        const signature = req.headers['x-paystack-signature'];

        if (!signature || !rawBody) {
            console.error("Missing raw body or signature");
            return res.status(400).json({ error: 'Missing raw body or signature' });
        }

        const rawBodyString = rawBody instanceof Buffer ? rawBody.toString('utf8') : JSON.stringify(rawBody);
        const hash = crypto.createHmac('sha512', PAYSTACK_SECRET).update(rawBodyString).digest('hex');

        if (hash !== signature) {
            console.error('Invalid signature');
            return res.status(403).json({ error: 'Invalid signature' });
        }

        const event = JSON.parse(rawBodyString);
        console.log('Webhook event received:', event.event);

        if (event.event === 'charge.success') {
            const { amount, status, paidAt, authorization, channel, reference, currency, metadata } = event.data || {};
            const authorization_code = authorization?.authorization_code || 'N/A';

            const username = metadata?.username;
            const dummyEmail = `${username}@opay.com`;

            if (!amount || !username) {
                console.error('Amount or username is missing in webhook data');
                return res.status(400).json({ error: 'Missing amount or username' });
            }

            const amountInFullCurrency = amount / 100;

            const payment = new PaymentDB({
                event: event.event,
                customerEmail: dummyEmail,
                amount: amountInFullCurrency,
                currency: currency || 'NGN',
                reference: reference || 'No Reference',
                status: status || 'unknown',
                paidAt: paidAt ? new Date(paidAt) : new Date(),
                authorizationCode: authorization_code,
                paymentMethod: 'Paystack',
                channel: channel || 'unknown'
            });

            try {
                await payment.save();
                console.log('Payment saved to DB:', payment);
            } catch (err) {
                if (err.code === 11000) {
                    console.warn('Duplicate payment reference detected.');
                } else {
                    throw err;
                }
            }

            const user = await Userschema.findOne({ username });

            if (user) {
                user.Balance += amountInFullCurrency;
                await user.save();
                console.log('User balance updated:', user.username);
            } else {
                console.warn('User not found for username:', username);
            }
        }

        return res.status(200).json({ message: 'Webhook processed successfully' });

    } catch (error) {
        console.error('Error in webhook:', error.message);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
