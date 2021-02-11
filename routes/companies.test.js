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
} = require("./_testCommon");
const Job = require("../models/job");
const Company = require("../models/company");

beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);

/************************************** POST /companies */

describe("POST /companies", function () {
  const newCompany = {
    handle: "new",
    name: "New",
    logoUrl: "http://new.img",
    description: "DescNew",
    numEmployees: 10,
  };

  test("ok for admin", async function () {
    const resp = await request(app)
      .post("/companies")
      .send(newCompany)
      .set("authorization", `Bearer ${u2TokenAdmin}`);
    expect(resp.statusCode).toEqual(201);
    expect(resp.body).toEqual({
      company: newCompany,
    });
  });

  test("bad request with missing data", async function () {
    const resp = await request(app)
      .post("/companies")
      .send({
        handle: "new",
        numEmployees: 10,
      })
      .set("authorization", `Bearer ${u2TokenAdmin}`);
    expect(resp.statusCode).toEqual(400);
  });

  test("bad request with invalid data", async function () {
    const resp = await request(app)
      .post("/companies")
      .send({
        ...newCompany,
        logoUrl: "not-a-url",
      })
      .set("authorization", `Bearer ${u2TokenAdmin}`);
    expect(resp.statusCode).toEqual(400);
  });

  test("request from non-admin user, should throw unauthoarized", async () => {
    const resp = await request(app)
      .post("/companies")
      .send(newCompany)
      .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toBe(401);
  });
});

/************************************** GET /companies */

describe("GET /companies", function () {
  test("ok for anon", async function () {
    const resp = await request(app).get("/companies");
    expect(resp.body).toEqual({
      companies: [
        {
          handle: "c1",
          name: "C1",
          description: "Desc1",
          numEmployees: 1,
          logoUrl: "http://c1.img",
        },
        {
          handle: "c2",
          name: "C2",
          description: "Desc2",
          numEmployees: 2,
          logoUrl: "http://c2.img",
        },
        {
          handle: "c3",
          name: "C3",
          description: "Desc3",
          numEmployees: 3,
          logoUrl: "http://c3.img",
        },
      ],
    });
  });

  test("fails: test next() handler", async function () {
    // there's no normal failure event which will cause this route to fail ---
    // thus making it hard to test that the error-handler works with it. This
    // should cause an error, all right :)
    await db.query("DROP TABLE companies CASCADE");
    const resp = await request(app)
      .get("/companies")
      .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(500);
  });

  test("test with name query param", async () => {
    const resp = await request(app).get("/companies?name=c1");
    expect(resp.statusCode).toBe(200);
    expect(resp.body.companies.length).toEqual(1);
    expect(resp.body.companies[0]).toEqual({
      handle: "c1",
      name: "C1",
      numEmployees: 1,
      description: "Desc1",
      logoUrl: "http://c1.img",
    });
  });

  test("test with min query param", async () => {
    const resp = await request(app).get("/companies?min=2");
    expect(resp.statusCode).toBe(200);
    expect(resp.body.companies.length).toEqual(2);
  });

  test("test with max query param", async () => {
    const resp = await request(app).get("/companies?max=1");
    expect(resp.statusCode).toBe(200);
    expect(resp.body.companies.length).toEqual(1);
    expect(resp.body.companies).toEqual([
      {
        handle: "c1",
        name: "C1",
        numEmployees: 1,
        description: "Desc1",
        logoUrl: "http://c1.img",
      },
    ]);
  });

  test("test with min and max query param", async () => {
    const resp = await request(app).get("/companies?min=2&max=5");
    expect(resp.statusCode).toBe(200);
    expect(resp.body.companies.length).toEqual(2);
    expect(resp.body.companies).toEqual([
      {
        handle: "c2",
        name: "C2",
        numEmployees: 2,
        description: "Desc2",
        logoUrl: "http://c2.img",
      },
      {
        handle: "c3",
        name: "C3",
        numEmployees: 3,
        description: "Desc3",
        logoUrl: "http://c3.img",
      },
    ]);
  });

  test("Test with name and min/max", async () => {
    const resp = await request(app).get("/companies?name=c&min=3&max=5");
    expect(resp.statusCode).toBe(200);
    expect(resp.body.companies.length).toEqual(1);
    expect(resp.body.companies).toEqual([
      {
        handle: "c3",
        name: "C3",
        numEmployees: 3,
        description: "Desc3",
        logoUrl: "http://c3.img",
      },
    ]);
  });

  test("Test with name that does not match any companies - check for error status", async () => {
    const resp = await request(app).get("/companies?name=invalid");
    expect(resp.statusCode).toBe(404);
    expect(resp.body).toEqual({
      error: { message: "No companies found", status: 404 },
    });
  });
});

/************************************** GET /companies/:handle */

describe("GET /companies/:handle", function () {
  test("works for anon", async function () {
    const resp = await request(app).get(`/companies/c1`);
    expect(resp.body).toEqual({
      company: {
        handle: "c1",
        name: "C1",
        description: "Desc1",
        numEmployees: 1,
        logoUrl: "http://c1.img",
        jobs: expect.any(Array),
      },
    });
  });

  test("works for anon: company w/o jobs", async function () {
    await Company.create({
      handle: "c4",
      name: "C4",
      description: "desc4",
      numEmployees: 4,
      logoUrl: "http://c4.img",
    });

    const allcomps = await request(app).get("/companies");
    expect(allcomps.body.companies.length).toEqual(4);

    const resp = await request(app).get(`/companies/c4`);
    expect(resp.body).toEqual({
      company: {
        handle: "c4",
        name: "C4",
        description: "desc4",
        numEmployees: 4,
        logoUrl: "http://c4.img",
        jobs: [],
      },
    });
  });

  test("not found for no such company", async function () {
    const resp = await request(app).get(`/companies/nope`);
    expect(resp.statusCode).toEqual(404);
  });
});

/************************************** PATCH /companies/:handle */

describe("PATCH /companies/:handle", function () {
  test("works for admin", async function () {
    const resp = await request(app)
      .patch(`/companies/c1`)
      .send({
        name: "C1-new",
      })
      .set("authorization", `Bearer ${u2TokenAdmin}`);
    expect(resp.body).toEqual({
      company: {
        handle: "c1",
        name: "C1-new",
        description: "Desc1",
        numEmployees: 1,
        logoUrl: "http://c1.img",
      },
    });
  });

  test("unauth for anon", async function () {
    const resp = await request(app).patch(`/companies/c1`).send({
      name: "C1-new",
    });
    expect(resp.statusCode).toEqual(401);
  });

  test("not found on no such company", async function () {
    const resp = await request(app)
      .patch(`/companies/nope`)
      .send({
        name: "new nope",
      })
      .set("authorization", `Bearer ${u2TokenAdmin}`);
    expect(resp.statusCode).toEqual(404);
  });

  test("bad request on handle change attempt", async function () {
    const resp = await request(app)
      .patch(`/companies/c1`)
      .send({
        handle: "c1-new",
      })
      .set("authorization", `Bearer ${u2TokenAdmin}`);
    expect(resp.statusCode).toEqual(400);
  });

  test("bad request on invalid data", async function () {
    const resp = await request(app)
      .patch(`/companies/c1`)
      .send({
        logoUrl: "not-a-url",
      })
      .set("authorization", `Bearer ${u2TokenAdmin}`);
    expect(resp.statusCode).toEqual(400);
  });

  test("unauth for non-admin", async function () {
    const resp = await request(app)
      .patch("/companies/c1")
      .send({ handle: "c1-new" })
      .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(401);
  });
});

/************************************** DELETE /companies/:handle */

describe("DELETE /companies/:handle", function () {
  test("works for admin user", async function () {
    const resp = await request(app)
      .delete(`/companies/c1`)
      .set("authorization", `Bearer ${u2TokenAdmin}`);
    expect(resp.body).toEqual({ deleted: "c1" });
  });

  test("unauth for anon", async function () {
    // const resp = await request(app).delete(`/companies/c1`);
    const resp = await request(app).delete("/companies/c1");
    expect(resp.statusCode).toEqual(401);
  });

  test("not found for no such company", async function () {
    const resp = await request(app)
      .delete(`/companies/nope`)
      .set("authorization", `Bearer ${u2TokenAdmin}`);
    expect(resp.statusCode).toEqual(404);
  });

  test("unauth for non-admin", async () => {
    const resp = await request(app)
      .delete("/companies/c1")
      .set("authorization", `Bearer ${u1Token}`);
  });
});
