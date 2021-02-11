"use strict";

const db = require("../db.js");
const { BadRequestError, NotFoundError } = require("../expressError");
const Job = require("./job.js");
const {
  commonBeforeAll,
  commonBeforeEach,
  commonAfterEach,
  commonAfterAll,
} = require("./_testCommon.js");

beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);

/******************* create */
describe("create", function () {
  const newJob = {
    title: "new",
    salary: 5,
    equity: "0.5",
    companyHandle: "c1",
  };

  test("works", async () => {
    let job = await Job.create(newJob);
    expect(job).toEqual({
      id: expect.any(Number),
      ...newJob,
    });
    const result = await db.query(`
            SELECT id, title, salary, equity, company_handle AS "companyHandle"
             FROM jobs
             WHERE title = 'new'
         `);
    // console.log(result.rows[0]);
    expect(result.rows).toEqual([
      {
        id: expect.any(Number),
        title: "new",
        salary: 5,
        equity: "0.5",
        companyHandle: "c1",
      },
    ]);
  });

  test("bad request with duplicates", async function () {
    try {
      await Job.create(newJob);
      await Job.create(newJob);
    } catch (err) {
      expect(err instanceof BadRequestError).toBeTruthy();
    }
  });

  test("BadRequestError for invalid companyHandle", async () => {
    expect.assertions(1);
    try {
      await Job.create({
        title: "testtitle",
        salary: 66,
        equity: "0",
        companyHandle: "d7",
      });
    } catch (err) {
      expect(err instanceof BadRequestError).toBeTruthy();
    }
  });
});

describe("findAll", () => {
  test("works", async () => {
    let jobs = await Job.findAll();
    expect(jobs).toEqual([
      {
        id: expect.any(Number),
        title: "j1",
        salary: 1,
        equity: "0.1",
        companyName: "C1",
      },
      {
        id: expect.any(Number),
        title: "j2",
        salary: 2,
        equity: "0.2",
        companyName: "C2",
      },
      {
        id: expect.any(Number),
        title: "j3",
        salary: 3,
        equity: "0.3",
        companyName: "C3",
      },
    ]);
  });
});

describe("get", () => {
  test("works", async () => {
    let all = await Job.findAll();
    let id = all[0]["id"];
    let job = await Job.get(id);
    expect(job).toEqual({
      id: expect.any(Number),
      title: "j1",
      salary: 1,
      equity: "0.1",
      companyName: "C1",
    });
  });

  test("NotFoundError if no job with that id", async () => {
    try {
      await Job.get("99999");
    } catch (err) {
      expect(err instanceof NotFoundError).toBeTruthy();
    }
  });
});

describe("searchByTitle", () => {
  test("works", async () => {
    let jobs = await Job.searchByTitle("j1");
    expect(jobs.length).toEqual(1);
    expect(jobs[0]).toEqual({
      id: expect.any(Number),
      title: "j1",
      salary: 1,
      equity: "0.1",
      companyName: "C1",
    });

    let jobs2 = await Job.searchByTitle("j");
    expect(jobs2.length).toEqual(3);
  });

  test("Not Found for invalid title", async () => {
    expect.assertions(1);
    try {
      let jobs = await Job.searchByTitle("NoJobHasThisTitle");
    } catch (err) {
      expect(err instanceof NotFoundError).toBeTruthy();
    }
  });
});

describe("searchByMinSalary", () => {
  test("works", async () => {
    let jobs = await Job.searchByMinSalary(2);
    expect(jobs.length).toEqual(2);

    let jobs2 = await Job.searchByMinSalary(3);
    expect(jobs2.length).toEqual(1);
  });

  test("throws Not found when no results", async () => {
    expect.assertions(1);
    try {
      let jobs = await Job.searchByMinSalary(500);
    } catch (err) {
      expect(err instanceof NotFoundError).toBeTruthy();
    }
  });
});

describe("SearchbyEquity", () => {
  test("works", async () => {
    let jobs = await Job.searchByEquity();
    expect(jobs.length).toEqual(3);

    await Job.create({
      title: "test1",
      salary: 5,
      equity: 0,
      companyHandle: "c1",
    });
    let jobs2 = await Job.searchByEquity();
    expect(jobs2.length).toEqual(3);
  });
});

describe("SearchbyTitleAndSalary", () => {
  test("works", async () => {
    await Job.create({
      title: "j10",
      salary: 10,
      equity: "0",
      companyHandle: "c1",
    });
    let jobs = await Job.searchByTitleAndSalary("j", 5);
    expect(jobs.length).toBe(1);

    let jobs2 = await Job.searchByTitleAndSalary("j", 2);
    expect(jobs2.length).toEqual(3);
  });
});

describe("searchByTitleEquityAndSalary", () => {
  test("works", async () => {
    await Job.create({
      title: "d10",
      salary: 100,
      equity: "0.5",
      companyHandle: "c1",
    });
    await Job.create({
      title: "d90",
      salary: 500,
      equity: "0",
      companyHandle: "c1",
    });
    await Job.create({
      title: "d99",
      salary: 550,
      equity: "0.1",
      companyHandle: "c1",
    });

    let jobs = await Job.searchByTitleEquityAndSalary("d", 50);

    expect(jobs.length).toEqual(2);
    let jobs2 = await Job.searchByTitleEquityAndSalary("d", 400);

    expect(jobs2.length).toEqual(1);
  });
});

describe("update", () => {
  test("works", async function () {
    let data = { title: "updated", salary: 500, equity: "0.9" };
    let all = await Job.findAll();
    let id = all[0]["id"];
    let result = await Job.update(id, data);
    expect(result).toEqual({
      id: expect.any(Number),
      title: "updated",
      salary: 500,
      equity: "0.9",
      companyHandle: "c1",
    });
  });

  test("does not allow user to update id or company handle", async () => {
    expect.assertions(2);
    let data = { id: 9999, companyHandle: "invalid", title: "test" };
    let all = await Job.findAll();
    let id = all[0]["id"];
    let result = await Job.update(id, data);
    expect(result).toEqual({
      id: expect.any(Number),
      title: "test",
      salary: 1,
      equity: "0.1",
      companyHandle: "c1",
    });

    try {
      await Job.get(9999);
    } catch (err) {
      expect(err instanceof NotFoundError).toBeTruthy();
    }
  });

  test("NotFoundError for invalid id", async () => {
    let data = { title: "updated", salary: 500, equity: "0.9" };
    try {
      let result = await Job.update(9999, data);
    } catch (err) {
      expect(err instanceof NotFoundError).toBeTruthy();
    }
  });
});

describe("remove", () => {
  test("works", async () => {
    let all = await Job.findAll();
    let length = all.length;
    let id = all[0]["id"];
    await Job.remove(id);

    let newarr = await Job.findAll();
    let newLength = newarr.length;
    expect(newLength).toEqual(length - 1);
  });

  test("NotFoundError for invalid id", async () => {
    try {
      await Job.remove(9999);
    } catch (err) {
      expect(err instanceof NotFoundError).toBeTruthy();
    }
  });
});
