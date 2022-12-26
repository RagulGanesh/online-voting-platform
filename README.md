**Hello Guys ,This is G Ragul**

# Online Voting System
This is an Online Voting platform where we can hold any number of elections with "n" number of questions as required
This is built using HTML5,CSS3,TailWindCSS,EJS for front end and Node.js, Express.js for backend with PostgreSQL as database.
Here we can log in as an election adminnistrator and create multiple elections.
Each election can have multiple questions, with election admin power to control the voters for a particular election.
After the election has been created there is a live link that can be created where the voters can login and vote in it.


[![MIT License](https://img.shields.io/badge/Platform-Deployed-green.svg)](https://choosealicense.com/licenses/mit/)

## Deployed App link: 
https://ragulg-online-voting-platform.onrender.com/

## Demo link



## Features

- Admin will be able to signup
- Admin can create multiple elections
- Admin can create a ballot of questions in an election
- Admin can register voters
- Admin can launch an election
- Reset password feature for both admin and voter
- Elections administrator can set custom path to election
- Uses CSRF tokens to prevent attacks 

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
## Note : 
To see if npm is installed or not 
``` bash
type npm -v in Terminal(for windows)
```