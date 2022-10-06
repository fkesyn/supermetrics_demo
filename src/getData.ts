const cc = DataStudioApp.createCommunityConnector();
interface apiData {
 page: number,
 posts: PostsData[];
}

interface PostsData {
    id: string;
    from_name: string;
    from_id: string;
    message: string;
    type: string;
    created_time: Date;
}
type Fields = GoogleAppsScript.Data_Studio.Fields;
const getFields = (): Fields => {
    const fields = cc.getFields();
    const types = cc.FieldType;

    fields
        .newDimension()
        .setId('userName')
        .setName('Username')
        .setType(types.TEXT);

    fields
        .newDimension()
        .setId('postLength')
        .setName('Post Length')
        .setType(types.NUMBER);
    return fields;
};

const getData = (request: GetDataRequest): GetDataResponse => {
    try {

        const requestedFields = getFields().forIds(
            request.fields.map(({ name }) => name)
        );

        const limit = request.configParams.postLimit || 100;
        const properties = PropertiesService.getUserProperties();
        const slToken = properties.getProperty('dscc.slToken');

        if (slToken) {
            const posts = fetchPostsData(slToken, limit);
            const rows = toGetDataRows(posts, requestedFields);
            return {
                schema: requestedFields.build(),
                rows: rows
            };
        } else {
            userError('no valid slToken');
        }
    } catch (e) {
        Logger.log('Error fetching data from API. Exception details: ' + e);
    }

};
const userError = (message: string) => {
    cc.newUserError().setText(message).throwException();
};
const toGetDataRows = (
    response: PostsData[],
    requestedFields: Fields
): GetDataRows => {
    const data: GetDataRows = [];
    response.forEach((post: PostsData) => {
        const row: GetDataRowValue[] = requestedFields
            .asArray()
            .map((requestedField) => {
                switch (requestedField.getId()) {
                    case 'userName':
                        return post.from_name || '';
                    case 'postLength':
                        return (post.message || '').length;
                    default:
                        return '';
                }
            });
        data.push({ values: row });
    });
    return data;
};
const fetchPostsData = (
    sl_token: string,
    limit: number,
): PostsData[] => {
    let page = 1;

    let postsArray = doAPICall(sl_token, page).posts;
    while (postsArray.length < limit) {
        page++;
        let extraCall = doAPICall(sl_token, page);
        if (page > extraCall.page) {
            break;
        }
        postsArray = postsArray.concat(extraCall.posts);
    }
    //if the API call returns more rows than the limit in the last call
    postsArray.length = limit;
    return postsArray;
};

const doAPICall = (
    sl_token: string,
    page: number
): apiData => {
    const url = `https://api.supermetrics.com/assignment/posts?sl_token=${sl_token}&page=${page}`;
    const response = UrlFetchApp.fetch(url);
    const statusCode = response.getResponseCode();

    if (statusCode !== 200) {
        Logger.log('An exception occurred getting the posts:');
        Logger.log(statusCode);
        Logger.log(response.getAllHeaders());
        Logger.log(response.getContentText());
        userError(
            `The API replied with an unsuccessful status code of ${statusCode}`
        );

        return;
    }
    //resetAuth();
    const { data = {} } = JSON.parse(response.getContentText()) || {};
    return data;
};