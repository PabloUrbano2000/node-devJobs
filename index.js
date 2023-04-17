const mongoose = require("mongoose");
require("./config/db");

const express = require("express");
const exphbs = require("express-handlebars");
const path = require("path");
const router = require("./routes");
const cookieParser = require("cookie-parser");
const session = require("express-session");
const MongoStore = require("connect-mongo")(session);
const bodyParser = require("body-parser");
const expressValidator = require("express-validator");
const flash = require("connect-flash");
const passport = require("./config/passport");
const createError = require("http-errors");

require("dotenv").config({ path: "variables.env" });

const app = express();

// habilitar bodyparser
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// validacion body parser
app.use(expressValidator());

// habilitar handlebars como view
app.engine(
  "handlebars",
  exphbs.engine({
    layoutsDir: "./views/layouts/",
    defaultLayout: "layout",
    extname: "handlebars",
    runtimeOptions: {
      allowProtoPropertiesByDefault: true,
      allowProtoMethodsByDefault: true,
    },
    helpers: require("./helpers/handlebars"),
  })
);

app.set("view engine", "handlebars");

// static files
app.use(express.static(path.join(__dirname, "public")));

app.use(cookieParser());

app.use(
  session({
    secret: process.env.SECRETO,
    key: process.env.KEY,
    resave: false,
    saveUninitialized: false,
    store: new MongoStore({ mongooseConnection: mongoose.connection }),
  })
);

// Inicilizar passport
app.use(passport.initialize());
app.use(passport.session());

// Alertas y flash messages
app.use(flash());

// Crear nuestro middleware
app.use((req, res, next) => {
  res.locals.mensajes = req.flash();
  next();
});

app.use("/", router());

// 404 pagina no existente
app.use((req, res, next) => {
  next(createError(404, "No Autorizado"));
});

// Administración de los errores
app.use((error, req, res, next) => {
  res.locals.mensaje = error.mensaje;
  const status = error.status || 500;
  res.locals.status = status;
  res.status(status);
  res.render("error");
});

const host = "0.0.0.0";
const port = process.env.PORT;
app.listen(port, host, () => {
  console.log("El servidor está corriendo en", port);
});
