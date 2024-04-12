import jwt from "jsonwebtoken";
import { User } from "@prisma/client";
import { JWTUser } from "../interfaces";

const JWT_SECRET = "ashwin@123";

class JWTServices {
  public static generateTokenForUser(user: User) {
    const payload: JWTUser = {
      id: user?.id,
      email: user?.email,
    };

    const token = jwt.sign(payload, JWT_SECRET);
    return token;
  }

  public static decodeToken(token: string) {
    try {
      return jwt.verify(token, JWT_SECRET) as JWTUser;
    } catch (error) {
      return null;
    }
  }
}
export default JWTServices;
