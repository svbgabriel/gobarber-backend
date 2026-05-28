import { Request, Response } from 'express';
import { db } from '../../database/db';
import { files } from '../../database/schema';

class FileController {
  async store(req: Request, res: Response) {
    const { originalname: name, filename: path } = req.file!;

    const [file] = await db
      .insert(files)
      .values({
        name,
        path,
      })
      .returning();

    return res.json({
      ...file,
      url: `${process.env.APP_URL}/files/${file.path}`,
    });
  }
}

export default new FileController();
