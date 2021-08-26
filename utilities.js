import crypto from "crypto";

export const randomId = () => crypto.randomBytes(8).toString("hex");

export const randomString = (length = 6) => {
    return Math.random().toString(36).replace(/[^a-z]+/g, '').substr(0, length);
}
