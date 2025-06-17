const responseStatus = (res, statusCode, status, data) => {
  if (!res || typeof res.status !== "function") {
    throw new Error("Invalid response object");
  }
  if (status === "success") {
    return res.status(statusCode).json({
      status: status,
      data: data,
    });
  } else {
    return res.status(statusCode).json({
      status: status,
      message: data,
    });
  }
};
module.exports = responseStatus;