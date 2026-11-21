import EmployeeHrModal from "../Modal/EmployeeHrModal.js";
import SalaryHistoryModal from "../Modal/SalaryHistoryModal.js";
import CompanyPolicyModal from "../Modal/CompanyPolicyModal.js";

import { hrmsCatch, hrmsFail } from "../utils/hrmsError.js";

import EmployeeEBFAccountModal from "../Modal/EmployeeEBFAccountModal.js";
import EmployeeBadDebtAccountModal from "../Modal/EmployeeBadDebtAccountModal.js";
import EmployeeLoanAccountModal from "../Modal/EmployeeLoanAccountModal.js";
import EmployeeAdvanceAccountModal from "../Modal/EmployeeAdvanceAccountModal.js";

import AdministrativeModal from "../Modal/AdministrativeModal.js";


// ======================================================
// Convert Date to YYYY-MM-DD in local timezone
// ======================================================

function toLocalDateStr(date) {
  const d = new Date(date);

  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");

  return `${y}-${m}-${day}`;
}


// ======================================================
// Helpers
// ======================================================

const isTrue = (v) =>
  v === true || v === "true";

const isFalse = (v) =>
  v === false || v === "false";

const fullName = (emp) =>
  [emp.firstName, emp.lastName]
    .filter(Boolean)
    .join(" ");


// ======================================================
// Employee Account Configuration
// ======================================================
//
// NOTE:
// AdministrativeModal values are NOT fetched here.
// They are fetched inside syncEmployeeAccounts()
// so we don't store a Promise in the config.
// ======================================================

const EMPLOYEE_ACCOUNT_CONFIG = [
  {
    flag: "hasEBF",
    model: EmployeeEBFAccountModal,
    bodyField: "ebfAccount",
    prefix: "EBF-",
    adminField: "ebf",
  },

  {
    flag: "hasAdvance",
    model: EmployeeAdvanceAccountModal,
    bodyField: "advanceAccount",
    prefix: "Advance-",
    adminField: "advance",
  },

  {
    flag: "hasBadDebt",
    model: EmployeeBadDebtAccountModal,
    bodyField: "badDebtAccount",
    prefix: "BadDebt-",
    adminField: "bedebt",
  },

  {
    flag: "hasLoan",
    model: EmployeeLoanAccountModal,
    bodyField: "loanAccount",
    prefix: "Loan-",
    adminField: "loan",
  },
];


// ======================================================
// Sync Employee Accounts
// ======================================================

const syncEmployeeAccounts = async (employee, body = {}) => {

  // Get administrative accounts once
  const administrativeData = await AdministrativeModal.findOne();

  for (const {
    flag,
    model,
    bodyField,
    prefix,
    adminField,
  } of EMPLOYEE_ACCOUNT_CONFIG) {

    const value = body[flag];

    // Flag request body mein nahi aya
    if (value === undefined) {
      continue;
    }


    // ==================================================
    // CREATE / UPDATE ACCOUNT
    // ==================================================

    if (isTrue(value)) {

      const set = {
        name: prefix + fullName(employee),
      };


      // ------------------------------------------------
      // Account priority:
      //
      // 1. Request body account
      // 2. Administrative account
      // 3. Empty string
      // ------------------------------------------------

      if (body[bodyField] !== undefined) {

        set.account = body[bodyField];

      } else if (administrativeData?.[adminField] !== undefined) {

        set.account = administrativeData[adminField];

      }


      // ------------------------------------------------
      // Update object
      // ------------------------------------------------

      const update = {
        $set: set,
      };


      // Agar account kahin se nahi mila
      // to empty account create hoga
      if (set.account === undefined) {

        update.$setOnInsert = {
          account: "",
        };

      }


      // ------------------------------------------------
      // Create or Update
      // ------------------------------------------------

      await model.findOneAndUpdate(
        {
          empId: employee._id,
        },
        update,
        {
          upsert: true,
          new: true,
          setDefaultsOnInsert: true,
        }
      );
    }


    // ==================================================
    // DELETE ACCOUNT
    // ==================================================

    else if (isFalse(value)) {

      await model.deleteMany({
        empId: employee._id,
      });

    }
  }
};


// ======================================================
// CREATE EMPLOYEE
// ======================================================

export const CreateEmployee = async (req, res) => {

  let data = null;

  try {

    // --------------------------------------------------
    // Generate Employee Code
    // --------------------------------------------------

    const lastEmp = await EmployeeHrModal
      .find()
      .sort({ code: -1 })
      .limit(1);

    let nextCode;

    if (lastEmp.length === 0) {

      nextCode = "0001";

    } else {

      const nextNumber =
        parseInt(lastEmp[0].code, 10) + 1;

      nextCode =
        nextNumber
          .toString()
          .padStart(4, "0");
    }


    // --------------------------------------------------
    // Get Default Off Days
    // --------------------------------------------------

    let defaultOffDays = ["Sunday"];

    try {

      const companyPolicy =
        await CompanyPolicyModal.findOne();

      if (
        companyPolicy?.workWeek?.offDays?.length > 0
      ) {

        defaultOffDays =
          companyPolicy.workWeek.offDays;
      }

    } catch (error) {
      console.log(
        "Company policy load failed:",
        error.message
      );
    }


    // --------------------------------------------------
    // Employee Data
    // --------------------------------------------------

    const employeeData = {

      ...req.body,

      code: nextCode,

      salarySetupBasket:
        req.body.salarySetupBasket || {

          basicSalary: 0,

          allowances: [],

          deductions: [],
        },

      policyTags:
        req.body.policyTags || {

          religion: "Muslim",

          workWeek: {
            offDays: defaultOffDays,
          },
        },

      leaveBucket:
        req.body.leaveBucket || {

          casual: {
            allocated: 16,
            used: 0,
            balance: 16,
          },

          medical: {
            allocated: 10,
            used: 0,
            balance: 10,
          },

          annual: {
            allocated: 14,
            used: 0,
            balance: 14,
          },
        },
    };


    // --------------------------------------------------
    // Create Employee
    // --------------------------------------------------

    data =
      await EmployeeHrModal.create(employeeData);


    // --------------------------------------------------
    // Create Employee Accounts
    // --------------------------------------------------

    await syncEmployeeAccounts(
      data,
      req.body
    );


    // --------------------------------------------------
    // Response
    // --------------------------------------------------

    res.status(200).send({
      status: true,
      data,
    });

  } catch (err) {

    // --------------------------------------------------
    // Rollback
    // --------------------------------------------------

    if (data?._id) {

      await Promise.allSettled([

        EmployeeHrModal.findByIdAndDelete(
          data._id
        ),

        ...EMPLOYEE_ACCOUNT_CONFIG.map(
          ({ model }) =>
            model.deleteMany({
              empId: data._id,
            })
        ),
      ]);
    }


    return hrmsCatch(
      res,
      err,
      "Employee save failed",
      "The employee could not be saved. Please try again."
    );
  }
};


// ======================================================
// GET ALL EMPLOYEES
// ======================================================

export const getAllEmployee = async (req, res) => {

  try {

    const data =
      await EmployeeHrModal.find()

        .populate(
          "departmentId",
          "name code"
        )

        .populate(
          "designationId",
          "name code"
        )

        .populate(
          "reportsTo",
          "firstName lastName code"
        );


    res.status(200).send({
      status: true,
      data,
    });

  } catch (err) {

    return hrmsCatch(
      res,
      err,
      "Employee list failed",
      "Employees could not be loaded. Please try again."
    );
  }
};


// ======================================================
// GET EMPLOYEE BY ID
// ======================================================

export const getEmployeeById = async (req, res) => {

  try {

    const data =
      await EmployeeHrModal
        .findById(req.params.id)

        .populate(
          "departmentId",
          "name code"
        )

        .populate(
          "designationId",
          "name code"
        )

        .populate(
          "reportsTo",
          "firstName lastName code"
        );


    if (!data) {

      return res.status(404).send({
        status: false,
        message: "Employee not found",
      });
    }


    res.status(200).send({
      status: true,
      data,
    });

  } catch (err) {

    return hrmsCatch(
      res,
      err,
      "Employee load failed",
      "The employee could not be loaded. Please try again."
    );
  }
};


// ======================================================
// UPDATE EMPLOYEE
// ======================================================

export const updateEmployee = async (req, res) => {

  try {

    // --------------------------------------------------
    // Salary History
    // --------------------------------------------------

    if (
      req.body.salarySetupBasket?.basicSalary !==
      undefined
    ) {

      const existing =
        await EmployeeHrModal.findById(
          req.params.id
        );


      if (
        existing &&
        Number(
          existing.salarySetupBasket.basicSalary
        ) !==
        Number(
          req.body.salarySetupBasket.basicSalary
        )
      ) {

        await SalaryHistoryModal.create({

          employeeId: req.params.id,

          previousSalary:
            existing.salarySetupBasket.basicSalary,

          newSalary:
            req.body.salarySetupBasket.basicSalary,

          effectiveDate:
            toLocalDateStr(new Date()),

          reason:
            req.body.salaryReason ||
            "Salary updated",
        });
      }
    }


    // --------------------------------------------------
    // Update Employee
    // --------------------------------------------------

    const data =
      await EmployeeHrModal.findByIdAndUpdate(

        req.params.id,

        req.body,

        {
          new: true,
        }
      );


    if (!data) {

      return res.status(404).send({
        status: false,
        message: "Employee not found",
      });
    }


    // --------------------------------------------------
    // Sync Accounts
    // --------------------------------------------------

    await syncEmployeeAccounts(
      data,
      req.body
    );


    // --------------------------------------------------
    // Response
    // --------------------------------------------------

    res.status(200).send({
      status: true,
      data,
    });

  } catch (err) {

    return hrmsCatch(
      res,
      err,
      "Employee update failed",
      "The employee could not be updated. Please try again."
    );
  }
};


// ======================================================
// DELETE EMPLOYEE
// ======================================================

export const deleteEmployee = async (req, res) => {

  try {

    const employee =
      await EmployeeHrModal.findByIdAndDelete(
        req.params.id
      );


    if (!employee) {

      return res.status(404).send({
        status: false,
        message: "Employee not found",
      });
    }


    // --------------------------------------------------
    // Delete all employee account records
    // --------------------------------------------------

    await Promise.allSettled(

      EMPLOYEE_ACCOUNT_CONFIG.map(
        ({ model }) =>
          model.deleteMany({
            empId: req.params.id,
          })
      )

    );


    res.status(200).send({
      status: true,
      message: "Employee deleted",
    });

  } catch (err) {

    return hrmsCatch(
      res,
      err,
      "Employee delete failed",
      "The employee could not be deleted. Please try again."
    );
  }
};


// ======================================================
// GET EMPLOYEE NAME / ID
// ======================================================

export const getEmployeeNameId = async (req, res) => {

  try {

    const data =
      await EmployeeHrModal.find(

        {
          status: "active",
        },

        {
          firstName: 1,
          lastName: 1,
          code: 1,
          departmentId: 1,
          designationId: 1,
        }

      )

        .populate(
          "departmentId",
          "name"
        )

        .populate(
          "designationId",
          "name"
        );


    res.status(200).send({
      status: true,
      data,
    });

  } catch (err) {

    return hrmsCatch(
      res,
      err,
      "Employee load failed",
      "Employees could not be loaded. Please try again."
    );
  }
};


// ======================================================
// GET EMPLOYEES BY DEPARTMENT
// ======================================================

export const getEmployeesByDepartment = async (
  req,
  res
) => {

  try {

    const data =
      await EmployeeHrModal.find({

        departmentId:
          req.params.deptId,

        status: "active",

      }).populate(
        "designationId",
        "name"
      );


    res.status(200).send({
      status: true,
      data,
    });

  } catch (err) {

    return hrmsCatch(
      res,
      err,
      "Employees by department load failed",
      "The employees by department could not be loaded. Please try again."
    );
  }
};


// ======================================================
// UPDATE SALARY LINES
// ======================================================

export const updateSalaryLines = async (
  req,
  res
) => {

  try {

    const {
      salaryLines,
    } = req.body;


    const data =
      await EmployeeHrModal.findByIdAndUpdate(

        req.params.id,

        {
          salaryLines:
            salaryLines || [],
        },

        {
          new: true,
        }
      );


    if (!data) {

      return hrmsFail(
        res,
        404,
        "Employee not found",
        "No employee exists for this id."
      );
    }


    res.status(200).send({
      status: true,
      data,
    });

  } catch (err) {

    return hrmsCatch(
      res,
      err,
      "Salary lines update failed",
      "The salary lines could not be updated. Please try again."
    );
  }
};


// ======================================================
// ADD EMPLOYEES IN BULK
// ======================================================

export const AddEmployeeInBulk = async (
  req,
  res
) => {

  try {

    // --------------------------------------------------
    // Validate Body
    // --------------------------------------------------

    if (!Array.isArray(req.body)) {

      return res.status(400).send({
        status: false,
        message:
          "Request body must be an array",
      });
    }


    // --------------------------------------------------
    // Get Last Employee Code
    // --------------------------------------------------

    const lastEmp =
      await EmployeeHrModal
        .find()
        .sort({ code: -1 })
        .limit(1);


    let nextNumber =
      lastEmp.length === 0
        ? 1
        : parseInt(
            lastEmp[0].code,
            10
          ) + 1;


    // --------------------------------------------------
    // Default Off Days
    // --------------------------------------------------

    let defaultOffDays = [
      "Sunday",
    ];


    try {

      const companyPolicy =
        await CompanyPolicyModal.findOne();


      if (
        companyPolicy?.workWeek?.offDays?.length > 0
      ) {

        defaultOffDays =
          companyPolicy.workWeek.offDays;
      }

    } catch (error) {

      console.log(
        "Company policy load failed:",
        error.message
      );
    }


    // --------------------------------------------------
    // Results
    // --------------------------------------------------

    const results = [];


    // --------------------------------------------------
    // Create Employees
    // --------------------------------------------------

    for (const item of req.body) {

      const nextCode =
        nextNumber
          .toString()
          .padStart(4, "0");


      const employeeData = {

        ...item,

        code: nextCode,

        salarySetupBasket:
          item.salarySetupBasket || {

            basicSalary:
              item.salary || 0,

            allowances: [],

            deductions: [],
          },


        policyTags:
          item.policyTags || {

            religion: "Muslim",

            workWeek: {
              offDays:
                defaultOffDays,
            },
          },


        leaveBucket:
          item.leaveBucket || {

            casual: {
              allocated: 16,
              used: 0,
              balance: 16,
            },

            medical: {
              allocated: 10,
              used: 0,
              balance: 10,
            },

            annual: {
              allocated: 14,
              used: 0,
              balance: 14,
            },
          },
      };


      // ------------------------------------------------
      // Create Employee
      // ------------------------------------------------

      const data =
        await EmployeeHrModal.create(
          employeeData
        );


      // ------------------------------------------------
      // Create Employee Accounts
      // ------------------------------------------------

      await syncEmployeeAccounts(
        data,
        item
      );


      // ------------------------------------------------
      // Push Result
      // ------------------------------------------------

      results.push(data);


      nextNumber++;
    }


    // --------------------------------------------------
    // Response
    // --------------------------------------------------

    res.status(200).send({
      status: true,
      data: results,
    });

  } catch (err) {

    return hrmsCatch(
      res,
      err,
      "Employee in bulk save failed",
      "The employee in bulk could not be saved. Please try again."
    );
  }
};