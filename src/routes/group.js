import express from "express";
import {
  createGroup,
  deleteGroup,
  deleteMultipleGroups,
  loadMany,
  loadOne,
  removeFromGroup,
  updateGroup,
} from "../controllers/group.js";

const router = express.Router();
router.get("/", loadMany);
router.post("/create", createGroup);
router.get("/:groupId", loadOne);
router.put("/:groupId", updateGroup);
router.delete("/:groupId/removeFromGroup", removeFromGroup);
router.delete("/:groupId", deleteGroup);
router.delete("/", deleteMultipleGroups);

export default router;
