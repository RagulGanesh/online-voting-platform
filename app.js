//requiring all the necessary packages for the project
const express = require("express");
const app = express();
const csrf = require("tiny-csrf");
const cookieParser = require("cookie-parser");


//requiring the models necessary for the app
const { adminModel, electionModel, questionsModel, optionModel, voterModel } = require("./models");

//require body-parser for post routes
const bodyParser = require("body-parser");
const path = require("path");
const bcrypt = require("bcrypt");

//requiring passport js for authentication
const passport = require("passport");
const connectEnsureLogin = require("connect-ensure-login");

//requiring session and flash for showing errors
const session = require("express-session");
const flash = require("connect-flash");
const LocalStratergy = require("passport-local");

const saltRounds = 10;

//setting and using all the necessary things
app.set("views", path.join(__dirname, "views"));
app.use(flash());
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser("This is some secret string"));
app.use(csrf("this_should_be_32_character_long", ["POST", "PUT", "DELETE"]));

//using the session key
app.use(
  session({
    secret: "my-super-secret-key-2837428907583420",
    cookie: {
      maxAge: 24 * 60 * 60 * 1000,
    },
  })
);

app.use((request, response, next) => {
  response.locals.messages = request.flash();
  next();
});
//initializing passport and session
app.use(passport.initialize());
app.use(passport.session());

//use passport for admin
passport.use(
  "Admin",
  new LocalStratergy(
    {
      usernameField: "email",
      passwordField: "password",
    },
    (username, password, done) => {
      console.log("Hello world!!!");
      adminModel.findOne({ where: { email: username } })
        .then(async (user) => {
          const result = await bcrypt.compare(password, user.password);
          if (result) {
            return done(null, user);
          } else {
            done(null, false, { message: "It's an invalid password!!!" });
          }
        })
        .catch((err) => {
          console.log(err);
          return done(null, false, { message: "It's an invalid email-id!!!" });
        });
    }
  )
);

//use password as voter
passport.use(
  "Voter",
  new LocalStratergy(
    {
      usernameField: "voterid",
      passwordField: "password",
    },
    (username, password, done) => {
      voterModel.findOne({ where: { voterid: username } })
        .then(async (user) => {
          const result = await bcrypt.compare(password, user.password);
          if (result) {
            return done(null, user);
          } else {
            return done(null, false, { message: "It's an invalid password!!!" });
          }
        })
        .catch(() => {
          return done(null, false, { message: "It's an invalid email-id!!!" });
        });
    }
  )
);

//serializing user using passport
passport.serializeUser((user, done) => {
  done(null, { id: user.id, role: user.role });
});
//deserializing user as passport
passport.deserializeUser((id, done) => {
  if (id.role === "admin") {
    adminModel.findByPk(id.id)
      .then((user1) => {
        done(null, user1);
      })
      .catch((error1) => {
        done(error1, null);
      });
  } else if (id.role === "voter") {
    voterModel.findByPk(id.id)
      .then((user1) => {
        done(null, user1);
      })
      .catch((error1) => {
        done(error1, null);
      });
  }
});

//setting view engine
app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")));

//landing page
//This is the first page seen when the user enters the root url
app.get("/", (req, res) => {
  if (req.user) {
    console.log(req.user);
    if (req.user.role === "admin") {
      return res.redirect("/elections");
    } else if (req.user.role === "voter") {
      req.logout((err1) => {
        if (err1) {
          return res.json(err1);
        }
        res.redirect("/");
      });
    }
  } else {
    res.render("index", {
      title: "Online Voting Platform",
      csrfToken: req.csrfToken(),
    });
  }
});

//elections home page
//this is the home page for elections
//the page that opens where the admin can add elections
app.get(
  "/elections",
  connectEnsureLogin.ensureLoggedIn(),
  async (request1, response1) => {
    if (request1.user.role === "admin") {
      let loggedinuser = request1.user.firstName + " " + request1.user.lastName;
      try {
        const elections = await electionModel.getelections(request1.user.id);
        if (request1.accepts("html")) {
          response1.render("elections", {
            title: "Online Voting Platform",
            userName: loggedinuser,
            elections,
          });
        } else {
          return response1.json({
            elections,
          });
        }
      } catch (error3) {
        console.log(error3);
        return response1.status(422).json(error3);
      }
    } else if (request1.user.role === "voter") {
      return response1.redirect("/");
    }
  }
);

//signup page
//this is where the user can sign-up
//this is opened when we dont have an account and to create an account
app.get("/signup", (request2, response2) => {
  response2.render("signup", {
    title: "create an admin account",
    csrfToken: request2.csrfToken(),
  });
});

//create user account
//this is the page where the admin can create his/her account
app.post("/admin", async (req, res) => {
  if (!req.body.firstName) {
    req.flash("error", "Please do enter your first name!!!");
    return res.redirect("/signup");
  }
  if (!req.body.email) {
    req.flash("error", "Please do enter your email ID!!!");
    return res.redirect("/signup");
  }
  if (!req.body.password) {
    req.flash("error", "Please do enter your password!!!");
    return res.redirect("/signup"); 
  }
  if (req.body.password.length < 8) {
    req.flash("error", "Length of password should be atleast of 8 characters!!!");
    return res.redirect("/signup");
  }
  const hashedPwd1 = await bcrypt.hash(req.body.password, saltRounds);
  try {
    const user = await adminModel.createAnAdmin({
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      email: req.body.email,
      password: hashedPwd1,
    });
    req.login(user, (err) => {
      if (err) {
        console.log(err);
        res.redirect("/");
      } else {
        res.redirect("/elections");
      }
    });
  } catch (error12) {
    req.flash("error", "Email id is already in use by someone else");
    return res.redirect("/signup");
  }
});

//login page
//this is where the admin can login
app.get("/login", (request3, response3) => {
  if (request3.user) {
    return response3.redirect("/elections");
  }
  response3.render("login_page", {
    title: "Login to your account",
    csrfToken: request3.csrfToken(),
  });
});

//voter login page
//this is the page where the voter can login
app.get("/e/:url/voter", (request4, response4) => {
  response4.render("login_voter", {
    title: "Login in as Voter",
    url: request4.params.url,
    csrfToken: request4.csrfToken(),
  });
});

//login user
//this is the page where the user can log in
app.post(
  "/session",
  passport.authenticate("Admin", {
    failureRedirect: "/login",
    failureFlash: true,
  }),
  (request1, response1) => {
    response1.redirect("/elections");
  }
);

//login voter
//this is the post route where the voter can login
app.post(
  "/e/:url/voter",
  passport.authenticate("Voter", {
    failureFlash: true,
  }),
  async (request5, response5) => {
    return response5.redirect(`/e/${request5.params.url}`);
  }
);

//signout
//this is the route for signing out the user
app.get("/signout", (request6, response6, next) => {
  request6.logout((err1) => {
    if (err1) {
      return next(err1);
    }
    response6.redirect("/");
  });
});

//password reset page
//this is the page from where we can reset the password
app.get(
  "/password-reset",
  connectEnsureLogin.ensureLoggedIn(),
  (request7, response7) => {
    if (request7.user.role === "admin") {
      response7.render("reset_password_page", {
        title: "Reset your password",
        csrfToken: request7.csrfToken(),
      });
    } else if (request7.user.role === "voter") {
      return response7.redirect("/");
    }
  }
);

//reset user password
//this is the place where we can reset the user password
app.post(
  "/password-reset",
  connectEnsureLogin.ensureLoggedIn(),
  async (request8, response8) => {
    if (request8.user.role === "admin") {
      if (!request8.body.old_password) {
        request8.flash("error", "please do enter your old password!!!");
        return response8.redirect("/password-reset");
      }
      if (!request8.body.new_password) {
        request8.flash("error", "please do enter a new password!!!");
        return response8.redirect("/password-reset");
      }
      if (request8.body.new_password.length < 8) {
        request8.flash("error", "length of password should be atleast of 8 characters!!!");
        return response8.redirect("/password-reset");
      }
      const hashedNewPwd = await bcrypt.hash(
        request8.body.new_password,
        saltRounds
      );
      const result = await bcrypt.compare(
        request8.body.old_password,
        request8.user.password
      );
      if (result) {
        try {
          adminModel.findOne({ where: { email: request8.user.email } }).then(
            (user) => {
              user.resetPassword(hashedNewPwd);
            }
          );
          request8.flash("success", "password has been changed successfully!!!");
          return response8.redirect("/elections");
        } catch (error1) {
          console.log(error1);
          return response8.status(422).json(error1);
        }
      } else {
        request8.flash("error", "old password does not match, please do check it again");
        return response8.redirect("/password-reset");
      }
    } else if (request8.user.role === "voter") {
      return response8.redirect("/");
    }
  }
);

//new election page
//this is a page when a new election is created
app.get(
  "/elections/create",
  connectEnsureLogin.ensureLoggedIn(),
  async (request9, response9) => {
    if (request9.user.role === "admin") {
      return response9.render("new_election", {
        title: "create an election",
        csrfToken: request9.csrfToken(),
      });
    } else if (request9.user.role === "voter") {
      return response9.redirect("/");
    }
  }
);

//creating new election
//here we are creating a new election
app.post(
  "/elections",
  connectEnsureLogin.ensureLoggedIn(),
  async (request11, response11) => {
    if (request11.user.role === "admin") {
      if (request11.body.electionName.length < 5) {
        request11.flash("error", "Name of an election length should be of atleast 5 characters");
        return response11.redirect("/elections/create");
      }
      if (request11.body.url.length < 3) {
        request11.flash("error", "Length of url string should be atleast 3");
        return response11.redirect("/elections/create");
      }
      if (
        request11.body.url.includes(" ") ||
        request11.body.url.includes("\t") ||
        request11.body.url.includes("\n")
      ) {
        request11.flash("error", "url string cannot contain spaces");
        return response11.redirect("/elections/create");
      }
      try {
        await electionModel.addAnElection({
          electionName: request11.body.electionName,
          url: request11.body.url,
          adminID: request11.user.id,
        });
        return response11.redirect("/elections");
      } catch (error) {
        request11.flash("error", "Email id is already used by someone else");
        return response11.redirect("/elections/create");
      }
    } else if (request11.user.role === "voter") {
      return response11.redirect("/");
    }
  }
);

//election page
//this is the election page
app.get(
  "/elections/:id",
  connectEnsureLogin.ensureLoggedIn(),
  async (req, res) => {
    if (req.user.role === "admin") {
      try {
        const election1 = await electionModel.getElection(req.params.id);
        const numberOfQuestionsAre = await questionsModel.getNumberOfQuestionss(
          req.params.id
        );
        const numberOfVotersAre = await voterModel.getNumberOfVoterss(req.params.id);
        return res.render("elections_page", {
          id: req.params.id,
          title: election1.electionName,
          url: election1.url,
          launch: election1.launch,
          nq: numberOfQuestionsAre,
          nv: numberOfVotersAre,
        });
      } catch (error2) {
        console.log(error2);
        return res.status(422).json(error2);
      }
    } else if (req.user.role === "voter") {
      return res.redirect("/");
    }
  }
);

//manage questions page
//this is the page from where you can manage the questions
app.get(
  "/elections/:id/questions",
  connectEnsureLogin.ensureLoggedIn(),
  async (request1, response) => {
    if (request1.user.role === "admin") {
      try {
        const election2 = await electionModel.getElection(request1.params.id);
        const questions2 = await questionsModel.getQuestionss(request1.params.id);
        if (!election2.running) {
          if (request1.accepts("html")) {
            return response.render("questions", {
              title: election2.electionName,
              id: request1.params.id,
              questions: questions2,
              csrfToken: request1.csrfToken(),
            });
          } else {
            return response.json({
              questions2,
            });
          }
        } else {
          request1.flash("error", "can't edit while election is in running mode");
          return response.redirect(`/elections/${request1.params.id}/`);
        }
      } catch (error1) {
        console.log(error1);
        return response.status(422).json(error1);
      }
    } else if (request1.user.role === "voter") {
      return response.redirect("/");
    }
  }
);

//add question page
//this is the page from where we can add the questions
app.get(
  "/elections/:id/questions/create",
  connectEnsureLogin.ensureLoggedIn(),
  async (request2, response1) => {
    if (request2.user.role === "admin") {
      try {
        const election3 = await electionModel.getElection(request2.params.id);
        if (!election3.launch) {
          return response1.render("new_question_page", {
            id: request2.params.id,
            csrfToken: request2.csrfToken(),
          });
        } else {
          request2.flash("error", "can't edit while election is in running mode");
          return response1.redirect(`/elections/${request2.params.id}/`);
        }
      } catch (error1) {
        console.log(error1);
        return response1.status(422).json(error1);
      }
    } else if (request2.user.role === "voter") {
      return response1.redirect("/");
    }
  }
);

//add question
//this is the page from where we can add the questions
app.post(
  "/elections/:id/questions/create",
  connectEnsureLogin.ensureLoggedIn(),
  async (request3, response3) => {
    if (request3.user.role === "admin") {
      if (request3.body.questionName.length < 5) {
        request3.flash("error", "Length of question should be of atleast 5 characters");
        return response3.redirect(
          `/elections/${request3.params.id}/questions/create`
        );
      }

      try {
        const election = await electionModel.getElection(request3.params.id);
        if (election.launch) {
          request3.flash("error", "can't edit while election is in running mode");
          return response3.redirect(`/elections/${request3.params.id}/`);
        }
        const question = await questionsModel.addAQuestion({
          questionName: request3.body.questionName,
          description: request3.body.description,
          electionID: request3.params.id,
        });
        return response3.redirect(
          `/elections/${request3.params.id}/questions/${question.id}`
        );
      } catch (error1) {
        console.log(error1);
        return response3.status(422).json(error1);
      }
    } else if (request3.user.role === "voter") {
      return response3.redirect("/");
    }
  }
);

//edit question page
//this the page where we can edit the questions
app.get(
  "/elections/:electionID/questions/:questionID/edit",
  connectEnsureLogin.ensureLoggedIn(),
  async (request5, response5) => {
    if (request5.user.role === "admin") {
      try {
        const elections = await electionModel.getElection(request5.params.electionID);
        if (elections.launch) {
          request5.flash("error", "can't edit while election is in running mode");
          return response5.redirect(`/elections/${request5.params.id}/`);
        }
        const questions = await questionsModel.getQuestion(request5.params.questionID);
        return response5.render("edit_question_page", {
          electionID: request5.params.electionID,
          questionID: request5.params.questionID,
          questionName: questions.questionName,
          description: questions.description,
          csrfToken: request5.csrfToken(),
        });
      } catch (error5) {
        console.log(error5);
        return response5.status(422).json(error5);
      }
    } else if (request5.user.role === "voter") {
      return response5.redirect("/");
    }
  }
);

//edit question
//you can edit the question from here
app.put(
  "/questions/:questionID/edit",
  connectEnsureLogin.ensureLoggedIn(),
  async (request6, response6) => {
    if (request6.user.role === "admin") {
      if (request6.body.questionName.length < 5) {
        request6.flash("error", "Length of question should be of atleast 5 characters");
        return response6.json({
          error: "Question length should be atleast 5",
        });
      }
      try {
        const updatedQuestion = await questionsModel.updateAQuestion({
          questionName: request6.body.questionName,
          description: request6.body.description,
          id: request6.params.questionID,
        });
        return response6.json(updatedQuestion);
      } catch (error6) {
        console.log(error6);
        return response6.status(422).json(error6);
      }
    } else if (request6.user.role === "voter") {
      return response6.redirect("/");
    }
  }
);

//delete question
//delete the unnecessary questions
app.delete(
  "/elections/:electionID/questions/:questionID",
  connectEnsureLogin.ensureLoggedIn(),
  async (request7, response7) => {
    if (request7.user.role === "admin") {
      try {
        const nq = await questionsModel.getNumberOfQuestionss(
          request7.params.electionID
        );
        if (nq > 1) {
          const res1 = await questionsModel.deleteAQuestion(request7.params.questionID);
          return response7.json({ success: res1 === 1 });
        } else {
          return response7.json({ success: false });
        }
      } catch (error7) {
        console.log(error7);
        return response7.status(422).json(error7);
      }
    } else if (request7.user.role === "voter") {
      return response7.redirect("/");
    }
  }
);

//question page
//page of questions
app.get(
  "/elections/:id/questions/:questionID",
  connectEnsureLogin.ensureLoggedIn(),
  async (request8, response8) => {
    if (request8.user.role === "admin") {
      try {
        const questions = await questionsModel.getQuestion(request8.params.questionID);
        const options = await optionModel.getOptionss(request8.params.questionID);
        const election = await electionModel.getElection(request8.params.id);
        if (election.launch) {
          request8.flash("error", "can't edit while election is in running mode");
          return response8.redirect(`/elections/${request8.params.id}/`);
        }
        if (request8.accepts("html")) {
          response8.render("questions_page", {
            title: questions.questionName,
            description: questions.description,
            id: request8.params.id,
            questionID: request8.params.questionID,
            options,
            csrfToken: request8.csrfToken(),
          });
        } else {
          return response8.json({
            options,
          });
        }
      } catch (error8) {
        console.log(error8);
        return response8.status(422).json(error8);
      }
    } else if (request8.user.role === "voter") {
      return response8.redirect("/");
    }
  }
);

//adding options
//option are being added from here
app.post(
  "/elections/:id/questions/:questionID",
  connectEnsureLogin.ensureLoggedIn(),
  async (request9, response9) => {
    if (request9.user.role === "admin") {
      if (!request9.body.option) {
        request9.flash("error", "please do enter an option!!!");
        return response9.redirect(
          `/elections/${request9.params.id}/questions/${request9.params.questionID}`
        );
      }
      try {
        const election = await electionModel.getElection(request9.params.id);
        if (election.launch) {
          request9.flash("error", "cant edit while election is running!!!");
          return response9.redirect(`/elections/${request9.params.id}/`);
        }
        await optionModel.addAnOption({
          option: request9.body.option,
          questionID: request9.params.questionID,
        });
        return response9.redirect(
          `/elections/${request9.params.id}/questions/${request9.params.questionID}`
        );
      } catch (error) {
        console.log(error);
        return response9.status(422).json(error);
      }
    } else if (request9.user.role === "voter") {
      return response9.redirect("/");
    }
  }
);

//delete options
//options can deleted when this route is visited
app.delete(
  "/options/:optionID",
  connectEnsureLogin.ensureLoggedIn(),
  async (request12, response12) => {
    if (request12.user.role === "admin") {
      try {
        const res = await optionModel.deleteAnOption(request12.params.optionID);
        return response12.json({ success: res === 1 });
      } catch (errora) {
        console.log(errora);
        return response12.status(422).json(errora);
      }
    } else if (request12.user.role === "voter") {
      return response12.redirect("/");
    }
  }
);

//edit option page
app.get(
  "/elections/:electionID/questions/:questionID/options/:optionID/edit",
  connectEnsureLogin.ensureLoggedIn(),
  async (requesta, responsea) => {
    if (requesta.user.role === "admin") {
      try {
        const electiona = await electionModel.getElection(requesta.params.electionID);
        if (electiona.launch) {
          requesta.flash("error", "can't edit while election is in running mode!!!");
          return responsea.redirect(`/elections/${requesta.params.id}/`);
        }
        const optiona = await optionModel.getOption(requesta.params.optionID);
        return responsea.render("edit_option_page", {
          option: optiona.option,
          csrfToken: requesta.csrfToken(),
          electionID: requesta.params.electionID,
          questionID: requesta.params.questionID,
          optionID: requesta.params.optionID,
        });
      } catch (error) {
        console.log(error);
        return responsea.status(422).json(error);
      }
    } else if (requesta.user.role === "voter") {
      return responsea.redirect("/");
    }
  }
);


//update options



app.put(
  "/options/:optionID/edit",
  connectEnsureLogin.ensureLoggedIn(),
  async (requestb, responseb) => {
    if (requestb.user.role === "admin") {
      if (!requestb.body.option) {
        requestb.flash("error", "Please do enter an option");
        return responseb.json({
          error: "Please enter option",
        });
      }
      try {
        const updatedOptions = await optionModel.updateAnOption({
          id: requestb.params.optionID,
          option: requestb.body.option,
        });
        return responseb.json(updatedOptions);
      } catch (errorb) {
        console.log(errorb);
        return responseb.status(422).json(errorb);
      }
    } else if (requestb.user.role === "voter") {
      return responseb.redirect("/");
    }
  }
);



//voter page
app.get(
  "/elections/:electionID/voters",
  connectEnsureLogin.ensureLoggedIn(),
  async (request9, response9) => {
    if (request9.user.role === "admin") {
      try {
        const voters = await voterModel.gettVoters(request9.params.electionID);
        const elections = await electionModel.getElection(request9.params.electionID);
        if (request9.accepts("html")) {
          return response9.render("voters_page", {
            title: elections.electionName,
            id: request9.params.electionID,
            voters,
            csrfToken: request9.csrfToken(),
          });
        } else {
          return response9.json({
            voters,
          });
        }
      } catch (error9) {
        console.log(error9);
        return response9.status(422).json(error9);
      }
    } else if (request9.user.role === "voter") {
      return response9.redirect("/");
    }
  }
);

//add voter page
//this is the page where we can add voters
app.get(
  "/elections/:electionID/voters/create",
  connectEnsureLogin.ensureLoggedIn(),
  (requeste, responsee) => {
    if (requeste.user.role === "admin") {
      responsee.render("new_voter", {
        title: "Add a voter to election",
        electionID: requeste.params.electionID,
        csrfToken: requeste.csrfToken(),
      });
    } else if (requeste.user.role === "voter") {
      return responsee.redirect("/");
    }
  }
);

//add voter
//this is where the admin can register the voters using voterid and password
app.post(
  "/elections/:electionID/voters/create",
  connectEnsureLogin.ensureLoggedIn(),
  async (requestr, responser) => {
    if (requestr.user.role === "admin") {
      if (!requestr.body.voterid) {
        requestr.flash("error", "please do enter voterID!!!");
        return responser.redirect(
          `/elections/${requestr.params.electionID}/voters/create`
        );
      }
      if (!requestr.body.password) {
        requestr.flash("error", "please do enter your password!!!");
        return responser.redirect(
          `/elections/${requestr.params.electionID}/voters/create`
        );
      }
      if (requestr.body.password.length < 6) {
        requestr.flash("error", "length of password should be of atleast 8 characters!!!");
        return responser.redirect(
          `/elections/${requestr.params.electionID}/voters/create`
        );
      }
      const hashedPwd1 = await bcrypt.hash(requestr.body.password, saltRounds);
      try {
        await voterModel.createVoter({
          voterid: requestr.body.voterid,
          password: hashedPwd1,
          electionID: requestr.params.electionID,
        });
        return responser.redirect(
          `/elections/${requestr.params.electionID}/voters`
        );
      } catch (errorr) {
        requestr.flash("error", "voter ID is already in use by someone else!!!");
        return responser.redirect(
          `/elections/${requestr.params.electionID}/voters/create`
        );
      }
    } else if (requestr.user.role === "voter") {
      return responser.redirect("/");
    }
  }
);

//delete voter
//to delete unnecessary voter
app.delete(
  "/elections/:electionID/voters/:voterID",
  connectEnsureLogin.ensureLoggedIn(),
  async (requestz, responsez) => {
    if (requestz.user.role === "admin") {
      try {
        const res2 = await voterModel.deleteAVoter(requestz.params.voterID);
        return responsez.json({ success: res2 === 1 });
      } catch (errorz) {
        console.log(errorz);
        return responsez.status(422).json(errorz);
      }
    } else if (requestz.user.role === "voter") {
      return responsez.redirect("/");
    }
  }
);

//voter password reset page
app.get(
  "/elections/:electionID/voters/:voterID/edit",
  connectEnsureLogin.ensureLoggedIn(),
  (requestx,responsex) => {
    if (requestx.user.role === "admin") {
      responsex.render("voter_password_page", {
        title: "Reset voter password",
        electionID: requestx.params.electionID,
        voterID: requestx.params.voterID,
        csrfToken: requestx.csrfToken(),
      });
    } else if (requestx.user.role === "voter") {
      return responsex.redirect("/");
    }
  }
);

//reset user password
//to reset the user password if he has forgotten by which the admin can change it 
app.post(
  "/elections/:electionID/voters/:voterID/edit",
  connectEnsureLogin.ensureLoggedIn(),
  async (requestdd, response) => {
    if (requestdd.user.role === "admin") {
      if (!requestdd.body.new_password) {
        requestdd.flash("error", "Please do enter a new password!!!");
        return response.redirect("/password-reset");
      }
      if (requestdd.body.new_password.length < 8) {
        requestdd.flash("error", "Length of password should be of atleast 8 characters!!!");
        return response.redirect("/password-reset");
      }
      const hashedNewPwd = await bcrypt.hash(
        requestdd.body.new_password,
        saltRounds
      );
      try {
        voterModel.findOne({ where: { id: requestdd.params.voterID } }).then(
          (user) => {
            user.resetPassword(hashedNewPwd);
          }
        );
        requestdd.flash("success", "Password has been changed successfully!!!");
        return response.redirect(
          `/elections/${requestdd.params.electionID}/voters`
        );
      } catch (errordd) {
        console.log(errordd);
        return response.status(422).json(errordd);
      }
    } else if (requestdd.user.role === "voter") {
      return response.redirect("/");
    }
  }
);

//election preview
//this is the page like how the voting page looks like when the user opens it
app.get(
  "/elections/:electionID/preview",
  connectEnsureLogin.ensureLoggedIn(),
  async (requestl, responsel) => {
    if (requestl.user.role === "admin") {
      try {
        const election = await electionModel.getElection(requestl.params.electionID);
        const questions = await questionsModel.getQuestionss(
          requestl.params.electionID
        );
        let options = [];
        for (let question in questions) {
          const question_options = await optionModel.getOptionss(
            questions[question].id
          );
          if (question_options.length < 2) {
            requestl.flash(
              "error","Make sure there should be atleast two options in each question!!!"
            );
            requestl.flash(
              "error","Make sure to please add atleast two options to the question below!!!"
            );
            return responsel.redirect(
              `/elections/${requestl.params.electionID}/questions/${questions[question].id}`
            );
          }
          options.push(question_options);
        }

        if (questions.length < 1) {
          requestl.flash(
            "error",
            "Make sure to please add atleast one question in the ballot!!!"
          );
          return responsel.redirect(
            `/elections/${request.params.electionID}/questions`
          );
        }

        return responsel.render("vote_preview_page", {
          title: election.electionName,
          electionID: requestl.params.electionID,
          questions,
          options,
          csrfToken: requestl.csrfToken(),
        });
      } catch (errorl) {
        console.log(errorl);
        return responsel.status(422).json(errorl);
      }
    } else if (requestl.user.role === "voter") {
      return responsel.redirect("/");
    }
  }
);

//launch an election
app.put(
  "/elections/:electionID/launch",
  connectEnsureLogin.ensureLoggedIn(),
  async (requestk, responsek) => {
    if (requestk.user.role === "admin") {
      try {
        const launchedElection = await electionModel.launchAnElection(
          requestk.params.electionID
        );
        return responsek.json(launchedElection);
      } catch (errork) {
        console.log(errork);
        return responsek.status(422).json(errork);
      }
    } else if (requestk.user.role === "voter") {
      return responsek.redirect("/");
    }
  }
);

app.get("/e/:url/", async (requestaa, responseaa) => {
  if (!requestaa.user) {
    requestaa.flash("error", "Please do login before trying to vote!!!");
    return responseaa.redirect(`/e/${requestaa.params.url}/voter`);
  }
  try {
    const election = await electionModel.getElectionurl(requestaa.params.url);
    if (requestaa.user.role === "voter") {
      if (election.launch) {
        const questions = await questionsModel.getQuestionss(election.id);
        let options = [];
        for (let question in questions) {
          options.push(await optionModel.getOptionss(questions[question].id));
        }
        return responseaa.render("vote_page", {
          title: election.electionName,
          electionID: election.id,
          questions,
          options,
          csrfToken: requestaa.csrfToken(),
        });
      } else {
        return responseaa.render("404_not_found");
      }
    } else if (requestaa.user.role === "admin") {
      requestaa.flash("error", "Hey you can't vote as an admin!!!");
      requestaa.flash("error", "please do signout as an admin before trying to vote!!!");
      return responseaa.redirect(`/elections/${election.id}`);
    }
  } catch (erroraa) {
    console.log(erroraa);
    return responseaa.status(422).json(erroraa);
  }
});


//recent
//Deleting the election
// app.delete(
//   "/elections/:id",
//   connectEnsureLogin.ensureLoggedIn(),
//   async (request, response) => {

//     //const election = await electionModel.findByPk(request.params.id);


//     const questions = await questionsModel.findAll({
//       where: { EID: request.params.id },
//     });

//     // deleting the  questions annd  options  in election
//     questions.forEach(async (Question) => {
//       const options = await optionModel.findAll({
//         where: { QID: Question.id },
//       });
//       options.forEach(async (option) => {
//         await optionModel.destroy({ where: { id: option.id } });
//       });
//       await questionsModel.destroy({ where: { id: Question.id } });
//     });

//     //deleting all voters from  the  election
//     const voters = await voterModel.findAll({
//       where: { EID: request.params.id },
//     });
//     voters.forEach(async (voter) => {
//       await voters.destroy({ where: { id: voter.id } });
//     });

//     try {
//       await electionModel.destroy({ where: { id: request.params.id } });
//       return response.json({ ok: true });
//     } catch (error) {
//       console.log(error);
//       response.send(error);
//     }
//   }
// );

app.use(function (requestt, responset) {
  responset.status(404).render("404_not_found.ejs");
});

module.exports = app;
