# 📧 Email Scheduler Web App

A Node.js-based email scheduling web application that allows users to send **one-time** and **recurring emails** to multiple recipients. Users can also manage (view or cancel) scheduled emails through a simple and intuitive frontend.

## Features

- ✅ Send **one-time emails** to multiple recipients
- 🔁 Schedule **recurring emails** with custom patterns (daily, weekly, monthly, yearly)
- 📅 Manage and cancel scheduled emails
- 🕰️ Converts IST to UTC to ensure time-zone aware scheduling
- 🔒 Validates all inputs including recipient emails and schedule times

---

##  Web Interface Overview

The application is divided into three tabs:

1. **One-Time Email**  
   - Schedule an email to one or more recipients at a specific date and time.

2. **Recurring Emails**  
   - Send recurring emails (daily/weekly/monthly/yearly) with optional end dates and recurrence limits.

3. **Scheduled Emails**  
   - View all scheduled emails and cancel any if needed.

---

## 🛠️ Tech Stack

| Component | Technology |
|----------|-------------|
| **Frontend** | HTML, CSS (Vanilla, custom styling) |
| **Backend** | Node.js, Express |
| **Email Service** | Nodemailer with Gmail SMTP |
| **Scheduler** | node-schedule |
| **Validation** | validator.js |
| **Environment Config** | dotenv |
| **API Testing** | Postman (for backend testing)

---

## Sample JSON (for recurring email)
```json
{
  "recipients": "user1@example.com, user2@example.com",
  "subject": "Weekly Team Meeting",
  "text": "Reminder: Our weekly team meeting is tomorrow at 10 AM.",
  "startTime": "11/03/2025 15:00:00",
  "recurrencePattern": "weekly:1",
  "endTime": "11/06/2025 15:00:00",
  "maxOccurrences": 10
}
```

## 🧰 How to Run Locally

1. **Clone the repository**

```bash
git clone https://github.com/your-username/email-scheduler.git
cd email-scheduler
```
2. **Install dependencies**
```bash
npm install
```

3. **Create a .env file in the root directory with the following**
```ini
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASS=your-app-password
```
Make sure:
2-step verification is enabled on your Gmail.
You're using an App Password (not your regular Gmail password).

4. **Start the server**
```bash
node index.js
```

5. **Visit in browser**
```bash
http://localhost:1338
```

## 📡 API Endpoints Summary

| Method | Endpoint               | Description                  |
|--------|------------------------|------------------------------|
| POST   | `/schedule`            | Schedule a one-time email    |
| POST   | `/schedule-recurring`  | Schedule a recurring email   |
| DELETE | `/cancel/:jobId`       | Cancel a scheduled email     |
| GET    | `/jobs`                | List all scheduled jobs      |

---

## Future Improvements

- UI validation and animations  
- Authenticated user email logs  
- Admin dashboard for analytics  
- Email template support (HTML emails)

---

## 📝 Notes

- Scheduled times are input in **IST** but internally converted to **UTC**.
- `.env` and `node_modules/` are excluded from the repository using `.gitignore`.

---

## 📄 License

This project is open-source and available under the **MIT License**.

---

## 🙋‍♂️ Author

**Soman Dhir**  
4th Semester B.Tech | Email Scheduler  
GitHub – [@somandhir](https://github.com/somandhir)
