import nodemailer from 'nodemailer';
import { resolve } from 'path';
import { create } from 'express-handlebars';
import mailConfig from '../config/mail';

class Mail {
  constructor() {
    const { host, port, secure, auth } = mailConfig;

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: auth.user ? auth : null,
    });

    this.configureTemplates();
  }

  configureTemplates() {
    this.viewPath = resolve(__dirname, '..', 'app', 'views', 'emails');

    this.viewEngine = create({
      layoutsDir: resolve(this.viewPath, 'layouts'),
      partialsDir: resolve(this.viewPath, 'partials'),
      defaultLayout: 'default',
      extname: '.hbs',
    });
  }

  async sendMail(message) {
    const { template, context, ...rest } = message;

    let { html } = message;

    if (template && !html) {
      html = await this.viewEngine.render(
        resolve(this.viewPath, `${template}.hbs`),
        context
      );
    }

    return this.transporter.sendMail({
      ...mailConfig.default,
      ...rest,
      html,
    });
  }
}

export default new Mail();
