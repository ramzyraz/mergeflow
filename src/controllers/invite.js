import { generateEmailContent, sendEmail } from "../utils/sendingEmails.js";

export const sendInviteEmailDocs = async (req, res) => {
  try {
    const { email, invitationLink } = req.body;
    await sendInviteEmail(email, invitationLink);
  } catch (error) {
    logger.error([
      "[sendInviteEmailDocs] Failed to send an invite via email",
      error,
    ]);
    throw new Error("Error sending invitation email");
  }
};

export const sendInviteEmail = async (recipent, invitationLink) => {
  try {
    const { subject, emailBody } = generateEmailContent(invitationLink);
    const result = await sendEmail(recipent, subject, emailBody);
    return result?.success || false;
  } catch (error) {
    logger.error([
      "[sendInviteEmail] Failed to send an invite via email",
      error,
    ]);
    throw new Error("Error sending invitation email");
  }
};

export const sendMultipleInviteEmails = async (recipients, invitationLink) => {
  try {
    await Promise.all(
      recipients?.map(async (recipient) => {
        const { subject, emailBody } = generateEmailContent(invitationLink);
        return await sendEmail(recipient, subject, emailBody);
      }),
    );
  } catch (error) {
    logger.error([
      "[sendMultipleInviteEmails] Error sending invitation emails",
      error,
    ]);
    throw new Error("Error sending invitation emails");
  }
};
