const responseStatus = (res, statusCode, status, dataOrMessage) => {
  const response = {
    status,
    [status === 'success' ? 'data' : 'message']: dataOrMessage || 'No message provided',
  };
  return res.status(statusCode).json(response);
};

module.exports = responseStatus;