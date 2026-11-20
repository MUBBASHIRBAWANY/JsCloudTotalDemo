import express from 'express';
import { getDashboardData } from '../Controllar/HRDashboardControllar.js';

const HRDashboardRouter = express.Router();

HRDashboardRouter.get('/', getDashboardData);

export default HRDashboardRouter;
