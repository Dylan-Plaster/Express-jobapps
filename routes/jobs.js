"use strict";

/** Routes for Jobs */

const jsonschema = require("jsonschema");
const express = require("express");
const { BadRequestError } = require("../expressError");
const {
  ensureLoggedIn,
  authenticateJWT,
  ensureAdmin,
} = require("../middleware/auth.js");
const Job = require("../models/job.js");

const jobNewSchema = require("../schemas/jobNew.json");
const jobUpdateSchema = require("../schemas/jobUpdate.json");
const { request } = require("express");

const router = new express.Router();

/** POST /jobs/ { jobData } => { job }
 *
 * jobData should be: { title, salary, equity, companyHandle }
 *
 * returns: { id, title, salary, equity, companyHandle }
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
      const validator = jsonschema.validate(req.body, jobNewSchema);
      if (!validator.valid) {
        const errors = validator.errors.map((err) => err.stack);
        throw new BadRequestError(errors);
      }

      const job = await Job.create(req.body);
      return res.status(201).json({ job });
    } catch (err) {
      return next(err);
    }
  }
);

/** GET /jobs/ => [ { id, title, salary, equity, companyName}]
 *
 * Can filter by title, minSalary, hasEquity true/false
 *
 * Authorization required: None
 */

router.get("/", async function (req, res, next) {
  try {
    let jobs;
    let query = req.query;

    // Check for filtering in the query.Check if all three query params are present:
    if ("title" in query) {
      if ("minSalary" in query) {
        if ("hasEquity" in query && query.hasEquity == "true") {
          // Here, all three filters are active
          jobs = await Job.searchByTitleEquityAndSalary(
            query.title,
            query.minSalary
          );

          // else, title and minSalary are present as query params:
        } else {
          // Here, the title and Salary filters are active
          jobs = await Job.searchByTitleAndSalary(query.title, query.minSalary);
        }

        // title is in the query, but minSalary is not present.
        // Check if hasEquity is in the query and set to true:
      } else if ("hasEquity" in query && query.hasEquity == "true") {
        // Here, title and Equity filters are acitve
        jobs = await Job.searchByTitleAndEquity(query.title);

        // else, the query string contains ONLY the title parameter
      } else {
        // Here, only the title filter is active
        jobs = await Job.searchByTitle(query.title);
      }

      // Title is not in the query. Check for minSalary and hasEquity:
    } else if ("minSalary" in query) {
      if ("hasEquity" in query && query.hasEquity == "true") {
        // Here, salary and equity filters are active
        jobs = await Job.searchByEquityAndSalary(query.minSalary);

        // else, query string contains ONLY minSalary
      } else {
        // here, the salary filter is active
        jobs = await Job.searchByMinSalary(query.minSalary);
      }

      // Title and minSalary are NOT in the query string. Check for hasEquity:
    } else if ("hasEquity" in query && query.hasEquity == "true") {
      // Here, the hasEquity filter is active
      jobs = await Job.searchByEquity();

      // else, NO FILTERS are active:
    } else {
      // Here, no filters are active, find all jobs
      jobs = await Job.findAll();
    }

    // return job results
    return res.json({ jobs });
  } catch (err) {
    return next(err);
  }
});

/** GET /jobs/:id => { job }
 *
 * Query param: ID integer
 *
 * returns: {job: {id, title, salary, equity, companyName}}
 *
 * Authorization: NONE
 */

router.get("/:id", async function (req, res, next) {
  try {
    const job = await Job.get(req.params.id);
    return res.json({ job });
  } catch (err) {
    return next(err);
  }
});

/** PATCH /jobs/id {field1, field2, ...} = > { job }
 *
 * Patches job data
 *
 * fields can be: {title, salary, equity}
 *
 * returns { id, title, salary, equity, companyHandle }
 *
 * Auth required: Login, admin
 */

router.patch(
  "/:id",
  authenticateJWT,
  ensureLoggedIn,
  ensureAdmin,
  async (req, res, next) => {
    try {
      const validator = jsonschema.validate(req.body, jobUpdateSchema);
      if (!validator.valid) {
        const errs = validator.errors.map((e) => e.stack);
        throw new BadRequestError(errs);
      }

      const job = await Job.update(req.params.id, req.body);
      return res.json({ job });
    } catch (err) {
      return next(err);
    }
  }
);

/** DELETE /jobs/id => { deleted: id }
 *
 * Authorization: login, admin
 */

router.delete(
  "/:id",
  authenticateJWT,
  ensureLoggedIn,
  ensureAdmin,
  async (req, res, next) => {
    try {
      await Job.remove(req.params.id);
      return res.json({ deleted: req.params.id });
    } catch (err) {
      return next(err);
    }
  }
);

module.exports = router;
