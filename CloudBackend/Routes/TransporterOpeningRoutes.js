import express from 'express';
import { getAllTransporterOpening, createTransporterOpening, updateTransporterOpening, deleteTransporterOpening } from '../Controllar/TransporterOpeningControllar.js';

const TransporterOpeningRouter = express.Router();

TransporterOpeningRouter.get('/', getAllTransporterOpening);
TransporterOpeningRouter.post('/', createTransporterOpening);
TransporterOpeningRouter.put('/updateTransporterOpening/:id', updateTransporterOpening);
TransporterOpeningRouter.delete('/deleteTransporterOpening/:id', deleteTransporterOpening);

export default TransporterOpeningRouter;
