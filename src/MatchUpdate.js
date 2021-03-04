const AWS = require('aws-sdk');
const AWSXRay = require('aws-xray-sdk');

let dynamo = new AWS.DynamoDB.DocumentClient();
AWSXRay.captureAWSClient(dynamo.service);

const RESULTS_TABLE = "TranmereWebGames"

exports.handler = async function (event, context) {

    var date = event.pathParameters.date;
    var season = event.pathParameters.season;
    var body = JSON.parse(event.body)

    var params = {
        TableName:RESULTS_TABLE,
        Key:{
            "season": season,
            "date": date
        },
        UpdateExpression: "set programme = :p, attendance=:a, youtube=:y",
        ExpressionAttributeValues:{
            ":y": body.youtube,
            ":a": parseInt(body.attendance),
            ":p": body.programme
        },
        ReturnValues:"UPDATED_NEW"
    };

    await dynamo.update(params).promise();

    return {
        "headers": { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        "statusCode": 200,
        "body": JSON.stringify('ok')
      };
};