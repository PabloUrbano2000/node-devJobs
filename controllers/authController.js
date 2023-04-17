const { default: mongoose } = require("mongoose");
const passport = require("passport");
const Vacante = mongoose.model("Vacante");
const Usuario = mongoose.model("Usuarios");
const crypto = require("crypto");
const enviarEmail = require("../handlers/email");

exports.autenticarUsuario = passport.authenticate("local", {
  successRedirect: "/administracion",
  failureRedirect: "/iniciar-sesion",
  failureFlash: true,
  badRequestMessage: "Ambos campos son obligatorios",
});

// Revisar si el usuario está autenticado o no
exports.verificarUsuario = (req, res, next) => {
  // revisar el usuario
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect("/iniciar-sesion");
};

exports.mostrarPanel = async (req, res) => {
  // consultar el usuario autenticado
  const vacantes = await Vacante.find({ autor: req.user._id });

  res.render("administracion", {
    nombrePagina: "Panel de Administración",
    tagline: "Crea y Administra tus vacantes desde aquí",
    cerrarSesion: true,
    nombre: req.user.nombre,
    imagen: req.user.imagen,
    vacantes,
  });
};

exports.cerrarSesion = (req, res, next) => {
  // se cierra sesión
  req.logout(function (err) {
    if (err) {
      return next(err);
    }
    req.flash("correcto", "Cerraste Sesión Correctamente");
    return res.redirect("/iniciar-sesion");
  });
};

exports.formReestablecerPassword = (req, res) => {
  res.render("reestablecer-password", {
    nombrePagina: "Reestablece tu Password",
    tagline:
      "Si ya tienes una cuenta pero olvidaste tu password, coloca tu email",
  });
};

exports.enviarToken = async (req, res) => {
  const usuario = await Usuario.findOne({ email: req.body.email });
  if (!usuario) {
    req.flash("error", "No existe esa cuenta");
    return res.redirect("/iniciar-sesion");
  }

  // genera un token
  usuario.token = crypto.randomBytes(20).toString("hex");
  usuario.expira = Date.now() + 3600000;

  // Guardar el usuario
  await usuario.save();
  const resetUrl = `${process.env.HOST_DOMAIN}/reestablecer-password/${usuario.token}`;

  await enviarEmail.enviar({
    usuario,
    subject: "Password Reset",
    resetUrl,
    archivo: "reset",
  });

  req.flash("correcto", "Revisa tu email para las indicaciones");
  res.redirect("/iniciar-sesion");
};

exports.reestablecerPassword = async (req, res, next) => {
  const usuario = await Usuario.findOne({
    token: req.params.token,
    expira: {
      $gt: Date.now(),
    },
  });
  if (!usuario) {
    req.flash("error", "El formulario ya no es válido, intenta de nuevo");
    return res.redirect("/reestablecer-password");
  }

  // Todo bien mostrar el formulario
  res.render("nuevo-password", {
    nombrePagina: "Nuevo Password",
  });
};

exports.guardarPassword = async (req, res) => {
  const usuario = await Usuario.findOne({
    token: req.params.token,
    expira: {
      $gt: Date.now(),
    },
  });

  if (!usuario) {
    req.flash("error", "El formulario ya no es válido, intenta de nuevo");
    return res.redirect("/reestablecer-password");
  }

  // guardar en la base de datos
  usuario.password = req.body.password;
  usuario.token = undefined;
  usuario.expira = undefined;

  // agregar y eliminar valores del objeto
  await usuario.save();

  req.flash("correcto", "Password Modificado Correctamente");
  res.redirect("/iniciar-sesion");
};
