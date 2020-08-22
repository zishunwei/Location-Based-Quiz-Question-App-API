# Location Based Quiz&Question App (Data API)
One of two repositories for CE0043-APP

## System Requirements:
This API uses the codes by practicals in CEGE0043 modules and a ubuntu virtual machine 
on Windows is used to host.

### Software:
- A virtual or physical machine to host the data API
- Node.js
- UCL vpn or wifi

###Hardware:
- A PC/laptop can connect to internet

## Deploy the Code:
1. Download all codes in this repository
2. Using UCL vpn or UCL wifi
3. Start a command prompt (Ubuntu) and set the directory to the folder where this code downloaded.
4. Using command line "node dataAPI.js" or "pm2 start dataAPI.js"

## Test the Code:
- Using a recent browser to test all geojson.get() API
- input the url "https://developer.cege.ucl.ac.uk:" + httpsPortNumberAPI + "/get../" + (httpsPortNumberAPI)" in browser
- You can get the json showing corresponding JSON or error messages
- The results of console.log() in each one will be shown in the command
- Add new console.log() to check anything what you want

## Files List
- dataAPI.js: basic js getting the foundation functionalities and load the following two js.
- crud.js in routes folder: crud.post to insert questions, answers, delete questions
- geoJSON.js in routes folder: geojson.get to get the query results by DB and send them to app

## Third Party Code:
1.The codes in practicals of CEGE0043 module:
- week3 practical for dataAPI.js and geoJSON.js
- wee7 practical for crud.js

2.SQL codes by Dr Claire Ellul
