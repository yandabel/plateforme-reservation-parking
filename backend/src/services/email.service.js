const nodemailer = require('nodemailer');

// Créer un transporteur
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Fonction pour envoyer l'email d'activation
exports.sendActivationEmail = async (email, token, firstName) => {
  const activationLink = `${process.env.FRONTEND_URL}/activate/${token}`;
  
  const mailOptions = {
    from: `"Parking Reservation" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Activation de votre compte - Parking Reservation',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Bonjour ${firstName} !</h2>
        
        <p>Merci de vous être inscrit sur Parking Reservation.</p>
        
        <p>Pour activer votre compte, veuillez cliquer sur le lien ci-dessous :</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${activationLink}" 
             style="background-color: #4CAF50; color: white; padding: 14px 25px; 
                    text-align: center; text-decoration: none; display: inline-block;
                    border-radius: 5px; font-weight: bold;">
            Activer mon compte
          </a>
        </div>
        
        <p>Ou copiez-collez ce lien dans votre navigateur :</p>
        <p style="background-color: #f4f4f4; padding: 10px; border-radius: 5px; 
                  word-break: break-all;">
          ${activationLink}
        </p>
        
        <p>Ce lien expirera dans 24 heures.</p>
        
        <p>Si vous n'avez pas créé de compte, veuillez ignorer cet email.</p>
        
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
        
        <p style="color: #777; font-size: 12px;">
          Cet email a été envoyé automatiquement, merci de ne pas y répondre.
        </p>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Email d'activation envoyé à ${email}`);
    return true;
  } catch (error) {
    console.error('Erreur lors de l\'envoi de l\'email:', error);
    return false;
  }
};

// Fonction pour envoyer l'email de réinitialisation de mot de passe
exports.sendResetPasswordEmail = async (email, token, firstName) => {
  const resetLink = `${process.env.FRONTEND_URL}/reset-password/${token}`;
  
  const mailOptions = {
    from: `"Parking Reservation" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Réinitialisation de mot de passe - Parking Reservation',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Bonjour ${firstName} !</h2>
        
        <p>Vous avez demandé la réinitialisation de votre mot de passe.</p>
        
        <p>Cliquez sur le lien ci-dessous pour créer un nouveau mot de passe :</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetLink}" 
             style="background-color: #007bff; color: white; padding: 14px 25px; 
                    text-align: center; text-decoration: none; display: inline-block;
                    border-radius: 5px; font-weight: bold;">
            Réinitialiser mon mot de passe
          </a>
        </div>
        
        <p>Ou copiez-collez ce lien dans votre navigateur :</p>
        <p style="background-color: #f4f4f4; padding: 10px; border-radius: 5px; 
                  word-break: break-all;">
          ${resetLink}
        </p>
        
        <p>Ce lien expirera dans 10 minutes.</p>
        
        <p>Si vous n'avez pas demandé de réinitialisation, veuillez ignorer cet email.</p>
        
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
        
        <p style="color: #777; font-size: 12px;">
          Cet email a été envoyé automatiquement, merci de ne pas y répondre.
        </p>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Email de réinitialisation envoyé à ${email}`);
    return true;
  } catch (error) {
    console.error('Erreur lors de l\'envoi de l\'email:', error);
    return false;
  }
};