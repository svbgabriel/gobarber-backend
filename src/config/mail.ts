export default {
  host: process.env.MAIL_HOST,
  port: process.env.MAIL_PORT ? Number.parseInt(process.env.MAIL_PORT) : undefined,
  secure: false,
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
  default: {
    from: 'Equipe GoBarber <noreply@gobarber.com>',
  },
};
