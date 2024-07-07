import express from 'express';
import {
  createDocument,
  deleteDocument,
  deleteMultipleDocuments,
  loadMany,
  loadOne,
  revokeDocumentAccess,
  shareDocumentWithUserOrGroup,
  updateDocument,
  updateFavorite,
  updatePermissions,
  updateTags,
  uploadFiles
} from '../controllers/document.js';

const router = express.Router();
router.get("/", loadMany);
router.post("/upload", uploadFiles);
router.post("/create", createDocument);
router.get("/:documentId", loadOne);
router.put("/:documentId/edit", updateDocument);
router.put('/:documentId/share', shareDocumentWithUserOrGroup);
router.put("/:documentId/permission", updatePermissions);
router.put("/:documentId/favorite", updateFavorite);
router.put("/:documentId/tags", updateTags);
router.delete("/:documentId/revoke", revokeDocumentAccess);
router.delete("/:documentId", deleteDocument);
router.delete("/", deleteMultipleDocuments);
// router.put("/move/:id", moveFile);

export default router;
