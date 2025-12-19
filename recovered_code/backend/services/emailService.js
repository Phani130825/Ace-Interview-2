import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// Create transporter with Gmail
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD // Use App Password, not regular password
  }
});

// Verify transporter configuration
transporter.verify((error, success) => {
  if (error) {
    console.error('Email transporter error:', error);
  } else {
    console.log('Email server is ready to send messages');
  }
});

const practiceTypeLabels = {
  'aptitude': 'Aptitude Test',
  'coding': 'Coding Round',
  'technical-interview': 'Technical Interview',
  'hr-interview': 'HR Interview',
  'managerial-interview': 'Managerial Interview'
};

export const sendScheduleEmail = async (email, userName, practiceType, scheduledDate, duration) => {
  try {
    const practiceLabel = practiceTypeLabels[practiceType] || practiceType;
    const formattedDate = new Date(scheduledDate).toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const mailOptions = {
      from: `"Ace Interviews" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: `Practice Session Scheduled: ${practiceLabel}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .schedule-card { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea; }
            .schedule-card h3 { margin-top: 0; color: #667eea; }
            .detail-row { margin: 10px 0; padding: 10px; background: #f5f7fa; border-radius: 5px; }
            .detail-label { font-weight: bold; color: #555; }
            .button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎯 Practice Session Scheduled!</h1>
            </div>
            <div class="content">
              <p>Hi ${userName},</p>
              <p>Your practice session has been successfully scheduled. Here are the details:</p>
              
              <div class="schedule-card">
                <h3>📅 Session Details</h3>
                <div class="detail-row">
                  <span class="detail-label">Practice Type:</span> ${practiceLabel}
                </div>
                <div class="detail-row">
                  <span class="detail-label">Scheduled Time:</span> ${formattedDate}
                </div>
                <div class="detail-row">
                  <span class="detail-label">Duration:</span> ${duration} minutes
                </div>
              </div>

              <p><strong>Important Reminders:</strong></p>
              <ul>
                <li>You will receive a reminder 30 minutes before your scheduled practice</li>
                <li>Make sure you have a stable internet connection</li>
                <li>Find a quiet place where you won't be disturbed</li>
                <li>Have your materials ready (if applicable)</li>
              </ul>

              <center>
                <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard" class="button">
                  View Dashboard
                </a>
              </center>

              <p>Good luck with your practice session! 🚀</p>
              
              <div class="footer">
                <p>You're receiving this email because you scheduled a practice session on Ace Interviews.</p>
                <p>© ${new Date().getFullYear()} Ace Interviews. All rights reserved.</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Schedule email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending schedule email:', error);
    throw error;
  }
};

export const sendReminderEmail = async (email, userName, practiceType, scheduledDate, duration) => {
  try {
    const practiceLabel = practiceTypeLabels[practiceType] || practiceType;
    const formattedDate = new Date(scheduledDate).toLocaleString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });

    const mailOptions = {
      from: `"Ace Interviews" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: `⏰ Reminder: ${practiceLabel} starts in 30 minutes!`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .reminder-box { background: #fff3cd; border: 2px solid #ffc107; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; }
            .reminder-box h2 { margin-top: 0; color: #856404; }
            .button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 40px; text-decoration: none; border-radius: 5px; margin: 20px 0; font-size: 16px; font-weight: bold; }
            .tips { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>⏰ Practice Session Reminder</h1>
            </div>
            <div class="content">
              <div class="reminder-box">
                <h2>Your ${practiceLabel} starts in 30 minutes!</h2>
                <p style="font-size: 18px; margin: 10px 0;">Scheduled for: <strong>${formattedDate}</strong></p>
                <p style="font-size: 18px; margin: 10px 0;">Duration: <strong>${duration} minutes</strong></p>
              </div>

              <p>Hi ${userName},</p>
              <p>This is a friendly reminder that your practice session is starting soon!</p>

              <div class="tips">
                <h3>🎯 Quick Tips:</h3>
                <ul>
                  <li>✅ Find a quiet, comfortable space</li>
                  <li>✅ Test your internet connection</li>
                  <li>✅ Have water nearby to stay hydrated</li>
                  <li>✅ Take a deep breath and relax</li>
                </ul>
              </div>

              <center>
                <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard" class="button">
                  Start Practice Now
                </a>
              </center>

              <p>You've got this! 💪</p>
              
              <div class="footer">
                <p>© ${new Date().getFullYear()} Ace Interviews. All rights reserved.</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Reminder email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending reminder email:', error);
    throw error;
  }
};

export default transporter;
