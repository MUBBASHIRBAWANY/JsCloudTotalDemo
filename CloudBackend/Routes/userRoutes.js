
import express from "express";
import { deleteUser, getUserById, getUsers, updateUser, userLogin, userProfile, userRegister } from "../Controllar/userControllar.js";
import { AiResponce } from "../Controllar/AiAgent.js";
import authMiddleware from "../Midelware/authMiddleware.js";
import checkPermission from "../Midelware/CheckRights.js";

const UserRouter = express.Router()

// ===== PUBLIC ROUTES (No auth required) =====
UserRouter.post('/', userRegister)
UserRouter.post('/Login', userLogin)
UserRouter.post('/profile', userProfile)

// ===== PROTECTED ROUTES (Auth + Permission required) =====
UserRouter.get('/',   getUsers)
UserRouter.get('/user/:id',   getUserById)
UserRouter.put('/user/:id',   updateUser)
UserRouter.delete('/user/:id',  deleteUser)
UserRouter.get("/Ai/:qes", AiResponce)

export default UserRouter