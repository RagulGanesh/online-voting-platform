**Hello Guys ,This is G Ragul**

# Online Voting System
This is an Online Voting Platform built using Node.js ,Postgresql,Tailwincss,Express.js which allows election administrators to sign up and create multiple elections. You can create ballots of multiple questions,add voters for particular election,reset password feature is available for both election admin and voter,create a custom public URL for the election... etc..



[![MIT License](https://img.shields.io/badge/Platform-Deployed-green.svg)](https://choosealicense.com/licenses/mit/)

Deployed App link: 
https://ragulg-online-voting-platform.onrender.com/

## Demo link



## Features


- Fully Responsive platform
- reset password feature for both admin and voter
- Uses CSRF tokens to prevent attacks 
- Admin will be able to signup
- Admin can create the elections
- Admin can create a ballot of questions in an election
- Admin can registervoters
- Admin can launch election
- Elections administrator can set custom path to election


## Tech Stack

**Client:** HTML5,CSS3,EJS, TailwindCSS

**Server:** Node.js, Express.js

**Database:** PostgresSQL


## Installation

Don't forget to create the databse with corresponding name as mentioned in `config.json`



Go to the project directory

Install dependencies

```bash
  npm install
```
or
```bash
  npm i
```
start server to run the website in localhost

```bash
  npm start
```
## To create database

To create database,run the following command

```bash
npx sequelize-cli db:create
```
## To migrate database

To migrate database,run the following command

```bash
npx sequelize-cli db:migrate
```