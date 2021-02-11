"use strict";

/** Routes for companies. */

const jsonschema = require("jsonschema");
const express = require("express");

const { BadRequestError } = require("../expressError");
const {
  ensureLoggedIn,
  authenticateJWT,
  ensureAdmin,
} = require("../middleware/auth");
const Company = require("../models/company");

const companyNewSchema = require("../schemas/companyNew.json");
const companyUpdateSchema = require("../schemas/companyUpdate.json");

const router = new express.Router();

/** POST / { company } =>  { company }
 *
 * company should be { handle, name, description, numEmployees, logoUrl }
 *
 * Returns { handle, name, description, numEmployees, logoUrl }
 *
 * Authorization required: login, admin
 */

router.post(
  "/",

  authenticateJWT,
  ensureLoggedIn,
  ensureAdmin,
  async function (req, res, next) {
    try {
      const validator = jsonschema.validate(req.body, companyNewSchema);
      if (!validator.valid) {
        const errs = validator.errors.map((e) => e.stack);
        throw new BadRequestError(errs);
      }

      const company = await Company.create(req.body);
      return res.status(201).json({ company });
    } catch (err) {
      return next(err);
    }
  }
);

/** GET /  =>
 *   { companies: [ { handle, name, description, numEmployees, logoUrl }, ...] }
 *
 * Can filter on provided search filters:
 * - minEmployees
 * - maxEmployees
 * - nameLike (will find case-insensitive, partial matches)
 *
 * Authorization required: none
 */

router.get("/", async function (req, res, next) {
  try {
    let companies;
    let query = req.query;
    // Check the query string. does it contain name?
    if ("name" in query) {
      // Does query contain min or max? If so, we're going to use the Company.searchByNameAndSize() method to get our results:
      if ("min" in query || "max" in query) {
        // Set default values if one of min or max is missing
        let min = query.min ? query.min : 0;
        let max = query.max ? query.max : 7000000;

        // If the user passed in a minimum value that is above the maximum value, throw an error:
        if (min > max) {
          throw new BadRequestError("min must be below max");
        }

        // Get our results using the search by name and size.
        companies = await Company.searchByNameAndSize(query.name, min, max);
        //
      } else {
        // If min and max are not in the query, but name is, use the search by name method to get results:
        companies = await Company.searchByName(query.name);
        //
      }

      // If name is not in query, check for min or max:
    } else if ("min" in query || "max" in query) {
      // Again, set default values for min and max if one of them is missing
      let min = query.min ? query.min : 0;
      let max = query.max ? query.max : 7000000;

      // Check that min is below max, throw error if wrong
      if (min > max) {
        throw new BadRequestError("min must be below max");
      }

      // Use the search by size method to get results:
      companies = await Company.searchBySize(min, max);
      //
    } else {
      // If there are no accepted parameters in the query string, simply respond will all companies using Company.findAll()
      companies = await Company.findAll();
    }

    return res.json({ companies });
  } catch (err) {
    return next(err);
  }
});

/** GET /[handle]  =>  { company }
 *
 *  Company is { handle, name, description, numEmployees, logoUrl, jobs }
 *   where jobs is [{ id, title, salary, equity }, ...]
 *
 * Authorization required: none
 */

router.get("/:handle", async function (req, res, next) {
  try {
    const company = await Company.get(req.params.handle);
    return res.json({ company });
  } catch (err) {
    return next(err);
  }
});

/** PATCH /[handle] { fld1, fld2, ... } => { company }
 *
 * Patches company data.
 *
 * fields can be: { name, description, numEmployees, logo_url }
 *
 * Returns { handle, name, description, numEmployees, logo_url }
 *
 * Authorization required: login, admin
 */

router.patch(
  "/:handle",
  authenticateJWT,
  ensureLoggedIn,
  ensureAdmin,
  async function (req, res, next) {
    try {
      const validator = jsonschema.validate(req.body, companyUpdateSchema);
      if (!validator.valid) {
        const errs = validator.errors.map((e) => e.stack);
        throw new BadRequestError(errs);
      }

      const company = await Company.update(req.params.handle, req.body);
      return res.json({ company });
    } catch (err) {
      return next(err);
    }
  }
);

/** DELETE /[handle]  =>  { deleted: handle }
 *
 * Authorization: login, admin
 */

router.delete(
  "/:handle",
  authenticateJWT,
  ensureLoggedIn,
  ensureAdmin,

  async function (req, res, next) {
    try {
      await Company.remove(req.params.handle);
      return res.json({ deleted: req.params.handle });
    } catch (err) {
      return next(err);
    }
  }
);

module.exports = router;
