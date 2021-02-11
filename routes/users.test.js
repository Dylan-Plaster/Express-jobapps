"use strict";

const request = require("supertest");

const db = require("../db.js");
const app = require("../app");
const User = require("../models/user");

const {
  commonBeforeAll,
  commonBeforeEach,
  commonAfterEach,
  commonAfterAll,
  u1Token,
  u2TokenAdmin,
} = require("./_testCommon");

beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);

/************************************** POST /users */

describe("POST /users", function () {
  test("works for users: create non-admin", async function () {
    const resp = await request(app)
      .post("/users")
      .send({
        username: "u-new",
        firstName: "First-new",
        lastName: "Last-newL",
        password: "password-new",
        email: "new@email.com",
        isAdmin: false,
      })
      .set("authorization", `Bearer ${u2TokenAdmin}`);
    expect(resp.statusCode).toEqual(201);
    expect(resp.body).toEqual({
      user: {
        username: "u-new",
        firstName: "First-new",
        lastName: "Last-newL",
        email: "new@email.com",
        isAdmin: false,
      },
      token: expect.any(String),
    });
  });

  test("works for users: create admin", async function () {
    const resp = await request(app)
      .post("/users")
      .send({
        username: "u-new",
        firstName: "First-new",
        lastName: "Last-newL",
        password: "password-new",
        email: "new@email.com",
        isAdmin: true,
      })
      .set("authorization", `Bearer ${u2TokenAdmin}`);
    expect(resp.statusCode).toEqual(201);
    expect(resp.body).toEqual({
      user: {
        username: "u-new",
        firstName: "First-new",
        lastName: "Last-newL",
        email: "new@email.com",
        isAdmin: true,
      },
      token: expect.any(String),
    });
  });

  test("unauth for anon", async function () {
    const resp = await request(app).post("/users").send({
      username: "u-new",
      firstName: "First-new",
      lastName: "Last-newL",
      password: "password-new",
      email: "new@email.com",
      isAdmin: true,
    });
    expect(resp.statusCode).toEqual(401);
  });

  test("unauth for non-admin", async () => {
    const resp = await request(app)
      .post("/users")
      .send({
        username: "u-new",
        firstName: "First-new",
        lastName: "Last-newL",
        password: "password-new",
        email: "new@email.com",
        isAdmin: true,
      })
      .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(401);
  });

  test("bad request if missing data", async function () {
    const resp = await request(app)
      .post("/users")
      .send({
        username: "u-new",
      })
      .set("authorization", `Bearer ${u2TokenAdmin}`);
    expect(resp.statusCode).toEqual(400);
  });

  test("bad request if invalid data", async function () {
    const resp = await request(app)
      .post("/users")
      .send({
        username: "u-new",
        firstName: "First-new",
        lastName: "Last-newL",
        password: "password-new",
        email: "not-an-email",
        isAdmin: true,
      })
      .set("authorization", `Bearer ${u2TokenAdmin}`);
    expect(resp.statusCode).toEqual(400);
  });
});

/************************************** GET /users */

describe("GET /users", function () {
  test("works for admin users", async function () {
    const resp = await request(app)
      .get("/users")
      .set("authorization", `Bearer ${u2TokenAdmin}`);
    expect(resp.body).toEqual({
      users: [
        {
          username: "u1",
          firstName: "U1F",
          lastName: "U1L",
          email: "user1@user.com",
          isAdmin: false,
        },
        {
          username: "u2",
          firstName: "U2F",
          lastName: "U2L",
          email: "user2@user.com",
          isAdmin: false,
        },
        {
          username: "u3",
          firstName: "U3F",
          lastName: "U3L",
          email: "user3@user.com",
          isAdmin: false,
        },
      ],
    });
  });

  test("unauth for anon", async function () {
    const resp = await request(app).get("/users");
    expect(resp.statusCode).toEqual(401);
  });

  test("unauth for non-admin", async function () {
    const resp = await request(app)
      .get("/users")
      .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toBe(401);
  });

  test("fails: test next() handler", async function () {
    // there's no normal failure event which will cause this route to fail ---
    // thus making it hard to test that the error-handler works with it. This
    // should cause an error, all right :)
    await db.query("DROP TABLE users CASCADE");
    const resp = await request(app)
      .get("/users")
      .set("authorization", `Bearer ${u2TokenAdmin}`);
    expect(resp.statusCode).toEqual(500);
  });
});

/************************************** GET /users/:username */

describe("GET /users/:username", function () {
  test("works for users", async function () {
    const resp = await request(app)
      .get(`/users/u1`)
      .set("authorization", `Bearer ${u1Token}`);
    expect(resp.body).toEqual({
      user: {
        username: "u1",
        firstName: "U1F",
        lastName: "U1L",
        email: "user1@user.com",
        isAdmin: false,
      },
    });
  });

  test("unauth for anon", async function () {
    const resp = await request(app).get(`/users/u1`);
    expect(resp.statusCode).toEqual(401);
  });

  test("not found if user not found", async function () {
    const resp = await request(app)
      .get(`/users/nope`)
      .set("authorization", `Bearer ${u2TokenAdmin}`);
    expect(resp.statusCode).toEqual(404);
  });

  test("unauth for viewing different user's page", async () => {
    const resp = await request(app)
      .get("/users/u2")
      .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toBe(401);
  });

  test("works for admin viewing other's details", async () => {
    const resp = await request(app)
      .get("/users/u3")
      .set("authorization", `Bearer ${u2TokenAdmin}`);
    expect(resp.statusCode).toBe(200);
  });
});

/******************************POST /users/:username/jobs/:jobId
 *
 * Job applications
 */
describe("POST JOB APPLICATION /users/:username/jobs/:id", () => {
  test("works for admin", async () => {
    let jobs = await db.query("SELECT id FROM jobs LIMIT 1");
    let id = jobs.rows[0].id;
    const resp = await request(app)
      .post(`/users/u1/jobs/${id}`)
      .set("authorization", `Bearer ${u2TokenAdmin}`);
    expect(resp.statusCode).toBe(200);
    expect(resp.body).toEqual({ applied: id });
  });

  test("works for correctUser", async () => {
    let jobs = await db.query("SELECT id FROM jobs LIMIT 1");
    let id = jobs.rows[0].id;
    const resp = await request(app)
      .post(`/users/u1/jobs/${id}`)
      .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toBe(200);
    expect(resp.body).toEqual({ applied: id });
  });

  test("unauth for incorrect user", async () => {
    let jobs = await db.query("SELECT id FROM jobs LIMIT 1");
    let id = jobs.rows[0].id;
    const resp = await request(app)
      .post(`/users/u3/jobs/${id}`)
      .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toBe(401);
  });

  test("unauth for not logged in", async () => {
    let jobs = await db.query("SELECT id FROM jobs LIMIT 1");
    let id = jobs.rows[0].id;
    const resp = await request(app).post(`/users/u1/jobs/${id}`);
    console.log(resp.body);
    expect(resp.statusCode).toBe(401);
  });

  test("NotFound for no user", async () => {
    let jobs = await db.query("SELECT id FROM jobs LIMIT 1");
    let id = jobs.rows[0].id;
    const resp = await request(app)
      .post(`/users/u4/jobs/${id}`)
      .set("authorization", `Bearer ${u2TokenAdmin}`);
    expect(resp.statusCode).toBe(404);
  });

  test("NotFound for no job", async () => {
    const resp = await request(app)
      .post(`/users/u1/jobs/0`)
      .set("authorization", `Bearer ${u2TokenAdmin}`);
    expect(resp.statusCode).toBe(404);
  });
});

/************************************** PATCH /users/:username */

describe("PATCH /users/:username", () => {
  test("works for user editing own page", async function () {
    const resp = await request(app)
      .patch(`/users/u1`)
      .send({
        firstName: "New",
      })
      .set("authorization", `Bearer ${u1Token}`);
    expect(resp.body).toEqual({
      user: {
        username: "u1",
        firstName: "New",
        lastName: "U1L",
        email: "user1@user.com",
        isAdmin: false,
      },
    });
  });

  test("unauth for anon", async function () {
    const resp = await request(app).patch(`/users/u1`).send({
      firstName: "New",
    });
    expect(resp.statusCode).toEqual(401);
  });

  test("unauth for editing other's profile", async () => {
    const resp = await request(app)
      .patch("/users/u3")
      .send({ firstName: "NewNew" })
      .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toBe(401);
  });

  test("works for admin editing other's profile", async () => {
    const resp = await request(app)
      .patch("/users/u3")
      .send({ firstName: "NewNew" })
      .set("authorization", `Bearer ${u2TokenAdmin}`);
    expect(resp.statusCode).toBe(200);
    expect(resp.body).toEqual({
      user: {
        username: "u3",
        firstName: "NewNew",
        lastName: "U3L",
        email: "user3@user.com",
        isAdmin: false,
      },
    });
  });

  test("not found if no such user", async function () {
    const resp = await request(app)
      .patch(`/users/nope`)
      .send({
        firstName: "Nope",
      })
      .set("authorization", `Bearer ${u2TokenAdmin}`);
    expect(resp.statusCode).toEqual(404);
  });

  test("bad request if invalid data", async function () {
    const resp = await request(app)
      .patch(`/users/u1`)
      .send({
        firstName: 42,
      })
      .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(400);
  });

  test("works: set new password", async function () {
    const resp = await request(app)
      .patch(`/users/u1`)
      .send({
        password: "new-password",
      })
      .set("authorization", `Bearer ${u1Token}`);
    expect(resp.body).toEqual({
      user: {
        username: "u1",
        firstName: "U1F",
        lastName: "U1L",
        email: "user1@user.com",
        isAdmin: false,
      },
    });
    const isSuccessful = await User.authenticate("u1", "new-password");
    expect(isSuccessful).toBeTruthy();
  });
});

/************************************** DELETE /users/:username */

describe("DELETE /users/:username", function () {
  test("works for users", async function () {
    const resp = await request(app)
      .delete(`/users/u1`)
      .set("authorization", `Bearer ${u1Token}`);
    expect(resp.body).toEqual({ deleted: "u1" });
  });

  test("unauth for anon", async function () {
    const resp = await request(app).delete(`/users/u1`);
    expect(resp.statusCode).toEqual(401);
  });

  test("unauth for deleting other's account", async () => {
    const resp = await request(app)
      .delete("/users/u3")
      .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(401);
  });

  test("Works for admin deleting other's account", async () => {
    const resp = await request(app) //
      .delete("/users/u1")
      .set("authorization", `Bearer ${u2TokenAdmin}`);
    expect(resp.statusCode).toBe(200);
    expect(resp.body).toEqual({ deleted: "u1" });
  });

  test("not found if user missing", async function () {
    const resp = await request(app)
      .delete(`/users/nope`)
      .set("authorization", `Bearer ${u2TokenAdmin}`);
    expect(resp.statusCode).toEqual(404);
  });
});
