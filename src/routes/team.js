import express from "express";
import {
  createTeam,
  deleteTeam,
  loadMany,
  loadOne,
  loadOneByEmail,
  loadOneByName,
  sendInvite,
} from "../controllers/team.js";

const router = express.Router();

router.post("/", createTeam);
router.get("/", loadMany);
router.post("/send", sendInvite);
router.get("/:teamId", loadOne);
router.get("/:teamName/check", loadOneByName);
router.get("/:email/signupCheck", loadOneByEmail);
router.delete("/:teamId", deleteTeam);

export default router;
