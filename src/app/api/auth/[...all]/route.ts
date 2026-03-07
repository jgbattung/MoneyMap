import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

const { POST, GET } = toNextJsHandler(auth);

export { GET, POST };
