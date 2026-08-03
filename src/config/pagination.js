/**
 * Parse pagination params from query string.
 * Returns { page, limit, offset }
 *
 * NOTE: limit and offset are cast with Number() explicitly.
 * mysql2 prepared statements (execute) require proper JS number types —
 * values coming through parseInt/spread can sometimes be mistyped and
 * cause "Incorrect arguments to mysqld_stmt_execute".
 */
const parsePagination = (query) => {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Number(Math.min(100, Math.max(1, parseInt(query.limit) || 10)));
  const offset = Number((page - 1) * limit);
  return { page, limit, offset };
};

/**
 * Build pagination meta object.
 */
const buildPaginationMeta = (total, page, limit) => {
  const totalPages = Math.ceil(total / limit);
  return {
    total,
    page,
    limit,
    total_pages: totalPages,
    has_next: page < totalPages,
    has_prev: page > 1,
  };
};

module.exports = { parsePagination, buildPaginationMeta };
