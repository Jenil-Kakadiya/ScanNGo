const express = require('express');
// Import Event model (capitalized) per models/event.js
const { Event } = require('../models');
const { authenticateAdminToken } = require('../middleware/auth');

const router = express.Router();

router.post('/create', authenticateAdminToken, async (req, res) => {
    try {

        // console.log(req.body);
        const { name, description, status, location, dateTime, organizerId, creatorEmail } = req.body;

        const event = await Event.create({
            name,
            description,
            status,
            location,
            dateTime,
            organizerId,
            creatorEmail
        });

        // console.log(event);

        res.status(201).json({ 
            success: true,
        });
    } catch (error) {
        res.status(500).json({ 
            success: false,
            error: error.message 
        });
    }   
})

module.exports = router;