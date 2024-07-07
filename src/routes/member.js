import express from 'express';
import {
  loadOne,
  loadMany,
  update,
  move,
  updateByEmail,
  deleteOne,
  deleteMany,
  createMember,
} from '../controllers/member.js';

const router = express.Router();

router.post("/", createMember);
router.get("/", loadMany);
router.get("/:id", loadOne);
router.put("/:id", update);
router.put("/:email/updateProfile", updateByEmail);
router.put("/:id/moveToGroup", move);
router.delete("/:id", deleteOne);
router.delete("/", deleteMany);

export default router;
