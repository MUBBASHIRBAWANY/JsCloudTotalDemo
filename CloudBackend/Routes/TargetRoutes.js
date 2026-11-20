import express from 'express';
import { getAllTarget, createTarget, updateTarget, deleteTarget, getTagetByMonth } from '../Controllar/TargetControllar.js';

const TargetRouter = express.Router();


TargetRouter.get('/', getAllTarget);
TargetRouter.post('/', createTarget);
TargetRouter.put('/updateTarget/:id', updateTarget);
TargetRouter.get('/getTagetByMonth/:Month', getTagetByMonth);
TargetRouter.delete('/deleteTarget/:id', deleteTarget);

export default TargetRouter;

