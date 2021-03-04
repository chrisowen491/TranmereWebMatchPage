const AWS = require('aws-sdk');
const AWSXRay = require('aws-xray-sdk');
const http = require('http');
const https = require('https');
AWSXRay.captureHTTPsGlobal(http);
AWSXRay.captureHTTPsGlobal(https);

let dynamo = new AWS.DynamoDB.DocumentClient();
AWSXRay.captureAWSClient(dynamo.service);

var Mustache = require("mustache");
var fs = require("fs");
var path = require('path');
var utils = require('./libs/utils')(path,fs,Mustache);

const APPS_TABLE_NAME = "TranmereWebAppsTable";
const PLAYER_TABLE_NAME = "TranmereWebPlayerTable";
const GOALS_TABLE_NAME = "TranmereWebGoalsTable";
const RESULTS_TABLE = "TranmereWebGames"

exports.handler = async function (event, context) {
    var pageName = "match"
    var date = event.pathParameters.date;
    var season = event.pathParameters.season;

    var squadSearch = await dynamo.scan({TableName:PLAYER_TABLE_NAME}).promise();
    var playerMap = {};
    for(var i=0; i < squadSearch.Items.length; i++) {
      playerMap[squadSearch.Items[i].name] = squadSearch.Items[i];
    }
    var view = await getResults(season, date);
    view.goals = await getGoals(date, season);
    view.apps = await getApps(date, season);

    view.goalkeepers = [];
    view.fullback1 = [];
    view.fullback2 = [];
    view.defenders = [];
    view.midfielders = [];
    view.wingers1 = [];
    view.wingers2 = [];
    view.strikers = [];
    view.formattedGoals = formatGoals(view.goals);

    var noPositionList = [];
    for(var i=0; i < view.apps.length; i++) {
     var app = view.apps[i];
     if(playerMap[app.Name]) {

         app.bio = playerHash[view.apps[i].Name];

         if(app.bio.position == "Goalkeeper") {
             view.goalkeepers.push(app);
         } else if(app.bio.position == "Central Defender") {
             view.defenders.push(app);
         } else if(app.bio.position == "Full Back" && view.fullback1.length == 0) {
             view.fullback1.push(app);
         } else if(app.bio.position == "Full Back" && view.fullback2.length == 0) {
             view.fullback2.push(app);
         } else if(app.bio.position == "Central Midfielder") {
             view.midfielders.push(app);
         } else if(app.bio.position == "Winger" && view.wingers1.length == 0) {
             view.wingers1.push(app);
         } else if(app.bio.position == "Winger" && view.wingers2.length == 0) {
             view.wingers2.push(app);
         } else if(app.bio.position == "Striker") {
             view.strikers.push(app);
         } else {
             noPositionList.push(app)
         }
     } else {
         app.bio = {
             pic: {
                  fields:{
                      file:{
                          url:"https://images.ctfassets.net/pz711f8blqyy/1GOdp93iMC7T3l9L9UUqaM/0ea20a8950cdfb6f0239788f93747d74/blank.svg"
                      }
                  }
              }
         }     ;
         noPositionList.push(app);
     }
    }

    for(var i=0; i < noPositionList.length; i++) {
         if(view.goalkeepers.length == 0){
             view.goalkeepers.push(noPositionList[i]);
         } else if(view.fullback1.length == 0){
               view.fullback1.push(noPositionList[i]);
         } else if(view.fullback2.length == 0){
               view.fullback2.push(noPositionList[i]);
         } else if(view.defenders.length < 2){
             view.defenders.push(noPositionList[i]);
         } else if(view.wingers1.length == 0){
               view.wingers1.push(noPositionList[i]);
         } else if(view.wingers2.length == 0){
               view.wingers2.push(noPositionList[i]);
         } else if(view.midfielders.length < 2){
             view.midfielders.push(noPositionList[i]);
         } else {
             view.strikers.push(noPositionList[i]);
         }
    }

    view.defColspan  = 20 / (view.defenders.length + view.fullback1.length + view.fullback2.length);
    view.midColspan  = 20 / (view.midfielders.length + view.wingers1.length + view.wingers2.length);
    view.strColspan = 20 / view.strikers.length;
    view.random = Math.ceil(Math.random() * 100000);
    view.url = ""
    view.title = "Match Summary";
    view.pageType = "AboutPage";
    view.description = "MAtch Summary";

    var page = utils.buildPage(view, './templates/match.tpl.html');

    return {
      "isBase64Encoded": false,
      "headers": {
        "Content-Type": "text/html",
        "Content-Security-Policy" : "upgrade-insecure-requests",
        "Strict-Transport-Security" : "max-age=1000",
        "X-Xss-Protection" : "1; mode=block",
        "X-Frame-Options" : "DENY",
        "X-Content-Type-Options" : "nosniff",
        "Referrer-Policy" : "strict-origin-when-cross-origin",
        "Cache-Control": "public"
      },
      "statusCode": 200,
      "body": page
     };
};

function formatGoals(goals) {
  var output = "";
  var scorers = {};
  for(var i=0; i < goals.length; i++) {
      if(scorers[goals[i].Scorer]) {
         scorers[goals[i].Scorer] =  scorers[goals[i].Scorer] + 1;
      } else {
         scorers[goals[i].Scorer] = 1;
      }
  }
  const keys = Object.keys(scorers);
  for( var x=0; x < keys.length; x++) {
      if(scorers[keys[x]] > 1) {
          output = output + keys[x] + " " + scorers[keys[x]];
      } else {
          output = output + keys[x]
      }
      if( x != keys.length-1) {
          output = output + ", "
      }
  }
  return output;
}

async function getResults(season, date) {

  var params = {
    TableName : RESULTS_TABLE,
    KeyConditionExpression:  "season = :season and #date = :date",
    ExpressionAttributeValues: {
      ":season": decodeURIComponent(season),
      ":date": decodeURIComponent(date)
    },
    ExpressionAttributeNames: { "#date": "date" }
  }      

  var result = await dynamo.query(params).promise();
  return result.Items[0];
};

async function getGoals(date, season) {

  var params = {
      TableName : GOALS_TABLE_NAME,
      KeyConditionExpression :  "Season = :season",
      FilterExpression : "#Date = :date",
      ExpressionAttributeNames : {
          "#Date" : "Date"
      },
      ExpressionAttributeValues: {
          ":date" : decodeURIComponent(date),
          ":season" : decodeURIComponent(season)
      }
  }

  var result = await dynamo.query(params).promise();

  return result.Items;
};

async function getApps(date, season) {

  var params = {
      TableName : APPS_TABLE_NAME,
      KeyConditionExpression :  "Season = :season",
      FilterExpression : "#Date = :date",
      ExpressionAttributeNames : {
          "#Date" : "Date"
      },
      ExpressionAttributeValues: {
          ":date" : decodeURIComponent(date),
          ":season" : decodeURIComponent(season)
      }
  }

  var result = await dynamo.query(params).promise();

  return result.Items;
};
