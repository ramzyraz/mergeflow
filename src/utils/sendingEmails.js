import postmark from "postmark";
import { v4 as uuidv4 } from "uuid";
import logger from "./logger.js";
import { POSTMARK_API_KEY, SENDER_EMAIL } from "../config/index.js";

const client = new postmark.ServerClient(POSTMARK_API_KEY);

export const sendEmail = async (to, subject, htmlContent) => {
  const msg = {
    From: SENDER_EMAIL,
    To: to,
    Subject: subject,
    HtmlBody: htmlContent,
  };

  try {
    await client.sendEmail(msg);
    logger.info([`Email sent successfully to ${to}`]);
    return { success: true, email: to };
  } catch (error) {
    logger.error([`Error sending email:`, error]);
    return { success: false, email: to };
  }
};

export const generateEmailContent = (invitationLink) => {
  const inviteToken = uuidv4();
  const subject = "Invitation to join our app";
  const html = `
    <p>Hello,</p>
    <p>You have been invited to join our app! Click the link below to sign up:</p>
    <p><a href="${invitationLink}?inviteToken=${inviteToken}">Sign Up</a></p>
    <p>Thank you!</p>
  `;

  return { subject, emailBody: html };
};
