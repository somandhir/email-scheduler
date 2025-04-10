require("dotenv").config();
const express = require("express");
const nodemailer = require("nodemailer");
const schedule = require("node-schedule");
const validator = require("validator");
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

const path = require('path');
app.use(express.static(path.join(__dirname, 'public')));

// Gmail SMTP Configuration
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASS,
  },
});

// Function to convert IST to UTC
const convertISTtoUTC = (istTime) => {
  const [day, month, year, hours, minutes, seconds] = istTime
    .split(/[/:\s]/)
    .map(Number);
  const dateIST = new Date(year, month - 1, day, hours, minutes, seconds);
  return new Date(dateIST.getTime());
};

// Store scheduled jobs to allow cancellation
const scheduledJobs = {};

// POST endpoint to schedule a one-time email
app.post("/schedule", (req, res) => {
  let { recipients, subject, text, scheduleTime } = req.body;

  // Validate required fields
  if (!recipients || !subject || !text || !scheduleTime) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  // Convert comma-separated recipients to an array
  if (typeof recipients === "string") {
    recipients = recipients.split(",").map((email) => email.trim());
  }

  // Validate email addresses
  const invalidEmails = recipients.filter((email) => !validator.isEmail(email));
  if (invalidEmails.length > 0) {
    return res
      .status(400)
      .json({ message: "Invalid email addresses", invalidEmails });
  }

  // Convert IST time to UTC
  const scheduledUTCDate = convertISTtoUTC(scheduleTime);

  if (isNaN(scheduledUTCDate)) {
    return res.status(400).json({ message: "Invalid scheduleTime format" });
  }

  const now = new Date();
  if (scheduledUTCDate <= now) {
    return res.status(400).json({
      message: "Schedule time must be in the future",
      currentUTCtime: now,
      scheduledemailtime: scheduledUTCDate,
    });
  }

  // Define email options
  const emailData = {
    from: process.env.GMAIL_USER,
    to: recipients,
    subject,
    text,
  };

  // Schedule email using node-schedule
  const job = schedule.scheduleJob(scheduledUTCDate, async () => {
    console.log(`Attempting to send email at ${new Date().toISOString()}`);
    try {
      const info = await transporter.sendMail(emailData);
      console.log("Email sent successfully:", info.response);
    } catch (error) {
      console.error("Error in sending email:", error);
      // Optionally log this error to a database or send a notification
    }
  });

  // Generate a unique job ID
  const jobId = `job_${Date.now()}`;
  scheduledJobs[jobId] = job;

  res.json({
    message: "Email scheduled successfully",
    scheduledUTC: scheduledUTCDate.toISOString(),
    jobId,
  });
});

// POST endpoint to schedule recurring emails
app.post("/schedule-recurring", (req, res) => {
  let {
    recipients,
    subject,
    text,
    startTime,
    recurrencePattern,
    endTime,
    maxOccurrences,
  } = req.body;

  // Validate required fields
  if (!recipients || !subject || !text || !startTime || !recurrencePattern) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  // Convert comma-separated recipients to an array
  if (typeof recipients === "string") {
    recipients = recipients.split(",").map((email) => email.trim());
  }

  // Validate email addresses
  const invalidEmails = recipients.filter((email) => !validator.isEmail(email));
  if (invalidEmails.length > 0) {
    return res
      .status(400)
      .json({ message: "Invalid email addresses", invalidEmails });
  }

  // Convert IST time to UTC for start time
  const startUTCDate = convertISTtoUTC(startTime);
  if (isNaN(startUTCDate)) {
    return res.status(400).json({ message: "Invalid startTime format" });
  }

  const now = new Date();
  if (startUTCDate <= now) {
    return res.status(400).json({
      message: "Start time must be in the future",
      currentUTCtime: now,
      scheduledemailtime: startUTCDate,
    });
  }

  // Convert end time if provided
  let endUTCDate = null;
  if (endTime) {
    endUTCDate = convertISTtoUTC(endTime);
    if (isNaN(endUTCDate)) {
      return res.status(400).json({ message: "Invalid endTime format" });
    }
    if (endUTCDate <= startUTCDate) {
      return res.status(400).json({
        message: "End time must be after start time",
      });
    }
  }

  // Parse recurrence pattern
  let rule;
  try {
    rule = parseRecurrencePattern(recurrencePattern, startUTCDate);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }

  // Define email options
  const emailData = {
    from: process.env.GMAIL_USER,
    to: recipients,
    subject,
    text,
  };

  // Additional recurrence configuration
  let occurrenceCount = 0;

  // Schedule recurring email using node-schedule
  const job = schedule.scheduleJob(rule, async function() {
    // Check if we've reached max occurrences
    if (maxOccurrences && ++occurrenceCount > maxOccurrences) {
      this.cancel();
      console.log(`Job canceled after ${maxOccurrences} occurrences`);
      return;
    }

    // Check if we've passed the end date
    if (endUTCDate && new Date() > endUTCDate) {
      this.cancel();
      console.log(`Job canceled as end date has passed`);
      return;
    }

    console.log(`Sending recurring email at ${new Date().toISOString()}`);
    try {
      const info = await transporter.sendMail(emailData);
      console.log("Recurring email sent successfully:", info.response);
    } catch (error) {
      console.error("Error in sending recurring email:", error);
    }
  });

  // Generate a unique job ID
  const jobId = `recurring_${Date.now()}`;
  scheduledJobs[jobId] = job;

  res.json({
    message: "Recurring email scheduled successfully",
    startTime: startUTCDate.toISOString(),
    endTime: endUTCDate ? endUTCDate.toISOString() : "No end date",
    recurrencePattern,
    maxOccurrences: maxOccurrences || "Unlimited",
    jobId,
  });
});

// Helper function to parse recurrence pattern
function parseRecurrencePattern(pattern, startDate) {
  const rule = new schedule.RecurrenceRule();
  rule.tz = 'UTC'; // Set timezone to UTC

  // Extract hour, minute, second from start date to maintain the time
  const hour = startDate.getUTCHours();
  const minute = startDate.getUTCMinutes();
  const second = startDate.getUTCSeconds();

  // Parse pattern
  const patterns = {
    daily: () => {
      rule.hour = hour;
      rule.minute = minute;
      rule.second = second;
      return rule;
    },
    weekly: (dayOfWeek = startDate.getUTCDay()) => {
      rule.dayOfWeek = dayOfWeek;
      rule.hour = hour;
      rule.minute = minute;
      rule.second = second;
      return rule;
    },
    monthly: (dayOfMonth = startDate.getUTCDate()) => {
      rule.date = dayOfMonth;
      rule.hour = hour;
      rule.minute = minute;
      rule.second = second;
      return rule;
    },
    yearly: () => {
      rule.month = startDate.getUTCMonth();
      rule.date = startDate.getUTCDate();
      rule.hour = hour;
      rule.minute = minute;
      rule.second = second;
      return rule;
    },
  };

  // Handle pattern with parameters (e.g., "weekly:1" for Monday)
  const [basePattern, param] = pattern.split(':');
  
  if (!patterns[basePattern]) {
    throw new Error("Invalid recurrence pattern. Supported patterns: daily, weekly, monthly, yearly");
  }

  if (param !== undefined) {
    let paramValue = parseInt(param);
    
    if (basePattern === 'weekly' && (isNaN(paramValue) || paramValue < 0 || paramValue > 6)) {
      throw new Error("Weekly pattern requires a day number 0-6 (Sunday-Saturday)");
    }
    
    if (basePattern === 'monthly' && (isNaN(paramValue) || paramValue < 1 || paramValue > 31)) {
      throw new Error("Monthly pattern requires a day number 1-31");
    }
    
    return patterns[basePattern](paramValue);
  }
  
  return patterns[basePattern]();
}

// Endpoint to cancel a scheduled email
app.delete("/cancel/:jobId", (req, res) => {
  const { jobId } = req.params;
  
  if (scheduledJobs[jobId]) {
    scheduledJobs[jobId].cancel();
    delete scheduledJobs[jobId];
    res.json({ message: `Job ${jobId} cancelled successfully` });
  } else {
    res.status(404).json({ message: `Job ${jobId} not found` });
  }
});

// Endpoint to list all scheduled jobs
app.get("/jobs", (req, res) => {
  const jobs = Object.keys(scheduledJobs).map(id => ({
    jobId: id,
    type: id.startsWith('recurring') ? 'recurring' : 'one-time',
    nextInvocation: scheduledJobs[id].nextInvocation() ? 
      scheduledJobs[id].nextInvocation().toISOString() : 'No pending invocations'
  }));
  
  res.json({ jobs });
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 1338;
app.listen(PORT, () => console.log(`Server is running on port: ${PORT}`));


// example json of recurring schedule
// {
//   "recipients": "user1@example.com, user2@example.com",
//   "subject": "Weekly Team Meeting",
//   "text": "Reminder: Our weekly team meeting is tomorrow at 10 AM.",
//   "startTime": "11/03/2025 15:00:00",
//   "recurrencePattern": "weekly:1",
//   "endTime": "11/06/2025 15:00:00",
//   "maxOccurrences": 10
// }