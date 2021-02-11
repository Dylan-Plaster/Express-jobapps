const { json } = require("body-parser");
const { BadRequestError } = require("../expressError");
const { sqlForPartialUpdate } = require("./sql");

test("Test sqlForPartialUpdate", () => {
  let dataToUpdate = {
    firstName: "Dylan",
    lastName: "Steele",
    email: "Dylansteele@gmail.com",
  };
  let jsToSql = {
    firstName: "first_name",
    lastName: "last_name",
  };
  let resp = sqlForPartialUpdate(dataToUpdate, jsToSql);
  expect(resp).toEqual({
    setCols: '"first_name"=$1, "last_name"=$2, "email"=$3',
    values: ["Dylan", "Steele", "Dylansteele@gmail.com"],
  });
});

test("Test sqlforPartialUpdate with no data, check for error", () => {
  let dataToUpdate = {};
  expect(() => {
    sqlForPartialUpdate(dataToUpdate, {});
  }).toThrow();
  expect(() => {
    sqlForPartialUpdate(dataToUpdate, {});
  }).toThrowError("No data");
  expect(() => {
    sqlForPartialUpdate(dataToUpdate, {});
  }).toThrowError(BadRequestError);
});
