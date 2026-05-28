import nodemailer from 'nodemailer';
import { resolve } from 'path';
import { create, ExpressHandlebars } from 'express-handlebars';
import mailConfig from '../config/mail';

interface MailBody {
  to: string
  subject: string
  template: string
  context: {
    provider: string
    user: string
    date: string
  },
  html?: string
}

class Mail {
  private transporter: nodemailer.Transporter;
  private viewPath: string;
  private viewEngine: ExpressHandlebars;

  constructor() {
    const { host, port, secure, auth } = mailConfig;

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: auth.user ? auth : undefined,
    });

    this.viewPath = resolve(__dirname, '..', 'app', 'views', 'emails');

    this.viewEngine = create({
      layoutsDir: resolve(this.viewPath, 'layouts'),
      partialsDir: resolve(this.viewPath, 'partials'),
      defaultLayout: 'default',
      extname: '.hbs',
    });
  }

  async sendMail(message: MailBody) {
    const { template, context, ...rest } = message;

    let { html } = message;

    if (template && !html) {
      html = await this.viewEngine.render(
        resolve(this.viewPath, `${template}.hbs`),
        context
      );
    }

    this.transporter.sendMail({
      ...mailConfig.default,
      ...rest,
      html,
    });
  }
}

export default new Mail();
