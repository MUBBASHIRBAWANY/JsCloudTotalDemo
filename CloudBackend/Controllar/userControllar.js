import express from "express";
import userModel, { comparePassword, dropLegacyFirstnameUniqueIndex, getAuthontication, hashPassword } from "../Modal/userModal.js";
import jwt from "jsonwebtoken";
import { ensureUserPermissions } from "../utils/userPermissions.js";
import console from "console";

const User = userModel

export const cleanName = (value) => String(value ?? "").trim().replace(/\s+/g, " ");

const nameKey = (value) => cleanName(value).toLowerCase();

const compactName = (value) => nameKey(value).replace(/\s+/g, "");

export const userMatchesLoginName = (user, typed) => {
    const key = compactName(typed);
    if (!key) return false;
    const first = compactName(user?.firstname);
    const last = compactName(user?.lastname);
    if (key === first) return true;
    if (!last) return false;
    return key === `${first}${last}`;
};

export const fullNameClash = (users, firstname, lastname, excludeId) => {
    const first = nameKey(firstname);
    const last = nameKey(lastname);
    const others = (users || []).filter((user) => String(user._id) !== String(excludeId || ""));
    if (!last) {
        return others.some((user) => nameKey(user.firstname) === first) ? "firstname" : null;
    }
    return others.some((user) => nameKey(user.firstname) === first && nameKey(user.lastname) === last)
        ? "fullname"
        : null;
};

const fullNameClashMessage = {
    firstname: "First name already exists. Add a last name to use a different full name.",
    fullname: "A user with this full name already exists.",
};

const rejectDuplicateName = async (firstname, lastname, excludeId) => {
    const users = await User.find(excludeId ? { _id: { $ne: excludeId } } : {}).select("firstname lastname").lean();
    const clash = fullNameClash(users, firstname, lastname, excludeId);
    if (!clash) return null;
    return fullNameClashMessage[clash];
};

export const userRegister = async (req, res) => {
    console.log(req.body)
    try {
        const { email, password, ChartOfAccounts, Cpassword, phoneNumber, createdBy, createDate, Roles, Location, Store, Vendor, userType, Section, Subsection } = req.body;
        const firstname = cleanName(req.body.firstname);
        const lastname = cleanName(req.body.lastname);
        if (!firstname || !password || !Cpassword || !phoneNumber) {
            return res.status(400).send("All fields are required");
        }
        await dropLegacyFirstnameUniqueIndex();
        const duplicateName = await rejectDuplicateName(firstname, lastname);
        if (duplicateName) return res.status(400).send(duplicateName);

        const hashPassword1 = await hashPassword(password);
        console.log(hashPassword1)
        const newUser = await User.create({
            firstname,
            email,
            ChartOfAccounts,
            password: hashPassword1,
            Cpassword: hashPassword1,
            lastname,
            phoneNumber: phoneNumber,
            createdBy: createdBy,
            createDate: createDate,
            Roles: Array.isArray(Roles) ? Roles : [],
            permissionsAssigned: true,
            Location: Location,
            Store: Store,
            Section,
            Subsection,
            Vendor: Vendor,
            userType: userType,
        });

        const token = await getAuthontication(newUser);
        res.status(201).send({ message: "Registration successful", token });
    } catch (err) {
        console.error(err);
        res.status(500).send(`Server Error: ${err.message}`);
    }
}

export const userLogin = async (req, res) => {
    try {
        const { firstname, password } = req.body;
        console.log(firstname, password);
        if (!firstname || !password) {
            return res.status(400).send("All fields are required");
        }

        // Login does not load ChartOfAccounts — profile API returns that list.
        const people = await User.find().select("+password -Roles -ChartOfAccounts");
        
        
        const users = people.filter((person) => userMatchesLoginName(person, firstname));
        if (!users.length) {
            return res.status(400).send("Invalid username or password");
        }

        let user = null;
        for (const candidate of users) {
            if (await comparePassword(password, candidate.password)) {
                user = candidate;
                break;
            }
        }
        if (!user) {
            return res.status(400).send("Invalid username or password");
        }

        await ensureUserPermissions(user);

        const token = await getAuthontication(user);
        const safeUser = user.toObject();
        delete safeUser.password;
        delete safeUser.Cpassword;
        delete safeUser.ChartOfAccounts;
        res.cookie("token", token);
        res.send({
            data: {
                status: "success",
                token: token,
                user: safeUser,
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).send(`Server Error: ${err.message}`);
    }
};
export const userProfile = async (req, res) => {

    try {
        const token = req.body.authorization

        if (!token) {
            return res.status(403).send("Invalid Token");

        }

        jwt.verify(token, "peral-Dynamic", async (err, decoded) => {
            if (err) {

                return res.status(403).send("Invalid Token");

            }
            try {
                const payload = decoded?.val || {};
                const userId = payload._id || payload.id || payload._doc?._id;
                
                if (!userId) return res.status(403).send("Invalid Token");
                // Profile loads full user including ChartOfAccounts (not sent on login).
                const fresh = await User.findById(userId);
                if (!fresh) return res.status(403).send("Invalid Token");
                const roles = await ensureUserPermissions(fresh);
                const val = fresh.toObject();
                delete val.password;
                delete val.Cpassword;
                val.Roles = roles;
                val.permissionsAssigned = true;
                val.ChartOfAccounts = Array.isArray(val.ChartOfAccounts) ? val.ChartOfAccounts : [];
                res.status(200).send({ status: true, data: { val } });
            } catch (profileErr) {
                console.error(profileErr);
                res.status(500).send(`Server Error: ${profileErr.message}`);
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).send(`Server Error: ${err.message}`);
    }
};


export const getUserById = async (req, res) => {
    const { id } = req.params
    try {
        const user = await User.findById(id);
        if (!user) {
            return res.status(404).send("User not found");
        }
        else {
            await ensureUserPermissions(user);
            res.status(200).send({ status: true, data: user });
        }
    } catch (err) {
        console.error(err);
        res.status(500).send(`Server Error: ${err.message}`);
    }
}

export const updateUser = async (req, res) => {
    const { id } = req.params

    const { firstname, ChartOfAccounts, lastname, phoneNumber, password, userCloseMonth, Cpassword, updatedBy, updateDate, Roles, Location, Store, Section,
        Subsection, Vendor } = req.body

    try {
        const nextFirst = firstname === undefined ? undefined : cleanName(firstname);
        const nextLast = lastname === undefined ? undefined : cleanName(lastname);
        if (nextFirst === "") {
            return res.status(400).send("First name is required");
        }
        const current = await User.findById(id).select("firstname lastname");
        if (!current) return res.status(404).send("User not found");
        const duplicateName = await rejectDuplicateName(
            nextFirst === undefined ? current.firstname : nextFirst,
            nextLast === undefined ? current.lastname : nextLast,
            id
        );
        if (duplicateName) return res.status(400).send(duplicateName);

        const updateFields = {
            ...req.body,
            firstname: nextFirst === undefined ? current.firstname : nextFirst,
            userCloseMonth,
            ChartOfAccounts,
            lastname: nextLast === undefined ? current.lastname : nextLast,
            phoneNumber,
            updatedBy,
            updateDate,
            Location,
            Store,
            Vendor,
            Section,
            Subsection,

        };
        delete updateFields.selectRole;
        if (Array.isArray(Roles)) {
            updateFields.Roles = Roles;
            updateFields.permissionsAssigned = true;
        }

        // Only add password fields if they're provided
        if (password && password !== "") {
            updateFields.password = await hashPassword(password);
        }

        if (Cpassword && Cpassword !== "") {
            updateFields.Cpassword = await hashPassword(Cpassword);
        }

        const user = await User.findByIdAndUpdate(id, updateFields)
        if (!user) {
            return res.status(404).send("User not found");
        }
        else {
            res.status(200).send({ status: true, data: user });
        }
    } catch (err) {
        console.error(err);
        res.status(500).send(`Server Error: ${err.message}`);
    }
}

export const deleteUser = async (req, res) => {
    const { id } = req.params
    try {
        const user = await User.findByIdAndDelete(id);
        if (!user) {
            return res.status(404).send("User not found");
        }
        else {
            res.status(200).send({ status: true, data: user });
        }
    } catch (err) {
        console.error(err);
        res.status(500).send(`Server Error: ${err.message}`);
    }
}

export const getUsers = async (req, res) => {
    try {
        const users = await User.find();
        for (const user of users) {
            try {
                await ensureUserPermissions(user);
            } catch (migrateErr) {
                console.error("permission migrate", user?._id, migrateErr);
            }
        }
        res.status(200).send({ status: true, data: users });
    } catch (err) {
        console.error(err);
        res.status(500).send(`Server Error: ${err.message}`);
    }
}

