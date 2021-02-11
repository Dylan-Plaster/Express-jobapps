"use strict";

const request = require("supertest");
const db = require("../db");
const app = require("../app");
const {
  commonBeforeAll,
  commonBeforeEach,
  commonAfterEach,
  commonAfterAll,
  u1Token,
  u2TokenAdmin,
} = require("./_testCommon.js");
const { strikethrough } = require("colors");
const Job = require("../models/job");

beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);

describe("POST /jobs", function () {
  const newJob = {
    title: "sales associate",
    salary: 55,
    equity: "0",
    companyHandle: "c1",
  };

  test("works for admin", async function () {
    const resp = await request(app)
      .post("/jobs")
      .send(newJob)
      .set("authorization", `Bearer ${u2TokenAdmin}`);
    expect(resp.statusCode).toBe(201);
    expect(resp.body).toEqual({ job: { id: expect.any(Number), ...newJob } });
  });

  test("bad request for missing data", async () => {
    const resp = await request(app)
      .post("/jobs")
      .send({
        title: "j5",
        salary: 10,
      })
      .set("authorization", `Bearer ${u2TokenAdmin}`);
    expect(resp.statusCode).toBe(400);
  });

  test("bad request with invalid data", async () => {
    const resp = await request(app)
      .post("/jobs")
      .send({ ...newJob, salary: "string" })
      .set("authorization", `Bearer ${u2TokenAdmin}`);
    expect(resp.statusCode).toBe(400);
  });

  test("unauth for non-admin", async () => {
    const resp = await request(app)
      .post("/jobs")
      .send(newJob)
      .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toBe(401);
  });

  test("unauth for not-logged-in user", async () => {
    const resp = await request(app).post("/jobs").send(newJob);
    expect(resp.statusCode).toBe(401);
  });
});

describe("GET /jobs", function () {
  test("ok for anon", async function () {
    const resp = await request(app).get("/jobs");

    expect(resp.statusCode).toBe(200);
    expect(resp.body).toEqual({
      jobs: [
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
      ],
    });
  });

  test("fails: test next() handler", async function () {
    await db.query("DROP TABLE jobs CASCADE");
    const resp = await request(app)
      .get("/jobs")
      .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toBe(500);
  });

  test("works with id at /jobs/id", async () => {
    let all = await db.query("SELECT id FROM jobs LIMIT 1");
    let id = all.rows[0].id;
    const resp = await request(app).get(`/jobs/${id}`);

    expect(resp.statusCode).toBe(200);
    expect(resp.body.job).toEqual({
      id: id,
      title: "j1",
      salary: 1,
      equity: "0.1",
      companyName: "C1",
    });
  });

  test("works with title query param", async function () {
    const resp = await request(app).get("/jobs?title=j1");
    expect(resp.statusCode).toBe(200);
    expect(resp.body.jobs.length).toEqual(1);
    expect(resp.body.jobs[0]).toEqual({
      id: expect.any(Number),
      title: "j1",
      salary: 1,
      equity: "0.1",
      companyName: "C1",
    });

    //test case insensitive:
    const resp2 = await request(app).get("/jobs?title=J2");
    expect(resp2.statusCode).toBe(200);
    expect(resp2.body.jobs.length).toEqual(1);
    expect(resp2.body.jobs[0]).toEqual({
      id: expect.any(Number),
      title: "j2",
      salary: 2,
      equity: "0.2",
      companyName: "C2",
    });
  });

  test("works with minSalary query param", async () => {
    const resp = await request(app).get("/jobs?minSalary=2");
    expect(resp.statusCode).toBe(200);
    expect(resp.body.jobs.length).toEqual(2);
    expect(resp.body.jobs).toEqual([
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

    const resp2 = await request(app).get("/jobs?minSalary=3");
    expect(resp2.statusCode).toBe(200);
    expect(resp2.body.jobs.length).toEqual(1);
    expect(resp2.body.jobs).toEqual([
      {
        id: expect.any(Number),
        title: "j3",
        salary: 3,
        equity: "0.3",
        companyName: "C3",
      },
    ]);
  });

  test("works with hasEquity query param", async () => {
    let j4 = await Job.create({
      title: "j4",
      salary: 4,
      equity: "0",
      companyHandle: "c1",
    });
    const allres = await request(app).get("/jobs");
    expect(allres.body.jobs.length).toEqual(4);

    const resp = await request(app).get("/jobs?hasEquity=true");
    expect(resp.statusCode).toEqual(200);
    expect(resp.body.jobs.length).toEqual(3);
    expect(j4 in resp.body.jobs).toBeFalsy();

    // test setting the value to false
    const falseres = await request(app).get("/jobs?hasEquity=false");
    expect(falseres.statusCode).toEqual(200);
    expect(falseres.body.jobs.length).toEqual(4);
  });

  test("works with title and minSalary query params", async () => {
    // Set up a 4th test job in the database with a salary of 50
    let j4 = await Job.create({
      title: "j4",
      salary: 50,
      equity: "0",
      companyHandle: "c1",
    });
    const allres = await request(app).get("/jobs");
    expect(allres.body.jobs.length).toEqual(4);

    const resp = await request(app).get("/jobs?title=j&minSalary=3");
    expect(resp.statusCode).toBe(200);
    expect(resp.body.jobs.length).toEqual(2);

    const resp2 = await request(app).get("/jobs?title=j&minSalary=15");
    expect(resp2.statusCode).toEqual(200);
    expect(resp2.body.jobs.length).toEqual(1);
    expect(resp2.body.jobs[0]).toEqual({
      id: expect.any(Number),
      title: "j4",
      salary: 50,
      equity: "0",
      companyName: "C1",
    });
  });

  test("works with title and hasEquity query params", async () => {
    // Set up a 4th test job in the database with a equity of 0
    let j4 = await Job.create({
      title: "j4",
      salary: 50,
      equity: "0",
      companyHandle: "c1",
    });
    let j5 = await Job.create({
      title: "d5",
      salary: 50,
      equity: "0.1",
      companyHandle: "c1",
    });
    const allres = await request(app).get("/jobs");
    expect(allres.body.jobs.length).toEqual(5);

    const resp = await request(app).get("/jobs?title=j&hasEquity=true");
    expect(resp.statusCode).toBe(200);
    expect(resp.body.jobs.length).toEqual(3);

    const resp2 = await request(app).get("/jobs?title=d&hasEquity=true");
    expect(resp2.statusCode).toBe(200);
    expect(resp2.body.jobs.length).toEqual(1);
  });

  test("works with minSalary and hasEquity", async () => {
    let j4 = await Job.create({
      title: "j4",
      salary: 51,
      equity: "0",
      companyHandle: "c1",
    });
    let j5 = await Job.create({
      title: "d5",
      salary: 55,
      equity: "0.1",
      companyHandle: "c1",
    });
    const allres = await request(app).get("/jobs");
    expect(allres.body.jobs.length).toEqual(5);

    const resp = await request(app).get("/jobs?minSalary=50&hasEquity=true");
    expect(resp.statusCode).toEqual(200);
    expect(resp.body.jobs.length).toEqual(1);
    expect(resp.body.jobs[0]).toEqual({
      id: expect.any(Number),
      title: "d5",
      salary: 55,
      equity: "0.1",
      companyName: "C1",
    });

    const resp2 = await request(app).get("/jobs?minSalary=50&hasEquity=false");
    expect(resp2.statusCode).toEqual(200);
    console.log(resp2.body.jobs);
    expect(resp2.body.jobs.length).toEqual(2);
    expect(resp2.body.jobs).toEqual([
      {
        id: expect.any(Number),
        title: "j4",
        salary: 51,
        equity: "0",
        companyName: "C1",
      },
      {
        id: expect.any(Number),
        title: "d5",
        salary: 55,
        equity: "0.1",
        companyName: "C1",
      },
    ]);
  });

  test("works with title, hasEquity, AND minSalary query params", async () => {
    // Set up extra jobs to test query params:
    let j4 = await Job.create({
      title: "j4",
      salary: 50,
      equity: "0",
      companyHandle: "c1",
    });

    let j5 = await Job.create({
      title: "d5",
      salary: 50,
      equity: "0.1",
      companyHandle: "c1",
    });

    let j6 = await Job.create({
      title: "j6",
      salary: 55,
      equity: "0.1",
      companyHandle: "c1",
    });
    const allres = await request(app).get("/jobs");
    expect(allres.body.jobs.length).toEqual(6);

    const resp = await request(app).get(
      "/jobs?title=j&minSalary=45&hasEquity=true"
    );
    expect(resp.statusCode).toBe(200);
    expect(resp.body.jobs.length).toEqual(1);
    expect(resp.body.jobs[0]).toEqual({
      id: expect.any(Number),
      title: "j6",
      salary: 55,
      equity: "0.1",
      companyName: "C1",
    });

    const resp2 = await request(app).get(
      "/jobs?title=d&minSalary=45&hasEquity=true"
    );
    expect(resp2.statusCode).toBe(200);
    expect(resp2.body.jobs.length).toEqual(1);
    expect(resp2.body.jobs[0]).toEqual({
      id: expect.any(Number),
      title: "d5",
      salary: 50,
      equity: "0.1",
      companyName: "C1",
    });
  });
});

describe("PATCH /jobs/:id", () => {
  test("works for admin", async () => {
    let jobs = await db.query(`SELECT id FROM jobs LIMIT 1`);
    let id = jobs.rows[0].id;
    const resp = await request(app)
      .patch(`/jobs/${id}`)
      .send({ title: "j1-new" })
      .set("authorization", `Bearer ${u2TokenAdmin}`);
    expect(resp.statusCode).toBe(200);
    expect(resp.body).toEqual({
      job: {
        id: id,
        title: "j1-new",
        salary: 1,
        equity: "0.1",
        companyHandle: "c1",
      },
    });
    const resp2 = await request(app)
      .patch(`/jobs/${id}`)
      .send({ title: "j1-new-2", salary: 500, equity: "0.9" })
      .set("authorization", `Bearer ${u2TokenAdmin}`);
    expect(resp2.statusCode).toBe(200);
    expect(resp2.body).toEqual({
      job: {
        id: id,
        title: "j1-new-2",
        salary: 500,
        equity: "0.9",
        companyHandle: "c1",
      },
    });
  });

  test("Bad Request for invalid data", async () => {
    let jobs = await db.query(`SELECT id FROM jobs LIMIT 1`);
    let id = jobs.rows[0].id;
    const resp = await request(app)
      .patch(`/jobs/${id}`)
      .send({ title: "j1-new", companyHandle: "invalidHandle" })
      .set("authorization", `Bearer ${u2TokenAdmin}`);
    console.log(resp.body);
    expect(resp.statusCode).toBe(400);

    const resp2 = await request(app)
      .patch(`/jobs/${id}`)
      .send({ id: 9999 })
      .set("authorization", `Bearer ${u2TokenAdmin}`);

    expect(resp2.statusCode).toBe(400);
  });

  test("unauth for not-logged in", async () => {
    let jobs = await db.query(`SELECT id FROM jobs LIMIT 1`);
    let id = jobs.rows[0].id;
    const resp = await request(app)
      .patch(`/jobs/${id}`)
      .send({ title: "j1-new" });

    expect(resp.statusCode).toBe(401);
  });

  test("unauth for non-admin", async () => {
    let jobs = await db.query(`SELECT id FROM jobs LIMIT 1`);
    let id = jobs.rows[0].id;
    const resp = await request(app)
      .patch(`/jobs/${id}`)
      .send({ title: "j1-new" })
      .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toBe(401);
  });

  test("not found for no such company", async () => {
    const resp = await request(app)
      .patch("/jobs/99999")
      .send({ title: "j1-new" })
      .set("authorization", `Bearer ${u2TokenAdmin}`);
    expect(resp.statusCode).toBe(404);
  });
});

describe("DELETE /jobs/id", () => {
  test("works for admin", async () => {
    let jobs = await db.query(`SELECT id FROM jobs LIMIT 1`);
    let id = jobs.rows[0].id;
    const resp = await request(app)
      .delete(`/jobs/${id}`)
      .set("authorization", `Bearer ${u2TokenAdmin}`);
    expect(resp.statusCode).toBe(200);
    expect(resp.body).toEqual({ deleted: String(id) });
  });

  test("unauth for anon", async function () {
    let jobs = await db.query(`SELECT id FROM jobs LIMIT 1`);
    let id = jobs.rows[0].id;
    const resp = await request(app).delete(`/jobs/${id}`);
    expect(resp.statusCode).toEqual(401);
  });

  test("not found for no such company", async function () {
    const resp = await request(app)
      .delete(`/jobs/99999`)
      .set("authorization", `Bearer ${u2TokenAdmin}`);
    expect(resp.statusCode).toEqual(404);
  });

  test("unauth for non-admin", async () => {
    let jobs = await db.query(`SELECT id FROM jobs LIMIT 1`);
    let id = jobs.rows[0].id;
    const resp = await request(app)
      .delete(`/jobs/${id}`)
      .set("authorization", `Bearer ${u1Token}`);
  });
});
