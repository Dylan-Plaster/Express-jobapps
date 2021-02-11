"use strict";

const { set } = require("../app");
const db = require("../db");
const { BadRequestError, NotFoundError } = require("../expressError");
const { sqlForPartialUpdate } = require("../helpers/sql");

class Job {
  // Create a new company from incoming data:
  // {title, salary, equity, companyHandle}
  // **
  // Returns { id, title, salary, equity, companyHandle }
  // Throws BadRequestError if duplicate job already in database

  static async create({ title, salary, equity, companyHandle }) {
    const duplicateCheck = await db.query(
      `
        SELECT title FROM jobs WHERE title=$1 AND company_handle=$2
        `,
      [title, companyHandle]
    );

    if (duplicateCheck.rows[0]) {
      throw new BadRequestError(`Duplicate job: ${title}`);
    }

    // const handleCheck = await db.query(`
    //     SELECT company_handle FROM jobs
    // `);
    const handleCheck = await db.query(`SELECT handle FROM companies`);

    let handles = handleCheck.rows.map((r) => {
      return r.handle;
    });
    // console.log("************************************");
    // console.log(handleCheck.rows);
    // console.log("Bool:::::");
    // console.log(handles.includes(companyHandle));
    // console.log("************************************");
    if (!handles.includes(companyHandle)) {
      throw new BadRequestError(`Invalid companyHandle: ${companyHandle}`);
    }

    const result = await db.query(
      `
        INSERT INTO jobs
        (title, salary, equity, company_handle)
        VALUES ($1 , $2 , $3 , $4)
        RETURNING id, title, salary, equity, company_handle AS "companyHandle"
    `,
      [title, salary, equity, companyHandle]
    );

    const job = result.rows[0];

    return job;
  }

  // Find all jobs, joining the companies table to display the company name
  // returns [{id, title, salary, equity, companyName}]
  static async findAll() {
    const jobs = await db.query(`
        SELECT j.id, j.title, j.salary, j.equity, c.name AS "companyName" 
        FROM jobs AS j 
        JOIN companies AS c
        ON j.company_handle=c.handle
      `);

    return jobs.rows;
  }

  // Given a job id, return data about the job
  // returns { title, salary, equity, companyName}
  // throws NotFoundError if not found
  static async get(id) {
    const jobs = await db.query(
      `
        SELECT j.id, j.title, j.salary, j.equity, c.name AS "companyName"
        FROM jobs AS j
        JOIN companies AS c
        ON j.company_handle=c.handle
        WHERE j.id=$1
      `,
      [id]
    );

    const job = jobs.rows[0];

    if (!job) throw new NotFoundError(`No job found with id ${id}`);

    return job;
  }

  // Given a title, return search results (case insensitive) for that job title
  // returns a list of job instances
  static async searchByTitle(title) {
    // add the wildcard operator to each side of the title being searched
    title = "%" + title + "%";

    const result = await db.query(
      `SELECT j.id, j.title, j.salary, j.equity, c.name AS "companyName" 
      FROM jobs AS j
      JOIN companies AS c 
      ON j.company_handle=c.handle
      WHERE j.title ILIKE $1`,
      [title]
    );

    const jobs = result.rows;

    // throw notfounderror if no jobs found with given title
    if (jobs.length == 0)
      throw new NotFoundError(`No jobs found with title: ${title}`);

    // return results
    return jobs;
  }

  // Given a min salary, find jobs which offer that salary or higher. throw notfound if no jobs found
  // returns a list of job instances
  static async searchByMinSalary(minSalary) {
    console.log("Here");
    // Query the db
    const result = await db.query(
      `
      SELECT j.id, j.title, j.salary, j.equity, c.name AS "companyName"
      FROM jobs AS j
      JOIN companies AS c
      ON j.company_handle=c.handle
      WHERE j.salary >= $1
      `,
      [minSalary]
    );

    const jobs = result.rows;

    // If no results, throw not Found
    if (jobs.length == 0)
      throw new NotFoundError(`No jobs found with salary ${minSalary} or more`);

    return jobs;
  }

  // Search for jobs with a non-zero amount of equity
  static async searchByEquity() {
    const result = await db.query(`
    SELECT j.id, j.title, j.salary, j.equity, c.name AS "companyName"
    FROM jobs AS j
    JOIN companies AS c
    ON j.company_handle=c.handle
    WHERE j.equity > 0
    `);

    const jobs = result.rows;

    if (jobs.length == 0)
      throw new NotFoundError(`No jobs found with equity > 0`);

    return jobs;
  }

  static async searchByEquityAndSalary(minSalary) {
    const result = await db.query(
      `
    SELECT j.id, j.title, j.salary, j.equity, c.name AS "companyName"
    FROM jobs AS j
    JOIN companies AS c
    ON j.company_handle=c.handle
    WHERE j.equity > 0 AND j.salary >= $1
      `,
      [minSalary]
    );

    const jobs = result.rows;

    if (jobs.length == 0)
      throw new NotFoundError(
        `No jobs found with equity > 0 and salary >= ${minSalary}`
      );

    return jobs;
  }

  // Search by title and minsalary
  static async searchByTitleAndSalary(title, minSalary) {
    title = "%" + title + "%";
    const result = await db.query(
      `
        SELECT j.id, j.title, j.salary, j.equity, c.name AS "companyName"
        FROM jobs AS j
        JOIN companies AS c
        ON j.company_handle=c.handle
        WHERE j.title ILIKE $1 AND j.salary >=$2
    `,
      [title, minSalary]
    );

    const jobs = result.rows;

    if (jobs.length == 0)
      throw new NotFoundError(
        `No jobs found with title '${title}' and salary ${minSalary} or more`
      );

    return jobs;
  }

  // Search by title and non-zero equity
  static async searchByTitleAndEquity(title) {
    title = "%" + title + "%";
    const result = await db.query(
      `
      SELECT j.id, j.title, j.salary, j.equity, c.name AS "companyName"
      FROM jobs AS j
      JOIN companies AS c
      ON j.company_handle=c.handle
      WHERE j.title ILIKE $1 AND j.equity > 0
      `,
      [title]
    );

    const jobs = result.rows;

    if (jobs.length == 0)
      throw new NotFoundError(
        `No jobs found with title '${title}' and equity > 0`
      );

    return jobs;
  }

  //Search by title, minSalary, and equity > 0
  static async searchByTitleEquityAndSalary(title, minSalary) {
    title = "%" + title + "%";
    const result = await db.query(
      `
      SELECT j.id, j.title, j.salary, j.equity, c.name AS "companyName"
      FROM jobs AS j
      JOIN companies AS c
      ON j.company_handle=c.handle
      WHERE j.title ILIKE $1 AND j.equity > 0 AND j.salary >= $2
      `,
      [title, minSalary]
    );

    const jobs = result.rows;

    if (jobs.length == 0)
      throw new NotFoundError(
        `No jobs found with title ${title} and salary > ${minSalary} and equity > 0`
      );

    return jobs;
  }

  static async update(id, data) {
    // Make sure the user can not update the ID or company name

    if ("id" in data) {
      delete data["id"];
    }
    if ("companyHandle") {
      delete data["companyHandle"];
    }
    const { setCols, values } = sqlForPartialUpdate(data, {});

    const idVariableIndex = "$" + (values.length + 1);

    const query = `
        UPDATE jobs SET ${setCols}
        WHERE id = ${idVariableIndex}
        RETURNING id, title, salary, equity, company_handle AS "companyHandle"
    `;
    const result = await db.query(query, [...values, id]);
    const job = result.rows[0];

    if (!job) throw new NotFoundError(`No job with id ${id}`);

    return job;
  }

  static async remove(id) {
    const result = await db.query(
      `
        DELETE FROM jobs WHERE id = $1
        RETURNING id
      `,
      [id]
    );

    const job = result.rows[0];

    if (!job) throw new NotFoundError(`No job found with id ${id}`);
  }
}

module.exports = Job;
