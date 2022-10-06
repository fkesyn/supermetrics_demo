const isAdminUser = (): boolean => {
  return false;
};

const getAuthType = () => {
  const cc = DataStudioApp.createCommunityConnector();
  return cc.newAuthTypeResponse().setAuthType(cc.AuthType.USER_TOKEN).setHelpUrl('https://www.example.org/connector-auth-help').build();
};

const resetAuth = () => {
  const userTokenProperties = PropertiesService.getUserProperties();
  userTokenProperties.deleteProperty('dscc.username');
  userTokenProperties.deleteProperty('dscc.token');
  userTokenProperties.deleteProperty('dscc.slToken');
};

const isAuthValid = (): boolean => {
  const usernameAndToken = loadCurrentUsernameAndToken();
  const result = usernameAndToken.username && usernameAndToken.token &&
  validateCredentials(usernameAndToken.username, usernameAndToken.token);
  return !!result;
};

const loadCurrentUsernameAndToken = () => {
  const properties = PropertiesService.getUserProperties();
  return {
    username: properties.getProperty('dscc.username'),
    token: properties.getProperty('dscc.token'),
  };
};

const setCredentials = (request: { userToken: any; }) => {
  const creds = request.userToken;
  const username = creds.username;
  const token = creds.token;

  const slToken = validateCredentials(username, token);
  if (!slToken) {
    return {
      errorCode: 'INVALID_CREDENTIALS',
    };
  } else {
    storeUsernameAndToken(username, token, slToken);
    return {
      errorCode: 'NONE',
    };
  }
};

const storeUsernameAndToken = (
    username: string,
    token: string,
    slToken: string,
) => {
  PropertiesService
      .getUserProperties()
      .setProperty('dscc.username', username)
      .setProperty('dscc.token', token)
      .setProperty('dscc.slToken', slToken);
};

const validateCredentials = (username: string, token: string) => {
  const data = {
    client_id: token,
    name: 'test',
    email: username,
  };
  const options = {
    method: 'post',
    contentType: 'application/json',
    // Convert the JavaScript object to a JSON string.
    payload: JSON.stringify(data),
  };
  const rawResponse = UrlFetchApp.fetch('https://api.supermetrics.com/assignment/register', options);
  const statusCode = rawResponse.getResponseCode();
  if (statusCode === 200) {
    const {data = {}} = JSON.parse(rawResponse.getContentText()) || {};
    return data.sl_token || '';
  }
  Logger.log('An exception occurred accessing the register API:');
  Logger.log(statusCode);
  Logger.log(rawResponse.getAllHeaders());
  Logger.log(rawResponse.getContentText());
  return false;
};
