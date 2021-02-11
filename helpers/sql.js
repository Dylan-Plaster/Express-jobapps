const { BadRequestError } = require("../expressError");

// THIS NEEDS SOME GREAT DOCUMENTATION.

function sqlForPartialUpdate(dataToUpdate, jsToSql) {
  // get a list of keys from the dataToUpdate object passed in. A user can pass in
  // an object with missing keys. variable keys will now hold a list of all the keys
  // the user is trying to update
  const keys = Object.keys(dataToUpdate);

  // If the user passes in an empty object {}, throw an error. Tell the user that they
  // provided no data
  if (keys.length === 0) throw new BadRequestError("No data");

  // {firstName: 'Aliya', age: 32} => ['"first_name"=$1', '"age"=$2']
  // This map function creates a new array contain
  const cols = keys.map(
    // jsToSql is simply an object to help convert js syntax (i.e. camelCase) to Sql syntax(i.e. under_score)
    // so this line sets the column name to the correct sql syntax. This way, a user can
    // pass in data in the javascript syntax, and it will be corrected to properly interact with the SQL column names
    (colName, idx) => `"${jsToSql[colName] || colName}"=$${idx + 1}`
  );

  // cols now contains an array where each item in the array is a string that will be inserted into an SQL update query.
  // so, if updating a single column looks like this: "db.query(UPDATE users SET first_name=$1), [firstName]",
  // each item in the cols array now can be inserted into an update query. Ex:
  // cols = [
  // "first_name=$1",
  // "last_name=$2",
  // "email=$3"
  // ]
  // when this array cols is joined into a string and inserted into an sql query:
  // db.query("UPDATE users SET first_name=$1, last_name=$2, email=$3",[fname, lname, email])
  //
  // This is a clever way to dynamically create an SQL query with different amounts of input

  // Returned: {
  // setCols:  "column_to_be_changed=$1, column2=$2 ...",
  //  values: [new_column_value, ...]
  //          }
  // This can be passed directly into a pg query:
  // await db.query("UPDATE resource SET ${INSERT setCols HERE}", [INSERT values HERE])
  return {
    setCols: cols.join(", "),
    values: Object.values(dataToUpdate),
  };
}

module.exports = { sqlForPartialUpdate };
