import express from 'express';
import routesMember from './member.js';
import routesDocument from './document.js';
import routesTeam from './team.js';
import routesGroup from './group.js';
import routesInvite from './invite.js';

const router = express.Router();
router.get('/', (_, res) => res.status(200).send('Hello! Default API Server for Mergeflow'));
router.use('/member', routesMember);
router.use('/documents', routesDocument);
router.use('/teams', routesTeam);
router.use('/groups', routesGroup);

// Route to handle sending the invitation email
router.use('/invite', routesInvite);

export default router;