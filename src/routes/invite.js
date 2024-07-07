import express from 'express';
import { sendInviteEmailDocs } from '../controllers/invite.js';

const router = express.Router();
router.post("/send-invitation", sendInviteEmailDocs);
export default router;
