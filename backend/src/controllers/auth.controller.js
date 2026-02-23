const User = require('../models/user.model');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');


console.log('=== EMAIL CONFIG ===');
console.log('EMAIL_HOST:', process.env.EMAIL_HOST);
console.log('EMAIL_USER:', process.env.EMAIL_USER);
console.log('EMAIL_PASS:', process.env.EMAIL_PASS ? '***' : 'NON DÉFINI');
console.log('FRONTEND_URL:', process.env.FRONTEND_URL);

// Configuration de l'email
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Test de connexion SMTP
transporter.verify(function(error, success) {
  if (error) {
    console.log('❌ Erreur configuration SMTP:', error);
  } else {
    console.log('✅ Serveur SMTP prêt');
  }
});

// @desc    Inscription utilisateur
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res) => {
  try {
    const { email, password, firstName, lastName, phone, role } = req.body;

    // Vérifier si l'utilisateur existe déjà
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Un utilisateur avec cet email existe déjà'
      });
    }

    // Créer l'utilisateur
    const user = await User.create({
      email,
      password,
      firstName,
      lastName,
      phone,
      role: role || 'client'
    });

    // Générer le token JWT
    const token = user.generateAuthToken();

    // Générer le token de vérification
    const verificationToken = crypto.randomBytes(32).toString('hex');
    user.verificationToken = crypto
      .createHash('sha256')
      .update(verificationToken)
      .digest('hex');
    user.verificationExpire = Date.now() + 24 * 60 * 60 * 1000; // 24 heures
    await user.save();

    // Construire l'URL de vérification
    const frontendUrl = process.env.FRONTEND_URL;
    const verificationUrl = `${frontendUrl}/auth/verify-email/${verificationToken}`;
    
  const mailOptions = {
      from: `"ParkingReserve" <${process.env.EMAIL_USER || 'noreply@parkingreserve.com'}>`,
      to: user.email,
      subject: 'Activez votre compte ParkingReserve',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #2c3e50; color: white; padding: 20px; text-align: center; }
            .content { padding: 30px; background-color: #f9f9f9; }
            .button { 
              display: inline-block; 
              padding: 14px 28px; 
              background-color: #3498db; 
              color: white; 
              text-decoration: none; 
              border-radius: 5px; 
              font-weight: bold; 
              margin: 20px 0; 
            }
            .footer { 
              margin-top: 30px; 
              padding-top: 20px; 
              border-top: 1px solid #eee; 
              font-size: 12px; 
              color: #777; 
              text-align: center; 
            }
            .warning { 
              background-color: #fff3cd; 
              border: 1px solid #ffeaa7; 
              padding: 15px; 
              border-radius: 5px; 
              margin: 20px 0; 
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🚗 ParkingReserve</h1>
            </div>
            
            <div class="content">
              <h2>Bonjour ${firstName} ${lastName},</h2>
              
              <p>Merci de vous être inscrit sur <strong>ParkingReserve</strong>, votre plateforme de réservation de parkings.</p>
              
              <p>Pour activer votre compte et commencer à réserver, cliquez sur le bouton ci-dessous :</p>
              
              <div style="text-align: center;">
                <a href="${verificationUrl}" class="button">ACTIVER MON COMPTE</a>
              </div>
              
              <p>Si le bouton ne fonctionne pas, copiez et collez ce lien dans votre navigateur :</p>
              
              <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0; word-break: break-all;">
                ${verificationUrl}
              </div>
              
              <div class="warning">
                <p><strong>⚠️ Important :</strong> Ce lien d'activation expirera dans <strong>24 heures</strong>.</p>
              </div>
              
              <p>Une fois votre compte activé, vous pourrez :</p>
              <ul>
                <li>🔍 Rechercher des parkings disponibles</li>
                <li>📅 Réserver des places en quelques clics</li>
                <li>💳 Payer en ligne sécurisé</li>
                <li>⭐ Noter vos expériences</li>
              </ul>
              
              <p>Si vous avez des questions, notre équipe support est là pour vous aider :<br>
              <a href="mailto:support@parkingreserve.com">support@parkingreserve.com</a></p>
            </div>
            
            <div class="footer">
              <p>Cet email a été envoyé automatiquement. Merci de ne pas y répondre.</p>
              <p>© ${new Date().getFullYear()} ParkingReserve. Tous droits réservés.</p>
              <p><a href="${frontendUrl}">Visitez notre site</a></p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    await transporter.sendMail(mailOptions);

    res.status(201).json({
      success: true,
      message: 'Compte créé avec succès. Un email de vérification a été envoyé.',
      token,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        avatar: user.avatar
      }
    });
  } catch (error) {
    console.error('Erreur inscription:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'inscription',
      error: error.message
    });
  }
};

// @desc    Connexion utilisateur
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Vérifier si l'utilisateur existe
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Email ou mot de passe incorrect'
      });
    }

    // Vérifier si le compte est actif
    if (user.status !== 'active') {
      return res.status(401).json({
        success: false,
        message: 'Votre compte est suspendu ou désactivé'
      });
    }

    // Vérifier le mot de passe
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Email ou mot de passe incorrect'
      });
    }

    // Vérifier l'email
    // if (!user.isVerified) {
    //   return res.status(401).json({
    //     success: false,
    //     message: 'Veuillez vérifier votre email avant de vous connecter'
    //   });
    // }

    // Générer le token JWT
    const token = user.generateAuthToken();

    res.json({
      success: true,
      message: 'Connexion réussie',
      token,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        avatar: user.avatar,
        phone: user.phone
      }
    });
  } catch (error) {
    console.error('Erreur connexion:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la connexion',
      error: error.message
    });
  }
};

// @desc    Vérification d'email
// @route   GET /api/auth/verify-email/:token
// @access  Public
exports.verifyEmail = async (req, res) => {
  try {
    const verificationToken = crypto
      .createHash('sha256')
      .update(req.params.token)
      .digest('hex');

    console.log('Token reçu:', req.params.token);
    console.log('Token hashé:', verificationToken);

    const user = await User.findOne({
      verificationToken,
      verificationExpire: { $gt: Date.now() }
    });

    console.log('Utilisateur trouvé:', user ? 'Oui' : 'Non');
    if (user) {
      console.log('Avant activation - isVerified:', user.isVerified);
      console.log('Avant activation - verificationToken:', user.verificationToken);
    }

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Token invalide ou expiré'
      });
    }

    // ACTIVER LE COMPTE
    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationExpire = undefined;
    
    await user.save();
    
    console.log('Après activation - isVerified:', user.isVerified);
    console.log('Après activation - verificationToken:', user.verificationToken);

    res.json({
      success: true,
      message: 'Email vérifié avec succès',
      user: {
        id: user._id,
        email: user.email,
        isVerified: user.isVerified
      }
    });
  } catch (error) {
    console.error('Erreur vérification email:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la vérification',
      error: error.message
    });
  }
};

// @desc    Demande de réinitialisation de mot de passe
// @route   POST /api/auth/forgot-password
// @access  Public
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Aucun utilisateur trouvé avec cet email'
      });
    }

    // Générer le token de réinitialisation
    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');
    user.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 minutes
    await user.save();

    // Envoyer l'email
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
    
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: 'Réinitialisation de votre mot de passe',
      html: `
        <h1>Réinitialisation de mot de passe</h1>
        <p>Vous avez demandé la réinitialisation de votre mot de passe. Cliquez sur le lien ci-dessous :</p>
        <a href="${resetUrl}">Réinitialiser mon mot de passe</a>
        <p>Ce lien expirera dans 10 minutes.</p>
        <p>Si vous n'avez pas fait cette demande, ignorez cet email.</p>
      `
    };

    await transporter.sendMail(mailOptions);

    res.json({
      success: true,
      message: 'Email de réinitialisation envoyé'
    });
  } catch (error) {
    console.error('Erreur mot de passe oublié:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'envoi de l\'email',
      error: error.message
    });
  }
};

// @desc    Réinitialisation de mot de passe
// @route   PUT /api/auth/reset-password/:token
// @access  Public
exports.resetPassword = async (req, res) => {
  try {
    const resetToken = crypto
      .createHash('sha256')
      .update(req.params.token)
      .digest('hex');

    const user = await User.findOne({
      resetPasswordToken: resetToken,
      resetPasswordExpire: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Token invalide ou expiré'
      });
    }

    user.password = req.body.password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    res.json({
      success: true,
      message: 'Mot de passe réinitialisé avec succès'
    });
  } catch (error) {
    console.error('Erreur réinitialisation mot de passe:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la réinitialisation',
      error: error.message
    });
  }
};

// @desc    Récupérer l'utilisateur courant
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .populate('favorites')
      .select('-password');

    res.json({
      success: true,
      user
    });
  } catch (error) {
    console.error('Erreur récupération profil:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    });
  }
};